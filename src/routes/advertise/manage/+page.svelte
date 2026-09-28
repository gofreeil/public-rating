<script lang="ts">
    // הפרסומות שלי — סטטוס, תוקף ומדדים; לאדמין גם קיצורי ניהול בכל כרטיס
    import { enhance } from '$app/forms';
    import { gradientCss } from '$lib/ads/gradients';
    import { absDate } from '$lib/rating/time';
    import Seo from '$lib/components/rating/Seo.svelte';
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    type Tone = { label: string; hint: string; cls: string };

    function statusView(ad: PageData['ads'][number]): Tone {
        if (ad.status === 'rejected') {
            return {
                label: '✕ נדחתה',
                hint: ad.rejectionReason || 'הפרסומת נבדקה ולא אושרה',
                cls: 'border-red-400/30 bg-red-500/[0.06] text-red-300',
            };
        }
        if (ad.status === 'pending') {
            return {
                label: '⏳ ממתינה לאישור',
                hint: 'צוות האתר בודק את הפרסומת ויחזור אליכם',
                cls: 'border-amber-400/30 bg-amber-500/[0.06] text-amber-300',
            };
        }
        // מושהית לפני פגה: ההשהיה שומרת את הימים, גם אם תאריך התפוגה הישן חלף
        if (ad.paused) {
            return {
                label: '⏸ מושהית',
                hint: 'הפרסומת ירדה זמנית מהאוויר — הימים שנותרו שמורים לה',
                cls: 'border-white/10 bg-slate-800/80 text-gray-300',
            };
        }
        if (ad.expired) {
            return {
                label: '⌛ פג תוקף',
                hint: 'הפרסומת ירדה מהאוויר — אפשר לחדש',
                cls: 'border-white/10 bg-slate-800/80 text-gray-400',
            };
        }
        if (ad.daysLeft <= 7) {
            return {
                label: `🟠 ${ad.daysLeft} ימים נותרו`,
                hint: 'מומלץ לחדש כדי לא לרדת מהאוויר',
                cls: 'border-amber-400/30 bg-amber-500/[0.06] text-amber-300',
            };
        }
        return {
            label: `🟢 על האוויר · ${ad.daysLeft} ימים`,
            hint: 'הפרסומת מוצגת בטור הפרסומות ובנייד',
            cls: 'border-emerald-400/30 bg-emerald-500/[0.06] text-emerald-300',
        };
    }

    // קיצורי הניהול — כפתורים קטנים זה לצד זה, נשברים לשורה בנייד
    const btn = 'cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-bold whitespace-nowrap';
    const btnOk = `${btn} border-emerald-400/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25`;
    const btnGhost = `${btn} border-white/10 bg-slate-800/80 text-gray-300 hover:bg-white/10`;
    const btnDanger = `${btn} border-red-400/40 bg-red-500/10 text-red-300 hover:bg-red-500/20`;
</script>

<Seo title="הפרסומות שלי" description="ניהול הפרסומות שלכם באתר" noindex />

<div class="mx-auto flex max-w-3xl flex-col gap-4 py-6">
    <header class="flex flex-wrap items-baseline justify-between gap-2">
        <h1 class="flex flex-wrap items-baseline gap-3 text-2xl font-black text-white sm:text-3xl">
            📢 הפרסומות שלי
            {#if data.isAdmin}
                <a href="/admin/ads" class="text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline">
                    🛠 לניהול הפרסומות
                </a>
            {/if}
        </h1>
        <a href="/advertise/builder" class="btn-premium rounded-xl px-4 py-2 text-sm font-bold text-white">
            ➕ פרסומת חדשה
        </a>
    </header>

    {#if data.sent}
        <p class="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            ✅ הפרסומת נשלחה לאישור — נעדכן אתכם כשהיא תעלה לאוויר
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

    {#if data.ads.length === 0}
        <div class="rounded-2xl border border-dashed border-white/10 bg-slate-800/80 p-8 text-center">
            <div class="text-4xl">📢</div>
            <p class="mt-2 font-bold text-white">עוד לא שלחתם פרסומת</p>
            <p class="mt-1 text-sm text-gray-400">
                עצבו פרסומת, שלחו לאישור, והיא תופיע בטור הפרסומות עם דף נחיתה משלכם באתר
            </p>
            <a href="/advertise/builder" class="btn-premium mt-4 inline-block rounded-xl px-5 py-2 text-sm font-bold text-white">
                🎨 לעיצוב הפרסומת
            </a>
        </div>
    {:else}
        {#each data.ads as ad (ad.id)}
            {@const view = statusView(ad)}
            <article class="flex flex-col gap-2 rounded-2xl border p-3 {view.cls.replace(/text-\S+/, '')}">
                <div class="flex flex-wrap items-center gap-3">
                    {#if ad.mainImage}
                        <img src={ad.mainImage} alt="" class="h-14 w-14 shrink-0 rounded-xl object-cover" />
                    {:else}
                        <span
                            class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl"
                            style="background: {gradientCss(ad.gradientId)}"
                            aria-hidden="true">📢</span
                        >
                    {/if}
                    <span class="min-w-0 flex-1">
                        <span class="block truncate font-bold text-white">{ad.title}</span>
                        <span class="block truncate text-xs text-gray-400">{ad.subtitle}</span>
                    </span>
                    <span class="rounded-full border px-2.5 py-1 text-xs font-bold {view.cls}">
                        {view.label}
                    </span>
                </div>

                <p class="text-xs text-gray-500">
                    {view.hint}
                    <!-- רק בזמן ההמתנה: אחרי האישור הגרסה הישנה כבר לא ברשימה -->
                    {#if ad.replacesTitle}
                        <span class="text-gray-600">· עדכון ל"{ad.replacesTitle}"</span>
                    {/if}
                </p>

                {#if ad.status === 'approved' && ad.stats.impressions > 0}
                    <div class="flex flex-wrap gap-2 border-t border-white/5 pt-2 text-[11px]">
                        <span class="rounded-full border border-white/10 bg-slate-800/80 px-2 py-0.5 text-gray-400">
                            👁 {ad.stats.impressions} חשיפות
                        </span>
                        <span class="rounded-full border border-white/10 bg-slate-800/80 px-2 py-0.5 text-gray-400">
                            🖱 {ad.stats.clicks} קליקים ({(ad.stats.ctr * 100).toFixed(1)}%)
                        </span>
                        <span class="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                            📞 {ad.stats.leads} פניות
                        </span>
                    </div>
                {/if}

                <div class="flex flex-wrap items-center gap-2 border-t border-white/5 pt-2 text-xs">
                    <!-- קיצורי הניהול לאדמין — הפעולות השכיחות ישר מכאן, בלי לעבור
                         למסך הניהול. המסלול = מה שנבחר בשליחה; שינוי מסלול, מקום
                         בטור וקציבה — במסך הניהול. -->
                    {#if data.isAdmin}
                        {#if ad.status === 'pending'}
                            <form method="POST" action="?/approve" use:enhance>
                                <input type="hidden" name="id" value={ad.id} />
                                <input type="hidden" name="duration_days" value={ad.requestedDurationDays} />
                                <button type="submit" class={btnOk} title="אישור ופרסום">✅ אשר</button>
                            </form>
                        {:else if ad.status === 'approved' && ad.expired && !ad.paused}
                            <!-- פג התוקף: אישור מחדש = תקופה חדשה מהיום, באותו מקום -->
                            <form method="POST" action="?/approve" use:enhance>
                                <input type="hidden" name="id" value={ad.id} />
                                <input type="hidden" name="duration_days" value={ad.requestedDurationDays} />
                                <button type="submit" class={btnOk} title="תקופה חדשה מהיום, באותו מקום בטור">🔄 חדש</button>
                            </form>
                        {/if}
                        {#if ad.status === 'approved'}
                            {#if ad.paused}
                                <form method="POST" action="?/resume" use:enhance>
                                    <input type="hidden" name="id" value={ad.id} />
                                    <button type="submit" class={btnOk} title="הימים השמורים נספרים מהיום">▶ המשך</button>
                                </form>
                            {:else if ad.live}
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
                                    <button type="submit" class={btnGhost} title="יורדת מהאתר, הימים שנותרו נשמרים לה">⏸ השהה</button>
                                </form>
                            {/if}
                            {#if ad.live}
                                <!-- הורדה מהאוויר בלי מחיקה: חוזרת לממתינות -->
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
                                    <button type="submit" class={btnGhost} title="חוזרת לממתינות בלי מחיקה">⬇ הורד</button>
                                </form>
                            {/if}
                        {/if}
                        {#if ad.status !== 'rejected'}
                            <!-- דחייה עם סיבה (לא חובה) — נשאלת ב-prompt ונכנסת לטופס לפני השליחה -->
                            <form
                                method="POST"
                                action="?/reject"
                                use:enhance={({ formData, cancel }) => {
                                    const reason = prompt(`לדחות את "${ad.title}"? סיבת הדחייה (אפשר להשאיר ריק):`, '');
                                    if (reason === null) {
                                        cancel();
                                        return;
                                    }
                                    formData.set('reason', reason);
                                    return async ({ update }) => await update();
                                }}
                            >
                                <input type="hidden" name="id" value={ad.id} />
                                <input type="hidden" name="reason" value="" />
                                <button type="submit" class={btnDanger} title="דחייה עם סיבה (לא חובה)">❌ דחה</button>
                            </form>
                        {/if}
                    {/if}
                    {#if ad.status === 'approved' && !ad.expired}
                        <a href="/ads/{ad.id}" class="font-bold text-blue-400 hover:text-blue-300">
                            👁 לדף הנחיתה
                        </a>
                    {/if}
                    {#if ad.expiresAt}
                        <span class="text-gray-500">בתוקף עד {absDate(ad.expiresAt)}</span>
                    {/if}
                    <span class="mr-auto text-gray-600">נשלחה {absDate(ad.submittedAt)}</span>
                </div>
            </article>
        {/each}

        <p class="text-center text-xs leading-relaxed text-gray-600">
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
