<script lang="ts">
    // פירוט ציון לפי המדדים — שורה קומפקטית לכל מדד.
    // עם officialId כל שורה היא קישור לדף המדד של אותה דמות
    // (/officials/[id]/[criterion]) — תיק הראיות והניתוח שמאחורי הציון.
    import { CRITERIA, type CriterionKey } from '$lib/rating/criteria';
    import { fmtScore } from '$lib/rating/aggregate';

    let {
        perCriterion,
        officialId = '',
    }: { perCriterion: Record<CriterionKey, number | null>; officialId?: string } = $props();
</script>

<ul class="flex flex-col gap-0.5" aria-label="ציון ממוצע לפי מדד">
    {#each CRITERIA as c (c.key)}
        {@const v = perCriterion[c.key] ?? null}
        <li>
            <!-- svelte-ignore element_invalid_self_closing_tag -->
            <svelte:element
                this={officialId ? 'a' : 'div'}
                href={officialId ? `/officials/${officialId}/${c.key}` : undefined}
                class="crit-row flex items-center gap-2 {officialId ? 'rounded-lg px-1 -mx-1' : ''}"
                style="height:22px"
                title={officialId ? `${c.label} — ${c.description}. לחצו לתיק הראיות והניתוח` : c.description}
            >
                <!-- התווית המקוצרת מוצגת, המלאה נמסרת לקורא המסך יחד עם הציון -->
                <span class="sr-only">
                    {c.label}: {v === null ? 'טרם דורג' : `${fmtScore(v)} מתוך 5`}
                </span>
                <span
                    aria-hidden="true"
                    class="crit-label flex w-28 shrink-0 items-center gap-1 truncate text-xs text-gray-300"
                >
                    <span>{c.icon}</span>
                    <span class="truncate">{c.short}</span>
                </span>
                <span aria-hidden="true" class="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <span
                        class="crit-bar block h-full rounded-full bg-gradient-to-l from-blue-500 to-purple-500"
                        style="width:{v ? (v / 5) * 100 : 0}%"
                    ></span>
                </span>
                <span
                    aria-hidden="true"
                    class="w-7 text-xs font-bold tabular-nums {v === null ? 'text-gray-400' : 'text-amber-300'}"
                >{fmtScore(v)}</span>
            </svelte:element>
        </li>
    {/each}
</ul>

<style>
    .crit-bar {
        transition: width 0.5s ease;
    }

    /* group-hover שבור ב-Tailwind 4 כאן — הדגשת השורה בעכבר בפירוש */
    a.crit-row {
        transition: background-color 0.15s ease;
    }
    a.crit-row:hover {
        background-color: rgb(255 255 255 / 0.06);
    }
    a.crit-row:hover .crit-label {
        color: #fff;
    }
</style>
