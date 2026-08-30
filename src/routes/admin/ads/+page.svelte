<script lang="ts">
    // ניהול הפרסומות — אישור, דחייה, הארכה, הסרה והזנה ידנית
    import { enhance } from '$app/forms';
    import { AD_GRADIENTS, gradientCss } from '$lib/ads/gradients';
    import { absDate } from '$lib/rating/time';
    import Seo from '$lib/components/rating/Seo.svelte';
    import AdCardPreview from '$lib/components/AdCardPreview.svelte';
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let showCreate = $state(false);

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
    let slotOccupants = $derived(
        new Map(
            data.rows
                .filter((a) => a.status === 'approved' && typeof a.slot === 'number')
                .map((a) => [a.slot as number, { id: a.id, title: a.title }]),
        ),
    );
    function shortTitle(t: string): string {
        return t.length > 22 ? t.slice(0, 21) + '…' : t;
    }
    // הטור מציג רביעייה עוקבת אחת בכל רגע (1-4, אחריה 5-8... — ראו RightAdBanner).
    // הסימון כאן משקף את זה: צבע לכל רביעייה (= מה שמוצג יחד), אות לרביעייה
    // ושם-מיקום בתוך הרביעייה (רקע בהיר בלבד — כהה נשבר בהדגשת המערכת)
    const GROUP_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח'];
    const POS_NAMES = ['עליונה', 'שנייה', 'שלישית', 'תחתונה'];
    function slotGroup(n: number): number { return Math.ceil(n / 4); }
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
        if (occ.id === selfId) return `${base} — המקום הנוכחי`;
        return `${base} ⚠ ${shortTitle(occ.title)}`;
    }
    // אזהרה חיה מתחת לבורר ברגע שנבחר מקום תפוס (לפי מזהה המודעה)
    let slotWarning = $state<Record<string, string>>({});
    function onSlotPick(e: Event, self: { id: string }) {
        const n = Number((e.currentTarget as HTMLSelectElement).value);
        const occ = slotOccupants.get(n);
        slotWarning = {
            ...slotWarning,
            [self.id]:
                occ && occ.id !== self.id
                    ? `מקום ${n} תפוס ע"י "${shortTitle(occ.title)}" — לחיצה על "העבר" תחליף ביניהן`
                    : '',
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
        const ok = confirm(
            `⚠ מקום ${n} כבר תפוס על ידי "${occ.title}".\n\n` +
                `אישור — החלפה: "${self.title}" תעבור למקום ${n}, ו"${occ.title}" תעבור למקום ${self.slot ?? '-'}.\n` +
                `ביטול — ההעברה מתבטלת ושתי הפרסומות נשארות במקומן.`,
        );
        if (!ok) e.preventDefault();
    }

    // תקופות שאפשר לקצוב למודעה שעל האוויר (נספרות מיום האישור)
    const DURATION_OPTIONS = [7, 14, 30, 60, 90, 180, 365];

    const pending = $derived(data.rows.filter((a) => a.status === 'pending'));
    const liveAds = $derived(data.rows.filter((a) => a.status === 'approved' && !a.expired));
    const inactive = $derived(
        data.rows.filter((a) => a.status === 'rejected' || (a.status === 'approved' && a.expired)),
    );

    const inputCls =
        'w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-400/60 focus:outline-none';

    const TONE: Record<string, string> = {
        pending: 'border-amber-400/30 bg-amber-500/[0.06]',
        approved: 'border-emerald-400/25 bg-emerald-500/[0.05]',
        rejected: 'border-white/10 bg-slate-800/80 opacity-70',
    };
</script>

<Seo title="ניהול פרסומות" description="אישור וניהול הפרסומות באתר" noindex />

<div class="flex flex-col gap-4 py-6">
    <header class="flex flex-wrap items-baseline justify-between gap-2">
        <h1 class="text-2xl font-black text-white">📢 ניהול פרסומות</h1>
        <span class="text-sm text-gray-400">
            {data.live} על האוויר מתוך {data.slotCount} משבצות · {data.pending} ממתינות
        </span>
    </header>

    <nav class="flex flex-wrap gap-2 text-sm">
        <a href="/admin" class="rounded-full border border-white/10 bg-slate-800/80 px-3 py-1 text-gray-300 hover:text-white">← ניהול</a>
        <a href="/admin/officials" class="rounded-full border border-white/10 bg-slate-800/80 px-3 py-1 text-gray-300 hover:text-white">מדורגים</a>
        <a href="/admin/reports" class="rounded-full border border-white/10 bg-slate-800/80 px-3 py-1 text-gray-300 hover:text-white">דיווחים</a>
    </nav>

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
                    <span class="mb-1 block text-xs font-semibold text-gray-400">כותרת * (עד 35 תווים)</span>
                    <input name="title" required maxlength="35" class={inputCls} />
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

    {#if data.rows.length === 0 && !data.backendUnavailable}
        <div class="rounded-2xl border border-dashed border-white/10 bg-slate-800/80 p-8 text-center">
            <div class="text-4xl">📢</div>
            <p class="mt-2 font-bold text-white">אין עדיין פרסומות</p>
            <p class="mt-1 text-sm text-gray-400">כל {data.slotCount} המשבצות בטור הימני פנויות</p>
        </div>
    {/if}

    {#each [{ title: 'ממתינות לאישור', list: pending }, { title: 'על האוויר', list: liveAds }, { title: 'לא פעילות', list: inactive }] as section (section.title)}
        {#if section.list.length}
            <section class="flex flex-col gap-2">
                <h2 class="text-lg font-black text-white">{section.title} ({section.list.length})</h2>

                {#each section.list as ad (ad.id)}
                    <article class="flex flex-col gap-2 rounded-2xl border p-3 {TONE[ad.status]}">
                        <div class="flex flex-wrap items-center gap-2">
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

                        {#if ad.status === 'approved' && !ad.expired && ad.slotIndex >= 0}
                            {@const slotN = ad.slot ?? ad.slotIndex + 1}
                            <!-- המקום המספרי הקבוע של המודעה בלוח + בורר מקום עם
                                 אזהרת מקום תפוס והחלפה. הסדר בטור הימני נגזר
                                 בדיוק ממספרי המקומות האלה. -->
                            <div class="flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
                                <span class="inline-flex h-6 min-w-6 items-center justify-center rounded-lg border border-black/20 px-1.5 text-xs font-black whitespace-nowrap"
                                      style="background:{slotOptionBg(slotN)};color:#111"
                                      title="רביעייה {slotGroupLetter(slotN)}׳ · הכרטיס ה{slotPosName(slotN)} בה">
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
                                            <optgroup label="— רביעייה {grp.letter}׳ (מוצגות יחד) —">
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

                                <!-- קציבה: קובעת תקופה מיום האישור, בשונה מהארכה שמוסיפה על הקיים -->
                                <form method="POST" action="?/setDuration" use:enhance class="flex items-center gap-1">
                                    <input type="hidden" name="id" value={ad.id} />
                                    <select name="duration_days" class="rounded-lg border border-white/10 bg-slate-800/80 px-2 py-1 text-xs text-white">
                                        {#each DURATION_OPTIONS as d (d)}
                                            <option value={d} selected={d === ad.durationDays} class="bg-slate-900">{d} ימים</option>
                                        {/each}
                                    </select>
                                    <button type="submit" class="cursor-pointer rounded-xl border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/10"
                                            title="התקופה נספרת מיום האישור">
                                        ✂ קצוב
                                    </button>
                                </form>
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
                            {/if}

                            <form
                                method="POST"
                                action="?/remove"
                                class="mr-auto"
                                use:enhance={({ cancel }) => {
                                    if (!confirm(`להסיר את "${ad.title}" לצמיתות?`)) {
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
                        </div>
                    </article>
                {/each}
            </section>
        {/if}
    {/each}

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

<svelte:window
    onkeydown={(e) => {
        if (e.key === 'Escape') {
            modalPreviewId = null;
            hoverPreview = null;
        }
    }}
/>
