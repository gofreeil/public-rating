<script lang="ts">
    // ============================================================
    // כרטיס הפרסומת בטור הימני — עותק של הכרטיס ב-RightAdBanner של
    // קהילה בשכונה: אותן מידות, שכבות, צבעים ו-CSS, ואותם מודולים
    // משותפים (adStyle / adImageFit / logoClearance). פרסומת שמופצת משם
    // (עם landing._adStyle) נראית כאן בדיוק כמו שם, בלי שום התאמה.
    //
    // מה שכן שונה, ובכוונה: הריחוף כתוב ב-CSS מפורש (group-hover שבור
    // בפרויקט הזה), והגדלים של טקסט הריחוף והכפתור כתובים בערכים ולא
    // במחלקות text-xs/text-sm — כאן הסקאלה שלהן הוגדלה ב-app.css, ובקהילה
    // בשכונה לא. הערכים הם המידות שם.
    //
    // still = עותק סטטי (מסך הניהול): בלי ריחוף, בלי הגדלה ובלי tooltip.
    // ============================================================
    import { adImgFit, parseAdImageFit } from '$lib/adImageFit';
    import {
        parseAdStyle, legacyAdStyle, adStyleVars, logoAnchorClass, logoFreeStyle, logoBgStyle, logoSizeStyle, titleSizeStyle, logoCornerSide,
    } from '$lib/adStyle';
    import { normalizeGradientId } from '$lib/ads/gradients';
    import { logoClearance } from '$lib/logoClearance';

    interface CardAd {
        title: string;
        subtitle?: string;
        hoverText?: string;
        cta?: string;
        gradientId?: string;
        /** לוגו המפרסם; ריק כשלא הועלה לוגו */
        logo?: string;
        mainImage?: string;
        /** מיקום+זום מהבילדר; חסר = מרכז, מילוי המשבצת */
        mainImageFit?: unknown;
        /** העיצוב מהבילדר; חסר/null במודעות שנשלחו לפני שהוא נשמר */
        adStyle?: unknown;
        /** כרטיס מוצר מחנות החירות - בלי רצועת המחיר בתחתית */
        shop?: boolean;
    }

    let {
        ad,
        href = undefined,
        onclick = undefined,
        still = false,
    }: {
        ad: CardAd;
        href?: string;
        onclick?: () => void;
        still?: boolean;
    } = $props();

    // העיצוב שהמפרסם קבע בבילדר; מודעה שנשלחה לפני שהעיצוב נשמר מקבלת
    // את הכלל הישן (כותרת ארוכה ← לוגו מעל רצועת ה-CTA) - בדיוק כמו
    // בקהילה בשכונה
    const st = $derived(parseAdStyle(ad.adStyle) ?? legacyAdStyle(ad.title));
    const fit = $derived(parseAdImageFit(ad.mainImageFit));
    const gradient = $derived(normalizeGradientId(ad.gradientId));
    const cornerSide = $derived(logoCornerSide(st, Boolean(ad.logo)));
</script>

<!-- onclick מגיע רק יחד עם href, כלומר על <a> (ספירת הקליק בטור) -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:element
    this={href ? 'a' : 'div'}
    {href}
    {onclick}
    aria-label={href ? `${ad.title} — ${ad.subtitle ?? ''}` : undefined}
    class="promo-card relative block overflow-hidden rounded-lg shadow-lg {still ? '' : 'is-live transition-transform hover:scale-105'}"
    style={adStyleVars(st)}
>
    <!-- aspect-[144/450] = בדיוק היחס שהבילדר מציג בתצוגה החיה
         (live-demo-img-wrap). המפרסם מכוון שם מיקום וזום על מסגרת
         צרה וגבוהה, ולכן חייבים לשמור את אותו יחס - אחרת החיתוך
         שהוא בחר נשבר. -->
    <!-- הכותרת ותת-הכותרת עוקפות את הלוגו בכל מיקום שלו (logoClearance) -->
    <div class="relative aspect-[144/450] w-full overflow-hidden" use:logoClearance={ad}>
        <div class="absolute inset-0 overflow-hidden">
            {#if ad.mainImage}
                <!-- המיקום/זום שנבחרו בבילדר מוחלים גם כאן — הדמו הוא מה שרואים -->
                <img
                    src={ad.mainImage}
                    alt={ad.title}
                    loading="lazy"
                    decoding="async"
                    class="promo-fade h-full w-full object-cover"
                    use:adImgFit={fit}
                />
            {/if}
        </div>
        <!-- כותרת, רצועה אלכסונית, תת-כותרת ולוגו - אותן שכבות בדיוק
             של התצוגה החיה בבילדר -->
        <div class="promo-diag promo-fade bg-gradient-to-br {gradient}"></div>
        <div
            class="promo-title-top promo-fade"
            class:has-corner-logo-right={cornerSide === 'right'}
            class:has-corner-logo-left={cornerSide === 'left'}
            style="transform: translateY({st.titleOffsetY}px);"
        >
            <h3 class="promo-title" style="color: {st.titleColor};{titleSizeStyle(st.titleFontSize)}"><span class="logo-avoid" aria-hidden="true"></span>{ad.title}</h3>
        </div>
        {#if ad.subtitle}
            <div class="promo-sub-wrap promo-fade">
                <p class="promo-sub"><span class="logo-avoid" data-anchor="bottom" aria-hidden="true"></span>{ad.subtitle}</p>
            </div>
        {/if}
        {#if ad.logo}
            <img
                src={ad.logo}
                alt=""
                loading="lazy"
                decoding="async"
                data-ad-logo
                class="promo-logo promo-fade {logoAnchorClass(st, 'promo')} {st.logoShape === 'circle' ? 'promo-logo-circle' : ''}"
                style={logoFreeStyle(st) + logoBgStyle(st.logoBg) + logoSizeStyle(st.logoSize)}
            />
        {/if}
        {#if !still}
            <div class="promo-hover absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div class="relative z-10 px-3 text-center">
                    <h3 class="promo-hover-title text-white">{ad.title}</h3>
                    <p class="promo-hover-sub text-gray-200">{ad.subtitle}</p>
                </div>
            </div>
        {/if}
    </div>
    <!-- כרטיס מוצר מהחנות - בלי רצועת המחיר ("₪.. · לצפייה בחנות").
         גם פרסומת שטקסט הכפתור שלה נמחק מוצגת בלי רצועה -->
    {#if !ad.shop && ad.cta}
        <div class="promo-cta relative bg-gradient-to-r {gradient} p-2.5 text-center">
            <p class="promo-cta-text text-white">{ad.cta || ad.title}</p>
            {#if ad.hoverText && !still}
                <!-- pre-line + w-max: משפט בשורה אחת נשאר בשורה אחת, אבל ירידות שורה
                     שהמפרסם הקליד נשמרות, וטקסט ארוך נגמר ב-max-w במקום לגלוש -->
                <span
                    class="promo-cta-tip pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[15rem] -translate-x-1/2
                           rounded-lg border border-white/10 bg-gray-900 px-3 py-1.5 text-center whitespace-pre-line text-white shadow-xl"
                >
                    {ad.hoverText}
                </span>
            {/if}
        </div>
    {/if}
</svelte:element>

<style>
    /* הריחוף - group-hover של קהילה בשכונה, ב-CSS מפורש. אותו משך (1500ms)
       ואותו תנאי (@media hover:hover, כמו group-hover ב-Tailwind 4) */
    .promo-fade,
    .promo-hover {
        transition: opacity 1500ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .promo-hover {
        opacity: 0;
    }
    .promo-cta-tip {
        display: none;
    }
    @media (hover: hover) {
        .is-live:hover .promo-fade {
            opacity: 0;
        }
        .is-live:hover .promo-hover {
            opacity: 1;
        }
        .promo-cta:hover .promo-cta-tip {
            display: block;
        }
    }
    /* text-sm / text-xs / leading-tight של קהילה בשכונה, בערכים */
    .promo-hover-title {
        margin: 0 0 0.25rem;
        font-weight: 700;
        font-size: 0.875rem;
        line-height: 1.25rem;
    }
    .promo-hover-sub {
        margin: 0;
        font-size: 0.75rem;
        line-height: 1rem;
    }
    .promo-cta-text {
        margin: 0;
        font-weight: 700;
        font-size: 0.75rem;
        line-height: 1.25;
    }
    .promo-cta-tip {
        font-weight: 700;
        font-size: 0.75rem;
        line-height: 1rem;
    }

    /* מכאן והלאה - העתק של ה-CSS ב-RightAdBanner של קהילה בשכונה */

    /* שמות המחלקות מתחילים ב-promo ולא ב-ad בכוונה: EasyList מכילה כלל
       קוסמטי גנרי `##.ad-title` שמסתיר כל אלמנט עם המחלקה הזאת בכל אתר. */
    .promo-title-top {
        position: absolute;
        inset-inline: 0;
        top: 0;
        z-index: 5;
        padding: 0.55rem 0.7rem 0.85rem;
        text-align: center;
        background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0.78) 0%,
            rgba(0, 0, 0, 0.45) 55%,
            rgba(0, 0, 0, 0) 100%
        );
        pointer-events: none;
    }
    /* לוגו בפינה העליונה יושב באותו גובה של הכותרת. בלי שמירת המקום הזאת
       הוא היה מכסה את המילה האחרונה - המשבצת רחבה 144px בלבד.
       padding פיזי ולא inset-inline: הדף כולו RTL, והקצה הלוגי הפוך
       לצד שבו הלוגו באמת נמצא. אותם כללים בדיוק קיימים בבילדר. */
    .promo-title-top.has-corner-logo-right {
        padding-right: 46px;
    }
    .promo-title-top.has-corner-logo-left {
        padding-left: 46px;
    }

    /* הרצועה האלכסונית שמתחת לתמונה - אותו clip-path של .pro-diag בבילדר.
       המשתנים --diag-top-* מגיעים מ-adStyleVars על הכרטיס. */
    .promo-diag {
        position: absolute;
        inset: 0;
        clip-path: polygon(
            0 var(--diag-top-left, 88%),
            100% var(--diag-top-right, 78%),
            100% 100%,
            0 100%
        );
        opacity: 0.96;
        pointer-events: none;
    }
    /* פס הברק הלבן שחוצה את האלכסון */
    .promo-diag::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(
            125deg,
            transparent 30%,
            rgba(255, 255, 255, 0.18) 45%,
            transparent 60%
        );
        pointer-events: none;
    }
    /* גודל/רווח/יישור מגיעים מ-adStyleVars — מה שהמפרסם כיוון בשלב 5.
       ה-fallback הוא הערך שהיה קבוע כאן, כדי שמודעות ותיקות לא ישתנו. */
    .promo-sub-wrap {
        position: absolute;
        inset-inline: 0;
        bottom: 0;
        z-index: 4;
        padding: 0.55rem 0.7rem 1.1rem;
        text-align: var(--sub-align, right);
        pointer-events: none;
    }
    .promo-sub {
        margin: 0;
        color: rgba(255, 255, 255, 0.95);
        font-weight: 600;
        font-size: var(--sub-size, 0.88rem);
        line-height: var(--sub-lh, 1.3);
        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
    }
    /* משולש בלתי-נראה שגורם לשורה הראשונה להתקצר לפי שיפוע האלכסון.
       כשהלוגו בצד שמאל, logoClearance מחליף אותו ב-float משולב ומכבה
       אותו דרך --logo-avoid-tri. */
    .promo-sub::before {
        content: "";
        display: var(--logo-avoid-tri, block);
        float: left;
        width: 28%;
        height: 1.35em;
        shape-outside: polygon(0 0, 100% 0, 0 100%);
    }
    .promo-title {
        margin: 0;
        color: white;
        font-weight: 900;
        font-size: 1.15rem;
        line-height: 1.15;
        letter-spacing: 0.005em;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.85), 0 1px 2px rgba(0, 0, 0, 0.95);
    }
    /* ה-float שגורם לטקסט לעקוף את הלוגו - מוצג ומוצב רק ע"י logoClearance */
    .logo-avoid {
        display: none;
    }
    .promo-logo {
        position: absolute;
        z-index: 6;
        width: 36px;
        height: 36px;
        border-radius: 6px;
        background: white;
        padding: 3px;
        object-fit: contain;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    }
    /* right/left פיזיים - כמו בבילדר. עם inset-inline-end הלוגו קפץ לצד
       שמאל, כי הדף RTL והקצה הלוגי שם הוא שמאל. */
    .promo-logo-right {
        top: 6px;
        right: 6px;
        left: auto;
    }
    .promo-logo-left {
        top: 6px;
        left: 6px;
        right: auto;
    }
    /* עוגן "מעל ה-CTA": הלוגו רוכב על הפינה הימנית של הרצועה האלכסונית,
       מרכזו על --diag-top-right (18px = חצי מגובה הלוגו) */
    .promo-logo-cta {
        top: auto;
        bottom: calc(100% - var(--diag-top-right, 78%) - 18px);
        right: 6px;
        left: auto;
    }
    /* מיקום חופשי שהמפרסם גרר: הנקודה המדויקת מגיעה ב-style inline */
    .promo-logo-free {
        top: auto;
        bottom: auto;
        right: auto;
        left: auto;
    }
    .promo-logo-circle {
        border-radius: 50%;
    }
</style>
