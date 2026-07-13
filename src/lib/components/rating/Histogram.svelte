<script lang="ts">
    // היסטוגרמת התפלגות דירוגים 5★→1★ — קומפקטית, בסגנון Trustpilot
    let {
        distribution = [0, 0, 0, 0, 0],
        count = 0,
    }: { distribution: [number, number, number, number, number]; count: number } = $props();

    const max = $derived(Math.max(...distribution, 1));
    const rows = $derived(
        [5, 4, 3, 2, 1].map((star) => {
            const n = distribution[star - 1] ?? 0;
            return {
                star,
                n,
                // רוחב יחסי לעמודה הגבוהה ביותר; מינימום 2% נראות כשיש דירוגים
                pct: n > 0 ? Math.max(2, (n / max) * 100) : 0,
                share: count > 0 ? Math.round((n / count) * 100) : 0,
            };
        }),
    );
</script>

<div class="flex flex-col gap-0.5" role="img" aria-label="התפלגות {count} דירוגים לפי כוכבים">
    {#each rows as row (row.star)}
        <div class="flex items-center gap-2" style="height:22px" title="{row.n} דירוגים של {row.star} כוכבים ({row.share}%)">
            <span class="w-3 text-center text-xs text-gray-400 tabular-nums">{row.star}</span>
            <span class="text-[10px] leading-none text-amber-400/70" aria-hidden="true">★</span>
            <div class="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div class="histo-bar h-full rounded-full bg-amber-400" style="width:{row.pct}%"></div>
            </div>
            <span class="w-6 text-xs text-gray-500 tabular-nums">{row.n}</span>
        </div>
    {/each}
</div>

<style>
    .histo-bar {
        transition: width 0.5s ease;
    }
</style>
