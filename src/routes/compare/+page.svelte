<script lang="ts">
    // השוואת מדורגים — מי טוב יותר, ובאיזה מדד בדיוק
    import { replaceState } from '$app/navigation';
    import { page } from '$app/state';
    import { browser } from '$app/environment';
    import { CRITERIA } from '$lib/rating/criteria';
    import { fmtScore } from '$lib/rating/aggregate';
    import { MAX_COMPARE, groupByKey } from '$lib/rating/types';
    import { heMatches } from '$lib/rating/heSearch';
    import { breadcrumbSchema } from '$lib/rating/schema';
    import Avatar from '$lib/components/rating/Avatar.svelte';
    import Seo from '$lib/components/rating/Seo.svelte';
    import ShareBar from '$lib/components/rating/ShareBar.svelte';
    import Stars from '$lib/components/rating/Stars.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    type Entry = PageData['index'][number];

    // מצב הבחירה מאותחל מה-URL — כך גם רינדור השרת מציג את ההשוואה הנכונה
    let selectedIds = $state<string[]>(
        (page.url.searchParams.get('ids') ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, MAX_COMPARE),
    );

    let query = $state('');

    const byId = $derived(new Map(data.index.map((o) => [o.id, o])));
    const selected = $derived(
        selectedIds.map((id) => byId.get(id)).filter((o): o is Entry => Boolean(o)),
    );

    const results = $derived.by(() => {
        const q = query.trim();
        if (!q) return [];
        return data.index
            .filter((o) => !selectedIds.includes(o.id) && heMatches(q, o.name, o.position, o.org))
            .slice(0, 6);
    });

    /** מציעים מדורגים מאותה קבוצה — השוואה בין ח"כ לשופט פחות מעניינת */
    const suggestions = $derived.by(() => {
        if (selected.length === 0 || selected.length >= MAX_COMPARE) return [];
        const group = selected[0].group;
        return data.index
            .filter((o) => o.group === group && !selectedIds.includes(o.id) && o.count > 0)
            .slice(0, 5);
    });

    function syncUrl() {
        if (!browser) return;
        const url = new URL(page.url);
        if (selectedIds.length) url.searchParams.set('ids', selectedIds.join(','));
        else url.searchParams.delete('ids');
        replaceState(url, {});
    }

    function add(id: string) {
        if (selectedIds.length >= MAX_COMPARE || selectedIds.includes(id)) return;
        selectedIds = [...selectedIds, id];
        query = '';
        syncUrl();
    }

    function remove(id: string) {
        selectedIds = selectedIds.filter((x) => x !== id);
        syncUrl();
    }

    function clearAll() {
        selectedIds = [];
        query = '';
        syncUrl();
    }

    // ---- חישובי ההשוואה ----

    /** הציון הגבוה ביותר בכל מדד — לסימון המוביל */
    const bestByCriterion = $derived.by(() => {
        const out: Record<string, number | null> = {};
        for (const c of CRITERIA) {
            const vals = selected
                .map((o) => o.perCriterion[c.key])
                .filter((v): v is number => typeof v === 'number');
            out[c.key] = vals.length ? Math.max(...vals) : null;
        }
        return out;
    });

    /** בכמה מדדים כל מדורג מוביל — לשורת הסיכום */
    const leadCounts = $derived.by(() => {
        const counts = new Map<string, number>();
        for (const c of CRITERIA) {
            const best = bestByCriterion[c.key];
            if (best === null) continue;
            const leaders = selected.filter((o) => o.perCriterion[c.key] === best);
            // תיקו בין כולם אינו הובלה
            if (leaders.length === selected.length) continue;
            for (const l of leaders) counts.set(l.id, (counts.get(l.id) ?? 0) + 1);
        }
        return counts;
    });

    const summary = $derived.by(() => {
        if (selected.length < 2) return '';
        const ranked = [...selected].sort(
            (a, b) => (leadCounts.get(b.id) ?? 0) - (leadCounts.get(a.id) ?? 0),
        );
        const top = ranked[0];
        const wins = leadCounts.get(top.id) ?? 0;
        if (wins === 0) return 'אין הכרעה — הציונים זהים בכל המדדים שדורגו';
        const tied = ranked.filter((o) => (leadCounts.get(o.id) ?? 0) === wins);
        if (tied.length > 1) return `תיקו: ${tied.map((o) => o.name).join(' ו')} מובילים ב-${wins} מדדים כל אחד`;
        return `${top.name} מוביל/ה ב-${wins} מתוך ${CRITERIA.length} המדדים`;
    });

    const shareText = $derived(
        selected.length >= 2
            ? `השוואה בדירוג ציבורי: ${selected.map((o) => `${o.name} (${fmtScore(o.average)})`).join(' מול ')}`
            : 'השוו נבחרי ועובדי ציבור זה מול זה בדירוג ציבורי',
    );

    const jsonLd = breadcrumbSchema([
        { name: 'דירוג ציבורי', path: '/' },
        { name: 'השוואת מדורגים', path: '/compare' },
    ]);

    const inputCls =
        'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-400/60 focus:outline-none';

    /** רוחב עמודה אחיד — הטבלה נגללת אופקית בנייד במקום להישבר */
    const gridCols = $derived(`minmax(6.5rem, 9rem) repeat(${selected.length}, minmax(8rem, 1fr))`);
</script>

<Seo
    title={selected.length >= 2 ? `${selected.map((o) => o.name).join(' מול ')} — השוואה` : 'השוואת מדורגים'}
    description={selected.length >= 2
        ? `${shareText}. השוואה לפי חמשת מדדי הדירוג הציבורי.`
        : 'השוו חברי כנסת, שופטים ועובדי ציבור זה מול זה לפי חמשת מדדי הדירוג — ציון כללי ופירוט לכל מדד.'}
    noindex={selected.length < 2}
    {jsonLd}
/>

<div class="flex flex-col gap-4 py-6">
    <header class="text-center">
        <h1 class="text-2xl font-black text-white sm:text-3xl">⚖️ השוואת מדורגים</h1>
        <p class="mt-1 text-sm text-gray-400">
            בחרו עד {MAX_COMPARE} נבחרי או עובדי ציבור וראו מי מוביל בכל מדד
        </p>
    </header>

    <!-- ---- בורר: צ'יפים של הנבחרים + חיפוש ---- -->
    <section class="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
        {#if selected.length}
            <div class="flex flex-wrap items-center gap-2">
                {#each selected as o (o.id)}
                    <span class="flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 py-1 ps-1 pe-2.5">
                        <Avatar name={o.name} image={o.image} size={24} />
                        <span class="text-sm font-bold text-white">{o.name}</span>
                        <button
                            type="button"
                            onclick={() => remove(o.id)}
                            aria-label="הסרת {o.name} מההשוואה"
                            class="cursor-pointer text-xs text-gray-400 transition-colors hover:text-red-300"
                        >✕</button>
                    </span>
                {/each}
                <button
                    type="button"
                    onclick={clearAll}
                    class="cursor-pointer text-xs text-gray-500 underline transition-colors hover:text-gray-300"
                >ניקוי הכל</button>
            </div>
        {/if}

        {#if selectedIds.length < MAX_COMPARE}
            <div class="relative">
                <input
                    type="search"
                    bind:value={query}
                    placeholder="🔍 הוספת מדורג להשוואה — שם, תפקיד או ארגון…"
                    aria-label="חיפוש מדורג להשוואה"
                    class={inputCls}
                />
                {#if results.length}
                    <ul class="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-white/10 bg-slate-800 shadow-2xl">
                        {#each results as o (o.id)}
                            <li>
                                <button
                                    type="button"
                                    onclick={() => add(o.id)}
                                    class="pick-opt flex w-full items-center gap-2.5 px-3 py-2 text-start"
                                >
                                    <Avatar name={o.name} image={o.image} size={30} />
                                    <span class="min-w-0 flex-1">
                                        <span class="block truncate text-sm font-bold text-white">{o.name}</span>
                                        <span class="block truncate text-xs text-gray-400">
                                            {o.position}{o.org ? ` · ${o.org}` : ''}
                                        </span>
                                    </span>
                                    <span class="text-xs font-bold text-amber-300 tabular-nums">
                                        {fmtScore(o.average)}
                                    </span>
                                </button>
                            </li>
                        {/each}
                    </ul>
                {:else if query.trim()}
                    <p class="absolute inset-x-0 top-full z-30 mt-1 rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-gray-400">
                        לא נמצא מדורג בשם "{query}"
                    </p>
                {/if}
            </div>
        {/if}

        {#if suggestions.length}
            <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-xs text-gray-500">הצעות מאותה קטגוריה:</span>
                {#each suggestions as o (o.id)}
                    <button
                        type="button"
                        onclick={() => add(o.id)}
                        class="suggest-chip cursor-pointer rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 transition-colors"
                    >➕ {o.name}</button>
                {/each}
            </div>
        {/if}
    </section>

    {#if selected.length < 2}
        <!-- ---- מצב ריק: הסבר + קיצור ללוחות ---- -->
        <div class="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
            <div class="text-4xl">⚖️</div>
            <p class="mt-2 font-bold text-white">
                {selected.length === 0 ? 'בחרו שני מדורגים כדי להתחיל' : 'בחרו מדורג נוסף כדי להשוות'}
            </p>
            <p class="mt-1 text-sm text-gray-400">
                ההשוואה מציגה את הציון הכללי ואת הפירוט לכל אחד מחמשת המדדים
            </p>
            <div class="mt-4 flex flex-wrap justify-center gap-2">
                {#each ['knesset', 'judges', 'public_servants'] as key (key)}
                    {@const g = groupByKey(key)}
                    {#if g}
                        <a href={g.route} class="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-bold text-white transition-colors hover:bg-white/10">
                            {g.icon} {g.title}
                        </a>
                    {/if}
                {/each}
            </div>
        </div>
    {:else}
        <!-- ---- שורת הכרעה ---- -->
        <div class="rounded-2xl border border-amber-400/25 bg-gradient-to-l from-amber-500/10 to-transparent p-3 text-center">
            <p class="font-black text-amber-300">🏅 {summary}</p>
        </div>

        <!-- ---- טבלת ההשוואה ---- -->
        <section class="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-3">
            <div class="min-w-fit">
                <!-- כותרות: מי מול מי -->
                <div class="grid items-end gap-2" style="grid-template-columns: {gridCols}">
                    <span></span>
                    {#each selected as o (o.id)}
                        <a href="/officials/{o.id}" class="head-cell flex flex-col items-center gap-1 rounded-xl p-2 text-center transition-colors">
                            <Avatar name={o.name} image={o.image} size={48} />
                            <span class="text-sm font-black text-white">{o.name}</span>
                            <span class="text-[11px] leading-tight text-gray-400">{o.position}</span>
                            <span class="text-2xl font-black text-amber-400 tabular-nums">{fmtScore(o.average)}</span>
                            <Stars value={o.average ?? 0} size={13} />
                            <span class="text-[11px] text-gray-500">
                                {o.count > 0 ? `${o.count} דירוגים` : 'טרם דורג'}
                            </span>
                        </a>
                    {/each}
                </div>

                <!-- שורה לכל מדד -->
                <div class="mt-2 flex flex-col gap-1.5">
                    {#each CRITERIA as c (c.key)}
                        {@const best = bestByCriterion[c.key]}
                        <div
                            class="grid items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-2"
                            style="grid-template-columns: {gridCols}"
                        >
                            <span class="text-xs font-bold text-gray-300" title={c.description}>
                                <span aria-hidden="true">{c.icon}</span> {c.short}
                            </span>
                            {#each selected as o (o.id)}
                                {@const v = o.perCriterion[c.key]}
                                {@const leads = typeof v === 'number' && best !== null && v === best && selected.length > 1}
                                <span class="flex flex-col gap-1">
                                    <span class="flex items-baseline justify-between gap-1">
                                        <span class="text-sm font-black tabular-nums {leads ? 'text-emerald-300' : 'text-gray-300'}">
                                            {fmtScore(v)}
                                        </span>
                                        {#if leads}
                                            <span class="text-[10px] font-bold text-emerald-400">מוביל</span>
                                        {/if}
                                    </span>
                                    <span class="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                                        <span
                                            class="block h-full rounded-full {leads
                                                ? 'bg-emerald-400'
                                                : 'bg-blue-400/70'}"
                                            style="width: {typeof v === 'number' ? (v / 5) * 100 : 0}%"
                                        ></span>
                                    </span>
                                </span>
                            {/each}
                        </div>
                    {/each}
                </div>
            </div>
        </section>

        <div class="flex flex-wrap items-center justify-between gap-3">
            <ShareBar text={shareText} title="השוואת מדורגים — דירוג ציבורי" />
            <span class="text-xs text-gray-500">
                מדד ללא ציון מסומן ב-— — טרם דורג על ידי הציבור
            </span>
        </div>
    {/if}

    <div class="text-center">
        <a href="/" class="text-sm text-blue-400 transition-colors hover:text-blue-300">← חזרה לדף הבית</a>
    </div>
</div>

<style>
    /* Tailwind v4: group-hover שבור — CSS מפורש */
    .pick-opt:hover,
    .suggest-chip:hover {
        background: rgba(255, 255, 255, 0.1);
    }
    .head-cell:hover {
        background: rgba(255, 255, 255, 0.06);
    }
</style>
