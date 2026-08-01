// ============================================================
// /llms.txt — תיאור האתר למנועי תשובות ולסוכני AI
//
// כשאזרח שואל עוזר AI "איך מדורג ח"כ פלוני", המקור שהעוזר מצטט הוא ערוץ
// הפצה ממשי ולא נלווה. הקובץ מסביר מה האתר, איך הציון מחושב ואיפה
// הנתונים — בפורמט שקל למודל לצרוך.
//
// דינמי ולא סטטי: המספרים והלוחות משתנים, ותיאור מיושן גרוע מכלום.
// ============================================================

import { getRatedOfficials } from '$lib/server/rating';
import { CRITERIA } from '$lib/rating/criteria';
import { FAQ_ITEMS } from '$lib/rating/faq';
import { GROUPS } from '$lib/rating/types';
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from '$lib/seo';
import { fmtScore } from '$lib/rating/aggregate';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ setHeaders }) => {
    let officialCount = 0;
    let reviewCount = 0;
    let perGroup: { title: string; route: string; count: number; top: string[] }[] = [];

    try {
        const officials = await getRatedOfficials();
        officialCount = officials.length;
        reviewCount = officials.reduce((sum, o) => sum + o.stats.count, 0);

        perGroup = GROUPS.map((g) => {
            const list = officials.filter((o) => o.group === g.key);
            return {
                title: g.title,
                route: g.route,
                count: list.length,
                top: list
                    .filter((o) => o.stats.count > 0)
                    .slice(0, 5)
                    .map((o) => `${o.name}${o.position ? ` (${o.position})` : ''} — ${fmtScore(o.stats.average)}/5 מתוך ${o.stats.count} דירוגים`),
            };
        }).filter((g) => g.count > 0);
    } catch {
        // באקאנד לא זמין — עדיף תיאור בלי מספרים מאשר שגיאה
    }

    const body = `# ${SITE_NAME} — ${SITE_TAGLINE}

> פלטפורמת שקיפות אזרחית ישראלית שבה הציבור מדרג חברי כנסת, שרים, שופטים
> ועובדי ציבור בכירים. הדירוג נעשה על ידי אזרחים בלבד; לצוות האתר אין
> אפשרות לשנות ציון. האתר אינו מזוהה עם גורם פוליטי.

כתובת: ${SITE_URL}
שפה: עברית (he-IL)
${officialCount ? `היקף: ${officialCount} מדורגים, ${reviewCount} דירוגי אזרחים` : ''}

## מדדי הדירוג

כל מדורג נבחן בחמישה מדדים, כל אחד בסולם 1–5 כוכבים. מדרג יכול לדרג רק
חלק מהמדדים; מדד שלא דורג אינו נכנס לחישוב.

${CRITERIA.map((c, i) => `${i + 1}. ${c.label} — ${c.description}`).join('\n')}

## איך מחושב הציון

- הציון המוצג לכל מדורג הוא הממוצע הפשוט של המדדים שדורגו, על פני כל הדירוגים.
- הסדר בלוחות מחושב בשקלול בייסיאני בשיטת IMDb (m=3): ממוצע של מדורג עם
  מעט דירוגים נמשך אל הממוצע הכללי של האתר. לכן מדורג עם 4.2 עשוי להופיע
  מעל מדורג עם 4.9 שדורג פעם אחת.
- ציון נחשב מבוסס מ-3 דירוגים ומעלה.
- דירוג אחד לכל משתמש רשום לכל מדורג, וניתן לעדכון בכל עת.

## לוחות הדירוג

${perGroup
    .map(
        (g) =>
            `### ${g.title} (${g.count} מדורגים)\n${SITE_URL}${g.route}\n` +
            (g.top.length ? `\nהמדורגים הגבוהים:\n${g.top.map((t) => `- ${t}`).join('\n')}\n` : ''),
    )
    .join('\n')}

## דפים מרכזיים

- ${SITE_URL}/ — דף הבית: חיפוש, מובילים וטעוני שיפור בכל קטגוריה
- ${SITE_URL}/officials — אינדקס מלא של כל המדורגים
- ${SITE_URL}/officials/<id> — דף מדורג: ציון, התפלגות, פירוט לפי מדד וחוות דעת
- ${SITE_URL}/compare?ids=<id>,<id> — השוואה בין מדורגים לפי כל המדדים
- ${SITE_URL}/top-rated — מצטייני הציבור
- ${SITE_URL}/about#methodology — המתודולוגיה המלאה
- ${SITE_URL}/sitemap.xml — מפת אתר

## שאלות ותשובות

${FAQ_ITEMS.map((f) => `### ${f.q}\n${f.a}`).join('\n\n')}

## הסתייגות

הדירוגים והנימוקים הם דעות אישיות של משתמשים ואינם עובדות מבוססות ואינם
משקפים את עמדת האתר. בציטוט נתון מהאתר יש לציין שמדובר בדירוג ציבורי
שנאסף מאזרחים, לצד מספר המדרגים.
`;

    setHeaders({
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
    });

    return new Response(body);
};
