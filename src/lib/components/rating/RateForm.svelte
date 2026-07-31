<script lang="ts">
    // טופס דירוג — כל המדדים + נימוק, עדכון-במקום של הדירוג הקיים (upsert בשרת)
    import { enhance } from '$app/forms';
    import { CRITERIA, type CriterionKey } from '$lib/rating/criteria';
    import type { MyReview } from '$lib/rating/types';
    import BotFields from './BotFields.svelte';
    import StarInput from './StarInput.svelte';

    let { myReview = null }: { myReview?: MyReview | null } = $props();

    // נבנה דינמית מ-CRITERIA — הוספת מדד חדש לא דורשת שינוי כאן
    let values = $state<Record<CriterionKey, number>>(
        Object.fromEntries(
            CRITERIA.map((c) => [c.key, myReview?.scores[c.key] ?? 0]),
        ) as Record<CriterionKey, number>,
    );
    let submitting = $state(false);

    const hasAny = $derived(CRITERIA.some((c) => (values[c.key] ?? 0) > 0));
</script>

<form
    method="POST"
    action="?/rate"
    class="relative flex flex-col gap-2"
    use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
            submitting = false;
            await update({ reset: false });
        };
    }}
>
    <BotFields />

    {#each CRITERIA as c (c.key)}
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <span class="min-w-44 flex-1">
                <span class="block text-sm font-semibold text-white">
                    <span aria-hidden="true">{c.icon}</span>
                    {c.label}
                </span>
                <span class="block text-xs text-gray-500">{c.description}</span>
            </span>
            <StarInput bind:value={values[c.key]} name={c.key} size={26} label={c.label} />
        </div>
    {/each}

    <textarea
        name="text"
        rows="3"
        maxlength="2000"
        value={myReview?.text ?? ''}
        placeholder="שתפו נימוק ענייני — בלי השמצות אישיות…"
        class="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-400/50 focus:outline-none"
    ></textarea>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label class="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
            <input
                type="checkbox"
                name="anonymous"
                checked={myReview?.anonymous ?? false}
                class="h-4 w-4 accent-purple-500"
            />
            פרסום אנונימי
        </label>

        <button
            type="submit"
            disabled={!hasAny || submitting}
            class="btn-premium rounded-xl px-5 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
            {submitting ? 'שומר…' : myReview ? 'עדכון הדירוג שלי' : 'פרסום הדירוג'}
        </button>

        {#if !hasAny}
            <span class="text-xs text-amber-300/80">יש לדרג לפחות מדד אחד</span>
        {/if}
    </div>

    <p class="text-xs text-gray-500">
        דירוג אחד לכל משתמש למדורג — ניתן לעדכן בכל עת.
        בפרסום אתם מאשרים את <a href="/legal" class="text-blue-400/80 hover:underline">תנאי השימוש</a>:
        דעה אישית ועניינית על התפקוד הציבורי — בלי לשון הרע.
    </p>
</form>
