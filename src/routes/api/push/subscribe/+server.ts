import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { strapiPost, strapiGet } from '$lib/server/strapiClient.js';
import { env } from '$env/dynamic/private';

// טוקן מצומצם - הרשאות push-subscription בלבד (לא Full Access)
const PUSH_TOKEN = env.STRAPI_PUSH_TOKEN ?? '';

export const POST: RequestHandler = async ({ request, locals }) => {
    // ✅ חובה: משתמש מחובר בלבד
    const session = await locals.auth();
    if (!session?.user) throw error(401, 'יש להתחבר כדי לאפשר התראות');

    const body = await request.json();
    const { subscription } = body as {
        subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
    };

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        throw error(400, 'נתוני מנוי לא תקינים');
    }

    // user_id מגיע מה-session - לא מה-client
    const userId = (session.user as { id?: string }).id ?? session.user.email ?? '';

    await strapiPost(
        '/api/push-subscriptions',
        {
            data: {
                endpoint:   subscription.endpoint,
                p256dh:     subscription.keys.p256dh,
                auth:       subscription.keys.auth,
                user_id:    userId,
                user_agent: request.headers.get('user-agent') ?? '',
            },
        },
        PUSH_TOKEN
    );

    return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
    // ✅ חובה: משתמש מחובר בלבד
    const session = await locals.auth();
    if (!session?.user) throw error(401, 'יש להתחבר');

    const { endpoint } = await request.json() as { endpoint: string };
    if (!endpoint) throw error(400, 'חסר endpoint');

    const userId = (session.user as { id?: string }).id ?? session.user.email ?? '';

    // מוצא את המנוי רק אם שייך למשתמש הזה
    const res = await strapiGet<{ data: { id: number; attributes: { user_id: string } }[] }>(
        '/api/push-subscriptions',
        {
            'filters[endpoint][$eq]': endpoint,
            'filters[user_id][$eq]':  userId,
            'pagination[pageSize]':   '1',
        },
        PUSH_TOKEN
    );

    if (res.data?.[0]) {
        await fetch(`${process.env.STRAPI_URL ?? 'http://localhost:1337'}/api/push-subscriptions/${res.data[0].id}`, {
            method:  'DELETE',
            headers: { Authorization: `Bearer ${PUSH_TOKEN}` },
        });
    }

    return json({ ok: true });
};
