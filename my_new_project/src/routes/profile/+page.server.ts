import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUserById, updateUserProfile, getItemsByUserId, upsertUser, getMessagesByUserId, createItem } from '$lib/server/db';
import { citiesData } from '$lib/neighborhoodsData';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try {
        session = await event.locals.auth();
    } catch {
        // cookie פגום - מפנה להתחברות
    }

    if (!session?.user?.id) {
        throw redirect(302, '/login?redirect=/profile');
    }

    let user: Awaited<ReturnType<typeof getUserById>>;
    let items: Awaited<ReturnType<typeof getItemsByUserId>> = [];
    try {
        const jwt = event.cookies.get('strapi_jwt');
        user  = await getUserById(session.user.id, jwt);
    } catch (e) {
        console.warn('[profile] getUserById failed:', e);
    }
    try {
        items = await getItemsByUserId(session.user.id);
    } catch (e) {
        console.warn('[profile] getItemsByUserId failed:', e);
        items = [];
    }

    // אם המשתמש לא נמצא ב-DB (DB אופס), ניצור אותו מחדש מה-session
    if (!user && session.user?.id) {
        try {
            const provider = (session.user as { provider?: string }).provider ?? 'google';
            await upsertUser({
                id:         session.user.id,
                name:       session.user.name  ?? null,
                email:      session.user.email ?? null,
                avatar_url: session.user.image ?? null,
                provider,
            });
            const retryJwt = event.cookies.get('strapi_jwt');
            user = await getUserById(session.user.id, retryJwt);
        } catch (e) {
            console.warn('[profile] auto-upsert failed:', e);
        }
    }

    // fallback לתמונת OAuth אם אין avatar_url ב-DB
    const resolvedUser = user
        ? {
            ...user,
            avatar_url: user.avatar_url || session.user?.image || null,
            email:      user.email      || session.user?.email || null,
            name:       user.name       || session.user?.name  || null,
          }
        : {
            id:           session.user.id ?? '',
            name:         session.user?.name  ?? null,
            email:        session.user?.email ?? null,
            avatar_url:   session.user?.image ?? null,
            phone: '', nickname: '', city: '', neighborhood: '',
            business: '', gender: '', family_status: '', birth_date: '',
            notifications: 1, provider: null, password_hash: null, created_at: '',
            role: 'user' as const, banned: false,
          };

    let messages: Awaited<ReturnType<typeof getMessagesByUserId>> = [];
    try {
        messages = await getMessagesByUserId(session.user.id);
    } catch (e) {
        console.warn('[profile] getMessagesByUserId failed:', e);
    }

    return {
        user: resolvedUser,
        items: items ?? [],
        messages,
        citiesData,
        oauth_image: session.user?.image ?? null,
    };
};

export const actions: Actions = {
    updateProfile: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) throw redirect(302, '/login?redirect=/profile');

        const strapiJwt = event.cookies.get('strapi_jwt')
            ?? (session.user as { strapiJwt?: string }).strapiJwt
            ?? undefined;

        const formData      = await event.request.formData();
        const name          = formData.get('name')?.toString().trim()          ?? '';
        const email         = formData.get('email')?.toString().trim()         ?? '';
        const nickname      = formData.get('nickname')?.toString().trim()      ?? '';
        const phone         = formData.get('phone')?.toString().trim()         ?? '';
        const city          = formData.get('city')?.toString().trim()          ?? '';
        const neighborhood  = formData.get('neighborhood')?.toString().trim()  ?? '';
        const business      = formData.get('business')?.toString().trim()      ?? '';
        const family_status = formData.get('family_status')?.toString()        ?? '';
        const birth_day    = formData.get('birth_day')?.toString()   ?? '';
        const birth_month  = formData.get('birth_month')?.toString() ?? '';
        const birth_year   = formData.get('birth_year')?.toString()  ?? '';
        const birth_date   = (birth_day && birth_month && birth_year)
            ? `${birth_year}-${birth_month.padStart(2,'0')}-${birth_day.padStart(2,'0')}`
            : '';
        const gender        = formData.get('gender')?.toString()               ?? '';
        const notifications = formData.get('notifications') === 'true' ? 1 : 0;
        const avatarBase64  = formData.get('avatar_base64')?.toString()        ?? '';

        if (!name || name.length < 2) {
            return fail(400, { error: 'שם חייב להכיל לפחות 2 תווים' });
        }

        try {
            await updateUserProfile(session.user.id, {
                name,
                email,
                nickname,
                phone,
                city,
                neighborhood,
                business,
                family_status,
                birth_date,
                gender,
                notifications,
                ...(avatarBase64 ? { avatar_url: avatarBase64 } : {}),
            }, strapiJwt);
            return { success: true };
        } catch {
            return fail(500, { error: 'שגיאה בעדכון הפרופיל' });
        }
    },

    sendFeedback: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) throw redirect(302, '/login?redirect=/profile');

        const formData = await event.request.formData();
        const text = formData.get('feedback_text')?.toString().trim() ?? '';

        if (!text || text.length < 5) {
            return fail(400, { feedbackError: 'אנא כתוב הודעה של לפחות 5 תווים' });
        }

        try {
            // שמור את הפנייה כפריט מסוג user_feedback
            await createItem({
                category:    'user_feedback',
                label:       `פנייה מ-${session.user.name ?? session.user.id}`,
                description: text,
                user_id:     session.user.id,
                extra_fields: {
                    from_name:  session.user.name  ?? '',
                    from_email: session.user.email ?? '',
                    sent_at:    new Date().toISOString(),
                },
            });
            // שלח הודעת אישור לתיבת ההודעות של המשתמש
            await createItem({
                category:    'message',
                label:       'פנייתך התקבלה',
                description: 'תודה על פנייתך! הצוות של יוצאים לחירות יחזור אליך בהקדם.',
                user_id:     session.user.id,
            });
            return { feedbackSuccess: true };
        } catch {
            return fail(500, { feedbackError: 'שגיאה בשליחת הפנייה, נסה שוב' });
        }
    },
};
