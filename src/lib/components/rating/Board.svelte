<script lang="ts">
    // לוח דירוג משותף — חברי כנסת / שופטים / עובדי ציבור
    import { browser } from '$app/environment';
    import { replaceState } from '$app/navigation';
    import { page } from '$app/state';
    import type { Group, RatedOfficial } from '$lib/rating/types';
    import { heMatches } from '$lib/rating/heSearch';
    import { FAQ_COMPACT } from '$lib/rating/faq';
    import FaqAccordion from './FaqAccordion.svelte';
    import OfficialCard from './OfficialCard.svelte';
    import ShareBar from './ShareBar.svelte';

    let { group, officials }: { group: Group; officials: RatedOfficial[] } = $props();

    type SortKey = 'rank' | 'count' | 'name';

    const SORTS: { key: SortKey; label: string }[] = [
        { key: 'rank', label: '⭐ הדירוג הגבוה' },
        { key: 'count', label: '🔥 הכי מדורגים' },
        { key: 'name', label: 'א-ב' },
    ];

    function toSort(v: string | null): SortKey {
        return SORTS.some((s) => s.key === v) ? (v as SortKey) : 'rank';
    }

    // ---- מצב הלוח חי בכתובת ----
    // בלי זה לוח מסונן אינו ניתן לשיתוף או לסימנייה, כפתור "אחורה" מאבד את
    // המצב, ורינדור השרת תמיד מציג את הרשימה הלא-מסוננת.
    const params = page.url.searchParams;
    let query = $state(params.get('q') ?? '');
    let sort = $state<SortKey>(toSort(params.get('sort')));
    let orgFilter = $state(params.get('org') ?? '');
    let ratedOnly = $state(params.get('rated') === '1');
    let expanded = $state(params.get('all') === '1');
    let showBottom = $state(params.get('low') === '1');

    // חשיפה הדרגתית: מובחרים → "פתח עוד" → תחתית מכוסה ("המדורגים נמוך ביותר")
    const FEATURED = 10; // נראים מיד
    const BOTTOM = 20; // תחתית הרשימה — נפתחת רק בלחיצה על הכותרת

    function syncUrl() {
        if (!browser) return;
        const url = new URL(page.url);
        const set = (key: string, value: string, empty: string) => {
            if (value && value !== empty) url.searchParams.set(key, value);
            else url.searchParams.delete(key);
        };
        set('q', query.trim(), '');
        set('sort', sort, 'rank');
        set('org', orgFilter, '');
        set('rated', ratedOnly ? '1' : '', '');
        set('all', expanded ? '1' : '', '');
        set('low', showBottom ? '1' : '', '');
        replaceState(url, {});
    }

    const totalReviews = $derived(officials.reduce((sum, o) => sum + o.stats.count, 0));

    /** ארגונים קיימים בלוח (סיעה / ערכאה / משרד) עם מספר המדורגים בכל אחד */
    const orgs = $derived.by(() => {
        const counts = new Map<string, number>();
        for (const o of officials) {
            const name = o.org?.trim();
            if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
        }
        return [...counts.entries()]
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'he'))
            .map(([name, count]) => ({ name, count }));
    });

    const shown = $derived.by(() => {
        let filtered = officials.filter((o) => heMatches(query, o.name, o.position, o.org));
        if (orgFilter) filtered = filtered.filter((o) => o.org === orgFilter);
        if (ratedOnly) filtered = filtered.filter((o) => o.stats.count > 0);
        if (sort === 'count') return [...filtered].sort((a, b) => b.stats.count - a.stats.count);
        if (sort === 'name') return [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'he'));
        return filtered; // ברירת מחדל: הסדר הנכנס (דירוג הוגן משוקלל)
    });

    const anyFilter = $derived(Boolean(query.trim() || orgFilter || ratedOnly));

    // מדליות רק במיון ברירת המחדל, בלי סינון, ורק למי שבאמת דורג
    const showRanks = $derived(sort === 'rank' && !anyFilter);

    // סינון מציג את כל התוצאות; שכבת "נמוך ביותר" קיימת רק במיון דירוג וברשימה גדולה
    const flat = $derived(anyFilter);
    const bottomCount = $derived(
        !flat && sort === 'rank' && shown.length >= FEATURED + BOTTOM + 10 ? BOTTOM : 0,
    );
    const middle = $derived(shown.slice(0, shown.length - bottomCount));
    const visible = $derived(flat || expanded ? middle : middle.slice(0, FEATURED));
    const bottom = $derived(bottomCount ? shown.slice(shown.length - bottomCount) : []);

    /** שינוי סינון/מיון מחזיר את הרשימה למצב מקוצר — אחרת קופצים לאמצע רשימה אחרת */
    function resetView() {
        expanded = false;
        showBottom = false;
        syncUrl();
    }

    function clearFilters() {
        query = '';
        orgFilter = '';
        ratedOnly = false;
        resetView();
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

    <!-- סרגל כלים: חיפוש + מיון + סינון + הצעה -->
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

    <!-- מסננים: ארגון + "דורגו בלבד" -->
    {#if officials.length > 1}
        <div class="flex flex-wrap items-center gap-2">
            {#if orgs.length > 1}
                <label class="flex items-center gap-1.5 text-xs text-gray-400">
                    <span>{group.orgLabel}:</span>
                    <select
                        bind:value={orgFilter}
                        onchange={resetView}
                        class="max-w-56 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-white focus:border-blue-400/60 focus:outline-none"
                    >
                        <option value="" class="bg-slate-900">הכל ({officials.length})</option>
                        {#each orgs as o (o.name)}
                            <option value={o.name} class="bg-slate-900">{o.name} ({o.count})</option>
                        {/each}
                    </select>
                </label>
            {/if}

            <button
                type="button"
                onclick={() => { ratedOnly = !ratedOnly; resetView(); }}
                aria-pressed={ratedOnly}
                class="cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors {ratedOnly
                    ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-gray-200'}"
            >✅ שכבר דורגו</button>

            {#if anyFilter}
                <span class="text-xs text-gray-500">{shown.length} תוצאות</span>
                <button
                    type="button"
                    onclick={clearFilters}
                    class="cursor-pointer text-xs text-gray-500 underline transition-colors hover:text-gray-300"
                >ניקוי מסננים</button>
            {/if}
        </div>
    {/if}

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
        <!-- סינון ללא תוצאות -->
        <div class="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <p class="mb-1 font-bold text-white">
                {#if query.trim()}
                    לא נמצאו תוצאות עבור "{query}"
                {:else}
                    אין מדורגים התואמים למסננים שנבחרו
                {/if}
            </p>
            <p class="mb-3 text-sm text-gray-400">נסו לנקות את המסננים, או הציעו להוסיף מדורג לרשימה</p>
            <div class="flex flex-wrap justify-center gap-2">
                <button
                    type="button"
                    onclick={clearFilters}
                    class="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-300 transition-colors hover:bg-white/10"
                >ניקוי מסננים</button>
                <a href="/suggest?group={group.key}" class="btn-premium inline-block rounded-xl px-5 py-2 text-sm font-bold text-white">
                    ➕ הציעו לדירוג
                </a>
            </div>
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
                    onclick={() => { expanded = true; syncUrl(); }}
                    class="cursor-pointer rounded-full border border-white/10 bg-white/5 px-6 py-2 text-sm font-bold text-blue-300 transition-colors hover:bg-white/10"
                >פתח עוד ({middle.length - FEATURED}) ⌄</button>
            </div>
        {/if}

        <!-- תחתית הרשימה — מכוסה עד לחיצה על הכותרת -->
        {#if expanded && bottom.length > 0}
            <button
                type="button"
                onclick={() => { showBottom = !showBottom; syncUrl(); }}
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

    <!-- "למה הסדר לא לפי הממוצע?" — התשובה במקום שבו השאלה נשאלת -->
    {#if officials.length > 0}
        <div class="pt-2">
            <FaqAccordion items={FAQ_COMPACT} title="איך עובד הדירוג?" compact />
            <p class="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-center text-xs text-gray-500">
                <a href="/about#methodology" class="text-blue-400/80 hover:text-blue-300">
                    לכל השאלות והתשובות ←
                </a>
                <a href="/officials" class="text-blue-400/80 hover:text-blue-300">
                    אינדקס כל המדורגים ←
                </a>
            </p>
        </div>
    {/if}
</section>
