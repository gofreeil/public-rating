import { error } from '@sveltejs/kit';
import { categoryConfig } from '$lib/categoryFields';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    // ---- Auth אופציונלי - הטופס נגיש לכולם, ההרשמה נדרשת רק בשליחה ----
    const session = await event.locals.auth();

    // ---- טעינת קונפיגורציית קטגוריה ----
    const config = categoryConfig[event.params.category];
    if (!config) {
        error(404, `קטגוריה "${event.params.category}" לא קיימת`);
    }

    return {
        categoryId: event.params.category,
        config,
        userId: session?.user?.id ?? null,
    };
};
