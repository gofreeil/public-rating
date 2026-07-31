<script lang="ts">
    // לוח דירוג משותף — חברי כנסת / שופטים / עובדי ציבור
    import type { Group, RatedOfficial } from '$lib/rating/types';
    import { heMatches } from '$lib/rating/heSearch';
    import OfficialCard from './OfficialCard.svelte';
    import ShareBar from './ShareBar.svelte';

    let { group, officials }: { group: Group; officials: RatedOfficial[] } = $props();

    type SortKey = 'rank' | 'count' | 'name';
    let query = $state('');
    let sort: SortKey = $state('rank');

    // חשיפה הדרגתית: מובחרים → "פתח עוד" → תחתית מכוסה ("המדורגים נמוך ביותר")
    const FEATURED = 10; // נראים מיד
    const BOTTOM = 20; // תחתית הרשימה — נפתחת רק בלחיצה על הכותרת
    let expanded = $state(false);
    let showBottom = $state(false);

    const SORTS: { key: SortKey; label: string }[] = [
        { key: 'rank', label: '⭐ הדירוג הגבוה' },
        { key: 'count', label: '🔥 הכי מדורגים' },
        { key: 'name', label: 'א-ב' },
    ];

    const totalReviews = $derived(officials.reduce((sum, o) => sum + o.stats.count, 0));

    const shown = $derived.by(() => {
        const filtered = officials.filter((o) => heMatches(query, o.name, o.position, o.org));
        if (sort === 'count') return [...filtered].sort((a, b) => b.stats.count - a.stats.count);
        if (sort === 'name') return [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'he'));
        return filtered; // ברירת מחדל: הסדר הנכנס (דירוג הוגן משוקלל)
    });

    // מדליות רק במיון ברירת המחדל, בלי חיפוש, ורק למי שבאמת דורג
    const showRanks = $derived(sort === 'rank' && !query.trim());

    // חיפוש מציג את כל התוצאות; שכבת "נמוך ביותר" קיימת רק במיון דירוג וכשהרשימה גדולה
    const flat = $derived(query.trim().length > 0);
    const bottomCount = $derived(
        !flat && sort === 'rank' && shown.length >= FEATURED + BOTTOM + 10 ? BOTTOM : 0,
    );
    const middle = $derived(shown.slice(0, shown.length - bottomCount));
    const visible = $derived(flat || expanded ? middle : middle.slice(0, FEATURED));
    const bottom = $derived(bottomCount ? shown.slice(shown.length - bottomCount) : []);

    function resetView() {
        expanded = false;
        showBottom = false;
    }
</script>

<section class="space-y-4">
    <!-- כותרת קומפקטית -->
    <div class="flex items-baseline gap-x-3 gap-y-1 flex-wrap">
        <h1 class="text-xl sm:text-2xl font-black text-white">
            {group.icon} {group.title}
        </h1>
        <span class="text-sm text-gray-400">
            {officials.length} מדורגים · {totalReviews} דירוגים
        </span>
        <span class="mr-auto">
            <ShareBar
                text="לוח הדירוג של {group.title} — {officials.length} מדורגים, {totalReviews} דירוגי אזרחים בדירוג ציבורי"
                title="{group.title} — דירוג ציבורי"
                compact
            />
        </span>
    </div>

    <!-- סרגל כלים: חיפוש + מיון + הצעה, שורה אחת גמישה -->
    <div class="flex flex-wrap items-center gap-2">
        <input
            type="search"
            bind:value={query}
            oninput={resetView}
            placeholder="🔍 חיפוש שם, תפקיד או ארגון..."
            aria-label="חיפוש בלוח {group.title}"
            class="min-w-40 flex-1 basis-48 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-blue-400/60 focus:outline-none"
        />
        {#each SORTS as s (s.key)}
            <button
                type="button"
                onclick={() => { sort = s.key; resetView(); }}
                aria-pressed={sort === s.key}
                class="cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors {sort === s.key
                    ? 'border-blue-400/50 bg-blue-500/20 text-blue-300'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-gray-200'}"
            >{s.label}</button>
        {/each}
        <a
            href="/suggest?group={group.key}"
            class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-blue-400 transition-colors hover:border-blue-400/40 hover:text-blue-300"
        >➕ הציעו לדירוג</a>
    </div>

    {#if officials.length === 0}
        <!-- אין מדורגים כלל -->
        <div class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <div class="mb-2 text-4xl">{group.icon}</div>
            <p class="mb-1 font-bold text-white">עדיין אין מדורגים בקטגוריה זו</p>
            <p class="mb-4 text-sm text-gray-400">מכירים {group.singular} שהציבור צריך לדרג? הציעו אותו!</p>
            <a href="/suggest?group={group.key}" class="btn-premium inline-block rounded-xl px-5 py-2 text-sm font-bold text-white">
                ➕ הציעו לדירוג
            </a>
        </div>
    {:else if shown.length === 0}
        <!-- חיפוש ללא תוצאות -->
        <div class="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <p class="mb-1 font-bold text-white">לא נמצאו תוצאות עבור "{query}"</p>
            <p class="mb-3 text-sm text-gray-400">לא מצאתם את מי שחיפשתם? הציעו להוסיף אותו לדירוג</p>
            <a href="/suggest?group={group.key}" class="btn-premium inline-block rounded-xl px-5 py-2 text-sm font-bold text-white">
                ➕ הציעו לדירוג
            </a>
        </div>
    {:else}
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {#each visible as official, i (official.id)}
                <OfficialCard
                    {official}
                    rank={showRanks && i < 3 && official.stats.count > 0 ? i + 1 : null}
                />
            {/each}
        </div>

        <!-- פתח עוד — חושף את המשך הרשימה -->
        {#if !flat && !expanded && middle.length > FEATURED}
            <div class="flex justify-center">
                <button
                    type="button"
                    onclick={() => (expanded = true)}
                    class="cursor-pointer rounded-full border border-white/10 bg-white/5 px-6 py-2 text-sm font-bold text-blue-300 transition-colors hover:bg-white/10"
                >פתח עוד ({middle.length - FEATURED}) ⌄</button>
            </div>
        {/if}

        <!-- תחתית הרשימה — מכוסה עד לחיצה על הכותרת -->
        {#if expanded && bottom.length > 0}
            <button
                type="button"
                onclick={() => (showBottom = !showBottom)}
                aria-expanded={showBottom}
                class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-bold text-gray-400 transition-colors hover:text-gray-200"
            >{showBottom ? '🔼' : '🔽'} המדורגים נמוך ביותר ({bottom.length})</button>
            {#if showBottom}
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {#each bottom as official (official.id)}
                        <OfficialCard {official} rank={null} />
                    {/each}
                </div>
            {/if}
        {/if}
    {/if}
</section>
