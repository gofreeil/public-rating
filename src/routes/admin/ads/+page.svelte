<script lang="ts">
    // ניהול הפרסומות — אישור, דחייה, הארכה, הסרה והזנה ידנית
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import { onDestroy, onMount } from 'svelte';
    import { AD_GRADIENTS, gradientCss } from '$lib/ads/gradients';
    import { heMatches } from '$lib/rating/heSearch';
    import { absDate } from '$lib/rating/time';
    import Seo from '$lib/components/rating/Seo.svelte';
    import AdCardPreview from '$lib/components/AdCardPreview.svelte';
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let showCreate = $state(false);

    // ===== טאבים, חיפוש, מיון ובחירה רב-פריטית — כמו בגמ"ח הארצי =====
    type Tab = 'pending' | 'live' | 'inactive' | 'trash';
    let activeTab = $state<Tab>('pending');
    let searchQuery = $state('');
    // 'default' = הממתינות לפי הגעה, שעל האוויר לפי המקום בטור
    let sortOrder = $state<'default' | 'newest' | 'oldest'>('default');

    let selected = $state<Set<string>>(new Set());
    function toggleSelect(id: string) {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        selected = next;
    }
    function clearSelection() {
        selected = new Set();
    }
    function setTab(t: Tab) {
        activeTab = t;
        clearSelection();
    }

    // עריכת הטקסטים בשורה (כותרת, משנה, כפתור, ריחוף)
    let editingId = $state<string | null>(null);
    let edit = $state({ title: '', subtitle: '', cta: '', hoverText: '' });
    function startEdit(ad: { id: string; title: string; subtitle: string; cta: string; hoverText: string }) {
        editingId = ad.id;
        edit = { title: ad.title, subtitle: ad.subtitle, cta: ad.cta, hoverText: ad.hoverText };
    }

    // רענון אוטומטי כל 30 שניות: חתימה קלה מ-/admin/ads/signal, ו-invalidateAll
    // (שמושך מחדש את כל המודעות עם התמונות) רק כשהיא השתנתה
    let autoRefresh = $state(true);
    let refreshTimer: ReturnType<typeof setInterval> | null = null;
    let lastSig: string | null = null;
    onMount(() => {
        // קישור ישיר למודעה (#ad-…) מהאזור האישי — פותח את הטאב שלה
        const m = location.hash.match(/^#ad-(.+)$/);
        if (m) {
            const ad = data.rows.find((a) => a.id === decodeURIComponent(m[1]));
            if (ad) {
                activeTab = ad.status === 'pending' ? 'pending' : ad.status === 'approved' && !ad.expired ? 'live' : 'inactive';
                setTimeout(() => document.getElementById(`ad-${ad.id}`)?.scrollIntoView({ block: 'center' }), 50);
            }
        }
        refreshTimer = setInterval(async () => {
            if (!autoRefresh || document.visibilityState !== 'visible' || editingId) return;
            try {
                const res = await fetch('/admin/ads/signal');
                if (!res.ok) return;
                const { sig } = (await res.json()) as { sig?: string };
                if (typeof sig !== 'string') return;
                // הפעימה הראשונה רק לומדת את המצב — הדף הרגע נטען
                if (lastSig !== null && sig !== lastSig) await invalidateAll();
                lastSig = sig;
            } catch {
                /* תקלת רשת זמנית — ננסה בפעימה הבאה */
            }
        }, 30_000);
    });
    onDestroy(() => {
        if (refreshTimer) clearInterval(refreshTimer);
    });

    // האשפה: הוסרו (שחזור) ופג תוקפן (חידוש)
    let trashPreview = $state<any>(null);
    function openTrashPreview(t: any) {
        trashPreview = t.card ?? data.rows.find((a) => a.id === t.id) ?? null;
    }

    // תצוגה מקדימה של הכרטיס כפי שהוא באמת מוצג בטור הפרסומות באתר:
    // ריחוף על כותרת מודעה שעל האוויר (דסקטופ) או הקשה עליה (נייד/דסקטופ)
    let previewableById = $derived(
        new Map(
            data.rows
                .filter((a) => a.status === 'approved' && !a.expired)
                .map((a) => [a.id, a] as const),
        ),
    );
    let hoverPreview = $state<{ id: string; x: number; y: number } | null>(null);
    let modalPreviewId = $state<string | null>(null);
    const PREVIEW_W = 144; // מידות הכרטיס האמיתי בטור (w-36 × h-[470px])
    const PREVIEW_H = 470;
    function openHoverPreview(e: MouseEvent, id: string) {
        if (!previewableById.has(id)) return;
        // מסך מגע — אין ריחוף אמיתי; ההקשה פותחת את המודאל במקום
        if (window.matchMedia('(hover: none)').matches) return;
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        // הכרטיס צף משמאל לכותרת, מוצמד לגבולות המסך (fixed) —
        // אחרת overflow של הכרטיס במסך היה חותך אותו
        const y = Math.max(
            8,
            Math.min(window.innerHeight - PREVIEW_H - 8, r.top + r.height / 2 - PREVIEW_H / 2),
        );
        const x = Math.max(8, r.left - PREVIEW_W - 16);
        hoverPreview = { id, x, y };
    }

    // ---- הלוח המספרי: בורר מקום עם אזהרת מקום תפוס והחלפה ----
    let slotOptions = $derived(Array.from({ length: data.slotCount }, (_, i) => i + 1));
    // מי תופסת כל מקום בלוח — גם מושהית/פגה שומרת את המקום שלה
    // extra = שכפל פרסומת: המקום תפוס בעותק נוסף של מודעה שמקומה הראשי אחר
    let slotOccupants = $derived.by(() => {
        const m = new Map<number, { id: string; title: string; extra?: boolean }>();
        const list = data.rows.filter((a) => a.status === 'approved');
        for (const a of list) {
            if (typeof a.slot === 'number') m.set(a.slot, { id: a.id, title: a.title });
        }
        for (const a of list) {
            for (const n of a.extraSlots ?? []) {
                if (!m.has(n)) m.set(n, { id: a.id, title: a.title, extra: true });
            }
        }
        return m;
    });
    /** שכפל פרסומת — המקומות הפנויים: קודם אלה שבאותה רביעייה (אותה משבצת
     *  בטור — שם המודעה נשארת קבועה בסבב), אחריהם כל השאר */
    function dupOptions(ad: { slot?: number | null }): { same: number[]; rest: number[] } {
        const free = slotOptions.filter((n) => !slotOccupants.has(n));
        const pos = typeof ad.slot === 'number' ? (ad.slot - 1) % 4 : -1;
        const same = free.filter((n) => (n - 1) % 4 === pos);
        return { same, rest: free.filter((n) => !same.includes(n)) };
    }
    function shortTitle(t: string): string {
        return t.length > 22 ? t.slice(0, 21) + '…' : t;
    }
    // רביעייה = המקומות שמתחלפים באותה משבצת בטור: א׳ = 1,5,9,13 (העליונה),
    // ב׳ = 2,6,10,14, ג׳ = 3,7,11,15, ד׳ = 4,8,12,16 (התחתונה). הטור עצמו מציג
    // 1-4 יחד, אחריהם 5-8 וכו' (ראו RightAdBanner) - אחד מכל רביעייה בכל רגע.
    // צבע ואות לכל רביעייה (רקע בהיר בלבד — כהה נשבר בהדגשת המערכת)
    const GROUP_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח'];
    const POS_NAMES = ['עליונה', 'שנייה', 'שלישית', 'תחתונה'];
    function slotGroup(n: number): number { return ((n - 1) % 4) + 1; }
    function slotGroupLetter(n: number): string {
        return GROUP_LETTERS[slotGroup(n) - 1] ?? String(slotGroup(n));
    }
    function slotPosName(n: number): string { return POS_NAMES[(n - 1) % 4]; }
    function slotOptionBg(n: number): string {
        const g = slotGroup(n) % 4;
        if (g === 1) return '#dbeafe';
        if (g === 2) return '#dcfce7';
        if (g === 3) return '#fef9c3';
        return '#f3e8ff';
    }
    /** אפשרויות הבורר מקובצות לרביעיות — כל קבוצה מקבלת כותרת optgroup משלה */
    function groupSlotOptions(options: number[]): { letter: string; nums: number[] }[] {
        const byGroup = new Map<number, number[]>();
        for (const n of options) {
            const g = slotGroup(n);
            byGroup.set(g, [...(byGroup.get(g) ?? []), n]);
        }
        return [...byGroup.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([g, nums]) => ({ letter: GROUP_LETTERS[g - 1] ?? String(g), nums }));
    }
    /** תווית אפשרות בבורר המקום — מקום תפוס מסומן עם שם הפרסומת שיושבת בו */
    function slotOptionLabel(n: number, selfId: string): string {
        const base = `${n} · ${slotPosName(n)}`;
        const occ = slotOccupants.get(n);
        if (!occ) return `${base} — פנוי`;
        if (occ.id === selfId) return occ.extra ? `${base} — שכפול שלה` : `${base} — המקום הנוכחי`;
        return `${base} ⚠ ${occ.extra ? 'שכפול: ' : ''}${shortTitle(occ.title)}`;
    }
    // אזהרה חיה מתחת לבורר ברגע שנבחר מקום תפוס (לפי מזהה המודעה)
    let slotWarning = $state<Record<string, string>>({});
    function onSlotPick(e: Event, self: { id: string }) {
        const n = Number((e.currentTarget as HTMLSelectElement).value);
        const occ = slotOccupants.get(n);
        slotWarning = {
            ...slotWarning,
            [self.id]:
                !occ || occ.id === self.id
                    ? ''
                    : occ.extra
                      ? `מקום ${n} הוא שכפול של "${shortTitle(occ.title)}" — לחיצה על "העבר" תבטל את השכפול הזה`
                      : `מקום ${n} תפוס ע"י "${shortTitle(occ.title)}" — לחיצה על "העבר" תחליף ביניהן`,
        };
    }
    /** אישור אחרון לפני העברה למקום תפוס — אישור = החלפה, ביטול = כלום לא זז */
    function confirmSlotMove(
        e: MouseEvent,
        self: { id: string; title: string; slot: number | null },
    ) {
        const formEl = (e.currentTarget as HTMLButtonElement).form;
        const sel = formEl?.elements.namedItem('slot');
        const n = Number((sel as HTMLSelectElement | null)?.value);
        const occ = slotOccupants.get(n);
        if (!occ || occ.id === self.id) return;
        if (occ.extra) {
            const okDup = confirm(
                `⚠ מקום ${n} הוא שכפול של "${occ.title}".\n\n` +
                    `אישור — "${self.title}" תעבור למקום ${n}, והשכפול של "${occ.title}" שם יבוטל (המקום הראשי שלה לא זז).\n` +
                    `ביטול — ההעברה מתבטלת.`,
            );
            if (!okDup) e.preventDefault();
            return;
        }
        const ok = confirm(
            `⚠ מקום ${n} כבר תפוס על ידי "${occ.title}".\n\n` +
                `אישור — החלפה: "${self.title}" תעבור למקום ${n}, ו"${occ.title}" תעבור למקום ${self.slot ?? '-'}.\n` +
                `ביטול — ההעברה מתבטלת ושתי הפרסומות נשארות במקומן.`,
        );
        if (!ok) e.preventDefault();
    }

    // תקופות שאפשר לקצוב למודעה שעל האוויר (נספרות מיום האישור)
    const DURATION_OPTIONS = [7, 14, 30, 60, 90, 180, 365];

    // חלון הקציבה: כל פרטי התקופה והתשלום של המודעה + קציבה מהירה
    // במסלולים או תאריך תפוגה שרירותי. נפתח מכפתור "קצוב" (סופר-אדמין בלבד).
    let durationModal = $state<any | null>(null);
    /** תאריך ISO → ערך של <input type="date"> */
    const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : '');
    function openDurationModal(ad: any) {
        durationModal = ad;
    }
    /** סגירת החלון עם שליחת טופס מתוכו — הנתונים כבר נתפסו ע"י enhance */
    function closeOnSubmit() {
        durationModal = null;
        return async ({ update }: { update: () => Promise<void> }) => update();
    }
    /** תווית סטטוס תשלום לחלון הקציבה */
    function paymentLabel(p: string): string {
        if (p === 'paid' || p === 'code') return '✓ שולם';
        if (p === 'owner') return '🏠 פרסום בעלים (חינם)';
        return '⏳ לתיאום מול המפרסם';
    }

    const pending = $derived(data.rows.filter((a) => a.status === 'pending'));
    const liveAds = $derived(data.rows.filter((a) => a.status === 'approved' && !a.expired));
    const inactive = $derived(
        data.rows.filter((a) => a.status === 'rejected' || (a.status === 'approved' && a.expired)),
    );

    /** חיפוש + מיון על הרשימה של הטאב הפעיל */
    function applyFilter<T extends (typeof data.rows)[number]>(list: T[], bySlot = false): T[] {
        const q = searchQuery.trim();
        const filtered = q
            ? list.filter((a) => heMatches(q, a.title, a.subtitle, a.submittedByName, a.contactEmail, a.landing.phone))
            : [...list];
        if (sortOrder === 'default') {
            return bySlot ? filtered.sort((x, y) => (x.slot ?? 999) - (y.slot ?? 999)) : filtered;
        }
        return filtered.sort((x, y) => {
            const d = (Date.parse(x.submittedAt) || 0) - (Date.parse(y.submittedAt) || 0);
            return sortOrder === 'newest' ? -d : d;
        });
    }
    const visibleList = $derived(
        activeTab === 'pending'
            ? applyFilter(pending)
            : activeTab === 'live'
              ? applyFilter(liveAds, true)
              : activeTab === 'inactive'
                ? applyFilter(inactive)
                : [],
    );
    const visibleSelectedIds = $derived([...selected].filter((id) => visibleList.some((a) => a.id === id)));

    const STAT_CARDS = $derived([
        { label: 'ממתינות', n: data.stats.pending, cls: 'border-amber-500/30 bg-amber-500/5 text-amber-200' },
        { label: 'אושרו', n: data.stats.approved, cls: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200' },
        { label: 'נדחו', n: data.stats.rejected, cls: 'border-red-500/30 bg-red-500/5 text-red-200' },
        { label: 'נשלחו השבוע', n: data.stats.submittedThisWeek, cls: 'border-blue-500/30 bg-blue-500/5 text-blue-200' },
        { label: 'אושרו השבוע', n: data.stats.approvedThisWeek, cls: 'border-purple-500/30 bg-purple-500/5 text-purple-200' },
    ]);

    function confirmPurge(title: string, cancel: () => void) {
        if (!confirm(`למחוק לצמיתות את "${title}"? אין דרך חזרה.`)) cancel();
    }

    const TABS = $derived([
        { key: 'pending' as const, label: `⏳ ממתינות (${pending.length})`, on: 'bg-amber-500 text-black' },
        { key: 'live' as const, label: `✅ על האוויר (${liveAds.length})`, on: 'bg-emerald-500 text-black' },
        { key: 'inactive' as const, label: `❌ לא פעילות (${inactive.length})`, on: 'bg-red-500 text-white' },
        { key: 'trash' as const, label: `🗑 אשפה (${data.trash.length})`, on: 'bg-gray-200 text-black' },
    ]);

    const inputCls =
        'w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-400/60 focus:outline-none';

    const TONE: Record<string, string> = {
        pending: 'border-amber-400/30 bg-amber-500/[0.06]',
        approved: 'border-emerald-400/25 bg-emerald-500/[0.05]',
        rejected: 'border-white/10 bg-slate-800/80 opacity-70',
    };

    // ===== טבלת תזמון הפרסומות - כמו בגמ"ח הארצי =====
    // מסודרת לפי תאריך הפרסום - החדשות בראש
    let schedulesByDate = $derived(
        [...data.schedules].sort(
            (a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0),
        ),
    );
    // השורה המלאה של כל פרסומת - לחלון הקציבה
    let rowById = $derived(new Map(data.rows.map((a) => [a.id, a] as const)));
    // תאריך ושעה בשתי שורות נפרדות בטבלת התזמון - חוסך רוחב
    function fmtDay(s?: string) {
        if (!s) return '';
        return new Date(s).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
    function fmtTime(s?: string) {
        if (!s) return '';
        return new Date(s).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    }
</script>

<Seo title="ניהול פרסומות" description="אישור וניהול הפרסומות באתר" noindex />

<div class="flex flex-col gap-3">
    <header class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-lg font-black text-white">📢 ניהול פרסומות</h2>
        <div class="flex flex-wrap items-center gap-2 text-xs text-gray-400">
            <span>{data.live} על האוויר מתוך {data.slotCount} משבצות</span>
            <button type="button" onclick={() => invalidateAll()} title="רענן עכשיו"
                    class="cursor-pointer rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 font-bold text-amber-200 hover:bg-amber-500/25">
                🔄 רענן
            </button>
            <label class="flex cursor-pointer items-center gap-1">
                <input type="checkbox" bind:checked={autoRefresh} class="accent-amber-500" />
                רענון אוטומטי
            </label>
        </div>
    </header>

    <!-- מונים (כמו בגמ"ח הארצי) -->
    <section class="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {#each STAT_CARDS as c (c.label)}
            <div class="rounded-xl border px-2 py-1.5 text-center {c.cls}">
                <div class="text-[10px] font-bold opacity-80">{c.label}</div>
                <div class="text-xl leading-tight font-black">{c.n}</div>
            </div>
        {/each}
    </section>

    {#if data.backendUnavailable}
        <p class="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            ⚠️ לא ניתן לטעון את הפרסומות כרגע — הבאקאנד אינו זמין
        </p>
    {/if}

    {#if form?.success}
        <p class="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            ✅ {form.message}
        </p>
    {:else if form?.error}
        <p class="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {form.error}
        </p>
    {/if}

    <!-- ---- הזנה ידנית ---- -->
    <section class="rounded-2xl border border-white/10 bg-slate-800/80 p-4">
        <button
            type="button"
            onclick={() => (showCreate = !showCreate)}
            aria-expanded={showCreate}
            class="cursor-pointer text-lg font-black text-white"
        >
            {showCreate ? '▾' : '▸'} ➕ הזנת פרסומת ידנית
        </button>
        <p class="mt-1 text-xs text-gray-500">
            למפרסם שסגרתם איתו ישירות — בלי שהוא צריך חשבון באתר
        </p>

        {#if showCreate}
            <form
                method="POST"
                action="?/create"
                class="mt-3 grid gap-3 sm:grid-cols-2"
                use:enhance={() => async ({ update }) => {
                    await update();
                    showCreate = false;
                }}
            >
                <label class="block sm:col-span-2">
                    <span class="mb-1 block text-xs font-semibold text-gray-400">כותרת * (עד 40 תווים)</span>
                    <input name="title" required maxlength="40" class={inputCls} />
                </label>
                <label class="block sm:col-span-2">
                    <span class="mb-1 block text-xs font-semibold text-gray-400">שורת משנה (עד 70)</span>
                    <input name="subtitle" maxlength="70" class={inputCls} />
                </label>
                <label class="block sm:col-span-2">
                    <span class="mb-1 block text-xs font-semibold text-gray-400">טקסט ריחוף — משפט המכירה (עד 90)</span>
                    <input name="hover_text" maxlength="90" class={inputCls} />
                </label>
                <label class="block">
                    <span class="mb-1 block text-xs font-semibold text-gray-400">כפתור</span>
                    <input name="cta" maxlength="30" placeholder="לפרטים" class={inputCls} />
                </label>
                <label class="block">
                    <span class="mb-1 block text-xs font-semibold text-gray-400">גרדיאנט</span>
                    <select name="gradient_id" class={inputCls}>
                        {#each AD_GRADIENTS as g (g.id)}
                            <option value={g.id} class="bg-slate-900">{g.label}</option>
                        {/each}
                    </select>
                </label>

                <label class="block sm:col-span-2">
                    <span class="mb-1 block text-xs font-semibold text-gray-400">תיאור בדף הנחיתה</span>
                    <textarea name="pitch" rows="2" maxlength="400" class={inputCls}></textarea>
                </label>

                <label class="block">
                    <span class="mb-1 block text-xs font-semibold text-gray-400">שם המפרסם</span>
                    <input name="advertiser" maxlength="60" class={inputCls} />
                </label>
                <label class="block">
                    <span class="mb-1 block text-xs font-semibold text-gray-400">טלפון</span>
                    <input name="phone" maxlength="25" class={inputCls} />
                </label>
                <label class="block">
                    <span class="mb-1 block text-xs font-semibold text-gray-400">וואטסאפ</span>
                    <input name="whatsapp" maxlength="25" class={inputCls} />
                </label>
                <label class="block">
                    <span class="mb-1 block text-xs font-semibold text-gray-400">דוא״ל</span>
                    <input name="email" type="email" maxlength="200" class={inputCls} />
                </label>
                <label class="block sm:col-span-2">
                    <span class="mb-1 block text-xs font-semibold text-gray-400">
                        אתר (http/https בלבד — כתובת אחרת תידחה)
                    </span>
                    <input name="website" maxlength="400" placeholder="https://" class={inputCls} />
                </label>
                <label class="block">
                    <span class="mb-1 block text-xs font-semibold text-gray-400">כתובת</span>
                    <input name="address" maxlength="120" class={inputCls} />
                </label>
                <label class="block">
                    <span class="mb-1 block text-xs font-semibold text-gray-400">שעות פעילות</span>
                    <input name="hours" maxlength="120" class={inputCls} />
                </label>
                <label class="block">
                    <span class="mb-1 block text-xs font-semibold text-gray-400">מסלול</span>
                    <select name="duration_days" class={inputCls}>
                        {#each data.plans as p (p.days)}
                            <option value={p.days} selected={p.days === 30} class="bg-slate-900">
                                {p.title} — ₪{p.price}
                            </option>
                        {/each}
                    </select>
                </label>

                <div class="sm:col-span-2">
                    <button type="submit" class="btn-premium rounded-xl px-5 py-2 text-sm font-bold text-white">
                        יצירה (תיכנס כממתינה לאישור)
                    </button>
                </div>
            </form>
        {/if}
    </section>

    <!-- טאבים -->
    <div class="flex gap-1.5 overflow-x-auto pb-1">
        {#each TABS as t (t.key)}
            <button type="button" onclick={() => setTab(t.key)}
                    class="cursor-pointer whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-black transition-all
                           {activeTab === t.key ? t.on : 'border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'}">
                {t.label}
            </button>
        {/each}
    </div>

    {#if activeTab !== 'trash'}
        <!-- חיפוש + מיון -->
        <div class="flex flex-wrap gap-2">
            <input type="search" bind:value={searchQuery} placeholder="🔎 חיפוש לפי כותרת, מפרסם, אימייל או טלפון…"
                   class="min-w-[200px] flex-1 {inputCls}" />
            <select bind:value={sortOrder} class="rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white">
                <option value="default" class="bg-slate-900">{activeTab === 'live' ? 'לפי המקום בטור' : 'סדר ברירת מחדל'}</option>
                <option value="newest" class="bg-slate-900">חדש לישן</option>
                <option value="oldest" class="bg-slate-900">ישן לחדש</option>
            </select>
        </div>
    {/if}

    <!-- בחירה רב-פריטית (ממתינות) -->
    {#if activeTab === 'pending' && visibleList.length > 0}
        <div class="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
            <button type="button" onclick={() => (selected = new Set([...selected, ...visibleList.map((a) => a.id)]))}
                    class="cursor-pointer text-xs font-bold text-amber-300 hover:text-amber-200">
                בחר הכל ({visibleList.length})
            </button>
            <span class="text-xs text-gray-600">·</span>
            <button type="button" onclick={clearSelection} class="cursor-pointer text-xs font-bold text-gray-400 hover:text-gray-300">נקה</button>
            {#if visibleSelectedIds.length > 0}
                <span class="mr-2 text-xs text-gray-300">נבחרו {visibleSelectedIds.length}</span>
                <form method="POST" action="?/bulkApprove" use:enhance={() => async ({ update }) => { clearSelection(); await update(); }}>
                    <input type="hidden" name="ids" value={visibleSelectedIds.join(',')} />
                    <button type="submit" class="cursor-pointer rounded-lg bg-emerald-500 px-3 py-1 text-xs font-black text-black hover:bg-emerald-400">
                        ✅ אשר את הנבחרות
                    </button>
                </form>
                <form method="POST" action="?/bulkReject" class="flex gap-1"
                      use:enhance={() => async ({ update }) => { clearSelection(); await update(); }}>
                    <input type="hidden" name="ids" value={visibleSelectedIds.join(',')} />
                    <input type="text" name="reason" maxlength="300" placeholder="סיבת דחייה (לא חובה)"
                           class="w-40 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-white" />
                    <button type="submit" class="cursor-pointer rounded-lg bg-red-600 px-3 py-1 text-xs font-black text-white hover:bg-red-500">
                        ❌ דחה את הנבחרות
                    </button>
                </form>
            {/if}
        </div>
    {/if}

    {#if activeTab === 'trash'}
        <!-- אשפה: הוסרה = שחזור למצב הקודם (המקום והתוקף נשמרו); פגה = חידוש לתקופה חדשה.
             מחיקה לצמיתות — סופר-אדמין בלבד, ורק ממה שכבר באשפה -->
        <section class="flex flex-col gap-2">
            {#if data.trash.length === 0}
                <p class="rounded-2xl border border-dashed border-white/10 py-8 text-center text-sm text-gray-500 italic">האשפה ריקה</p>
            {/if}
            {#each data.trash as t (t.id)}
                <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <div class="flex min-w-0 flex-col gap-0.5">
                        <button type="button" onclick={() => openTrashPreview(t)} title="תצוגה מקדימה של הפרסומת"
                                class="cursor-pointer text-right text-sm font-black text-white hover:text-amber-300">{t.title}</button>
                        <span class="flex items-center gap-1.5 text-xs text-gray-400">
                            <span class="rounded-full px-2 py-0.5 text-[11px] font-black
                                         {t.kind === 'deleted' ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'}">{t.kind === 'deleted' ? 'הוסרה' : 'פג התוקף'}</span>
                            {fmtDay(t.at)} · {t.advertiserName}
                        </span>
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5">
                        {#if t.kind === 'deleted'}
                            <form method="POST" action="?/restore" use:enhance>
                                <input type="hidden" name="id" value={t.id} />
                                <button type="submit" class="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-black bg-emerald-600 text-white hover:bg-emerald-500" title="חזרה למצב שלפני ההסרה">♻ שחזר</button>
                            </form>
                            {#if data.superAdmin}
                                <form method="POST" action="?/purge" use:enhance={({ cancel }) => confirmPurge(t.title, cancel)}>
                                    <input type="hidden" name="id" value={t.id} />
                                    <button type="submit" class="cursor-pointer rounded-lg border border-red-500/40 bg-red-600/20 px-3 py-1.5 text-xs font-black text-red-300 hover:bg-red-600/30">✕ מחק לצמיתות</button>
                                </form>
                            {/if}
                        {:else}
                            <form method="POST" action="?/approve" use:enhance>
                                <input type="hidden" name="id" value={t.id} />
                                <input type="hidden" name="duration_days" value={t.requestedDurationDays ?? ''} />
                                <button type="submit" class="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-black bg-emerald-600 text-white hover:bg-emerald-500" title="פרסום מחדש לתקופה חדשה מהיום, באותו מקום בלוח">♻ חדש</button>
                            </form>
                            <form method="POST" action="?/remove" use:enhance>
                                <input type="hidden" name="id" value={t.id} />
                                <button type="submit" class="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-black border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10" title="העברה לאשפה — אפשר לשחזר">🗑 הסרה</button>
                            </form>
                        {/if}
                    </div>
                </div>
            {/each}
        </section>
        {#if trashPreview}
            <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
            <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4" role="presentation"
                 onclick={() => (trashPreview = null)}>
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <div class="my-auto flex flex-col items-center gap-3" role="dialog" aria-modal="true" aria-label="תצוגה מקדימה של הפרסומת"
                     tabindex="-1" onclick={(e) => e.stopPropagation()}>
                    <AdCardPreview ad={trashPreview} />
                    <button type="button" class="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-black border border-white/20 bg-white/10 text-gray-200 hover:bg-white/20"
                            onclick={() => (trashPreview = null)}>✕ סגור</button>
                </div>
            </div>
        {/if}
    {:else if visibleList.length === 0}
        <div class="rounded-2xl border border-dashed border-white/10 bg-slate-800/80 p-6 text-center">
            <p class="font-bold text-white">
                {searchQuery ? 'לא נמצאו תוצאות לחיפוש'
                    : activeTab === 'pending' ? 'אין פרסומות שממתינות לאישור'
                    : activeTab === 'live' ? 'אין פרסומות על האוויר'
                    : 'אין פרסומות לא פעילות'}
            </p>
            {#if activeTab === 'live' && !searchQuery}
                <p class="mt-1 text-sm text-gray-400">כל {data.slotCount} המשבצות בטור הימני פנויות</p>
            {/if}
        </div>
    {:else}
            <section class="flex flex-col gap-2">
                {#each visibleList as ad (ad.id)}
                    <article id="ad-{ad.id}" class="flex scroll-mt-24 flex-col gap-2 rounded-2xl border p-3 {TONE[ad.status]}">
                        <div class="flex flex-wrap items-center gap-2">
                            {#if activeTab === 'pending'}
                                <input type="checkbox" checked={selected.has(ad.id)} onchange={() => toggleSelect(ad.id)}
                                       aria-label="בחירת {ad.title}" class="h-4 w-4 cursor-pointer accent-amber-500" />
                            {/if}
                            <span
                                class="h-8 w-8 shrink-0 rounded-lg"
                                style="background: {gradientCss(ad.gradientId)}"
                                aria-hidden="true"
                            ></span>
                            <span class="min-w-0">
                                <!-- מודעה שעל האוויר: ריחוף על הכותרת = הכרטיס האמיתי צף;
                                     הקשה = מודאל עם הכרטיס + קישור לדף הנחיתה -->
                                {#if previewableById.has(ad.id)}
                                    <button
                                        type="button"
                                        onmouseenter={(e) => openHoverPreview(e, ad.id)}
                                        onmouseleave={() => (hoverPreview = null)}
                                        onclick={() => {
                                            hoverPreview = null;
                                            modalPreviewId = ad.id;
                                        }}
                                        title="תצוגה מקדימה של הפרסומת כפי שהיא מוצגת באתר"
                                        class="block max-w-full cursor-pointer truncate text-right font-bold text-white underline decoration-dotted decoration-white/30 underline-offset-2 hover:text-amber-300"
                                    >
                                        {ad.title}
                                    </button>
                                {:else}
                                    <span class="block truncate font-bold text-white">{ad.title}</span>
                                {/if}
                                <span class="block truncate text-xs text-gray-400">{ad.subtitle}</span>
                            </span>

                            {#if ad.editedAfterDecision}
                                <span class="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                                    ✏️ נערכה אחרי האישור
                                </span>
                            {/if}
                            {#if ad.expired}
                                <span class="rounded-full border border-white/10 bg-slate-800/80 px-2 py-0.5 text-[11px] text-gray-400">
                                    פג תוקף
                                </span>
                            {:else if ad.status === 'approved'}
                                <span class="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                                    {ad.daysLeft} ימים נותרו
                                </span>
                            {/if}
                            {#if ad.paused}
                                <span class="rounded-full border border-blue-400/40 bg-blue-500/15 px-2 py-0.5 text-[11px] font-bold text-blue-300">
                                    ⏸ מושהית — {ad.pausedDaysLeft ?? 0} ימים שמורים
                                </span>
                            {/if}

                            <!-- מפרסם חוזר ששיפר את המודעה שלו: לא בקשה חדשה -->
                            {#if ad.replacesAdId && ad.status === 'pending'}
                                <span class="rounded-full border border-blue-400/40 bg-blue-500/15 px-2 py-0.5 text-[11px] font-bold text-blue-200">
                                    🔄 עדכון למודעה קיימת{ad.replacesTitle ? ` — קודמת: "${ad.replacesTitle}"` : ''}
                                </span>
                            {:else if ad.supersededBy}
                                <span class="rounded-full border border-white/15 bg-slate-800/80 px-2 py-0.5 text-[11px] font-bold text-gray-300">
                                    🔄 גרסה ישנה — הוחלפה בגרסה מעודכנת
                                </span>
                            {/if}

                            <span class="mr-auto text-xs text-gray-500">
                                {ad.submittedAt ? absDate(ad.submittedAt) : ''}
                            </span>
                        </div>

                        {#if editingId === ad.id}
                            <!-- עריכת הטקסטים בשורה (כמו בגמ"ח הארצי) — תמונות ועיצוב נשארים של המפרסם -->
                            <form method="POST" action="?/update" class="grid gap-1.5 rounded-xl border border-amber-400/30 bg-black/20 p-2 sm:grid-cols-2"
                                  use:enhance={() => async ({ result, update }) => { if (result.type === 'success') editingId = null; await update(); }}>
                                <input type="hidden" name="id" value={ad.id} />
                                <input name="title" bind:value={edit.title} maxlength="40" required placeholder="כותרת" class="{inputCls} font-bold" />
                                <input name="subtitle" bind:value={edit.subtitle} maxlength="70" placeholder="שורת משנה" class={inputCls} />
                                <input name="cta" bind:value={edit.cta} maxlength="30" placeholder="טקסט הכפתור" class={inputCls} />
                                <input name="hoverText" bind:value={edit.hoverText} maxlength="90" placeholder="טקסט ריחוף" class={inputCls} />
                                <div class="flex gap-2 sm:col-span-2">
                                    <button type="submit" class="cursor-pointer rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black text-black">💾 שמור</button>
                                    <button type="button" onclick={() => (editingId = null)} class="cursor-pointer rounded-lg bg-white/10 px-3 py-1.5 text-xs text-gray-300">ביטול</button>
                                </div>
                            </form>
                        {/if}

                        {#if ad.status === 'approved' && !ad.expired && ad.slotIndex >= 0}
                            {@const slotN = ad.slot ?? ad.slotIndex + 1}
                            <!-- המקום המספרי הקבוע של המודעה בלוח + בורר מקום עם
                                 אזהרת מקום תפוס והחלפה. הסדר בטור הימני נגזר
                                 בדיוק ממספרי המקומות האלה. -->
                            <div class="flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
                                <span class="inline-flex h-6 min-w-6 items-center justify-center rounded-lg border border-black/20 px-1.5 text-xs font-black whitespace-nowrap"
                                      style="background:{slotOptionBg(slotN)};color:#111"
                                      title="רביעייה {slotGroupLetter(slotN)}׳ · המשבצת ה{slotPosName(slotN)} בטור">
                                    {slotN} · {slotGroupLetter(slotN)}׳
                                </span>
                                <span class="text-xs font-bold text-gray-400">
                                    מקום {ad.slot} מתוך {data.slotCount} בלוח
                                </span>
                                <form method="POST" action="?/setSlot" use:enhance class="flex flex-wrap items-center gap-1.5">
                                    <input type="hidden" name="id" value={ad.id} />
                                    <select
                                        name="slot"
                                        onchange={(e) => onSlotPick(e, ad)}
                                        class="rounded-lg border border-white/10 bg-slate-800/80 px-1.5 py-1 text-xs text-white focus:border-blue-400/60 focus:outline-none"
                                    >
                                        <!-- כל רביעייה תחת כותרת משלה — הקשר מספר↔רביעייה קריא במילים, לא רק
                                             בצבע; מקום תפוס שומר את צבע הרביעייה ומסומן באדום מודגש -->
                                        {#each groupSlotOptions(slotOptions) as grp (grp.letter)}
                                            <optgroup label="— רביעייה {grp.letter}׳ · המשבצת ה{slotPosName(grp.nums[0])} בטור —">
                                                {#each grp.nums as n (n)}
                                                    {@const occ = slotOccupants.get(n)}
                                                    {@const takenByOther = !!occ && occ.id !== ad.id}
                                                    <option value={n} selected={n === ad.slot}
                                                            style="background:{slotOptionBg(n)};color:{takenByOther ? '#b91c1c' : '#111'};font-weight:{takenByOther ? '700' : '400'}">
                                                        {slotOptionLabel(n, ad.id)}
                                                    </option>
                                                {/each}
                                            </optgroup>
                                        {/each}
                                    </select>
                                    <button
                                        type="submit"
                                        onclick={(e) => confirmSlotMove(e, ad)}
                                        title="העבר למקום שנבחר; מקום תפוס — תתבקש לאשר החלפה בין השתיים"
                                        class="cursor-pointer rounded-xl border border-purple-400/40 bg-purple-500/15 px-3 py-1.5 text-xs font-bold whitespace-nowrap text-purple-200 hover:bg-purple-500/25"
                                    >
                                        ⇄ העבר
                                    </button>
                                    {#if slotWarning[ad.id]}
                                        <span class="max-w-[240px] text-[11px] leading-snug font-bold text-amber-300">
                                            ⚠ {slotWarning[ad.id]}
                                        </span>
                                    {/if}
                                </form>
                                <div class="mr-auto flex items-center gap-1">
                                    <form method="POST" action="?/move" use:enhance>
                                        <input type="hidden" name="id" value={ad.id} />
                                        <input type="hidden" name="dir" value="up" />
                                        <button
                                            type="submit"
                                            disabled={ad.slotIndex === 0}
                                            title="העלה משבצת אחת"
                                            class="cursor-pointer rounded-xl border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                                        >▲ למעלה</button>
                                    </form>
                                    <form method="POST" action="?/move" use:enhance>
                                        <input type="hidden" name="id" value={ad.id} />
                                        <input type="hidden" name="dir" value="down" />
                                        <button
                                            type="submit"
                                            disabled={ad.slotIndex === ad.slotTotal - 1}
                                            title="הורד משבצת אחת"
                                            class="cursor-pointer rounded-xl border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                                        >▼ למטה</button>
                                    </form>
                                </div>
                            </div>
                        {/if}

                        <!-- פרטי המפרסם: מסך מאחורי הרשאה, ולכן מותר כאן -->
                        <p class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                            {#if ad.submittedByName}<span>מפרסם: {ad.submittedByName}</span>{/if}
                            {#if ad.contactEmail}<span>קשר: {ad.contactEmail}</span>{/if}
                            {#if ad.landing.phone}<span>טלפון: {ad.landing.phone}</span>{/if}
                            {#if ad.bytes > 0}<span>{Math.round(ad.bytes / 1024)}KB</span>{/if}
                        </p>

                        {#if ad.status === 'approved' && ad.stats.impressions > 0}
                            <p class="flex flex-wrap gap-2 text-[11px]">
                                <span class="rounded-full border border-white/10 bg-slate-800/80 px-2 py-0.5 text-gray-400">
                                    👁 {ad.stats.impressions} חשיפות
                                </span>
                                <span class="rounded-full border border-white/10 bg-slate-800/80 px-2 py-0.5 text-gray-400">
                                    🖱 {ad.stats.clicks} קליקים ({(ad.stats.ctr * 100).toFixed(1)}%)
                                </span>
                                <span class="rounded-full border border-white/10 bg-slate-800/80 px-2 py-0.5 text-gray-400">
                                    📄 {ad.stats.landing} צפיות בנחיתה
                                </span>
                                <span class="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                                    📞 {ad.stats.leads} פניות
                                </span>
                            </p>
                        {/if}

                        {#if ad.landing.website}
                            <!--
                              כתובת של מודעה שטרם אושרה לא הופכת לקישור.
                              במקור היא רונדרה כ-href גם בתור האישורים, וזה
                              הפך את מסך האדמין ליעד: כתובת javascript: הייתה
                              מתבצעת בדפדפן שלו בלחיצה.
                            -->
                            {#if ad.status === 'approved'}
                                <a
                                    href={ad.landing.website}
                                    target="_blank"
                                    rel="noopener noreferrer nofollow"
                                    class="text-xs text-blue-400 hover:text-blue-300"
                                >🌐 {ad.landing.website}</a>
                            {:else}
                                <span class="rounded-lg border border-white/10 bg-black/20 px-2 py-1 font-mono text-xs break-all text-gray-400">
                                    🌐 {ad.landing.website}
                                </span>
                            {/if}
                        {/if}

                        {#if ad.rejectionReason}
                            <p class="text-xs text-red-300/80">סיבת הדחייה: {ad.rejectionReason}</p>
                        {/if}

                        <div class="flex flex-wrap items-center gap-2 border-t border-white/5 pt-2">
                            <a
                                href="/ads/{ad.id}"
                                target="_blank"
                                rel="noopener"
                                class="rounded-xl border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/10"
                            >👁 תצוגה מקדימה</a>
                            {#if editingId !== ad.id}
                                <button type="button" onclick={() => startEdit(ad)}
                                        class="cursor-pointer rounded-xl border border-blue-400/40 bg-blue-500/15 px-3 py-1.5 text-xs font-bold text-blue-200 hover:bg-blue-500/25">
                                    ✏️ {ad.status === 'pending' ? 'ערוך לפני אישור' : 'ערוך'}
                                </button>
                            {/if}

                            {#if ad.status !== 'approved' || ad.expired}
                                <form method="POST" action="?/approve" use:enhance class="flex items-center gap-1">
                                    <input type="hidden" name="id" value={ad.id} />
                                    <select name="duration_days" class="rounded-lg border border-white/10 bg-slate-800/80 px-2 py-1 text-xs text-white">
                                        {#each data.plans as p (p.days)}
                                            <option value={p.days} selected={p.days === ad.requestedDurationDays} class="bg-slate-900">
                                                {p.label}
                                            </option>
                                        {/each}
                                    </select>
                                    <button type="submit" class="cursor-pointer rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/25">
                                        {ad.replacesLive ? '✓ אישור והחלפת הישנה' : '✓ אישור'}
                                    </button>
                                </form>
                                <!-- מפרסם שבאמת רוצה שתי מודעות במקביל, ולא שדרג את הקיימת -->
                                {#if ad.replacesLive}
                                    <form method="POST" action="?/approve" use:enhance class="flex items-center gap-1">
                                        <input type="hidden" name="id" value={ad.id} />
                                        <input type="hidden" name="keepPrevious" value="1" />
                                        <input type="hidden" name="duration_days" value={ad.requestedDurationDays} />
                                        <button
                                            type="submit"
                                            title="הישנה תישאר באוויר וזו תתווסף לידה"
                                            class="cursor-pointer rounded-xl border border-white/15 bg-slate-800/80 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/10"
                                        >
                                            ➕ אישור כמודעה נוספת
                                        </button>
                                    </form>
                                {/if}
                            {:else}
                                <form method="POST" action="?/extend" use:enhance class="flex items-center gap-1">
                                    <input type="hidden" name="id" value={ad.id} />
                                    <select name="duration_days" class="rounded-lg border border-white/10 bg-slate-800/80 px-2 py-1 text-xs text-white">
                                        {#each data.plans as p (p.days)}
                                            <option value={p.days} class="bg-slate-900">{p.label}</option>
                                        {/each}
                                    </select>
                                    <button type="submit" class="cursor-pointer rounded-xl border border-blue-400/40 bg-blue-500/15 px-3 py-1.5 text-xs font-bold text-blue-200 hover:bg-blue-500/25">
                                        ⏱ הארכה
                                    </button>
                                </form>

                                <!-- חלון הקציבה: פרטי תשלום ותאריכים + שינוי תקופה/תפוגה.
                                     שמור לסופר-אדמין — אדמין רגיל לא רואה את הכפתור -->
                                {#if data.superAdmin}
                                    <button type="button"
                                            onclick={() => openDurationModal(ad)}
                                            class="cursor-pointer rounded-xl border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/10"
                                            title="פרטי התקופה והתשלום + שינוי תקופה או תאריך תפוגה">
                                        ✂ קצוב
                                    </button>
                                {/if}
                            {/if}

                            {#if ad.status === 'approved' && !ad.expired}
                                {#if ad.paused}
                                    <form method="POST" action="?/resume" use:enhance>
                                        <input type="hidden" name="id" value={ad.id} />
                                        <button type="submit" class="cursor-pointer rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/25"
                                                title="הימים השמורים נספרים מהיום">
                                            ▶ המשך
                                        </button>
                                    </form>
                                {:else}
                                    <form
                                        method="POST"
                                        action="?/pause"
                                        use:enhance={({ cancel }) => {
                                            if (!confirm(`להשהות את "${ad.title}"? היא תרד מהאוויר והימים שנותרו יישמרו לה.`)) {
                                                cancel();
                                                return;
                                            }
                                            return async ({ update }) => await update();
                                        }}
                                    >
                                        <input type="hidden" name="id" value={ad.id} />
                                        <button type="submit" class="cursor-pointer rounded-xl border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/10">
                                            ⏸ השהה
                                        </button>
                                    </form>
                                {/if}
                            {/if}

                            {#if ad.status === 'approved' && !ad.expired}
                                <!-- הורדה מהאוויר בלי מחיקה: המודעה חוזרת לממתינות -->
                                <form
                                    method="POST"
                                    action="?/unapprove"
                                    use:enhance={({ cancel }) => {
                                        if (!confirm(`להוריד את "${ad.title}" מהאתר ולהחזיר לממתינות?`)) {
                                            cancel();
                                            return;
                                        }
                                        return async ({ update }) => await update();
                                    }}
                                >
                                    <input type="hidden" name="id" value={ad.id} />
                                    <button type="submit" class="cursor-pointer rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/25">
                                        ⏸ הורד מהאתר
                                    </button>
                                </form>
                            {/if}

                            {#if ad.status !== 'rejected'}
                                <form method="POST" action="?/reject" use:enhance class="flex items-center gap-1">
                                    <input type="hidden" name="id" value={ad.id} />
                                    <input
                                        name="reason"
                                        placeholder="סיבה (לא חובה)"
                                        maxlength="300"
                                        class="w-36 rounded-lg border border-white/10 bg-slate-800/80 px-2 py-1 text-xs text-white placeholder-gray-600"
                                    />
                                    <button type="submit" class="cursor-pointer rounded-xl border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/10">
                                        ✕ דחייה
                                    </button>
                                </form>
                                                        {:else}
                                <!-- דחייה בטעות — חזרה לתור הממתינות -->
                                <form method="POST" action="?/unreject" use:enhance>
                                    <input type="hidden" name="id" value={ad.id} />
                                    <button type="submit" class="cursor-pointer rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/25">
                                        ↩️ החזר לממתינות
                                    </button>
                                </form>
                            {/if}

                            <form
                                method="POST"
                                action="?/remove"
                                class="mr-auto"
                                use:enhance={({ cancel }) => {
                                    if (!confirm(`להעביר את "${ad.title}" לאשפה? אפשר לשחזר אותה משם.`)) {
                                        cancel();
                                        return;
                                    }
                                    return async ({ update }) => await update();
                                }}
                            >
                                <input type="hidden" name="id" value={ad.id} />
                                <button type="submit" class="cursor-pointer text-xs text-red-400/80 hover:text-red-300">
                                    🗑 הסרה
                                </button>
                            </form>
                            <!-- שכפל פרסומת (סופר-אדמין): אותה פרסומת גם במקומות נוספים — למשל
                                 2 ו-6 (אותה רביעייה), כך שהיא נשארת באותה משבצת ולא מתחלפת בסבב.
                                 תג ⧉ = שכפול קיים; לחיצה עליו מבטלת אותו -->
                            {#if data.superAdmin && ad.status === 'approved' && typeof ad.slot === 'number'}
                                {@const dup = dupOptions(ad)}
                                {#if (ad.extraSlots ?? []).length + dup.same.length + dup.rest.length > 0}
                                    <div style="display: contents">
                                        {#each ad.extraSlots ?? [] as n (n)}
                                            <form method="POST" action="?/removeExtraSlot" use:enhance>
                                                <input type="hidden" name="id" value={ad.id} />
                                                <input type="hidden" name="slot" value={n} />
                                                <button
                                                    type="submit"
                                                    class="inline-flex h-6 cursor-pointer items-center gap-1 rounded-lg border border-black/20 px-1.5 text-xs font-black whitespace-nowrap hover:opacity-80"
                                                    style="background:{slotOptionBg(n)};color:#111"
                                                    title="שכפול במקום {n} (רביעייה {slotGroupLetter(n)}׳ · המשבצת ה{slotPosName(n)} בטור) — לחיצה מבטלת את השכפול"
                                                >
                                                    ⧉ {n} · {slotGroupLetter(n)}׳ <span class="text-red-700">✕</span>
                                                </button>
                                            </form>
                                        {/each}
                                        {#if dup.same.length + dup.rest.length > 0}
                                            <form method="POST" action="?/addExtraSlot" use:enhance>
                                                <input type="hidden" name="id" value={ad.id} />
                                                <select
                                                    name="slot"
                                                    aria-label="שכפל פרסומת"
                                                    onchange={(e) => e.currentTarget.form?.requestSubmit()}
                                                    class="rounded-lg border border-sky-500/40 bg-sky-500/15 px-1.5 py-1 text-xs font-black text-sky-200 focus:border-sky-400/60 focus:outline-none"
                                                >
                                                    <option value="" selected disabled>⧉ שכפל פרסומת</option>
                                                    {#if dup.same.length > 1}
                                                        <option value="same" style="background:#fff;color:#111;font-weight:700">
                                                            ★ קבועה בכל הרביעייה ({dup.same.join(', ')})
                                                        </option>
                                                    {/if}
                                                    {#if dup.same.length > 0}
                                                        <optgroup label="★ אותה רביעייה (אותה משבצת)">
                                                            {#each dup.same as n (n)}
                                                                <option value={n} style="background:{slotOptionBg(n)};color:#111">
                                                                    {n} · {slotPosName(n)}
                                                                </option>
                                                            {/each}
                                                        </optgroup>
                                                    {/if}
                                                    {#each groupSlotOptions(dup.rest) as grp (grp.letter)}
                                                        <optgroup label="— רביעייה {grp.letter}׳ —">
                                                            {#each grp.nums as n (n)}
                                                                <option value={n} style="background:{slotOptionBg(n)};color:#111">
                                                                    {n} · {slotPosName(n)}
                                                                </option>
                                                            {/each}
                                                        </optgroup>
                                                    {/each}
                                                </select>
                                            </form>
                                        {/if}
                                    </div>
                                {/if}
                            {/if}
                        </div>
                    </article>
                {/each}
            </section>
    {/if}

    <!-- ============================================================ -->
    <!-- תזמון פרסומות פעילות + תאריכי פקיעה - אותה טבלה כמו בגמ"ח   -->
    <!-- הארצי: מקום + העבר, תקופה, וכל הניהול מהשורה                -->
    <!-- ============================================================ -->
    <section>
        <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div class="flex items-center gap-2">
                <span class="text-2xl">📅</span>
                <h2 class="text-lg font-black text-white">תזמון פרסומות</h2>
                <span class="text-xs font-bold bg-white/10 text-gray-300 border border-white/20 px-2 py-0.5 rounded-full">{data.schedules.length}</span>
            </div>
            <div class="flex items-center gap-2 text-[10px] md:text-xs">
                <span class="inline-flex items-center gap-1 text-emerald-300"><span class="w-2 h-2 rounded-full bg-emerald-400"></span>פעילה</span>
                <span class="inline-flex items-center gap-1 text-amber-300"><span class="w-2 h-2 rounded-full bg-amber-400"></span>≤ 7 ימים</span>
                <span class="inline-flex items-center gap-1 text-red-300"><span class="w-2 h-2 rounded-full bg-red-400"></span>פגה</span>
                <span class="inline-flex items-center gap-1 text-blue-300"><span class="w-2 h-2 rounded-full bg-blue-400"></span>מושהית</span>
            </div>
        </div>

        <!-- מקרא הרביעיות: רביעייה = המקומות שמתחלפים באותה משבצת בטור (1,5,9,13 וכו׳),
             וכל רביעייה צבועה בצבע שלה. בכל רגע הטור מציג מקום אחד מכל רביעייה -->
        <div class="flex items-center gap-2 mb-3 flex-wrap text-[10px] md:text-xs font-bold text-gray-300">
            <span>כל רביעייה מתחלפת באותה משבצת בטור:</span>
            {#each groupSlotOptions(slotOptions) as grp (grp.letter)}
                <span class="px-2 py-0.5 rounded-full border border-black/20" style="background:{slotOptionBg(grp.nums[0])};color:#111">{grp.letter}׳ · {grp.nums.join(', ')}</span>
            {/each}
            <span class="text-gray-500">א׳ למעלה, ד׳ למטה; בכל רגע מוצג מקום אחד מכל רביעייה</span>
        </div>

        {#if data.schedules.length === 0}
            <div class="text-center py-8 text-gray-500 text-sm italic border border-dashed border-white/10 rounded-2xl">
                אין כרגע פרסומות פעילות באתר
            </div>
        {:else}
            <div class="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
                <table class="w-full text-sm" dir="rtl">
                    <thead class="bg-white/5">
                        <!-- 4 עמודות בלבד - המידע מוערם בכמה שורות בכל תא, כדי שבדסקטופ
                             הכל ייכנס למסך אחד בלי גלילה אופקית -->
                        <tr class="text-[11px] md:text-xs text-gray-400 uppercase tracking-wide">
                            <th class="text-right font-bold px-2 py-2.5">מקום</th>
                            <th class="text-right font-bold px-2 py-2.5">פרסומת ומפרסם</th>
                            <th class="text-right font-bold px-2 py-2.5">תקופה</th>
                            <th class="text-right font-bold px-2 py-2.5">ניהול</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each schedulesByDate as s (s.id)}
                            {@const stateColor = s.state === 'paused' ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
                                : s.state === 'expired' ? 'bg-red-500/15 text-red-300 border-red-500/40'
                                : s.state === 'ending' ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'}
                            {@const stateLabel = s.state === 'paused' ? 'מושהית'
                                : s.state === 'expired' ? 'פגה'
                                : s.state === 'ending' ? 'פגה בקרוב'
                                : 'פעילה'}
                            {@const daysColor = s.state === 'paused' ? 'text-blue-300'
                                : s.daysLeft < 0 ? 'text-red-300'
                                : s.daysLeft <= 7 ? 'text-amber-300'
                                : 'text-emerald-300'}
                            {@const progress = s.durationDays > 0
                                ? Math.min(100, Math.max(0, ((s.durationDays - Math.max(0, s.daysLeft)) / s.durationDays) * 100))
                                : 100}
                            <!-- מקום מעל 16 (גלישה) מתווסף לבורר כדי שלא ייעלם -->
                            {@const rowSlots = s.slot && !slotOptions.includes(s.slot)
                                ? [...slotOptions, s.slot].sort((a, b) => a - b)
                                : slotOptions}
                            <tr class="border-t border-white/10 hover:bg-white/5">
                                <!-- מספר המקום בטור + העברה ישירה למקום אחר (מקום תפוס - מתחלפות).
                                     פריסה אנכית צרה - כדי שכל הטבלה תיכנס ברוחב המסך בלי גלילה -->
                                <td class="px-2 py-2">
                                    <form method="POST" action="?/setSlot" use:enhance class="flex flex-col items-start gap-1">
                                        <input type="hidden" name="id" value={s.id} />
                                        <div class="flex items-center gap-1">
                                            <span class="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-lg border border-black/20 font-black text-xs whitespace-nowrap"
                                                  style="background:{typeof s.slot === 'number' ? slotOptionBg(s.slot) : '#fff'};color:#111"
                                                  title={typeof s.slot === 'number' ? `רביעייה ${slotGroupLetter(s.slot)}׳ · המשבצת ה${slotPosName(s.slot)} בטור` : ''}>
                                                {typeof s.slot === 'number' ? `${s.slot} · ${slotGroupLetter(s.slot)}׳` : '-'}
                                            </span>
                                            <select name="slot"
                                                    onchange={(e) => onSlotPick(e, s)}
                                                    class="px-1.5 py-1 rounded-lg bg-black/40 border border-white/15 text-white text-[11px] focus:outline-none focus:border-amber-400/50">
                                                <!-- כל רביעייה תחת כותרת משלה - הקשר מספר↔רביעייה קריא במילים,
                                                     לא רק בצבע; מקום תפוס שומר את צבע הרביעייה ומסומן באדום מודגש -->
                                                {#each groupSlotOptions(rowSlots) as grp (grp.letter)}
                                                    <optgroup label="— רביעייה {grp.letter}׳ · המשבצת ה{slotPosName(grp.nums[0])} בטור —">
                                                        {#each grp.nums as n (n)}
                                                            {@const occ = slotOccupants.get(n)}
                                                            {@const takenByOther = !!occ && occ.id !== s.id}
                                                            <option value={n} selected={n === s.slot}
                                                                    style="background:{slotOptionBg(n)};color:{takenByOther ? '#b91c1c' : '#111'};font-weight:{takenByOther ? '700' : '400'}">
                                                                {slotOptionLabel(n, s.id)}
                                                            </option>
                                                        {/each}
                                                    </optgroup>
                                                {/each}
                                            </select>
                                        </div>
                                        <button type="submit"
                                                onclick={(e) => confirmSlotMove(e, { ...s, slot: s.slot ?? null })}
                                                class="px-2 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-200 text-[11px] font-black hover:bg-purple-500/30 whitespace-nowrap"
                                                title="העבר למקום שנבחר; מקום תפוס - תתבקש לאשר החלפה בין השתיים">
                                            ⇄ העבר
                                        </button>
                                        {#if slotWarning[s.id]}
                                            <span class="text-[10px] font-bold text-amber-300 leading-snug max-w-[150px]">
                                                ⚠ {slotWarning[s.id]}
                                            </span>
                                        {/if}
                                    </form>
                                    <!-- שכפל פרסומת (סופר-אדמין): אותה פרסומת גם במקומות נוספים - למשל
                                         2 ו-6, כך שהיא נשארת באותו גובה ולא מתחלפת בסבב.
                                         תג ⧉ = שכפול קיים; לחיצה עליו מבטלת אותו -->
                                    {#if data.superAdmin}
                                        {@const dup = dupOptions(s)}
                                        <div class="mt-1 flex flex-wrap items-center gap-1 max-w-[200px]">
                                            {#each s.extraSlots ?? [] as n (n)}
                                                <form method="POST" action="?/removeExtraSlot" use:enhance>
                                                    <input type="hidden" name="id" value={s.id} />
                                                    <input type="hidden" name="slot" value={n} />
                                                    <button type="submit"
                                                            class="inline-flex h-6 items-center gap-1 rounded-lg border border-black/20 px-1.5 text-[11px] font-black whitespace-nowrap hover:opacity-80"
                                                            style="background:{slotOptionBg(n)};color:#111"
                                                            title="שכפול במקום {n} (המשבצת ה{slotPosName(n)} בטור) - לחיצה מבטלת את השכפול">
                                                        ⧉ {n} · {slotGroupLetter(n)}׳ <span class="text-red-700">✕</span>
                                                    </button>
                                                </form>
                                            {/each}
                                            {#if dup.same.length + dup.rest.length > 0}
                                                <form class="flex-1 min-w-[110px]" method="POST" action="?/addExtraSlot" use:enhance>
                                                    <input type="hidden" name="id" value={s.id} />
                                                    <select name="slot" aria-label="שכפל פרסומת"
                                                            onchange={(e) => e.currentTarget.form?.requestSubmit()}
                                                            class="h-7 w-full rounded-lg border border-sky-500/40 bg-sky-500/15 px-1.5 text-[11px] font-black text-sky-200 focus:border-sky-400/60 focus:outline-none">
                                                        <option value="" selected disabled>⧉ שכפל פרסומת</option>
                                                        {#if dup.same.length > 1}
                                                            <option value="same" style="background:#fff;color:#111;font-weight:700">
                                                                ★ קבועה בכל הסבב ({dup.same.join(', ')})
                                                            </option>
                                                        {/if}
                                                        {#if dup.same.length > 0}
                                                            <optgroup label="★ אותו גובה בטור">
                                                                {#each dup.same as n (n)}
                                                                    <option value={n} style="background:{slotOptionBg(n)};color:#111">{n} · {slotPosName(n)}</option>
                                                                {/each}
                                                            </optgroup>
                                                        {/if}
                                                        <optgroup label="מקומות פנויים אחרים">
                                                            {#each dup.rest as n (n)}
                                                                <option value={n} style="background:{slotOptionBg(n)};color:#111">{n} · {slotPosName(n)}</option>
                                                            {/each}
                                                        </optgroup>
                                                    </select>
                                                </form>
                                            {/if}
                                        </div>
                                    {/if}
                                </td>
                                <!-- פרסומת + מפרסם + סטטוס בתא אחד, מוערמים.
                                     ריחוף על הכותרת = תצוגה מקדימה צפה; הקשה = מודאל עם הכרטיס עצמו -->
                                <td class="px-2 py-2">
                                    <button type="button"
                                            onmouseenter={(e) => openHoverPreview(e, s.id)}
                                            onmouseleave={() => hoverPreview = null}
                                            onclick={() => { hoverPreview = null; modalPreviewId = s.id; }}
                                            title="תצוגה מקדימה של הפרסומת כפי שהיא מוצגת באתר"
                                            class="font-bold text-white line-clamp-2 break-words max-w-[160px] leading-snug text-right cursor-pointer underline decoration-dotted decoration-white/30 underline-offset-2 hover:text-amber-300">
                                        {s.title}
                                    </button>
                                    <div class="text-xs text-gray-300 truncate max-w-[160px] mt-0.5">{s.advertiserName || '-'}</div>
                                    <div class="text-[10px] text-gray-500 truncate max-w-[160px]">{s.advertiserEmail}</div>
                                    <span class="inline-block mt-1 text-[11px] font-black border px-2 py-0.5 rounded-full whitespace-nowrap {stateColor}">{stateLabel}</span>
                                </td>
                                <!-- כל נתוני הזמן בתא אחד: פורסם, פג, וכמה נותר מתוך המשך -->
                                <td class="px-2 py-2 text-xs leading-relaxed whitespace-nowrap">
                                    <div class="text-gray-300">פורסם: {fmtDay(s.publishedAt)} <span class="text-[10px] text-gray-500">{fmtTime(s.publishedAt)}</span></div>
                                    <div class="text-gray-300">פג: {fmtDay(s.expiresAt)} <span class="text-[10px] text-gray-500">{fmtTime(s.expiresAt)}</span></div>
                                    <div class="font-black {daysColor} mt-0.5">
                                        {s.daysLeft < 0 ? `${-s.daysLeft}- ימים` : `${s.daysLeft} ימים`}
                                        <span class="font-bold text-gray-500 text-[10px]">מתוך {s.durationDays}</span>
                                    </div>
                                    <div class="mt-1 h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
                                        <div class="h-full {s.state === 'expired' ? 'bg-red-400' : s.state === 'ending' ? 'bg-amber-400' : 'bg-emerald-400'}"
                                             style="width: {progress}%"></div>
                                    </div>
                                </td>
                                <!-- ניהול הפרסומת ישירות מהשורה: קציבת תקופה, השהיה, הורדה, מחיקה.
                                     רוחב מוגבל - הכפתורים נערמים בשתי שורות במקום להרחיב את הטבלה -->
                                <td class="px-2 py-2">
                                    <div class="grid grid-cols-3 gap-1 w-[210px]">
                                        <!-- פותח את חלון הקציבה: פרטי תשלום ותאריכים + שינוי תקופה/תפוגה.
                                             שמור לסופר-אדמין (כמו המחיקה) - אדמין רגיל לא רואה את הכפתור -->
                                        {#if data.superAdmin && rowById.has(s.id)}
                                            <button type="button"
                                                    onclick={() => openDurationModal(rowById.get(s.id))}
                                                    class="h-7 w-full inline-flex items-center justify-center px-1 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-200 text-[11px] font-black hover:bg-blue-500/30 whitespace-nowrap"
                                                    title="פרטי התקופה והתשלום + שינוי תקופה או תאריך תפוגה">
                                                ⏱ קצוב
                                            </button>
                                        {/if}

                                        {#if s.state === 'paused'}
                                            <form method="POST" action="?/resume" use:enhance>
                                                <input type="hidden" name="id" value={s.id} />
                                                <button type="submit"
                                                        class="h-7 w-full inline-flex items-center justify-center px-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-[11px] font-black hover:bg-emerald-500/30 whitespace-nowrap"
                                                        title="הימים השמורים נספרים מהיום">
                                                    ▶ המשך
                                                </button>
                                            </form>
                                        {:else}
                                            <form method="POST" action="?/pause" use:enhance>
                                                <input type="hidden" name="id" value={s.id} />
                                                <button type="submit"
                                                        class="h-7 w-full inline-flex items-center justify-center px-1 rounded-lg bg-white/10 border border-white/20 text-gray-200 text-[11px] font-black hover:bg-white/20 whitespace-nowrap"
                                                        title="יורדת מהאתר ושומרת את הימים שנותרו"
                                                        onclick={(e) => { if (!confirm('להשהות את הפרסומת? היא תרד מהאתר והימים שנותרו יישמרו לה.')) e.preventDefault(); }}>
                                                    ⏸ השהה
                                                </button>
                                            </form>
                                        {/if}

                                        <form method="POST" action="?/unapprove" use:enhance>
                                            <input type="hidden" name="id" value={s.id} />
                                            <button type="submit"
                                                    class="h-7 w-full inline-flex items-center justify-center px-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 text-[11px] font-black hover:bg-amber-500/25 whitespace-nowrap"
                                                    title="חוזרת לתור האישורים"
                                                    onclick={(e) => { if (!confirm('להוריד את הפרסומת מהאתר ולהחזיר אותה לממתינות?')) e.preventDefault(); }}>
                                                ⤴ הורד
                                            </button>
                                        </form>

                                        {#if data.superAdmin}
                                            <form method="POST" action="?/remove" use:enhance>
                                                <input type="hidden" name="id" value={s.id} />
                                                <button type="submit"
                                                        class="h-7 w-full inline-flex items-center justify-center px-1 rounded-lg bg-red-600/20 border border-red-500/40 text-red-300 text-[11px] font-black hover:bg-red-600/30 whitespace-nowrap"
                                                        onclick={(e) => { if (!confirm(`להעביר את "${s.title}" לאשפה? אפשר לשחזר אותה משם.`)) e.preventDefault(); }}>
                                                    🗑 מחק
                                                </button>
                                            </form>
                                        {/if}
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </section>

    <!-- ============================================================ -->
    <!-- מפרסמים — קיבוץ לפי אימייל (כמו בגמ"ח הארצי). מקופל כברירת  -->
    <!-- מחדל, כדי לא להאריך את הדף                                    -->
    <!-- ============================================================ -->
    <details class="rounded-2xl border border-white/10 bg-slate-800/80">
        <summary class="flex cursor-pointer list-none items-center gap-2 px-3 py-2">
            <span aria-hidden="true">👤</span>
            <h2 class="text-lg font-black text-white">מפרסמים</h2>
            <span class="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-xs font-bold text-gray-300">{data.advertisers.length}</span>
            <span class="mr-auto text-xs text-gray-500">▾</span>
        </summary>
        {#if data.advertisers.length === 0}
            <p class="px-3 pb-3 text-sm text-gray-500 italic">עוד אין מפרסמים במערכת</p>
        {:else}
            <div class="overflow-x-auto border-t border-white/10">
                <table class="w-full text-sm" dir="rtl">
                    <thead class="bg-white/5">
                        <tr class="text-[11px] text-gray-400">
                            <th class="px-3 py-2 text-right font-bold">שם</th>
                            <th class="hidden px-3 py-2 text-right font-bold md:table-cell">פרסומת</th>
                            <th class="hidden px-3 py-2 text-right font-bold md:table-cell">כתובת</th>
                            <th class="hidden px-3 py-2 text-right font-bold lg:table-cell">טלפון</th>
                            <th class="px-3 py-2 text-right font-bold">פרסומות</th>
                            <th class="px-3 py-2 text-right font-bold">פעילות</th>
                            <th class="hidden px-3 py-2 text-right font-bold md:table-cell">סוג</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.advertisers as a (a.key)}
                            <tr class="border-t border-white/10 hover:bg-white/5">
                                <td class="px-3 py-1.5 font-bold text-white">
                                    <div class="max-w-[160px] truncate">{a.name || '-'}</div>
                                    <div class="max-w-[160px] truncate text-[10px] text-gray-500">{a.email}</div>
                                </td>
                                <td class="hidden max-w-[160px] truncate px-3 py-1.5 text-gray-300 md:table-cell">{a.companyName || '-'}</td>
                                <td class="hidden max-w-[160px] truncate px-3 py-1.5 text-gray-300 md:table-cell">{a.address || '-'}</td>
                                <td class="hidden px-3 py-1.5 whitespace-nowrap text-gray-300 lg:table-cell" dir="ltr">{a.phone || '-'}</td>
                                <td class="px-3 py-1.5 text-gray-300">{a.adsCount}</td>
                                <td class="px-3 py-1.5 {a.activeCount > 0 ? 'font-black text-emerald-300' : 'text-gray-500'}">{a.activeCount}</td>
                                <td class="hidden px-3 py-1.5 md:table-cell">
                                    {#if a.isReturning}
                                        <span class="rounded-full border border-purple-500/40 bg-purple-500/15 px-2 py-0.5 text-[11px] font-black whitespace-nowrap text-purple-300">🔁 חוזר</span>
                                    {:else}
                                        <span class="rounded-full border border-blue-500/40 bg-blue-500/15 px-2 py-0.5 text-[11px] font-black whitespace-nowrap text-blue-300">חדש</span>
                                    {/if}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </details>

    <!-- תצוגה מקדימה צפה בריחוף על כותרת מודעה שעל האוויר (דסקטופ בלבד) -->
    {#if hoverPreview}
        {@const pAd = previewableById.get(hoverPreview.id)}
        {#if pAd}
            <div
                class="pointer-events-none fixed z-40 hidden drop-shadow-2xl md:block"
                style="left:{hoverPreview.x}px; top:{hoverPreview.y}px"
            >
                <AdCardPreview ad={pAd} />
            </div>
        {/if}
    {/if}

    <!-- מודאל תצוגה מקדימה בהקשה על הכותרת (נייד ודסקטופ) -->
    {#if modalPreviewId}
        {@const mAd = previewableById.get(modalPreviewId)}
        {#if mAd}
            <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
            <div
                class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
                role="presentation"
                onclick={() => (modalPreviewId = null)}
            >
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <div
                    class="my-auto flex flex-col items-center gap-3"
                    role="dialog"
                    aria-modal="true"
                    aria-label="תצוגה מקדימה של הפרסומת"
                    tabindex="-1"
                    onclick={(e) => e.stopPropagation()}
                >
                    <AdCardPreview ad={mAd} />
                    <div class="flex items-center gap-2">
                        <a
                            href={`/ads/${mAd.id}`}
                            target="_blank"
                            rel="noopener"
                            class="rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 py-1.5 text-xs font-black text-amber-200 hover:bg-amber-500/30"
                        >
                            פתח דף נחיתה
                        </a>
                        <button
                            type="button"
                            onclick={() => (modalPreviewId = null)}
                            class="cursor-pointer rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-black text-gray-200 hover:bg-white/20"
                        >
                            ✕ סגור
                        </button>
                    </div>
                </div>
            </div>
        {/if}
    {/if}
</div>

<!-- חלון הקציבה: כל מה שצריך לדעת על התקופה והתשלום של המודעה,
     ושתי דרכי שינוי — מסלול ימים (נספר מיום האישור) או תאריך תפוגה שרירותי -->
{#if durationModal}
    {@const m = durationModal}
    {@const mPlan = data.plans.find((p) => p.days === m.requestedDurationDays)}
    {@const mDurOptions = m.durationDays && !DURATION_OPTIONS.includes(m.durationDays)
        ? [...DURATION_OPTIONS, m.durationDays].sort((a, b) => a - b)
        : DURATION_OPTIONS}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
         role="presentation"
         onclick={() => (durationModal = null)}>
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div class="my-auto w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-5 shadow-2xl"
             role="dialog" aria-modal="true" aria-label="קציבת תקופת פרסום" tabindex="-1"
             onclick={(e) => e.stopPropagation()}>
            <div class="mb-3 flex items-start justify-between gap-2">
                <h3 class="text-base leading-snug font-black text-white">⏱ קציבת תקופה — {m.title}</h3>
                <button type="button" onclick={() => (durationModal = null)}
                        class="shrink-0 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs font-black text-gray-200 hover:bg-white/20">
                    ✕
                </button>
            </div>

            <!-- מה המפרסם שילם ומתי — כל הנתונים במקום אחד -->
            <dl class="mb-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                <dt class="font-bold text-gray-500">מפרסם</dt>
                <dd class="font-bold text-gray-200">{m.submittedBy?.name || m.advertiserName || '-'}
                    {#if m.submittedBy?.email}<span class="font-normal text-gray-500">· {m.submittedBy.email}</span>{/if}
                </dd>
                <dt class="font-bold text-gray-500">מסלול שנרכש</dt>
                <dd class="font-bold text-gray-200">
                    {mPlan ? `${mPlan.label} — ${mPlan.price} ₪` : `${m.requestedDurationDays || '-'} ימים`}
                </dd>
                <dt class="font-bold text-gray-500">סטטוס תשלום</dt>
                <dd class="font-black {m.payment === 'pending' ? 'text-amber-300' : 'text-emerald-300'}">
                    {paymentLabel(m.payment)}
                </dd>
                <dt class="font-bold text-gray-500">הוגש</dt>
                <dd class="text-gray-200">{m.submittedAt ? absDate(m.submittedAt) : '-'}</dd>
                <dt class="font-bold text-gray-500">פורסם</dt>
                <dd class="text-gray-200">{m.decidedAt ? absDate(m.decidedAt) : '-'}</dd>
                <dt class="font-bold text-gray-500">פג בתאריך</dt>
                <dd class="text-gray-200">{m.expiresAt ? absDate(m.expiresAt) : '-'}</dd>
                <dt class="font-bold text-gray-500">נותרו</dt>
                <dd class="font-black {m.daysLeft <= 0 ? 'text-red-300' : m.daysLeft <= 7 ? 'text-amber-300' : 'text-emerald-300'}">
                    {m.daysLeft} ימים
                    {#if m.durationDays}<span class="font-bold text-gray-500">מתוך {m.durationDays}</span>{/if}
                    {#if m.paused}<span class="text-blue-300">(מושהית)</span>{/if}
                </dd>
            </dl>

            <!-- דרך 1: קציבה במסלול ימים, נספרת מיום האישור -->
            <form method="POST" action="?/setDuration" use:enhance={closeOnSubmit} class="mb-2 flex items-center gap-2">
                <input type="hidden" name="id" value={m.id} />
                <label class="shrink-0 text-xs font-bold text-gray-400" for="dur-days">תקופה מיום האישור</label>
                <select id="dur-days" name="duration_days"
                        class="flex-1 rounded-lg border border-white/10 bg-slate-800/80 px-2 py-1.5 text-xs text-white">
                    {#each mDurOptions as d (d)}
                        <option value={d} selected={d === m.durationDays} class="bg-slate-900">{d} ימים</option>
                    {/each}
                </select>
                <button type="submit"
                        class="cursor-pointer rounded-xl border border-blue-400/40 bg-blue-500/15 px-3 py-1.5 text-xs font-bold whitespace-nowrap text-blue-200 hover:bg-blue-500/25">
                    קצוב
                </button>
            </form>

            <!-- דרך 2: תאריך תפוגה שרירותי — המודעה יורדת בסוף היום שנבחר -->
            <form method="POST" action="?/setExpiry" use:enhance={closeOnSubmit} class="flex items-center gap-2">
                <input type="hidden" name="id" value={m.id} />
                <label class="shrink-0 text-xs font-bold text-gray-400" for="dur-date">או תאריך תפוגה</label>
                <input id="dur-date" type="date" name="expires" required value={toDateInput(m.expiresAt)}
                       class="flex-1 rounded-lg border border-white/10 bg-slate-800/80 px-2 py-1 text-xs text-white" />
                <button type="submit"
                        class="cursor-pointer rounded-xl border border-purple-400/40 bg-purple-500/15 px-3 py-1.5 text-xs font-bold whitespace-nowrap text-purple-200 hover:bg-purple-500/25">
                    קבע תאריך
                </button>
            </form>
            <p class="mt-3 text-[10px] leading-snug text-gray-500">
                קציבה במסלול נספרת מיום האישור, ולכן מסלול קצר מהזמן שכבר עבר מוריד את המודעה מיד.
                תאריך ידני קובע את התפוגה לסוף היום שנבחר — גם אחורה (הורדה מיידית) וגם קדימה.
            </p>
        </div>
    </div>
{/if}

<svelte:window
    onkeydown={(e) => {
        if (e.key === 'Escape') {
            modalPreviewId = null;
            hoverPreview = null;
            durationModal = null;
        }
    }}
/>
