<script lang="ts">
    // פאנל אמון — הקשר לציון: כמה מדרגים, עד כמה הם מסכימים, כמה נימקו ומתי.
    // הכל מחושב מנתונים שכבר נמצאים בדף — בלי שליפה נוספת.
    import { RELIABLE_MIN, consensusOf } from '$lib/rating/aggregate';
    import { absDate, isoDate, relDate } from '$lib/rating/time';
    import type { OfficialStats, PublicReview } from '$lib/rating/types';

    let { stats, reviews }: { stats: OfficialStats; reviews: PublicReview[] } = $props();

    const consensus = $derived(consensusOf(stats.distribution, stats.count));

    const withText = $derived(reviews.filter((r) => r.text?.trim()).length);
    const textShare = $derived(stats.count > 0 ? Math.round((withText / stats.count) * 100) : 0);

    const now = Date.now();

    const lastRatedIso = $derived.by(() => {
        let newest = '';
        let newestT = 0;
        for (const r of reviews) {
            const t = new Date(r.created_at).getTime();
            if (Number.isFinite(t) && t > newestT) {
                newestT = t;
                newest = r.created_at;
            }
        }
        return newest;
    });
    const lastRated = $derived(lastRatedIso ? relDate(lastRatedIso, now) : '');

    const TONE: Record<string, string> = {
        insufficient: 'border-white/10 bg-white/5 text-gray-400',
        consensus: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
        mixed: 'border-blue-400/30 bg-blue-500/10 text-blue-300',
        polarized: 'border-amber-400/30 bg-amber-500/10 text-amber-300',
    };

    const ICON: Record<string, string> = {
        insufficient: '⏳',
        consensus: '🤝',
        mixed: '💬',
        polarized: '⚡',
    };
</script>

<div class="flex flex-wrap items-center gap-2 text-xs">
    <span
        class="rounded-full border px-2.5 py-1 font-bold {TONE[consensus.level]}"
        title={consensus.detail}
    >
        <span aria-hidden="true">{ICON[consensus.level]}</span>
        {consensus.label}
    </span>

    <span class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-gray-400">
        👥 {stats.count}
        {stats.count === 1 ? 'מדרג/ת' : 'מדרגים'}
    </span>

    {#if stats.count > 0}
        <span
            class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-gray-400"
            title="דירוגים שלוו בנימוק כתוב, ולא רק בכוכבים"
        >✍️ {textShare}% נימקו</span>
    {/if}

    {#if lastRated}
        <time
            datetime={isoDate(lastRatedIso)}
            title={absDate(lastRatedIso)}
            class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-gray-400"
        >🕒 דורג לאחרונה {lastRated}</time>
    {/if}
</div>

<p class="mt-1.5 text-xs leading-relaxed text-gray-500">
    {consensus.detail}.
    {#if stats.count >= RELIABLE_MIN}
        סדר המדורגים בלוח נקבע בשקלול שנותן משקל רב יותר למי שנצבר לו מספר דירוגים גדול —
    {:else}
        עד לצבירת {RELIABLE_MIN} דירוגים הציון עדיין רגיש לדירוג בודד —
    {/if}
    <a href="/about#methodology" class="text-blue-400/80 hover:text-blue-300">איך זה מחושב?</a>
</p>
