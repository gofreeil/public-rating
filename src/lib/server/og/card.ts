// ============================================================
// card.ts - ייצור תמונת שיתוף (Open Graph) לכל מדורג
//
// עד היום כל מדורג בלי תמונת פנים נפל לאותה תמונה גנרית, כך שקישור
// לח"כ וקישור לשופט נראו זהים בוואטסאפ ולא נשאו את הציון — בדיוק
// המידע שבגללו שולחים את הקישור.
//
// SVG נבנה ידנית ומרונדר ב-resvg: העברית עוברת דרך rustybuzz ולכן
// ה-RTL והערבוב עם מספרים יוצאים נכון. הפונט מוטבע (fonts.json) כדי
// שהתוצאה לא תהיה תלויה בפונטי המערכת של שרת הפריסה.
// ============================================================

import { Resvg } from '@resvg/resvg-js';
import fonts from './fonts.json';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const fontBuffers = [
    Buffer.from(fonts.regular, 'base64'),
    Buffer.from(fonts.bold, 'base64'),
];

export interface CardInput {
    name: string;
    position: string;
    org: string;
    groupTitle: string;
    /** ממוצע 1-5, או null כשטרם דורג */
    average: number | null;
    count: number;
    /** תמונת פנים מוטבעת כ-data URI; ריק ⇒ עיגול ראשי תיבות */
    imageDataUri?: string;
}

/** הטקסט מוטמע ב-SVG ולכן חייב בריחה — שם מדורג הוא בסופו של דבר קלט */
function esc(s: string): string {
    return (s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * קיצור לפי רוחב משוער. resvg לא חושף מדידת טקסט לפני רינדור, ולכן
 * ההערכה מבוססת על רוחב ממוצע של תו בגופן Assistant (~0.52 מגודל הגופן).
 */
function fit(text: string, fontSize: number, maxWidth: number): string {
    // נמדד מול רינדור בפועל: אות עברית ב-Assistant תופסת ~0.48 מגודל הגופן
    const perChar = fontSize * 0.48;
    const max = Math.floor(maxWidth / perChar);
    const clean = (text ?? '').trim();
    return clean.length <= max ? clean : clean.slice(0, Math.max(1, max - 1)) + '…';
}

/** נתיב כוכב בעל חמש קצוות סביב מרכז נתון */
function starPath(cx: number, cy: number, r: number): string {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? r : r * 0.4;
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        pts.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`);
    }
    return `M${pts.join('L')}Z`;
}

/**
 * חמישה כוכבים סביב מרכז נתון, ממולאים מימין לשמאל לפי הציון.
 * המילוי החלקי נעשה ב-clipPath שנצמד לקצה הימני של הכוכב — הצד שממנו
 * המילוי מתחיל בכיוון קריאה עברי.
 */
function starsSvg(value: number, centerX: number, cy: number, r: number, gap: number): string {
    const total = 5;
    const step = r * 2 + gap;
    const groupWidth = total * r * 2 + (total - 1) * gap;
    // i=0 הוא הכוכב הימני ביותר
    const firstCx = centerX + groupWidth / 2 - r;

    const out: string[] = [];
    for (let i = 0; i < total; i++) {
        const x = firstCx - i * step;
        const path = starPath(x, cy, r);
        out.push(`<path d="${path}" fill="rgba(255,255,255,0.13)"/>`);

        const filled = Math.min(1, Math.max(0, value - i));
        if (filled <= 0) continue;

        if (filled >= 1) {
            out.push(`<path d="${path}" fill="#fbbf24"/>`);
            continue;
        }
        const w = r * 2 * filled;
        const clipId = `star-clip-${i}`;
        out.push(
            `<clipPath id="${clipId}"><rect x="${(x + r - w).toFixed(2)}" y="${(cy - r).toFixed(2)}" width="${w.toFixed(2)}" height="${(r * 2).toFixed(2)}"/></clipPath>` +
                `<path d="${path}" fill="#fbbf24" clip-path="url(#${clipId})"/>`,
        );
    }
    return out.join('');
}

/** ראשי תיבות לעיגול האווטאר כשאין תמונת פנים */
function initials(name: string): string {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2);
    return parts[0][0] + parts[1][0];
}

export function buildCardSvg(input: CardInput): string {
    const rated = input.average !== null && input.count > 0;
    // הכוכבים משתמשים באותו ערך מעוגל שמוצג במספר, אחרת 2.15 היה מציג
    // "2.2" לצד שבב כוכב של 0.15 שנראה כמו פגם רינדור
    const rounded = rated ? Math.round(input.average! * 10) / 10 : 0;
    const score = rated ? rounded.toFixed(1) : '';

    // הזהות בראש, צמודה לימין; האווטאר בקצה. הציון הוא הכותרת האמיתית
    // של הכרטיס ולכן הוא ממורכז על כל הרוחב — אחרת חצי הקנבס נשאר ריק.
    const AV_CX = 1078;
    const AV_CY = 138;
    const AV_R = 72;
    const TEXT_RIGHT = 984;
    const MID = OG_WIDTH / 2;

    const name = fit(input.name, 56, TEXT_RIGHT - 90);
    const subtitleRaw = [input.position, input.org].filter(Boolean).join(' · ');
    const subtitle = fit(subtitleRaw, 28, TEXT_RIGHT - 90);

    const avatar = input.imageDataUri
        ? `<clipPath id="avatar-clip"><circle cx="${AV_CX}" cy="${AV_CY}" r="${AV_R}"/></clipPath>
           <image href="${input.imageDataUri}" x="${AV_CX - AV_R}" y="${AV_CY - AV_R}" width="${AV_R * 2}" height="${AV_R * 2}"
                  preserveAspectRatio="xMidYMid slice" clip-path="url(#avatar-clip)"/>
           <circle cx="${AV_CX}" cy="${AV_CY}" r="${AV_R}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="3"/>`
        : `<circle cx="${AV_CX}" cy="${AV_CY}" r="${AV_R}" fill="url(#avatar-grad)"/>
           <text x="${AV_CX}" y="${AV_CY + 22}" font-family="Assistant" font-weight="700" font-size="62"
                 fill="#ffffff" text-anchor="middle">${esc(initials(input.name))}</text>`;

    const scoreBlock = rated
        ? `<text x="${MID}" y="405" font-family="Assistant" font-weight="700" font-size="160"
                 fill="#fbbf24" text-anchor="middle">${score}</text>
           <text x="${MID}" y="447" font-family="Assistant" font-weight="400" font-size="30"
                 fill="#64748b" text-anchor="middle" direction="rtl">מתוך 5</text>
           ${starsSvg(rounded, MID, 495, 21, 16)}
           <text x="${MID}" y="558" font-family="Assistant" font-weight="400" font-size="31"
                 fill="#94a3b8" text-anchor="middle" direction="rtl">מבוסס על ${input.count} דירוגי אזרחים</text>`
        : `<text x="${MID}" y="400" font-family="Assistant" font-weight="700" font-size="72"
                 fill="#ffffff" text-anchor="middle" direction="rtl">טרם דורג</text>
           ${starsSvg(0, MID, 465, 21, 16)}
           <text x="${MID}" y="552" font-family="Assistant" font-weight="700" font-size="38"
                 fill="#60a5fa" text-anchor="middle" direction="rtl">היו הראשונים לדרג</text>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
  <defs>
    <linearGradient id="accent" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#9333ea"/>
    </linearGradient>
    <linearGradient id="avatar-grad" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#9333ea"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.15" r="0.7">
      <stop offset="0%" stop-color="#2563eb" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#2563eb" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="#0f172a"/>
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#glow)"/>
  <rect width="${OG_WIDTH}" height="10" fill="url(#accent)"/>

  ${avatar}

  <text x="${TEXT_RIGHT}" y="118" font-family="Assistant" font-weight="700" font-size="56"
        fill="#ffffff" text-anchor="end" direction="rtl">${esc(name)}</text>
  ${
      subtitle
          ? `<text x="${TEXT_RIGHT}" y="164" font-family="Assistant" font-weight="400" font-size="28"
              fill="#94a3b8" text-anchor="end" direction="rtl">${esc(subtitle)}</text>`
          : ''
  }
  ${
      input.groupTitle
          ? `<text x="${TEXT_RIGHT}" y="207" font-family="Assistant" font-weight="400" font-size="24"
              fill="#60a5fa" text-anchor="end" direction="rtl">${esc(input.groupTitle)}</text>`
          : ''
  }

  <rect x="80" y="252" width="1040" height="1" fill="rgba(255,255,255,0.09)"/>

  ${scoreBlock}

  <rect x="80" y="583" width="1040" height="1" fill="rgba(255,255,255,0.09)"/>
  <text x="1120" y="613" font-family="Assistant" font-weight="700" font-size="26"
        fill="#e2e8f0" text-anchor="end" direction="rtl">דירוג ציבורי — הציבור מדרג את משרתיו</text>
  <text x="80" y="613" font-family="Assistant" font-weight="400" font-size="23"
        fill="#64748b" text-anchor="start">rating.gofreeil.com</text>
</svg>`;
}

/**
 * SVG ⇒ PNG. זורק אם resvg נכשל — הקורא אחראי לנפילה רכה.
 *
 * ה-cast נדרש כי @resvg/resvg-js@2.6.2 תומך ב-fontBuffers בזמן ריצה
 * (נבדק: בלי פונטים הטקסט לא מרונדר כלל, איתם כן) אבל לא מצהיר עליו
 * ב-index.d.ts, שמכיר רק fontFiles/fontDirs. טעינה מקבצים הייתה מחזירה
 * אותנו לתלות בנתיב על הדיסק בסביבת הפריסה — בדיוק מה שההטמעה מונעת.
 */
export function renderCard(input: CardInput): Buffer {
    const options = {
        font: { fontBuffers, defaultFontFamily: 'Assistant', loadSystemFonts: false },
        fitTo: { mode: 'width', value: OG_WIDTH },
    } as unknown as ConstructorParameters<typeof Resvg>[1];

    return Buffer.from(new Resvg(buildCardSvg(input), options).render().asPng());
}
