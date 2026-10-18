<script lang="ts">
    // מסגרת פאנל הניהול (כמו בגמ"ח הארצי): כותרת עם התפקיד, חזרה, וסרגל
    // ניווט אחד לכל המסכים — מאותה רשימה שמוצגת פרוסה באזור האישי.
    import { page } from '$app/state';
    import { goto } from '$app/navigation';
    import { adminNav } from '$lib/adminNav';

    let { children, data } = $props();

    const isSuper = $derived(data.admin.role === 'super_admin');
    const nav = $derived(adminNav(data.admin.role));

    // הבועה על כל מסך = מה שממתין בו לטיפול (אותו מקור כמו הבועה שבהאדר)
    const alerts: Record<string, number> = $derived({
        '/admin/officials': data.pending.officials,
        '/admin/proposals': data.pending.proposals,
        '/admin/reports': data.pending.reports,
        '/admin/ads': data.pending.ads,
    });

    function active(href: string, exact: boolean, current: string) {
        return exact ? current === href : current === href || current.startsWith(href + '/');
    }

    // חזרה דף אחורה. בלי היסטוריה (כניסה ישירה לכתובת) — לפאנל שבאזור האישי.
    function goBack() {
        if (typeof history !== 'undefined' && history.length > 1) history.back();
        else goto('/my-ratings#admin');
    }
</script>

<div dir="rtl" class="flex flex-col gap-3 py-4 text-white">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-xl font-black">🛠️ פאנל ניהול</h1>
            <span class="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-gray-300">
                {data.admin.name || data.admin.email} ·
                {#if isSuper}
                    <span class="font-bold text-amber-300">סופר-אדמין ★</span>
                {:else}
                    <span class="font-bold text-emerald-300">אדמין</span>
                {/if}
            </span>
        </div>
        <div class="flex items-center gap-1.5">
            <button
                type="button"
                onclick={goBack}
                class="cursor-pointer rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
            >↩ חזור</button>
            <a
                href="/my-ratings#admin"
                class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
            >← לאזור האישי</a>
        </div>
    </div>

    <nav class="flex flex-wrap gap-1.5 border-b border-white/10 pb-3" aria-label="מסכי הניהול">
        {#each nav as item (item.href)}
            {@const alert = alerts[item.href] ?? 0}
            <a
                href={item.href}
                aria-current={active(item.href, item.exact, page.url.pathname) ? 'page' : undefined}
                class="relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold transition-all
                    {active(item.href, item.exact, page.url.pathname)
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'}"
            >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
                {#if alert > 0}
                    <span class="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-black leading-none text-white">
                        <span class="sr-only">ממתינים לטיפול: </span>{alert}
                    </span>
                {/if}
            </a>
        {/each}
    </nav>

    {@render children()}
</div>
