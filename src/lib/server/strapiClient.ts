// ============================================================
// Strapi 5 HTTP Client
// כל הבקשות לבאקאנד עוברות דרך כאן
// ============================================================

const STRAPI_URL   = process.env.STRAPI_URL   ?? 'http://localhost:1337';

function getHeaders(jwt?: string): HeadersInit {
    return {
        'Content-Type': 'application/json',
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    };
}

export async function strapiGet<T = unknown>(
    path: string,
    params?: Record<string, string>,
    jwt?: string
): Promise<T> {
    const url = new URL(STRAPI_URL + path);
    if (params) {
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const res = await fetch(url.toString(), { headers: getHeaders(jwt) });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`[Strapi] GET ${path} → ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
}

export async function strapiPost<T = unknown>(path: string, body: unknown, jwt?: string): Promise<T> {
    const res = await fetch(STRAPI_URL + path, {
        method:  'POST',
        headers: getHeaders(jwt),
        body:    JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`[Strapi] POST ${path} → ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
}

export async function strapiPut<T = unknown>(path: string, body: unknown, jwt?: string): Promise<T> {
    const res = await fetch(STRAPI_URL + path, {
        method:  'PUT',
        headers: getHeaders(jwt),
        body:    JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`[Strapi] PUT ${path} → ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
}

// ============================================================
// ---- Auth (users-permissions plugin - ללא token) ----
// ============================================================

export interface StrapiUser {
    id: number;
    username: string;
    email: string;
}

export interface StrapiAuthResponse {
    jwt: string;
    user: StrapiUser;
}

/** לוגין עם אימייל + סיסמה */
export async function strapiLogin(identifier: string, password: string): Promise<StrapiAuthResponse> {
    const res = await fetch(STRAPI_URL + '/api/auth/local', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ identifier, password }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`[Strapi] LOGIN → ${res.status}: ${text}`);
    }
    return res.json() as Promise<StrapiAuthResponse>;
}

/**
 * אימות JWT מול ה-Strapi המשותף והחזרת המשתמש (GET /api/users/me).
 * משמש את כניסת ה-SSO ("יוצאים לחירות"): העוגייה המשותפת gofreeil-auth מכילה
 * JWT שנשתל ע"י אתר אחר תחת gofreeil.com — מאמתים אותו וקובעים מי המשתמש.
 * מחזיר null אם ה-JWT חסר/פג/לא תקין.
 */
export async function getStrapiMe(jwt: string): Promise<StrapiUser | null> {
    if (!jwt) return null;
    try {
        const res = await fetch(STRAPI_URL + '/api/users/me', {
            headers: { Authorization: `Bearer ${jwt}` },
        });
        if (!res.ok) return null;
        return (await res.json()) as StrapiUser;
    } catch {
        return null;
    }
}

/** הרשמה עם שם משתמש, אימייל + סיסמה */
export async function strapiRegister(username: string, email: string, password: string): Promise<StrapiAuthResponse> {
    const res = await fetch(STRAPI_URL + '/api/auth/local/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, email, password }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`[Strapi] REGISTER → ${res.status}: ${text}`);
    }
    return res.json() as Promise<StrapiAuthResponse>;
}
