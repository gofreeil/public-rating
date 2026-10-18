<script lang="ts">
    // פאנל הניהול הפרוס באזור האישי (כמו /profile#admin בגמ"ח הארצי):
    // התראת "ממתין לטיפול" ראשונה, ואחריה אריח לכל מסך ניהול — מונה
    // משולב בשורת התיאור, ובועה אדומה כשיש במסך מה לאשר.
    import { adminNav, type AdminNavRole } from '$lib/adminNav';
    import { relDate } from '$lib/rating/time';

    interface Props {
        admin: {
            role: AdminNavRole;
            pending: { ads: number; officials: number; proposals: number; reports: number; total: number };
            overview: { officials: number; reviews: number; liveAds: number };
            pendingAds: { id: string; title: string; submittedAt: string }[];
            users: number;
            admins: number;
        };
    }
    let { admin }: Props = $props();

    const now = Date.now();
    const isSuper = $derived(admin.role === 'super_admin');
    const tiles = $derived(adminNav(admin.role));

    function tileCount(href: string): string {
        switch (href) {
            case '/admin/officials': return `${admin.overview.officials} מדורגים`;
            case '/admin/proposals': return `${admin.pending.proposals} ממתינות`;
            case '/admin/reports': return `${admin.pending.reports} פתוחים`;
            case '/admin/ads': return `${admin.overview.liveAds} באוויר`;
            case '/admin/users': return `${admin.users} משתמשים`;
            case '/admin/admins': return `${admin.admins} אדמינים`;
            case '/admin/stats': return `${admin.overview.reviews} דירוגים`;
            default: return '';
        }
    }

    // הבועה על אריח = מה שממתין בו לטיפול; הסכום הוא הבועה שבהאדר
    const tileAlerts: Record<string, number> = $derived({
        '/admin/officials': admin.pending.officials,
        '/admin/proposals': admin.pending.proposals,
        '/admin/reports': admin.pending.reports,
        '/admin/ads': admin.pending.ads,
    });

    const pendingChips = $derived(
        [
            { href: '/admin/ads', icon: '📢', n: admin.pending.ads, label: 'פרסומות לאישור' },
            { href: '/admin/officials', icon: '🗳️', n: admin.pending.officials, label: 'הצעות מדורגים' },
            { href: '/admin/proposals', icon: '📜', n: admin.pending.proposals, label: 'הצעות אזרחיות' },
            { href: '/admin/reports', icon: '🚩', n: admin.pending.reports, label: 'דיווחים' },
        ].filter((c) => c.n > 0),
    );
</script>

<section id="admin" class="scroll-mt-24 rounded-2xl border border-emerald-500/30 bg-slate-800/80 p-3 sm:p-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="flex items-center gap-2 text-lg font-black text-white">
            🛠️ ניהול האתר
            <span class="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-black {isSuper ? 'text-amber-300' : 'text-emerald-300'}">
                {isSuper ? '★ סופר-אדמין' : 'אדמין'}
            </span>
        </h2>
        <span class="text-xs text-gray-400">כל מסכי הניהול — בלחיצה אחת</span>
    </div>

    <!-- מה שממתין לטיפול — הדבר הראשון שאדמין רואה, ונעלם מעצמו כשמישהו מטפל -->
    {#if admin.pending.total > 0}
        <div class="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-2.5">
            <div class="flex flex-wrap items-center gap-2">
                <p class="flex items-center gap-2 text-sm font-black text-rose-100">
                    <span class="relative flex h-2.5 w-2.5" aria-hidden="true">
                        <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                        <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                    </span>
                    {admin.pending.total === 1 ? 'פריט אחד ממתין לטיפול' : `${admin.pending.total} פריטים ממתינים לטיפול`}
                </p>
                {#each pendingChips as c (c.href)}
                    <a href={c.href} class="rounded-full border border-rose-400/40 bg-rose-500/15 px-2.5 py-0.5 text-xs font-bold text-rose-100 transition hover:bg-rose-500/30">
                        {c.icon} {c.n} {c.label}
                    </a>
                {/each}
            </div>
            {#if admin.pendingAds.length}
                <ul class="mt-2 flex flex-col gap-1">
                    {#each admin.pendingAds as ad (ad.id)}
                        <li>
                            <a href="/admin/ads#ad-{ad.id}" class="flex items-center justify-between gap-2 rounded-lg border border-rose-500/20 bg-slate-900/50 px-2.5 py-1.5 text-sm transition hover:border-rose-400/60">
                                <span class="truncate font-bold text-white">📢 {ad.title}</span>
                                <span class="flex-shrink-0 text-[11px] text-gray-400">{relDate(ad.submittedAt, now)} ←</span>
                            </a>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
    {/if}

    <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {#each tiles as tile (tile.href)}
            {@const count = tileCount(tile.href)}
            {@const alert = tileAlerts[tile.href] ?? 0}
            <a
                href={tile.href}
                class="relative flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:border-white/20 hover:bg-white/10"
            >
                {#if alert > 0}
                    <span class="absolute -top-2 -left-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-black leading-none text-white shadow-lg ring-2 ring-slate-800">
                        <span class="sr-only">ממתינים לטיפול: </span>{alert}
                    </span>
                {/if}
                <span class="text-xl" aria-hidden="true">{tile.icon}</span>
                <span class="min-w-0">
                    <span class="block truncate text-sm font-bold text-white">
                        {tile.title}{#if tile.superOnly}<span class="text-amber-300" title="סופר-אדמין בלבד"> ★</span>{/if}
                    </span>
                    <!-- המונה בתחילת שורת התיאור, כדי שה-truncate לא יבלע אותו -->
                    <span class="block truncate text-[11px] text-gray-400">{count ? `${count} · ` : ''}{tile.desc}</span>
                </span>
            </a>
        {/each}
    </div>
</section>
