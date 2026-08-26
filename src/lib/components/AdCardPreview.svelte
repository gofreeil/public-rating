<script lang="ts">
    // ============================================================
    // AdCardPreview — עותק סטטי של כרטיס הפרסומת מהטור הימני באתר
    // (RightAdBanner + AdCard), בלי קישור, בלי סבב ובלי דהיית-ריחוף.
    // משמש את מסך הניהול לתצוגה מקדימה: ריחוף על כותרת מודעה שעל
    // האוויר (דסקטופ) או הקשה עליה (נייד). אותם שדות ואותם עזרי עיצוב
    // של הכרטיס האמיתי — מה שרואים כאן הוא בדיוק מה שמוצג על האתר.
    // ============================================================
    import { gradientCss, gradientInk } from '$lib/ads/gradients';
    import { DEFAULT_CARD_STYLE, isLogoFree, type AdCardStyle } from '$lib/ads/types';

    interface PreviewAd {
        title: string;
        subtitle?: string;
        cta?: string;
        gradientId?: string;
        logo?: string;
        mainImage?: string;
        style?: Partial<AdCardStyle>;
    }

    let { ad }: { ad: PreviewAd } = $props();

    let s = $derived({ ...DEFAULT_CARD_STYLE, ...(ad.style ?? {}) });
    /** הלוגו יושב על נקודה שהמפרסם גרר אליה, ולא על עוגן למעלה/למטה */
    let logoFree = $derived(isLogoFree(s));
</script>

<!-- אותן מידות של הכרטיס האמיתי בטור: w-36 × h-[470px] -->
<div class="relative flex h-[470px] w-36 flex-col overflow-hidden rounded-2xl bg-gray-900 shadow-lg">
    <div class="relative flex-1 overflow-hidden bg-black/30">
        {#if ad.mainImage}
            <img
                src={ad.mainImage}
                alt=""
                draggable="false"
                loading="lazy"
                decoding="async"
                class="absolute inset-0 h-full w-full object-cover"
                style="transform: translate({s.image_x}%, {s.image_y}%) scale({s.image_zoom}); transform-origin: center"
            />
        {/if}

        {#if ad.logo}
            <img
                src={ad.logo}
                alt=""
                draggable="false"
                class="pointer-events-none absolute z-10 h-12 w-12 border-2 border-white/40 object-cover shadow-lg
                    {s.logo_shape === 'circle' ? 'rounded-full' : 'rounded-lg'}
                    {logoFree ? '' : s.logo_position === 'top' ? 'top-2 right-2' : 'bottom-16 right-2'}"
                style={logoFree
                    ? `left:${s.logo_x}%; top:${s.logo_y}%; right:auto; bottom:auto; transform:translate(-50%,-50%);`
                    : ''}
            />
        {/if}

        <!-- הפס האלכסוני — 0 מכבה אותו לגמרי -->
        {#if s.diag_height > 0}
            <div
                class="pointer-events-none absolute inset-x-0 bottom-0"
                style="height: {s.diag_height}%; background: {gradientCss(ad.gradientId)};
                       clip-path: polygon(0 35%, 100% 0, 100% 100%, 0 100%); opacity: 0.92"
            ></div>
        {/if}

        <div
            class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 pt-8 text-center"
            style="transform: translateY({s.title_offset_y}%)"
        >
            <span class="block text-sm leading-tight font-black" style="color: {s.title_color}">
                {ad.title || 'כותרת הפרסומת'}
            </span>
            {#if ad.subtitle}
                <span class="mt-0.5 block text-[11px] leading-tight text-gray-200">{ad.subtitle}</span>
            {/if}
        </div>
    </div>

    <div
        class="p-2.5 text-center"
        style="background: {gradientCss(ad.gradientId)}; color: {gradientInk(ad.gradientId)}"
    >
        <span class="text-xs leading-tight font-bold">{ad.cta || 'לפרטים'}</span>
    </div>
</div>
