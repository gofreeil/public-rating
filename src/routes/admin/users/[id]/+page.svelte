<script lang="ts">
    // הפרופיל המלא של משתמש (סופר-אדמין): פרטים ופעולות בכרטיס אחד,
    // ומתחתיו מה שעשה באתר — דירוגים, הצעות מדורגים ופרסומות.
    import { enhance } from '$app/forms';
    import { fmtScore } from '$lib/rating/aggregate';
    import { relDate } from '$lib/rating/time';
    import Seo from '$lib/components/rating/Seo.svelte';
    import Stars from '$lib/components/rating/Stars.svelte';
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    const now = Date.now();
    const u = $derived(data.user);
    const locked = $derived(data.isMe || data.isOwner);

    const ROLE_LABEL: Record<string, string> = {
        super_admin: 'סופר-אדמין ★',
        rating_admin: 'אדמין',
        user: 'משתמש',
    };
    const AD_STATUS: Record<string, string> = {
        approved: '✅ מאושרת',
        pending: '⏳ ממתינה',
        rejected: '❌ נדחתה',
    };

    function fmtDay(iso: string): string {
        const d = new Date(iso);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString('he-IL');
    }
</script>

<Seo title="{u.name ?? 'משתמש'} — ניהול" description="פרופיל משתמש בפאנל הניהול" noindex />

<div class="flex flex-col gap-3">
    <a href="/admin/users" class="text-xs text-gray-400 hover:text-white">← לרשימת המשתמשים</a>

    {#if form?.success}
        <p class="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">✅ {form.message}</p>
    {:else if form?.error}
        <p class="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{form.error}</p>
    {/if}

    <!-- כרטיס המשתמש: פרטים + פעולות זה לצד זה -->
    <section class="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-slate-800/80 p-3">
        {#if u.avatar_url}
            <img src={u.avatar_url} alt="" width="56" height="56" referrerpolicy="no-referrer" class="h-14 w-14 rounded-full object-cover" />
        {:else}
            <span class="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-xl font-black">
                {(u.name ?? '?')[0]}
            </span>
        {/if}
        <div class="min-w-0 flex-1">
            <h2 class="flex flex-wrap items-center gap-2 text-lg font-black">
                {u.name ?? 'ללא שם'}
                {#if u.nickname}<span class="text-sm font-normal text-gray-400">({u.nickname})</span>{/if}
                <span class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-bold text-gray-300">{ROLE_LABEL[u.role]}</span>
                {#if u.banned}<span class="rounded-full border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-[11px] text-red-300">חסום</span>{/if}
            </h2>
            <p class="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
                {#if u.email}<span dir="ltr">📧 {u.email}</span>{/if}
                {#if u.phone}<span dir="ltr">📞 {u.phone}</span>{/if}
                {#if u.city || u.neighborhood}<span>📍 {[u.city, u.neighborhood].filter(Boolean).join(' · ')}</span>{/if}
                {#if u.provider}<span>🔑 {u.provider}</span>{/if}
                {#if u.created_at}<span>📅 נרשם {fmtDay(u.created_at)}</span>{/if}
            </p>
        </div>

        {#if !locked}
            <div class="flex flex-wrap items-center gap-1.5">
                <form method="POST" action="?/setRole" use:enhance class="flex items-center gap-1">
                    <input type="hidden" name="userId" value={u.id} />
                    <select name="role" class="rounded-lg border border-purple-400/30 bg-purple-500/10 px-2 py-1 text-xs font-bold text-purple-200 focus:outline-none">
                        <option value="user" selected={u.role === 'user'} class="bg-slate-900">משתמש</option>
                        <option value="rating_admin" selected={u.role === 'rating_admin'} class="bg-slate-900">אדמין</option>
                        <option value="super_admin" selected={u.role === 'super_admin'} class="bg-slate-900">סופר-אדמין</option>
                    </select>
                    <button type="submit" class="cursor-pointer rounded-lg border border-purple-400/30 bg-purple-500/15 px-2.5 py-1 text-xs font-bold text-purple-200 hover:bg-purple-500/25">🛡️ שמור תפקיד</button>
                </form>
                {#if u.banned}
                    <form method="POST" action="?/unban" use:enhance>
                        <input type="hidden" name="userId" value={u.id} />
                        <button type="submit" class="cursor-pointer rounded-lg border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-bold text-green-300 hover:bg-green-500/20">✅ בטל חסימה</button>
                    </form>
                {:else}
                    <form method="POST" action="?/ban" use:enhance={({ cancel }) => { if (!confirm(`לחסום את ${u.name ?? u.id}?`)) cancel(); }}>
                        <input type="hidden" name="userId" value={u.id} />
                        <button type="submit" class="cursor-pointer rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-300 hover:bg-red-500/20">🚫 חסום</button>
                    </form>
                {/if}
            </div>
        {:else}
            <span class="text-xs text-gray-500">{data.isMe ? 'זה החשבון שלך' : 'בעל האתר'} — אין שינויים מכאן</span>
        {/if}
    </section>

    <!-- הדירוגים שפרסם -->
    <section class="flex flex-col gap-1.5">
        <h3 class="text-sm font-black text-gray-300">⭐ דירוגים ({data.reviews.length})</h3>
        {#each data.reviews as r (r.id)}
            <div class="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-800/80 px-3 py-1.5 text-sm">
                <a href="/officials/{r.officialId}" class="font-bold text-white hover:text-blue-300">{r.officialName}</a>
                <Stars value={r.overall} size={13} />
                <span class="text-xs text-amber-300">{fmtScore(r.overall)}</span>
                {#if r.anonymous}<span class="text-[11px] text-gray-500">אנונימי</span>{/if}
                {#if r.text}<span class="min-w-0 flex-1 truncate text-xs text-gray-400">“{r.text}”</span>{/if}
                <span class="mr-auto text-[11px] text-gray-500">{relDate(r.updated_at, now)}</span>
            </div>
        {:else}
            <p class="text-xs text-gray-500">לא פרסם דירוגים</p>
        {/each}
    </section>

    {#if data.suggestions.length || data.ads.length}
        <div class="grid gap-3 sm:grid-cols-2">
            {#if data.suggestions.length}
                <section class="flex flex-col gap-1.5">
                    <h3 class="text-sm font-black text-gray-300">🗳️ הצעות מדורגים ממתינות ({data.suggestions.length})</h3>
                    {#each data.suggestions as s (s.id)}
                        <a href="/admin/officials" class="rounded-xl border border-amber-400/20 bg-amber-500/5 px-3 py-1.5 text-sm text-white hover:border-amber-400/50">
                            {s.name} <span class="text-xs text-gray-400">· {s.position}</span>
                        </a>
                    {/each}
                </section>
            {/if}
            {#if data.ads.length}
                <section class="flex flex-col gap-1.5">
                    <h3 class="text-sm font-black text-gray-300">📢 פרסומות ({data.ads.length})</h3>
                    {#each data.ads as a (a.id)}
                        <a href="/admin/ads#ad-{a.id}" class="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-800/80 px-3 py-1.5 text-sm hover:border-white/20">
                            <span class="truncate font-bold text-white">{a.title}</span>
                            <span class="flex-shrink-0 text-[11px] text-gray-400">{AD_STATUS[a.status] ?? a.status}</span>
                        </a>
                    {/each}
                </section>
            {/if}
        </div>
    {/if}
</div>
