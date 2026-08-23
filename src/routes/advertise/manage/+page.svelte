<script lang="ts">
    // הפרסומות שלי — סטטוס, תוקף ומדדים
    import { gradientCss } from '$lib/ads/gradients';
    import { absDate } from '$lib/rating/time';
    import Seo from '$lib/components/rating/Seo.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

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
</script>

<Seo title="הפרסומות שלי" description="ניהול הפרסומות שלכם באתר" noindex />

<div class="mx-auto flex max-w-3xl flex-col gap-4 py-6">
    <header class="flex flex-wrap items-baseline justify-between gap-2">
        <h1 class="text-2xl font-black text-white sm:text-3xl">📢 הפרסומות שלי</h1>
        <a href="/advertise/builder" class="btn-premium rounded-xl px-4 py-2 text-sm font-bold text-white">
            ➕ פרסומת חדשה
        </a>
    </header>

    {#if data.sent}
        <p class="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            ✅ הפרסומת נשלחה לאישור — נעדכן אתכם כשהיא תעלה לאוויר
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

                <p class="text-xs text-gray-500">{view.hint}</p>

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

                <div class="flex flex-wrap items-center gap-3 border-t border-white/5 pt-2 text-xs">
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
