<script lang="ts">
    // ניהול הפרסומות — אישור, דחייה, הארכה, הסרה והזנה ידנית
    import { enhance } from '$app/forms';
    import { AD_GRADIENTS, gradientCss } from '$lib/ads/gradients';
    import { absDate } from '$lib/rating/time';
    import Seo from '$lib/components/rating/Seo.svelte';
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let showCreate = $state(false);

    // תקופות שאפשר לקצוב למודעה שעל האוויר (נספרות מיום האישור)
    const DURATION_OPTIONS = [7, 14, 30, 60, 90, 180, 365];

    const pending = $derived(data.rows.filter((a) => a.status === 'pending'));
    const liveAds = $derived(data.rows.filter((a) => a.status === 'approved' && !a.expired));
    const inactive = $derived(
        data.rows.filter((a) => a.status === 'rejected' || (a.status === 'approved' && a.expired)),
    );

    const inputCls =
        'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-400/60 focus:outline-none';

    const TONE: Record<string, string> = {
        pending: 'border-amber-400/30 bg-amber-500/[0.06]',
        approved: 'border-emerald-400/25 bg-emerald-500/[0.05]',
        rejected: 'border-white/10 bg-white/5 opacity-70',
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
        <a href="/admin" class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-300 hover:text-white">← ניהול</a>
        <a href="/admin/officials" class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-300 hover:text-white">מדורגים</a>
        <a href="/admin/reports" class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-300 hover:text-white">דיווחים</a>
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
    <section class="rounded-2xl border border-white/10 bg-white/5 p-4">
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
        <div class="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
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
                                <span class="block truncate font-bold text-white">{ad.title}</span>
                                <span class="block truncate text-xs text-gray-400">{ad.subtitle}</span>
                            </span>

                            {#if ad.editedAfterDecision}
                                <span class="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                                    ✏️ נערכה אחרי האישור
                                </span>
                            {/if}
                            {#if ad.expired}
                                <span class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-400">
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

                            <span class="mr-auto text-xs text-gray-500">
                                {ad.submittedAt ? absDate(ad.submittedAt) : ''}
                            </span>
                        </div>

                        {#if ad.status === 'approved' && !ad.expired && ad.slotIndex >= 0}
                            <!-- משבצת המודעה בטור + החלפת מקום. הסדר כאן הוא בדיוק
                                 הסדר שהגולש רואה בטור הימני. -->
                            <div class="flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
                                <span class="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-emerald-400/40 bg-emerald-500/15 text-xs font-black text-emerald-200">
                                    {ad.slotIndex + 1}
                                </span>
                                <span class="text-xs font-bold text-gray-400">
                                    משבצת {ad.slotIndex + 1} מתוך {ad.slotTotal} בטור
                                </span>
                                <div class="mr-auto flex items-center gap-1">
                                    <form method="POST" action="?/move" use:enhance>
                                        <input type="hidden" name="id" value={ad.id} />
                                        <input type="hidden" name="dir" value="up" />
                                        <button
                                            type="submit"
                                            disabled={ad.slotIndex === 0}
                                            title="העלה משבצת אחת"
                                            class="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                                        >▲ למעלה</button>
                                    </form>
                                    <form method="POST" action="?/move" use:enhance>
                                        <input type="hidden" name="id" value={ad.id} />
                                        <input type="hidden" name="dir" value="down" />
                                        <button
                                            type="submit"
                                            disabled={ad.slotIndex === ad.slotTotal - 1}
                                            title="הורד משבצת אחת"
                                            class="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
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
                                <span class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-gray-400">
                                    👁 {ad.stats.impressions} חשיפות
                                </span>
                                <span class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-gray-400">
                                    🖱 {ad.stats.clicks} קליקים ({(ad.stats.ctr * 100).toFixed(1)}%)
                                </span>
                                <span class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-gray-400">
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
                                class="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/10"
                            >👁 תצוגה מקדימה</a>

                            {#if ad.status !== 'approved' || ad.expired}
                                <form method="POST" action="?/approve" use:enhance class="flex items-center gap-1">
                                    <input type="hidden" name="id" value={ad.id} />
                                    <select name="duration_days" class="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white">
                                        {#each data.plans as p (p.days)}
                                            <option value={p.days} selected={p.days === ad.requestedDurationDays} class="bg-slate-900">
                                                {p.label}
                                            </option>
                                        {/each}
                                    </select>
                                    <button type="submit" class="cursor-pointer rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/25">
                                        ✓ אישור
                                    </button>
                                </form>
                            {:else}
                                <form method="POST" action="?/extend" use:enhance class="flex items-center gap-1">
                                    <input type="hidden" name="id" value={ad.id} />
                                    <select name="duration_days" class="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white">
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
                                    <select name="duration_days" class="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white">
                                        {#each DURATION_OPTIONS as d (d)}
                                            <option value={d} selected={d === ad.durationDays} class="bg-slate-900">{d} ימים</option>
                                        {/each}
                                    </select>
                                    <button type="submit" class="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/10"
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
                                        <button type="submit" class="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/10">
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
                                        class="w-36 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white placeholder-gray-600"
                                    />
                                    <button type="submit" class="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/10">
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
</div>
