<script lang="ts">
    // פירוט ציון לפי המדדים — שורה קומפקטית לכל מדד
    import { CRITERIA, type CriterionKey } from '$lib/rating/criteria';
    import { fmtScore } from '$lib/rating/aggregate';

    let { perCriterion }: { perCriterion: Record<CriterionKey, number | null> } = $props();
</script>

<ul class="flex flex-col gap-0.5" aria-label="ציון ממוצע לפי מדד">
    {#each CRITERIA as c (c.key)}
        {@const v = perCriterion[c.key] ?? null}
        <li
            class="flex items-center gap-2 {v === null ? 'opacity-40' : ''}"
            style="height:22px"
            title={c.description}
        >
            <!-- התווית המקוצרת מוצגת, המלאה נמסרת לקורא המסך יחד עם הציון -->
            <span class="sr-only">
                {c.label}: {v === null ? 'טרם דורג' : `${fmtScore(v)} מתוך 5`}
            </span>
            <span aria-hidden="true" class="flex w-28 shrink-0 items-center gap-1 truncate text-xs text-gray-300">
                <span>{c.icon}</span>
                <span class="truncate">{c.short}</span>
            </span>
            <span aria-hidden="true" class="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                    class="crit-bar block h-full rounded-full bg-gradient-to-l from-blue-500 to-purple-500"
                    style="width:{v ? (v / 5) * 100 : 0}%"
                ></span>
            </span>
            <span aria-hidden="true" class="w-7 text-xs font-bold text-amber-300 tabular-nums">{fmtScore(v)}</span>
        </li>
    {/each}
</ul>

<style>
    .crit-bar {
        transition: width 0.5s ease;
    }
</style>
