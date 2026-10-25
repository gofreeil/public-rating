<script lang="ts">
    // ============================================================
    // בילדר הפרסומת — עיצוב הכרטיס ודף הנחיתה, עם תצוגה חיה.
    //
    // חלק עיצוב הכרטיס (שלבים 1-6 והדמו החי) הוא העתק של הבילדר בקהילה
    // בשכונה: אותם פקדים, טווחים, ברירות מחדל, צבעים ושפות, ואותו
    // "גיליון סגנון" (adStyle) שנשמר עם המודעה. כך פרסומת שמופצת משם,
    // או שנערכת כאן, נראית זהה בכל אתרי הרשת.
    // מה ששייך לאתר הזה בלבד: דף הנחיתה, תקופת הפרסום ונתיבי השמירה.
    // ============================================================
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { untrack } from 'svelte';
    import { _ } from 'svelte-i18n';
    import { adImgFit, AD_ZOOM_MIN, AD_ZOOM_MAX } from '$lib/adImageFit';
    import {
        adStyleVars, logoCornerSide, type AdStyle, type SubAlign,
        DEFAULT_BAND_HEIGHT, BAND_MIN, BAND_MAX, TITLE_OFFSET_MIN, TITLE_OFFSET_MAX,
        DEFAULT_SUB_FONT_SIZE, SUB_FONT_SIZE_MIN, SUB_FONT_SIZE_MAX,
        DEFAULT_SUB_LINE_HEIGHT, SUB_LINE_HEIGHT_MIN, SUB_LINE_HEIGHT_MAX,
    } from '$lib/adStyle';
    import { logoClearance } from '$lib/logoClearance';
    import { AD_GRADIENTS, DEFAULT_GRADIENT_ID, normalizeGradientId } from '$lib/ads/gradients';
    import { compressImage, dataUrlBytes, fmtKb, MAX_AD_TOTAL_BYTES } from '$lib/ads/adImage';
    import Seo from '$lib/components/rating/Seo.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    // עריכת פרסומת קיימת (?edit=<id>) - ערך פתיחה בלבד, רענון data לא דורס
    const edit = untrack(() => data.editAd);
    const editStyle = edit?.adStyle ?? null;
    const editFit = edit?.mainImageFit;

    // ===== הלוגו =====
    let logo = $state(edit?.logo ?? '');                 // מה שמוצג (חיתוך עגול או המקור)
    let logoOriginal = $state(edit?.logo ?? '');         // ההעלאה הגולמית - מקור לחיתוך
    let logoShape = $state<'square' | 'circle'>(editStyle?.logoShape ?? 'square');
    let hasCircleCrop = $state(editStyle?.logoShape === 'circle');
    let logoPosition = $state<'right' | 'left' | 'cta'>(editStyle?.logoAnchor ?? 'right');
    // כל עוד המפרסם לא בחר מיקום בעצמו: כותרת ארוכה ← הלוגו מעל ה-CTA
    let logoPositionExplicit = $state(Boolean(editStyle));

    // ===== מיקום חופשי של הלוגו =====
    // מרכז הלוגו באחוזי משבצת התמונה. null בשני הצירים = יושב על העוגן.
    let logoFreeX = $state<number | null>(editStyle?.logoX ?? null);
    let logoFreeY = $state<number | null>(editStyle?.logoY ?? null);
    let logoFree = $derived(logoFreeX !== null && logoFreeY !== null);
    let logoDragging = $state(false);

    let logoAnchorCls = $derived(
        logoPosition === 'left' ? 'ad-logo-left' : logoPosition === 'cta' ? 'ad-logo-cta' : 'ad-logo-right',
    );
    let logoFreeStyle = $derived(
        logoFree
            ? `left:${logoFreeX}%; top:${logoFreeY}%; right:auto; bottom:auto; transform:translate(-50%,-50%);`
            : '',
    );

    let dragWrapW = 0, dragWrapH = 0;
    let dragHalfW = 0, dragHalfH = 0;
    let dragStartX = 0, dragStartY = 0;
    let dragBaseCX = 0, dragBaseCY = 0;

    /** מודד את הלוגו ואת המשבצת; מחזיר את מרכז הלוגו בפיקסלים בתוכה */
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

    /** שומר מרכז לוגו (פיקסלים במשבצת), תחום כך שלא יברח מהפרסומת */
    function commitLogoCenter(cx: number, cy: number) {
        const x = Math.min(Math.max(cx, dragHalfW), dragWrapW - dragHalfW);
        const y = Math.min(Math.max(cy, dragHalfH), dragWrapH - dragHalfH);
        logoFreeX = Math.round((x / dragWrapW) * 1000) / 10;
        logoFreeY = Math.round((y / dragWrapH) * 1000) / 10;
        logoPositionExplicit = true;
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
    /** מקבילת מקלדת לגרירה: חיצים מזיזים 1% מהמשבצת, עם Shift - 5% */
    function logoKeyDown(e: KeyboardEvent) {
        const keys: Record<string, [number, number]> = {
            ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
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
            center.cy + dir[1] * (dragWrapH * stepPct / 100),
        );
    }
    function resetLogoPosition() {
        logoFreeX = null;
        logoFreeY = null;
        logoPositionExplicit = false;
    }
    /** העוגנים נשארים קיצורי דרך בלחיצה - והם מבטלים מיקום חופשי */
    function setLogoAnchor(pos: 'right' | 'left' | 'cta') {
        logoFreeX = null;
        logoFreeY = null;
        logoPosition = pos;
        logoPositionExplicit = true;
    }

    // ===== חיתוך הלוגו לעיגול =====
    const CROP_STAGE = 320;
    const LOGO_MAX_BYTES = 90 * 1024;
    let cropOpen = $state(false);
    let cropZoom = $state(1);
    let cropOffsetX = $state(0);
    let cropOffsetY = $state(0);
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
            logoShape = 'square';
            if (logoOriginal) logo = logoOriginal;
        }
    }
    async function confirmCrop() {
        if (!logoOriginal) { cropOpen = false; return; }
        const img = new Image();
        img.src = logoOriginal;
        await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(); });

        const aspectImg = img.width / img.height;
        // החיתוך נשמר כ-PNG (שקיפות מחוץ לעיגול). מודעה כאן נשמרת כולה
        // כ-data URI עם תקרת משקל, ולכן לוגו כבד מוקטן עד שהוא נכנס בתקרה
        let out = '';
        for (const size of [CROP_STAGE, 256, 200, 160]) {
            const k = size / CROP_STAGE;
            let drawW: number, drawH: number;
            if (aspectImg > 1) { drawW = size; drawH = size / aspectImg; }
            else { drawH = size; drawW = size * aspectImg; }
            const canvas = document.createElement('canvas');
            canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d')!;
            ctx.save();
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.translate(size / 2 + cropOffsetX * k, size / 2 + cropOffsetY * k);
            ctx.scale(cropZoom, cropZoom);
            ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
            ctx.restore();
            out = canvas.toDataURL('image/png');
            if (dataUrlBytes(out) <= LOGO_MAX_BYTES) break;
        }

        logo = out;
        hasCircleCrop = true;
        cropOpen = false;
    }
    function chooseSquare() {
        logoShape = 'square';
        if (logoOriginal) logo = logoOriginal;
    }
    function chooseCircle() {
        logoShape = 'circle';
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

    // ===== התמונה הראשית =====
    let mainImage = $state(edit?.mainImage ?? '');
    let mainImageObjectX = $state(editFit?.x ?? 50);    // נקודת המיקוד (0-100)
    let mainImageObjectY = $state(editFit?.y ?? 50);
    let mainImageZoom = $state(editFit?.z ?? 1);        // 1 = מילוי המשבצת
    let mainImageFit = $derived({ x: mainImageObjectX, y: mainImageObjectY, z: mainImageZoom });

    // ===== טקסטים וצבע =====
    let title = $state(edit?.title ?? '');
    let titleColor = $state(editStyle?.titleColor ?? '#ffffff');
    let titleOffsetY = $state(editStyle?.titleOffsetY ?? 0);    // -20..+60 px
    let subtitle = $state(edit?.subtitle ?? '');
    let subFontSize = $state(editStyle?.subFontSize ?? DEFAULT_SUB_FONT_SIZE);
    let subLineHeight = $state(editStyle?.subLineHeight ?? DEFAULT_SUB_LINE_HEIGHT);
    let subAlign = $state<SubAlign>(editStyle?.subAlign ?? 'right');
    let hoverText = $state(edit?.hoverText ?? '');
    let cta = $state(edit ? edit.cta : 'הקלק לפרטים והזמנות');
    let gradient = $state(edit ? normalizeGradientId(edit.gradientId) : DEFAULT_GRADIENT_ID);
    let diagHeight = $state(editStyle?.bandHeight ?? DEFAULT_BAND_HEIGHT);   // % מגובה התמונה (5..50)
    // כרטיס מוצר מהחנות - בלי רצועת ה-CTA, כמו בטור
    const shopCard = edit?.shop === true;

    // ===== העיצוב שנוסע עם המודעה =====
    let adStyle = $derived<AdStyle>({
        logoShape,
        logoAnchor: logoPosition,
        logoX: logoFreeX,
        logoY: logoFreeY,
        bandHeight: diagHeight,
        titleOffsetY,
        titleColor,
        subFontSize,
        subLineHeight,
        subAlign,
    });
    // אותו כלל של האתר: לוגו בפינה העליונה ← הכותרת שומרת לו מקום
    let titleCornerSide = $derived(logoCornerSide(adStyle, Boolean(logo)));

    // ברירת מחדל אוטומטית למיקום הלוגו: כותרת ארוכה (>20) לא משאירה מקום
    // ללוגו בפינה שלידה, ולכן הוא יורד מעל ה-CTA. נעצר ברגע שנבחר ידנית.
    $effect(() => {
        if (!logo || logoPositionExplicit) return;
        const next: 'right' | 'cta' = title.trim().length > 20 ? 'cta' : 'right';
        if (logoPosition !== next) logoPosition = next;
    });

    // ===== השלבים והדמו החי =====
    type Step = 'image' | 'logo' | 'title' | 'gradient' | 'subtitle' | 'hover';
    const stepOrder: Step[] = ['image', 'logo', 'title', 'gradient', 'subtitle', 'hover'];
    let activeStep = $state<Step>('image');
    let stepRefs: Record<Step, HTMLElement | null> = $state({
        image: null, logo: null, title: null, gradient: null, subtitle: null, hover: null,
    });

    // הדמו "קופץ" לגובה השלב הפעיל
    let demoTop = $state(0);
    function updateDemoPosition() {
        if (!browser) return;
        const stepEl = stepRefs[activeStep];
        const colsEl = stepEl?.closest('.builder-cols') as HTMLElement | null;
        if (!stepEl || !colsEl) return;
        demoTop = stepEl.getBoundingClientRect().top - colsEl.getBoundingClientRect().top;
    }
    $effect(() => {
        void activeStep;
        if (!browser) return;
        requestAnimationFrame(updateDemoPosition);
        const onResize = () => requestAnimationFrame(updateDemoPosition);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    });

    function advance(to: Step) {
        activeStep = to;
        requestAnimationFrame(() => stepRefs[to]?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
    function nextOf(s: Step): Step {
        return stepOrder[Math.min(stepOrder.indexOf(s) + 1, stepOrder.length - 1)];
    }
    function prevOf(s: Step): Step {
        return stepOrder[Math.max(stepOrder.indexOf(s) - 1, 0)];
    }
    function commitField(field: Step) {
        if (activeStep !== field) return;
        advance(nextOf(field));
    }
    function focusStep(s: Step) {
        if (activeStep !== s) activeStep = s;
    }

    /** תיבת טקסט שגדלה לפי התוכן - גובה קבוע חתך את השורות האחרונות */
    function autoGrow(node: HTMLTextAreaElement, _value: string) {
        const fit = () => {
            node.style.height = 'auto';
            node.style.height = `${node.scrollHeight}px`;
        };
        fit();
        node.addEventListener('input', fit);
        return {
            update: fit,
            destroy: () => node.removeEventListener('input', fit),
        };
    }

    // ===== העלאת תמונות =====
    let isDraggingMain = $state(false);
    let isDraggingLogo = $state(false);
    let isDraggingLanding = $state(false);
    // השגיאה נקשרת לאזור ההעלאה שבו קרתה — מוצגת שם, לא בסקשן אחר
    let imageError = $state<'' | 'main' | 'logo' | 'landing'>('');

    async function processImageFile(file: File | null | undefined, target: 'main' | 'logo' | 'landing') {
        if (!file) return;
        imageError = '';
        let url: string;
        try {
            // התקרות של האתר הזה: כל המודעה נשמרת כ-data URI בשורה אחת
            url = await compressImage(file, target === 'logo' ? LOGO_MAX_BYTES : 220 * 1024);
        } catch {
            imageError = target;
            return;
        }
        if (target === 'main') {
            mainImage = url;
            mainImageObjectX = 50;
            mainImageObjectY = 50;
            mainImageZoom = 1;
        } else if (target === 'logo') {
            logoOriginal = url;
            logo = url;
            hasCircleCrop = false;
            if (logoShape === 'circle') openCropper();
        } else {
            landingImage = url;
        }
    }
    async function handleImage(e: Event, target: 'main' | 'logo' | 'landing') {
        const input = e.currentTarget as HTMLInputElement;
        await processImageFile(input.files?.[0], target);
        input.value = '';
    }
    function clearImage(target: 'main' | 'logo' | 'landing') {
        if (target === 'main') { mainImage = ''; mainImageObjectX = 50; mainImageObjectY = 50; mainImageZoom = 1; }
        else if (target === 'landing') landingImage = '';
        else { logo = ''; logoOriginal = ''; hasCircleCrop = false; }
    }
    function nudgeMainImage(dir: 'up' | 'down' | 'left' | 'right') {
        const STEP = 8;
        const dy = dir === 'up' ? -STEP : dir === 'down' ? STEP : 0;
        const dx = dir === 'left' ? -STEP : dir === 'right' ? STEP : 0;
        const clamp = (v: number) => Math.min(100, Math.max(0, v));
        mainImageObjectY = clamp(mainImageObjectY + dy);
        mainImageObjectX = clamp(mainImageObjectX + dx);
    }
    /** זום בצעדים יחסיים; 1 = מילוי המשבצת (cover) */
    function zoomMainImage(dir: 'in' | 'out') {
        const FACTOR = 1.15;
        const next = dir === 'in' ? mainImageZoom * FACTOR : mainImageZoom / FACTOR;
        mainImageZoom = Math.round(Math.min(AD_ZOOM_MAX, Math.max(AD_ZOOM_MIN, next)) * 100) / 100;
    }
    function dragOver(e: DragEvent, setActive: (v: boolean) => void) {
        if (!e.dataTransfer?.types.includes('Files')) return;
        e.preventDefault();
        e.stopPropagation();
        setActive(true);
    }
    function dragLeave(e: DragEvent, setActive: (v: boolean) => void) {
        e.preventDefault();
        e.stopPropagation();
        setActive(false);
    }
    async function handleDrop(e: DragEvent, target: 'main' | 'logo' | 'landing', setActive: (v: boolean) => void) {
        e.preventDefault();
        e.stopPropagation();
        setActive(false);
        await processImageFile(e.dataTransfer?.files?.[0], target);
    }

    const titleColors = [
        { c: '#ffffff', labelKey: 'c_white' },
        { c: '#fbbf24', labelKey: 'c_gold' },
        { c: '#fde047', labelKey: 'c_yellow' },
        { c: '#fb923c', labelKey: 'c_orange' },
        { c: '#f87171', labelKey: 'c_red' },
        { c: '#f9a8d4', labelKey: 'c_pink' },
        { c: '#c4b5fd', labelKey: 'c_purple' },
        { c: '#67e8f9', labelKey: 'c_cyan' },
        { c: '#86efac', labelKey: 'c_green' },
        { c: '#0f172a', labelKey: 'c_black' },
    ];

    // ===== דף הנחיתה (האתר הזה) =====
    const el = edit?.landing;
    let headline = $state(el?.headline ?? '');
    let pitch = $state(el?.pitch ?? '');
    let extended = $state(el?.extended ?? '');
    let advantages = $state<string[]>([...(el?.advantages ?? ['', '', ''])]);
    let uniqueness = $state(el?.uniqueness ?? '');
    let phone = $state(el?.phone ?? '');
    let whatsapp = $state(el?.whatsapp ?? '');
    let website = $state(el?.website ?? '');
    let email = $state(el?.email ?? '');
    let address = $state(el?.address ?? '');
    let hours = $state(el?.hours ?? '');
    let landingImage = $state(el?.image ?? '');
    // מוצרים אין בבילדר הזה, אבל בעריכה הם נשמרים כפי שהם
    const products = el?.products ?? [];

    let durationDays = $state(30);

    // שדה דבש — מוסתר מהמשתמש, ממולא רק בידי בוט
    let companyUrl = $state('');

    let sending = $state(false);
    let error = $state('');

    const totalBytes = $derived(
        dataUrlBytes(mainImage) + dataUrlBytes(logo) + dataUrlBytes(landingImage),
    );
    // מעל התקרה השרת ידחה (413) — לכן חוסמים כבר כאן, עם הסבר
    const overweight = $derived(totalBytes > MAX_AD_TOTAL_BYTES);
    const canSend = $derived(Boolean(title.trim()) && !sending && !overweight);

    async function submit(e: SubmitEvent) {
        e.preventDefault();
        if (!canSend) return;
        sending = true;
        error = '';

        const body = {
            company_url: companyUrl,
            title,
            subtitle,
            hoverText,
            cta,
            gradientId: gradient,
            mainImage,
            logo,
            adStyle,
            mainImageFit,
            requestedDurationDays: durationDays,
            landing: {
                headline: headline || title,
                pitch,
                extended,
                image: landingImage,
                advantages,
                uniqueness,
                phone,
                whatsapp,
                website,
                email,
                address,
                hours,
                products,
            },
        };
        try {
            const res = await fetch(edit ? `/api/ads/${encodeURIComponent(edit.id)}` : '/api/ads/submit', {
                method: edit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const out = await res.json();
            if (!res.ok || !out.ok) {
                error = out.error ?? $_('advertise.r_err_send');
                if (out.login) goto(out.login);
                return;
            }
            goto(edit ? '/advertise/manage' : '/advertise/manage?sent=1');
        } catch {
            error = $_('advertise.r_err_network');
        } finally {
            sending = false;
        }
    }

    const inputCls =
        'w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-400/60 focus:outline-none';
    const labelCls = 'mb-1 block text-xs font-semibold text-gray-400';
</script>

<Seo title={$_('advertise.r_seo_title')} description={$_('advertise.r_seo_desc')} noindex />

<form onsubmit={submit} class="flex flex-col gap-4 py-4">
    <header>
        <h1 class="text-2xl font-black text-white sm:text-3xl">🎨 {$_('advertise.r_h1')}</h1>
        <p class="mt-1 text-sm text-gray-400">
            {#if edit}
                ✏️ {$_('advertise.r_editing', { values: { title: edit.title } })}
            {:else}
                {$_('advertise.r_hello', { values: { name: data.name } })}
            {/if}
        </p>
        {#if data.editMissing}
            <p class="mt-1 text-sm font-bold text-red-300">{$_('advertise.r_edit_missing')}</p>
        {/if}
    </header>

    <!-- שדה דבש -->
    <div aria-hidden="true" class="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0">
        <label>
            {$_('advertise.r_honeypot')}
            <input type="text" name="company_url" tabindex="-1" autocomplete="off" bind:value={companyUrl} />
        </label>
    </div>

    <!-- ========== עמודה כפולה: השלבים מימין, הדמו החי משמאל ========== -->
    <div class="builder-cols" style={adStyleVars(adStyle)}>
        <div class="builder-steps">

            <!-- =================== שלב 1: תמונה ראשית =================== -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <section bind:this={stepRefs.image} class="step-card" onclick={() => focusStep('image')} onfocusin={() => focusStep('image')}>
                <div class="step-head">
                    <span class="step-num">1</span>
                    <h2>{$_('advertise.b_s1_title')}</h2>
                    {#if activeStep === 'image'}<span class="tutorial-finger" aria-hidden="true">👇</span>{/if}
                </div>
                <p class="step-help">{$_('advertise.b_s1_help')}</p>

                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div class="tips-box">
                        <p class="tips-title">{$_('advertise.b_tips_title')}</p>
                        <ul class="tips-list">
                            <li>{$_('advertise.b_tip1')}</li>
                            <li>{$_('advertise.b_tip2')}</li>
                            <li>{$_('advertise.b_tip3')}</li>
                            <li>{$_('advertise.b_tip4')}</li>
                        </ul>
                    </div>

                    <label
                        class="upload-zone"
                        class:has-image={!!mainImage}
                        class:dragging={isDraggingMain}
                        ondragover={(e) => dragOver(e, (v) => (isDraggingMain = v))}
                        ondragleave={(e) => dragLeave(e, (v) => (isDraggingMain = v))}
                        ondrop={(e) => handleDrop(e, 'main', (v) => (isDraggingMain = v))}
                    >
                        {#if mainImage}
                            <img src={mainImage} alt={$_('advertise.b_main_image_alt')}
                                 style:object-fit="cover"
                                 style:object-position="{mainImageObjectX}% {mainImageObjectY}%"
                                 use:adImgFit={mainImageFit} />
                            <button type="button" class="remove-x" onclick={(e) => { e.preventDefault(); clearImage('main'); }} aria-label={$_('advertise.b_remove_image')}>✕</button>
                            <button type="button" class="crop-arrow crop-arrow-up" onclick={(e) => { e.preventDefault(); nudgeMainImage('up'); }} aria-label={$_('advertise.b_nudge_up')}>▲</button>
                            <button type="button" class="crop-arrow crop-arrow-down" onclick={(e) => { e.preventDefault(); nudgeMainImage('down'); }} aria-label={$_('advertise.b_nudge_down')}>▼</button>
                            <button type="button" class="crop-arrow crop-arrow-left" onclick={(e) => { e.preventDefault(); nudgeMainImage('left'); }} aria-label={$_('advertise.b_nudge_left')}>◀</button>
                            <button type="button" class="crop-arrow crop-arrow-right" onclick={(e) => { e.preventDefault(); nudgeMainImage('right'); }} aria-label={$_('advertise.b_nudge_right')}>▶</button>
                            <button type="button" class="crop-reset" onclick={(e) => { e.preventDefault(); mainImageObjectX = 50; mainImageObjectY = 50; mainImageZoom = 1; }} aria-label={$_('advertise.b_reset_pos')}>⊙</button>
                            <button type="button" class="crop-zoom zoom-in" onclick={(e) => { e.preventDefault(); zoomMainImage('in'); }} aria-label={$_('advertise.b_zoom_in')}>＋</button>
                            <button type="button" class="crop-zoom zoom-out" onclick={(e) => { e.preventDefault(); zoomMainImage('out'); }} aria-label={$_('advertise.b_zoom_out')}>－</button>
                        {:else}
                            <div class="upload-empty">
                                <div class="mb-2 text-4xl">📸</div>
                                <p class="upload-empty-main">
                                    {isDraggingMain ? $_('advertise.b_drop_here') : $_('advertise.b_click_or_drag')}
                                </p>
                                <p class="upload-empty-sub">{$_('advertise.b_upload_note')}</p>
                            </div>
                        {/if}
                        <input type="file" accept="image/png,image/jpeg,image/webp" onchange={(e) => handleImage(e, 'main')} class="hidden" />
                    </label>
                </div>
                {#if imageError === 'main'}
                    <p class="upload-err">{$_('advertise.b_err_image_read')}</p>
                {/if}
                {#if mainImage}
                    <p class="crop-hint">{$_('advertise.b_crop_hint')}</p>
                    <div class="step-nav-row">
                        <button type="button" class="step-nav-btn" onclick={() => advance('logo')}>
                            {$_('advertise.b_done_centering')}
                        </button>
                    </div>
                {/if}
            </section>

            <!-- =================== שלב 2: לוגו =================== -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <section bind:this={stepRefs.logo} class="step-card" onclick={() => focusStep('logo')} onfocusin={() => focusStep('logo')}>
                <div class="step-head">
                    <span class="step-num">2</span>
                    <h2>{$_('advertise.b_s2_title')}</h2>
                    {#if activeStep === 'logo'}<span class="tutorial-finger" aria-hidden="true">👇</span>{/if}
                </div>
                <p class="step-help">{$_('advertise.b_s2_help_pre')} <strong class="text-amber-300">{$_('advertise.b_s2_help_strong')}</strong> {$_('advertise.b_s2_help_post')}</p>

                <div class="flex flex-wrap items-center gap-3">
                    <div class="flex flex-col items-center gap-1">
                        <label
                            class="upload-zone-sm"
                            class:has-image={!!logo}
                            class:dragging={isDraggingLogo}
                            ondragover={(e) => dragOver(e, (v) => (isDraggingLogo = v))}
                            ondragleave={(e) => dragLeave(e, (v) => (isDraggingLogo = v))}
                            ondrop={(e) => handleDrop(e, 'logo', (v) => (isDraggingLogo = v))}
                        >
                            {#if logo}
                                <img src={logo} alt={$_('advertise.b_logo_alt')} />
                                <button type="button" class="remove-x" onclick={(e) => { e.preventDefault(); clearImage('logo'); }} aria-label={$_('advertise.b_remove_logo')}>✕</button>
                            {:else}
                                <div class="text-center">
                                    <div class="mb-1 text-2xl">{isDraggingLogo ? '✨' : '🏷️'}</div>
                                    <p class="upload-sm-text">{isDraggingLogo ? $_('advertise.b_release') : $_('advertise.b_upload_logo')}</p>
                                </div>
                            {/if}
                            <input type="file" accept="image/png,image/jpeg,image/webp" onchange={(e) => handleImage(e, 'logo')} class="hidden" />
                        </label>
                        {#if logo && logoShape === 'circle' && hasCircleCrop}
                            <button type="button" onclick={openCropper} class="edit-crop-link">
                                {$_('advertise.b_edit_crop')}
                            </button>
                        {/if}
                    </div>

                    {#if logo}
                        <div class="flex flex-row flex-wrap gap-2 self-center">
                            <div>
                                <p class="seg-label">{$_('advertise.b_crop_shape')}</p>
                                <div class="seg">
                                    <button type="button" onclick={chooseSquare} class="seg-btn" class:is-on={logoShape === 'square'}>
                                        {$_('advertise.b_square')}
                                    </button>
                                    <button type="button" onclick={chooseCircle} class="seg-btn" class:is-on={logoShape === 'circle'}>
                                        {$_('advertise.b_circle')}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <p class="seg-label">{$_('advertise.b_logo_pos')}</p>
                                <div class="seg">
                                    <button type="button" onclick={() => setLogoAnchor('right')} class="seg-btn" class:is-on={!logoFree && logoPosition === 'right'}>
                                        {$_('advertise.b_pos_right')}
                                    </button>
                                    <button type="button" onclick={() => setLogoAnchor('left')} class="seg-btn" class:is-on={!logoFree && logoPosition === 'left'}>
                                        {$_('advertise.b_pos_left')}
                                    </button>
                                    <button type="button" onclick={() => setLogoAnchor('cta')} class="seg-btn" class:is-on={!logoFree && logoPosition === 'cta'}>
                                        {$_('advertise.b_pos_bottom')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- מיקום חופשי: גוררים את הלוגו על הדמו החי לכל נקודה -->
                        <div class="mt-1 flex w-full flex-wrap items-center justify-between gap-2">
                            <p class="drag-hint">
                                <span aria-hidden="true">🖐️</span>
                                <span>{$_('advertise.b_logo_drag_hint')}</span>
                            </p>
                            {#if logoFree}
                                <span class="free-pos">
                                    <span class="free-pos-val">{logoFreeX}% · {logoFreeY}%</span>
                                    <button type="button" onclick={resetLogoPosition} class="free-pos-reset">
                                        {$_('advertise.b_logo_pos_reset')}
                                    </button>
                                </span>
                            {/if}
                        </div>
                    {/if}
                </div>
                {#if imageError === 'logo'}
                    <p class="upload-err">{$_('advertise.b_err_image_read')}</p>
                {/if}

                <div class="step-nav-row">
                    <button type="button" class="step-nav-btn" onclick={() => advance(prevOf('logo'))}>
                        {$_('advertise.b_prev_step')}
                    </button>
                    <button type="button" class="step-nav-btn" onclick={() => advance('title')}>
                        {logo ? $_('advertise.b_next_step') : $_('advertise.b_skip_step')}
                    </button>
                </div>

                <!-- ===== חיתוך עגול ללוגו ===== -->
                {#if cropOpen}
                    <div class="crop-modal-bg" role="dialog" aria-modal="true" aria-label={$_('advertise.b_crop_modal_aria')}>
                        <div class="crop-modal">
                            <div class="crop-modal-head">
                                <h3>{$_('advertise.b_crop_title')}</h3>
                                <button type="button" class="crop-modal-x" onclick={cancelCrop} aria-label={$_('advertise.close')}>✕</button>
                            </div>
                            <p class="crop-help">{$_('advertise.b_crop_help')}</p>
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <!-- משטח גרירה לחיתוך; אותה פעולה זמינה במקלדת דרך פס הזום -->
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

            <!-- =================== שלב 3: כותרת =================== -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <section bind:this={stepRefs.title} class="step-card" onclick={() => focusStep('title')} onfocusin={() => focusStep('title')}>
                <div class="step-head">
                    <span class="step-num">3</span>
                    <h2>{$_('advertise.b_s3_title')}</h2>
                    {#if activeStep === 'title'}<span class="tutorial-finger" aria-hidden="true">👇</span>{/if}

                    <!-- צבע הכותרת - בשורת הכותרת של השלב -->
                    <div class="title-color-rail" role="group" aria-label={$_('advertise.b_title_color_aria')}>
                        <span class="title-color-label">{$_('advertise.b_pick_title_color')}</span>
                        {#each titleColors as p (p.c)}
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

                <input type="text" bind:value={title} maxlength="40" required
                       onblur={() => title.trim() && commitField('title')}
                       placeholder={$_('advertise.b_s3_ph')}
                       class="text-input" />
                <div class="mt-2 flex items-center justify-end gap-2 text-xs text-gray-500">
                    <span>{title.length}/40</span>
                </div>

                <!-- הזזה אנכית של הכותרת על הבאנר -->
                <div class="mt-4">
                    <div class="mb-1.5 flex items-center justify-between">
                        <p class="slider-label">{$_('advertise.b_title_pos')} <span class="text-amber-300">{titleOffsetY > 0 ? `+${titleOffsetY}` : titleOffsetY}px</span></p>
                        <button type="button" onclick={() => (titleOffsetY = 0)} class="reset-link">{$_('advertise.b_reset_word')}</button>
                    </div>
                    <input type="range" min={TITLE_OFFSET_MIN} max={TITLE_OFFSET_MAX} step="1" bind:value={titleOffsetY}
                           class="w-full accent-amber-500" aria-label={$_('advertise.b_title_pos_aria')} />
                    <div class="slider-ends">
                        <span>{$_('advertise.b_up')}</span>
                        <span>{$_('advertise.b_down')}</span>
                    </div>
                </div>

                <div class="step-nav-row">
                    <button type="button" class="step-nav-btn" onclick={() => advance(prevOf('title'))}>
                        {$_('advertise.b_prev_step')}
                    </button>
                    {#if title}
                        <button type="button" class="step-nav-btn" onclick={() => commitField('title')}>
                            {$_('advertise.b_next_step')}
                        </button>
                    {/if}
                </div>
            </section>

            <!-- =================== שלב 4: צבע וגובה הרצועה =================== -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <section bind:this={stepRefs.gradient} class="step-card" onclick={() => focusStep('gradient')} onfocusin={() => focusStep('gradient')}>
                <div class="step-head">
                    <span class="step-num">4</span>
                    <h2>{$_('advertise.b_s4_title')}</h2>
                    {#if activeStep === 'gradient'}<span class="tutorial-finger" aria-hidden="true">👇</span>{/if}
                </div>
                <p class="step-help">{$_('advertise.b_s4_help')}</p>

                <!-- 22 הצבעים של הבילדר בקהילה בשכונה -->
                <div class="mt-3">
                    <p class="slider-label mb-2">{$_('advertise.b_band_color')}</p>
                    <div class="color-rail" role="group" aria-label={$_('advertise.b_band_color_aria')} style="margin-inline:auto">
                        {#each AD_GRADIENTS as p (p.id)}
                            <button type="button"
                                    onclick={() => (gradient = p.id)}
                                    class="color-dot bg-gradient-to-br {p.id}"
                                    class:selected={gradient === p.id}
                                    title={$_(`advertise.p_${p.key}`)}
                                    aria-label={$_(`advertise.p_${p.key}`)}
                                    aria-pressed={gradient === p.id}>
                            </button>
                        {/each}
                    </div>
                </div>

                <div class="mt-5">
                    <div class="mb-1.5 flex items-center justify-between">
                        <p class="slider-label">{$_('advertise.b_band_height')} <span class="text-amber-300">{diagHeight}%</span> {$_('advertise.b_of_image_height')}</p>
                    </div>
                    <input type="range" min={BAND_MIN} max={BAND_MAX} step="1" bind:value={diagHeight}
                           class="w-full accent-amber-500" aria-label={$_('advertise.b_band_height_aria')} />
                    <div class="slider-ends">
                        <span>{$_('advertise.b_band_low')}</span>
                        <span>{$_('advertise.b_band_high')}</span>
                    </div>
                </div>

                <div class="step-nav-row">
                    <button type="button" class="step-nav-btn" onclick={() => advance(prevOf('gradient'))}>
                        {$_('advertise.b_prev_step')}
                    </button>
                    <button type="button" class="step-nav-btn" onclick={() => advance('subtitle')}>
                        {$_('advertise.b_continue_next')}
                    </button>
                </div>
            </section>

            <!-- =================== שלב 5: כותרת משנה =================== -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <section bind:this={stepRefs.subtitle} class="step-card" onclick={() => focusStep('subtitle')} onfocusin={() => focusStep('subtitle')}>
                <div class="step-head">
                    <span class="step-num">5</span>
                    <h2>{$_('advertise.b_s5_title')}</h2>
                    {#if activeStep === 'subtitle'}<span class="tutorial-finger" aria-hidden="true">👇</span>{/if}
                </div>
                <p class="step-help">{$_('advertise.b_s5_help')}</p>

                <input type="text" bind:value={subtitle} maxlength="70"
                       onblur={() => subtitle.trim() && commitField('subtitle')}
                       placeholder={$_('advertise.b_s5_ph')}
                       class="text-input" />
                <div class="mt-2 text-end text-xs text-gray-500">{subtitle.length}/70</div>

                <!-- טיפוגרפיה של תת-הכותרת: נוסעת עם המודעה דרך adStyle -->
                <div class="sub-type-panel">
                    <p class="sub-type-title">{$_('advertise.b_s5_type_title')}</p>

                    <div class="sub-type-row">
                        <span class="sub-type-label">{$_('advertise.b_s5_size')}</span>
                        <input type="range" class="sub-type-range"
                               min={SUB_FONT_SIZE_MIN} max={SUB_FONT_SIZE_MAX} step="0.02"
                               bind:value={subFontSize} />
                        <span class="sub-type-value">{subFontSize.toFixed(2)}</span>
                    </div>

                    <div class="sub-type-row">
                        <span class="sub-type-label">{$_('advertise.b_s5_line_height')}</span>
                        <input type="range" class="sub-type-range"
                               min={SUB_LINE_HEIGHT_MIN} max={SUB_LINE_HEIGHT_MAX} step="0.05"
                               bind:value={subLineHeight} />
                        <span class="sub-type-value">{subLineHeight.toFixed(2)}</span>
                    </div>

                    <div class="sub-type-row">
                        <span class="sub-type-label">{$_('advertise.b_s5_align')}</span>
                        <div class="sub-type-aligns">
                            {#each [
                                { id: 'right', labelKey: 'b_s5_align_right', icon: '➡' },
                                { id: 'center', labelKey: 'b_s5_align_center', icon: '↔' },
                                { id: 'left', labelKey: 'b_s5_align_left', icon: '⬅' },
                                { id: 'justify', labelKey: 'b_s5_align_justify', icon: '☰' },
                            ] as opt (opt.id)}
                                <button type="button"
                                        onclick={() => (subAlign = opt.id as SubAlign)}
                                        title={$_(`advertise.${opt.labelKey}`)}
                                        aria-pressed={subAlign === opt.id}
                                        class="sub-type-align-btn"
                                        class:is-active={subAlign === opt.id}>
                                    <span aria-hidden="true">{opt.icon}</span>
                                    <span class="sub-type-align-text">{$_(`advertise.${opt.labelKey}`)}</span>
                                </button>
                            {/each}
                        </div>
                    </div>

                    <button type="button" class="sub-type-reset"
                            onclick={() => { subFontSize = DEFAULT_SUB_FONT_SIZE; subLineHeight = DEFAULT_SUB_LINE_HEIGHT; subAlign = 'right'; }}>
                        {$_('advertise.b_s5_type_reset')}
                    </button>
                </div>

                <div class="step-nav-row">
                    <button type="button" class="step-nav-btn" onclick={() => advance(prevOf('subtitle'))}>
                        {$_('advertise.b_prev_step')}
                    </button>
                    {#if subtitle}
                        <button type="button" class="step-nav-btn" onclick={() => commitField('subtitle')}>
                            {$_('advertise.b_next_step')}
                        </button>
                    {/if}
                </div>
            </section>

            <!-- =================== שלב 6: טקסט בריחוף + הכפתור =================== -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <section bind:this={stepRefs.hover} class="step-card" onclick={() => focusStep('hover')} onfocusin={() => focusStep('hover')}>
                <div class="step-head">
                    <span class="step-num">6</span>
                    <h2>{$_('advertise.b_s6_title')}</h2>
                    {#if activeStep === 'hover'}<span class="tutorial-finger" aria-hidden="true">👇</span>{/if}
                </div>
                <p class="step-help">
                    {$_('advertise.b_s6_help1')}
                    <br />
                    <strong class="text-amber-300">{$_('advertise.b_s6_help_strong')}</strong> {$_('advertise.b_s6_help2')}
                </p>

                <!-- התיבה גדלה לפי התוכן (autoGrow) -->
                <textarea bind:value={hoverText} maxlength="90" rows="3"
                          use:autoGrow={hoverText}
                          placeholder={$_('advertise.b_s6_ph')}
                          class="text-input hover-textarea"></textarea>
                <div class="mt-2 text-end text-xs text-gray-500">{hoverText.length}/90</div>

                {#if !shopCard}
                    <label class="mt-3 block">
                        <span class="field-label">{$_('advertise.r_cta_label')}</span>
                        <input type="text" bind:value={cta} maxlength="30" class="text-input" />
                    </label>
                {/if}

                <div class="step-nav-row">
                    <button type="button" class="step-nav-btn" onclick={() => advance(prevOf('hover'))}>
                        {$_('advertise.b_prev_step')}
                    </button>
                </div>
            </section>
        </div><!-- /.builder-steps -->

        <!-- ========== הדמו החי - קופץ לגובה השלב הפעיל ========== -->
        <aside class="builder-demo" aria-label={$_('advertise.b_demo_aria')} style:top="{demoTop}px">
            <div class="live-demo-card">
                <p class="live-demo-label">{$_('advertise.b_demo_label')}</p>
                <div class="live-demo-frame" dir="rtl">
                    <div class="ad-img-wrap live-demo-img-wrap" use:logoClearance={[title, subtitle, logo, logoFreeX, logoFreeY, logoPosition, diagHeight, titleOffsetY, subFontSize, subLineHeight, subAlign]}>
                        {#if mainImage}
                            <img src={mainImage} alt={title} class="ad-img"
                                 style:object-position="{mainImageObjectX}% {mainImageObjectY}%"
                                 style:opacity={activeStep === 'hover' ? 0 : 1}
                                 use:adImgFit={mainImageFit} />
                        {:else}
                            <div class="placeholder-dashed placeholder-img" style:opacity={activeStep === 'hover' ? 0 : 1}>
                                <div class="placeholder-icon">📸</div>
                                <p>{$_('advertise.b_main_image_alt')}</p>
                                <p class="placeholder-hint">{$_('advertise.b_step_n', { values: { n: 1 } })}</p>
                            </div>
                        {/if}
                        <div class="pro-diag bg-gradient-to-br {gradient}" style:opacity={activeStep === 'hover' ? 0 : 1}></div>
                        <div class="pro-title-top"
                             class:has-corner-logo-right={titleCornerSide === 'right'}
                             class:has-corner-logo-left={titleCornerSide === 'left'}
                             style:transform="translateY({titleOffsetY}px)" style:opacity={activeStep === 'hover' ? 0 : 1}>
                            {#if title}
                                <h3 class="pro-title" style:color={titleColor}><span class="logo-avoid" aria-hidden="true"></span>{title}</h3>
                            {:else}
                                <div class="placeholder-dashed placeholder-line">{$_('advertise.b_ph_title_step')}</div>
                            {/if}
                        </div>
                        <div class="pro-title-wrap" style:opacity={activeStep === 'hover' ? 0 : 1}>
                            {#if subtitle}
                                <p class="pro-sub"><span class="logo-avoid" data-anchor="bottom" aria-hidden="true"></span>{subtitle}</p>
                            {:else}
                                <div class="placeholder-dashed placeholder-line small">{$_('advertise.b_ph_slogan_step')}</div>
                            {/if}
                        </div>
                        {#if logo}
                            <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
                            <!-- הלוגו עצמו הוא ידית הגרירה; role=button + tabindex נותנים לו
                                 מקבילת מקלדת מלאה (חיצים מזיזים אותו) -->
                            <img src={logo} alt={$_('advertise.b_logo_alt')}
                                 data-ad-logo
                                 class="ad-logo ad-logo-draggable {logoShape === 'circle' ? 'ad-logo-circle' : ''} {logoFree ? 'ad-logo-free' : logoAnchorCls} {logoDragging ? 'ad-logo-dragging' : ''}"
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
                            <div class="placeholder-dashed placeholder-logo {logoPosition === 'left' ? 'logo-pos-left' : logoPosition === 'cta' ? 'logo-pos-cta' : 'logo-pos-right'}" style:opacity={activeStep === 'hover' ? 0 : 1}>{$_('advertise.b_logo_alt')}<br />{$_('advertise.b_step_n', { values: { n: 2 } })}</div>
                        {/if}
                        <div class="hover-overlay" style:opacity={activeStep === 'hover' ? 1 : 0}>
                            <h3 class="hover-title">{title || $_('advertise.b_ph_title_short')}</h3>
                            <p class="hover-text">{hoverText || $_('advertise.b_ph_hover')}</p>
                        </div>
                    </div>
                    <!-- כרטיס מוצר מהחנות - בלי רצועת המחיר, כמו בטור -->
                    {#if !shopCard && cta}
                        <div class="promo-cta bg-gradient-to-r {gradient}">
                            <p>{cta}</p>
                        </div>
                    {/if}
                </div>
            </div>
        </aside>
    </div><!-- /.builder-cols -->

    <!-- ========== דף הנחיתה (האתר הזה) ========== -->
    <section class="rounded-2xl border border-white/10 bg-slate-800/80 p-4">
        <h2 class="font-black text-white">{$_('advertise.r_landing_title')}</h2>
        <p class="mb-3 text-xs text-gray-500">{$_('advertise.r_landing_help')}</p>
        <div class="grid gap-3 sm:grid-cols-2">
            <label class="block sm:col-span-2">
                <span class={labelCls}>{$_('advertise.l_headline_label')}</span>
                <input bind:value={headline} maxlength="60" placeholder={$_('advertise.l_headline_ph')} class={inputCls} />
            </label>
            <label class="block sm:col-span-2">
                <span class={labelCls}>{$_('advertise.l_pitch_label')}</span>
                <textarea bind:value={pitch} rows="2" maxlength="400" placeholder={$_('advertise.l_pitch_ph')} class={inputCls}></textarea>
            </label>
            <label class="block sm:col-span-2">
                <span class={labelCls}>{$_('advertise.l_extended_label')}</span>
                <textarea bind:value={extended} rows="3" maxlength="2000" class={inputCls}></textarea>
            </label>
            <div class="sm:col-span-2">
                <span class={labelCls}>{$_('advertise.l_adv_label')}</span>
                <div class="grid gap-2 sm:grid-cols-3">
                    {#each [0, 1, 2] as i (i)}
                        <input bind:value={advantages[i]} maxlength="80" placeholder={$_(`advertise.l_adv${i + 1}_ph`)} aria-label={$_(`advertise.l_adv${i + 1}_ph`)} class={inputCls} />
                    {/each}
                </div>
            </div>
            <label class="block sm:col-span-2">
                <span class={labelCls}>{$_('advertise.l_s3_title')}</span>
                <textarea bind:value={uniqueness} rows="2" maxlength="500" class={inputCls}></textarea>
            </label>
            <div class="sm:col-span-2">
                <span class={labelCls}>{$_('advertise.l_image_label')}</span>
                <div class="flex flex-wrap items-center gap-3">
                    <label
                        class="upload-zone-sm"
                        class:has-image={!!landingImage}
                        class:dragging={isDraggingLanding}
                        ondragover={(e) => dragOver(e, (v) => (isDraggingLanding = v))}
                        ondragleave={(e) => dragLeave(e, (v) => (isDraggingLanding = v))}
                        ondrop={(e) => handleDrop(e, 'landing', (v) => (isDraggingLanding = v))}
                    >
                        {#if landingImage}
                            <img src={landingImage} alt={$_('advertise.l_image_alt')} />
                            <button type="button" class="remove-x" onclick={(e) => { e.preventDefault(); clearImage('landing'); }} aria-label={$_('advertise.b_remove_image')}>✕</button>
                        {:else}
                            <div class="text-center">
                                <div class="mb-1 text-2xl">🖼️</div>
                                <p class="upload-sm-text">{$_('advertise.l_upload_image')}</p>
                            </div>
                        {/if}
                        <input type="file" accept="image/png,image/jpeg,image/webp" onchange={(e) => handleImage(e, 'landing')} class="hidden" />
                    </label>
                    {#if imageError === 'landing'}
                        <p class="upload-err">{$_('advertise.b_err_image_read')}</p>
                    {/if}
                </div>
            </div>
            <label class="block">
                <span class={labelCls}>{$_('advertise.l_phone')}</span>
                <input bind:value={phone} maxlength="25" class={inputCls} />
            </label>
            <label class="block">
                <span class={labelCls}>{$_('advertise.l_whatsapp')}</span>
                <input bind:value={whatsapp} maxlength="25" class={inputCls} />
            </label>
            <label class="block">
                <span class={labelCls}>{$_('advertise.l_email')}</span>
                <input bind:value={email} type="email" maxlength="200" class={inputCls} />
            </label>
            <label class="block">
                <span class={labelCls}>{$_('advertise.l_website')}</span>
                <input bind:value={website} maxlength="400" placeholder="https://" class={inputCls} />
            </label>
            <label class="block">
                <span class={labelCls}>{$_('advertise.l_address_label')}</span>
                <input bind:value={address} maxlength="120" placeholder={$_('advertise.l_address_ph')} class={inputCls} />
            </label>
            <label class="block">
                <span class={labelCls}>{$_('advertise.l_hours_label')}</span>
                <input bind:value={hours} maxlength="120" placeholder={$_('advertise.l_hours_ph')} class={inputCls} />
            </label>
        </div>
    </section>

    {#if !edit}
        <section class="rounded-2xl border border-white/10 bg-slate-800/80 p-4">
            <h2 class="mb-3 font-black text-white">{$_('advertise.r_period_title')}</h2>
            <div class="flex flex-wrap gap-2">
                {#each data.plans as p (p.days)}
                    <button
                        type="button"
                        onclick={() => (durationDays = p.days)}
                        aria-pressed={durationDays === p.days}
                        class="cursor-pointer rounded-xl border px-4 py-2 text-sm font-bold transition-colors {durationDays ===
                        p.days
                            ? 'border-blue-400/50 bg-blue-500/20 text-blue-200'
                            : 'border-white/10 bg-slate-800/80 text-gray-300 hover:bg-white/10'}"
                    >{p.label} · ₪{p.price}</button>
                {/each}
            </div>
            <p class="mt-2 text-xs text-gray-500">{$_('advertise.r_period_note')}</p>
        </section>
    {/if}

    <p class="text-xs {overweight ? 'font-bold text-red-300' : 'text-gray-500'}">
        {$_('advertise.r_weight', { values: { cur: fmtKb(totalBytes), max: fmtKb(MAX_AD_TOTAL_BYTES) } })}
        {#if overweight}{$_('advertise.r_weight_over')}{/if}
    </p>

    {#if error}
        <p class="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
    {/if}

    <div class="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!canSend} class="btn-premium rounded-xl px-6 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
            {sending ? $_('advertise.sending') : edit ? $_('advertise.r_save') : $_('advertise.r_submit')}
        </button>
        <a href={edit ? '/advertise/manage' : '/advertise'} class="text-sm text-gray-400 hover:text-gray-200">{$_('advertise.r_cancel')}</a>
        {#if !title.trim()}
            <span class="text-xs text-amber-300">{$_('advertise.r_need_title')}</span>
        {/if}
    </div>
    {#if overweight}
        <p class="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-300">
            {$_('advertise.r_overweight', { values: { cur: fmtKb(totalBytes), max: fmtKb(MAX_AD_TOTAL_BYTES) } })}
        </p>
    {/if}
</form>

<style>
    /* ============== העתק של עיצוב הבילדר בקהילה בשכונה ============== */

    /* ---- כרטיסי השלבים ---- */
    .step-card {
        background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 1.25rem;
        padding: 1.25rem 1.25rem 1.5rem;
        margin-bottom: 1.25rem;
        scroll-margin-top: 8rem;
        position: relative;
    }
    /* מסגרת מקווקוות בצד שמאל של כל שלב - הדמו החי "נוחת" בתוכה */
    .builder-steps .step-card::before {
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
        .builder-steps .step-card::before { display: none; }
    }
    @media (min-width: 768px) {
        .step-card { padding: 1.75rem; margin-bottom: 1.75rem; }
    }
    .step-head {
        display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;
        color: rgb(229,231,235); font-weight: 900;
        flex-wrap: wrap;
    }
    .step-head h2 {
        font-size: 1.125rem; font-weight: 900; line-height: 1.3; margin: 0;
    }
    @media (min-width: 768px) {
        .step-head h2 { font-size: 1.5rem; }
    }
    .step-num {
        width: 2rem; height: 2rem; border-radius: 9999px;
        display: flex; align-items: center; justify-content: center;
        background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%);
        color: #000; font-weight: 900; font-size: 0.95rem;
        opacity: 0.85; flex-shrink: 0;
    }
    .step-help {
        color: rgb(156, 163, 175); font-size: 0.875rem; line-height: 1.55; margin: 0 0 1rem;
    }
    .step-nav-row {
        margin-top: 1.5rem;
        display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
        gap: 0.75rem;
    }
    .step-nav-btn {
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
    .step-nav-btn:hover {
        background: rgb(252, 191, 36);
        box-shadow: 0 6px 18px -4px rgba(245, 158, 11, 0.6);
    }
    .step-nav-btn:active { transform: scale(0.97); }

    @keyframes gentleHover {
        0%, 100% { transform: translateY(0) scale(1); }
        50%      { transform: translateY(-5px) scale(1.03); }
    }
    .tutorial-finger {
        display: inline-block;
        animation: gentleHover 2.6s ease-in-out infinite;
        font-size: 1.25rem;
        will-change: transform;
        filter: drop-shadow(0 0 5px rgba(245,158,11,0.45));
    }
    @media (prefers-reduced-motion: reduce) {
        .tutorial-finger { animation: none; }
    }

    /* ---- קלטים ---- */
    .text-input {
        width: 100%; padding: 0.75rem 1rem; border-radius: 0.75rem;
        background: rgba(255,255,255,0.04); border: 2px solid rgba(255,255,255,0.08);
        color: white; font-size: 0.95rem; font-weight: 500; outline: none;
        transition: border-color 0.15s, background 0.15s;
        font-family: inherit;
    }
    .hover-textarea { overflow-y: hidden; resize: none; min-height: 4.5rem; }
    .text-input::placeholder { color: rgb(107, 114, 128); }
    .text-input:focus {
        border-color: rgba(245, 158, 11, 0.6);
        background: rgba(255,255,255,0.06);
    }
    .field-label {
        display: block; color: rgb(209, 213, 219); font-weight: 700; font-size: 0.85rem;
        margin-bottom: 0.4rem;
    }
    .slider-label { color: rgb(209, 213, 219); font-weight: 700; font-size: 0.875rem; margin: 0; }
    .slider-ends {
        display: flex; justify-content: space-between;
        color: rgb(107, 114, 128); font-size: 11px; margin-top: 0.25rem;
    }
    .reset-link { color: rgb(156, 163, 175); font-size: 11px; text-decoration: underline; cursor: pointer; }
    .reset-link:hover { color: rgb(252, 211, 77); }

    /* ---- טיפים לתמונה ---- */
    .tips-box {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 1rem;
        padding: 1rem;
        color: rgb(209, 213, 219);
    }
    .tips-title { font-weight: 700; color: #fbbf24; margin: 0 0 0.75rem; font-size: 1rem; }
    .tips-list { display: flex; flex-direction: column; gap: 0.5rem; font-size: 13px; line-height: 1.625; margin: 0; padding: 0; list-style: none; }
    @media (min-width: 768px) {
        .tips-box { padding: 1.5rem; }
        .tips-title { font-size: 1.25rem; }
        .tips-list { gap: 0.75rem; font-size: 1.125rem; }
    }

    /* ---- אזורי העלאה ---- */
    .upload-zone {
        position: relative; display: flex; align-items: center; justify-content: center;
        min-height: 200px; border: 2px dashed rgba(245, 158, 11, 0.4);
        border-radius: 1rem; background: rgba(245, 158, 11, 0.04);
        cursor: pointer; transition: border-color 0.15s, background 0.15s;
        overflow: hidden;
    }
    .upload-zone:hover { border-color: rgba(245, 158, 11, 0.7); background: rgba(245, 158, 11, 0.08); }
    /* גובה קבוע כשיש תמונה: התמונה ממוקמת אבסולוטית (adImgFit) */
    .upload-zone.has-image { border-style: solid; padding: 0; height: 280px; }
    .upload-zone img { width: 100%; height: 100%; min-height: 200px; max-height: 280px; object-fit: cover; }
    .upload-empty { text-align: center; padding: 1rem; }
    .upload-empty-main { font-weight: 700; font-size: 1rem; color: white; margin: 0; }
    .upload-empty-sub { font-size: 0.75rem; color: rgb(156, 163, 175); margin: 0.25rem 0 0; }
    .upload-zone.dragging {
        border-color: rgb(34, 197, 94);
        background: rgba(34, 197, 94, 0.1);
        box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.18), 0 0 30px rgba(34, 197, 94, 0.25);
        transform: scale(1.01);
    }
    .upload-zone-sm {
        position: relative; display: flex; align-items: center; justify-content: center;
        width: 100px; height: 100px; flex-shrink: 0;
        border: 2px dashed rgba(245, 158, 11, 0.4); border-radius: 0.75rem;
        background: rgba(245, 158, 11, 0.04); cursor: pointer; overflow: hidden;
    }
    .upload-zone-sm.has-image { border-style: solid; padding: 0; }
    .upload-zone-sm img { width: 100%; height: 100%; object-fit: cover; }
    .upload-zone-sm.dragging {
        border-color: rgb(34, 197, 94);
        background: rgba(34, 197, 94, 0.12);
        box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.25);
        transform: scale(1.04);
    }
    .upload-sm-text { font-size: 0.75rem; font-weight: 700; color: rgb(209, 213, 219); margin: 0; }
    .upload-err { margin: 0.5rem 0 0; font-size: 0.75rem; color: rgb(252, 165, 165); }
    .remove-x {
        position: absolute; top: 0.4rem; left: 0.4rem; z-index: 5;
        width: 1.75rem; height: 1.75rem; border-radius: 9999px;
        background: rgba(0,0,0,0.65); color: white; border: 1px solid rgba(255,255,255,0.2);
        font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
    .remove-x:hover { background: rgba(220,38,38,0.85); }
    .edit-crop-link { font-size: 10px; color: rgb(252, 211, 77); text-decoration: underline; cursor: pointer; }

    /* ---- בורר צורה/מיקום הלוגו ---- */
    .seg-label { font-size: 0.75rem; font-weight: 700; color: rgb(156, 163, 175); margin: 0 0 0.25rem; }
    .seg {
        display: inline-flex; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1);
        background: rgba(0,0,0,0.2); padding: 0.25rem;
    }
    .seg-btn {
        padding: 0.25rem 0.625rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 700;
        color: rgb(209, 213, 219); cursor: pointer; transition: color 0.15s, background 0.15s;
    }
    .seg-btn:hover { color: white; }
    .seg-btn.is-on { background: rgb(245, 158, 11); color: #000; }
    .drag-hint {
        display: flex; align-items: center; gap: 0.25rem; margin: 0;
        font-size: 11px; font-weight: 700; color: rgba(252, 211, 77, 0.9);
    }
    .free-pos { display: flex; align-items: center; gap: 0.5rem; font-size: 11px; font-weight: 700; color: rgb(156, 163, 175); }
    .free-pos-val {
        border-radius: 0.375rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
        padding: 0.125rem 0.5rem; font-variant-numeric: tabular-nums;
    }
    .free-pos-reset {
        border-radius: 0.375rem; border: 1px solid rgba(255,255,255,0.15);
        padding: 0.125rem 0.5rem; color: rgb(252, 211, 77); cursor: pointer;
        transition: color 0.15s, border-color 0.15s;
    }
    .free-pos-reset:hover { color: rgb(253, 230, 138); border-color: rgba(251, 191, 36, 0.6); }

    /* ---- חיצי מיקום התמונה ---- */
    .crop-arrow {
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
    .crop-arrow:hover {
        background: rgba(245,158,11,0.85);
        color: black;
        transform: scale(1.12);
    }
    .crop-arrow-up    { top: 8px; left: 50%; transform: translateX(-50%); }
    .crop-arrow-down  { bottom: 8px; left: 50%; transform: translateX(-50%); }
    .crop-arrow-left  { left: 8px; top: 50%; transform: translateY(-50%); }
    .crop-arrow-right { right: 8px; top: 50%; transform: translateY(-50%); }
    .crop-arrow-up:hover    { transform: translateX(-50%) scale(1.12); }
    .crop-arrow-down:hover  { transform: translateX(-50%) scale(1.12); }
    .crop-arrow-left:hover  { transform: translateY(-50%) scale(1.12); }
    .crop-arrow-right:hover { transform: translateY(-50%) scale(1.12); }
    .crop-reset {
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
    .crop-reset:hover { background: rgba(245,158,11,0.85); color: black; transform: translate(-50%, -50%) scale(1.12); }
    .crop-zoom {
        position: absolute;
        background: rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.5);
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
    .crop-zoom:hover { background: rgba(245,158,11,0.85); color: black; transform: scale(1.12); }
    .crop-zoom.zoom-in  { bottom: 8px; right: 8px; }
    .crop-zoom.zoom-out { bottom: 8px; left: 8px; }
    .crop-hint {
        font-size: 0.75rem;
        color: rgb(156,163,175);
        margin-top: 0.6rem;
        text-align: center;
    }

    /* ---- חלון החיתוך העגול ---- */
    .crop-modal-bg {
        position: fixed; inset: 0; z-index: 999;
        background: rgba(0,0,0,0.75);
        display: flex; align-items: center; justify-content: center;
        padding: 1rem;
        backdrop-filter: blur(4px);
    }
    .crop-modal {
        background: #0f172a;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 1rem;
        padding: 1.1rem;
        max-width: 95vw;
        width: 380px;
        box-shadow: 0 25px 60px rgba(0,0,0,0.6);
        direction: rtl;
    }
    .crop-modal-head {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 0.4rem;
    }
    .crop-modal-head h3 {
        color: white; font-weight: 800; font-size: 1.05rem; margin: 0;
    }
    .crop-modal-x {
        background: transparent; border: none; color: rgba(255,255,255,0.7);
        font-size: 1.1rem; cursor: pointer; padding: 0.25rem 0.5rem;
        line-height: 1;
    }
    .crop-modal-x:hover { color: white; }
    .crop-help {
        color: rgba(255,255,255,0.7); font-size: 0.78rem; line-height: 1.4;
        margin: 0 0 0.7rem 0;
    }
    .crop-stage {
        position: relative;
        width: 100%; aspect-ratio: 1 / 1;
        background: #111;
        border-radius: 0.6rem;
        overflow: hidden;
        cursor: grab;
        touch-action: none;
        user-select: none;
    }
    .crop-stage:active { cursor: grabbing; }
    .crop-img {
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
    .crop-circle-mask {
        position: absolute; inset: 0;
        border-radius: 50%;
        box-shadow: 0 0 0 9999px rgba(0,0,0,0.55);
        pointer-events: none;
        border: 2px dashed rgba(255,255,255,0.55);
    }
    .crop-controls {
        display: flex; align-items: center; gap: 0.65rem;
        margin: 0.85rem 0 0.6rem 0;
    }
    .crop-zoom-label { color: rgba(255,255,255,0.85); font-size: 0.85rem; flex-shrink: 0; }
    .crop-zoom-slider { flex: 1; accent-color: #f59e0b; }
    .crop-zoom-val { color: rgba(255,255,255,0.7); font-size: 0.78rem; min-width: 3rem; text-align: left; }
    .crop-actions {
        display: flex; gap: 0.5rem; justify-content: flex-end;
    }
    .crop-btn-cancel {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        color: rgba(255,255,255,0.85);
        padding: 0.55rem 1rem; border-radius: 0.65rem;
        font-weight: 700; font-size: 0.85rem; cursor: pointer;
        transition: background 150ms;
    }
    .crop-btn-cancel:hover { background: rgba(255,255,255,0.12); }
    .crop-btn-confirm {
        background: linear-gradient(to right, #f59e0b, #ea580c);
        border: none; color: black;
        padding: 0.55rem 1.25rem; border-radius: 0.65rem;
        font-weight: 800; font-size: 0.9rem; cursor: pointer;
        transition: transform 150ms;
    }
    .crop-btn-confirm:hover { transform: translateY(-1px); }

    /* ---- צבע הכותרת ---- */
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

    /* ---- פלטת הרצועה ---- */
    .color-rail {
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
    .color-dot {
        width: 28px; height: 28px;
        border-radius: 9999px;
        border: 2px solid rgba(255,255,255,0.16);
        cursor: pointer;
        position: relative;
        padding: 0;
        transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
    }
    .color-dot:hover {
        transform: scale(1.18);
        border-color: rgba(255,255,255,0.7);
    }
    .color-dot.selected {
        transform: scale(1.25);
        border-color: white;
        box-shadow: 0 0 0 3px rgba(255,255,255,0.22), 0 4px 12px rgba(0,0,0,0.45);
    }
    @media (max-width: 640px) {
        .color-rail {
            grid-template-columns: repeat(auto-fit, 28px);
            grid-auto-rows: 28px;
            width: 100%;
            max-width: 100%;
            justify-content: center;
        }
    }

    /* ---- טיפוגרפיית תת-הכותרת ---- */
    .sub-type-panel {
        margin-top: 0.85rem;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 0.9rem;
        background: rgba(255,255,255,0.04);
        padding: 0.75rem 0.9rem;
        display: flex; flex-direction: column; gap: 0.6rem;
    }
    .sub-type-title {
        margin: 0; color: rgb(253,230,138); font-weight: 900; font-size: 0.85rem;
    }
    .sub-type-row {
        display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;
    }
    .sub-type-label {
        color: rgb(209,213,219); font-weight: 700; font-size: 0.78rem;
        min-width: 6.5rem;
    }
    .sub-type-range {
        flex: 1 1 8rem; min-width: 7rem; accent-color: rgb(245,158,11);
    }
    .sub-type-value {
        color: white; font-weight: 700; font-size: 0.75rem;
        min-width: 2.6rem; text-align: center;
        font-variant-numeric: tabular-nums;
    }
    .sub-type-aligns {
        display: flex; gap: 0.35rem; flex-wrap: wrap; flex: 1 1 auto;
    }
    .sub-type-align-btn {
        display: inline-flex; align-items: center; gap: 0.3rem;
        padding: 0.35rem 0.6rem; border-radius: 0.6rem; cursor: pointer;
        border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05);
        color: rgb(209,213,219); font-size: 0.72rem; font-weight: 700;
        transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .sub-type-align-btn:hover { color: white; background: rgba(255,255,255,0.10); }
    .sub-type-align-btn.is-active {
        background: rgb(245,158,11); border-color: rgb(245,158,11); color: black;
    }
    @media (max-width: 480px) {
        .sub-type-align-text { display: none; }
    }
    .sub-type-reset {
        align-self: flex-start; background: none; border: none; cursor: pointer;
        color: rgb(252,211,77); font-size: 0.72rem; font-weight: 700;
        text-decoration: underline; text-underline-offset: 2px; padding: 0;
    }

    /* ---- שתי העמודות + הדמו החי ---- */
    .builder-cols {
        position: relative;
        padding-left: 186px;       /* 170px דמו + 16px רווח בצד שמאל */
    }
    .builder-steps { width: 100%; }
    .builder-demo {
        position: absolute;
        top: 0;
        left: 0;
        width: 170px;
        transition: top 700ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    @media (max-width: 768px) {
        .builder-cols { padding-left: 0; }
        .builder-demo {
            position: static;
            width: 100%;
            /* גם בנייד התצוגה נשארת ברוחב האמיתי - משבצת רחבה יותר הייתה
               מראה שבירת שורות אחרת לגמרי ממה שיתפרסם */
            max-width: 170px;
            margin: 0 auto 1rem;
        }
    }
    .live-demo-card {
        background: rgba(0,0,0,0.35);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 0.85rem;
        padding: 0.7rem;
    }
    .live-demo-label {
        color: #fbbf24;
        font-size: 0.78rem;
        font-weight: 800;
        text-align: center;
        margin: 0 0 0.5rem;
    }
    /* 144px בדיוק - רוחב המשבצת בטור הימני (w-36) */
    .live-demo-frame {
        width: 144px;
        max-width: 100%;
        margin-inline: auto;
        border-radius: 0.55rem;
        overflow: hidden;
        background: #0f172a;
        box-shadow: 0 6px 20px rgba(0,0,0,0.4);
    }
    .live-demo-img-wrap {
        width: 100%;
        aspect-ratio: 144 / 450;   /* היחס של משבצת התמונה בטור */
    }
    .placeholder-dashed {
        border: 2px dashed rgba(255,255,255,0.35);
        background: rgba(255,255,255,0.04);
        color: rgba(255,255,255,0.55);
        font-weight: 700;
        text-align: center;
        border-radius: 0.4rem;
    }
    .placeholder-img {
        position: absolute; inset: 6px;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 0.3rem;
        font-size: 0.55rem;
    }
    .placeholder-img p { margin: 0; }
    .placeholder-img .placeholder-icon { font-size: 1.5rem; }
    .placeholder-img .placeholder-hint { color: rgba(251,191,36,0.7); font-size: 0.5rem; }
    .placeholder-line {
        font-size: 0.5rem;
        padding: 0.25rem 0.4rem;
        line-height: 1;
    }
    .placeholder-line.small { font-size: 0.45rem; }
    .placeholder-logo {
        position: absolute;
        top: 6px;
        width: 28px; height: 28px;
        border-radius: 0.3rem;
        font-size: 0.45rem;
        line-height: 1.05;
        display: flex; align-items: center; justify-content: center;
        z-index: 5;
    }
    .placeholder-logo.logo-pos-right { right: 6px; }
    .placeholder-logo.logo-pos-left  { left: 6px; }
    .placeholder-logo.logo-pos-cta   { top: auto; bottom: calc(100% - var(--diag-top-right, 78%) - 14px); right: 6px; }

    .ad-img-wrap { position: relative; overflow: hidden; }
    .ad-img {
        width: 100%; height: 100%; object-fit: cover;
        transition: opacity 1500ms ease;
    }
    /* ה-float שגורם לטקסט לעקוף את הלוגו - מוצג ומוצב רק ע"י logoClearance */
    .logo-avoid { display: none; }
    .ad-logo {
        position: absolute; top: 6px;
        width: 36px; height: 36px; border-radius: 6px;
        background: white; padding: 3px; object-fit: contain;
        z-index: 5;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    }
    .ad-logo-right { right: 6px; left: auto; }
    .ad-logo-left  { left: 6px;  right: auto; }
    .ad-logo-circle { border-radius: 50%; }
    /* הלוגו רוכב על הפינה הימנית של הרצועה; 18px = חצי מגובה הלוגו */
    .ad-logo-cta {
        top: auto;
        bottom: calc(100% - var(--diag-top-right, 78%) - 18px);
        right: 6px;
        left: auto;
    }
    .ad-logo-free { top: auto; bottom: auto; right: auto; left: auto; }
    .ad-logo-draggable {
        cursor: grab;
        touch-action: none;
        user-select: none;
        -webkit-user-drag: none;
    }
    .ad-logo-draggable:hover {
        outline: 2px dashed rgba(251, 191, 36, 0.9);
        outline-offset: 2px;
    }
    .ad-logo-draggable:focus-visible {
        outline: 2px solid #fbbf24;
        outline-offset: 2px;
    }
    .ad-logo-dragging {
        cursor: grabbing;
        outline: 2px solid #fbbf24;
        outline-offset: 2px;
        box-shadow: 0 6px 18px rgba(0,0,0,0.55);
    }
    .hover-overlay {
        position: absolute; inset: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 0.75rem; text-align: center; transition: opacity 1500ms ease;
        pointer-events: none;
        z-index: 4;
    }
    .hover-title { color: white; font-weight: 700; font-size: 0.95rem; margin: 0 0 0.4rem; }
    /* pre-line - ירידות שורה שהמפרסם הקליד נשמרות בתצוגה */
    .hover-text  { color: rgb(229,231,235); font-size: 0.7rem; line-height: 1.4; margin: 0 0 0.4rem; font-weight: 700; white-space: pre-line; }
    /* אותם מספרים של רצועת ה-CTA בטור (p-2.5 / 0.75rem / leading-tight) */
    .promo-cta { padding: 0.625rem; text-align: center; }
    .promo-cta p { color: white; font-weight: 700; font-size: 0.75rem; line-height: 1.25; margin: 0; }

    /* הרצועה האלכסונית - המשתנים --diag-top-* מגיעים מ-adStyleVars */
    .pro-diag {
        position: absolute; inset: 0;
        clip-path: polygon(
            0 var(--diag-top-left, 88%),
            100% var(--diag-top-right, 78%),
            100% 100%, 0 100%
        );
        opacity: 0.96;
        transition: opacity 1500ms ease, clip-path 280ms ease;
        pointer-events: none;
    }
    .pro-diag::after {
        content: "";
        position: absolute; inset: 0;
        background: linear-gradient(125deg, transparent 30%, rgba(255,255,255,0.18) 45%, transparent 60%);
        pointer-events: none;
    }
    .pro-title-wrap {
        position: absolute; left: 0; right: 0; bottom: 0;
        padding: 0.55rem 0.7rem 1.1rem;
        z-index: 4;
        text-align: var(--sub-align, right);
        transition: opacity 1500ms ease;
    }
    /* משולש בלתי-נראה: השורה הראשונה מתקצרת לפי שיפוע הרצועה */
    .pro-sub::before {
        content: '';
        display: var(--logo-avoid-tri, block);
        float: left;
        width: 28%;
        height: 1.35em;
        shape-outside: polygon(0 0, 100% 0, 0 100%);
        -webkit-shape-outside: polygon(0 0, 100% 0, 0 100%);
    }
    .pro-title-top {
        position: absolute; left: 0; right: 0; top: 0;
        padding: 0.55rem 0.7rem 0.85rem;
        z-index: 4;
        text-align: center;
        background: linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0) 100%);
        transition: opacity 1500ms ease;
        pointer-events: none;
    }
    .pro-title-top.has-corner-logo-right { padding-right: 46px; }
    .pro-title-top.has-corner-logo-left  { padding-left: 46px; }
    .pro-title {
        color: white; font-weight: 900;
        font-size: 1.15rem; line-height: 1.15;
        margin: 0;
        text-align: center;
        letter-spacing: 0.005em;
        text-shadow: 0 2px 10px rgba(0,0,0,0.85), 0 1px 2px rgba(0,0,0,0.95);
    }
    .pro-sub {
        color: rgba(255,255,255,0.95); font-weight: 600;
        font-size: var(--sub-size, 0.88rem); line-height: var(--sub-lh, 1.3); margin: 0;
        text-shadow: 0 1px 4px rgba(0,0,0,0.6);
    }
</style>
