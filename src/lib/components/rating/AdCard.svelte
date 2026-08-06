<script lang="ts">
    // ============================================================
    // כרטיס הפרסומת — מרנדר יחיד לטור הימני ולתצוגה המקדימה בבילדר.
    //
    // זו הנקודה החשובה בעורך WYSIWYG: אם התצוגה המקדימה והכרטיס האמיתי
    // הם שני קטעי קוד, הם ייפרדו — והמפרסם יעצב דבר אחד ויקבל אחר.
    //
    // במצב editable התמונה נגררת בתוך המסגרת. הגרירה במצביע (Pointer
    // Events) ולא במגע/עכבר בנפרד, כך שאותו קוד עובד באצבע, בעכבר
    // ובעט — ו-touch-action:none מונע מהדף לגלול תוך כדי גרירה בנייד.
    // ============================================================
    import { gradientCss, gradientInk } from '$lib/ads/gradients';
    import { DEFAULT_CARD_STYLE, type AdCardStyle } from '$lib/ads/types';

    let {
        title = '',
        subtitle = '',
        hoverText = '',
        cta = 'לפרטים',
        gradientId = 'amber',
        mainImage = '',
        logo = '',
        style = {},
        editable = false,
        onmove = undefined,
        onlogomove = undefined,
    }: {
        title?: string;
        subtitle?: string;
        hoverText?: string;
        cta?: string;
        gradientId?: string;
        mainImage?: string;
        logo?: string;
        style?: Partial<AdCardStyle>;
        /** מצב עריכה — גרירת התמונה בתוך המסגרת */
        editable?: boolean;
        onmove?: (next: { image_x: number; image_y: number }) => void;
        /** גרירת הלוגו עצמו לנקודה חופשית בכרטיס (מצב עריכה בלבד) */
        onlogomove?: (next: { logo_x: number; logo_y: number }) => void;
    } = $props();

    const s = $derived({ ...DEFAULT_CARD_STYLE, ...style });
    /** הלוגו יושב על נקודה שהמפרסם גרר אליה, ולא על עוגן למעלה/למטה */
    const logoFree = $derived(typeof s.logo_x === 'number' && typeof s.logo_y === 'number');

    let frame = $state<HTMLElement>();
    let dragging = $state(false);
    let start = { px: 0, py: 0, x: 0, y: 0 };

    // ---- גרירת הלוגו ----
    // נפרדת מגרירת התמונה: הלוגו הוא המטרה הקטנה, ולכן הוא תופס את
    // המצביע לעצמו (stopPropagation) כדי שגרירה עליו לא תזיז את התמונה.
    let logoDragging = $state(false);

    /** מרכז הלוגו באחוזי המסגרת, תחום כך שלא יברח מהכרטיס */
    function commitLogo(clientX: number, clientY: number, el: HTMLElement) {
        if (!frame) return;
        const fr = frame.getBoundingClientRect();
        const lr = el.getBoundingClientRect();
        if (!fr.width || !fr.height) return;
        const halfX = (lr.width / 2 / fr.width) * 100;
        const halfY = (lr.height / 2 / fr.height) * 100;
        const x = ((clientX - fr.left) / fr.width) * 100;
        const y = ((clientY - fr.top) / fr.height) * 100;
        onlogomove?.({
            logo_x: Math.round(Math.max(halfX, Math.min(100 - halfX, x)) * 10) / 10,
            logo_y: Math.round(Math.max(halfY, Math.min(100 - halfY, y)) * 10) / 10,
        });
    }

    function onLogoPointerDown(e: PointerEvent) {
        if (!editable || !onlogomove) return;
        e.preventDefault();
        e.stopPropagation();
        const el = e.currentTarget as HTMLElement;
        el.setPointerCapture(e.pointerId);
        logoDragging = true;
        commitLogo(e.clientX, e.clientY, el);
    }

    function onLogoPointerMove(e: PointerEvent) {
        if (!logoDragging) return;
        e.stopPropagation();
        commitLogo(e.clientX, e.clientY, e.currentTarget as HTMLElement);
    }

    function endLogoDrag(e: PointerEvent) {
        if (!logoDragging) return;
        logoDragging = false;
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
            /* המצביע כבר שוחרר */
        }
    }

    /** מקבילת מקלדת לגרירה: חיצים מזיזים 1% מהכרטיס, עם Shift — 5% */
    function onLogoKeyDown(e: KeyboardEvent) {
        if (!editable || !onlogomove || !frame) return;
        const dirs: Record<string, [number, number]> = {
            ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
        };
        const dir = dirs[e.key];
        if (!dir) return;
        e.preventDefault();
        const el = e.currentTarget as HTMLElement;
        const fr = frame.getBoundingClientRect();
        const lr = el.getBoundingClientRect();
        const step = e.shiftKey ? 5 : 1;
        // נקודת המוצא: המיקום הנוכחי בפועל, גם כשהלוגו עדיין על העוגן
        const curX = ((lr.left - fr.left + lr.width / 2) / fr.width) * 100;
        const curY = ((lr.top - fr.top + lr.height / 2) / fr.height) * 100;
        commitLogo(
            fr.left + ((curX + dir[0] * step) / 100) * fr.width,
            fr.top + ((curY + dir[1] * step) / 100) * fr.height,
            el,
        );
    }

    function onPointerDown(e: PointerEvent) {
        if (!editable || !mainImage) return;
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        dragging = true;
        start = { px: e.clientX, py: e.clientY, x: s.image_x, y: s.image_y };
    }

    function onPointerMove(e: PointerEvent) {
        if (!dragging || !frame) return;
        const rect = frame.getBoundingClientRect();
        // ההזזה באחוזים מגודל המסגרת — כך הגרירה מרגישה זהה בכל גודל תצוגה
        const dx = ((e.clientX - start.px) / rect.width) * 100;
        const dy = ((e.clientY - start.py) / rect.height) * 100;
        onmove?.({
            image_x: Math.max(-50, Math.min(50, start.x + dx)),
            image_y: Math.max(-50, Math.min(50, start.y + dy)),
        });
    }

    function endDrag(e: PointerEvent) {
        if (!dragging) return;
        dragging = false;
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
            /* המצביע כבר שוחרר */
        }
    }
</script>

<div class="promo-card relative flex h-full w-full flex-col overflow-hidden rounded-2xl shadow-lg" class:is-static={!editable}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        bind:this={frame}
        class="relative flex-1 overflow-hidden bg-black/30"
        class:draggable={editable && mainImage}
        class:dragging
        onpointerdown={onPointerDown}
        onpointermove={onPointerMove}
        onpointerup={endDrag}
        onpointercancel={endDrag}
    >
        {#if mainImage}
            <img
                src={mainImage}
                alt=""
                draggable="false"
                loading="lazy"
                decoding="async"
                class="ad-photo absolute inset-0 h-full w-full object-cover"
                style="transform: translate({s.image_x}%, {s.image_y}%) scale({s.image_zoom}); transform-origin: center"
            />
        {/if}

        {#if logo}
            <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
            <!-- במצב עריכה הלוגו עצמו הוא ידית הגרירה: אפשר להניח אותו בכל
                 נקודה בכרטיס, ולא רק למעלה/למטה בצד ימין. role=button
                 ו-tabindex נותנים לו מקבילת מקלדת מלאה (חיצים מזיזים). -->
            <img
                src={logo}
                alt=""
                draggable="false"
                class="absolute z-10 h-12 w-12 border-2 border-white/40 object-cover shadow-lg
                    {s.logo_shape === 'circle' ? 'rounded-full' : 'rounded-lg'}
                    {logoFree ? '' : s.logo_position === 'top' ? 'top-2 right-2' : 'bottom-16 right-2'}
                    {editable && onlogomove ? 'logo-draggable' : 'pointer-events-none'}
                    {logoDragging ? 'logo-dragging' : ''}"
                style={logoFree
                    ? `left:${s.logo_x}%; top:${s.logo_y}%; right:auto; bottom:auto; transform:translate(-50%,-50%);`
                    : ''}
                role={editable && onlogomove ? 'button' : undefined}
                tabindex={editable && onlogomove ? 0 : undefined}
                aria-label={editable && onlogomove ? 'לוגו — אפשר לגרור אותו למקום אחר בכרטיס' : undefined}
                onpointerdown={onLogoPointerDown}
                onpointermove={onLogoPointerMove}
                onpointerup={endLogoDrag}
                onpointercancel={endLogoDrag}
                onkeydown={onLogoKeyDown}
            />
        {/if}

        <!-- הפס האלכסוני — 0 מכבה אותו לגמרי -->
        {#if s.diag_height > 0}
            <div
                class="pointer-events-none absolute inset-x-0 bottom-0"
                style="height: {s.diag_height}%; background: {gradientCss(gradientId)};
                       clip-path: polygon(0 35%, 100% 0, 100% 100%, 0 100%); opacity: 0.92"
            ></div>
        {/if}

        <div
            class="promo-caption pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 pt-8 text-center"
            style="transform: translateY({s.title_offset_y}%)"
        >
            <span class="block text-sm leading-tight font-black" style="color: {s.title_color}">
                {title || 'כותרת הפרסומת'}
            </span>
            {#if subtitle}
                <span class="mt-0.5 block text-[11px] leading-tight text-gray-200">{subtitle}</span>
            {/if}
        </div>

        <!-- שכבת הריחוף קיימת רק בכרטיס החי; בעורך היא הייתה מסתירה את התמונה -->
        {#if !editable}
            <div class="ad-hover pointer-events-none absolute inset-0 flex items-center justify-center bg-black/70 p-3 text-center backdrop-blur-sm">
                <div>
                    <span class="mb-1 block text-sm leading-tight font-black text-white">{title}</span>
                    {#if subtitle}
                        <span class="block text-[11px] leading-tight text-gray-200">{subtitle}</span>
                    {/if}
                    {#if hoverText}
                        <span class="mt-2 block border-t border-white/20 pt-2 text-[11px] leading-snug font-bold text-amber-200">
                            {hoverText}
                        </span>
                    {/if}
                </div>
            </div>
        {/if}
    </div>

    <div
        class="p-2.5 text-center"
        style="background: {gradientCss(gradientId)}; color: {gradientInk(gradientId)}"
    >
        <span class="text-xs leading-tight font-bold">{cta || 'לפרטים'}</span>
    </div>
</div>

<style>
    .draggable {
        cursor: grab;
        /* בלי זה הדף גולל תחת האצבע במקום שהתמונה תזוז */
        touch-action: none;
    }
    .draggable.dragging {
        cursor: grabbing;
    }

    /* הלוגו כידית גרירה: סמן יד וטבעת מקווקוות בריחוף/פוקוס, כדי
       שיהיה ברור שאפשר להזיז אותו. touch-action:none הוא מה שמאפשר
       גרירה באצבע במקום גלילת הדף. */
    .logo-draggable {
        cursor: grab;
        touch-action: none;
        user-select: none;
        -webkit-user-drag: none;
    }
    .logo-draggable:hover {
        outline: 2px dashed rgba(251, 191, 36, 0.9);
        outline-offset: 2px;
    }
    .logo-draggable:focus-visible {
        outline: 2px solid #fbbf24;
        outline-offset: 2px;
    }
    .logo-draggable.logo-dragging {
        cursor: grabbing;
        outline: 2px solid #fbbf24;
        outline-offset: 2px;
    }

    /* Tailwind v4: group-hover שבור בפרויקט הזה — CSS מפורש */
    .ad-hover {
        opacity: 0;
        transition: opacity 700ms ease;
    }
    .promo-card.is-static:hover .ad-hover {
        opacity: 1;
    }
    .ad-photo,
    .promo-caption {
        transition: opacity 700ms ease;
    }
    .promo-card.is-static:hover .ad-photo,
    .promo-card.is-static:hover .promo-caption {
        opacity: 0;
    }

    @media (prefers-reduced-motion: reduce) {
        .ad-hover,
        .ad-photo,
        .promo-caption {
            transition-duration: 1ms;
        }
    }
</style>
