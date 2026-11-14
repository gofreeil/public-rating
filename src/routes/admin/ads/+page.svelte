<script lang="ts">
    // ניהול הפרסומות — אישור, דחייה, הארכה, הסרה והזנה ידנית
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import { page } from '$app/state';
    import { onDestroy, onMount } from 'svelte';
    import { AD_GRADIENTS } from '$lib/ads/gradients';
    import { adImgFit, parseAdImageFit } from '$lib/adImageFit';
    import { heMatches } from '$lib/rating/heSearch';
    import { absDate } from '$lib/rating/time';
    import Seo from '$lib/components/rating/Seo.svelte';
    import AdCardPreview from '$lib/components/AdCardPreview.svelte';
    import AdRemoveDialog from '$lib/components/AdRemoveDialog.svelte';
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let showCreate = $state(false);

    // ===== טאבים, חיפוש, מיון ובחירה רב-פריטית — כמו בגמ"ח הארצי =====
    type Tab = 'pending' | 'approved' | 'rejected' | 'trash';
    let activeTab = $state<Tab>('pending');
    let trashOpen = $state(false);
    let searchQuery = $state('');
    // 'display' = הסדר שבו הפרסומות מוצגות באתר (לפי המקום בטור).
    // רק במיון הזה אפשר להחליף מקום - אחרת החצים היו מזיזים ביחס לתצוגה אחרת.
    let sortOrder = $state<'display' | 'newest' | 'oldest'>('display');
    let canDelete = $derived(data.superAdmin);

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
    function selectAllVisible(ids: string[]) {
        selected = new Set([...selected, ...ids]);
    }
    function fmtDate(s?: string) {
        if (!s) return '';
        return new Date(s).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    // עריכת הטקסטים בשורה (כותרת, משנה, כפתור, ריחוף)
    let editingId = $state<string | null>(null);
    let edit = $state({ title: '', subtitle: '', cta: '', hoverText: '' });
    function startEdit(ad: { id: string; title: string; subtitle: string; cta: string; hoverText: string }) {
        editingId = ad.id;
        edit = { title: ad.title, subtitle: ad.subtitle, cta: ad.cta, hoverText: ad.hoverText };
    }
    function cancelEdit() { editingId = null; }
    /**
     * "ערוך" בטבלת התזמון פותח את הפרסומת בסטודיו. השמירה שם מעדכנת אותה
     * במקום (בלי גרסה שממתינה לאישור) וחוזרת לכאן עם ?adEdited=<id>.
     */
    function studioEditHref(id: string): string {
        return `/advertise/builder?edit=${encodeURIComponent(id)}&return=${encodeURIComponent('/admin/ads')}`;
    }
    /** הפרסומת שנשמרה הרגע בסטודיו - הודעת הצלחה והדגשת השורה שלה */
    let justEditedId = $derived(page.url.searchParams.get('adEdited') ?? '');
    let justEditedTitle = $derived(data.rows.find((a) => a.id === justEditedId)?.title ?? '');
    let lastRefresh = $state(Date.now());

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
                activeTab = ad.status === 'pending' ? 'pending' : ad.status === 'approved' && !ad.expired ? 'approved' : ad.status === 'rejected' ? 'rejected' : 'trash';
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
                if (lastSig !== null && sig !== lastSig) {
                    await invalidateAll();
                    lastRefresh = Date.now();
                }
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

    // "מחק" פותח חלון עם כרטיס הפרסומת שנמחקת - לראות בדיוק מה מוחקים
    let removeAsk = $state<{ form: HTMLFormElement; ad: any } | null>(null);
    function askRemove(e: MouseEvent, ad: any, question = '') {
        const form = (e.currentTarget as HTMLButtonElement).form;
        if (form && ad) { e.preventDefault(); removeAsk = { form, ad }; return; }
        if (question && !confirm(question)) e.preventDefault();
    }
    function finishRemove() {
        const form = removeAsk?.form;
        removeAsk = null;
        form?.requestSubmit();
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
    const PREVIEW_W = 144, PREVIEW_H = 490; // מידות הכרטיס האמיתי בטור (w-36 × h-[490px])
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
    //
    // החלון נגזר מהנתונים החיים (לפי מזהה) ולא מצילום של השורה ברגע הפתיחה:
    // אחרי "קצוב" הדף נטען מחדש, והתאריכים בחלון מתעדכנים מול העיניים.
    let durationModalId = $state<string | null>(null);
    let durationModal = $derived(
        durationModalId ? (data.rows.find((a) => a.id === durationModalId) ?? null) : null,
    );
    /** המסלול שנבחר בבורר - כדי להציג את התפוגה שתצא ממנו עוד לפני הלחיצה */
    let selectedDays = $state(30);
    /** האם נשלח טופס מהחלון הפתוח - רק אז מציגים בו את תוצאת הפעולה */
    let modalSubmitted = $state(false);
    /** תאריך ISO → ערך של <input type="date"> */
    const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : '');
    function openDurationModal(ad: { id: string; durationDays: number }) {
        durationModalId = ad.id;
        selectedDays = ad.durationDays || 30;
        modalSubmitted = false;
    }
    function closeDurationModal() { durationModalId = null; }
    // אחרי שהשרת ענה והנתונים התרעננו - הבורר מיישר קו עם המסלול השמור
    $effect(() => {
        const d = durationModal?.durationDays;
        if (d) selectedDays = d;
    });
    /** התפוגה שתצא מהמסלול שנבחר - אותו חישוב כמו בשרת (מיום האישור) */
    let previewExpiry = $derived(
        durationModal?.decidedAt
            ? new Date(new Date(durationModal.decidedAt).getTime() + selectedDays * 86_400_000)
            : null,
    );
    /** שליחת טופס מתוך החלון: החלון נשאר פתוח, הנתונים מתרעננים והתוצאה מוצגת בו */
    function submitInModal() {
        modalSubmitted = true;
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
    const rejected = $derived(data.rows.filter((a) => a.status === 'rejected'));
    let canReorder = $derived(sortOrder === 'display' && !searchQuery.trim());

    /** חיפוש + מיון על הרשימה של הטאב הפעיל */
    function applyFilter<T extends (typeof data.rows)[number]>(list: T[], bySlot = false): T[] {
        const q = searchQuery.trim();
        const filtered = q
            ? list.filter((a) => heMatches(q, a.title, a.subtitle, a.submittedByName, a.contactEmail, a.landing.phone))
            : [...list];
        if (sortOrder === 'display') {
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
            : activeTab === 'approved'
              ? applyFilter(liveAds, true)
              : activeTab === 'rejected'
                ? applyFilter(rejected)
                : [],
    );
    const visibleSelectedIds = $derived([...selected].filter((id) => visibleList.some((a) => a.id === id)));

    function confirmPurge(title: string, cancel: () => void) {
        if (!confirm(`למחוק לצמיתות את "${title}"? אין דרך חזרה.`)) cancel();
    }

    const inputCls =
        'w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-400/60 focus:outline-none';

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

<div class="mx-auto flex max-w-6xl flex-col gap-4 md:gap-5">
    <!-- כותרת -->
    <header class="flex flex-wrap items-start gap-3 justify-between">
        <div class="min-w-0">
            <h2 class="text-2xl md:text-3xl font-black text-white mb-1">📢 ניהול פרסומות</h2>
            <p class="text-xs md:text-sm text-gray-400">
                פרסומות שנשלחו על־ידי משתמשים - אשר/דחה לפני פרסום באתר · {data.live} על האוויר מתוך {data.slotCount} משבצות
            </p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
            <button type="button"
                    onclick={() => { invalidateAll(); lastRefresh = Date.now(); }}
                    class="cursor-pointer px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-bold hover:bg-amber-500/25"
                    title="רענן עכשיו">
                🔄 רענן
            </button>
            <label class="text-xs text-gray-400 flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" bind:checked={autoRefresh} class="accent-amber-500" />
                רענון אוטומטי
            </label>
        </div>
    </header>

    {#if data.backendUnavailable}
        <div class="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            ⚠️ הבאקאנד (Strapi) לא זמין כרגע - הרשימות והסטטיסטיקות עשויות להיות חלקיות. נסה לרענן בעוד רגע.
        </div>
    {/if}

    <!-- סטטיסטיקות -->
    <section class="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
        <div class="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-center">
            <div class="text-[10px] md:text-xs text-amber-300 font-bold uppercase tracking-wide">ממתינות</div>
            <div class="text-2xl md:text-3xl font-black text-amber-200">{data.stats.pending}</div>
        </div>
        <div class="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-center">
            <div class="text-[10px] md:text-xs text-emerald-300 font-bold uppercase tracking-wide">פורסמו</div>
            <div class="text-2xl md:text-3xl font-black text-emerald-200">{data.stats.approved}</div>
        </div>
        <div class="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-center">
            <div class="text-[10px] md:text-xs text-red-300 font-bold uppercase tracking-wide">נדחו</div>
            <div class="text-2xl md:text-3xl font-black text-red-200">{data.stats.rejected}</div>
        </div>
        <div class="rounded-xl border border-blue-500/30 bg-blue-500/5 px-3 py-2.5 text-center">
            <div class="text-[10px] md:text-xs text-blue-300 font-bold uppercase tracking-wide">השבוע נשלחו</div>
            <div class="text-2xl md:text-3xl font-black text-blue-200">{data.stats.submittedThisWeek}</div>
        </div>
        <div class="rounded-xl border border-purple-500/30 bg-purple-500/5 px-3 py-2.5 text-center col-span-2 md:col-span-1">
            <div class="text-[10px] md:text-xs text-purple-300 font-bold uppercase tracking-wide">השבוע אושרו</div>
            <div class="text-2xl md:text-3xl font-black text-purple-200">{data.stats.approvedThisWeek}</div>
        </div>
    </section>

    <!-- הודעות -->
    {#if form?.success}
        <div class="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200 text-sm font-bold">
            ✅ {form.message}
        </div>
    {/if}
    {#if justEditedId && !form}
        <div class="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200 text-sm font-bold">
            ✅ השינויים {justEditedTitle ? `ב"${justEditedTitle}"` : 'בפרסומת'} נשמרו ומוצגים באתר
        </div>
    {/if}
    {#if form && 'error' in form && form.error}
        <div class="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200 text-sm font-bold">
            ❌ {form.error}
        </div>
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
    <div class="flex gap-1.5 md:gap-2 overflow-x-auto pb-1">
        <button type="button" onclick={() => setTab('pending')}
                class="cursor-pointer px-4 py-2 rounded-xl font-black text-sm whitespace-nowrap transition-all
                       {activeTab === 'pending' ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'}">
            ⏳ ממתינות ({data.stats.pending})
        </button>
        <button type="button" onclick={() => setTab('approved')}
                class="cursor-pointer px-4 py-2 rounded-xl font-black text-sm whitespace-nowrap transition-all
                       {activeTab === 'approved' ? 'bg-emerald-500 text-black' : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'}">
            ✅ פורסמו ({liveAds.length})
        </button>
        <button type="button" onclick={() => setTab('rejected')}
                class="cursor-pointer px-4 py-2 rounded-xl font-black text-sm whitespace-nowrap transition-all
                       {activeTab === 'rejected' ? 'bg-red-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'}">
            ❌ נדחו ({data.stats.rejected})
        </button>
        <button type="button" onclick={() => setTab('trash')}
                title="פרסומות שנמחקו או שפג תוקפן - לשחזור או לחידוש"
                class="cursor-pointer px-4 py-2 rounded-xl font-black text-sm whitespace-nowrap transition-all
                       {activeTab === 'trash' ? 'bg-gray-200 text-black' : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'}">
            🗑 אשפה ({data.trash.length})
        </button>
    </div>

    {#if activeTab !== 'trash'}
        <!-- חיפוש + מיון -->
        <div class="flex flex-wrap gap-2 md:gap-3">
            <input type="text" bind:value={searchQuery}
                   placeholder="🔎 חיפוש לפי כותרת, מפרסם, אימייל או טלפון..."
                   class="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-amber-400/50" />
            <select bind:value={sortOrder}
                    class="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/50">
                <option value="display" style="background:#fff;color:#111">סדר התצוגה באתר</option>
                <option value="newest" style="background:#fff;color:#111">חדש לישן</option>
                <option value="oldest" style="background:#fff;color:#111">ישן לחדש</option>
            </select>
        </div>
    {/if}

    <!-- שורת בחירה רב־פריטית (רק ב-pending) -->
    {#if activeTab === 'pending' && visibleList.length > 0}
        <div class="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <button type="button"
                    onclick={() => selectAllVisible(visibleList.map((a) => a.id))}
                    class="cursor-pointer text-xs font-bold text-amber-300 hover:text-amber-200">
                בחר הכל ({visibleList.length})
            </button>
            <span class="text-gray-600 text-xs">·</span>
            <button type="button" onclick={clearSelection}
                    class="cursor-pointer text-xs font-bold text-gray-400 hover:text-gray-300">
                נקה
            </button>
            {#if visibleSelectedIds.length > 0}
                <span class="text-xs text-gray-300 mr-2">נבחרו {visibleSelectedIds.length}</span>
                <form method="POST" action="?/bulkApprove" use:enhance={() => async ({ update }) => { clearSelection(); await update(); }}
                      class="inline-flex">
                    <input type="hidden" name="ids" value={visibleSelectedIds.join(',')} />
                    <button type="submit"
                            class="cursor-pointer px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-black text-xs hover:bg-emerald-400">
                        ✅ אשר את הנבחרים
                    </button>
                </form>
                <form method="POST" action="?/bulkReject" use:enhance={() => async ({ update }) => { clearSelection(); await update(); }}
                      class="inline-flex gap-1">
                    <input type="hidden" name="ids" value={visibleSelectedIds.join(',')} />
                    <input type="text" name="reason" maxlength="300" placeholder="סיבת דחייה (אופציונלי)"
                           class="px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-white text-xs w-40" />
                    <button type="submit"
                            class="cursor-pointer px-3 py-1.5 rounded-lg bg-red-600 text-white font-black text-xs hover:bg-red-500">
                        ❌ דחה את הנבחרים
                    </button>
                </form>
            {/if}
        </div>
    {/if}

    <!-- רשימה -->
    {#if activeTab === 'trash'}
        <!-- אשפה: נמחקה = שחזור למצב הקודם (המקום והתוקף נשמרו); פגה = חידוש לתקופה חדשה.
             מחיקה לצמיתות - סופר-אדמין בלבד, ורק ממה שכבר באשפה -->
        {#if data.trash.length === 0}
            <div class="text-center py-12 text-gray-500 text-sm italic border border-dashed border-white/10 rounded-2xl">האשפה ריקה</div>
        {/if}
        <div class="grid gap-2">
            {@render trashRows()}
        </div>
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
        <div class="text-center py-12 text-gray-500 text-sm italic border border-dashed border-white/10 rounded-2xl">
            {searchQuery ? 'לא נמצאו תוצאות לחיפוש' :
             activeTab === 'pending' ? 'אין פרסומות שממתינות לאישור' :
             activeTab === 'approved' ? 'עוד לא פורסמו פרסומות' : 'אין פרסומות שנדחו'}
        </div>
    {:else}
        <div class="grid gap-3 md:gap-4">
            {#each visibleList as ad, adIndex (ad.id)}
                <article id="ad-{ad.id}" class="scroll-mt-24 rounded-2xl border border-white/10 bg-white/5 p-3 md:p-5">
                    {#if activeTab === 'approved'}
                        {@const slotN = ad.slot ?? adIndex + 1}
                        <!-- מיקום הפרסומת בטור הפרסומות באתר + החלפת מקום -->
                        <div class="flex items-center gap-2 mb-3 pb-3 border-b border-white/10 flex-wrap">
                            <span class="inline-flex items-center justify-center min-w-7 h-7 px-1.5 rounded-lg border border-black/20 font-black text-sm whitespace-nowrap"
                                  style="background:{slotOptionBg(slotN)};color:#111"
                                  title="רביעייה {slotGroupLetter(slotN)}׳ · המשבצת ה{slotPosName(slotN)} בטור">
                                {slotN} · {slotGroupLetter(slotN)}׳
                            </span>
                            <span class="text-[11px] md:text-xs text-gray-400 font-bold">
                                מקום {slotN} מתוך {data.slotCount} בטור הפרסומות
                            </span>
                            {#if canReorder}
                                <div class="flex items-center gap-1.5 mr-auto">
                                    <form method="POST" action="?/move" use:enhance>
                                        <input type="hidden" name="id" value={ad.id} />
                                        <input type="hidden" name="dir" value="up" />
                                        <button type="submit" disabled={adIndex === 0}
                                                class="cursor-pointer px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-gray-200 font-black text-xs hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="העלה מקום אחד למעלה">
                                            ▲ למעלה
                                        </button>
                                    </form>
                                    <form method="POST" action="?/move" use:enhance>
                                        <input type="hidden" name="id" value={ad.id} />
                                        <input type="hidden" name="dir" value="down" />
                                        <button type="submit" disabled={adIndex === visibleList.length - 1}
                                                class="cursor-pointer px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-gray-200 font-black text-xs hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="הורד מקום אחד למטה">
                                            ▼ למטה
                                        </button>
                                    </form>
                                </div>
                            {:else}
                                <span class="text-[10px] text-gray-500 mr-auto">
                                    כדי להחליף מקום - בחר מיון "סדר התצוגה באתר" ונקה את החיפוש
                                </span>
                            {/if}
                        </div>
                    {/if}
                    <div class="flex flex-col md:flex-row gap-3 md:gap-4">
                        {#if activeTab === 'pending'}
                            <label class="flex-shrink-0 inline-flex items-start pt-1 cursor-pointer">
                                <input type="checkbox"
                                       checked={selected.has(ad.id)}
                                       onchange={() => toggleSelect(ad.id)}
                                       aria-label="בחירת {ad.title}"
                                       class="w-5 h-5 accent-amber-500" />
                            </label>
                        {/if}

                        {#if ad.mainImage}
                            <!-- אותו מיקום/זום שהמפרסם קבע בבילדר - המנהל מאשר את מה שבאמת יוצג -->
                            <div class="relative overflow-hidden w-full md:w-40 h-32 md:h-40 rounded-xl border border-white/10 flex-shrink-0">
                                <img src={ad.mainImage} alt={ad.title}
                                     class="w-full h-full object-cover"
                                     use:adImgFit={parseAdImageFit(ad.mainImageFit)} />
                            </div>
                        {/if}
                        {#if ad.mobileImage}
                            <!-- התמונה הייעודית לפופ-אפ בנייד (אם הוגדרה) - באותו מיקום/זום שנבחר לה -->
                            <div class="relative flex-shrink-0 w-full md:w-24 h-32 md:h-40">
                                <div class="relative overflow-hidden h-full w-24 mx-auto md:mx-0 rounded-xl border border-sky-400/30">
                                    <img src={ad.mobileImage} alt="{ad.title} - נייד"
                                         class="w-full h-full object-cover"
                                         use:adImgFit={parseAdImageFit(ad.mobileImageFit)} />
                                </div>
                                <span class="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[9px] font-black text-sky-300">📱 נייד</span>
                            </div>
                        {/if}

                        <div class="flex-1 min-w-0">
                            {#if editingId === ad.id}
                                <form method="POST" action="?/update"
                                      use:enhance={() => async ({ result, update }) => { if (result.type === 'success') editingId = null; await update(); }}
                                      class="space-y-2">
                                    <input type="hidden" name="id" value={ad.id} />
                                    <input type="text" name="title" bind:value={edit.title} maxlength="40" required
                                           class="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-amber-400/40 text-white font-bold text-base" />
                                    <input type="text" name="subtitle" bind:value={edit.subtitle} maxlength="70"
                                           class="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-sm" />
                                    <input type="text" name="cta" bind:value={edit.cta} maxlength="30" placeholder="טקסט CTA"
                                           class="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs" />
                                    <!-- textarea ולא input: המפרסם יכול לרדת שורה בטקסט ה-hover,
                                         ו-input היה משטח את ירידות השורה בכל שמירה של האדמין -->
                                    <textarea name="hoverText" bind:value={edit.hoverText} maxlength="90" placeholder="טקסט hover" rows="2"
                                              class="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs resize-y"></textarea>
                                    <div class="flex gap-2">
                                        <button type="submit"
                                                class="cursor-pointer px-3 py-1.5 rounded-lg bg-amber-500 text-black font-black text-xs">
                                            💾 שמור
                                        </button>
                                        <button type="button" onclick={cancelEdit}
                                                class="cursor-pointer px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 text-xs">
                                            ביטול
                                        </button>
                                    </div>
                                </form>
                            {:else}
                                <!-- מפרסם חוזר ששיפר את הפרסומת שלו: לא בקשה חדשה אלא גרסה
                                     מעודכנת, והאישור מחליף את הישנה במקום להוסיף פרסומת שנייה -->
                                {#if ad.replacesAdId && ad.status === 'pending'}
                                    <div class="mb-2 rounded-lg border border-blue-400/40 bg-blue-500/10 px-2.5 py-1.5">
                                        <p class="text-[11px] md:text-xs font-black text-blue-200 m-0">
                                            🔄 עדכון לפרסומת קיימת{ad.replacesTitle ? ` - גרסה קודמת: "${ad.replacesTitle}"` : ''}
                                        </p>
                                        <p class="text-[10px] md:text-[11px] text-blue-100/70 m-0 mt-0.5">
                                            {ad.replacesLive
                                                ? 'עם האישור הגרסה הזו נכנסת במקום הישנה, באותו מקום בטור ועם אותו תאריך סיום - הישנה יורדת מהאתר.'
                                                : 'למפרסם אין כרגע פרסומת פעילה על האתר - האישור פשוט יפרסם את הגרסה הזו.'}
                                        </p>
                                    </div>
                                {:else if ad.supersededBy}
                                    <div class="mb-2 rounded-lg border border-gray-500/40 bg-white/5 px-2.5 py-1.5">
                                        <p class="text-[11px] md:text-xs font-black text-gray-300 m-0">
                                            🔄 גרסה ישנה - הוחלפה בגרסה מעודכנת של המפרסם
                                        </p>
                                    </div>
                                {/if}
                                <!-- פרסומת שעל האוויר: ריחוף על הכותרת = הכרטיס האמיתי צף;
                                     הקשה = מודאל עם הכרטיס + קישור לדף הנחיתה -->
                                {#if previewableById.has(ad.id)}
                                    <h3 class="text-base md:text-lg font-black text-white mb-1">
                                        <button
                                            type="button"
                                            onmouseenter={(e) => openHoverPreview(e, ad.id)}
                                            onmouseleave={() => (hoverPreview = null)}
                                            onclick={() => { hoverPreview = null; modalPreviewId = ad.id; }}
                                            title="תצוגה מקדימה של הפרסומת כפי שהיא מוצגת באתר"
                                            class="cursor-pointer text-right font-black underline decoration-dotted decoration-white/30 underline-offset-2 hover:text-amber-300"
                                        >{ad.title}</button>
                                    </h3>
                                {:else}
                                    <h3 class="text-base md:text-lg font-black text-white mb-1">{ad.title}</h3>
                                {/if}
                                <p class="text-xs md:text-sm text-gray-300 mb-1">{ad.subtitle}</p>
                                {#if ad.cta}
                                    <p class="text-[10px] md:text-xs text-amber-300 mb-2">CTA: {ad.cta}</p>
                                {/if}
                                {#if ad.hoverText}
                                    <p class="text-[10px] md:text-xs text-gray-500 mb-2">Hover: {ad.hoverText}</p>
                                {/if}
                                <div class="text-[10px] md:text-xs text-gray-400 space-y-0.5">
                                    {#if ad.submittedByName}<div>👤 {ad.submittedByName}</div>{/if}
                                    {#if ad.contactEmail}<div>📧 {ad.contactEmail}</div>{/if}
                                    <div>📅 נשלח: {fmtDate(ad.submittedAt)}</div>
                                    {#if ad.decidedAt}<div>🕒 הוחלט: {fmtDate(ad.decidedAt)}</div>{/if}
                                    {#if ad.editedAfterDecision}<div class="text-amber-300">✏️ נערכה אחרי האישור</div>{/if}
                                    {#if ad.status === 'approved' && !ad.expired}
                                        <div class="text-emerald-300">
                                            ⏳ {ad.daysLeft} ימים נותרו{#if ad.paused} · <span class="text-blue-300 font-bold">⏸ מושהית ({ad.pausedDaysLeft ?? 0} ימים שמורים)</span>{/if}
                                        </div>
                                    {/if}
                                    {#if ad.landing.phone}<div>☎️ {ad.landing.phone}</div>{/if}
                                    {#if ad.landing.website}
                                        <!--
                                          כתובת של מודעה שטרם אושרה לא הופכת לקישור.
                                          במקור היא רונדרה כ-href גם בתור האישורים, וזה
                                          הפך את מסך האדמין ליעד: כתובת javascript: הייתה
                                          מתבצעת בדפדפן שלו בלחיצה.
                                        -->
                                        {#if ad.status === 'approved'}
                                            <div><a href={ad.landing.website} target="_blank" rel="noopener noreferrer nofollow"
                                                    class="text-blue-400 hover:text-blue-300">🌐 {ad.landing.website}</a></div>
                                        {:else}
                                            <div class="break-all">🌐 {ad.landing.website}</div>
                                        {/if}
                                    {/if}
                                    {#if ad.landing.address}<div>📍 {ad.landing.address}</div>{/if}
                                    {#if ad.bytes > 0}<div>💾 {Math.round(ad.bytes / 1024)}KB</div>{/if}
                                    {#if ad.rejectionReason}<div class="text-red-300">❌ סיבת דחייה: {ad.rejectionReason}</div>{/if}
                                </div>
                                {#if ad.status === 'approved' && ad.stats.impressions > 0}
                                    <div class="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                                        <span class="rounded-full border border-white/10 bg-slate-800/80 px-2 py-0.5 text-gray-400">👁 {ad.stats.impressions} חשיפות</span>
                                        <span class="rounded-full border border-white/10 bg-slate-800/80 px-2 py-0.5 text-gray-400">🖱 {ad.stats.clicks} קליקים ({(ad.stats.ctr * 100).toFixed(1)}%)</span>
                                        <span class="rounded-full border border-white/10 bg-slate-800/80 px-2 py-0.5 text-gray-400">📄 {ad.stats.landing} צפיות בנחיתה</span>
                                        <span class="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">📞 {ad.stats.leads} פניות</span>
                                    </div>
                                {/if}
                            {/if}
                        </div>
                    </div>

                    {#if editingId !== ad.id}
                        <details class="mt-3 text-xs text-gray-300">
                            <summary class="cursor-pointer text-amber-300 font-bold">תצוגה מקדימה של דף הנחיתה</summary>
                            <div class="mt-2 p-3 rounded-lg bg-black/40 border border-white/10 space-y-2">
                                {#if ad.landing.headline}<p class="font-bold text-white">{ad.landing.headline}</p>{/if}
                                {#if ad.landing.pitch}<p>{ad.landing.pitch}</p>{/if}
                                {#if ad.landing.advantages?.some((a: string) => a?.trim())}
                                    <ul class="list-disc pr-5">
                                        {#each ad.landing.advantages as a}
                                            {#if a?.trim()}<li>{a}</li>{/if}
                                        {/each}
                                    </ul>
                                {/if}
                                <!-- preview=1: הכרטיס הזה מוצג גם ב"ממתינות" ו"נדחו",
                                     ושם /ads/<id> חסום לציבור. השרת פותח אותו לאדמין בלבד. -->
                                <a href={`/ads/${ad.id}?preview=1`} target="_blank" rel="noopener noreferrer"
                                   class="inline-block mt-2 px-3 py-1.5 rounded-lg bg-white/10 text-amber-300 font-bold hover:bg-white/15">
                                    פתח את דף הנחיתה המלא →
                                </a>
                            </div>
                        </details>

                        <!-- פעולות לפי טאב -->
                        <div class="mt-4 flex flex-wrap gap-2">
                            {#if activeTab === 'pending'}
                                <form method="POST" action="?/approve" use:enhance class="flex items-center gap-1.5">
                                    <input type="hidden" name="id" value={ad.id} />
                                    <select name="duration_days" aria-label="מסלול פרסום"
                                            class="px-2 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-xs">
                                        {#each data.plans as p (p.days)}
                                            <option value={p.days} selected={p.days === ad.requestedDurationDays} style="background:#fff;color:#111">
                                                {p.label}
                                            </option>
                                        {/each}
                                    </select>
                                    <button type="submit"
                                            class="cursor-pointer px-4 py-2 rounded-xl bg-emerald-500 text-black font-black text-sm hover:bg-emerald-400"
                                            title={ad.replacesLive ? 'אשר את הגרסה החדשה במקום הישנה' : 'אשר ופרסם בטור הפרסומות'}>
                                        {ad.replacesLive ? '✅ אשר והחלף את הישנה' : '✅ אשר ופרסם'}
                                    </button>
                                </form>
                                {#if ad.replacesLive}
                                    <!-- מפרסם שבאמת רוצה שתי פרסומות במקביל, ולא שדרג את הקיימת -->
                                    <form method="POST" action="?/approve" use:enhance>
                                        <input type="hidden" name="id" value={ad.id} />
                                        <input type="hidden" name="keepPrevious" value="1" />
                                        <input type="hidden" name="duration_days" value={ad.requestedDurationDays} />
                                        <button type="submit"
                                                class="cursor-pointer px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-gray-300 font-black text-sm hover:bg-white/10"
                                                title="הישנה תישאר על האתר וזו תתווסף לידה">
                                            ➕ אשר כפרסומת נוספת
                                        </button>
                                    </form>
                                {/if}
                                <button type="button" onclick={() => startEdit(ad)}
                                        class="cursor-pointer px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-200 font-black text-sm hover:bg-blue-500/30">
                                    ✏️ ערוך לפני אישור
                                </button>
                                <form method="POST" action="?/reject" use:enhance class="flex gap-2 flex-1 min-w-[220px]">
                                    <input type="hidden" name="id" value={ad.id} />
                                    <input type="text" name="reason" maxlength="300" placeholder="סיבת דחייה (אופציונלי)"
                                           class="flex-1 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" />
                                    <button type="submit"
                                            class="cursor-pointer px-4 py-2 rounded-xl bg-red-600 text-white font-black text-sm hover:bg-red-500">
                                        ❌ דחה
                                    </button>
                                </form>
                            {:else if activeTab === 'approved'}
                                <a href={`/ads/${ad.id}`} target="_blank" rel="noopener"
                                   class="px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 font-black text-sm hover:bg-amber-500/25">
                                    פתח דף נחיתה
                                </a>
                                <button type="button" onclick={() => startEdit(ad)}
                                        class="cursor-pointer px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-200 font-black text-sm hover:bg-blue-500/30">
                                    ✏️ ערוך
                                </button>
                                <!-- הארכה: מוסיפה ימים על התקופה הקיימת -->
                                <form method="POST" action="?/extend" use:enhance class="flex items-center gap-1.5">
                                    <input type="hidden" name="id" value={ad.id} />
                                    <select name="duration_days" aria-label="הארכה"
                                            class="px-2 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-xs">
                                        {#each data.plans as p (p.days)}
                                            <option value={p.days} style="background:#fff;color:#111">{p.label}</option>
                                        {/each}
                                    </select>
                                    <button type="submit"
                                            class="cursor-pointer px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-gray-300 font-black text-sm hover:bg-white/10">
                                        ⏱ הארכה
                                    </button>
                                </form>
                                <form method="POST" action="?/unapprove" use:enhance>
                                    <input type="hidden" name="id" value={ad.id} />
                                    <button type="submit"
                                            class="cursor-pointer px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 font-black text-sm hover:bg-amber-500/30"
                                            onclick={(e) => { if (!confirm('להוריד את הפרסומת מהאתר ולהחזיר אותה לממתינות?')) e.preventDefault(); }}>
                                        ⏸ הורד מהאתר
                                    </button>
                                </form>
                                {#if canDelete}
                                    <form method="POST" action="?/remove" use:enhance>
                                        <input type="hidden" name="id" value={ad.id} />
                                        <button type="submit"
                                                class="cursor-pointer px-4 py-2 rounded-xl bg-red-600/20 border border-red-500/40 text-red-300 font-black text-sm hover:bg-red-600/30"
                                                onclick={(e) => askRemove(e, ad, 'להעביר את הפרסומת לאשפה? אפשר לשחזר אותה משם.')}>
                                            🗑 מחק
                                        </button>
                                    </form>
                                {/if}
                            {:else}
                                <form method="POST" action="?/unreject" use:enhance>
                                    <input type="hidden" name="id" value={ad.id} />
                                    <button type="submit"
                                            class="cursor-pointer px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 font-black text-sm hover:bg-amber-500/30">
                                        ↩️ החזר לממתינות
                                    </button>
                                </form>
                                {#if canDelete}
                                    <form method="POST" action="?/remove" use:enhance>
                                        <input type="hidden" name="id" value={ad.id} />
                                        <button type="submit"
                                                class="cursor-pointer px-4 py-2 rounded-xl bg-red-600/20 border border-red-500/40 text-red-300 font-black text-sm hover:bg-red-600/30"
                                                onclick={(e) => askRemove(e, ad, 'להעביר את הפרסומת לאשפה? אפשר לשחזר אותה משם.')}>
                                            🗑 מחק
                                        </button>
                                    </form>
                                {/if}
                            {/if}
                        </div>
                    {/if}
                </article>
            {/each}
        </div>
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
                            <tr id="sched-{s.id}" class="border-t border-white/10 hover:bg-white/5 {s.id === justEditedId ? 'bg-emerald-500/10' : ''}">
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
                                                    onclick={() => openDurationModal(rowById.get(s.id)!)}
                                                    class="h-7 w-full inline-flex items-center justify-center px-1 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-200 text-[11px] font-black hover:bg-blue-500/30 whitespace-nowrap"
                                                    title="פרטי התקופה והתשלום + שינוי תקופה או תאריך תפוגה">
                                                ⏱ קצוב
                                            </button>
                                        {/if}

                                        <!-- קיצור דרך לעריכה בסטודיו: השמירה שם מעדכנת את הפרסומת באתר -->
                                        {#if rowById.has(s.id)}
                                            <a href={studioEditHref(s.id)}
                                               class="h-7 w-full inline-flex items-center justify-center px-1 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 text-[11px] font-black hover:bg-indigo-500/30 whitespace-nowrap"
                                               title="פתיחת הפרסומת בסטודיו - השמירה מעדכנת אותה באתר">
                                                ✏️ ערוך
                                            </a>
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
                                                        onclick={(e) => askRemove(e, data.rows.find((a) => a.id === s.id), `להעביר את "${s.title}" לאשפה? אפשר לשחזר אותה משם.`)}>
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

    {#snippet trashRows()}
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
                            <button type="submit" class="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-black border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10" title="העברה לאשפה — אפשר לשחזר"
                                    onclick={(e) => askRemove(e, t.card ?? data.rows.find((a) => a.id === t.id))}>🗑 הסרה</button>
                        </form>
                    {/if}
                </div>
            </div>
        {/each}
    {/snippet}

    <!-- ============================================================ -->
    <!-- אשפה — קומה מתקפלת: כל המחוקים + שחזור, סגורה עד לחיצה        -->
    <!-- ============================================================ -->
    <section class="rounded-2xl border border-white/10 bg-slate-800/80">
        <button type="button" onclick={() => (trashOpen = !trashOpen)} aria-expanded={trashOpen}
                class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-right">
            <span aria-hidden="true">🗑</span>
            <h2 class="text-lg font-black text-white">אשפה</h2>
            <span class="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-xs font-bold text-gray-300">{data.trash.length}</span>
            <span class="mr-auto text-xs text-gray-500">{trashOpen ? '▲' : '▼'}</span>
        </button>
        {#if trashOpen}
            <div class="flex flex-col gap-2 border-t border-white/10 p-3">
                {#if data.trash.length === 0}
                    <p class="py-4 text-center text-sm text-gray-500 italic">האשפה ריקה</p>
                {/if}
                {@render trashRows()}
            </div>
        {/if}
    </section>

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
         onclick={closeDurationModal}>
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div class="my-auto w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-5 shadow-2xl"
             role="dialog" aria-modal="true" aria-label="קציבת תקופת פרסום" tabindex="-1"
             onclick={(e) => e.stopPropagation()}>
            <div class="mb-3 flex items-start justify-between gap-2">
                <h3 class="text-base leading-snug font-black text-white">⏱ קציבת תקופה — {m.title}</h3>
                <button type="button" onclick={closeDurationModal}
                        class="shrink-0 cursor-pointer rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs font-black text-gray-200 hover:bg-white/20">
                    ✕
                </button>
            </div>

            <!-- מה המפרסם שילם ומתי — כל הנתונים במקום אחד -->
            <dl class="mb-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                <dt class="font-bold text-gray-500">מפרסם</dt>
                <dd class="font-bold text-gray-200">{m.submittedByName || '-'}
                    {#if m.contactEmail}<span class="font-normal text-gray-500">· {m.contactEmail}</span>{/if}
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

            <!-- תוצאת הפעולה האחרונה שנשלחה מהחלון - ההודעה הכללית של הדף מוסתרת מאחוריו -->
            {#if modalSubmitted && form?.success}
                <div class="mb-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-emerald-200 text-xs font-bold">
                    ✅ {form.message}
                </div>
            {:else if modalSubmitted && form && 'error' in form && form.error}
                <div class="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-red-200 text-xs font-bold">
                    ❌ {form.error}
                </div>
            {/if}

            <!-- דרך 1: קציבה במסלול ימים, נספרת מיום האישור -->
            <form method="POST" action="?/setDuration" use:enhance={submitInModal} class="mb-2 flex items-center gap-2">
                <input type="hidden" name="id" value={m.id} />
                <label class="shrink-0 text-xs font-bold text-gray-400" for="dur-days">תקופה מיום האישור</label>
                <select id="dur-days" name="duration_days" bind:value={selectedDays}
                        class="flex-1 rounded-lg border border-white/10 bg-slate-800/80 px-2 py-1.5 text-xs text-white">
                    {#each mDurOptions as d (d)}
                        <option value={d} class="bg-slate-900">{d} ימים</option>
                    {/each}
                </select>
                <button type="submit"
                        class="cursor-pointer rounded-xl border border-blue-400/40 bg-blue-500/15 px-3 py-1.5 text-xs font-bold whitespace-nowrap text-blue-200 hover:bg-blue-500/25">
                    קצוב
                </button>
            </form>

            <!-- התפוגה שתצא מהמסלול שנבחר - מתעדכנת עם כל שינוי בבורר, לפני הלחיצה -->
            {#if previewExpiry && selectedDays !== m.durationDays}
                <p class="mb-2 text-[11px] font-bold {previewExpiry.getTime() < Date.now() ? 'text-red-300' : 'text-blue-200'}">
                    {selectedDays} ימים מיום האישור = תפוגה ב-{fmtDay(previewExpiry.toISOString())}
                    {#if previewExpiry.getTime() < Date.now()}(כבר עבר - הפרסומת תרד מיד){/if}
                </p>
            {/if}

            <!-- דרך 2: תאריך תפוגה שרירותי — המודעה יורדת בסוף היום שנבחר -->
            <form method="POST" action="?/setExpiry" use:enhance={submitInModal} class="flex items-center gap-2">
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

<!-- "מחק": חלון אישור עם כרטיס הפרסומת שנמחקת -->
{#if removeAsk}
    <AdRemoveDialog ad={removeAsk.ad} onremove={finishRemove} onclose={() => (removeAsk = null)} />
{/if}

<svelte:window
    onkeydown={(e) => {
        if (e.key === 'Escape') {
            modalPreviewId = null;
            hoverPreview = null;
            closeDurationModal();
            removeAsk = null;
        }
    }}
/>
