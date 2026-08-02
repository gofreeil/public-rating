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
    } = $props();

    const s = $derived({ ...DEFAULT_CARD_STYLE, ...style });

    let frame = $state<HTMLElement>();
    let dragging = $state(false);
    let start = { px: 0, py: 0, x: 0, y: 0 };

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

<div class="ad-card relative flex h-full w-full flex-col overflow-hidden rounded-2xl shadow-lg" class:is-static={!editable}>
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
            <img
                src={logo}
                alt=""
                draggable="false"
                class="pointer-events-none absolute z-10 h-12 w-12 border-2 border-white/40 object-cover shadow-lg
                    {s.logo_shape === 'circle' ? 'rounded-full' : 'rounded-lg'}
                    {s.logo_position === 'top' ? 'top-2' : 'bottom-16'} right-2"
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
            class="ad-caption pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 pt-8 text-center"
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

    /* Tailwind v4: group-hover שבור בפרויקט הזה — CSS מפורש */
    .ad-hover {
        opacity: 0;
        transition: opacity 700ms ease;
    }
    .ad-card.is-static:hover .ad-hover {
        opacity: 1;
    }
    .ad-photo,
    .ad-caption {
        transition: opacity 700ms ease;
    }
    .ad-card.is-static:hover .ad-photo,
    .ad-card.is-static:hover .ad-caption {
        opacity: 0;
    }

    @media (prefers-reduced-motion: reduce) {
        .ad-hover,
        .ad-photo,
        .ad-caption {
            transition-duration: 1ms;
        }
    }
</style>
