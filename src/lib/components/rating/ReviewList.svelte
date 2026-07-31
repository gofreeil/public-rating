<script lang="ts">
    // רשימת דירוגי הציבור — מיון, סינון, חשיפה הדרגתית והצמדת הדירוג שלי למעלה.
    // בלי זה, מדורג עם עשרות דירוגים הופך לקיר טקסט בסדר כרונולוגי בלבד.
    import type { PublicComment, PublicReview } from '$lib/rating/types';
    import ReviewCard from './ReviewCard.svelte';

    let {
        reviews,
        commentsByReview,
        officialId,
        officialName = '',
        loggedIn = false,
        isAdmin = false,
        isOfficialUser = false,
    }: {
        reviews: PublicReview[];
        commentsByReview: Map<string, PublicComment[]>;
        officialId: string;
        officialName?: string;
        loggedIn?: boolean;
        isAdmin?: boolean;
        isOfficialUser?: boolean;
    } = $props();

    type SortKey = 'new' | 'helpful' | 'high' | 'low';

    const SORTS: { key: SortKey; label: string }[] = [
        { key: 'new', label: '🕒 החדשים' },
        { key: 'helpful', label: '👍 המועילים' },
        { key: 'high', label: '⭐ הגבוהים' },
        { key: 'low', label: '📉 הנמוכים' },
    ];

    const PAGE = 8;

    let sort = $state<SortKey>('new');
    let withTextOnly = $state(false);
    let shownCount = $state(PAGE);

    const withTextTotal = $derived(reviews.filter((r) => r.text?.trim()).length);

    function time(r: PublicReview): number {
        const t = new Date(r.created_at).getTime();
        return Number.isFinite(t) ? t : 0;
    }

    const ordered = $derived.by(() => {
        const list = withTextOnly ? reviews.filter((r) => r.text?.trim()) : [...reviews];
        switch (sort) {
            case 'helpful':
                list.sort((a, b) => b.helpfulCount - a.helpfulCount || time(b) - time(a));
                break;
            case 'high':
                list.sort((a, b) => b.overall - a.overall || time(b) - time(a));
                break;
            case 'low':
                list.sort((a, b) => a.overall - b.overall || time(b) - time(a));
                break;
            default:
                list.sort((a, b) => time(b) - time(a));
        }
        // הדירוג שלי תמיד ראשון — המשתמש מחפש אותו כדי לערוך או למחוק
        const mineIdx = list.findIndex((r) => r.mine);
        if (mineIdx > 0) list.unshift(list.splice(mineIdx, 1)[0]);
        return list;
    });

    const visible = $derived(ordered.slice(0, shownCount));
    const remaining = $derived(Math.max(0, ordered.length - visible.length));

    function setSort(key: SortKey) {
        sort = key;
        shownCount = PAGE;
    }

    function toggleTextOnly() {
        withTextOnly = !withTextOnly;
        shownCount = PAGE;
    }
</script>

{#if reviews.length > 1}
    <div class="flex flex-wrap items-center gap-1.5">
        {#each SORTS as s (s.key)}
            <button
                type="button"
                onclick={() => setSort(s.key)}
                aria-pressed={sort === s.key}
                class="cursor-pointer rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors {sort ===
                s.key
                    ? 'border-blue-400/50 bg-blue-500/20 text-blue-300'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-gray-200'}"
            >{s.label}</button>
        {/each}

        {#if withTextTotal > 0 && withTextTotal < reviews.length}
            <button
                type="button"
                onclick={toggleTextOnly}
                aria-pressed={withTextOnly}
                class="mr-auto cursor-pointer rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors {withTextOnly
                    ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-gray-200'}"
            >✍️ עם נימוק בלבד ({withTextTotal})</button>
        {/if}
    </div>
{/if}

{#if ordered.length === 0}
    <div class="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-gray-500">
        {withTextOnly ? 'אף דירוג לא לווה בנימוק כתוב' : 'אין עדיין דירוגים — היו הראשונים'}
    </div>
{:else}
    <div class="flex flex-col gap-2">
        {#each visible as review (review.id)}
            <ReviewCard
                {review}
                {officialId}
                {officialName}
                {loggedIn}
                {isAdmin}
                {isOfficialUser}
                canDelete={isAdmin || review.mine}
                comments={commentsByReview.get(review.id) ?? []}
            />
        {/each}
    </div>

    {#if remaining > 0}
        <div class="flex justify-center">
            <button
                type="button"
                onclick={() => (shownCount += PAGE * 2)}
                class="cursor-pointer rounded-full border border-white/10 bg-white/5 px-6 py-2 text-sm font-bold text-blue-300 transition-colors hover:bg-white/10"
            >הצגת עוד דירוגים ({remaining}) ⌄</button>
        </div>
    {/if}
{/if}
