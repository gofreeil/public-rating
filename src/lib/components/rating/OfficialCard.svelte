<script lang="ts">
    // כרטיס מדורג — משותף לדף הבית, ללוחות ולמצטיינים
    import type { RatedOfficial } from '$lib/rating/types';
    import { fmtScore } from '$lib/rating/aggregate';
    import { triggerAdPopup } from '$lib/adPopupStore';
    import Avatar from './Avatar.svelte';
    import Stars from './Stars.svelte';

    let {
        official,
        rank = null,
        compact = false,
    }: { official: RatedOfficial; rank?: number | null; compact?: boolean } = $props();

    const MEDALS = ['🥇', '🥈', '🥉'];
    const rankBadge = $derived(rank !== null && rank >= 1 && rank <= 3 ? MEDALS[rank - 1] : null);

    // בנייד: פרסומת ביניים קצרה בדרך לדף הפרטים (כמו באתר הקהילה).
    // triggerAdPopup מחזיר false בדסקטופ - ואז הקישור מנווט כרגיל.
    function adThenGo(e: MouseEvent) {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        if (triggerAdPopup(`/officials/${official.id}`)) e.preventDefault();
    }
</script>

<a
    href="/officials/{official.id}"
    onclick={adThenGo}
    class="official-card relative flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition-colors duration-150 {compact ? '' : 'sm:p-4'}"
>
    {#if rank !== null}
        <span
            class="absolute -top-2 {rankBadge ? '-right-2 text-2xl' : 'right-3 rounded-full bg-white/10 border border-white/15 px-2 py-0.5 text-xs font-bold text-gray-300'}"
            aria-label="מקום {rank}"
        >{rankBadge ?? `#${rank}`}</span>
    {/if}

    <Avatar name={official.name} image={official.image} size={compact ? 44 : 56} />

    <span class="min-w-0 flex-1">
        <span class="block truncate font-bold text-white {compact ? 'text-sm' : ''}">{official.name}</span>
        <span class="block truncate text-xs text-gray-400">
            {official.position}{official.org ? ` · ${official.org}` : ''}
        </span>
        <span class="mt-1 flex items-center gap-2 flex-wrap">
            {#if official.stats.count > 0}
                <Stars value={official.stats.average ?? 0} size={compact ? 14 : 16} />
                <span class="text-xs font-bold text-amber-300 tabular-nums">{fmtScore(official.stats.average)}</span>
                <span class="text-xs text-gray-400">({official.stats.count})</span>
            {:else}
                <span class="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-300">
                    ⭐ היו הראשונים לדרג
                </span>
            {/if}
        </span>
    </span>
</a>

<style>
    /* Tailwind v4: group-hover שבור — CSS מפורש */
    .official-card:hover {
        background: rgba(255, 255, 255, 0.09);
        border-color: rgba(96, 165, 250, 0.4);
    }
</style>
