<script lang="ts">
    // כרטיס ביקורת בודדת — שם/אנונימי, כוכבים, נימוק, צ'יפים למדדים, "מועיל", מחיקה ותגובות
    import { enhance } from '$app/forms';
    import { CRITERIA } from '$lib/rating/criteria';
    import type { PublicComment, PublicReview } from '$lib/rating/types';
    import Avatar from './Avatar.svelte';
    import BotFields from './BotFields.svelte';
    import Stars from './Stars.svelte';

    let {
        review,
        officialId,
        canDelete,
        loggedIn,
        comments = [],
        officialName = '',
        isAdmin = false,
        isOfficialUser = false,
    }: {
        review: PublicReview;
        officialId: string;
        canDelete: boolean;
        loggedIn: boolean;
        comments?: PublicComment[];
        officialName?: string;
        isAdmin?: boolean;
        isOfficialUser?: boolean;
    } = $props();

    let replying = $state(false);
    let submittingComment = $state(false);

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

<article
    class="rounded-2xl border p-3 {review.mine
        ? 'border-blue-400/30 bg-blue-500/[0.06]'
        : 'border-white/10 bg-white/5'}"
    data-official={officialId}
>
    <div class="flex flex-wrap items-center gap-2">
        <Avatar name={displayName} size={36} />
        <span class="min-w-0">
            <span class="flex items-center gap-1.5 truncate text-sm font-bold text-white">
                {displayName}
                {#if review.mine}
                    <span class="rounded-full border border-blue-400/40 bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-bold text-blue-300">
                        הדירוג שלי
                    </span>
                {/if}
            </span>
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
                disabled={!loggedIn || review.mine}
                title={review.mine
                    ? 'אי אפשר לסמן את הדירוג שלכם כמועיל'
                    : loggedIn
                      ? iMarkedHelpful
                          ? 'ביטול הסימון'
                          : 'סימון כמועיל'
                      : 'יש להתחבר כדי לסמן מועיל'}
                class="rounded-full border px-2.5 py-1 text-xs transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 {iMarkedHelpful
                    ? 'border-blue-400/50 bg-blue-500/15 text-blue-300'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-gray-200'}"
            >
                👍 מועיל ({helpfulCount})
            </button>
        </form>

        <button
            type="button"
            disabled={!loggedIn}
            onclick={() => (replying = !replying)}
            title={loggedIn ? 'תגובה על הדירוג' : 'רק משתמשים רשומים מגיבים — יש להתחבר'}
            class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-400 transition-colors duration-150 hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
            💬 תגובה{comments.length ? ` (${comments.length})` : ''}
        </button>

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

    <!-- תגובות על הדירוג — תגובת חשבון הדמות מסומנת כרשמית -->
    {#if comments.length}
        <div class="mt-2 flex flex-col gap-1.5 border-r-2 border-white/10 pr-3">
            {#each comments as c (c.id)}
                <div class="rounded-xl px-3 py-2 {c.official_reply ? 'border border-amber-400/30 bg-amber-500/10' : 'bg-white/5'}">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="text-xs font-bold text-white">{c.commenter_name || 'אזרח/ית'}</span>
                        {#if c.official_reply}
                            <span class="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                🎖️ תגובה רשמית{officialName ? ` — ${officialName}` : ''}
                            </span>
                        {/if}
                        <span class="text-[11px] text-gray-500">{relDate(c.created_at)}</span>
                        {#if c.mine || isAdmin}
                            <form
                                method="POST"
                                action="?/delete_comment"
                                class="mr-auto"
                                use:enhance={({ cancel }) => {
                                    if (!confirm('למחוק את התגובה?')) {
                                        cancel();
                                        return;
                                    }
                                    return async ({ update }) => {
                                        await update();
                                    };
                                }}
                            >
                                <input type="hidden" name="comment_id" value={c.id} />
                                <button type="submit" class="text-[11px] text-red-400/80 transition-colors duration-150 hover:text-red-300">🗑</button>
                            </form>
                        {/if}
                    </div>
                    <p class="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-gray-300">{c.text}</p>
                </div>
            {/each}
        </div>
    {/if}

    <!-- טופס תגובה — משתמשים רשומים בלבד -->
    {#if replying && loggedIn}
        <form
            method="POST"
            action="?/comment"
            class="relative mt-2 flex flex-col gap-2"
            use:enhance={() => {
                submittingComment = true;
                return async ({ result, update }) => {
                    submittingComment = false;
                    if (result.type === 'success') replying = false;
                    await update();
                };
            }}
        >
            <BotFields />
            <input type="hidden" name="review_id" value={review.id} />
            <textarea
                name="comment_text"
                rows="2"
                maxlength="1000"
                required
                placeholder={isOfficialUser
                    ? 'המענה שלכם יסומן כתגובה רשמית…'
                    : 'תגובה עניינית ומכבדת — בלי לשון הרע…'}
                class="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-400/50 focus:outline-none"
            ></textarea>
            <div class="flex flex-wrap items-center gap-3">
                <button
                    type="submit"
                    disabled={submittingComment}
                    class="btn-premium rounded-xl px-4 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >{submittingComment ? 'שולח…' : isOfficialUser ? 'פרסום מענה רשמי' : 'פרסום תגובה'}</button>
                <button type="button" onclick={() => (replying = false)} class="text-xs text-gray-400 hover:text-gray-200">ביטול</button>
                <span class="text-[11px] text-gray-500">
                    בפרסום אתם מאשרים את <a href="/legal" class="text-blue-400 hover:underline">תנאי השימוש</a>
                </span>
            </div>
        </form>
    {/if}
</article>
