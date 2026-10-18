<script lang="ts">
    // ניהול אדמינים (כמו בגמ"ח הארצי): חיפוש חי בין המשתמשים הרשומים
    // והוספה בלחיצה, ומתחת — רשימת האדמינים עם שינוי תפקיד והסרה.
    import { enhance } from '$app/forms';
    import Seo from '$lib/components/rating/Seo.svelte';
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    interface UserHit { id: string; name: string; email: string; phone: string; role: string }

    let query = $state('');
    let picked = $state<UserHit | null>(null);
    let newRole = $state<'rating_admin' | 'super_admin'>('rating_admin');
    let hits = $state<UserHit[]>([]);
    let fuzzy = $state(false); // התוצאות הן "דומים" (שגיאת כתיב) ולא התאמה מדויקת
    let searching = $state(false);
    let searched = $state(false);
    let searchError = $state('');
    let searchTimer: ReturnType<typeof setTimeout> | undefined;
    let searchSeq = 0; // מגן מפני תשובות שהגיעו באיחור

    function onInput() {
        picked = null;
        searched = false;
        searchError = '';
        clearTimeout(searchTimer);
        const q = query.trim();
        if (q.length < 2) {
            hits = [];
            return;
        }
        searchTimer = setTimeout(() => runSearch(q), 350);
    }

    async function runSearch(q: string) {
        const seq = ++searchSeq;
        searching = true;
        try {
            const res = await fetch(`/admin/admins/search?q=${encodeURIComponent(q)}`);
            const body = await res.json();
            if (seq !== searchSeq) return; // הוקלד ערך חדש בינתיים
            hits = body.users ?? [];
            fuzzy = body.fuzzy ?? false;
            searchError = body.error ?? '';
            searched = true;
        } catch {
            if (seq !== searchSeq) return;
            hits = [];
            fuzzy = false;
            searchError = 'החיפוש נכשל — נסו שוב';
            searched = true;
        } finally {
            if (seq === searchSeq) searching = false;
        }
    }

    function pick(u: UserHit) {
        picked = u;
        query = u.name || u.email || u.phone;
        hits = [];
        searched = false;
        searchSeq++; // מבטל חיפוש שעדיין רץ
        clearTimeout(searchTimer);
    }

    const ROLE_LABEL: Record<string, string> = { super_admin: 'סופר-אדמין', rating_admin: 'אדמין', user: 'משתמש' };
    const inputCls =
        'w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-400/60 focus:outline-none';
</script>

<Seo title="ניהול אדמינים" description="מינוי והסרה של אדמינים" noindex />

<div class="flex max-w-3xl flex-col gap-3">
    <h2 class="text-lg font-black">🔑 ניהול אדמינים</h2>

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

    <!-- הוספה -->
    <section class="rounded-2xl border border-white/10 bg-slate-800/80 p-3">
        <h3 class="mb-2 text-sm font-bold">➕ הוספת אדמין</h3>
        <form
            method="POST"
            action="?/setRole"
            class="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]"
            use:enhance={() => async ({ result, update }) => {
                await update();
                if (result.type === 'success') {
                    picked = null;
                    query = '';
                }
            }}
        >
            <div>
                <input
                    placeholder="חיפוש משתמש רשום לפי שם / אימייל / טלפון"
                    bind:value={query}
                    oninput={onInput}
                    autocomplete="off"
                    class={inputCls}
                />
                <input type="hidden" name="userId" value={picked?.id ?? ''} />

                {#if searching}
                    <div class="mt-1.5 rounded-xl bg-white/5 px-3 py-2 text-sm text-gray-300">🔍 מחפש בין המשתמשים הרשומים…</div>
                {:else if hits.length > 0}
                    {#if fuzzy}
                        <div class="mt-1.5 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-100">
                            לא נמצאה התאמה מדויקת ל"{query.trim()}" — אולי התכוונת לאחד מאלה:
                        </div>
                    {/if}
                    <div class="mt-1.5 divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-slate-900/80">
                        {#each hits as u (u.id)}
                            <button type="button" onclick={() => pick(u)} class="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-right transition-colors hover:bg-white/5">
                                <span aria-hidden="true">👤</span>
                                <span class="min-w-0 flex-1">
                                    <span class="block truncate font-bold text-white">{u.name || u.email || u.phone}</span>
                                    <span class="block truncate text-xs text-gray-400" dir="ltr">{u.email || u.phone}</span>
                                </span>
                                {#if u.role !== 'user'}
                                    <span class="text-[11px] text-emerald-300">כבר {ROLE_LABEL[u.role]}</span>
                                {:else}
                                    <span class="text-xs text-purple-300">בחירה</span>
                                {/if}
                            </button>
                        {/each}
                    </div>
                {:else if searchError}
                    <div class="mt-1.5 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">{searchError}</div>
                {:else if searched && query.trim().length >= 2}
                    <div class="mt-1.5 rounded-xl bg-white/5 px-3 py-2 text-sm text-gray-300">
                        לא נמצא משתמש רשום התואם ל"{query.trim()}". אדמין חייב להיות רשום באתר — בקשו ממנו להתחבר פעם אחת ואז חפשו שוב.
                    </div>
                {/if}
            </div>
            <select name="role" bind:value={newRole} class="h-fit rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white focus:outline-none">
                <option value="rating_admin" class="bg-slate-900">אדמין</option>
                <option value="super_admin" class="bg-slate-900">סופר-אדמין</option>
            </select>
            <button type="submit" disabled={!picked} class="btn-premium h-fit cursor-pointer rounded-xl px-5 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                הוסף
            </button>
        </form>
        <p class="mt-1.5 text-xs text-gray-500">
            אדמין: אישור ודחייה של מדורגים, הצעות, דיווחים ופרסומות. סופר-אדמין: גם משתמשים, אדמינים, סטטיסטיקה ומחיקות לצמיתות.
            ההרשאה נכנסת לתוקף בהתחברות הבאה של המשתמש.
        </p>
    </section>

    <!-- רשימת האדמינים -->
    <section class="rounded-2xl border border-white/10 bg-slate-800/80 p-3">
        <h3 class="mb-2 text-sm font-bold">אדמינים ({data.admins.length})</h3>
        <div class="flex flex-col gap-1.5">
            {#each data.admins as a (a.id)}
                {@const locked = a.owner || a.id === data.currentUserId}
                <div class="flex flex-wrap items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                    <span class="text-lg" aria-hidden="true">{a.role === 'super_admin' || a.owner ? '★' : '👤'}</span>
                    <a href="/admin/users/{encodeURIComponent(a.id)}" class="min-w-0 flex-1 hover:underline">
                        <span class="block truncate font-bold text-white">{a.name || a.email}</span>
                        <span class="block truncate text-xs text-gray-400" dir="ltr" style="text-align: right">{a.email || a.phone}</span>
                    </a>
                    {#if locked}
                        <span class="text-xs text-amber-300">{a.owner ? 'בעל האתר ★' : 'את/ה'}</span>
                    {:else}
                        <form method="POST" action="?/setRole" use:enhance>
                            <input type="hidden" name="userId" value={a.id} />
                            <select
                                name="role"
                                aria-label="תפקיד של {a.name || a.email}"
                                onchange={(e) => e.currentTarget.form?.requestSubmit()}
                                class="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white focus:outline-none"
                            >
                                <option value="rating_admin" selected={a.role === 'rating_admin'}>אדמין</option>
                                <option value="super_admin" selected={a.role === 'super_admin'}>סופר-אדמין</option>
                            </select>
                        </form>
                        <form
                            method="POST"
                            action="?/setRole"
                            use:enhance={({ cancel }) => {
                                if (!confirm(`להסיר את ${a.name || a.email} מצוות הניהול?`)) cancel();
                            }}
                        >
                            <input type="hidden" name="userId" value={a.id} />
                            <input type="hidden" name="role" value="user" />
                            <button class="h-7 w-7 cursor-pointer rounded-lg bg-red-900/30 text-red-300 transition-colors hover:bg-red-900/60" title="הסר מצוות הניהול">🗑️</button>
                        </form>
                    {/if}
                </div>
            {:else}
                <p class="text-sm text-gray-400">אין עדיין אדמינים. השתמשו בטופס למעלה כדי להוסיף.</p>
            {/each}
        </div>
    </section>
</div>
