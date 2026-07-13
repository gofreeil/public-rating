<script lang="ts">
    // כרטיס ביקורת בודדת — שם/אנונימי, כוכבים, נימוק, צ'יפים למדדים, "מועיל" ומחיקה
    import { enhance } from '$app/forms';
    import { CRITERIA } from '$lib/rating/criteria';
    import type { PublicReview } from '$lib/rating/types';
    import Avatar from './Avatar.svelte';
    import Stars from './Stars.svelte';

    let {
        review,
        officialId,
        canDelete,
        loggedIn,
    }: { review: PublicReview; officialId: string; canDelete: boolean; loggedIn: boolean } = $props();

    const displayName = $derived(review.anonymous ? 'אזרח/ית' : review.reviewer_name || 'אזרח/ית');
    const helpfulCount = $derived(review.helpfulCount);
    const iMarkedHelpful = $derived(review.markedHelpfulByMe);
    const ratedCriteria = $derived(CRITERIA.filter((c) => typeof review.scores[c.key] === 'number'));

    function relDate(iso: string): string {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
        if (mins < 1) return 'עכשיו';
        if (mins < 60) return `לפני ${mins} דק׳`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return hours === 1 ? 'לפני שעה' : `לפני ${hours} שעות`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'אתמול';
        if (days < 30) return `לפני ${days} ימים`;
        const months = Math.floor(days / 30);
        if (months < 12) return months === 1 ? 'לפני חודש' : `לפני ${months} חודשים`;
        const years = Math.floor(months / 12);
        return years === 1 ? 'לפני שנה' : `לפני ${years} שנים`;
    }
</script>

<article class="rounded-2xl border border-white/10 bg-white/5 p-3" data-official={officialId}>
    <div class="flex flex-wrap items-center gap-2">
        <Avatar name={displayName} size={36} />
        <span class="min-w-0">
            <span class="block truncate text-sm font-bold text-white">{displayName}</span>
            <span class="block text-xs text-gray-500">{relDate(review.created_at)}</span>
        </span>
        <span class="mr-auto">
            <Stars value={review.overall} size={14} showValue />
        </span>
    </div>

    {#if review.text}
        <p class="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-300">{review.text}</p>
    {/if}

    {#if ratedCriteria.length}
        <div class="mt-2 flex flex-wrap gap-1">
            {#each ratedCriteria as c (c.key)}
                <span class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-400">
                    {c.short}
                    <b class="text-amber-300 tabular-nums">{review.scores[c.key]}</b>
                </span>
            {/each}
        </div>
    {/if}

    <div class="mt-2 flex flex-wrap items-center gap-3 border-t border-white/5 pt-2">
        <form method="POST" action="?/helpful" use:enhance>
            <input type="hidden" name="review_id" value={review.id} />
            <button
                type="submit"
                disabled={!loggedIn}
                title={loggedIn ? (iMarkedHelpful ? 'ביטול הסימון' : 'סימון כמועיל') : 'יש להתחבר כדי לסמן מועיל'}
                class="rounded-full border px-2.5 py-1 text-xs transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 {iMarkedHelpful
                    ? 'border-blue-400/50 bg-blue-500/15 text-blue-300'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-gray-200'}"
            >
                👍 מועיל ({helpfulCount})
            </button>
        </form>

        {#if canDelete}
            <form
                method="POST"
                action="?/delete_review"
                use:enhance={({ cancel }) => {
                    if (!confirm('למחוק את הדירוג הזה לצמיתות?')) {
                        cancel();
                        return;
                    }
                    return async ({ update }) => {
                        await update();
                    };
                }}
            >
                <input type="hidden" name="review_id" value={review.id} />
                <button type="submit" class="text-xs text-red-400/80 transition-colors duration-150 hover:text-red-300">
                    🗑 מחיקה
                </button>
            </form>
        {/if}
    </div>
</article>
