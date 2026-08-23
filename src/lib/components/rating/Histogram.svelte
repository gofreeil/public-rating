<script lang="ts">
    // היסטוגרמת התפלגות דירוגים 5★→1★ — קומפקטית, בסגנון Trustpilot.
    // כשמועבר onselect כל שורה הופכת למסנן: לחיצה על "5★" מציגה רק את
    // הדירוגים בני 5 הכוכבים, כמו באתרי הדירוג הגדולים.
    let {
        distribution = [0, 0, 0, 0, 0],
        count = 0,
        selected = null,
        onselect = undefined,
    }: {
        distribution: [number, number, number, number, number];
        count: number;
        selected?: number | null;
        onselect?: (star: number | null) => void;
    } = $props();

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

    function rowLabel(r: { star: number; n: number; share: number }): string {
        return `${r.n} ${r.n === 1 ? 'דירוג' : 'דירוגים'} של ${r.star} כוכבים, ${r.share}%`;
    }

    function toggle(star: number, n: number) {
        if (!onselect || n === 0) return;
        onselect(selected === star ? null : star);
    }
</script>

<!--
  לא role="img": עטיפה כזו מסתירה מקוראי מסך את כל המספרים שבתוכה,
  וכל הפירוט מתקפל למחרוזת סיכום אחת.
-->
{#snippet rowBody(row: { star: number; n: number; pct: number; share: number })}
    <span class="sr-only">{rowLabel(row)}</span>
    <span aria-hidden="true" class="w-3 text-center text-xs text-gray-400 tabular-nums">{row.star}</span>
    <span aria-hidden="true" class="text-[10px] leading-none text-amber-400/70">★</span>
    <span aria-hidden="true" class="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
        <span
            class="histo-bar block h-full rounded-full {selected === row.star ? 'bg-amber-300' : 'bg-amber-400'}"
            style="width:{row.pct}%"
        ></span>
    </span>
    <span aria-hidden="true" class="w-6 text-xs text-gray-500 tabular-nums">{row.n}</span>
    <span aria-hidden="true" class="hidden w-9 text-xs text-gray-400 tabular-nums sm:block">{row.share}%</span>
{/snippet}

<ul class="flex flex-col gap-0.5" aria-label="התפלגות {count} דירוגים לפי כוכבים">
    {#each rows as row (row.star)}
        <li>
            {#if onselect && row.n > 0}
                <button
                    type="button"
                    onclick={() => toggle(row.star, row.n)}
                    aria-pressed={selected === row.star}
                    class="histo-row flex w-full cursor-pointer items-center gap-2 rounded-lg px-1 text-start transition-colors {selected ===
                    row.star
                        ? 'bg-amber-400/10'
                        : ''}"
                    style="height:22px"
                >
                    {@render rowBody(row)}
                </button>
            {:else}
                <div class="flex w-full items-center gap-2 px-1" style="height:22px">
                    {@render rowBody(row)}
                </div>
            {/if}
        </li>
    {/each}
</ul>

{#if onselect && selected !== null}
    <button
        type="button"
        onclick={() => onselect(null)}
        class="mt-1 cursor-pointer text-xs text-blue-400 underline transition-colors hover:text-blue-300"
    >ניקוי סינון הכוכבים</button>
{/if}

<style>
    .histo-bar {
        transition: width 0.5s ease;
    }
    .histo-row:hover {
        background: rgba(255, 255, 255, 0.05);
    }
    .histo-row:focus-visible {
        outline: 2px solid #60a5fa;
        outline-offset: -2px;
    }
</style>
