<script lang="ts">
    // ============================================================
    // פרסומות מקומיות בנייד.
    //
    // המקבילה של הטור הימני, שמוסתר מתחת ל-xl. הקליק נוחת ב-/ads/<id>
    // באתר עצמו, כמו בדסקטופ.
    //
    // מה שלא נלקח מאתר המקור: פרסומת-ביניים במסך מלא ל-5 שניות בכל
    // לחיצה, בלי cooldown ובלי תקרה. באתר שבו גולש פותח עשרים מדורגים
    // ברצף זה עוין. כאן הפרסומת יושבת בזרימת הדף ונראית ביוזמת הגולש.
    // ============================================================
    import { onMount } from 'svelte';
    import { adSlots, loadApprovedAds } from '$lib/ads/adSlots.svelte';
    import { markAdSeen, trackAdClick } from '$lib/ads/adTrack';
    import { gradientCss, gradientInk } from '$lib/ads/gradients';

    let { limit = 2 }: { limit?: number } = $props();

    const ads = $derived(
        adSlots()
            .filter((s) => s.kind === 'real')
            .slice(0, limit)
            .map((s) => (s.kind === 'real' ? s.ad : null))
            .filter((a) => a !== null),
    );

    onMount(() => loadApprovedAds());

    $effect(() => {
        for (const ad of ads) markAdSeen(ad.id);
    });
</script>

{#if ads.length}
    <section class="xl:hidden" aria-label="תוכן שיווקי">
        <p class="mb-2 text-center text-[11px] font-bold tracking-widest text-amber-400/80 uppercase">
            תוכן שיווקי
        </p>
        <div class="flex flex-col gap-2">
            {#each ads as ad (ad.id)}
                <a
                    href="/ads/{ad.id}"
                    onclick={() => trackAdClick(ad.id)}
                    class="mob-ad flex items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-slate-800/80 p-2 transition-colors"
                >
                    {#if ad.mainImage}
                        <img
                            src={ad.mainImage}
                            alt=""
                            loading="lazy"
                            class="h-16 w-16 shrink-0 rounded-xl object-cover"
                        />
                    {:else}
                        <span
                            class="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-2xl"
                            style="background: {gradientCss(ad.gradientId)}"
                            aria-hidden="true">📢</span
                        >
                    {/if}

                    <span class="min-w-0 flex-1">
                        <span class="block truncate text-sm font-black text-white">{ad.title}</span>
                        {#if ad.subtitle}
                            <span class="block truncate text-xs text-gray-400">{ad.subtitle}</span>
                        {/if}
                        {#if ad.hoverText}
                            <span class="mt-0.5 block truncate text-[11px] text-amber-300/80">
                                {ad.hoverText}
                            </span>
                        {/if}
                    </span>

                    <span
                        class="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold"
                        style="background: {gradientCss(ad.gradientId)}; color: {gradientInk(ad.gradientId)}"
                    >{ad.cta}</span>
                </a>
            {/each}
        </div>
    </section>
{/if}

<style>
    /* Tailwind v4: group-hover שבור בפרויקט הזה — CSS מפורש */
    .mob-ad:hover {
        background: rgba(255, 255, 255, 0.09);
        border-color: rgba(251, 191, 36, 0.35);
    }
</style>
