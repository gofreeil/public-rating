// ============================================================
// sitemap.xml - מפת אתר דינמית
// דפים סטטיים + דף פרופיל לכל מדורג מאושר.
// עמיד: נפילת Strapi מחזירה מפה עם הדפים הסטטיים בלבד, לא 500.
// ============================================================

import { getRatedOfficials, listProposals } from '$lib/server/rating';
import { GROUPS } from '$lib/rating/types';
import { SITE_URL } from '$lib/seo';
import type { RequestHandler } from './$types';

interface Entry {
    loc: string;
    changefreq: 'daily' | 'weekly' | 'monthly';
    priority: string;
    lastmod?: string;
}

const STATIC_ENTRIES: Entry[] = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    ...GROUPS.map((g) => ({ loc: g.route, changefreq: 'daily' as const, priority: '0.9' })),
    { loc: '/top-rated', changefreq: 'daily', priority: '0.9' },
    { loc: '/compare', changefreq: 'weekly', priority: '0.7' },
    { loc: '/proposals', changefreq: 'daily', priority: '0.7' },
    // /officials (אינדקס מלא) הוסר מהמפה בשלב זה יחד עם קישורי הכניסה אליו.
    // הנתיב עצמו נשאר קיים — להחזרה מספיק לשחזר את השורה הזו ואת הקישורים.
    { loc: '/about', changefreq: 'monthly', priority: '0.6' },
    { loc: '/suggest', changefreq: 'monthly', priority: '0.5' },
    { loc: '/legal', changefreq: 'monthly', priority: '0.3' },
    { loc: '/accessibility', changefreq: 'monthly', priority: '0.3' },
];

function xmlEscape(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function urlTag(e: Entry): string {
    return [
        '  <url>',
        `    <loc>${xmlEscape(SITE_URL + e.loc)}</loc>`,
        e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : '',
        `    <changefreq>${e.changefreq}</changefreq>`,
        `    <priority>${e.priority}</priority>`,
        '  </url>',
    ]
        .filter(Boolean)
        .join('\n');
}

export const GET: RequestHandler = async ({ setHeaders }) => {
    const entries: Entry[] = [...STATIC_ENTRIES];

    try {
        const officials = await getRatedOfficials();
        for (const o of officials) {
            entries.push({
                loc: `/officials/${o.id}`,
                changefreq: o.stats.count > 0 ? 'daily' : 'weekly',
                // מדורג עם דירוגים חשוב יותר למנוע החיפוש
                priority: o.stats.count > 0 ? '0.8' : '0.6',
            });
        }
    } catch {
        // באקאנד לא זמין — מפה חלקית עדיפה על 500
    }

    try {
        const proposals = await listProposals();
        for (const p of proposals) {
            entries.push({ loc: `/proposals/${p.id}`, changefreq: 'weekly', priority: '0.6' });
        }
    } catch {
        // באקאנד לא זמין — מפה חלקית עדיפה על 500
    }

    setHeaders({
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
    });

    return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
            `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
            entries.map(urlTag).join('\n') +
            `\n</urlset>\n`,
    );
};
