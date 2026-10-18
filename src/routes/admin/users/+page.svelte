<script lang="ts">
    // רשימת המשתמשים (סופר-אדמין) — כמו בקהילה בשכונה: שם לחיץ לפרופיל
    // המלא, פרטי קשר ותאריך הרשמה בשורה אחת, תפקיד וחסימה מהשורה.
    import { enhance } from '$app/forms';
    import { heMatches } from '$lib/rating/heSearch';
    import Seo from '$lib/components/rating/Seo.svelte';
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let searchQuery = $state('');
    let roleFilter = $state<'all' | 'user' | 'rating_admin' | 'super_admin' | 'banned'>('all');
    // הרשימה ארוכה — מציגים מנה ראשונה ומרחיבים בלחיצה (פחות גלילה)
    const PAGE = 50;
    let shown = $state(PAGE);

    // טלפון בשני הפורמטים (05… / 9725…) — חיפוש מספר ימצא גם פורמט בינלאומי
    function phoneVariants(p: string | null | undefined): string[] {
        const d = (p ?? '').replace(/\D/g, '');
        if (!d) return [];
        const local = d.startsWith('972') ? '0' + d.slice(3) : d;
        const intl = local.startsWith('0') ? '972' + local.slice(1) : local;
        return [d, local, intl];
    }

    const filtered = $derived.by(() => {
        let list = data.users;
        if (searchQuery.trim()) {
            list = list.filter((u) =>
                heMatches(searchQuery, u.name, u.email, u.id, u.city, ...phoneVariants(u.phone)),
            );
        }
        if (roleFilter === 'banned') list = list.filter((u) => u.banned);
        else if (roleFilter !== 'all') list = list.filter((u) => u.role === roleFilter);
        return list;
    });

    const counts = $derived({
        admins: data.users.filter((u) => u.role !== 'user').length,
        banned: data.users.filter((u) => u.banned).length,
    });

    const ROLE_BADGE: Record<string, { text: string; cls: string }> = {
        super_admin: { text: 'סופר-אדמין ★', cls: 'border-amber-400/40 bg-amber-500/15 text-amber-300' },
        rating_admin: { text: 'אדמין', cls: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300' },
        user: { text: 'משתמש', cls: 'border-white/10 bg-white/5 text-gray-400' },
    };

    function fmtDay(iso: string): string {
        const d = new Date(iso);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString('he-IL');
    }

    const inputCls =
        'rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-400/60 focus:outline-none';
</script>

<Seo title="משתמשים — ניהול" description="ניהול משתמשי האתר" noindex />

<div class="flex flex-col gap-3">
    <header class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 class="text-lg font-black">👥 משתמשים ({data.users.length})</h2>
        <span class="text-xs text-gray-400">{counts.admins} בתפקיד ניהולי · {counts.banned} חסומים</span>
    </header>

    {#if data.backendUnavailable}
        <p class="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            ⚠️ לא ניתן לטעון את רשימת המשתמשים כרגע — הבאקאנד אינו זמין
        </p>
    {/if}
    {#if form?.success}
        <p class="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">✅ {form.message}</p>
    {:else if form?.error}
        <p class="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{form.error}</p>
    {/if}

    <div class="flex flex-wrap gap-2">
        <input
            type="search"
            placeholder="🔎 חיפוש לפי שם, אימייל, טלפון או עיר…"
            bind:value={searchQuery}
            oninput={() => (shown = PAGE)}
            class="min-w-[200px] flex-1 {inputCls}"
        />
        <select bind:value={roleFilter} onchange={() => (shown = PAGE)} class={inputCls}>
            <option value="all" class="bg-slate-900">כל המשתמשים</option>
            <option value="user" class="bg-slate-900">משתמשים רגילים</option>
            <option value="rating_admin" class="bg-slate-900">אדמינים</option>
            <option value="super_admin" class="bg-slate-900">סופר-אדמינים</option>
            <option value="banned" class="bg-slate-900">חסומים</option>
        </select>
    </div>

    <div class="flex flex-col gap-1.5">
        {#each filtered.slice(0, shown) as user (user.id)}
            {@const badge = ROLE_BADGE[user.role]}
            {@const isMe = user.id === data.currentUserId}
            <div class="flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2 transition-colors hover:border-white/20 sm:flex-row sm:items-center sm:gap-3">
                <a href="/admin/users/{encodeURIComponent(user.id)}" title="לפרופיל המלא" class="user-link flex min-w-0 flex-1 items-center gap-3">
                    {#if user.avatar_url}
                        <img src={user.avatar_url} alt="" width="36" height="36" loading="lazy" decoding="async" referrerpolicy="no-referrer" class="h-9 w-9 flex-shrink-0 rounded-full object-cover" />
                    {:else}
                        <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm font-bold text-gray-300">
                            {(user.name ?? '?')[0]}
                        </span>
                    {/if}
                    <span class="min-w-0">
                        <span class="user-name flex items-center gap-1.5 truncate font-bold text-white">
                            {user.name ?? 'ללא שם'}
                            {#if user.banned}
                                <span class="rounded-full border border-red-500/30 bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-300">חסום</span>
                            {/if}
                            {#if isMe}<span class="text-[10px] text-gray-500">(את/ה)</span>{/if}
                        </span>
                        <span class="block truncate text-xs text-gray-500" dir="ltr" style="text-align: right">
                            {[user.phone, user.email].filter(Boolean).join(' · ')}{user.created_at ? ` · ${fmtDay(user.created_at)}` : ''}
                        </span>
                    </span>
                </a>

                <div class="flex flex-wrap items-center gap-1.5">
                    {#if user.reviews > 0}
                        <span class="rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-300" title="דירוגים שפרסם">⭐ {user.reviews}</span>
                    {/if}
                    {#if user.city}<span class="text-xs text-gray-400">{user.city}</span>{/if}
                    <span class="rounded-full border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap {badge.cls}">{badge.text}</span>
                </div>

                {#if !isMe}
                    <div class="flex flex-shrink-0 flex-wrap items-center gap-1.5">
                        <!-- מינוי תפקיד מהשורה — בחירה שולחת מיד, אחרי אישור -->
                        <form method="POST" action="?/setRole" use:enhance>
                            <input type="hidden" name="userId" value={user.id} />
                            <select
                                name="role"
                                aria-label="תפקיד של {user.name ?? user.id}"
                                onchange={(e) => {
                                    const sel = e.currentTarget;
                                    if (confirm(`לשנות את התפקיד של ${user.name ?? user.id}?`)) sel.form?.requestSubmit();
                                    else sel.value = user.role;
                                }}
                                class="rounded-lg border border-purple-400/30 bg-purple-500/10 px-2 py-1 text-xs font-bold text-purple-200 focus:outline-none"
                            >
                                <option value="user" selected={user.role === 'user'} class="bg-slate-900">משתמש</option>
                                <option value="rating_admin" selected={user.role === 'rating_admin'} class="bg-slate-900">אדמין</option>
                                <option value="super_admin" selected={user.role === 'super_admin'} class="bg-slate-900">סופר-אדמין</option>
                            </select>
                        </form>
                        {#if user.banned}
                            <form method="POST" action="?/unban" use:enhance>
                                <input type="hidden" name="userId" value={user.id} />
                                <button type="submit" class="cursor-pointer rounded-lg border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-bold text-green-300 hover:bg-green-500/20">✅ בטל חסימה</button>
                            </form>
                        {:else}
                            <form
                                method="POST"
                                action="?/ban"
                                use:enhance={({ cancel }) => {
                                    if (!confirm(`לחסום את ${user.name ?? user.id}?`)) cancel();
                                }}
                            >
                                <input type="hidden" name="userId" value={user.id} />
                                <button type="submit" class="cursor-pointer rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-300 hover:bg-red-500/20">🚫 חסום</button>
                            </form>
                        {/if}
                    </div>
                {/if}
            </div>
        {:else}
            <p class="py-10 text-center text-sm text-gray-500">{searchQuery ? 'לא נמצאו משתמשים' : 'אין משתמשים עדיין'}</p>
        {/each}
    </div>

    {#if filtered.length > shown}
        <button
            type="button"
            onclick={() => (shown += PAGE)}
            class="cursor-pointer self-center rounded-xl border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-bold text-gray-300 hover:bg-white/10"
        >
            הצג עוד ({filtered.length - shown} נוספים)
        </button>
    {/if}
</div>

<style>
    /* קו תחתון לשם בריחוף — group-hover שבור ב-Tailwind v4 */
    .user-link:hover .user-name {
        text-decoration: underline;
    }
</style>
