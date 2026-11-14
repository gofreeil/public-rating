<script lang="ts">
    // הפרסומות שלי — שורה לכל פרסומת, עריכה ממוקדת לכל אחת, וקיצורי ניהול לאדמין.
    // אותו מראה ואותן פעולות כמו "הפרסומות שלי" באזור האישי של קהילה בשכונה.
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import { absDate } from '$lib/rating/time';
    import Seo from '$lib/components/rating/Seo.svelte';
    import type { SubmitFunction } from '@sveltejs/kit';
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    type Row = PageData['ads'][number];
    type St = 'live' | 'paused' | 'expired' | 'pending' | 'rejected';

    /** הסטטוס שמוצג בשבב: מאושרת מתחלקת לפעילה / מושהית / פגה */
    function stOf(ad: Row): St {
        if (ad.status === 'approved') return ad.paused ? 'paused' : ad.live ? 'live' : 'expired';
        return ad.status;
    }
    const ST_LABEL: Record<St, string> = {
        live: 'פעילה באתר',
        paused: 'מושהית',
        expired: 'פגה',
        pending: 'ממתינה לאישור',
        rejected: 'נדחתה',
    };
    const ST_CLS: Record<St, string> = {
        live: 'bg-green-500/20 text-green-300 border border-green-500/40',
        paused: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
        expired: 'bg-gray-500/20 text-gray-300 border border-gray-500/40',
        pending: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
        rejected: 'bg-red-500/20 text-red-300 border border-red-500/40',
    };

    // ---- קיצורי הניהול (אשר/דחה/השהה/המשך/הורד) ----
    // שאלת אישור לפני השליחה (ביטול = לא נשלח); בדחייה - סיבה לא-חובה שנכנסת
    // לשדה reason של הטופס. התוצאה מוצגת מעל הרשימה, והרשימה נטענת מחדש.
    let msg = $state('');
    let msgOk = $state(false);
    let busyId = $state('');
    function rowAction(row: { id: string }, opts: { confirm?: string; promptReason?: boolean } = {}): SubmitFunction {
        return ({ formData, cancel }) => {
            if (opts.confirm && !confirm(opts.confirm)) {
                cancel();
                return;
            }
            if (opts.promptReason) {
                const reason = prompt('סיבת הדחייה (אפשר להשאיר ריק):', '');
                if (reason === null) {
                    cancel();
                    return;
                }
                formData.set('reason', reason);
            }
            busyId = row.id;
            return async ({ result }) => {
                busyId = '';
                if (result.type === 'success') {
                    msgOk = true;
                    msg = (result.data as { message?: string } | undefined)?.message ?? 'בוצע ✅';
                    await invalidateAll();
                } else if (result.type === 'failure') {
                    msgOk = false;
                    msg = (result.data as { error?: string } | undefined)?.error ?? 'הפעולה נכשלה';
                } else {
                    msgOk = false;
                    msg = 'הפעולה נכשלה - נסה שוב';
                }
            };
        };
    }
</script>

<Seo title="הפרסומות שלי" description="ניהול הפרסומות שלכם באתר" noindex />

<div class="mx-auto flex max-w-3xl flex-col gap-3 py-4">
    <header class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="flex items-center gap-1.5 text-xl font-black text-white sm:text-2xl">
            <span class="text-amber-400">📢</span>
            הפרסומות שלי
            {#if data.ads.length > 0}
                <span class="rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">{data.ads.length}</span>
            {/if}
            {#if data.isAdmin}
                <!-- לאדמין: קיצור למסך הניהול המלא (שינוי מסלול, מקום בטור, קציבה) -->
                <a href="/admin/ads" class="ms-2 text-[10px] font-bold whitespace-nowrap text-purple-300 no-underline hover:text-purple-200" title="ניהול כל הפרסומות">🛠 לניהול הפרסומות</a>
            {/if}
        </h1>
        <a href="/advertise" class="btn-premium rounded-xl px-4 py-1.5 text-sm font-bold text-white">
            ➕ פרסומת חדשה
        </a>
    </header>

    {#if data.sent}
        <p class="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            ✅ הפרסומת נשלחה לאישור — נעדכן אתכם כשהיא תעלה לאוויר
        </p>
    {/if}

    {#if msg}
        <p class="m-0 text-[11px] font-bold {msgOk ? 'text-green-300' : 'text-red-300'}">{msg}</p>
    {:else if form?.success}
        <p class="m-0 text-[11px] font-bold text-green-300">✅ {form.message}</p>
    {:else if form?.error}
        <p class="m-0 text-[11px] font-bold text-red-300">{form.error}</p>
    {/if}

    {#if data.ads.length === 0}
        <div class="rounded-2xl border border-dashed border-white/10 bg-slate-800/80 p-6 text-center">
            <div class="text-3xl">📢</div>
            <p class="mt-1 font-bold text-white">עוד לא שלחתם פרסומת</p>
            <p class="mt-1 text-sm text-gray-400">
                עצבו פרסומת, שלחו לאישור, והיא תופיע בטור הפרסומות עם דף נחיתה משלכם באתר
            </p>
            <a href="/advertise" class="btn-premium mt-3 inline-block rounded-xl px-5 py-2 text-sm font-bold text-white">
                🎨 לעיצוב הפרסומת
            </a>
        </div>
    {:else}
        <div class="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div class="space-y-1.5">
                {#each data.ads as ad (ad.id)}
                    {@const st = stOf(ad)}
                    {@const busy = busyId === ad.id}
                    <div class="ad-row flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2">
                        <!-- תמונת הכרטיס; בלי תמונה - מציין מקום -->
                        {#if ad.mainImage}
                            <img src={ad.mainImage} alt="" loading="lazy" class="h-11 w-11 flex-shrink-0 rounded-lg border border-white/10 bg-[#0a0f1a] object-cover" />
                        {:else}
                            <div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-lg" aria-hidden="true">🖼</div>
                        {/if}
                        <span class="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold {ST_CLS[st]}">{ST_LABEL[st]}</span>
                        <div class="min-w-0 flex-1">
                            <p class="m-0 truncate text-xs font-bold text-white">{ad.title || 'ללא כותרת'}</p>
                            <p class="m-0 truncate text-[10px] text-gray-400">
                                {#if ad.slot}מקום {ad.slot} בטור{/if}
                                {#if ad.slot && ad.expiresAt}<span aria-hidden="true"> · </span>{/if}
                                {#if ad.expiresAt}עד {absDate(ad.expiresAt)}{/if}
                                {#if !ad.slot && !ad.expiresAt}נשלחה {absDate(ad.submittedAt)}{/if}
                            </p>
                            <!-- סיבת הדחייה / עדכון לפרסומת קיימת - רק מה שהמפרסם צריך לדעת -->
                            {#if ad.status === 'rejected' && ad.rejectionReason}
                                <p class="m-0 text-[10px] text-red-300/80">סיבת הדחייה: {ad.rejectionReason}</p>
                            {:else if ad.replacesTitle}
                                <p class="m-0 truncate text-[10px] text-gray-500">עדכון ל"{ad.replacesTitle}"</p>
                            {/if}
                        </div>
                        {#if ad.status === 'approved' && ad.stats.impressions > 0}
                            <span class="flex flex-shrink-0 flex-wrap gap-1 text-[10px] text-gray-400"
                                  title="המספרים אינדיקטיביים ונועדו למגמה ולהשוואה בין פרסומות — אינם מבוססים על זיהוי מבקר ואינם משמשים לחיוב">
                                <span class="rounded-full border border-white/10 bg-slate-800/80 px-1.5 py-0.5">👁 {ad.stats.impressions}</span>
                                <span class="rounded-full border border-white/10 bg-slate-800/80 px-1.5 py-0.5">🖱 {ad.stats.clicks} ({(ad.stats.ctr * 100).toFixed(1)}%)</span>
                                <span class="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300">📞 {ad.stats.leads}</span>
                            </span>
                        {/if}
                        <span class="ad-actions">
                            <!-- קיצורי הניהול לאדמין - הפעולות השכיחות ישר מכאן, בלי לעבור
                                 למסך הניהול. המסלול = מה שנבחר בשליחה; שינוי מסלול, מקום
                                 בטור וקציבה - במסך הניהול. -->
                            {#if data.isAdmin}
                                {#if st === 'pending'}
                                    <form method="POST" action="?/approve" use:enhance={rowAction(ad)}>
                                        <input type="hidden" name="id" value={ad.id} />
                                        <input type="hidden" name="duration_days" value={ad.requestedDurationDays} />
                                        <button type="submit" class="ad-btn ok" disabled={busy} title="אישור ופרסום במסלול שנבחר בשליחה">✅ אשר</button>
                                    </form>
                                {:else if st === 'expired'}
                                    <!-- פג התוקף: אישור מחדש = תקופה חדשה מהיום, באותו מקום בטור -->
                                    <form method="POST" action="?/approve" use:enhance={rowAction(ad)}>
                                        <input type="hidden" name="id" value={ad.id} />
                                        <input type="hidden" name="duration_days" value={ad.requestedDurationDays} />
                                        <button type="submit" class="ad-btn ok" disabled={busy} title="תקופה חדשה מהיום, באותו מקום בטור">🔄 חדש</button>
                                    </form>
                                {:else if st === 'paused'}
                                    <form method="POST" action="?/resume" use:enhance={rowAction(ad)}>
                                        <input type="hidden" name="id" value={ad.id} />
                                        <button type="submit" class="ad-btn ok" disabled={busy} title="הימים השמורים נספרים מהיום">▶ המשך</button>
                                    </form>
                                {:else if st === 'live'}
                                    <form method="POST" action="?/pause"
                                          use:enhance={rowAction(ad, { confirm: 'להשהות את הפרסומת? היא תרד מהאתר והימים שנותרו יישמרו לה.' })}>
                                        <input type="hidden" name="id" value={ad.id} />
                                        <button type="submit" class="ad-btn ghost" disabled={busy} title="יורדת מהאתר, הימים שנותרו נשמרים לה">⏸ השהה</button>
                                    </form>
                                {/if}
                                {#if ad.status === 'approved'}
                                    <form method="POST" action="?/unapprove"
                                          use:enhance={rowAction(ad, { confirm: 'להוריד את הפרסומת מהאתר ולהחזיר אותה לממתינות?' })}>
                                        <input type="hidden" name="id" value={ad.id} />
                                        <button type="submit" class="ad-btn ghost" disabled={busy} title="חוזרת לממתינות בלי מחיקה">⬇ הורד</button>
                                    </form>
                                {/if}
                                {#if ad.status !== 'rejected'}
                                    <form method="POST" action="?/reject" use:enhance={rowAction(ad, { promptReason: true })}>
                                        <input type="hidden" name="id" value={ad.id} />
                                        <input type="hidden" name="reason" value="" />
                                        <button type="submit" class="ad-btn danger" disabled={busy} title="דחייה עם סיבה (לא חובה)">❌ דחה</button>
                                    </form>
                                {/if}
                            {/if}
                            {#if ad.live}
                                <a class="ad-btn ghost" href={`/ads/${ad.id}`} target="_blank" rel="noopener" title="דף הנחיתה באתר">👁 צפה</a>
                            {/if}
                            <!-- עריכה בבילדר: כל השדות נטענים, כולל עיצוב הכרטיס -->
                            <a href="/advertise/builder?edit={encodeURIComponent(ad.id)}"
                               title="עריכת הפרסומת הזו בלבד - שאר הפרסומות שלך לא יושפעו"
                               class="flex-shrink-0 rounded-lg bg-amber-500 px-2.5 py-1.5 text-[11px] font-black text-black transition-colors hover:bg-amber-400">
                                ✏️ ערוך
                            </a>
                        </span>
                    </div>
                {/each}
            </div>
        </div>

        <p class="text-center text-[11px] leading-relaxed text-gray-600">
            המספרים אינדיקטיביים ונועדו למגמה ולהשוואה בין פרסומות — הם אינם מבוססים על זיהוי
            מבקר ואינם משמשים לחיוב.
        </p>
    {/if}

    <div class="text-center">
        <a href="/advertise" class="text-sm text-blue-400 transition-colors hover:text-blue-300">
            ← על הפרסום באתר
        </a>
    </div>
</div>

<style>
    /* קיצורי הניהול - כפתורים קטנים זה לצד זה, נשברים לשורה בנייד */
    .ad-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.35rem;
        flex-shrink: 0;
        width: 100%;
        justify-content: flex-start;
    }
    .ad-actions form {
        display: contents;
    }
    .ad-btn {
        font: inherit;
        font-weight: 800;
        font-size: 0.7rem;
        line-height: 1.2;
        border-radius: 0.5rem;
        padding: 0.35rem 0.55rem;
        cursor: pointer;
        text-decoration: none;
        white-space: nowrap;
        border: 1px solid transparent;
        transition: background 0.2s;
    }
    .ad-btn:disabled {
        opacity: 0.6;
        cursor: wait;
    }
    .ad-btn.ok {
        background: rgba(34, 197, 94, 0.18);
        border-color: rgba(34, 197, 94, 0.45);
        color: #86efac;
    }
    .ad-btn.ok:hover {
        background: rgba(34, 197, 94, 0.32);
    }
    .ad-btn.ghost {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.15);
        color: #e2e8f0;
    }
    .ad-btn.ghost:hover {
        background: rgba(255, 255, 255, 0.14);
    }
    .ad-btn.danger {
        background: rgba(239, 68, 68, 0.12);
        border-color: rgba(239, 68, 68, 0.4);
        color: #fca5a5;
    }
    .ad-btn.danger:hover {
        background: rgba(239, 68, 68, 0.26);
    }
    /* השורה עוטפת תמיד: סטטוס + כותרת למעלה, כל הכפתורים בשורה משלהם */
    .ad-row {
        flex-wrap: wrap;
    }
</style>
