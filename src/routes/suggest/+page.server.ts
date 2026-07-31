import { fail, redirect } from '@sveltejs/kit';
import { createOfficial, listOfficialsFresh, listPendingOfficials } from '$lib/server/rating';
import { groupByKey } from '$lib/rating/types';
import { heNormalize } from '$lib/rating/heSearch';
import { TOO_FAST, TOO_MANY, allowAction, botCheck } from '$lib/server/rateLimit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();
    const groupParam = event.url.searchParams.get('group') ?? '';
    const group = groupByKey(groupParam);

    if (!session?.user) {
        const target = '/suggest' + (group ? `?group=${group.key}` : '');
        redirect(303, `/login?redirect=${encodeURIComponent(target)}`);
    }

    return { group: group?.key ?? null };
};

export const actions: Actions = {
    default: async (event) => {
        const form = await event.request.formData();
        const name = String(form.get('name') ?? '').trim();
        const groupKey = String(form.get('group') ?? '');
        const position = String(form.get('position') ?? '').trim();
        const org = String(form.get('org') ?? '').trim();
        const bio = String(form.get('bio') ?? '').trim();

        const values = { name, group: groupKey, position, org, bio };

        const session = await event.locals.auth();
        if (!session?.user) return fail(401, { error: 'יש להתחבר כדי להציע מדורג', values });
        if (!allowAction(event, 'suggest', session.user.id)) return fail(429, { error: TOO_MANY, values });

        const bot = botCheck(form);
        // מלכודת: מדווחים "הצלחה" לבוט בלי ליצור מדורג
        if (bot.trap) return { success: true, group: groupKey };
        if (bot.tooFast) return fail(400, { error: TOO_FAST, values });

        const group = groupByKey(groupKey);
        if (!group) return fail(400, { error: 'יש לבחור קטגוריה', values });
        if (name.length < 2) return fail(400, { error: 'יש להזין שם מלא (לפחות 2 תווים)', values });

        try {
            // ---- מניעת כפילויות: גם מול מאושרים וגם מול הצעות ממתינות (בלי קאש — זמן-אמת) ----
            const [approved, pending] = await Promise.all([listOfficialsFresh(), listPendingOfficials()]);
            const norm = heNormalize(name);
            const dup = [...approved, ...pending].find((o) => heNormalize(o.name) === norm);
            if (dup) {
                return fail(400, {
                    error: dup.approved
                        ? `"${dup.name}" כבר קיים במערכת — אפשר לדרג אותו בלוח`
                        : `"${dup.name}" כבר הוצע וממתין לאישור המערכת`,
                    values,
                });
            }

            await createOfficial(
                { name, group: group.key, position, org, bio },
                { approved: false, suggestedBy: session.user.id },
            );
            return { success: true, group: group.key };
        } catch {
            return fail(500, { error: 'שגיאה בשליחת ההצעה — נסו שוב בעוד רגע', values });
        }
    },
};
