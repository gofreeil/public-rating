<script lang="ts">
    // סטטיסטיקה (סופר-אדמין) — כמו בקהילה בשכונה: באנר מונים, הגרף הראשי
    // ולוח המכוונים של השרת (תמונת-מצב מרגע הכניסה, רענון ידני ב-↻).
    import { fmtScore } from '$lib/rating/aggregate';
    import Seo from '$lib/components/rating/Seo.svelte';
    import ServerHealthGauges from '$lib/components/ServerHealthGauges.svelte';
    import StatsSummaryChart from '$lib/components/StatsSummaryChart.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
    const t = $derived(data.totals);

    const CARDS = $derived([
        { href: '/admin/users', label: 'משתמשים', n: t.users, sub: `+${t.usersThisMonth} החודש`, cls: 'border-violet-500/25 from-violet-600/15 to-violet-500/5 text-violet-200/80' },
        { href: '/top-rated', label: 'דירוגים', n: t.reviews, sub: `+${t.reviewsThisMonth} החודש · ${t.raters} מדרגים`, cls: 'border-amber-500/25 from-amber-600/15 to-amber-500/5 text-amber-200/80' },
        { href: '/admin/officials', label: 'מדורגים', n: t.officials, sub: `ממוצע ציון ${fmtScore(t.avgScore)}`, cls: 'border-sky-500/25 from-sky-600/15 to-sky-500/5 text-sky-200/80' },
        { href: '/admin/ads', label: 'פרסומות באוויר', n: t.liveAds, sub: `${t.proposals} הצעות אזרחיות`, cls: 'border-emerald-500/25 from-emerald-600/15 to-emerald-500/5 text-emerald-200/80' },
    ]);
</script>

<Seo title="סטטיסטיקה — ניהול" description="סטטיסטיקת האתר ומצב השרת" noindex />

<div class="flex flex-col gap-3">
    <h2 class="text-lg font-black">📈 סטטיסטיקה</h2>

    <!-- באנר מונים — כל כרטיס קישור למסך הרלוונטי -->
    <div class="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {#each CARDS as c (c.label)}
            <a href={c.href} class="block rounded-2xl border bg-gradient-to-br p-3 transition-all hover:brightness-125 {c.cls}">
                <div class="text-xs font-bold">{c.label}</div>
                <div class="text-3xl leading-none font-black text-white">{c.n.toLocaleString('he-IL')}</div>
                <div class="mt-1 text-[11px] text-gray-400">{c.sub}</div>
            </a>
        {/each}
    </div>

    <div class="grid items-stretch gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <StatsSummaryChart
            series={[
                { key: 'reg', label: 'נרשמים', byMonth: data.registrations, bar: 'from-violet-600 to-fuchsia-400', dot: 'bg-violet-400', text: 'text-violet-300' },
                { key: 'rev', label: 'דירוגים', byMonth: data.reviewsByMonth, bar: 'from-amber-600 to-amber-400', dot: 'bg-amber-400', text: 'text-amber-300' },
            ]}
        />
        <!-- פילוח לפי לוח -->
        <div class="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <h3 class="text-base font-black">🗂️ לפי לוח</h3>
            {#each data.groups as g (g.key)}
                <div class="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                    <span class="font-bold">{g.icon} {g.title}</span>
                    <span class="text-xs text-gray-400">
                        <b class="text-white">{g.officials}</b> מדורגים · <b class="text-amber-300">{g.reviews}</b> דירוגים
                    </span>
                </div>
            {/each}
        </div>
    </div>

    <!-- לוח המכוונים של השרת המשותף (api.gofreeil.com) -->
    <ServerHealthGauges initial={data.serverHealth} live={false} />
</div>
