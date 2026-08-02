<script lang="ts">
    // ============================================================
    // הטור הימני — מודעות מקומיות ומשבצות פנויות.
    //
    // מודעה בתשלום מובילה ל-/ads/<id> באתר עצמו ולא לאתר של המפרסם.
    // זה בדיוק ההבדל שבגללו הפלטפורמה נבנתה. משבצת פנויה מובילה
    // ל-/advertise, שמוכר את המקומות של האתר הזה בלבד.
    // ============================================================
    import { onMount } from 'svelte';
    import { adSlots, loadApprovedAds } from '$lib/ads/adSlots.svelte';
    import { gradientCss, gradientInk } from '$lib/ads/gradients';

    const PER_VIEW = 4; // כמה משבצות נראות בטור בו-זמנית
    const VIEW_MS = 14000; // כמה זמן כל קבוצה נשארת על המסך
    const FADE_MS = 900; // אורך הדעיכה בין קבוצה לקבוצה

    let rotation = $state(0);
    let fading = $state(false);

    const slots = $derived(adSlots());

    // הסבב אינסופי. קודם הייתה כאן תקרת החלפות (MAX_SWAPS) שעצרה את
    // הטור על קבוצה אחת אחרי שלושה מחזורים, כך שרוב המשבצות לא קיבלו במה.
    const displayed = $derived.by(() => {
        if (slots.length <= PER_VIEW) return slots;
        const start = (rotation * PER_VIEW) % slots.length;
        return Array.from({ length: PER_VIEW }, (_, i) => slots[(start + i) % slots.length]);
    });

    onMount(() => {
        loadApprovedAds();
        let fadeTimer: ReturnType<typeof setTimeout> | undefined;
        // דעיכה החוצה → החלפה בזמן שהטור שקוף → דעיכה פנימה, בלי קפיצה
        const interval = setInterval(() => {
            if (slots.length <= PER_VIEW) return;
            fading = true;
            fadeTimer = setTimeout(() => {
                rotation++;
                fading = false;
            }, FADE_MS);
        }, VIEW_MS);

        return () => {
            clearInterval(interval);
            clearTimeout(fadeTimer);
        };
    });
</script>

<aside aria-label="פרסומות" class="relative hidden h-fit w-36 flex-shrink-0 pb-8 text-center xl:block">
    <h4 class="mb-2 px-2 text-xs font-bold tracking-widest text-amber-400 uppercase">
        תוכן שיווקי
    </h4>

    <div class="ads-track space-y-3" class:fading>
        {#each displayed as item (item.kind === 'real' ? item.ad.id : `v${item.no}`)}
            {#if item.kind === 'real'}
                <!-- מודעה בתשלום — הקליק נשאר באתר ונוחת בדף הנחיתה המקומי -->
                <a
                    href="/ads/{item.ad.id}"
                    aria-label="{item.ad.title} — {item.ad.subtitle}"
                    class="ad-card relative flex h-[470px] flex-col overflow-hidden rounded-2xl shadow-lg"
                >
                    <span class="relative flex-1 overflow-hidden bg-black/30">
                        {#if item.ad.mainImage}
                            <img
                                src={item.ad.mainImage}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                class="ad-photo absolute inset-0 h-full w-full object-cover"
                            />
                        {/if}

                        <span class="ad-caption absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 pt-8 text-center">
                            <span class="block text-sm leading-tight font-black text-white">{item.ad.title}</span>
                            {#if item.ad.subtitle}
                                <span class="mt-0.5 block text-[11px] leading-tight text-gray-200">
                                    {item.ad.subtitle}
                                </span>
                            {/if}
                        </span>

                        <!-- שכבת הריחוף: טקסט המכירה שהמפרסם כתב -->
                        <span class="ad-hover absolute inset-0 flex items-center justify-center bg-black/70 p-3 text-center backdrop-blur-sm">
                            <span>
                                <span class="mb-1 block text-sm leading-tight font-black text-white">
                                    {item.ad.title}
                                </span>
                                {#if item.ad.subtitle}
                                    <span class="block text-[11px] leading-tight text-gray-200">
                                        {item.ad.subtitle}
                                    </span>
                                {/if}
                                {#if item.ad.hoverText}
                                    <span class="mt-2 block border-t border-white/20 pt-2 text-[11px] leading-snug font-bold text-amber-200">
                                        {item.ad.hoverText}
                                    </span>
                                {/if}
                            </span>
                        </span>
                    </span>

                    <!-- הגרדיאנט מגיע מרשימה סגורה, לא ממחרוזת CSS של המפרסם -->
                    <span
                        class="p-2.5 text-center"
                        style="background: {gradientCss(item.ad.gradientId)}; color: {gradientInk(item.ad.gradientId)}"
                    >
                        <span class="text-xs leading-tight font-bold">{item.ad.cta}</span>
                    </span>
                </a>
            {:else}
                {@const ad = item.slot}
                <a
                    href="/advertise"
                    aria-label="{ad.text} — {ad.description}: לפרטים על פרסום באתר"
                    class="vacant-card relative flex h-[470px] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed p-3 text-center transition-all duration-700 {ad.borderColor} {ad.bgColor} {ad.hoverBorder} {ad.hoverBg}"
                >
                    <span class="absolute top-3 right-3 rounded-full border border-white/5 bg-white/10 px-3 py-1 text-sm font-black text-white/60 shadow-sm backdrop-blur-sm">
                        {item.no}
                    </span>

                    <span class="relative flex h-full w-full flex-col items-center justify-between overflow-hidden py-6">
                        <span class="vacant-icon z-10 mt-4 text-3xl">📢</span>

                        <span class="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <span class="flex origin-center -rotate-90 transform items-center gap-3 whitespace-nowrap">
                                <span class="text-2xl font-black tracking-wider drop-shadow-sm {ad.textColor}">
                                    {ad.text} זה
                                </span>
                                <span class="text-base font-bold opacity-90 drop-shadow-sm {ad.textColor}">
                                    - {ad.description}
                                </span>
                            </span>
                        </span>

                        <span class="z-10 mb-4 rounded-full px-5 py-2 text-sm font-bold text-white shadow-xl {ad.buttonColor}">
                            לפרטים
                        </span>
                    </span>
                </a>
            {/if}
        {/each}
    </div>
</aside>

<style>
    /* דעיכה רכה בין קבוצות המודעות — הערך חייב להתאים ל-FADE_MS שבסקריפט */
    .ads-track {
        opacity: 1;
        transition: opacity 900ms ease-in-out;
    }
    .ads-track.fading {
        opacity: 0;
    }

    /* Tailwind v4: group-hover שבור בפרויקט הזה — CSS מפורש */
    .ad-card {
        transition: transform 200ms ease;
    }
    .ad-card:hover {
        transform: scale(1.04);
    }
    .ad-hover {
        opacity: 0;
        transition: opacity 700ms ease;
    }
    .ad-card:hover .ad-hover,
    .ad-card:focus-visible .ad-hover {
        opacity: 1;
    }
    .ad-photo,
    .ad-caption {
        transition: opacity 700ms ease;
    }
    .ad-card:hover .ad-photo,
    .ad-card:hover .ad-caption {
        opacity: 0;
    }
    .vacant-icon {
        transition: transform 300ms ease;
    }
    .vacant-card:hover .vacant-icon {
        transform: scale(1.25);
    }

    @media (prefers-reduced-motion: reduce) {
        .ads-track,
        .ad-card,
        .ad-hover,
        .ad-photo,
        .ad-caption,
        .vacant-icon {
            transition-duration: 1ms;
        }
    }
</style>
