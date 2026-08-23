<script lang="ts">
    // סקר "מה הכי חשוב לך במשרת ציבור?" — הציבור מדרג את חשיבות חמשת המדדים.
    // הצבעה אחת למשתמש (עדכון חוזר מותר); התוצאות המצטברות גלויות לכולם.
    import { enhance } from '$app/forms';
    import { CRITERIA, type Scores } from '$lib/rating/criteria';
    import { fmtScore } from '$lib/rating/aggregate';
    import StarInput from './StarInput.svelte';
    import type { SurveyResults } from '$lib/rating/types';

    let {
        results,
        myVote,
        loggedIn,
        form,
    }: {
        results: SurveyResults;
        myVote: Scores | null;
        loggedIn: boolean;
        form: { surveyError?: string; surveySuccess?: boolean } | null;
    } = $props();

    let open = $state(false);
    let submitting = $state(false);

    // ערכי הטופס — מאותחלים מההצבעה הקודמת של המשתמש
    const values = $state<Record<string, number>>({});
    for (const c of CRITERIA) values[c.key] = myVote?.[c.key] ?? 0;

    /** המדדים ממוינים לפי חשיבות שהציבור ייחס להם — הגבוה ראשון */
    const ranked = $derived(
        CRITERIA.map((c) => ({ ...c, avg: results.importance[c.key] }))
            .filter((c) => c.avg !== null && c.avg > 0)
            .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0)),
    );
</script>

<section class="rounded-2xl border border-white/10 bg-white/5 p-4">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 class="text-xl font-black text-white md:text-2xl">📊 מה הכי חשוב לך במשרת ציבור?</h2>
        {#if results.count > 0}
            <span class="text-sm text-gray-300">{results.count} משתתפים עד כה</span>
        {/if}
    </div>
    <p class="mt-1 text-base text-gray-300">
        דרגו כמה כל מדד חשוב לכם — והשוו לסדר העדיפויות של שאר הציבור.
    </p>

    <!-- תוצאות מצטברות -->
    {#if ranked.length}
        <div class="mt-3 flex flex-col gap-1.5">
            {#each ranked as c, i (c.key)}
                <div class="flex items-center gap-2 text-base">
                    <span class="w-44 shrink-0 truncate font-bold text-white" title={c.label}>
                        {i === 0 ? '👑 ' : ''}{c.icon} {c.short}
                    </span>
                    <div class="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-white/15">
                        <div
                            class="h-full rounded-full bg-gradient-to-l from-amber-300 to-amber-500"
                            style="width: {Math.max(6, ((c.avg ?? 0) / 5) * 100)}%"
                        ></div>
                    </div>
                    <span class="w-10 shrink-0 text-left font-black text-amber-300 tabular-nums">{fmtScore(c.avg)}</span>
                </div>
            {/each}
        </div>
    {/if}

    <!-- הצבעה -->
    {#if form?.surveySuccess}
        <p class="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            ✅ ההצבעה נקלטה — תודה! אפשר לעדכן אותה בכל רגע.
        </p>
    {:else if form?.surveyError}
        <p class="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {form.surveyError}
        </p>
    {/if}

    {#if loggedIn}
        {#if !open}
            <button
                type="button"
                onclick={() => (open = true)}
                class="btn-premium mt-3 cursor-pointer rounded-xl px-5 py-2 text-base font-bold text-white"
            >{myVote ? '✏️ עדכון ההצבעה שלי' : '🗳️ אני מצביע/ה'}</button>
        {:else}
            <form
                method="POST"
                action="/?/survey"
                class="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3"
                use:enhance={() => {
                    submitting = true;
                    return async ({ result, update }) => {
                        submitting = false;
                        if (result.type === 'success') open = false;
                        await update({ reset: false });
                    };
                }}
            >
                {#each CRITERIA as c (c.key)}
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        <span class="w-44 shrink-0 text-base font-bold text-white" title={c.description}>
                            {c.icon} {c.short}
                        </span>
                        <StarInput bind:value={values[c.key]} name={c.key} size={24} label="חשיבות {c.short}" />
                    </div>
                {/each}
                <div class="flex flex-wrap items-center gap-2">
                    <button
                        type="submit"
                        disabled={submitting}
                        class="btn-premium cursor-pointer rounded-xl px-5 py-2 text-base font-bold text-white disabled:opacity-60"
                    >{submitting ? 'שולח...' : 'שמירת ההצבעה'}</button>
                    <button
                        type="button"
                        onclick={() => (open = false)}
                        class="cursor-pointer rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-base text-gray-200 transition-colors hover:bg-white/10"
                    >ביטול</button>
                </div>
            </form>
        {/if}
    {:else}
        <div class="mt-3 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
            <p class="flex-1 text-base text-gray-200" style="min-width: 14rem">
                {results.count > 0
                    ? 'רוצים להשפיע על הסדר? הצביעו גם אתם'
                    : 'היו הראשונים לקבוע מה הכי חשוב'}
            </p>
            <a href="/login?redirect=/" class="btn-premium rounded-xl px-5 py-2 text-base font-bold text-white">
                התחברות להצבעה
            </a>
        </div>
    {/if}
</section>
