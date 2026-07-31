// ============================================================
// schema.ts - בוני JSON-LD (schema.org) לדפי הדירוג
// מטרה: תוצאות עשירות בגוגל + הבנה נכונה של האתר ע"י מנועי חיפוש ובוטים.
// ============================================================

import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_TAGLINE, SITE_URL, absUrl, metaTrim } from '$lib/seo';
import { CRITERIA } from './criteria';
import type { Group, OfficialStats, PublicReview, RatedOfficial, Official } from './types';

/** WebSite + חיפוש פנימי — מופיע פעם אחת, בדף הבית */
export function websiteSchema(officialCount: number, reviewCount: number): unknown {
    return [
        {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: SITE_NAME,
            alternateName: SITE_TAGLINE,
            url: SITE_URL,
            inLanguage: 'he-IL',
            description: `${officialCount} נבחרי ועובדי ציבור, ${reviewCount} דירוגי אזרחים`,
        },
        {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: SITE_NAME,
            url: SITE_URL,
            logo: absUrl('/images/public-rating-logo.png'),
            description: 'כלי ביקורת אזרחי — הציבור מדרג את נבחריו ואת משרתיו',
        },
    ];
}

/** דף מדורג — Person עם דירוג מצטבר וחוות דעת */
export function officialSchema(
    official: Official,
    stats: OfficialStats,
    reviews: PublicReview[],
    group: Group | undefined,
): unknown {
    const person: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        '@id': `${SITE_URL}/officials/${official.id}`,
        name: official.name,
        url: `${SITE_URL}/officials/${official.id}`,
        ...(official.position ? { jobTitle: official.position } : {}),
        ...(official.org ? { affiliation: { '@type': 'Organization', name: official.org } } : {}),
        ...(official.bio ? { description: metaTrim(official.bio, 300) } : {}),
        ...(official.image ? { image: absUrl(official.image) } : {}),
        ...(group ? { memberOf: { '@type': 'Organization', name: group.title } } : {}),
    };

    if (stats.count > 0 && stats.average !== null) {
        person.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: Math.round(stats.average * 10) / 10,
            ratingCount: stats.count,
            reviewCount: stats.count,
            bestRating: 5,
            worstRating: 1,
        };
    }

    // עד 10 חוות דעת עם טקסט — יותר מזה רק מנפח את הדף
    const withText = reviews.filter((r) => r.text?.trim()).slice(0, 10);
    if (withText.length) {
        person.review = withText.map((r) => ({
            '@type': 'Review',
            reviewRating: {
                '@type': 'Rating',
                ratingValue: Math.round(r.overall * 10) / 10,
                bestRating: 5,
                worstRating: 1,
            },
            author: { '@type': 'Person', name: r.anonymous || !r.reviewer_name ? 'אזרח/ית' : r.reviewer_name },
            reviewBody: metaTrim(r.text, 500),
            datePublished: r.created_at ? r.created_at.slice(0, 10) : undefined,
        }));
    }

    return person;
}

/** לוח דירוג — ItemList מדורג (עוזר לגוגל להבין את הסדר) */
export function boardSchema(group: Group, officials: RatedOfficial[]): unknown {
    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `דירוג ${group.title}`,
        description: group.blurb,
        numberOfItems: officials.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: officials.slice(0, 50).map((o, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${SITE_URL}/officials/${o.id}`,
            name: o.name,
        })),
    };
}

/** פירורי לחם — מוצגים בתוצאת החיפוש במקום ה-URL הגולמי */
export function breadcrumbSchema(trail: { name: string; path: string }[]): unknown {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: trail.map((t, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: t.name,
            item: absUrl(t.path),
        })),
    };
}

/** דף האודות — הסבר המתודולוגיה כשאלות ותשובות */
export function methodologySchema(): unknown {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            {
                '@type': 'Question',
                name: 'לפי אילו מדדים מדרגים באתר דירוג ציבורי?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: CRITERIA.map((c) => `${c.label}: ${c.description}`).join('. '),
                },
            },
            {
                '@type': 'Question',
                name: 'כיצד מחושב הציון הסופי?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text:
                        'הציון המוצג הוא ממוצע חמשת המדדים על פני כל הדירוגים. המיון בלוחות משתמש בשקלול ' +
                        'בייסיאני (בשיטת IMDb) כדי שמדורג עם דירוג בודד לא יעקוף מדורג עם ממוצע גבוה על עשרות דירוגים.',
                },
            },
            {
                '@type': 'Question',
                name: 'מי יכול לדרג?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'רק משתמשים רשומים ומחוברים, ודירוג אחד לכל משתמש לכל מדורג — כדי לשמור על אמינות הדירוג.',
                },
            },
        ],
    };
}

/** תמונת שיתוף ברירת מחדל */
export const OG_IMAGE = DEFAULT_OG_IMAGE;
