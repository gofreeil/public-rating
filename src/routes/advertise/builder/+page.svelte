<script lang="ts">
    // ============================================================
    // בילדר הפרסומת (שלב א': עיצוב הכרטיס) - עותק של הסטודיו בקהילה בשכונה.
    // אותם שלבים, פקדים, טווחים, ברירות מחדל, שמירת טיוטה אוטומטית ותצוגה חיה.
    // דף הנחיתה, המוצרים והשליחה יושבים בעמוד הבא (/advertise/builder/landing).
    //
    // מה ששייך לאתר הזה בלבד: המסלול נבחר במחירון (/advertise) ולא בתשלום
    // מקוון, התמונות נדחסות לתקרות של השרת כאן, ועריכה של פרסומת קיימת
    // (?edit=<id>) נטענת מהשרת דרך data.editAd ונשמרת ב-PUT.
    // ============================================================
    import { onMount, untrack } from "svelte";
    import CameraCapture from "$lib/components/CameraCapture.svelte";
    import { browser } from "$app/environment";
    import { goto } from "$app/navigation";
    import { _ } from "svelte-i18n";
    import { adImgFit, AD_ZOOM_MIN, AD_ZOOM_MAX } from "$lib/adImageFit";
    import MobileAdCard from "$lib/components/MobileAdCard.svelte";
    import {
        bandCorners, DEFAULT_AD_STYLE, logoCornerSide, type AdStyle, type SubAlign,
        DEFAULT_SUB_FONT_SIZE, SUB_FONT_SIZE_MIN, SUB_FONT_SIZE_MAX,
        DEFAULT_SUB_LINE_HEIGHT, SUB_LINE_HEIGHT_MIN, SUB_LINE_HEIGHT_MAX,
    } from "$lib/adStyle";
    import { logoClearance } from "$lib/logoClearance";
    import { normalizeGradientId } from "$lib/ads/gradients";
    import { planLabel } from "$lib/ads/plans";
    import { AD_DRAFT_KEY, clearAdSubmitted, getAdEditTarget, setAdEditTarget, clearAdEditTarget, getAdPlanDays } from "$lib/adDraft";

    // ===== Page payload (logged-in user prefill + admin status + ad being edited) =====
    let { data } = $props<{
        data: {
            layoutUser?: { email?: string | null; phone?: string | null; nickname?: string | null } | null;
            isSuperAdmin?: boolean;
            editAd?: any;
            editMissing?: boolean;
        };
    }>();

    // ===== Persistence =====
    const LS_KEY = AD_DRAFT_KEY;

    // ===== Access gate state =====
    let accessGranted = $state(false);
    let accessChecked = $state(false);
    let isSuperAdmin = $derived(Boolean(data?.isSuperAdmin));

    // ===== Chosen plan (picked on /advertise) =====
    let planDays = $state<number | null>(null);

    // ===== Form state =====
    type ProductRow = { id: number; name: string; price: string; image: string; description: string };

    let logo            = $state<string>("");                  // base64 data url - what is rendered (cropped circle or original)
    let logoOriginal    = $state<string>("");                  // base64 data url - raw upload kept as cropping source
    let logoShape       = $state<"square" | "circle">("square");
    let hoverLogo       = $state<boolean>(false);
    let hoverLogoX      = $state<number>(50);
    let hoverLogoY      = $state<number>(22);
    let hoverLogoSize   = $state<number>(56);
    let logoSize        = $state<number>(36);
    let logoBg          = $state<"white" | "black" | "clear">("white");
    let hasCircleCrop   = $state<boolean>(false);              // true once user confirmed a circular crop
    let logoPosition    = $state<"right" | "left" | "cta">("right");
    // Becomes true the first time the user picks a position manually.
    // While false, position auto-switches to "cta" when the title is long, "right" otherwise.
    let logoPositionExplicit = $state<boolean>(false);

    // ===== Free logo placement =====
    // Center of the logo as % of the ad image box. null on both axes = the logo still
    // sits on its default anchor (logoPosition). The moment the user drags it - or nudges
    // it with the arrow keys - these hold the exact spot they released it at.
    let logoFreeX = $state<number | null>(null);
    let logoFreeY = $state<number | null>(null);
    let logoFree  = $derived(logoFreeX !== null && logoFreeY !== null);
    let logoDragging = $state(false);

    // Anchor class used while the logo is still on its default spot
    let logoAnchorClass = $derived(
        logoPosition === "left" ? "ad-logo-left" : logoPosition === "cta" ? "ad-logo-cta" : "ad-logo-right"
    );
    // Inline placement, applied only once the user moved the logo themselves
    let logoFreeStyle = $derived(
        (logoFree
            ? `left:${logoFreeX}%; top:${logoFreeY}%; right:auto; bottom:auto; transform:translate(-50%,-50%);`
            : "") + (logoBg === "black" ? "background:#000;" : logoBg === "clear" ? "background:transparent;box-shadow:none;" : "") + (logoSize !== 36 ? `width:${logoSize}px;height:${logoSize}px;` : "")
    );

    // Drag metrics, measured on pointer-down against whichever preview the logo lives in
    // (live demo sidebar / step 7 desktop card) so the same code works in both.
    let dragWrapW = 0, dragWrapH = 0;
    let dragHalfW = 0, dragHalfH = 0;
    let dragStartX = 0, dragStartY = 0;
    let dragBaseCX = 0, dragBaseCY = 0;

    /** Measure the logo and its preview box; returns the logo center in px inside the box. */
    function measureLogo(el: HTMLElement): { cx: number; cy: number } | null {
        const wrap = el.parentElement;
        if (!wrap) return null;
        const wr = wrap.getBoundingClientRect();
        const lr = el.getBoundingClientRect();
        if (!wr.width || !wr.height || !lr.width || !lr.height) return null;
        dragWrapW = wr.width; dragWrapH = wr.height;
        dragHalfW = lr.width / 2; dragHalfH = lr.height / 2;
        return { cx: lr.left - wr.left + dragHalfW, cy: lr.top - wr.top + dragHalfH };
    }

    /** Store a logo center (px inside the preview box), clamped so it never leaves the ad. */
    function commitLogoCenter(cx: number, cy: number) {
        const x = Math.min(Math.max(cx, dragHalfW), dragWrapW - dragHalfW);
        const y = Math.min(Math.max(cy, dragHalfH), dragWrapH - dragHalfH);
        logoFreeX = Math.round((x / dragWrapW) * 1000) / 10;
        logoFreeY = Math.round((y / dragWrapH) * 1000) / 10;
        logoPositionExplicit = true;   // stops the automatic right/cta switching
    }

    function logoPointerDown(e: PointerEvent) {
        const el = e.currentTarget as HTMLElement;
        const center = measureLogo(el);
        if (!center) return;
        e.preventDefault();
        e.stopPropagation();
        dragBaseCX = center.cx; dragBaseCY = center.cy;
        dragStartX = e.clientX; dragStartY = e.clientY;
        logoDragging = true;
        try { el.setPointerCapture(e.pointerId); } catch {}
    }
    function logoPointerMove(e: PointerEvent) {
        if (!logoDragging) return;
        commitLogoCenter(dragBaseCX + (e.clientX - dragStartX), dragBaseCY + (e.clientY - dragStartY));
    }
    function logoPointerUp(e: PointerEvent) {
        if (!logoDragging) return;
        logoDragging = false;
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    }
    /** Keyboard parity for the drag: arrows nudge by 1% of the ad box, Shift+arrow by 5%. */
    function logoKeyDown(e: KeyboardEvent) {
        const keys: Record<string, [number, number]> = {
            ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]
        };
        const dir = keys[e.key];
        if (!dir) return;
        const el = e.currentTarget as HTMLElement;
        const center = measureLogo(el);
        if (!center) return;
        e.preventDefault();
        const stepPct = e.shiftKey ? 5 : 1;
        commitLogoCenter(
            center.cx + dir[0] * (dragWrapW * stepPct / 100),
            center.cy + dir[1] * (dragWrapH * stepPct / 100)
        );
    }
    /** Back to the automatic default spot. */
    function resetLogoPosition() {
        logoFreeX = null;
        logoFreeY = null;
        logoPositionExplicit = false;
    }
    /** Preset anchors stay available as one-click shortcuts - they drop any free placement. */
    function setLogoAnchor(pos: "right" | "left" | "cta") {
        logoFreeX = null;
        logoFreeY = null;
        logoPosition = pos;
        logoPositionExplicit = true;
    }

    // ===== Logo circular crop modal =====
    const CROP_STAGE = 320;
    let cropOpen     = $state(false);
    let cropZoom     = $state(1);
    let cropOffsetX  = $state(0);
    let cropOffsetY  = $state(0);
    let cropDragging = false;
    let cropDragStartX = 0, cropDragStartY = 0;
    let cropBaseOffsetX = 0, cropBaseOffsetY = 0;

    function openCropper() {
        if (!logoOriginal) return;
        if (!hasCircleCrop) { cropZoom = 1; cropOffsetX = 0; cropOffsetY = 0; }
        cropOpen = true;
    }
    function cancelCrop() {
        cropOpen = false;
        if (!hasCircleCrop) {
            logoShape = "square";
            if (logoOriginal) logo = logoOriginal;
        }
    }
    async function confirmCrop() {
        if (!logoOriginal) { cropOpen = false; return; }
        const img = new Image();
        img.src = logoOriginal;
        await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(); });

        const stage = CROP_STAGE;
        const aspectImg = img.width / img.height;
        let drawW: number, drawH: number;
        if (aspectImg > 1) { drawW = stage; drawH = stage / aspectImg; }
        else               { drawH = stage; drawW = stage * aspectImg; }

        const canvas = document.createElement("canvas");
        canvas.width = stage; canvas.height = stage;
        const ctx = canvas.getContext("2d")!;
        ctx.save();
        ctx.beginPath();
        ctx.arc(stage / 2, stage / 2, stage / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.translate(stage / 2 + cropOffsetX, stage / 2 + cropOffsetY);
        ctx.scale(cropZoom, cropZoom);
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        logo = canvas.toDataURL("image/png");
        hasCircleCrop = true;
        cropOpen = false;
    }
    function chooseSquare() {
        logoShape = "square";
        if (logoOriginal) logo = logoOriginal;
    }
    function chooseCircle() {
        logoShape = "circle";
        if (logoOriginal) openCropper();
    }
    function cropPointerDown(e: PointerEvent) {
        cropDragging = true;
        cropDragStartX = e.clientX; cropDragStartY = e.clientY;
        cropBaseOffsetX = cropOffsetX; cropBaseOffsetY = cropOffsetY;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    function cropPointerMove(e: PointerEvent) {
        if (!cropDragging) return;
        cropOffsetX = cropBaseOffsetX + (e.clientX - cropDragStartX);
        cropOffsetY = cropBaseOffsetY + (e.clientY - cropDragStartY);
    }
    function cropPointerUp(e: PointerEvent) {
        cropDragging = false;
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    }
    function cropWheel(e: WheelEvent) {
        e.preventDefault();
        const delta = -e.deltaY * 0.0015;
        cropZoom = Math.max(0.3, Math.min(4, cropZoom + delta));
    }
    let mainImage       = $state<string>("");                  // base64 data url
    let mainImageObjectX = $state<number>(50);                  // object-position X (0-100) for cropping
    let mainImageObjectY = $state<number>(50);                  // object-position Y (0-100) for cropping
    let mainImageZoom    = $state<number>(1);                   // 1 = cover; >1 תקריב, <1 התרחקות
    // ה-fit המאוחד שמוזרם לכל התצוגות (וגם נשמר עם המודעה בשליחה)
    let mainImageFit = $derived({ x: mainImageObjectX, y: mainImageObjectY, z: mainImageZoom });
    // תמונה נפרדת לגרסת הנייד. המשבצת בנייד רחבה ונמוכה ובדסקטופ צרה וגבוהה,
    // ולכן אותה תמונה נחתכת אחרת לגמרי. ריק = הנייד ממשיך להשתמש בתמונה הראשית.
    let mobileImage        = $state<string>("");
    let mobileImageObjectX = $state<number>(50);
    let mobileImageObjectY = $state<number>(50);
    let mobileImageZoom    = $state<number>(1);
    let mobileImageFit = $derived({ x: mobileImageObjectX, y: mobileImageObjectY, z: mobileImageZoom });
    // מה שמוצג בפועל בתצוגת הנייד - התמונה הייעודית אם הועלתה, אחרת הראשית
    let previewMobileImage = $derived(mobileImage || mainImage);
    let previewMobileFit   = $derived(mobileImage ? mobileImageFit : mainImageFit);
    let title           = $state<string>("");
    let titleColor      = $state<string>("#ffffff");
    let titleFontSize   = $state<number>(1.15);
    // לוגו בדף הנחיתה (נקבע בעמוד הנחיתה) - נשמר בטיוטה כדי שלא יתאפס בעריכה
    let lpLogoAlign = $state<"right" | "center" | "left">("right");
    let lpLogoBg = $state<"white" | "black" | "clear" | null>(null);
    let lpLogoSize = $state<number | null>(null);
    let titleOffsetY    = $state<number>(0);                    // vertical offset for title on banner (-20..+60 px)
    let subtitle        = $state<string>("");
    // טיפוגרפיית תת-הכותרת (שלב 5) - גודל, רווח בין שורות ויישור
    let subFontSize     = $state<number>(DEFAULT_SUB_FONT_SIZE);
    let subLineHeight   = $state<number>(DEFAULT_SUB_LINE_HEIGHT);
    let subAlign        = $state<SubAlign>("right");
    // הזזת הכותרת / הכיתוב / הכפתור בפופ-אפ הנייד (שלב 7), באחוזי רוחב הכרטיס
    let mobTitleX = $state<number>(0); let mobTitleY = $state<number>(0);
    let mobSubX   = $state<number>(0); let mobSubY   = $state<number>(0);
    let mobCtaX   = $state<number>(0); let mobCtaY   = $state<number>(0);
    const num0 = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0);
    function moveMobile(key: "title" | "sub" | "cta", x: number, y: number) {
        if (key === "title") { mobTitleX = x; mobTitleY = y; }
        else if (key === "sub") { mobSubX = x; mobSubY = y; }
        else { mobCtaX = x; mobCtaY = y; }
    }
    function resetMobilePositions() {
        mobTitleX = mobTitleY = mobSubX = mobSubY = mobCtaX = mobCtaY = 0;
    }
    let hoverText      = $state<string>("");
    let cta             = $state<string>("הקלק לפרטים והזמנות");
    // כרטיס מוצר מחנות החירות (שהופץ לאתר הזה) - בפופ-אפ הנייד שלו אין כפתור CTA
    let shopEdit        = $state(false);
    let gradient        = $state<string>("from-amber-500 to-orange-600");
    let diagHeight      = $state<number>(12);   // % of image - height of the diagonal color band (range 5..50)
    let landingHeadline = $state<string>("");
    let landingPitch    = $state<string>("");
    let landingExtended = $state<string>("");
    let landingImage    = $state<string>("");                   // separate hero image for landing page
    let landingAdvantages = $state<[string, string, string]>(["", "", ""]); // 3 product/service advantages
    let uniqueness      = $state<string>("");
    // untrack: ערך פתיחה מהפרופיל בלבד - רענון data לא ידרוס מה שהמפרסם הקליד
    let phone           = $state<string>(untrack(() => data?.layoutUser?.phone) ?? "");
    let whatsapp        = $state<string>(untrack(() => data?.layoutUser?.phone) ?? "");
    let website         = $state<string>("");
    let email           = $state<string>(untrack(() => data?.layoutUser?.email) ?? "");
    let address         = $state<string>("");
    let hours           = $state<string>("");
    let products        = $state<ProductRow[]>([]);
    let nextProductId   = 1;

    // ===== Tutorial state (lit-number + glowing title + finger pointer) =====
    // Note: steps 8+ (landing-link, products, uniqueness, address, submit, done)
    // moved to /about/advertise/builder/landing - this page ends at step 7 (preview).
    type Step =
        | "image" | "logo" | "title" | "subtitle" | "hover"
        | "gradient" | "preview"
        | "done";   // מצב טרמינלי לאחר שליחה - לא נכלל ב-stepOrder ואין לו כרטיס

    const stepOrder: Step[] = [
        "image", "logo", "title", "gradient", "subtitle", "hover", "preview"
    ];

    let activeStep = $state<Step>("image");

    // step -> {numLight, titleLight} flags (one entry per step)
    const litFlags: Record<Step, { num: boolean; title: boolean }> = $state({
        image:    { num: false, title: false },
        logo:     { num: false, title: false },
        title:    { num: false, title: false },
        subtitle: { num: false, title: false },
        hover:    { num: false, title: false },
        gradient: { num: false, title: false },
        preview:  { num: false, title: false },
        done:     { num: false, title: false },
    });

    const NUM_MS = 700;
    const TITLE_MS = 1500;

    function flashStep(step: Step) {
        const timers: number[] = [];
        litFlags[step].num = true;
        timers.push(window.setTimeout(() => (litFlags[step].num = false), NUM_MS));
        timers.push(window.setTimeout(() => (litFlags[step].title = true), NUM_MS));
        timers.push(window.setTimeout(() => (litFlags[step].title = false), NUM_MS + TITLE_MS));
        return () => timers.forEach(clearTimeout);
    }

    $effect(() => {
        if (!browser) return;
        const cleanup = flashStep(activeStep);
        return cleanup;
    });

    let stepRefs: Record<Step, HTMLElement | null> = $state({
        image: null, logo: null, title: null, subtitle: null, hover: null,
        gradient: null, preview: null, done: null,
    });

    // Demo positioning - the demo "jumps" to align with the active step's vertical position
    let demoTop = $state(0);
    function updateDemoPosition() {
        if (!browser) return;
        const stepEl = stepRefs[activeStep];
        if (!stepEl) return;
        const colsEl = stepEl.closest('.builder-cols') as HTMLElement | null;
        if (!colsEl) return;
        const stepRect = stepEl.getBoundingClientRect();
        const colsRect = colsEl.getBoundingClientRect();
        demoTop = stepRect.top - colsRect.top;
    }
    $effect(() => {
        // Track activeStep + window resize
        const _step = activeStep;
        if (!browser) return;
        requestAnimationFrame(updateDemoPosition);
        const onResize = () => requestAnimationFrame(updateDemoPosition);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    });

    // Apply diagHeight as CSS variables on root → all .pro-diag clip-paths update reactively.
    // bandCorners is the same helper the live site uses (adStyle.ts), so the band the
    // advertiser adjusts here is pixel-for-pixel the band that gets published.
    $effect(() => {
        if (!browser) return;
        const { left, right } = bandCorners(diagHeight);
        document.documentElement.style.setProperty('--diag-top-left', `${left}%`);
        document.documentElement.style.setProperty('--diag-top-right', `${right}%`);
        // אותם משתנים שהאתר מקבל מ-adStyleVars — כאן הם על ה-root כדי שכל
        // התצוגות בבילדר (דסקטופ, נייד, צילום-המסך הקטן) יתעדכנו יחד
        document.documentElement.style.setProperty('--sub-size', `${subFontSize}rem`);
        document.documentElement.style.setProperty('--sub-lh', String(subLineHeight));
        document.documentElement.style.setProperty('--sub-align', subAlign);
    });

    // ===== The design that travels with the ad =====
    // Everything the advertiser decides about the card - logo shape/spot, band
    // height, title offset and color - is packed here, saved into the draft and
    // sent with the submission. Without it the published ad fell back to the
    // site defaults and looked nothing like the live preview.
    let adStyle = $derived<AdStyle>({
        logoShape,
        logoBg,
        logoSize,
        hoverLogo,
        hoverLogoX,
        hoverLogoY,
        hoverLogoSize,
        lpLogoAlign,
        lpLogoBg,
        lpLogoSize,
        logoAnchor: logoPosition,
        logoX: logoFreeX,
        logoY: logoFreeY,
        bandHeight: diagHeight,
        titleOffsetY,
        titleFontSize,
        titleColor,
        subFontSize,
        subLineHeight,
        subAlign,
        mobTitleX, mobTitleY, mobSubX, mobSubY, mobCtaX, mobCtaY,
    });

    // Reserve room for a corner logo next to the title - same shared helper the
    // site uses, so the title wraps the same way in the preview and in the column.
    let titleCornerSide = $derived(logoCornerSide(adStyle, Boolean(logo)));

    function slowScrollTo(el: HTMLElement | null, duration = 1400) {
        if (!el) return;
        const startY = window.scrollY;
        const stickyHeader = document.querySelector<HTMLElement>("header");
        const headerOffset = stickyHeader ? stickyHeader.offsetHeight + 16 : 16;
        const targetY = el.getBoundingClientRect().top + window.scrollY - headerOffset;
        const distance = targetY - startY;
        if (Math.abs(distance) < 4) return;
        const startTime = performance.now();
        const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
        function step(now: number) {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            window.scrollTo(0, startY + distance * ease(t));
            if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function advance(to: Step) {
        activeStep = to;
        queueMicrotask(() => slowScrollTo(stepRefs[to]));
        // Update demo position to align with the new active step (animation via CSS transition)
        if (browser) {
            const tickAndUpdate = () => {
                document.body.dataset.demoStage = `to=${to}`;
                const stepEl = stepRefs[to];
                if (!stepEl) {
                    document.body.dataset.demoStage = `no-stepEl:${to}`;
                    return;
                }
                const colsEl = stepEl.closest('.builder-cols') as HTMLElement | null;
                if (!colsEl) {
                    document.body.dataset.demoStage = `no-colsEl`;
                    return;
                }
                const stepRect = stepEl.getBoundingClientRect();
                const colsRect = colsEl.getBoundingClientRect();
                const newTop = stepRect.top - colsRect.top;
                demoTop = newTop;
                document.body.dataset.demoStage = `ok:${to}=${newTop}`;
            };
            requestAnimationFrame(() => requestAnimationFrame(tickAndUpdate));
        }
    }

    function nextOf(s: Step): Step {
        const i = stepOrder.indexOf(s);
        return stepOrder[Math.min(i + 1, stepOrder.length - 1)];
    }

    function prevOf(s: Step): Step {
        const i = stepOrder.indexOf(s);
        return stepOrder[Math.max(i - 1, 0)];
    }

    /**
     * תיבת טקסט שגדלה לפי התוכן. 90 תווים עם ירידות שורה מגיעים בקלות
     * לארבע-חמש שורות, ותיבה בגובה קבוע חתכה אותן: המפרסם ראה גלילה
     * פנימית ולא את סוף המשפט שכתב. הפרמטר הוא הערך עצמו, כדי שגם
     * טעינת הטיוטה (ולא רק הקלדה) תתאים את הגובה.
     */
    function autoGrow(node: HTMLTextAreaElement, _value: string) {
        const fit = () => {
            node.style.height = 'auto';
            node.style.height = `${node.scrollHeight}px`;
        };
        fit();
        node.addEventListener('input', fit);
        return {
            update: () => fit(),
            destroy: () => node.removeEventListener('input', fit),
        };
    }

    // ===== Drag-and-drop state (visual highlight per zone) =====
    let isDraggingMain = $state(false);
    let isDraggingMobile = $state(false);
    let isDraggingLogo = $state(false);
    let isDraggingLandingImage = $state(false);
    let draggingProductId = $state<number | null>(null);

    // ===== Image upload helpers =====
    async function fileToDataUrl(file: File): Promise<string> {
        return new Promise((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result as string);
            fr.onerror = rej;
            fr.readAsDataURL(file);
        });
    }

    const MAIN_MAX_BYTES = 220 * 1024;
    const LOGO_MAX_BYTES = 90 * 1024;
    const MOBILE_MAX_BYTES = 120 * 1024;

    // ===== Auto-compress image to fit under maxBytes =====
    // Iteratively reduces JPEG quality, then dimensions, until size fits.
    function approxDataUrlBytes(dataUrl: string): number {
        const i = dataUrl.indexOf(",");
        const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
        return Math.ceil(b64.length * 3 / 4);
    }
    async function compressImageToFit(file: File, maxBytes: number, maxEdge = 1000): Promise<{ dataUrl: string; wasCompressed: boolean; originalMB: number; finalMB: number }> {
        const originalMB = file.size / (1024 * 1024);
        const srcUrl = await fileToDataUrl(file);
        // גם תמונה שקטנה מהתקרה נטענת פעם אחת ל-Image: קובץ שהדפדפן לא יודע
        // לפענח (HEIC מאייפון, קובץ פגום) חייב להיזרק כאן - אחרת הוא נשמר
        // כמו-שהוא ומוצג בהמשך כתמונה שבורה בלי שום הסבר.
        const img = new Image();
        img.src = srcUrl;
        await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("image load failed")); });
        if (file.size <= maxBytes) {
            return { dataUrl: srcUrl, wasCompressed: false, originalMB, finalMB: originalMB };
        }

        let w = img.naturalWidth, h = img.naturalHeight;
        const MAX_EDGE = maxEdge;
        const longest = Math.max(w, h);
        if (longest > MAX_EDGE) {
            const scale = MAX_EDGE / longest;
            w = Math.round(w * scale);
            h = Math.round(h * scale);
        }
        let quality = 0.85;
        let dataUrl = "";
        for (let attempt = 0; attempt < 10; attempt++) {
            const canvas = document.createElement("canvas");
            canvas.width = w; canvas.height = h;
            canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
            dataUrl = canvas.toDataURL("image/jpeg", quality);
            if (approxDataUrlBytes(dataUrl) <= maxBytes) break;
            if (quality > 0.5) {
                quality -= 0.1;
            } else {
                w = Math.round(w * 0.85);
                h = Math.round(h * 0.85);
                quality = 0.7;
            }
        }
        return { dataUrl, wasCompressed: true, originalMB, finalMB: approxDataUrlBytes(dataUrl) / (1024 * 1024) };
    }

    // ===== Compress notice (toast) =====
    let compressNotice = $state<{ visible: boolean; originalMB: number; finalMB: number; limitMB: number }>({ visible: false, originalMB: 0, finalMB: 0, limitMB: 0.22 });
    let compressNoticeTimer: number | null = null;
    function showCompressNotice(originalMB: number, finalMB: number, limitMB: number) {
        if (compressNoticeTimer) { clearTimeout(compressNoticeTimer); compressNoticeTimer = null; }
        compressNotice = { visible: true, originalMB, finalMB, limitMB };
        compressNoticeTimer = window.setTimeout(() => {
            compressNotice = { ...compressNotice, visible: false };
            compressNoticeTimer = null;
        }, 9000);
    }
    function dismissCompressNotice() {
        if (compressNoticeTimer) { clearTimeout(compressNoticeTimer); compressNoticeTimer = null; }
        compressNotice = { ...compressNotice, visible: false };
    }

    // ===== Upload error (toast) =====
    // כשל בקריאת תמונה (פורמט לא נתמך, קובץ פגום) חייב משוב נראה - בלעדיו
    // ההעלאה נכשלת בשקט והמפרסם בטוח שהאתר שבור (קרה בפועל, 23.8.2026).
    let uploadErrorVisible = $state(false);
    let uploadErrorTimer: number | null = null;
    function showUploadError() {
        if (uploadErrorTimer) { clearTimeout(uploadErrorTimer); uploadErrorTimer = null; }
        uploadErrorVisible = true;
        uploadErrorTimer = window.setTimeout(() => { uploadErrorVisible = false; uploadErrorTimer = null; }, 12000);
    }
    function dismissUploadError() {
        if (uploadErrorTimer) { clearTimeout(uploadErrorTimer); uploadErrorTimer = null; }
        uploadErrorVisible = false;
    }

    async function processImageFile(file: File | null | undefined, target: "main" | "mobile" | "logo" | "landingImage" | { kind: "product"; id: number }) {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            alert($_('advertise.b_upload_image_file'));
            return;
        }
        // המודעה כולה (כל התמונות כ-data-URI) נשמרת בשורה אחת ב-Strapi, ושם
        // תקרת בקשה של ~1MB. לכן לכל תמונה תקרה משלה (והשרת אוכף תקרה כוללת
        // של MAX_AD_TOTAL_BYTES): לוגו קטן, נייד נמוך, השאר 220KB.
        const MAX_BYTES = target === "logo" ? LOGO_MAX_BYTES : target === "mobile" ? MOBILE_MAX_BYTES : MAIN_MAX_BYTES;
        let result: Awaited<ReturnType<typeof compressImageToFit>>;
        try {
            result = await compressImageToFit(file, MAX_BYTES, target === "mobile" ? 800 : 1000);
        } catch {
            showUploadError();
            return;
        }
        const { dataUrl: url, wasCompressed, originalMB, finalMB } = result;
        if (wasCompressed) showCompressNotice(originalMB, finalMB, MAX_BYTES / (1024 * 1024));
        if (target === "main") {
            mainImage = url;
            mainImageObjectX = 50;       // reset position on new upload
            mainImageObjectY = 50;
            mainImageZoom = 1;
            // Don't auto-advance - let the user crop/position the image with the arrows
            // and click the explicit "next step" button when ready.
        } else if (target === "mobile") {
            mobileImage = url;
            mobileImageObjectX = 50;
            mobileImageObjectY = 50;
            mobileImageZoom = 1;
        } else if (target === "logo") {
            logoOriginal = url;
            logo = url;
            hasCircleCrop = false;
            if (logoShape === "circle") openCropper();
            // Don't auto-advance - let the user pick shape (square/circle) and position
            // (corner/band-corner) and click "next step" themselves.
        } else if (target === "landingImage") {
            landingImage = url;
        } else {
            const idx = products.findIndex(p => p.id === target.id);
            if (idx >= 0) {
                products[idx] = { ...products[idx], image: url };
                products = [...products];
            }
        }
    }

    async function handleImage(e: Event, target: "main" | "mobile" | "logo" | "landingImage") {
        const f = (e.target as HTMLInputElement).files?.[0];
        await processImageFile(f, target);
    }

    function clearImage(target: "main" | "mobile" | "logo" | "landingImage") {
        if (target === "main") { mainImage = ""; mainImageObjectX = 50; mainImageObjectY = 50; mainImageZoom = 1; }
        else if (target === "mobile") { mobileImage = ""; mobileImageObjectX = 50; mobileImageObjectY = 50; mobileImageZoom = 1; }
        else if (target === "landingImage") landingImage = "";
        else { logo = ""; logoOriginal = ""; hasCircleCrop = false; }
    }
    // אותם כלי מיקום/זום משרתים את התמונה הראשית ואת התמונה של הנייד
    function nudgeMainImage(dir: "up" | "down" | "left" | "right", which: "main" | "mobile" = "main") {
        const STEP = 8;
        const dy = dir === "up" ? -STEP : dir === "down" ? STEP : 0;
        const dx = dir === "left" ? -STEP : dir === "right" ? STEP : 0;
        const clamp = (v: number) => Math.min(100, Math.max(0, v));
        if (which === "main") {
            mainImageObjectY = clamp(mainImageObjectY + dy);
            mainImageObjectX = clamp(mainImageObjectX + dx);
        } else {
            mobileImageObjectY = clamp(mobileImageObjectY + dy);
            mobileImageObjectX = clamp(mobileImageObjectX + dx);
        }
    }
    /** זום פנימה/החוצה בצעדים יחסיים; 1 = מילוי המשבצת (cover) */
    function zoomMainImage(dir: "in" | "out", which: "main" | "mobile" = "main") {
        const FACTOR = 1.15;
        const cur = which === "main" ? mainImageZoom : mobileImageZoom;
        const next = dir === "in" ? cur * FACTOR : cur / FACTOR;
        const clamped = Math.round(Math.min(AD_ZOOM_MAX, Math.max(AD_ZOOM_MIN, next)) * 100) / 100;
        if (which === "main") mainImageZoom = clamped; else mobileImageZoom = clamped;
    }

    async function handleProductImage(e: Event, id: number) {
        const f = (e.target as HTMLInputElement).files?.[0];
        await processImageFile(f, { kind: "product", id });
    }

    // ===== Drag-and-drop handlers =====
    function dragOver(e: DragEvent, setActive: (v: boolean) => void) {
        if (!e.dataTransfer?.types.includes("Files")) return;
        e.preventDefault();
        e.stopPropagation();
        setActive(true);
    }
    function dragLeave(e: DragEvent, setActive: (v: boolean) => void) {
        e.preventDefault();
        e.stopPropagation();
        setActive(false);
    }
    async function handleDrop(e: DragEvent, target: "main" | "mobile" | "logo" | "landingImage" | { kind: "product"; id: number }, setActive: (v: boolean) => void) {
        e.preventDefault();
        e.stopPropagation();
        setActive(false);
        const f = e.dataTransfer?.files?.[0];
        await processImageFile(f, target);
    }

    function addProduct() {
        products = [...products, { id: nextProductId++, name: "", price: "", image: "", description: "" }];
    }
    function removeProduct(id: number) {
        products = products.filter(p => p.id !== id);
    }

    // ===== Field commit (advance on blur if value present) =====
    function commitField(field: Step) {
        if (activeStep !== field) return;
        advance(nextOf(field));
    }

    // ===== Color palette =====
    const palettes = [
        { id: "amber",    labelKey: "p_amber",    cls: "from-amber-500 to-orange-600" },
        { id: "orange",   labelKey: "p_orange",   cls: "from-orange-500 to-red-500" },
        { id: "yellow",   labelKey: "p_yellow",   cls: "from-yellow-400 to-amber-500" },
        { id: "red",      labelKey: "p_red",      cls: "from-red-600 to-pink-600" },
        { id: "rose",     labelKey: "p_rose",     cls: "from-rose-500 to-fuchsia-600" },
        { id: "crimson",  labelKey: "p_crimson",  cls: "from-rose-700 to-red-900" },
        { id: "fuchsia",  labelKey: "p_fuchsia",  cls: "from-fuchsia-500 to-purple-600" },
        { id: "purple",   labelKey: "p_purple",   cls: "from-purple-600 to-pink-600" },
        { id: "violet",   labelKey: "p_violet",   cls: "from-violet-600 to-indigo-700" },
        { id: "indigo",   labelKey: "p_indigo",   cls: "from-indigo-600 to-blue-600" },
        { id: "blue",     labelKey: "p_blue",     cls: "from-blue-600 to-cyan-600" },
        { id: "sky",      labelKey: "p_sky",      cls: "from-sky-400 to-blue-500" },
        { id: "teal",     labelKey: "p_teal",     cls: "from-teal-500 to-cyan-600" },
        { id: "emerald",  labelKey: "p_emerald",  cls: "from-emerald-500 to-teal-700" },
        { id: "green",    labelKey: "p_green",    cls: "from-green-600 to-emerald-600" },
        { id: "lime",     labelKey: "p_lime",     cls: "from-lime-400 to-green-500" },
        { id: "slate",    labelKey: "p_slate",    cls: "from-slate-500 to-gray-700" },
        { id: "dark",     labelKey: "p_dark",     cls: "from-gray-800 to-slate-900" },
        { id: "peach",    labelKey: "p_peach",    cls: "from-orange-300 to-pink-400" },
        { id: "mint",     labelKey: "p_mint",     cls: "from-emerald-300 to-teal-400" },
        { id: "gold",     labelKey: "p_gold",     cls: "from-yellow-500 to-amber-700" },
        { id: "midnight", labelKey: "p_midnight", cls: "from-slate-700 to-blue-900" },
    ];

    // ===== Mobile/Desktop preview toggle =====
    let previewMode = $state<"mobile" | "desktop">("mobile");
    let hoverPreview = $state(false);
    // בשלב 6 (טקסט בריחוף) - מציגים אוטומטית את הצד האחורי (מצב hover) של הפרסומת
    const showHover = $derived(hoverPreview || activeStep === "hover");

    // ===== Access gate =====
    // כניסה לסטודיו כש:
    //   1. סופר-אדמין (בדיקות והפצה ללא מסלול)
    //   2. נבחר מסלול פרסום במחירון (/advertise)
    //   3. עורכים פרסומת קיימת (?edit=<id>) - המסלול כבר נקבע בעת השליחה הראשונה
    function checkAccess() {
        if (!browser) return;
        planDays = getAdPlanDays();
        const editing = Boolean(new URLSearchParams(location.search).get("edit"));
        accessGranted = isSuperAdmin || planDays !== null || editing;
        accessChecked = true;
    }

    // ===== Persistence (autosave) =====
    onMount(() => {
        if (!browser) return;
        checkAccess();

        // Prevent the browser from opening a dropped image in a new tab
        // when the user releases outside an upload zone.
        const blockOutsideDrop = (e: DragEvent) => {
            if (e.dataTransfer?.types.includes("Files")) {
                e.preventDefault();
            }
        };
        window.addEventListener("dragover", blockOutsideDrop);
        window.addEventListener("drop", blockOutsideDrop);

        // beforeunload - warn before leaving with edits that did not reach the draft.
        // The draft autosaves to localStorage on every change, so the warning only
        // matters while the autosave is failing (quota) - otherwise nothing is lost.
        const beforeUnload = (e: BeforeUnloadEvent) => {
            if (accessGranted && formDirty && draftSaveFailed && !submitted) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", beforeUnload);

        if (!accessGranted) {
            return () => {
                window.removeEventListener("dragover", blockOutsideDrop);
                window.removeEventListener("drop", blockOutsideDrop);
                window.removeEventListener("beforeunload", beforeUnload);
            };
        }
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                logo            = d.logo ?? "";
                logoOriginal    = d.logoOriginal ?? d.logo ?? "";
                logoShape       = d.logoShape ?? "square";
                hoverLogo       = d.hoverLogo === true;
                hoverLogoX      = typeof d.hoverLogoX === 'number' ? d.hoverLogoX : 50;
                hoverLogoY      = typeof d.hoverLogoY === 'number' ? d.hoverLogoY : 22;
                hoverLogoSize   = typeof d.hoverLogoSize === 'number' ? d.hoverLogoSize : 56;
                logoSize        = typeof d.logoSize === "number" ? d.logoSize : 36;
                logoBg          = d.logoBg === "black" || d.logoBg === "clear" ? d.logoBg : "white";
                hasCircleCrop   = Boolean(d.hasCircleCrop);
                logoPosition    = d.logoPosition ?? "right";
                logoPositionExplicit = Boolean(d.logoPositionExplicit);
                logoFreeX       = typeof d.logoFreeX === 'number' ? d.logoFreeX : null;
                logoFreeY       = typeof d.logoFreeY === 'number' ? d.logoFreeY : null;
                mainImage       = d.mainImage ?? "";
                mainImageObjectX = typeof d.mainImageObjectX === 'number' ? d.mainImageObjectX : 50;
                mainImageObjectY = typeof d.mainImageObjectY === 'number' ? d.mainImageObjectY : 50;
                mainImageZoom    = typeof d.mainImageZoom === 'number' ? d.mainImageZoom : 1;
                mobileImage        = d.mobileImage ?? "";
                mobileImageObjectX = typeof d.mobileImageObjectX === 'number' ? d.mobileImageObjectX : 50;
                mobileImageObjectY = typeof d.mobileImageObjectY === 'number' ? d.mobileImageObjectY : 50;
                mobileImageZoom    = typeof d.mobileImageZoom === 'number' ? d.mobileImageZoom : 1;
                title           = d.title ?? "";
                titleColor      = typeof d.titleColor === 'string' ? d.titleColor : "#ffffff";
                titleFontSize   = typeof d.titleFontSize === 'number' ? d.titleFontSize : 1.15;
                lpLogoAlign = d.lpLogoAlign === "center" || d.lpLogoAlign === "left" ? d.lpLogoAlign : "right";
                lpLogoBg = d.lpLogoBg === "white" || d.lpLogoBg === "black" || d.lpLogoBg === "clear" ? d.lpLogoBg : null;
                lpLogoSize = typeof d.lpLogoSize === "number" ? d.lpLogoSize : null;
                titleOffsetY    = typeof d.titleOffsetY === 'number' ? d.titleOffsetY : 0;
                subtitle        = d.subtitle ?? "";
                subFontSize     = typeof d.subFontSize === 'number' ? d.subFontSize : DEFAULT_SUB_FONT_SIZE;
                subLineHeight   = typeof d.subLineHeight === 'number' ? d.subLineHeight : DEFAULT_SUB_LINE_HEIGHT;
                subAlign        = (d.subAlign === 'center' || d.subAlign === 'left' || d.subAlign === 'justify') ? d.subAlign : 'right';
                mobTitleX = num0(d.mobTitleX); mobTitleY = num0(d.mobTitleY);
                mobSubX   = num0(d.mobSubX);   mobSubY   = num0(d.mobSubY);
                mobCtaX   = num0(d.mobCtaX);   mobCtaY   = num0(d.mobCtaY);
                hoverText       = d.hoverText ?? "";
                cta             = (d.cta && d.cta !== "לפרטים נוספים") ? d.cta : "הקלק לפרטים והזמנות";
                gradient        = normalizeGradientId(d.gradient ?? gradient);
                diagHeight      = typeof d.diagHeight === 'number' ? d.diagHeight : 25;
                landingHeadline = d.landingHeadline ?? "";
                landingPitch    = d.landingPitch ?? "";
                landingExtended = d.landingExtended ?? "";
                landingImage    = d.landingImage ?? "";
                if (Array.isArray(d.landingAdvantages)) {
                    landingAdvantages = [
                        d.landingAdvantages[0] ?? "",
                        d.landingAdvantages[1] ?? "",
                        d.landingAdvantages[2] ?? "",
                    ];
                }
                uniqueness      = d.uniqueness ?? "";
                phone           = d.phone ?? phone;
                whatsapp        = d.whatsapp ?? whatsapp;
                website         = d.website ?? "";
                email           = d.email ?? email;
                address         = d.address ?? "";
                hours           = d.hours ?? "";
                products        = Array.isArray(d.products) ? d.products : [];
                nextProductId   = (products.reduce((m, p) => Math.max(m, p.id), 0) || 0) + 1;
            }
        } catch {}

        // ===== עריכה ממוקדת: ?edit=<id> - "ערוך" שנלחץ על פרסומת מסוימת בנכסים =====
        // התוכן של אותה פרסומת נטען מהשרת ודורס את הטיוטה, כדי שהמפרסם יערוך את
        // מה שבאמת רץ על האתר - לא טיוטה ישנה. אם הטיוטה כבר שייכת לאותה פרסומת
        // (עריכה שנקטעה באמצע) ממשיכים ממנה בלי לדרוס את מה שכבר שונה.
        // המזהה נשמר ונוסע עם השליחה, וכך האישור מחליף בדיוק את הפרסומת הזו.
        const editId = new URLSearchParams(location.search).get("edit");
        if (editId) {
            const continuingSameAd = getAdEditTarget() === editId;
            setAdEditTarget(editId);
            shopEdit = data?.editAd?.shop === true;
            if (data?.editAd && !continuingSameAd) applyEditedAd(data.editAd);
            else if (data?.editMissing) editLoadState = "failed";
            if (data?.editAd) editingAdTitle = data.editAd.title ?? "";
        }

        return () => {
            window.removeEventListener("dragover", blockOutsideDrop);
            window.removeEventListener("drop", blockOutsideDrop);
            window.removeEventListener("beforeunload", beforeUnload);
        };
    });

    // Auto-default for logo position: when title is long (>20 chars) there's no room
    // for a corner logo next to the title, so park it next to the CTA. Stops as soon
    // as the user picks a position manually.
    $effect(() => {
        if (!logo || logoPositionExplicit) return;
        const next: "right" | "cta" = title.trim().length > 20 ? "cta" : "right";
        if (logoPosition !== next) logoPosition = next;
    });

    // Dirty flag for the beforeunload warning: set only on a real user edit in
    // this session. The autosave effect's first run is the initial load/restore
    // of the draft (not an edit), so it is skipped via autosaveRanOnce.
    let formDirty = $state(false);
    let autosaveRanOnce = false;
    // הטיוטה (כולל כל התמונות כ-base64) יכולה לחצות את מכסת ה-localStorage;
    // אז setItem נזרק, שום דבר לא נשמר, והעבודה נעלמת במעבר לעמוד הנחיתה.
    // הדגל מציג אזהרה קבועה עד שהטיוטה מצטמקת ונשמרת שוב בהצלחה.
    let draftSaveFailed = $state(false);

    $effect(() => {
        if (!browser) return;
        const snapshot = {
            logo, logoOriginal, hasCircleCrop, logoShape, logoBg, logoSize, hoverLogo, hoverLogoX, hoverLogoY, hoverLogoSize, logoPosition, logoPositionExplicit, logoFreeX, logoFreeY, mainImage, mainImageObjectX, mainImageObjectY, mainImageZoom,
            mobileImage, mobileImageObjectX, mobileImageObjectY, mobileImageZoom, title, titleColor, titleOffsetY, titleFontSize, lpLogoAlign, lpLogoBg, lpLogoSize,
            subtitle, subFontSize, subLineHeight, subAlign, hoverText, cta, gradient, diagHeight,
            mobTitleX, mobTitleY, mobSubX, mobSubY, mobCtaX, mobCtaY,
            landingHeadline, landingPitch, landingExtended, landingImage, landingAdvantages, uniqueness, phone, whatsapp, website,
            email, address, hours, products,
        };
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(snapshot));
            draftSaveFailed = false;
        } catch {
            draftSaveFailed = true;
        }
        if (autosaveRanOnce) {
            formDirty = true;
            // עריכה אמיתית אחרי שליחה - יש שוב מה לסיים, והתזכורת חוזרת
            clearAdSubmitted();
        } else {
            autosaveRanOnce = true;
        }
    });

    let submitted = $state(false);

    // ===== טעינת פרסומת קיימת לעריכה (הגעה עם ?edit=<id>) =====
    // 'loading' עד שהשרת עונה; 'failed' משאיר את הטיוטה הקיימת ומציג אזהרה,
    // כדי שהמפרסם לא יערוך בטעות תוכן ישן בחושבו שזו הפרסומת החיה.
    let editLoadState = $state<"idle" | "loading" | "failed">("idle");
    let editingAdTitle = $state<string>("");

    // הפרסומת נטענת בשרת (data.editAd, אחרי אימות בעלות) - כאן רק מזינים את השדות
    function applyEditedAd(ad: any) {
        editLoadState = "loading";
        try {
            logo             = ad.logo ?? "";
            logoOriginal     = ad.logo ?? "";
            mainImage        = ad.mainImage ?? "";
            mainImageObjectX = typeof ad.mainImageFit?.x === "number" ? ad.mainImageFit.x : 50;
            mainImageObjectY = typeof ad.mainImageFit?.y === "number" ? ad.mainImageFit.y : 50;
            mainImageZoom    = typeof ad.mainImageFit?.z === "number" ? ad.mainImageFit.z : 1;
            mobileImage        = ad.mobileImage ?? "";
            mobileImageObjectX = typeof ad.mobileImageFit?.x === "number" ? ad.mobileImageFit.x : 50;
            mobileImageObjectY = typeof ad.mobileImageFit?.y === "number" ? ad.mobileImageFit.y : 50;
            mobileImageZoom    = typeof ad.mobileImageFit?.z === "number" ? ad.mobileImageFit.z : 1;
            title    = ad.title ?? "";
            subtitle = ad.subtitle ?? "";
            hoverText = ad.hoverText ?? "";
            cta      = ad.cta || "הקלק לפרטים והזמנות";
            gradient = normalizeGradientId(ad.gradientId || gradient);

            // העיצוב שנשמר עם המודעה; מודעה ותיקה (null) נשארת על כללי ברירת
            // המחדל של הבילדר - אותם כללים שמעצבים אותה גם על האתר.
            const st = ad.adStyle;
            if (st) {
                logoShape            = st.logoShape === "circle" ? "circle" : "square";
                hasCircleCrop        = st.logoShape === "circle";
                logoBg               = st.logoBg ?? "white";
                logoSize             = st.logoSize ?? 36;
                hoverLogo            = st.hoverLogo === true;
                hoverLogoX           = st.hoverLogoX ?? 50;
                hoverLogoY           = st.hoverLogoY ?? 22;
                hoverLogoSize        = st.hoverLogoSize ?? 56;
                logoPosition         = st.logoAnchor ?? "right";
                logoPositionExplicit = true;
                logoFreeX            = typeof st.logoX === "number" ? st.logoX : null;
                logoFreeY            = typeof st.logoY === "number" ? st.logoY : null;
                diagHeight           = typeof st.bandHeight === "number" ? st.bandHeight : diagHeight;
                titleFontSize        = typeof st.titleFontSize === "number" ? st.titleFontSize : 1.15;
                lpLogoAlign = st.lpLogoAlign === "center" || st.lpLogoAlign === "left" ? st.lpLogoAlign : "right";
                lpLogoBg = st.lpLogoBg === "white" || st.lpLogoBg === "black" || st.lpLogoBg === "clear" ? st.lpLogoBg : null;
                lpLogoSize = typeof st.lpLogoSize === "number" ? st.lpLogoSize : null;
                titleOffsetY         = typeof st.titleOffsetY === "number" ? st.titleOffsetY : 0;
                titleColor           = typeof st.titleColor === "string" ? st.titleColor : "#ffffff";
                subFontSize          = typeof st.subFontSize === "number" ? st.subFontSize : DEFAULT_SUB_FONT_SIZE;
                subLineHeight        = typeof st.subLineHeight === "number" ? st.subLineHeight : DEFAULT_SUB_LINE_HEIGHT;
                subAlign             = (st.subAlign === "center" || st.subAlign === "left" || st.subAlign === "justify") ? st.subAlign : "right";
                mobTitleX = num0(st.mobTitleX); mobTitleY = num0(st.mobTitleY);
                mobSubX   = num0(st.mobSubX);   mobSubY   = num0(st.mobSubY);
                mobCtaX   = num0(st.mobCtaX);   mobCtaY   = num0(st.mobCtaY);
            }

            landingHeadline = ad.landing?.headline ?? "";
            landingPitch    = ad.landing?.pitch ?? "";
            landingExtended = ad.landing?.extended ?? "";
            landingImage    = ad.landing?.image ?? "";
            landingAdvantages = [
                ad.landing?.advantages?.[0] ?? "",
                ad.landing?.advantages?.[1] ?? "",
                ad.landing?.advantages?.[2] ?? "",
            ];
            uniqueness = ad.landing?.uniqueness ?? "";
            phone      = ad.landing?.phone ?? phone;
            whatsapp   = ad.landing?.whatsapp ?? whatsapp;
            website    = ad.landing?.website ?? "";
            email      = ad.landing?.email ?? email;
            address    = ad.landing?.address ?? "";
            hours      = ad.landing?.hours ?? "";
            products   = Array.isArray(ad.landing?.products) ? ad.landing.products : [];
            nextProductId = (products.reduce((m, p) => Math.max(m, p.id), 0) || 0) + 1;

            editingAdTitle = ad.title ?? "";
            editLoadState = "idle";
        } catch (e) {
            console.warn("[builder] applyEditedAd failed:", e);
            editLoadState = "failed";
        }
    }

    function resetDraft() {
        if (!confirm($_('advertise.b_reset_confirm'))) return;
        try { localStorage.removeItem(LS_KEY); } catch {}
        clearAdSubmitted();
        // עריכה ממוקדת: איפוס = התחלה מחדש מהתוכן החי של הפרסומת. ניקוי
        // היעד גורם לטעינה מחדש מהשרת אחרי הרענון (ה-URL עדיין נושא ?edit).
        clearAdEditTarget();
        location.reload();
    }

    // ===== Step 7 → Landing page transition =====
    // After the user finishes step 7 (preview), we move them to a separate page
    // dedicated to designing the landing page. The draft is already in localStorage.
    let movingToLanding = $state(false);
    async function goToLandingEditor() {
        if (movingToLanding) return;
        movingToLanding = true;
        // מעבר מכוון לעורך דף הנחיתה - לא "יציאה מהאתר". הטיוטה כבר נשמרה
        // ב-localStorage והעורך הבא קורא בדיוק אותה, ולכן אזהרת beforeunload
        // כאן הייתה התראת שווא שהבהילה מפרסמים באמצע התהליך.
        formDirty = false;
        await goto("/advertise/builder/landing");
    }

    // ===== Design-help modal - הפנייה נשלחת כהודעה לצוות הניהול של האתר =====
    let helpOpen        = $state<boolean>(false);
    let helpProblem     = $state<string>("");
    let helpContact     = $state<string>("");
    let helpSubmitting  = $state<boolean>(false);
    let helpError       = $state<string>("");
    let helpSent        = $state<boolean>(false);

    function openHelp() {
        helpSent = false;
        helpProblem = "";
        helpContact = data?.layoutUser?.email ?? data?.layoutUser?.nickname ?? "";
        helpError = "";
        helpOpen = true;
        // focus the textarea after the modal renders
        queueMicrotask(() => {
            setTimeout(() => document.getElementById("help-problem-input")?.focus(), 30);
        });
    }
    function closeHelp() {
        if (helpSubmitting) return;
        helpOpen = false;
    }
    function buildDraftSummary(): string {
        const parts: string[] = [];
        if (title)      parts.push($_('advertise.b_d_title', { values: { v: title } }));
        if (subtitle)   parts.push($_('advertise.b_d_subtitle', { values: { v: subtitle } }));
        if (mainImage)  parts.push($_('advertise.b_d_main_image'));
        if (logo)       parts.push($_('advertise.b_d_logo'));
        if (hoverText)  parts.push($_('advertise.b_d_hover', { values: { v: `${hoverText.slice(0, 60)}${hoverText.length > 60 ? "…" : ""}` } }));
        if (gradient)   parts.push($_('advertise.b_d_gradient', { values: { v: gradient } }));
        if (titleColor && titleColor !== "#ffffff") parts.push($_('advertise.b_d_title_color', { values: { v: titleColor } }));
        return parts.join(" · ");
    }
    async function submitHelp() {
        const problem = helpProblem.trim();
        const contact = helpContact.trim();
        if (problem.length < 5) {
            helpError = $_('advertise.b_err_describe');
            return;
        }
        const isLoggedIn = Boolean(data?.layoutUser?.email || data?.layoutUser?.nickname);
        if (!isLoggedIn && !contact) {
            helpError = $_('advertise.b_err_contact');
            return;
        }
        helpError = "";
        helpSubmitting = true;
        const draftSummary = buildDraftSummary();
        try {
            const res = await fetch("/api/ads/design-help", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ problem, contact, draftSummary }),
            });
            const out = await res.json().catch(() => ({}));
            if (!res.ok) {
                helpError = out?.error || $_('advertise.b_err_send');
                return;
            }
            helpOpen = false;
            helpSent = true;
            window.setTimeout(() => { helpSent = false; }, 9000);
        } catch {
            helpError = $_('advertise.r_err_network');
        } finally {
            helpSubmitting = false;
        }
    }
</script>

<svelte:head>
    <title>{$_('advertise.r_builder_head')}</title>
    <meta name="robots" content="noindex" />
</svelte:head>

{#if accessChecked && !accessGranted}
    <!-- ===== GATE - a plan must be chosen first ===== -->
    <div class="max-w-xl mx-auto px-4 py-12 md:py-20 text-center" dir="rtl">
        <div class="text-6xl mb-4">🔒</div>
        <h1 class="text-2xl md:text-4xl font-black text-amber-400 mb-3">
            {$_('advertise.r_gate_title')}
        </h1>
        <p class="text-gray-300 text-base md:text-lg mb-6 leading-relaxed">
            {$_('advertise.r_gate_p1')}
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <a href="/advertise"
               class="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black transition-colors">
                {$_('advertise.r_gate_cta')}
            </a>
        </div>
    </div>
{:else if !accessChecked}
    <!-- Brief loading state to avoid flicker -->
    <div class="min-h-[40vh]" aria-hidden="true"></div>
{:else}
<div class="ad-builder max-w-5xl mx-auto px-4 py-8 md:py-12" dir="rtl">

    <!-- Floating toast: image was auto-compressed -->
    {#if compressNotice.visible}
        <div class="compress-toast" role="status" aria-live="polite">
            <button type="button" class="compress-toast-close" onclick={dismissCompressNotice} aria-label={$_('advertise.b_close_notice')}>✕</button>
            <div class="flex items-start gap-3">
                <span class="text-3xl flex-shrink-0">🪄</span>
                <div class="flex-1 min-w-0 text-right">
                    <p class="font-black text-amber-200 text-sm md:text-base mb-1">
                        {$_('advertise.b_ct_title')}
                    </p>
                    <p class="text-gray-100 text-xs md:text-sm leading-relaxed">
                        {$_('advertise.b_ct_p1')}<strong class="text-amber-200">{$_('advertise.b_mb', { values: { n: compressNotice.limitMB.toFixed(2) } })}</strong>.
                        {$_('advertise.b_ct_p2')} <strong class="text-amber-200">{$_('advertise.b_mb', { values: { n: compressNotice.originalMB.toFixed(1) } })}</strong>
                        {$_('advertise.b_ct_p3')}<strong class="text-amber-200">{$_('advertise.b_mb', { values: { n: compressNotice.finalMB.toFixed(1) } })}</strong>.
                        <br/>
                        {$_('advertise.b_ct_p4')}
                    </p>
                </div>
            </div>
        </div>
    {/if}

    <!-- Floating toast: image could not be read (unsupported format / corrupt file) -->
    {#if uploadErrorVisible}
        <div class="compress-toast error-toast" role="alert">
            <button type="button" class="compress-toast-close" onclick={dismissUploadError} aria-label={$_('advertise.b_close_notice')}>✕</button>
            <div class="flex items-start gap-3">
                <span class="text-3xl flex-shrink-0">❌</span>
                <p class="flex-1 min-w-0 text-right text-red-100 text-sm md:text-base font-bold leading-relaxed m-0">
                    {$_('advertise.b_err_image_read')}
                </p>
            </div>
        </div>
    {/if}

    <!-- Persistent warning: draft exceeds localStorage quota and is NOT being saved -->
    {#if draftSaveFailed}
        <div class="compress-toast error-toast draft-warn" role="alert">
            <div class="flex items-start gap-3">
                <span class="text-3xl flex-shrink-0">⚠️</span>
                <p class="flex-1 min-w-0 text-right text-red-100 text-sm md:text-base font-bold leading-relaxed m-0">
                    {$_('advertise.b_err_draft_save')}
                </p>
            </div>
        </div>
    {/if}

    <!-- Header / hero -->
    <div class="text-center mb-8 md:mb-12">
        <div class="text-5xl mb-3">🎨</div>
        <h1 class="text-3xl md:text-5xl font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent mb-3">
            {$_('advertise.b_title')}
        </h1>
        <p class="text-gray-300 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            {$_('advertise.r_hero_1')}
            <br/>{$_('advertise.b_hero_2')}
        </p>

        <!-- עריכה ממוקדת: מציין איזו פרסומת נערכת עכשיו / כשל בטעינת התוכן שלה -->
        {#if editLoadState === "failed"}
            <div class="mt-5 mx-auto max-w-2xl rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-right">
                <p class="text-red-300 font-bold text-sm m-0">⚠️ {$_('advertise.b_edit_load_failed')}</p>
            </div>
        {:else if editingAdTitle}
            <div class="mt-5 mx-auto max-w-2xl rounded-2xl border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-right">
                <p class="text-blue-200 font-bold text-sm m-0">✏️ {$_('advertise.b_editing_ad', { values: { title: editingAdTitle } })}</p>
            </div>
        {/if}

        <!-- המסלול שנבחר במחירון -->
        {#if planDays && !editingAdTitle}
            <div class="mt-5 mx-auto max-w-2xl rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-right">
                <p class="text-amber-200 font-bold text-sm m-0">
                    📢 {$_('advertise.r_plan_chosen', { values: { plan: planLabel(planDays) } })}
                    <a href="/advertise" class="text-amber-400 hover:text-amber-300 underline underline-offset-2 mr-2">{$_('advertise.r_plan_change')}</a>
                </p>
            </div>
        {/if}

        <!-- Autosave callout - explicit resume-from-profile message -->
        <div class="mt-3 mx-auto max-w-2xl rounded-2xl border border-green-500/40 bg-green-500/8 px-4 py-3 md:px-5 md:py-4 text-right">
            <div class="flex items-start gap-3">
                <span class="text-2xl flex-shrink-0">💾</span>
                <div class="flex-1 min-w-0">
                    <p class="font-black text-green-300 text-sm md:text-base mb-1">
                        {$_('advertise.b_autosave_title')}
                    </p>
                    <p class="text-gray-300 text-xs md:text-sm leading-relaxed">
                        {$_('advertise.r_autosave_p1')}
                        <br/>
                        {$_('advertise.r_autosave_p2')}
                    </p>
                </div>
            </div>
        </div>

        <div class="mt-3 flex items-center justify-center gap-3 text-xs text-gray-500">
            <button type="button" onclick={resetDraft} class="text-amber-400 hover:text-amber-300 underline underline-offset-2">
                {$_('advertise.b_reset')}
            </button>
        </div>
    </div>

    <!-- ========== Two-column wrapper: steps on right (RTL start), live demo on left (RTL end) ========== -->
    <div class="builder-cols">
    <div class="builder-steps">

    <!-- =================== STEP 1: MAIN IMAGE =================== -->
    <!-- לחיצה על הכרטיס היא קיצור עכבר בלבד; משתמש מקלדת מגיע לשלב ע"י Tab
         לתוך הפקדים שבו, ולכן נוסף onfocusin שמדליק את אותו שלב -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <section
        bind:this={stepRefs.image}
        class="step-card"
        onclick={() => activeStep === "image" || (activeStep = "image")}
        onfocusin={() => activeStep === "image" || (activeStep = "image")}
    >
        <div class="step-head" class:step-title-light={litFlags.image.title}>
            <span class="step-num" class:step-num-light={litFlags.image.num}>1</span>
            <h2>{$_('advertise.b_s1_title')}</h2>
            {#if activeStep === "image"}
                <span class="tutorial-finger" aria-hidden="true">👇</span>
            {/if}
        </div>
        <p class="step-help">{$_('advertise.b_s1_help')}</p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Tips first → on RIGHT in RTL grid -->
            <div class="bg-white/3 rounded-2xl border border-white/10 p-4 md:p-6 text-gray-300">
                <p class="font-bold text-amber-400 mb-3 text-base md:text-xl">{$_('advertise.b_tips_title')}</p>
                <ul class="space-y-2 md:space-y-3 text-[13px] md:text-lg leading-relaxed">
                    <li>{$_('advertise.b_tip1')}</li>
                    <li>{$_('advertise.b_tip2')}</li>
                    <li>{$_('advertise.b_tip3')}</li>
                    <li>{$_('advertise.b_tip4')}</li>
                </ul>
            </div>

            <!-- Upload zone second → on LEFT in RTL grid -->
            <label class="upload-zone"
                   class:has-image={!!mainImage}
                   class:dragging={isDraggingMain}
                   ondragover={(e) => dragOver(e, v => isDraggingMain = v)}
                   ondragleave={(e) => dragLeave(e, v => isDraggingMain = v)}
                   ondrop={(e) => handleDrop(e, "main", v => isDraggingMain = v)}>
                {#if mainImage}
                    <img src={mainImage} alt={$_('advertise.b_main_image_alt')}
                         style:object-fit="cover"
                         style:object-position="{mainImageObjectX}% {mainImageObjectY}%"
                         use:adImgFit={mainImageFit} />
                    <button type="button" class="remove-x" onclick={(e) => { e.preventDefault(); clearImage("main"); }} aria-label={$_('advertise.b_remove_image')}>✕</button>
                    <!-- Directional crop nudges - let user position the image inside the demo frame -->
                    <button type="button" class="crop-arrow crop-arrow-up"    onclick={(e) => { e.preventDefault(); nudgeMainImage("up"); }}    aria-label={$_('advertise.b_nudge_up')}>▲</button>
                    <button type="button" class="crop-arrow crop-arrow-down"  onclick={(e) => { e.preventDefault(); nudgeMainImage("down"); }}  aria-label={$_('advertise.b_nudge_down')}>▼</button>
                    <button type="button" class="crop-arrow crop-arrow-left"  onclick={(e) => { e.preventDefault(); nudgeMainImage("left"); }}  aria-label={$_('advertise.b_nudge_left')}>◀</button>
                    <button type="button" class="crop-arrow crop-arrow-right" onclick={(e) => { e.preventDefault(); nudgeMainImage("right"); }} aria-label={$_('advertise.b_nudge_right')}>▶</button>
                    <button type="button" class="crop-reset" onclick={(e) => { e.preventDefault(); mainImageObjectX = 50; mainImageObjectY = 50; mainImageZoom = 1; }} aria-label={$_('advertise.b_reset_pos')}>⊙</button>
                    <button type="button" class="crop-zoom zoom-in"  onclick={(e) => { e.preventDefault(); zoomMainImage("in"); }}  aria-label={$_('advertise.b_zoom_in')}>＋</button>
                    <button type="button" class="crop-zoom zoom-out" onclick={(e) => { e.preventDefault(); zoomMainImage("out"); }} aria-label={$_('advertise.b_zoom_out')}>－</button>
                {:else}
                    <div class="upload-empty">
                        <div class="text-4xl mb-2">📸</div>
                        <p class="font-bold text-base text-white">
                            {isDraggingMain ? $_('advertise.b_drop_here') : $_('advertise.b_click_or_drag')}
                        </p>
                        <p class="text-xs text-gray-400 mt-1">{$_('advertise.b_upload_note')}</p>
                    </div>
                {/if}
                <input type="file" accept="image/*" onchange={(e) => handleImage(e, "main")} class="hidden" />
            </label>
            <div class="mt-2">
                <CameraCapture onfiles={(files) => processImageFile(files[0], "main")} class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 hover:border-amber-400/60 bg-white/5 hover:bg-amber-500/10 text-gray-200 hover:text-white text-sm font-bold transition-all cursor-pointer" />
            </div>
        </div>
        {#if mainImage}
            <p class="crop-hint">{$_('advertise.b_crop_hint')}</p>
            <div class="step-nav-row">
                <button type="button" class="step-nav-btn" onclick={() => advance("logo")}>
                    {$_('advertise.b_done_centering')}
                </button>
            </div>
        {/if}
    </section>

    <!-- =================== STEP 2: LOGO =================== -->
    <section bind:this={stepRefs.logo} class="step-card">
        <div class="step-head" class:step-title-light={litFlags.logo.title}>
            <span class="step-num" class:step-num-light={litFlags.logo.num}>2</span>
            <h2>{$_('advertise.b_s2_title')}</h2>
            {#if activeStep === "logo"}
                <span class="tutorial-finger" aria-hidden="true">👇</span>
            {/if}
        </div>
        <p class="step-help">{$_('advertise.b_s2_help_pre')} <strong class="text-amber-300">{$_('advertise.b_s2_help_strong')}</strong> {$_('advertise.b_s2_help_post')}</p>

        <div class="flex items-center gap-3 flex-wrap">
            <div class="flex flex-col items-center gap-1">
                <label class="upload-zone-sm"
                       class:has-image={!!logo}
                       class:dragging={isDraggingLogo}
                       ondragover={(e) => dragOver(e, v => isDraggingLogo = v)}
                       ondragleave={(e) => dragLeave(e, v => isDraggingLogo = v)}
                       ondrop={(e) => handleDrop(e, "logo", v => isDraggingLogo = v)}>
                    {#if logo}
                        <img src={logo} alt={$_('advertise.b_logo_alt')} />
                        <button type="button" class="remove-x" onclick={(e) => { e.preventDefault(); clearImage("logo"); }} aria-label={$_('advertise.b_remove_logo')}>✕</button>
                    {:else}
                        <div class="text-center">
                            <div class="text-2xl mb-1">{isDraggingLogo ? "✨" : "🏷️"}</div>
                            <p class="text-xs font-bold text-gray-300">{isDraggingLogo ? $_('advertise.b_release') : $_('advertise.b_upload_logo')}</p>
                        </div>
                    {/if}
                    <input type="file" accept="image/*" onchange={(e) => handleImage(e, "logo")} class="hidden" />
                </label>
                <CameraCapture onfiles={(files) => processImageFile(files[0], "logo")} compact class="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-white/15 hover:border-amber-400/60 bg-white/5 hover:bg-amber-500/10 text-gray-300 hover:text-white transition-all cursor-pointer" />
                {#if logo && logoShape === 'circle' && hasCircleCrop}
                    <button type="button" onclick={openCropper}
                        class="text-[10px] text-amber-300 hover:text-amber-200 underline">
                        {$_('advertise.b_edit_crop')}
                    </button>
                {/if}
            </div>

            {#if logo}
                <!-- Logo shape + position controls - placed side-by-side -->
                <div class="flex flex-row flex-wrap gap-2 self-center">
                    <div>
                        <p class="text-xs font-bold text-gray-400 mb-1">{$_('advertise.b_crop_shape')}</p>
                        <div class="inline-flex rounded-lg border border-white/10 bg-black/20 p-1">
                            <button type="button" onclick={chooseSquare}
                                class="px-2.5 py-1 rounded-md text-xs font-bold transition-colors
                                       {logoShape === 'square' ? 'bg-amber-500 text-black' : 'text-gray-300 hover:text-white'}">
                                {$_('advertise.b_square')}
                            </button>
                            <button type="button" onclick={chooseCircle}
                                class="px-2.5 py-1 rounded-md text-xs font-bold transition-colors
                                       {logoShape === 'circle' ? 'bg-amber-500 text-black' : 'text-gray-300 hover:text-white'}">
                                {$_('advertise.b_circle')}
                            </button>
                        </div>
                    </div>
                    <div>
                        <p class="text-xs font-bold text-gray-400 mb-1">{$_('advertise.b_logo_bg')}</p>
                        <div class="inline-flex rounded-lg border border-white/10 bg-black/20 p-1">
                            {#each [["white", "b_bg_white"], ["black", "b_bg_black"], ["clear", "b_bg_clear"]] as [v, k]}
                                <button type="button" onclick={() => (logoBg = v as typeof logoBg)}
                                    class="px-2.5 py-1 rounded-md text-xs font-bold transition-colors
                                           {logoBg === v ? 'bg-amber-500 text-black' : 'text-gray-300 hover:text-white'}">
                                    {$_('advertise.' + k)}
                                </button>
                            {/each}
                        </div>
                    </div>
                    <div>
                        <p class="text-xs font-bold text-gray-400 mb-1">{$_('advertise.b_logo_size')}</p>
                        <div class="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                            <button type="button" aria-label="-" onclick={() => (logoSize = Math.max(20, logoSize - 4))}
                                class="w-6 h-6 rounded-md text-sm font-bold text-gray-300 hover:text-white bg-white/5">−</button>
                            <input type="range" min="20" max="80" step="2" bind:value={logoSize} class="w-20 accent-amber-500" />
                            <button type="button" aria-label="+" onclick={() => (logoSize = Math.min(80, logoSize + 4))}
                                class="w-6 h-6 rounded-md text-sm font-bold text-gray-300 hover:text-white bg-white/5">+</button>
                        </div>
                    </div>
                    <div>
                        <p class="text-xs font-bold text-gray-400 mb-1">{$_('advertise.b_logo_pos')}</p>
                        <div class="inline-flex rounded-lg border border-white/10 bg-black/20 p-1">
                            <button type="button" onclick={() => setLogoAnchor("right")}
                                class="px-2.5 py-1 rounded-md text-xs font-bold transition-colors
                                       {!logoFree && logoPosition === 'right' ? 'bg-amber-500 text-black' : 'text-gray-300 hover:text-white'}">
                                {$_('advertise.b_pos_right')}
                            </button>
                            <button type="button" onclick={() => setLogoAnchor("left")}
                                class="px-2.5 py-1 rounded-md text-xs font-bold transition-colors
                                       {!logoFree && logoPosition === 'left' ? 'bg-amber-500 text-black' : 'text-gray-300 hover:text-white'}">
                                {$_('advertise.b_pos_left')}
                            </button>
                            <button type="button" onclick={() => setLogoAnchor("cta")}
                                class="px-2.5 py-1 rounded-md text-xs font-bold transition-colors
                                       {!logoFree && logoPosition === 'cta' ? 'bg-amber-500 text-black' : 'text-gray-300 hover:text-white'}">
                                {$_('advertise.b_pos_bottom')}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Free placement: drag the logo on the live preview to any spot -->
                <div class="w-full flex items-center justify-between gap-2 flex-wrap mt-1">
                    <p class="text-[11px] font-bold text-amber-300/90 flex items-center gap-1">
                        <span aria-hidden="true">🖐️</span>
                        <span>{$_('advertise.b_logo_drag_hint')}</span>
                    </p>
                    {#if logoFree}
                        <span class="text-[11px] font-bold text-gray-400 flex items-center gap-2">
                            <span class="rounded-md bg-black/30 border border-white/10 px-2 py-0.5 tabular-nums">
                                {logoFreeX}% · {logoFreeY}%
                            </span>
                            <button type="button" onclick={resetLogoPosition}
                                class="rounded-md border border-white/15 px-2 py-0.5 text-amber-300 hover:text-amber-200 hover:border-amber-400/60 transition-colors">
                                {$_('advertise.b_logo_pos_reset')}
                            </button>
                        </span>
                    {/if}
                </div>
            {/if}

        </div>

        <div class="step-nav-row">
            <button type="button" class="step-nav-btn" onclick={() => advance(prevOf("logo"))}>
                {$_('advertise.b_prev_step')}
            </button>
            <button type="button" class="step-nav-btn" onclick={() => advance("title")}>
                {logo ? $_('advertise.b_next_step') : $_('advertise.b_skip_step')}
            </button>
        </div>

        <!-- ===== Circular crop modal ===== -->
        {#if cropOpen}
            <div class="crop-modal-bg" role="dialog" aria-modal="true" aria-label={$_('advertise.b_crop_modal_aria')}>
                <div class="crop-modal">
                    <div class="crop-modal-head">
                        <h3>{$_('advertise.b_crop_title')}</h3>
                        <button type="button" class="crop-modal-x" onclick={cancelCrop} aria-label={$_('advertise.close')}>✕</button>
                    </div>
                    <p class="crop-help">{$_('advertise.b_crop_help')}</p>
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <!-- משטח גרירה לחיתוך. אין לו מקבילת מקלדת ישירה, אבל אותה
                         פעולה זמינה בכפתורי הזום ＋/－ שמתחתיו -->
                    <div class="crop-stage"
                         onpointerdown={cropPointerDown}
                         onpointermove={cropPointerMove}
                         onpointerup={cropPointerUp}
                         onpointercancel={cropPointerUp}
                         onwheel={cropWheel}>
                        <img src={logoOriginal} alt={$_('advertise.b_logo_alt')} class="crop-img" draggable="false"
                             style:transform="translate({cropOffsetX}px, {cropOffsetY}px) scale({cropZoom})" />
                        <div class="crop-circle-mask"></div>
                    </div>
                    <div class="crop-controls">
                        <span class="crop-zoom-label">{$_('advertise.b_zoom')}</span>
                        <input type="range" min="0.3" max="4" step="0.01" bind:value={cropZoom} class="crop-zoom-slider" aria-label={$_('advertise.b_zoom_level')} />
                        <span class="crop-zoom-val">{Math.round(cropZoom * 100)}%</span>
                    </div>
                    <div class="crop-actions">
                        <button type="button" class="crop-btn-cancel" onclick={cancelCrop}>{$_('advertise.b_cancel')}</button>
                        <button type="button" class="crop-btn-confirm" onclick={confirmCrop}>{$_('advertise.b_confirm_crop')}</button>
                    </div>
                </div>
            </div>
        {/if}
    </section>

    <!-- =================== STEP 3: TITLE =================== -->
    <section bind:this={stepRefs.title} class="step-card">
        <div class="step-head" class:step-title-light={litFlags.title.title}>
            <span class="step-num" class:step-num-light={litFlags.title.num}>3</span>
            <h2>{$_('advertise.b_s3_title')}</h2>
            {#if activeStep === "title"}
                <span class="tutorial-finger" aria-hidden="true">👇</span>
            {/if}

            <!-- Title color picker - inline to the left of the heading -->
            <div class="title-color-rail" aria-label={$_('advertise.b_title_color_aria')}>
                <span class="title-color-label">{$_('advertise.b_pick_title_color')}</span>
                {#each [
                    { c: "#ffffff", labelKey: "c_white" },
                    { c: "#fbbf24", labelKey: "c_gold" },
                    { c: "#fde047", labelKey: "c_yellow" },
                    { c: "#fb923c", labelKey: "c_orange" },
                    { c: "#f87171", labelKey: "c_red" },
                    { c: "#f9a8d4", labelKey: "c_pink" },
                    { c: "#c4b5fd", labelKey: "c_purple" },
                    { c: "#67e8f9", labelKey: "c_cyan" },
                    { c: "#86efac", labelKey: "c_green" },
                    { c: "#0f172a", labelKey: "c_black" }
                ] as p}
                    <button type="button"
                            onclick={() => (titleColor = p.c)}
                            class="title-color-dot"
                            class:selected={titleColor === p.c}
                            style:background={p.c}
                            title={$_(`advertise.${p.labelKey}`)}
                            aria-label={$_(`advertise.${p.labelKey}`)}
                            aria-pressed={titleColor === p.c}>
                    </button>
                {/each}
                <label class="title-color-custom" title={$_('advertise.b_custom_color')}>
                    <input type="color" bind:value={titleColor} aria-label={$_('advertise.b_custom_color_pick')} />
                    <span>🎨</span>
                </label>
            </div>
        </div>
        <p class="step-help">{$_('advertise.b_s3_help')}</p>

        <input type="text" bind:value={title} maxlength="40"
               onfocus={() => activeStep === "title" || (activeStep = "title")}
               onblur={() => title.trim() && commitField("title")}
               placeholder={$_('advertise.b_s3_ph')}
               class="text-input" />
        <div class="flex items-center justify-end gap-2 text-xs text-gray-500 mt-2">
            <span>{title.length}/40</span>
        </div>

        <div class="mt-4">
            <div class="flex items-center justify-between mb-1.5">
                <p class="text-sm font-bold text-gray-300">{$_('advertise.b_title_size')} <span class="text-amber-300">{titleFontSize.toFixed(2)}</span></p>
                <button type="button" onclick={() => (titleFontSize = 1.15)}
                        class="text-[11px] text-gray-400 hover:text-amber-300 underline">{$_('advertise.b_reset_word')}</button>
            </div>
            <input type="range" min="0.8" max="1.8" step="0.05" bind:value={titleFontSize}
                   class="w-full accent-amber-500" aria-label={$_('advertise.b_title_size')} />
        </div>

        <!-- Title vertical offset slider - move title up/down on the banner -->
        <div class="mt-4">
            <div class="flex items-center justify-between mb-1.5">
                <p class="text-sm font-bold text-gray-300">{$_('advertise.b_title_pos')} <span class="text-amber-300">{titleOffsetY > 0 ? `+${titleOffsetY}` : titleOffsetY}px</span></p>
                <button type="button" onclick={() => (titleOffsetY = 0)}
                        class="text-[11px] text-gray-400 hover:text-amber-300 underline">{$_('advertise.b_reset_word')}</button>
            </div>
            <input type="range" min="-20" max="60" step="1" bind:value={titleOffsetY}
                   class="w-full accent-amber-500" aria-label={$_('advertise.b_title_pos_aria')} />
            <div class="flex justify-between text-[11px] text-gray-500 mt-1">
                <span>{$_('advertise.b_up')}</span>
                <span>{$_('advertise.b_down')}</span>
            </div>
        </div>

        <div class="step-nav-row">
            <button type="button" class="step-nav-btn" onclick={() => advance(prevOf("title"))}>
                {$_('advertise.b_prev_step')}
            </button>
            {#if title}
                <button type="button" class="step-nav-btn" onclick={() => commitField("title")}>
                    {$_('advertise.b_next_step')}
                </button>
            {/if}
        </div>
    </section>

    <!-- =================== STEP 4: GRADIENT (color + band height) =================== -->
    <section bind:this={stepRefs.gradient} class="step-card">
        <div class="step-head" class:step-title-light={litFlags.gradient.title}>
            <span class="step-num" class:step-num-light={litFlags.gradient.num}>4</span>
            <h2>{$_('advertise.b_s4_title')}</h2>
            {#if activeStep === "gradient"}
                <span class="tutorial-finger" aria-hidden="true">👇</span>
            {/if}
        </div>
        <p class="step-help">{$_('advertise.b_s4_help')}</p>

        <!-- Color palette - 22 gradients in a 2-column grid -->
        <div class="mt-3">
            <p class="text-sm font-bold text-gray-300 mb-2">{$_('advertise.b_band_color')}</p>
            <div class="color-rail" aria-label={$_('advertise.b_band_color_aria')} style="margin-inline:auto">
                {#each palettes as p}
                    <button type="button"
                            onclick={() => (gradient = p.cls)}
                            class="color-dot bg-gradient-to-br {p.cls}"
                            class:selected={gradient === p.cls}
                            title={$_(`advertise.${p.labelKey}`)}
                            aria-label={$_(`advertise.${p.labelKey}`)}
                            aria-pressed={gradient === p.cls}>
                    </button>
                {/each}
            </div>
        </div>

        <!-- Diagonal band height slider -->
        <div class="mt-5">
            <div class="flex items-center justify-between mb-1.5">
                <p class="text-sm font-bold text-gray-300">{$_('advertise.b_band_height')} <span class="text-amber-300">{diagHeight}%</span> {$_('advertise.b_of_image_height')}</p>
            </div>
            <input type="range" min="5" max="50" step="1" bind:value={diagHeight}
                   class="w-full accent-amber-500" aria-label={$_('advertise.b_band_height_aria')} />
            <div class="flex justify-between text-[11px] text-gray-500 mt-1">
                <span>{$_('advertise.b_band_low')}</span>
                <span>{$_('advertise.b_band_high')}</span>
            </div>
        </div>

        <div class="step-nav-row">
            <button type="button" class="step-nav-btn" onclick={() => advance(prevOf("gradient"))}>
                {$_('advertise.b_prev_step')}
            </button>
            <button type="button" class="step-nav-btn" onclick={() => advance("subtitle")}>
                {$_('advertise.b_continue_next')}
            </button>
        </div>
    </section>

    <!-- =================== STEP 5: SUBTITLE =================== -->
    <section bind:this={stepRefs.subtitle} class="step-card">
        <div class="step-head" class:step-title-light={litFlags.subtitle.title}>
            <span class="step-num" class:step-num-light={litFlags.subtitle.num}>5</span>
            <h2>{$_('advertise.b_s5_title')}</h2>
            {#if activeStep === "subtitle"}
                <span class="tutorial-finger" aria-hidden="true">👇</span>
            {/if}
        </div>
        <p class="step-help">{$_('advertise.b_s5_help')}</p>

        <input type="text" bind:value={subtitle} maxlength="70"
               onfocus={() => activeStep === "subtitle" || (activeStep = "subtitle")}
               onblur={() => subtitle.trim() && commitField("subtitle")}
               placeholder={$_('advertise.b_s5_ph')}
               class="text-input" />
        <div class="text-xs text-gray-500 mt-2 text-end">{subtitle.length}/70</div>

        <!-- טיפוגרפיה של תת-הכותרת: גודל, רווח בין שורות ויישור. הערכים
             נוסעים עם המודעה דרך adStyle, ולכן מה שנראה כאן הוא מה שיתפרסם. -->
        <div class="sub-type-panel">
            <p class="sub-type-title">{$_('advertise.b_s5_type_title')}</p>

            <div class="sub-type-row">
                <span class="sub-type-label">{$_('advertise.b_s5_size')}</span>
                <input type="range" class="sub-type-range"
                       min={SUB_FONT_SIZE_MIN} max={SUB_FONT_SIZE_MAX} step="0.02"
                       bind:value={subFontSize}
                       oninput={() => activeStep === "subtitle" || (activeStep = "subtitle")} />
                <span class="sub-type-value">{subFontSize.toFixed(2)}</span>
            </div>

            <div class="sub-type-row">
                <span class="sub-type-label">{$_('advertise.b_s5_line_height')}</span>
                <input type="range" class="sub-type-range"
                       min={SUB_LINE_HEIGHT_MIN} max={SUB_LINE_HEIGHT_MAX} step="0.05"
                       bind:value={subLineHeight}
                       oninput={() => activeStep === "subtitle" || (activeStep = "subtitle")} />
                <span class="sub-type-value">{subLineHeight.toFixed(2)}</span>
            </div>

            <div class="sub-type-row">
                <span class="sub-type-label">{$_('advertise.b_s5_align')}</span>
                <div class="sub-type-aligns">
                    {#each [
                        { id: "right",   labelKey: "b_s5_align_right",   icon: "➡" },
                        { id: "center",  labelKey: "b_s5_align_center",  icon: "↔" },
                        { id: "left",    labelKey: "b_s5_align_left",    icon: "⬅" },
                        { id: "justify", labelKey: "b_s5_align_justify", icon: "☰" }
                    ] as opt}
                        <button type="button"
                                onclick={() => (subAlign = opt.id as SubAlign)}
                                title={$_(`advertise.${opt.labelKey}`)}
                                aria-pressed={subAlign === opt.id}
                                class="sub-type-align-btn {subAlign === opt.id ? 'is-active' : ''}">
                            <span aria-hidden="true">{opt.icon}</span>
                            <span class="sub-type-align-text">{$_(`advertise.${opt.labelKey}`)}</span>
                        </button>
                    {/each}
                </div>
            </div>

            <button type="button" class="sub-type-reset"
                    onclick={() => { subFontSize = DEFAULT_SUB_FONT_SIZE; subLineHeight = DEFAULT_SUB_LINE_HEIGHT; subAlign = "right"; }}>
                {$_('advertise.b_s5_type_reset')}
            </button>
        </div>

        <div class="step-nav-row">
            <button type="button" class="step-nav-btn" onclick={() => advance(prevOf("subtitle"))}>
                {$_('advertise.b_prev_step')}
            </button>
            {#if subtitle}
                <button type="button" class="step-nav-btn" onclick={() => commitField("subtitle")}>
                    {$_('advertise.b_next_step')}
                </button>
            {/if}
        </div>
    </section>

    <!-- =================== STEP 6: HOVER TEXT =================== -->
    <!-- כמו בשלב 1: קיצור עכבר, ומקבילה למקלדת דרך onfocusin -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <section bind:this={stepRefs.hover} class="step-card"
             onclick={(e) => {
                 if ((e.target as HTMLElement).closest('button, a, input, textarea')) return;
                 if (activeStep !== "hover") activeStep = "hover";
             }}
             onfocusin={() => { if (activeStep !== "hover") activeStep = "hover"; }}>
        <div class="step-head" class:step-title-light={litFlags.hover.title}>
            <span class="step-num" class:step-num-light={litFlags.hover.num}>6</span>
            <h2>{$_('advertise.b_s6_title')}</h2>
            {#if activeStep === "hover"}
                <span class="tutorial-finger" aria-hidden="true">👇</span>
            {/if}
        </div>
        <p class="step-help">
            {$_('advertise.b_s6_help1')}
            <br/>
            <strong class="text-amber-300">{$_('advertise.b_s6_help_strong')}</strong> {$_('advertise.b_s6_help2')}
        </p>

        <!-- התיבה גדלה לפי התוכן (autoGrow): גובה קבוע חתך את השורות
             האחרונות והמפרסם לא ראה את סוף המשפט שכתב -->
        <textarea bind:value={hoverText} maxlength="90" rows="3"
                  use:autoGrow={hoverText}
                  class:hover-textarea={true}
                  onfocus={() => activeStep === "hover" || (activeStep = "hover")}
                  onblur={() => hoverText.trim() && commitField("hover")}
                  placeholder={$_('advertise.b_s6_ph')}
                  class="text-input"></textarea>
        <div class="text-xs text-gray-500 mt-2 text-end">{hoverText.length}/90</div>

        {#if logo}
            <div class="mt-3 rounded-lg border border-white/10 bg-black/20 p-2.5 space-y-2">
                <label class="flex items-center gap-2 text-sm font-bold text-gray-300 cursor-pointer">
                    <input type="checkbox" bind:checked={hoverLogo} class="accent-amber-500"
                           onchange={() => activeStep === "hover" || (activeStep = "hover")} />
                    {$_('advertise.b_hover_logo')}
                </label>
                {#if hoverLogo}
                    <div class="flex items-center gap-2 text-xs text-gray-400">
                        <span class="w-16 shrink-0">{$_('advertise.b_hover_logo_x')}</span>
                        <input type="range" min="0" max="100" step="1" class="flex-1 accent-amber-500" bind:value={hoverLogoX} />
                    </div>
                    <div class="flex items-center gap-2 text-xs text-gray-400">
                        <span class="w-16 shrink-0">{$_('advertise.b_hover_logo_y')}</span>
                        <input type="range" min="0" max="100" step="1" class="flex-1 accent-amber-500" bind:value={hoverLogoY} />
                    </div>
                    <div class="flex items-center gap-2 text-xs text-gray-400">
                        <span class="w-16 shrink-0">{$_('advertise.b_hover_logo_size')}</span>
                        <input type="range" min="20" max="120" step="2" class="flex-1 accent-amber-500" bind:value={hoverLogoSize} />
                    </div>
                {/if}
            </div>
        {/if}

        <div class="step-nav-row">
            <button type="button" class="step-nav-btn" onclick={() => advance(prevOf("hover"))}>
                {$_('advertise.b_prev_step')}
            </button>
            {#if hoverText}
                <button type="button" class="step-nav-btn" onclick={() => commitField("hover")}>
                    {$_('advertise.b_next_step')}
                </button>
            {/if}
        </div>
    </section>

    <!-- =================== STEP 7: PREVIEW =================== -->
    <section bind:this={stepRefs.preview} class="step-card">
        <div class="step-head" class:step-title-light={litFlags.preview.title}>
            <span class="step-num" class:step-num-light={litFlags.preview.num}>7</span>
            <h2>{$_('advertise.b_s7_title')}</h2>
            {#if activeStep === "preview"}
                <span class="tutorial-finger" aria-hidden="true">👇</span>
            {/if}
        </div>
        {#snippet previewSideControls()}
            <div class="preview-side-controls">
                <p class="preview-side-controls-help">{$_('advertise.b_preview_help')}</p>
                <div class="preview-side-toggle">
                    {#each [
                        { id: "mobile",  labelKey: "b_mobile" },
                        { id: "desktop", labelKey: "b_desktop" }
                    ] as opt}
                        <button type="button" onclick={() => previewMode = opt.id as any}
                            class="preview-side-toggle-btn {previewMode === opt.id ? 'is-active' : ''}">
                            {$_(`advertise.${opt.labelKey}`)}
                        </button>
                    {/each}
                </div>
            </div>
        {/snippet}

        <div class="preview-with-rail">
        <!-- ===== MOBILE PREVIEW - full-screen popup style ===== -->
        {#if previewMode === "mobile"}
            <div class="preview-frame mobile">
                <!-- תמונה ייעודית לנייד: המשבצת בנייד רחבה ונמוכה, ולכן תמונה
                     שנראית מצוין בדסקטופ יכולה להיחתך רע כאן. הכלי יושב מעל
                     לתצוגת הנייד -->
                <div class="mobile-image-swap">
                    <p class="mobile-image-swap-title">{$_('advertise.b_mobile_img_title')}</p>
                    <p class="mobile-image-swap-help">{$_('advertise.b_mobile_img_help')}</p>
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    {#if mobileImage}
                        <div class="mobile-image-swap-frame"
                             class:dragging={isDraggingMobile}
                             ondragover={(e) => dragOver(e, v => isDraggingMobile = v)}
                             ondragleave={(e) => dragLeave(e, v => isDraggingMobile = v)}
                             ondrop={(e) => handleDrop(e, "mobile", v => isDraggingMobile = v)}>
                            <img src={mobileImage} alt={$_('advertise.b_mobile_img_title')} use:adImgFit={mobileImageFit} />
                            <button type="button" class="remove-x" onclick={() => clearImage("mobile")} aria-label={$_('advertise.b_remove_image')}>✕</button>
                            <button type="button" class="crop-arrow crop-arrow-up"    onclick={() => nudgeMainImage("up", "mobile")}    aria-label={$_('advertise.b_nudge_up')}>▲</button>
                            <button type="button" class="crop-arrow crop-arrow-down"  onclick={() => nudgeMainImage("down", "mobile")}  aria-label={$_('advertise.b_nudge_down')}>▼</button>
                            <button type="button" class="crop-arrow crop-arrow-left"  onclick={() => nudgeMainImage("left", "mobile")}  aria-label={$_('advertise.b_nudge_left')}>◀</button>
                            <button type="button" class="crop-arrow crop-arrow-right" onclick={() => nudgeMainImage("right", "mobile")} aria-label={$_('advertise.b_nudge_right')}>▶</button>
                            <button type="button" class="crop-reset" onclick={() => { mobileImageObjectX = 50; mobileImageObjectY = 50; mobileImageZoom = 1; }} aria-label={$_('advertise.b_reset_pos')}>⊙</button>
                            <button type="button" class="crop-zoom zoom-in"  onclick={() => zoomMainImage("in", "mobile")}  aria-label={$_('advertise.b_zoom_in')}>＋</button>
                            <button type="button" class="crop-zoom zoom-out" onclick={() => zoomMainImage("out", "mobile")} aria-label={$_('advertise.b_zoom_out')}>－</button>
                        </div>
                        <p class="mobile-image-swap-note">{$_('advertise.b_mobile_img_active')}</p>
                    {:else}
                        <!-- אזור שחרור מלא, לא רק כפתור בחירה: גרירת קובץ לכאן
                             עובדת בדיוק כמו באזור התמונה הראשית -->
                        <label class="mobile-image-swap-drop"
                               class:dragging={isDraggingMobile}
                               ondragover={(e) => dragOver(e, v => isDraggingMobile = v)}
                               ondragleave={(e) => dragLeave(e, v => isDraggingMobile = v)}
                               ondrop={(e) => handleDrop(e, "mobile", v => isDraggingMobile = v)}>
                            <span class="text-2xl" aria-hidden="true">{isDraggingMobile ? "✨" : "📱"}</span>
                            <span class="mobile-image-swap-drop-main">
                                {isDraggingMobile ? $_('advertise.b_drop_here') : $_('advertise.b_mobile_img_upload')}
                            </span>
                            <span class="mobile-image-swap-drop-sub">{$_('advertise.b_click_or_drag')}</span>
                            <input type="file" accept="image/*" onchange={(e) => handleImage(e, "mobile")} class="hidden" />
                        </label>
                    {/if}
                </div>

                <div class="preview-with-side-caption">
                    {@render previewSideControls()}
                    <div class="phone-screen">
                        <div class="phone-notch"></div>
                        <div class="phone-content">
                        <div class="mobile-popup-slot">
                            <MobileAdCard
                                editable
                                {title} {subtitle} {cta} {gradient}
                                image={previewMobileImage}
                                imageFit={previewMobileFit}
                                {logo}
                                st={adStyle}
                                showCta={!shopEdit}
                                placeholder={$_('advertise.b_main_image_alt')}
                                onedit={(f, v) => { if (f === 'title') title = v; else if (f === 'sub') subtitle = v; else cta = v; }}
                                onmove={moveMobile}
                            />
                            {#if mobTitleX || mobTitleY || mobSubX || mobSubY || mobCtaX || mobCtaY}
                                <button type="button" class="mobile-reset-pos" onclick={resetMobilePositions}>{$_('advertise.b_mobile_reset_pos')}</button>
                            {/if}
                        </div>
                    </div>
                    </div>
                    <p class="preview-caption preview-caption-side">{$_('advertise.b_mobile_caption')} <b>{$_('advertise.b_mobile_edit_hint')}</b></p>
                </div>
            </div>
        {/if}

        <!-- ===== DESKTOP PREVIEW - TWO COMPETING OPTIONS for the user to pick ===== -->
        {#if previewMode === "desktop"}
            <div class="preview-frame desktop">

                <!-- ===== OPTION B - clean standalone card (no site context) ===== -->
                <div class="preview-option">
                    <div class="preview-with-side-caption">
                        {@render previewSideControls()}
                    <div class="clean-card-wrap">
                        <div
                            role="button"
                            tabindex="0"
                            class="clean-card promo-desktop pro-ad"
                            onmouseenter={() => hoverPreview = true}
                            onmouseleave={() => hoverPreview = false}
                            onfocus={() => hoverPreview = true}
                            onblur={() => hoverPreview = false}
                        >
                            <div class="ad-img-wrap pro-img-wrap clean-card-img" use:logoClearance={[title, subtitle, logo, logoFreeX, logoFreeY, logoPosition, diagHeight, titleOffsetY, subFontSize, subLineHeight, subAlign]}>
                                {#if mainImage}
                                    <img src={mainImage} alt={title} class="ad-img" style:opacity={showHover ? 0 : 1} style:object-position="{mainImageObjectX}% {mainImageObjectY}%" use:adImgFit={mainImageFit} />
                                {:else}
                                    <div class="img-placeholder">{$_('advertise.b_img_placeholder')}</div>
                                {/if}
                                <div class="pro-diag bg-gradient-to-br {gradient}" style:opacity={showHover ? 0 : 1}></div>
                                <div class="pro-title-top"
                                     class:has-corner-logo-right={titleCornerSide === 'right'}
                                     class:has-corner-logo-left={titleCornerSide === 'left'}
                                     style:opacity={showHover ? 0 : 1} style:transform="translateY({titleOffsetY}px)">
                                    <h3 class="pro-title" style:color={titleColor} style:font-size={titleFontSize !== 1.15 ? `${titleFontSize}rem` : undefined}><span class="logo-avoid" aria-hidden="true"></span>{title || $_('advertise.b_s3_title')}</h3>
                                </div>
                                <div class="pro-title-wrap" style:opacity={showHover ? 0 : 1}>
                                    <p class="pro-sub"><span class="logo-avoid" data-anchor="bottom" aria-hidden="true"></span>{subtitle || $_('advertise.b_ph_slogan')}</p>
                                </div>
                                <div class="hover-overlay" style:opacity={showHover ? 1 : 0}>
                                    <h3 class="hover-title">{title || $_('advertise.b_ph_title_short')}</h3>
                                    <p class="hover-text">{hoverText || $_('advertise.b_ph_hover')}</p>
                                    {#if logo && hoverLogo}
                                        <img src={logo} alt="" class="hover-logo" style="left:{hoverLogoX}%;top:{hoverLogoY}%;width:{hoverLogoSize}px;height:{hoverLogoSize}px;{logoShape === 'circle' ? 'border-radius:50%;' : ''}{logoBg === 'black' ? 'background:#000;' : logoBg === 'clear' ? 'background:transparent;box-shadow:none;' : ''}" />
                                    {/if}
                                </div>
                                {#if logo}
                                    <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
                                    <!-- הלוגו עצמו הוא ידית הגרירה. role=button + tabindex נותנים לו
                                         מקבילת מקלדת מלאה (חיצים מזיזים אותו) ולכן זה תקין נגישותית -->
                                    <img src={logo} alt={$_('advertise.b_logo_alt')}
                                         data-ad-logo
                                         class="ad-logo ad-logo-draggable {logoShape === 'circle' ? 'ad-logo-circle' : ''} {logoFree ? 'ad-logo-free' : logoAnchorClass} {logoDragging ? 'ad-logo-dragging' : ''}"
                                         style={logoFreeStyle}
                                         draggable="false"
                                         role="button" tabindex="0"
                                         aria-label={$_('advertise.b_logo_drag_aria')}
                                         onpointerdown={logoPointerDown}
                                         onpointermove={logoPointerMove}
                                         onpointerup={logoPointerUp}
                                         onpointercancel={logoPointerUp}
                                         onkeydown={logoKeyDown} />
                                {/if}
                            </div>
                            <!-- כרטיס מוצר מהחנות - בלי רצועת המחיר, כמו בטור -->
                            {#if !shopEdit}
                            <div class="promo-cta bg-gradient-to-r {gradient}">
                                <p>{cta}</p>
                            </div>
                            {/if}
                        </div>
                    </div>
                        <p class="preview-caption preview-caption-side">{$_('advertise.b_desktop_caption')}</p>
                    </div>
                </div>

            </div>
        {/if}

        </div>

        <div class="step-nav-row">
            <button type="button" class="step-nav-btn" onclick={() => advance(prevOf("preview"))}>
                {$_('advertise.b_prev_step')}
            </button>
            <div class="relative group">
                <button type="button" onclick={openHelp}
                        aria-label={$_('advertise.b_help_btn_aria')}
                        class="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/50 text-gray-200 hover:text-amber-300 font-bold transition-colors">
                    <span aria-hidden="true">😩</span>
                    <span>{$_('advertise.b_help_btn')}</span>
                    <span aria-hidden="true">🆘</span>
                </button>
                <span role="tooltip"
                      class="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-gray-900/95 px-3 py-2 text-sm font-bold text-amber-200 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    {$_('advertise.b_help_tooltip')}
                </span>
            </div>
            <div class="relative group">
                <button type="button" class="step-nav-btn" onclick={goToLandingEditor} disabled={movingToLanding}>
                    {#if movingToLanding}
                        <span aria-hidden="true">⏳</span>
                        {$_('advertise.b_moving_landing')}
                    {:else}
                        {$_('advertise.b_looks_great')} <span aria-hidden="true">👍</span> {$_('advertise.b_to_next')} <span aria-hidden="true">←</span>
                    {/if}
                </button>
                <span role="tooltip"
                      class="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-gray-900/95 px-3 py-2 text-sm font-bold text-amber-200 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    {$_('advertise.b_next_tooltip')}
                </span>
            </div>
        </div>
    </section>


    </div><!-- /.builder-steps -->

    <!-- ========== LIVE DEMO SIDEBAR - jumps to align with the active step ========== -->
    <aside class="builder-demo" aria-label={$_('advertise.b_demo_aria')} style:top="{demoTop}px">
        <div class="live-demo-card">
            <p class="live-demo-label">{$_('advertise.b_demo_label')}</p>
            <div class="live-demo-frame pro-ad" dir="rtl">
                <div class="ad-img-wrap pro-img-wrap live-demo-img-wrap" use:logoClearance={[title, subtitle, logo, logoFreeX, logoFreeY, logoPosition, diagHeight, titleOffsetY, subFontSize, subLineHeight, subAlign]}>
                    {#if mainImage}
                        <img src={mainImage} alt={title} class="ad-img"
                             style:object-position="{mainImageObjectX}% {mainImageObjectY}%"
                             style:opacity={activeStep === "hover" ? 0 : 1}
                             use:adImgFit={mainImageFit} />
                    {:else}
                        <div class="placeholder-dashed placeholder-img" style:opacity={activeStep === "hover" ? 0 : 1}>
                            <div class="placeholder-icon">📸</div>
                            <p>{$_('advertise.b_main_image_alt')}</p>
                            <p class="placeholder-hint">{$_('advertise.b_step_n', { values: { n: 1 } })}</p>
                        </div>
                    {/if}
                    <div class="pro-diag bg-gradient-to-br {gradient}" style:opacity={activeStep === "hover" ? 0 : 1}></div>
                    <div class="pro-title-top"
                         class:has-corner-logo-right={titleCornerSide === 'right'}
                         class:has-corner-logo-left={titleCornerSide === 'left'}
                         style:transform="translateY({titleOffsetY}px)" style:opacity={activeStep === "hover" ? 0 : 1}>
                        {#if title}
                            <h3 class="pro-title" style:color={titleColor} style:font-size={titleFontSize !== 1.15 ? `${titleFontSize}rem` : undefined}><span class="logo-avoid" aria-hidden="true"></span>{title}</h3>
                        {:else}
                            <div class="placeholder-dashed placeholder-line">{$_('advertise.b_ph_title_step')}</div>
                        {/if}
                    </div>
                    <div class="pro-title-wrap" style:opacity={activeStep === "hover" ? 0 : 1}>
                        {#if subtitle}
                            <p class="pro-sub"><span class="logo-avoid" data-anchor="bottom" aria-hidden="true"></span>{subtitle}</p>
                        {:else}
                            <div class="placeholder-dashed placeholder-line small">{$_('advertise.b_ph_slogan_step')}</div>
                        {/if}
                    </div>
                    {#if logo}
                        <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
                        <img src={logo} alt={$_('advertise.b_logo_alt')}
                             data-ad-logo
                                         class="ad-logo ad-logo-draggable {logoShape === 'circle' ? 'ad-logo-circle' : ''} {logoFree ? 'ad-logo-free' : logoAnchorClass} {logoDragging ? 'ad-logo-dragging' : ''}"
                             style="{logoFreeStyle} opacity:{activeStep === 'hover' ? 0 : 1};"
                             draggable="false"
                             role="button" tabindex="0"
                             aria-label={$_('advertise.b_logo_drag_aria')}
                             onpointerdown={logoPointerDown}
                             onpointermove={logoPointerMove}
                             onpointerup={logoPointerUp}
                             onpointercancel={logoPointerUp}
                             onkeydown={logoKeyDown} />
                    {:else}
                        <div class="placeholder-dashed placeholder-logo {logoPosition === 'left' ? 'logo-pos-left' : logoPosition === 'cta' ? 'logo-pos-cta' : 'logo-pos-right'}" style:opacity={activeStep === "hover" ? 0 : 1}>{$_('advertise.b_logo_alt')}<br/>{$_('advertise.b_step_n', { values: { n: 2 } })}</div>
                    {/if}
                    <div class="hover-overlay" style:opacity={activeStep === "hover" ? 1 : 0}>
                        <h3 class="hover-title">{title || $_('advertise.b_ph_title_short')}</h3>
                        <p class="hover-text">{hoverText || $_('advertise.b_ph_hover')}</p>
                                    {#if logo && hoverLogo}
                                        <img src={logo} alt="" class="hover-logo" style="left:{hoverLogoX}%;top:{hoverLogoY}%;width:{hoverLogoSize}px;height:{hoverLogoSize}px;{logoShape === 'circle' ? 'border-radius:50%;' : ''}{logoBg === 'black' ? 'background:#000;' : logoBg === 'clear' ? 'background:transparent;box-shadow:none;' : ''}" />
                                    {/if}
                    </div>
                </div>
                <!-- כרטיס מוצר מהחנות - בלי רצועת המחיר, כמו בטור -->
                {#if !shopEdit}
                <div class="promo-cta bg-gradient-to-r {gradient}">
                    <p>{cta}</p>
                </div>
                {/if}
            </div>
        </div>
    </aside>

    </div><!-- /.builder-cols -->

</div>
{/if}

<!-- Super-admin badge: shows whenever the page granted access via super_admin role -->
{#if accessGranted && isSuperAdmin}
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[200] rounded-xl border border-purple-500/50 bg-gray-900/95 px-4 py-2 shadow-2xl backdrop-blur" dir="rtl">
        <p class="text-purple-300 text-xs font-bold flex items-center gap-2">
            <span>🛡️</span>
            <span>{$_('advertise.b_admin_badge')}</span>
        </p>
    </div>
{/if}

{#if helpSent}
    <div class="compress-toast" role="status" aria-live="polite">
        <div class="flex items-start gap-3">
            <span class="text-3xl flex-shrink-0">✅</span>
            <p class="flex-1 min-w-0 text-right text-amber-100 text-sm md:text-base font-bold leading-relaxed m-0">
                {$_('advertise.r_help_sent')}
            </p>
        </div>
    </div>
{/if}

<!-- =================== DESIGN-HELP MODAL =================== -->
{#if helpOpen}
    <div class="help-backdrop" role="dialog" aria-modal="true" aria-labelledby="help-modal-title"
         onclick={(e) => { if (e.target === e.currentTarget) closeHelp(); }}
         onkeydown={(e) => { if (e.key === "Escape") closeHelp(); }}
         tabindex="-1">
        <div class="help-modal" dir="rtl">
            <div class="help-modal-head">
                <span class="help-modal-icon" aria-hidden="true">🆘</span>
                <h2 id="help-modal-title">{$_('advertise.b_help_modal_title')}</h2>
                <button type="button" class="help-close" onclick={closeHelp} aria-label={$_('advertise.close')}>×</button>
            </div>

            <p class="help-intro">
                {$_('advertise.r_help_intro')}
            </p>

            <label class="help-field">
                <span class="help-label">{$_('advertise.b_help_problem')} <span class="help-required">*</span></span>
                <textarea id="help-problem-input"
                          bind:value={helpProblem}
                          maxlength="2000"
                          rows="5"
                          placeholder={$_('advertise.b_help_problem_ph')}
                          class="help-textarea"
                          disabled={helpSubmitting}></textarea>
                <span class="help-counter">{helpProblem.length}/2000</span>
            </label>

            {#if !data?.layoutUser?.email && !data?.layoutUser?.nickname}
                <label class="help-field">
                    <span class="help-label">{$_('advertise.b_help_identify')} <span class="help-required">*</span></span>
                    <input type="text"
                           bind:value={helpContact}
                           maxlength="200"
                           placeholder={$_('advertise.b_help_identify_ph')}
                           class="help-input"
                           disabled={helpSubmitting} />
                </label>
            {:else}
                <p class="help-identity">
                    <span class="help-identity-icon" aria-hidden="true">🧑</span>
                    {$_('advertise.b_identified_as')} <strong>{data?.layoutUser?.nickname || data?.layoutUser?.email}</strong>
                    <span class="help-identity-note">{$_('advertise.b_identify_note')}</span>
                </p>
            {/if}

            {#if helpError}
                <div class="help-error" role="alert">{helpError}</div>
            {/if}

            <div class="help-actions">
                <button type="button" class="help-btn-secondary" onclick={closeHelp} disabled={helpSubmitting}>
                    {$_('advertise.b_cancel')}
                </button>
                <button type="button" class="help-btn-primary" onclick={submitHelp} disabled={helpSubmitting}>
                    {#if helpSubmitting}
                        <span class="help-spinner" aria-hidden="true"></span>
                        {$_('advertise.sending')}
                    {:else}
                        <span aria-hidden="true">💬</span>
                        {$_('advertise.r_help_send')}
                    {/if}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    /* ============== Page-level layout ============== */
    .ad-builder :global(*) { box-sizing: border-box; }

    /* ============== Compress notice toast ============== */
    :global(.compress-toast) {
        position: fixed;
        top: 5rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 60;
        width: calc(100% - 1.5rem);
        max-width: 32rem;
        padding: 0.875rem 2.5rem 0.875rem 1rem;
        border-radius: 1rem;
        border: 1px solid rgba(251, 191, 36, 0.55);
        background: linear-gradient(135deg, rgba(120, 53, 15, 0.92), rgba(146, 64, 14, 0.88));
        box-shadow: 0 18px 40px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(251, 191, 36, 0.15) inset;
        backdrop-filter: blur(8px);
        animation: compressToastIn 280ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    :global(.compress-toast-close) {
        position: absolute;
        top: 0.4rem;
        left: 0.5rem;
        width: 1.6rem;
        height: 1.6rem;
        border-radius: 9999px;
        background: rgba(0, 0, 0, 0.35);
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.75rem;
        line-height: 1;
        display: flex; align-items: center; justify-content: center;
        border: 1px solid rgba(255, 255, 255, 0.18);
        cursor: pointer;
        transition: background 0.15s;
    }
    :global(.compress-toast-close:hover) { background: rgba(220, 38, 38, 0.85); }
    @keyframes compressToastIn {
        from { opacity: 0; transform: translate(-50%, -8px); }
        to   { opacity: 1; transform: translate(-50%, 0); }
    }
    /* גרסת שגיאה של אותו toast - אדום במקום ענבר */
    :global(.compress-toast.error-toast) {
        border-color: rgba(248, 113, 113, 0.6);
        background: linear-gradient(135deg, rgba(127, 29, 29, 0.94), rgba(153, 27, 27, 0.9));
        box-shadow: 0 18px 40px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(248, 113, 113, 0.18) inset;
    }
    /* אזהרת "הטיוטה לא נשמרת" יושבת בתחתית - קבועה, ולא מתנגשת עם toast עליון */
    :global(.compress-toast.draft-warn) {
        top: auto;
        bottom: 1rem;
    }

    /* ============== Step Card ============== */
    :global(.step-card) {
        background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 1.25rem;
        padding: 1.25rem 1.25rem 1.5rem;
        margin-bottom: 1.25rem;
        scroll-margin-top: 8rem;
        position: relative;
    }
    /* Dashed "demo placeholder" frame on the visual LEFT of every step card.
       The absolutely-positioned live-demo lands inside the active step's frame
       (and animates between frames), making it feel as though the demo "jumped". */
    :global(.builder-steps .step-card)::before {
        content: '';
        position: absolute;
        top: 0.5rem;
        bottom: 0.5rem;
        left: -186px;
        width: 170px;
        border: 2px dashed rgba(251,191,36,0.22);
        border-radius: 0.85rem;
        background: rgba(251,191,36,0.025);
        pointer-events: none;
    }
    @media (max-width: 768px) {
        :global(.builder-steps .step-card)::before { display: none; }
    }
    @media (min-width: 768px) {
        :global(.step-card) { padding: 1.75rem; margin-bottom: 1.75rem; }
    }
    :global(.success-card) {
        background: linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04));
        border-color: rgba(16,185,129,0.4);
    }

    /* ============== Step heading ============== */
    :global(.step-head) {
        display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;
        color: rgb(229,231,235); font-weight: 900;
        flex-wrap: wrap;
    }
    :global(.step-head h2) {
        font-size: 1.125rem; font-weight: 900; line-height: 1.3; margin: 0;
    }
    @media (min-width: 768px) {
        :global(.step-head h2) { font-size: 1.5rem; }
    }
    :global(.step-num) {
        width: 2rem; height: 2rem; border-radius: 9999px;
        display: flex; align-items: center; justify-content: center;
        background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%);
        color: #000; font-weight: 900; font-size: 0.95rem;
        opacity: 0.85; flex-shrink: 0;
    }
    :global(.step-help) {
        color: rgb(156, 163, 175); font-size: 0.875rem; line-height: 1.55; margin: 0 0 1rem;
    }

    /* "Back one step" button - sits on the visual end of step-head */
    :global(.step-back) {
        margin-inline-start: auto;
        display: inline-flex; align-items: center; gap: 0.3rem;
        padding: 0.35rem 0.7rem;
        border-radius: 0.6rem;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: rgb(209, 213, 219);
        font-size: 0.78rem; font-weight: 700; line-height: 1;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s, color 0.15s;
        white-space: nowrap;
        font-family: inherit;
    }
    :global(.step-back:hover) {
        background: rgba(245, 158, 11, 0.12);
        border-color: rgba(245, 158, 11, 0.45);
        color: rgb(252, 211, 77);
    }
    :global(.step-back:active) { transform: scale(0.97); }

    /* ============== Unified step nav (prev + next at the bottom of every step) ============== */
    :global(.step-nav-row) {
        margin-top: 1.5rem;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
    }
    :global(.step-nav-btn) {
        display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
        padding: 0.7rem 1.5rem;
        border-radius: 0.85rem;
        background: rgb(245, 158, 11);
        color: #000;
        font-size: 0.95rem; font-weight: 800; line-height: 1.1;
        border: 1px solid rgba(245, 158, 11, 0.85);
        cursor: pointer;
        transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
        white-space: nowrap;
        font-family: inherit;
        box-shadow: 0 4px 14px -4px rgba(245, 158, 11, 0.5);
    }
    :global(.step-nav-btn:hover) {
        background: rgb(252, 191, 36);
        box-shadow: 0 6px 18px -4px rgba(245, 158, 11, 0.6);
    }
    :global(.step-nav-btn:active) { transform: scale(0.97); }

    /* ============== Inputs ============== */
    :global(.text-input) {
        width: 100%; padding: 0.75rem 1rem; border-radius: 0.75rem;
        background: rgba(255,255,255,0.04); border: 2px solid rgba(255,255,255,0.08);
        color: white; font-size: 0.95rem; font-weight: 500; outline: none;
        transition: border-color 0.15s, background 0.15s;
        font-family: inherit;
    }
    :global(.text-input.small) { padding: 0.55rem 0.75rem; font-size: 0.85rem; }
    /* גדלה לפי התוכן ולכן אין בה גלילה פנימית שמסתירה שורות */
    :global(.hover-textarea) { overflow-y: hidden; resize: none; min-height: 4.5rem; }
    :global(.text-input::placeholder) { color: rgb(107, 114, 128); }
    :global(.text-input:focus) {
        border-color: rgba(245, 158, 11, 0.6);
        background: rgba(255,255,255,0.06);
    }
    :global(.field-label) {
        display: block; color: rgb(209, 213, 219); font-weight: 700; font-size: 0.85rem;
        margin-bottom: 0.4rem;
    }

    /* ============== Upload zones ============== */
    :global(.upload-zone) {
        position: relative; display: flex; align-items: center; justify-content: center;
        min-height: 200px; border: 2px dashed rgba(245, 158, 11, 0.4);
        border-radius: 1rem; background: rgba(245, 158, 11, 0.04);
        cursor: pointer; transition: border-color 0.15s, background 0.15s;
        overflow: hidden;
    }
    :global(.upload-zone:hover) { border-color: rgba(245, 158, 11, 0.7); background: rgba(245, 158, 11, 0.08); }
    /* גובה קבוע כשיש תמונה: התמונה ממוקמת אבסולוטית (adImgFit) ולא
       קובעת יותר את גובה האזור בעצמה */
    :global(.upload-zone.has-image) { border-style: solid; padding: 0; height: 280px; }
    :global(.upload-zone img) { width: 100%; height: 100%; min-height: 200px; max-height: 280px; object-fit: cover; }
    :global(.upload-empty) { text-align: center; padding: 1rem; }
    :global(.upload-zone.dragging) {
        border-color: rgb(34, 197, 94);
        background: rgba(34, 197, 94, 0.1);
        box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.18), 0 0 30px rgba(34, 197, 94, 0.25);
        transform: scale(1.01);
    }

    :global(.upload-zone-sm) {
        position: relative; display: flex; align-items: center; justify-content: center;
        width: 100px; height: 100px; flex-shrink: 0;
        border: 2px dashed rgba(245, 158, 11, 0.4); border-radius: 0.75rem;
        background: rgba(245, 158, 11, 0.04); cursor: pointer; overflow: hidden;
    }
    :global(.upload-zone-sm.has-image) { border-style: solid; padding: 0; }
    :global(.upload-zone-sm img) { width: 100%; height: 100%; object-fit: cover; }
    :global(.upload-zone-sm.dragging) {
        border-color: rgb(34, 197, 94);
        background: rgba(34, 197, 94, 0.12);
        box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.25);
        transform: scale(1.04);
    }

    :global(.remove-x) {
        position: absolute; top: 0.4rem; left: 0.4rem; z-index: 5;
        width: 1.75rem; height: 1.75rem; border-radius: 9999px;
        background: rgba(0,0,0,0.65); color: white; border: 1px solid rgba(255,255,255,0.2);
        font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
    :global(.remove-x:hover) { background: rgba(220,38,38,0.85); }

    /* ============== Product row ============== */
    :global(.product-row) {
        display: flex; align-items: stretch; gap: 0.75rem;
        background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
        border-radius: 0.85rem; padding: 0.75rem;
    }
    @media (max-width: 768px) {
        :global(.product-row) { flex-direction: column; }
    }
    :global(.product-row .grow) { flex: 1; }
    :global(.remove-btn) {
        width: 2rem; height: 2rem; border-radius: 9999px; background: rgba(255,255,255,0.05);
        color: rgb(156, 163, 175); border: 1px solid rgba(255,255,255,0.08);
        cursor: pointer; align-self: center; flex-shrink: 0;
    }
    :global(.remove-btn:hover) { background: rgba(220,38,38,0.6); color: white; }

    /* ============== Tutorial finger animation (matches /about/advertise) ============== */
    @keyframes gentleHover {
        0%, 100% { transform: translateY(0) scale(1); }
        50%      { transform: translateY(-5px) scale(1.03); }
    }
    :global(.tutorial-finger) {
        display: inline-block;
        animation: gentleHover 2.6s ease-in-out infinite;
        font-size: 1.25rem;
        will-change: transform;
        filter: drop-shadow(0 0 5px rgba(245,158,11,0.45));
    }

    /* Step number flash */
    @keyframes stepNumFlashAnim {
        0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); transform: scale(1); filter: brightness(1); }
        50%      { box-shadow: 0 0 18px 6px rgba(251, 191, 36, 0.95); transform: scale(1.25); filter: brightness(1.55); }
    }
    :global(.step-num.step-num-light) {
        animation: stepNumFlashAnim 0.7s ease-in-out 1;
    }

    /* Step title glow */
    @keyframes stepTitleGlowAnim {
        0%, 100% { color: rgb(229,231,235); text-shadow: 0 0 0 rgba(251,191,36,0); }
        50%      { color: #fbbf24; text-shadow: 0 0 14px rgba(251,191,36,0.9), 0 0 28px rgba(251,191,36,0.5); }
    }
    :global(.step-head.step-title-light h2) {
        animation: stepTitleGlowAnim 1.5s ease-in-out 1;
    }

    /* ============== MOBILE PREVIEW (phone frame) ============== */
    :global(.preview-frame) { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
    :global(.preview-caption) {
        color: rgb(156,163,175); font-size: 0.8rem; text-align: center; max-width: 28rem;
    }
    /* Phone/card sits centered (justify-content: center).
       Caption is absolutely positioned at the visual left so it doesn't compete with
       the centering math, and can use its natural max-width without grid-column limits. */
    :global(.preview-with-side-caption) {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
    }
    :global(.preview-side-caption-spacer) { display: none; }
    /* Side caption - narrow box on the visual left in RTL.
       Width capped to fit the available space next to the centered preview (~137px gap).
       Color is near-white and font sits at 0.95rem so it stays readable in the narrow box. */
    :global(.preview-caption-side) {
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        max-width: 130px;
        text-align: right;
        color: #f1f5f9;
        font-size: 0.95rem;
        line-height: 1.5;
        font-weight: 600;
        padding: 0.7rem 0.8rem;
        border-radius: 0;
        background: transparent;
        border: none;
    }
    /* Side controls - narrow box on the visual right in RTL (mode toggle + help text).
       Sits opposite the left-side caption for visual symmetry next to the centered preview. */
    :global(.preview-side-controls) {
        position: absolute;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        max-width: 150px;
        display: flex;
        flex-direction: column;
        gap: 0.7rem;
        padding: 0.7rem 0.8rem;
        border-radius: 0;
        background: transparent;
        border: none;
        z-index: 1;
    }
    :global(.preview-side-controls-help) {
        margin: 0;
        color: #f1f5f9;
        font-size: 0.95rem;
        line-height: 1.5;
        text-align: right;
        font-weight: 600;
    }
    :global(.preview-side-toggle) {
        display: inline-flex;
        border-radius: 0.55rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.3);
        padding: 0.2rem;
        align-self: stretch;
        justify-content: center;
    }
    :global(.preview-side-toggle-btn) {
        flex: 1;
        padding: 0.4rem 0.4rem;
        border-radius: 0.4rem;
        font-size: 0.72rem;
        font-weight: 700;
        color: rgb(209, 213, 219);
        background: transparent;
        border: none;
        cursor: pointer;
        font-family: inherit;
        white-space: nowrap;
        transition: background 0.15s, color 0.15s;
    }
    :global(.preview-side-toggle-btn.is-active) {
        background: rgb(245, 158, 11);
        color: #000;
    }
    :global(.preview-side-toggle-btn:not(.is-active):hover) {
        color: #fff;
    }
    @media (max-width: 700px) {
        /* On narrow screens absolute positioning would overlap the phone - switch to flow. */
        :global(.preview-with-side-caption) { flex-direction: column; row-gap: 0.75rem; }
        :global(.preview-caption-side) {
            position: static; transform: none;
            max-width: none; text-align: center;
        }
        :global(.preview-side-controls) {
            position: static;
            transform: none;
            max-width: none;
            order: -1;
        }
        :global(.preview-side-controls-help) { text-align: center; }
    }

    :global(.phone-screen) {
        width: 280px; height: 540px; max-width: 90vw;
        background: #0b1224; border-radius: 2rem;
        border: 8px solid #111827; box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.05);
        position: relative; overflow: hidden;
    }
    :global(.phone-notch) {
        position: absolute; top: 6px; left: 50%; transform: translateX(-50%);
        width: 80px; height: 16px; background: #111827; border-radius: 0 0 12px 12px; z-index: 10;
    }
    :global(.phone-content) { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .mobile-popup-slot { width: 100%; max-width: 240px; }
    .mobile-reset-pos {
        display: block; margin: 0.4rem auto 0; font-size: 0.7rem; padding: 0.15rem 0.6rem;
        border-radius: 9999px; background: rgba(255,255,255,0.08); color: #fbbf24; border: 1px solid rgba(251,191,36,0.4);
    }
    :global(.mobile-popup) {
        width: 100%; max-width: 240px; background: #0f172a;
        border-radius: 1rem; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.5);
    }
    /* Mobile title - sits ABOVE the image in a clearly separate header band */
    :global(.popup-title-above) {
        margin: 0;
        padding: 1.1rem 0.9rem 1rem;
        text-align: center;
        font-weight: 900;
        font-size: 1.55rem;
        line-height: 1.15;
        letter-spacing: 0.005em;
        text-shadow: 0 2px 10px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.6);
        background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
        border-bottom: 2px solid rgba(255,255,255,0.08);
    }
    /* Mobile only: logo + title in a row above the image. The row itself owns the dark
       gradient bg + bottom border so the title h3 inside is reset to transparent. */
    :global(.popup-title-row) {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.85rem 0.9rem;
        background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
        border-bottom: 2px solid rgba(255,255,255,0.08);
    }
    :global(.popup-title-row .popup-title-above) {
        flex: 1;
        background: transparent;
        border-bottom: none;
        padding: 0;
    }
    :global(.popup-logo-above) {
        width: 44px; height: 44px;
        border-radius: 8px;
        background: white;
        padding: 4px;
        object-fit: contain;
        flex-shrink: 0;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    }
    :global(.popup-logo-above-circle) { border-radius: 50%; }
    /* 384/176 = היחס האמיתי של משבצת התמונה בפופ-אפ הנייד (MobileAdPopup:
       רוחב עד max-w-sm וגובה h-44). גובה קבוע של 130px הראה חיתוך אחר ממה
       שהגולש מקבל בפועל, ולכן היחס - ולא פיקסלים - הוא מה שקובע כאן. */
    :global(.popup-img) { position: relative; aspect-ratio: 384 / 176; }
    :global(.popup-img > img:not(.popup-logo)) { width: 100%; height: 100%; object-fit: cover; }
    :global(.popup-img-fade) {
        position: absolute; inset: 0;
        background: linear-gradient(to top, rgba(15,23,42,0.95), transparent 50%);
        pointer-events: none;
    }
    :global(.popup-logo) {
        position: absolute !important; top: 8px;
        width: 40px !important; height: 40px !important;
        border-radius: 8px; background: white; padding: 4px;
        object-fit: contain !important;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        z-index: 5;
    }
    :global(.popup-logo-right) { right: 8px; left: auto; }
    :global(.popup-logo-left)  { left: 8px;  right: auto; }
    :global(.popup-logo-circle) { border-radius: 50% !important; }
    :global(.close-countdown) {
        position: absolute; top: 8px; left: 8px; width: 28px; height: 28px;
        border-radius: 9999px; background: rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.25);
        color: white; font-size: 12px; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
    }
    :global(.popup-body) { padding: 0.85rem; }
    :global(.popup-title) {
        font-size: 1rem; font-weight: 900; line-height: 1.2; margin: 0 0 0.25rem;
    }
    :global(.popup-sub) { color: rgb(209,213,219); font-size: 0.78rem; line-height: 1.35; margin: 0 0 0.65rem; }
    :global(.popup-cta) {
        display: block; width: 100%; padding: 0.55rem; border-radius: 0.6rem;
        color: white; font-weight: 700; font-size: 0.78rem; text-align: center;
        border: none;
        display: flex; justify-content: center; gap: 0.3rem;
    }
    /* עריכה במקום בתצוגת הנייד */
    /* Logo straddling the right corner of the diagonal band (mobile popup). 20px = half of 40px logo. */
    :global(.popup-logo-cta) {
        top: auto !important;
        bottom: calc(100% - var(--diag-top-right, 78%) - 20px) !important;
        right: 8px !important;
        left: auto !important;
    }

    /* ============== TWO-COLUMN BUILDER LAYOUT - steps + jumping live demo ============== */
    /* The demo is absolutely positioned - its top is computed dynamically to align with
       the active step. As activeStep changes, the demo "jumps" smoothly via CSS transition
       and stays parked at that step (no sticky scrolling that competes with the page header). */
    /* רוחב הטור: 144px (רוחב המשבצת האמיתי בטור הימני) + 11.2px ריפוד
       ו-1px מסגרת בכל צד של הכרטיס = 168.4px, מעוגל ל-170px. */
    :global(.builder-cols) {
        position: relative;
        padding-left: 186px;       /* reserve 170px demo + 16px gap on the visual LEFT */
    }
    :global(.builder-steps) { width: 100%; }
    :global(.builder-demo) {
        position: absolute;
        top: 0;
        left: 0;
        width: 170px;
        transition: top 700ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    @media (max-width: 768px) {
        :global(.builder-cols) { padding-left: 0; }
        :global(.builder-demo) {
            position: static;
            width: 100%;
            /* גם בנייד התצוגה נשארת ברוחב האמיתי - משבצת רחבה יותר הייתה
               מראה שבירת שורות אחרת לגמרי ממה שיתפרסם */
            max-width: 170px;
            margin: 0 auto 1rem;
        }
    }

    /* Live demo card */
    :global(.live-demo-card) {
        background: rgba(0,0,0,0.35);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 0.85rem;
        padding: 0.7rem;
    }
    :global(.live-demo-label) {
        color: #fbbf24;
        font-size: 0.78rem;
        font-weight: 800;
        text-align: center;
        margin: 0 0 0.5rem;
    }
    :global(.live-demo-foot) {
        color: rgba(255,255,255,0.5);
        font-size: 0.65rem;
        text-align: center;
        margin: 0.5rem 0 0;
    }
    /* 144px בדיוק - רוחב המשבצת בטור הימני (w-36). כשהתצוגה הייתה צרה
       יותר הטקסט נשבר לשורות אחרות והמפרסם ראה מודעה שאינה זו שתתפרסם. */
    :global(.live-demo-frame) {
        width: 144px;
        max-width: 100%;
        margin-inline: auto;
        border-radius: 0.55rem;
        overflow: hidden;
        background: #0f172a;
        box-shadow: 0 6px 20px rgba(0,0,0,0.4);
    }
    :global(.live-demo-img-wrap) {
        width: 100%;
        aspect-ratio: 144 / 450;   /* authentic RightAdBanner image proportion */
    }

    /* ============== Image crop arrows (Step 1 main image) ============== */
    :global(.crop-arrow) {
        position: absolute;
        background: rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.5);
        color: white;
        width: 32px; height: 32px;
        border-radius: 50%;
        font-size: 0.75rem;
        line-height: 1;
        cursor: pointer;
        z-index: 4;
        backdrop-filter: blur(4px);
        transition: background 150ms, transform 150ms;
        display: flex; align-items: center; justify-content: center;
        padding: 0;
    }
    :global(.crop-arrow:hover) {
        background: rgba(245,158,11,0.85);
        color: black;
        transform: scale(1.12);
    }
    :global(.crop-arrow-up)    { top: 8px; left: 50%; transform: translateX(-50%); }
    :global(.crop-arrow-down)  { bottom: 8px; left: 50%; transform: translateX(-50%); }
    :global(.crop-arrow-left)  { left: 8px; top: 50%; transform: translateY(-50%); }
    :global(.crop-arrow-right) { right: 8px; top: 50%; transform: translateY(-50%); }
    :global(.crop-arrow-up:hover)    { transform: translateX(-50%) scale(1.12); }
    :global(.crop-arrow-down:hover)  { transform: translateX(-50%) scale(1.12); }
    :global(.crop-arrow-left:hover)  { transform: translateY(-50%) scale(1.12); }
    :global(.crop-arrow-right:hover) { transform: translateY(-50%) scale(1.12); }
    :global(.crop-reset) {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.5);
        color: white;
        width: 32px; height: 32px;
        border-radius: 50%;
        font-size: 0.9rem; line-height: 1;
        cursor: pointer;
        z-index: 4;
        backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        padding: 0;
        transition: background 150ms, transform 150ms;
    }
    :global(.crop-reset:hover) { background: rgba(245,158,11,0.85); color: black; transform: translate(-50%, -50%) scale(1.12); }
    :global(.crop-zoom) {
        position: absolute;
        background: rgba(8,145,178,0.85);
        border: 1px solid rgba(103,232,249,0.9);
        color: white;
        width: 32px; height: 32px;
        border-radius: 50%;
        font-size: 1.05rem;
        font-weight: 700;
        line-height: 1;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        z-index: 4;
        backdrop-filter: blur(4px);
        transition: background 150ms, transform 150ms;
        padding: 0;
    }
    :global(.crop-zoom:hover) { background: rgba(103,232,249,0.95); color: black; transform: scale(1.12); }
    :global(.crop-zoom.zoom-in)  { bottom: 8px; right: 8px; }
    :global(.crop-zoom.zoom-out) { bottom: 8px; left: 8px; }
    :global(.crop-hint) {
        font-size: 0.75rem;
        color: rgb(156,163,175);
        margin-top: 0.6rem;
        text-align: center;
    }

    /* Dashed placeholder boxes for unfilled fields */
    :global(.placeholder-dashed) {
        border: 2px dashed rgba(255,255,255,0.35);
        background: rgba(255,255,255,0.04);
        color: rgba(255,255,255,0.55);
        font-weight: 700;
        text-align: center;
        border-radius: 0.4rem;
    }
    :global(.placeholder-img) {
        position: absolute; inset: 6px;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 0.3rem;
        font-size: 0.55rem;
    }
    :global(.placeholder-img .placeholder-icon) { font-size: 1.5rem; }
    :global(.placeholder-img .placeholder-hint) { color: rgba(251,191,36,0.7); font-size: 0.5rem; }
    :global(.placeholder-line) {
        font-size: 0.5rem;
        padding: 0.25rem 0.4rem;
        line-height: 1;
    }
    :global(.placeholder-line.small) { font-size: 0.45rem; }
    :global(.placeholder-logo) {
        position: absolute;
        top: 6px;
        width: 28px; height: 28px;
        border-radius: 0.3rem;
        font-size: 0.45rem;
        line-height: 1.05;
        display: flex; align-items: center; justify-content: center;
        z-index: 5;
    }
    :global(.placeholder-logo.logo-pos-right) { right: 6px; }
    :global(.placeholder-logo.logo-pos-left)  { left: 6px; }
    :global(.placeholder-logo.logo-pos-cta)   { top: auto; bottom: calc(100% - var(--diag-top-right, 78%) - 14px); right: 6px; }

    /* ============== DESKTOP PREVIEW - TWO COMPETING OPTIONS ============== */
    :global(.preview-option) {
        margin-bottom: 1.5rem;
        width: 100%;
    }
    :global(.preview-option-label) {
        font-weight: 800; color: #fbbf24;
        font-size: 0.95rem; margin-bottom: 0.65rem;
        text-align: center;
    }

    /* Option B - clean card with the user's ad at natural ad proportions, no site context */
    :global(.clean-card-wrap) {
        display: flex; justify-content: center;
    }
    :global(.clean-card) {
        width: 144px;   /* רוחב המשבצת האמיתי בטור הימני */
        border-radius: 0.6rem;
        overflow: hidden;
        background: #0f172a;
        box-shadow: 0 0 0 2px rgba(255,255,255,0.6), 0 0 6px rgba(245,158,11,0.35);
        animation: cleanCardPulse 2.5s ease-in-out infinite;
        cursor: pointer;
        position: relative;
        display: flex;
        flex-direction: column;
    }
    @keyframes cleanCardPulse {
        0%, 100% { box-shadow: 0 0 0 2px rgba(255,255,255,0.6), 0 0 6px rgba(245,158,11,0.35); }
        50%      { box-shadow: 0 0 0 2px rgba(255,255,255,0.85), 0 0 10px rgba(245,158,11,0.6); }
    }
    :global(.clean-card-img) {
        width: 100%;
        aspect-ratio: 144 / 450;   /* authentic RightAdBanner image proportion */
        position: relative;
    }

    /* Option C - DARK MASK that hides the original right ad column in the screenshot.
       Positioned to cover the entire right ad area generously, so the user's demo on top
       of it doesn't visually compete with whatever ad was originally rendered there. */
    :global(.slot-mask) {
        position: absolute;
        top: 5%;
        right: 0;
        width: 8.5%;
        height: 78%;
        background: linear-gradient(180deg, #0a1020, #0f172a);
        border-radius: 4px;
        z-index: 4;
        pointer-events: none;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
    }

    /* ============== DESKTOP PREVIEW - real site screenshot with overlay ============== */
    /* The frame is a cropper: it has aspect-ratio matching the VISIBLE region (after we
       hide the left ad strip and bottom map area). overflow:hidden clips the rest. */
    :global(.site-shot-frame) {
        position: relative;
        width: 100%; max-width: 1200px;
        aspect-ratio: 1298 / 720;          /* visible portion: 88% × 82% of original 1475×875 - keeps the full right-ad slot inside the visible area */
        overflow: hidden;
        border-radius: 0.85rem;
        border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 8px 30px rgba(0,0,0,0.4);
        background: #0f172a;
    }
    /* Inner holds the screenshot at its NATURAL aspect (1475:875). It is anchored to
       the cropper's TOP-RIGHT corner and made wider than the cropper, so its left
       portion is clipped. Its bottom also extends beyond the cropper, hiding the map. */
    :global(.site-shot-inner) {
        position: absolute;
        top: 0;
        right: 0;
        width: calc(100% * 1475 / 1298);   /* ≈ 113.6% - restores full image width after 12% left crop */
        aspect-ratio: 1475 / 875;           /* explicit height for child % positioning */
    }
    /* Slight darkening over the screenshot so the user's bright demo stands out */
    :global(.site-shot-inner::after) {
        content: '';
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.18);
        pointer-events: none;
        z-index: 1;
    }
    :global(.site-shot) {
        display: block; width: 100%; height: 100%;
    }
    /* Overlay positioned on the FIRST right ad slot. Width drives the overlay; the height
       is derived naturally from the children (image-wrap with the real RightAdBanner
       aspect-ratio + the small CTA below it). This preserves authentic ad proportions -
       width and height stay locked together, never independently sized. */
    :global(.site-shot-overlay.promo-desktop) {
        position: absolute;
        top: 18%;
        right: 3.5%;
        width: 8.5%;
        z-index: 5;
        cursor: pointer;
        border-radius: 4px;
        overflow: hidden;
        box-shadow: 0 0 0 2px rgba(255,255,255,0.6), 0 0 20px rgba(245,158,11,0.6);
        animation: overlayPulse 2.5s ease-in-out infinite;
    }
    @keyframes overlayPulse {
        0%, 100% { box-shadow: 0 0 0 2px rgba(255,255,255,0.6), 0 0 20px rgba(245,158,11,0.6); }
        50%      { box-shadow: 0 0 0 3px rgba(255,255,255,0.85), 0 0 28px rgba(245,158,11,0.95); }
    }
    :global(.site-shot-overlay-img) {
        width: 100%;
        aspect-ratio: 144 / 450;   /* matches real RightAdBanner image slot */
        height: auto;
    }
    :global(.site-shot-overlay .pro-title) { font-size: 0.88rem; line-height: 1.05; margin-bottom: 0.15rem; }
    :global(.site-shot-overlay .pro-sub)   { font-size: 0.7rem; line-height: 1.15; }
    :global(.site-shot-overlay .pro-title-wrap) { padding: 0.35rem 0.4rem 0.32rem; }
    :global(.site-shot-overlay .pro-title-top) { padding: 0.32rem 0.4rem 0.6rem; }
    :global(.site-shot-overlay .pro-title-top .pro-title) { font-size: 0.88rem; line-height: 1.05; }
    :global(.site-shot-overlay .pro-demo-cta) {
        display: block;
        margin-top: 0.3rem;
        padding: 0.18rem 0.2rem;
        background: linear-gradient(90deg, rgba(245,158,11,0.95), rgba(217,119,6,0.95));
        color: #0b0f1c;
        font-weight: 900;
        font-size: 0.5rem;
        line-height: 1.1;
        border-radius: 0.3rem;
        text-align: center;
        white-space: normal;
        word-break: keep-all;
        box-shadow: 0 1px 4px rgba(0,0,0,0.35);
    }
    :global(.site-shot-overlay .ad-logo) {
        width: 14px !important; height: 14px !important; padding: 1px;
        top: 2px;
    }
    :global(.site-shot-overlay .ad-logo-right) { right: 2px; }
    :global(.site-shot-overlay .ad-logo-left)  { left: 2px; }
    :global(.site-shot-overlay .hover-title) { font-size: 0.5rem; margin-bottom: 0.15rem; }
    :global(.site-shot-overlay .hover-text)  { font-size: 0.38rem; line-height: 1.2; }
    :global(.site-shot-overlay .hover-overlay) { padding: 0.25rem; }

    :global(.site-shot-pointer) {
        position: absolute;
        top: 50%;
        right: 50%;
        transform: translate(50%, -50%);
        z-index: 6;
        background: linear-gradient(90deg, rgba(245,158,11,0.95), rgba(217,119,6,0.95));
        color: #000;
        font-size: 1.05rem; font-weight: 900;
        padding: 0.65rem 1.1rem;
        border-radius: 0.65rem;
        white-space: nowrap;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        animation: pointerNudge 1.4s ease-in-out infinite;
    }

    /* Old desktop-mock kept for any leftover refs (will be unused now) */
    :global(.desktop-mock) {
        width: 100%; max-width: 820px;
        background: #0f172a;
        border-radius: 0.85rem; overflow: hidden;
        border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    }

    /* Site header */
    :global(.mock-header) {
        background: linear-gradient(180deg, #0b1224, #0f172a);
        border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    :global(.mock-header-inner) {
        display: flex; align-items: center; justify-content: space-between;
        padding: 0.65rem 1rem;
    }
    :global(.mock-logo) {
        display: flex; align-items: center; gap: 0.55rem;
    }
    :global(.mock-logo-circle) {
        display: flex; align-items: center; justify-content: center;
        width: 32px; height: 32px; border-radius: 9999px;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        font-size: 1rem;
    }
    :global(.mock-site-name) {
        color: white; font-weight: 900; font-size: 0.85rem; line-height: 1.1;
    }
    :global(.mock-site-sub) {
        color: rgb(156,163,175); font-size: 0.65rem; line-height: 1.2;
    }
    :global(.mock-nav) {
        display: flex; align-items: center; gap: 0.65rem;
        color: rgb(209,213,219); font-size: 0.72rem; font-weight: 600;
    }
    :global(.mock-nav .mock-lang) {
        padding: 0.2rem 0.5rem; border-radius: 0.4rem;
        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
    }
    :global(.mock-nav .mock-user) {
        width: 28px; height: 28px; border-radius: 9999px;
        background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center;
    }
    :global(.mock-ticker) {
        background: rgba(245,158,11,0.08);
        color: rgb(251, 191, 36);
        font-size: 0.65rem; font-weight: 700;
        padding: 0.3rem 1rem;
        border-top: 1px solid rgba(245,158,11,0.15);
        white-space: nowrap; overflow: hidden;
    }

    /* 3-column body */
    :global(.mock-body) {
        display: flex; gap: 0.75rem; padding: 0.85rem;
    }

    /* Right ad column - matches real RightAdBanner (w-36 = 144px, slots 490px tall) */
    :global(.mock-right-ad) {
        width: 144px; flex-shrink: 0; position: relative;
    }
    :global(.mock-fixed-ad) {
        margin-top: 0.6rem;
        border-radius: 0.6rem;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.07);
        background: #0a1020;
        box-shadow: 0 4px 14px rgba(0,0,0,0.3);
    }
    :global(.mock-fixed-ad img) {
        width: 100%; height: auto; display: block;
    }
    :global(.mock-ad-label) {
        font-size: 0.6rem; font-weight: 700; color: #fbbf24;
        text-transform: uppercase; letter-spacing: 0.1em;
        text-align: center; margin: 0 0 0.5rem;
    }
    :global(.mock-here-pointer) {
        margin-top: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.35rem;
        background: linear-gradient(90deg, rgba(245,158,11,0.18), rgba(245,158,11,0.05));
        color: #fbbf24; font-size: 0.7rem; font-weight: 800;
        padding: 0.35rem 0.5rem; border-radius: 0.4rem;
        border: 1px dashed rgba(245,158,11,0.45);
    }
    :global(.mock-here-pointer .arrow) {
        font-size: 1rem;
        animation: pointerNudge 1.4s ease-in-out infinite;
    }
    @keyframes pointerNudge {
        0%, 100% { transform: translate(50%, -50%) scale(1); }
        50%      { transform: translate(50%, -50%) scale(1.06); }
    }

    /* Main content column */
    :global(.mock-main) {
        flex: 1; min-width: 0;
    }
    :global(.mock-h1) {
        color: white; font-weight: 900; font-size: 1.05rem; margin-bottom: 0.65rem;
        background: linear-gradient(90deg, #fbbf24, #f59e0b);
        -webkit-background-clip: text; background-clip: text; color: transparent;
    }

    /* Mock map */
    :global(.mock-map) {
        position: relative; height: 180px; border-radius: 0.5rem; overflow: hidden;
        background:
            linear-gradient(135deg, rgba(34,197,94,0.18), rgba(59,130,246,0.18)),
            #0a1020;
        border: 1px solid rgba(255,255,255,0.06);
        margin-bottom: 0.65rem;
    }
    :global(.mock-map-grid) {
        position: absolute; inset: 0;
        background-image:
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
        background-size: 22px 22px;
    }
    :global(.mock-pin) {
        position: absolute; transform: translate(50%, -50%);
        font-size: 1.1rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        animation: pinDrop 1.5s ease-out;
    }
    @keyframes pinDrop {
        from { transform: translate(50%, -150%); opacity: 0; }
        to   { transform: translate(50%, -50%); opacity: 1; }
    }
    :global(.mock-map-label) {
        position: absolute; top: 0.4rem; right: 0.5rem;
        background: rgba(0,0,0,0.55); color: white;
        font-size: 0.65rem; font-weight: 700;
        padding: 0.15rem 0.5rem; border-radius: 0.3rem;
        border: 1px solid rgba(255,255,255,0.1);
    }
    :global(.mock-cats) {
        display: flex; flex-wrap: wrap; gap: 0.35rem;
    }
    :global(.mock-cat-chip) {
        padding: 0.3rem 0.65rem; border-radius: 9999px;
        background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
        color: rgb(209,213,219); font-size: 0.7rem; font-weight: 600;
    }

    /* Left helper sidebar (other ads) */
    :global(.mock-left-ads) {
        width: 110px; flex-shrink: 0;
    }
    :global(.mock-other-ad) {
        margin-bottom: 0.5rem; border-radius: 0.4rem; overflow: hidden;
        border: 1px solid rgba(255,255,255,0.06);
    }
    :global(.mock-other-img) {
        height: 60px;
        background: rgba(255,255,255,0.04);
        background-image: linear-gradient(135deg, rgba(255,255,255,0.05) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.05) 75%, transparent 75%);
        background-size: 12px 12px;
    }
    :global(.mock-other-cta) {
        padding: 0.3rem; text-align: center;
        color: white; font-size: 0.6rem; font-weight: 700;
    }
    :global(.promo-desktop) {
        display: block; border-radius: 0.6rem; overflow: hidden;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3); cursor: pointer;
    }
    :global(.ad-img-wrap) { position: relative; overflow: hidden; }
    :global(.ad-img) {
        width: 100%; height: 100%; object-fit: cover;
        transition: opacity 1500ms ease;
    }
    /* ה-float שגורם לטקסט לעקוף את הלוגו - מוצג ומוצב רק ע"י logoClearance */
    :global(.logo-avoid) { display: none; }
    :global(.ad-logo) {
        position: absolute; top: 6px;
        width: 36px; height: 36px; border-radius: 6px;
        background: white; padding: 3px; object-fit: contain;
        z-index: 5;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    }
    :global(.ad-logo-right) { right: 6px; left: auto; }
    :global(.ad-logo-left)  { left: 6px;  right: auto; }
    :global(.ad-logo-circle) { border-radius: 50%; }
    /* Logo straddling the right corner of the diagonal colored band.
       Center sits at --diag-top-right (the band's right starting Y). 18px = half of 36px logo. */
    :global(.ad-logo-cta) {
        top: auto;
        bottom: calc(100% - var(--diag-top-right, 78%) - 18px);
        right: 6px;
        left: auto;
    }
    /* Free placement - the exact spot comes from an inline left/top the drag writes */
    :global(.ad-logo-free) { top: auto; bottom: auto; right: auto; left: auto; }
    /* Draggable affordance: grab cursor + dashed ring on hover/focus.
       touch-action:none is what lets a finger drag it instead of scrolling the page. */
    :global(.ad-logo-draggable) {
        cursor: grab;
        touch-action: none;
        user-select: none;
        -webkit-user-drag: none;
    }
    :global(.ad-logo-draggable:hover) {
        outline: 2px dashed rgba(251, 191, 36, 0.9);
        outline-offset: 2px;
    }
    :global(.ad-logo-draggable:focus-visible) {
        outline: 2px solid #fbbf24;
        outline-offset: 2px;
    }
    :global(.ad-logo-dragging) {
        cursor: grabbing;
        outline: 2px solid #fbbf24;
        outline-offset: 2px;
        box-shadow: 0 6px 18px rgba(0,0,0,0.55);
    }
    :global(.hover-overlay) {
        position: absolute; inset: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 0.75rem; text-align: center; transition: opacity 1500ms ease;
        pointer-events: none;
        z-index: 4; /* must sit above the decorative diagonal line on .pro-img-wrap::before (z-index:3) */
    }
    :global(.hover-logo) {
        position: absolute; transform: translate(-50%, -50%);
        object-fit: contain; border-radius: 6px; background: white; padding: 3px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    }
    :global(.hover-title) { color: white; font-weight: 700; font-size: 0.95rem; margin: 0 0 0.4rem; }
    /* pre-line - ירידות שורה שהמפרסם הקליד בשלב 6 נשמרות בתצוגה המקדימה
       (בלי זה HTML מכווץ כל \n לרווח והמשפט נשפך לשורה אחת) */
    :global(.hover-text)  { color: rgb(229,231,235); font-size: 0.7rem; line-height: 1.4; margin: 0 0 0.4rem; font-weight: 700; white-space: pre-line; }
    /* אותם מספרים של רצועת ה-CTA בטור הימני (p-2.5 / text-xs / leading-tight),
       כדי שטקסט ארוך יישבר שם בדיוק כמו כאן */
    :global(.promo-cta) { padding: 0.625rem; text-align: center; }
    :global(.promo-cta p) { color: white; font-weight: 700; font-size: 0.75rem; line-height: 1.25; margin: 0; }

    /* ============== LOGO CIRCULAR CROP MODAL ============== */
    :global(.crop-modal-bg) {
        position: fixed; inset: 0; z-index: 999;
        background: rgba(0,0,0,0.75);
        display: flex; align-items: center; justify-content: center;
        padding: 1rem;
        backdrop-filter: blur(4px);
    }
    :global(.crop-modal) {
        background: #0f172a;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 1rem;
        padding: 1.1rem;
        max-width: 95vw;
        width: 380px;
        box-shadow: 0 25px 60px rgba(0,0,0,0.6);
        direction: rtl;
    }
    :global(.crop-modal-head) {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 0.4rem;
    }
    :global(.crop-modal-head h3) {
        color: white; font-weight: 800; font-size: 1.05rem; margin: 0;
    }
    :global(.crop-modal-x) {
        background: transparent; border: none; color: rgba(255,255,255,0.7);
        font-size: 1.1rem; cursor: pointer; padding: 0.25rem 0.5rem;
        line-height: 1;
    }
    :global(.crop-modal-x:hover) { color: white; }
    :global(.crop-help) {
        color: rgba(255,255,255,0.7); font-size: 0.78rem; line-height: 1.4;
        margin: 0 0 0.7rem 0;
    }
    :global(.crop-stage) {
        position: relative;
        width: 100%; aspect-ratio: 1 / 1;
        background: #111;
        border-radius: 0.6rem;
        overflow: hidden;
        cursor: grab;
        touch-action: none;
        user-select: none;
    }
    :global(.crop-stage:active) { cursor: grabbing; }
    :global(.crop-img) {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        object-fit: contain;
        pointer-events: none;
        user-select: none;
        -webkit-user-drag: none;
        transform-origin: center;
        will-change: transform;
    }
    :global(.crop-circle-mask) {
        position: absolute; inset: 0;
        border-radius: 50%;
        box-shadow: 0 0 0 9999px rgba(0,0,0,0.55);
        pointer-events: none;
        border: 2px dashed rgba(255,255,255,0.55);
    }
    :global(.crop-controls) {
        display: flex; align-items: center; gap: 0.65rem;
        margin: 0.85rem 0 0.6rem 0;
    }
    :global(.crop-zoom-label) { color: rgba(255,255,255,0.85); font-size: 0.85rem; flex-shrink: 0; }
    :global(.crop-zoom-slider) { flex: 1; accent-color: #f59e0b; }
    :global(.crop-zoom-val) { color: rgba(255,255,255,0.7); font-size: 0.78rem; min-width: 3rem; text-align: left; }
    :global(.crop-actions) {
        display: flex; gap: 0.5rem; justify-content: flex-end;
    }
    :global(.crop-btn-cancel) {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        color: rgba(255,255,255,0.85);
        padding: 0.55rem 1rem; border-radius: 0.65rem;
        font-weight: 700; font-size: 0.85rem; cursor: pointer;
        transition: background 150ms;
    }
    :global(.crop-btn-cancel:hover) { background: rgba(255,255,255,0.12); }
    :global(.crop-btn-confirm) {
        background: linear-gradient(to right, #f59e0b, #ea580c);
        border: none; color: black;
        padding: 0.55rem 1.25rem; border-radius: 0.65rem;
        font-weight: 800; font-size: 0.9rem; cursor: pointer;
        transition: transform 150ms;
    }
    :global(.crop-btn-confirm:hover) { transform: translateY(-1px); }

    /* ============== COLOR RAIL - vertical round palette next to preview ============== */
    /* In RTL flex-row, justify-content:flex-end packs items toward the LEFT visually.
       Combined with flex:1 on the desktop preview, the rail sits flush against the left
       edge and the screenshot expands to fill the rest of the row. */
    :global(.preview-with-rail) {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-end;
        gap: 0.55rem;
        flex-wrap: wrap;
    }
    /* Desktop preview grows to fill the remaining row width - rail stays compact on left */
    :global(.preview-frame.desktop) {
        flex: 1 1 auto;
        min-width: 0;
    }
    /* Mobile preview also fills the row - its inner align-items:center centers the phone horizontally */
    :global(.preview-frame.mobile) {
        flex: 1 1 auto;
        min-width: 0;
    }

    /* ============== תמונה ייעודית לנייד (שלב 7) ============== */
    :global(.mobile-image-swap) {
        margin-bottom: 0.9rem;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 0.9rem;
        background: rgba(255,255,255,0.04);
        padding: 0.75rem 0.85rem;
        text-align: center;
    }
    :global(.mobile-image-swap-title) {
        margin: 0; color: white; font-weight: 900; font-size: 0.9rem;
    }
    :global(.mobile-image-swap-help) {
        margin: 0.2rem 0 0.6rem; color: rgb(156,163,175); font-size: 0.72rem; line-height: 1.35;
    }
    /* אזור שחרור: גרירה או לחיצה, שניהם מעלים את התמונה */
    :global(.mobile-image-swap-drop) {
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.15rem;
        width: 100%; max-width: 320px; margin: 0 auto;
        padding: 1rem 0.9rem; border-radius: 0.8rem; cursor: pointer;
        border: 2px dashed rgba(245,158,11,0.45); background: rgba(245,158,11,0.06);
        color: rgb(253,230,138);
        transition: background 0.15s, border-color 0.15s, transform 0.15s;
    }
    :global(.mobile-image-swap-drop:hover) {
        background: rgba(245,158,11,0.14); border-color: rgba(245,158,11,0.8);
    }
    :global(.mobile-image-swap-drop.dragging) {
        border-color: rgb(34,197,94); background: rgba(34,197,94,0.12);
        box-shadow: 0 0 0 4px rgba(34,197,94,0.18);
        transform: scale(1.01);
    }
    :global(.mobile-image-swap-drop-main) { font-weight: 800; font-size: 0.82rem; }
    :global(.mobile-image-swap-drop-sub) { color: rgb(156,163,175); font-size: 0.68rem; }
    /* גם כשכבר יש תמונה - גרירה מעליה מחליפה אותה */
    :global(.mobile-image-swap-frame.dragging) {
        border-color: rgb(34,197,94);
        box-shadow: 0 0 0 4px rgba(34,197,94,0.2);
    }
    /* אותו יחס בדיוק של משבצת התמונה בנייד, כדי שהחיתוך שנבחר כאן
       יהיה החיתוך שרואים שם */
    :global(.mobile-image-swap-frame) {
        position: relative; width: 100%; max-width: 320px; margin: 0 auto;
        aspect-ratio: 384 / 176; border-radius: 0.7rem; overflow: hidden;
        border: 2px solid rgba(245,158,11,0.45);
    }
    :global(.mobile-image-swap-frame img) {
        width: 100%; height: 100%; object-fit: cover; display: block;
    }
    :global(.mobile-image-swap-note) {
        margin: 0.45rem 0 0; color: rgb(134,239,172); font-size: 0.7rem; font-weight: 700;
    }

    /* ============== טיפוגרפיית תת-הכותרת (שלב 5) ============== */
    :global(.sub-type-panel) {
        margin-top: 0.85rem;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 0.9rem;
        background: rgba(255,255,255,0.04);
        padding: 0.75rem 0.9rem;
        display: flex; flex-direction: column; gap: 0.6rem;
    }
    :global(.sub-type-title) {
        margin: 0; color: rgb(253,230,138); font-weight: 900; font-size: 0.85rem;
    }
    :global(.sub-type-row) {
        display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;
    }
    :global(.sub-type-label) {
        color: rgb(209,213,219); font-weight: 700; font-size: 0.78rem;
        min-width: 6.5rem;
    }
    :global(.sub-type-range) {
        flex: 1 1 8rem; min-width: 7rem; accent-color: rgb(245,158,11);
    }
    :global(.sub-type-value) {
        color: white; font-weight: 700; font-size: 0.75rem;
        min-width: 2.6rem; text-align: center;
        font-variant-numeric: tabular-nums;
    }
    :global(.sub-type-aligns) {
        display: flex; gap: 0.35rem; flex-wrap: wrap; flex: 1 1 auto;
    }
    :global(.sub-type-align-btn) {
        display: inline-flex; align-items: center; gap: 0.3rem;
        padding: 0.35rem 0.6rem; border-radius: 0.6rem; cursor: pointer;
        border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05);
        color: rgb(209,213,219); font-size: 0.72rem; font-weight: 700;
        transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    :global(.sub-type-align-btn:hover) { color: white; background: rgba(255,255,255,0.10); }
    :global(.sub-type-align-btn.is-active) {
        background: rgb(245,158,11); border-color: rgb(245,158,11); color: black;
    }
    /* במסך צר נשארים האייקונים בלבד, כדי שארבע האפשרויות ייכנסו בשורה */
    @media (max-width: 480px) {
        :global(.sub-type-align-text) { display: none; }
    }
    :global(.sub-type-reset) {
        align-self: flex-start; background: none; border: none; cursor: pointer;
        color: rgb(252,211,77); font-size: 0.72rem; font-weight: 700;
        text-decoration: underline; text-underline-offset: 2px; padding: 0;
    }
    /* Horizontal color picker - wide strip, two short rows */
    :global(.color-rail) {
        display: grid;
        grid-template-columns: repeat(11, 28px);
        grid-auto-rows: 28px;
        column-gap: 5px;
        row-gap: 5px;
        padding: 0.55rem;
        background: rgba(0,0,0,0.35);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 0.85rem;
        align-self: center;
        width: max-content;
        position: relative;
    }
    :global(.color-dot) {
        width: 28px; height: 28px;
        border-radius: 9999px;
        border: 2px solid rgba(255,255,255,0.16);
        cursor: pointer;
        position: relative;
        padding: 0;
        transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
    }
    :global(.color-dot:hover) {
        transform: scale(1.18);
        border-color: rgba(255,255,255,0.7);
    }
    :global(.color-dot.selected) {
        transform: scale(1.25);
        border-color: white;
        box-shadow: 0 0 0 3px rgba(255,255,255,0.22), 0 4px 12px rgba(0,0,0,0.45);
    }
    /* בנייד הרוחב נגזר מהמסך ולא ממספר עמודות קבוע — פלטה רחבה מדי
       גלשה אל מחוץ לכרטיס במסכים צרים */
    @media (max-width: 640px) {
        :global(.color-rail) {
            grid-template-columns: repeat(auto-fit, 28px);
            grid-auto-rows: 28px;
            width: 100%;
            max-width: 100%;
            justify-content: center;
        }
    }

    /* ============== PRO AD STYLE - diagonal banner with overlaid title ============== */
    :global(.pro-img-wrap) { position: relative; overflow: hidden; }

    /* Diagonal color band - covers the bottom portion of the image at an angle */
    :global(.pro-diag) {
        position: absolute; inset: 0;
        /* clip-path uses CSS variables so the user can adjust the band height in step 6.
           top-left and top-right are y% from the top - smaller numbers = taller band. */
        clip-path: polygon(
            0 var(--diag-top-left, 88%),
            100% var(--diag-top-right, 78%),
            100% 100%, 0 100%
        );
        opacity: 0.96;
        transition: opacity 1500ms ease, clip-path 280ms ease;
        pointer-events: none;
    }
    /* Subtle white-shine streak across the diagonal */
    :global(.pro-diag::after) {
        content: "";
        position: absolute; inset: 0;
        background: linear-gradient(125deg, transparent 30%, rgba(255,255,255,0.18) 45%, transparent 60%);
        pointer-events: none;
    }

    /* Title color picker - sits inline on the left side of the step heading */
    .title-color-rail {
        margin-inline-start: auto;
        display: inline-flex; align-items: center; gap: 0.3rem;
        flex-wrap: wrap; justify-content: flex-end;
    }
    .title-color-label {
        font-size: 0.78rem;
        color: rgba(203, 213, 225, 0.85);
        margin-inline-end: 0.35rem;
        white-space: nowrap;
    }
    .title-color-dot {
        width: 1.25rem; height: 1.25rem; border-radius: 9999px;
        border: 1.5px solid rgba(255,255,255,0.25);
        cursor: pointer; transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
        padding: 0;
    }
    .title-color-dot:hover { transform: scale(1.12); border-color: rgba(255,255,255,0.6); }
    .title-color-dot.selected {
        border-color: #fbbf24;
        box-shadow: 0 0 0 1.5px rgba(251,191,36,0.45);
        transform: scale(1.15);
    }
    .title-color-custom {
        position: relative; display: inline-flex; align-items: center; justify-content: center;
        width: 1.25rem; height: 1.25rem; border-radius: 9999px;
        background: linear-gradient(135deg, #f87171, #fbbf24, #34d399, #60a5fa, #c4b5fd);
        border: 1.5px solid rgba(255,255,255,0.35);
        cursor: pointer; font-size: 0.65rem;
    }
    .title-color-custom input[type="color"] {
        position: absolute; inset: 0; width: 100%; height: 100%;
        opacity: 0; cursor: pointer; border: 0; padding: 0;
    }

    :global(.pro-title-wrap) {
        position: absolute; left: 0; right: 0; bottom: 0;
        padding: 0.55rem 0.7rem 1.1rem;
        z-index: 4;
        text-align: var(--sub-align, right);
        transition: opacity 1500ms ease;
    }
    :global(.pro-title-wrap.mobile) {
        padding: 0.65rem 0.85rem 1.25rem;
    }
    /* Decorative diagonal-following first-line: float on the visual-left with a triangular
       shape-outside, so the FIRST line wraps shorter (matching the diagonal band's tip),
       and subsequent lines flow at full width. Invisible - pure layout. */
    :global(.pro-sub::before) {
        content: '';
        /* logoClearance מכבה אותו (--logo-avoid-tri) כשהלוגו באותו צד */
        display: var(--logo-avoid-tri, block);
        float: left;
        width: 28%;
        height: 1.35em;
        shape-outside: polygon(0 0, 100% 0, 0 100%);
        -webkit-shape-outside: polygon(0 0, 100% 0, 0 100%);
    }
    :global(.pro-title-wrap.mobile .pro-sub::before) {
        width: 32%;
        height: 1.4em;
    }
    /* Title - centered at the TOP of the ad, on a soft dark fade for readability */
    :global(.pro-title-top) {
        position: absolute; left: 0; right: 0; top: 0;
        padding: 0.55rem 0.7rem 0.85rem;
        z-index: 4;
        text-align: center;
        background: linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0) 100%);
        transition: opacity 1500ms ease;
        pointer-events: none;
    }
    :global(.pro-title-top.mobile) {
        padding: 0.2rem 0.9rem 1.15rem;
    }
    /* לוגו בפינה העליונה יושב בגובה הכותרת, ולכן הכותרת שומרת לו מקום -
       אחרת הוא מכסה את המילה האחרונה במשבצת של 144px. אותם כללים בדיוק
       ב-RightAdBanner, כך שהכותרת נשברת אותו דבר בתצוגה ובאתר. */
    :global(.pro-title-top.has-corner-logo-right) { padding-right: 46px; }
    :global(.pro-title-top.has-corner-logo-left)  { padding-left: 46px; }
    :global(.pro-title) {
        color: white; font-weight: 900;
        font-size: 1.15rem; line-height: 1.15;
        margin: 0 0 0.2rem;
        text-shadow: 0 2px 8px rgba(0,0,0,0.7), 0 1px 2px rgba(0,0,0,0.9);
        letter-spacing: -0.02em;
    }
    :global(.pro-title-top .pro-title) {
        margin: 0;
        text-align: center;
        letter-spacing: 0.005em;
        text-shadow: 0 2px 10px rgba(0,0,0,0.85), 0 1px 2px rgba(0,0,0,0.95);
    }
    :global(.pro-title-wrap.mobile .pro-title) {
        font-size: 1.4rem;
    }
    :global(.pro-title-top.mobile .pro-title) {
        font-size: 1.55rem;
    }
    /* גודל/רווח/יישור מגיעים מהמשתנים ש-adStyleVars מייצר (שלב 5), עם
       ה-fallback הישן - בדיוק אותו כלל שרץ ב-RightAdBanner באתר */
    :global(.pro-sub) {
        color: rgba(255,255,255,0.95); font-weight: 600;
        font-size: var(--sub-size, 0.88rem); line-height: var(--sub-lh, 1.3); margin: 0;
        text-shadow: 0 1px 4px rgba(0,0,0,0.6);
    }
    /* בנייד המשבצת רחבה יותר, ולכן הטיפוגרפיה מוגדלת ביחס קבוע לבחירת המפרסם */
    :global(.pro-title-wrap.mobile .pro-sub) {
        font-size: calc(var(--sub-size, 0.88rem) * 1.14);
    }

    /* The landing-page mock lives in builder/landing/+page.svelte. Its styles must NOT be
       repeated here as :global - once the builder's CSS is loaded it stays on the page and
       overrides the landing preview (it pinned the logo absolute, on top of the headline). */

    :global(.img-placeholder) {
        width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
        background: rgba(255,255,255,0.03); color: rgb(107, 114, 128); font-size: 0.85rem; font-weight: 700;
    }
    :global(.img-placeholder.small) { font-size: 0.7rem; }

    /* ============== Checklist ============== */
    :global(.checklist) {
        list-style: none; padding: 0; margin: 0;
        display: grid; grid-template-columns: 1fr; gap: 0.5rem;
    }
    @media (min-width: 640px) {
        :global(.checklist) { grid-template-columns: 1fr 1fr; }
    }
    :global(.checklist li) {
        background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
        border-radius: 0.6rem; padding: 0.55rem 0.85rem;
        color: rgb(156,163,175); font-size: 0.875rem;
        display: flex; align-items: center; gap: 0.5rem;
    }
    :global(.checklist li.done) {
        color: rgb(229,231,235);
        background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.25);
    }

    /* ============== DESIGN-HELP MODAL ============== */
    :global(.help-backdrop) {
        position: fixed; inset: 0;
        background: rgba(2, 6, 23, 0.78);
        backdrop-filter: blur(6px);
        z-index: 300;
        display: flex; align-items: center; justify-content: center;
        padding: 1rem;
        animation: helpFadeIn 160ms ease-out;
    }
    @keyframes helpFadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
    }
    :global(.help-modal) {
        width: 100%; max-width: 540px;
        background: linear-gradient(180deg, #111827 0%, #0b1220 100%);
        border: 1px solid rgba(245, 158, 11, 0.35);
        border-radius: 1rem;
        padding: 1.4rem;
        box-shadow: 0 24px 60px rgba(0,0,0,0.65), 0 0 40px rgba(245,158,11,0.12);
        color: rgb(229, 231, 235);
        animation: helpSlideUp 200ms ease-out;
    }
    @keyframes helpSlideUp {
        from { transform: translateY(14px); opacity: 0; }
        to   { transform: translateY(0); opacity: 1; }
    }
    :global(.help-modal-head) {
        display: flex; align-items: center; gap: 0.6rem;
        padding-bottom: 0.85rem;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        margin-bottom: 0.95rem;
    }
    :global(.help-modal-icon) { font-size: 1.5rem; }
    :global(.help-modal-head h2) {
        margin: 0; font-size: 1.15rem; font-weight: 900;
        color: rgb(252, 211, 77); flex: 1;
    }
    :global(.help-close) {
        background: transparent; border: 0; color: rgb(156,163,175);
        font-size: 1.7rem; line-height: 1; cursor: pointer; padding: 0 0.3rem;
        transition: color 120ms ease;
    }
    :global(.help-close:hover) { color: white; }

    :global(.help-intro) {
        font-size: 0.92rem; line-height: 1.55; color: rgb(203, 213, 225);
        margin: 0 0 1rem;
    }

    :global(.help-field) { display: block; margin-bottom: 0.85rem; position: relative; }
    :global(.help-label) {
        display: block; font-size: 0.85rem; font-weight: 700;
        color: rgb(229, 231, 235); margin-bottom: 0.35rem;
    }
    :global(.help-required) { color: rgb(248, 113, 113); }

    :global(.help-textarea), :global(.help-input) {
        width: 100%;
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 0.6rem;
        padding: 0.7rem 0.85rem;
        color: white; font-size: 0.95rem; line-height: 1.45;
        font-family: inherit;
        resize: vertical;
        transition: border-color 120ms ease, box-shadow 120ms ease;
    }
    :global(.help-textarea) { min-height: 120px; }
    :global(.help-textarea:focus), :global(.help-input:focus) {
        outline: none;
        border-color: rgba(245, 158, 11, 0.6);
        box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18);
    }
    :global(.help-counter) {
        position: absolute; bottom: 0.45rem; left: 0.7rem;
        font-size: 0.7rem; color: rgb(107, 114, 128);
        pointer-events: none;
    }

    :global(.help-identity) {
        font-size: 0.88rem; color: rgb(203, 213, 225);
        background: rgba(16, 185, 129, 0.08);
        border: 1px solid rgba(16, 185, 129, 0.25);
        border-radius: 0.55rem;
        padding: 0.55rem 0.75rem;
        margin: 0 0 0.85rem;
        display: flex; align-items: center; flex-wrap: wrap; gap: 0.35rem;
    }
    :global(.help-identity strong) { color: rgb(110, 231, 183); }
    :global(.help-identity-note) {
        color: rgb(148, 163, 184); font-size: 0.8rem; font-weight: 400;
    }

    :global(.help-error) {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.4);
        color: rgb(252, 165, 165);
        border-radius: 0.55rem;
        padding: 0.55rem 0.75rem;
        font-size: 0.85rem;
        margin-bottom: 0.85rem;
    }

    :global(.help-actions) {
        display: flex; gap: 0.6rem; justify-content: flex-end;
        margin-top: 0.4rem;
    }
    :global(.help-btn-secondary), :global(.help-btn-primary) {
        padding: 0.7rem 1.1rem;
        border-radius: 0.7rem;
        font-weight: 800;
        font-size: 0.95rem;
        cursor: pointer;
        transition: transform 100ms ease, box-shadow 120ms ease, background 120ms ease;
        display: inline-flex; align-items: center; gap: 0.45rem;
        border: 0;
    }
    :global(.help-btn-secondary) {
        background: rgba(255,255,255,0.07);
        color: rgb(203, 213, 225);
        border: 1px solid rgba(255,255,255,0.12);
    }
    :global(.help-btn-secondary:hover:not(:disabled)) {
        background: rgba(255,255,255,0.12);
    }
    :global(.help-btn-primary) {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: #0b1020;
        box-shadow: 0 8px 22px rgba(245, 158, 11, 0.35);
    }
    :global(.help-btn-primary:hover:not(:disabled)) {
        transform: translateY(-1px);
        box-shadow: 0 12px 26px rgba(245, 158, 11, 0.5);
    }
    :global(.help-btn-primary:disabled), :global(.help-btn-secondary:disabled) {
        opacity: 0.55; cursor: not-allowed; transform: none;
    }
    :global(.help-spinner) {
        width: 14px; height: 14px;
        border: 2px solid rgba(11, 16, 32, 0.3);
        border-top-color: rgb(11, 16, 32);
        border-radius: 50%;
        animation: helpSpin 700ms linear infinite;
    }
    @keyframes helpSpin { to { transform: rotate(360deg); } }

    @media (max-width: 480px) {
        :global(.help-modal) { padding: 1.1rem; border-radius: 0.8rem; }
        :global(.help-actions) { flex-direction: column-reverse; }
        :global(.help-btn-primary), :global(.help-btn-secondary) {
            width: 100%; justify-content: center;
        }
    }
</style>
