<script lang="ts">
    // פירוט ציון לפי ארבעת המדדים — שורה קומפקטית לכל מדד
    import { CRITERIA, type CriterionKey } from '$lib/rating/criteria';
    import { fmtScore } from '$lib/rating/aggregate';

    let { perCriterion }: { perCriterion: Record<CriterionKey, number | null> } = $props();
</script>

<div class="flex flex-col gap-0.5">
    {#each CRITERIA as c (c.key)}
        {@const v = perCriterion[c.key] ?? null}
        <div
            class="flex items-center gap-2 {v === null ? 'opacity-40' : ''}"
            style="height:22px"
            title="{c.label}: {fmtScore(v)}"
        >
            <span class="flex w-28 shrink-0 items-center gap-1 truncate text-xs text-gray-300">
                <span aria-hidden="true">{c.icon}</span>
                <span class="truncate">{c.short}</span>
            </span>
            <div class="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                    class="crit-bar h-full rounded-full bg-gradient-to-l from-blue-500 to-purple-500"
                    style="width:{v ? (v / 5) * 100 : 0}%"
                ></div>
            </div>
            <span class="w-7 text-xs font-bold text-amber-300 tabular-nums">{fmtScore(v)}</span>
        </div>
    {/each}
</div>

<style>
    .crit-bar {
        transition: width 0.5s ease;
    }
</style>
