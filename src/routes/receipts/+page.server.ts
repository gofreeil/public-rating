import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserById } from '$lib/server/db';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();

    if (!session?.user?.id) {
        throw redirect(302, '/login?redirect=/receipts');
    }

    let user = null;
    try {
        const jwt = event.cookies.get('strapi_jwt');
        user = await getUserById(session.user.id, jwt);
    } catch (e) {
        console.warn('[receipts] getUserById failed:', e);
    }

    // לדוגמה: תקבולים דמה - בהמשך יבואו מ-Strapi
    const receipts = [
        { id: 1, date: '2025-03-10', description: 'תרומה לקהילה',   amount: -50,  type: 'out' },
        { id: 2, date: '2025-03-08', description: 'פרסום מודעה',     amount: -30,  type: 'out' },
        { id: 3, date: '2025-03-05', description: 'קרדיט הצטרפות',  amount: +100, type: 'in'  },
        { id: 4, date: '2025-02-20', description: 'פרסום מודעה',     amount: -30,  type: 'out' },
        { id: 5, date: '2025-02-15', description: 'בונוס פעילות',    amount: +25,  type: 'in'  },
    ];

    return {
        user,
        receipts,
        balance: (user as { balance?: number } | null)?.balance ?? 0,
    };
};
