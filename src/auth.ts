import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import Facebook from '@auth/sveltekit/providers/facebook';
import Credentials from '@auth/sveltekit/providers/credentials';
import { createHash } from 'crypto';
import { upsertUser, verifyCredentials, getUserByEmail, getUserById } from '$lib/server/db';
import { strapiLogin, strapiRegister, getStrapiMe } from '$lib/server/strapiClient';

/** קריאת ערך עוגייה מתוך כותרת Cookie גולמית (authorize מקבל Request, לא event.cookies) */
function readCookie(cookieHeader: string | null | undefined, name: string): string | null {
    if (!cookieHeader) return null;
    for (const part of cookieHeader.split(';')) {
        const idx = part.indexOf('=');
        if (idx === -1) continue;
        if (part.slice(0, idx).trim() === name) {
            return decodeURIComponent(part.slice(idx + 1).trim());
        }
    }
    return null;
}

const AUTH_SECRET         = process.env.AUTH_SECRET         ?? '';
const AUTH_GOOGLE_ID      = process.env.AUTH_GOOGLE_ID      ?? '';
const AUTH_GOOGLE_SECRET  = process.env.AUTH_GOOGLE_SECRET  ?? '';
const AUTH_FACEBOOK_ID    = process.env.AUTH_FACEBOOK_ID    ?? '';
const AUTH_FACEBOOK_SECRET= process.env.AUTH_FACEBOOK_SECRET?? '';

// ============================================================
// קבלת JWT של Strapi עבור משתמשי OAuth
// יוצר חשבון Strapi users-permissions דטרמיניסטי לכל OAuth user
// ============================================================
async function getOrCreateStrapiJwt(email: string | null | undefined, stableId: string): Promise<string | null> {
    if (!email) return null;
    // סיסמה דטרמיניסטית - sha256(stableId + AUTH_SECRET), קבועה לכל login
    const password = createHash('sha256').update(stableId + AUTH_SECRET).digest('hex').slice(0, 32);
    const username = stableId.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 30);
    try {
        const { jwt } = await strapiLogin(email, password);
        return jwt;
    } catch {
        // משתמש לא קיים - ניצור אותו
        try {
            const { jwt } = await strapiRegister(username, email, password);
            return jwt;
        } catch (err) {
            console.warn('[auth] getOrCreateStrapiJwt failed:', err);
            return null;
        }
    }
}

export const { handle, signIn, signOut } = SvelteKitAuth({
    secret: AUTH_SECRET,

    providers: [
        Google({
            clientId:     AUTH_GOOGLE_ID,
            clientSecret: AUTH_GOOGLE_SECRET,
        }),
        Facebook({
            clientId:     AUTH_FACEBOOK_ID,
            clientSecret: AUTH_FACEBOOK_SECRET,
        }),
        // ============================================================
        // יוצאים לחירות (SSO) - זיהוי מיידי לפי העוגייה המשותפת gofreeil-auth.
        // אתר אחר תחת gofreeil.com (community/sso) כבר שתל JWT של ה-Strapi המשותף;
        // כאן מאמתים אותו ומקימים סשן בלי הקלדת פרטים - בדיוק כמו "המשך עם גוגל",
        // רק שספק הזהות הוא רשימת המשתמשים המאוחדת של gofreeil.
        // ============================================================
        Credentials({
            id:   'gofreeil-sso',
            name: 'יוצאים לחירות',
            credentials: {},
            async authorize(_credentials, request) {
                const jwt = readCookie(request?.headers?.get('cookie'), 'gofreeil-auth');
                if (!jwt) return null;
                const me = await getStrapiMe(jwt);
                if (!me?.email) return null;
                const emailLc = me.email.trim().toLowerCase();
                const communityUser = await getUserByEmail(emailLc, jwt).catch(() => null);
                const id = communityUser?.id ?? `credentials_${emailLc}`;
                return {
                    id,
                    name:      communityUser?.name  ?? me.username ?? '',
                    email:     communityUser?.email ?? emailLc,
                    strapiJwt: jwt,
                } as { id: string; name: string; email: string; strapiJwt: string };
            },
        }),
        Credentials({
            id:   'credentials',
            name: 'Email & Password',
            credentials: {
                email:    { label: 'Email',    type: 'email'    },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const user = await verifyCredentials(
                    credentials.email as string,
                    credentials.password as string,
                );

                if (!user) return null;

                return {
                    id:    user.id,
                    name:  user.name ?? '',
                    email: user.email ?? '',
                };
            },
        }),
    ],

    callbacks: {
        async signIn({ user, account }) {
            console.log('[auth] signIn called - provider:', account?.provider, 'email:', user?.email);
            if (!account || !user) {
                console.warn('[auth] signIn rejected - missing account or user');
                return false;
            }

            // יוצאים לחירות (SSO) - ה-JWT כבר הגיע מ-authorize דרך ה-user object
            if (account.provider === 'gofreeil-sso') {
                const strapiJwt = (user as { strapiJwt?: string }).strapiJwt;
                const stableId  = user.id ?? `credentials_${user.email}`;
                if (strapiJwt) {
                    try {
                        await upsertUser({
                            id: stableId, name: user.name, email: user.email,
                            avatar_url: user.image, provider: 'gofreeil-sso',
                        }, strapiJwt);
                    } catch (e) { console.warn('[auth] upsert sso user failed:', e); }
                }
                return true;
            }

            // Credentials provider
            if (account.provider === 'credentials') {
                const stableId = user.id ?? `credentials_${user.email}`;
                // קודם JWT, אחר כך upsert עם ה-JWT
                const strapiJwt = await getOrCreateStrapiJwt(user.email, stableId);
                if (strapiJwt) {
                    (user as { strapiJwt?: string }).strapiJwt = strapiJwt;
                    try {
                        await upsertUser({
                            id: stableId, name: user.name, email: user.email,
                            avatar_url: user.image, provider: 'credentials',
                        }, strapiJwt);
                    } catch (e) { console.warn('[auth] upsert credentials user failed:', e); }
                }
                return true;
            }

            // OAuth providers (Google, Facebook)
            const tempId = `${account.provider}_${account.providerAccountId}`;
            let strapiJwt: string | null = null;
            let stableId = tempId;

            try {
                // 1. קודם JWT
                strapiJwt = await getOrCreateStrapiJwt(user.email, tempId);
                if (strapiJwt) (user as { strapiJwt?: string }).strapiJwt = strapiJwt;

                // 2. בדוק אם קיים community-user עם אותו אימייל (מיזוג חשבונות)
                const existingByEmail = user.email ? await getUserByEmail(user.email, strapiJwt ?? undefined) : null;
                stableId = existingByEmail?.id ?? tempId;

                // 3. upsert עם JWT
                await upsertUser({
                    id:         stableId,
                    name:       user.name,
                    email:      user.email,
                    avatar_url: user.image,
                    provider:   account.provider,
                }, strapiJwt ?? undefined);
            } catch (error) {
                console.error('[auth] OAuth community-user sync failed:', error);
                // ממשיכים - ההתחברות לא תיכשל בגלל community-user
            }

            user.id = stableId;
            return true;
        },

        async jwt({ token, user, account }) {
            // user + account מועברים רק ב-sign-in הראשון
            if (user && account) {
                token.dbUserId = (account.provider === 'credentials' || account.provider === 'gofreeil-sso')
                    ? user.id
                    : `${account.provider}_${account.providerAccountId}`;
                token.provider = account.provider;
                if (user.email) token.email = user.email;
            }
            // שמור Strapi JWT (רק ב-credentials login)
            if (user && (user as { strapiJwt?: string }).strapiJwt) {
                token.strapiJwt = (user as { strapiJwt?: string }).strapiJwt;
            }
            // שלוף role, neighborhood, banned מהדאטאבייס (בכל refresh של token)
            if (token.dbUserId) {
                try {
                    const dbUser = await getUserById(token.dbUserId as string, token.strapiJwt as string);
                    if (dbUser) {
                        token.role = dbUser.role;
                        token.neighborhood = dbUser.neighborhood;
                        token.banned = dbUser.banned;
                    }
                } catch { /* ignore - fallback to 'user' */ }
            }
            return token;
        },

        session({ session, token }) {
            if (token.dbUserId) {
                session.user.id = token.dbUserId as string;
            }
            if (token.email) {
                session.user.email = token.email as string;
            }
            if (token.provider) {
                (session.user as { provider?: string }).provider = token.provider as string;
            }
            if (token.strapiJwt) {
                (session.user as { strapiJwt?: string }).strapiJwt = token.strapiJwt as string;
            }
            // העבר role, neighborhood, banned לסשן
            session.user.role = (token.role as typeof session.user.role) ?? 'user';
            session.user.neighborhood = (token.neighborhood as string) ?? '';
            session.user.banned = (token.banned as boolean) ?? false;
            return session;
        },
    },

    pages: {
        signIn: '/login',
        error:  '/login',
    },

    trustHost: true,
});
