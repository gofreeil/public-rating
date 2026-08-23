<script lang="ts">
    // טופס דירוג — כל המדדים + נימוק, עדכון-במקום של הדירוג הקיים (upsert בשרת)
    import { onMount } from 'svelte';
    import { enhance } from '$app/forms';
    import { CRITERIA, type CriterionKey } from '$lib/rating/criteria';
    import { clearDraft, loadDraft, saveDraft } from '$lib/formDraft';
    import type { MyReview } from '$lib/rating/types';
    import BotFields from './BotFields.svelte';
    import StarInput from './StarInput.svelte';

    let { myReview = null, officialId }: { myReview?: MyReview | null; officialId: string } =
        $props();

    // נבנה דינמית מ-CRITERIA — הוספת מדד חדש לא דורשת שינוי כאן
    let values = $state<Record<CriterionKey, number>>(
        Object.fromEntries(
            CRITERIA.map((c) => [c.key, myReview?.scores[c.key] ?? 0]),
        ) as Record<CriterionKey, number>,
    );
    // ערך פתיחה בלבד, במתכוון: הטופס לא אמור לקפוץ בחזרה תוך כדי הקלדה
    // אם ה-load רץ שוב ברקע.
    // svelte-ignore state_referenced_locally
    let text = $state(myReview?.text ?? '');
    // svelte-ignore state_referenced_locally
    let anonymous = $state(myReview?.anonymous ?? false);
    let submitting = $state(false);
    let restored = $state(false);

    const hasAny = $derived(CRITERIA.some((c) => (values[c.key] ?? 0) > 0));

    // ---- טיוטה ----
    // דירוג הוא חמישה פקדים ונימוק מנוסח, שנכתב בעיקר בטלפון. עד היום
    // ניווט בטעות או נפילת רשת מחקו הכל. השחזור נעשה דרך ה-$state ולא דרך
    // ה-DOM, כי ערכי הכוכבים חיים ב-runes ולא בשדות שהמשתמש מקליד בהם.
    const draftKey = $derived(`rate:${officialId}`);

    interface RateDraft {
        scores: Record<string, number>;
        text: string;
        anonymous: boolean;
    }

    function currentDraft(): RateDraft {
        return { scores: { ...values }, text, anonymous };
    }

    function sameAsSaved(d: RateDraft): boolean {
        if (d.text !== (myReview?.text ?? '') || d.anonymous !== (myReview?.anonymous ?? false)) {
            return false;
        }
        return CRITERIA.every((c) => (d.scores[c.key] ?? 0) === (myReview?.scores[c.key] ?? 0));
    }

    /** השמירה מופעלת רק אחרי ניסיון השחזור — אחרת היינו דורסים את הטיוטה בערכים ריקים */
    let ready = $state(false);

    onMount(() => {
        const saved = loadDraft<RateDraft>(draftKey);
        if (saved && !sameAsSaved(saved)) {
            for (const c of CRITERIA) {
                const v = Number(saved.scores?.[c.key]);
                if (Number.isFinite(v) && v >= 1 && v <= 5) values[c.key] = v;
            }
            if (typeof saved.text === 'string') text = saved.text;
            if (typeof saved.anonymous === 'boolean') anonymous = saved.anonymous;
            restored = true;
        }
        ready = true;
    });

    $effect(() => {
        // הקריאה קודמת לבדיקת ready בכוונה — אחרת האפקט לא היה נרשם על השינויים
        const draft = currentDraft();
        if (!ready) return;
        if (sameAsSaved(draft)) clearDraft(draftKey);
        else saveDraft(draftKey, draft);
    });

    function discardDraft() {
        for (const c of CRITERIA) values[c.key] = myReview?.scores[c.key] ?? 0;
        text = myReview?.text ?? '';
        anonymous = myReview?.anonymous ?? false;
        clearDraft(draftKey);
        restored = false;
    }
</script>

<form
    method="POST"
    action="?/rate"
    class="relative flex flex-col gap-2"
    use:enhance={() => {
        submitting = true;
        return async ({ result, update }) => {
            submitting = false;
            // הטיוטה נמחקת רק אחרי שמירה מוצלחת בשרת — כישלון משאיר אותה במקום
            if (result.type === 'success') {
                clearDraft(draftKey);
                restored = false;
            }
            await update({ reset: false });
        };
    }}
>
    <BotFields />

    {#if restored}
        <p class="flex flex-wrap items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
            <span>💾 שחזרנו את הדירוג שהתחלתם למלא ולא נשלח</span>
            <button
                type="button"
                onclick={discardDraft}
                class="cursor-pointer underline transition-colors hover:text-white"
            >התחלה מחדש</button>
        </p>
    {/if}

    {#each CRITERIA as c (c.key)}
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2">
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
        bind:value={text}
        placeholder="שתפו נימוק ענייני — בלי השמצות אישיות…"
        class="w-full resize-y rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-400/50 focus:outline-none"
    ></textarea>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label class="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
            <input
                type="checkbox"
                name="anonymous"
                bind:checked={anonymous}
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
