import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getItemsByCategory } from '$lib/server/db';
import { categoryConfig } from '$lib/categoryFields';

// קטגוריות שיש להן דף ארצי
// ⚠️ אין export - SvelteKit מאפשר רק: load, actions, prerender, csr, ssr, trailingSlash, config, entries, או עם '_' prefix
const nationalCategories: Record<string, { slug: string; title: string }> = {
    singles:     { slug: 'singles',     title: 'שידוכים - פנויים ופנויות' },
    security:    { slug: 'security',    title: 'צימרים ונופש' },
    attractions: { slug: 'attractions', title: 'אטרקציות' },
    jobs:        { slug: 'jobs',        title: 'דרושים עובדים' },
};

export const load: PageServerLoad = async ({ params }) => {
    const categoryId = params.category;

    if (!nationalCategories[categoryId]) {
        error(404, `אין דף ארצי לקטגוריה "${categoryId}"`);
    }

    const config = categoryConfig[categoryId];
    if (!config) {
        error(404, `קטגוריה לא קיימת`);
    }

    let items: import('$lib/server/db').DbItem[] = [];
    try {
        items = await getItemsByCategory(categoryId);
    } catch (err) {
        console.error(`[national/${categoryId}] getItemsByCategory failed:`, err);
    }

    return {
        categoryId,
        // מחזירים רק את מה שהעמוד צריך (icon + label) - מונע בעיות serialization
        config: { icon: config.icon, label: config.label },
        items,
        meta: nationalCategories[categoryId],
    };
};
