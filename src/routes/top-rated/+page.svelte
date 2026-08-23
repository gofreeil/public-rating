<script lang="ts">
    import Podium from '$lib/components/rating/Podium.svelte';
    import OfficialCard from '$lib/components/rating/OfficialCard.svelte';
    import Seo from '$lib/components/rating/Seo.svelte';
    import ShareBar from '$lib/components/rating/ShareBar.svelte';
    import { breadcrumbSchema } from '$lib/rating/schema';

    let { data } = $props();

    const MEDALS = ['🥇', '🥈', '🥉'];

    const jsonLd = breadcrumbSchema([
        { name: 'דירוג ציבורי', path: '/' },
        { name: 'מצטייני הציבור', path: '/top-rated' },
    ]);
</script>

<Seo
    title="🏆 מצטייני הציבור"
    description="המדורגים הגבוהים ביותר על ידי העם — חברי כנסת, שופטים ועובדי ציבור המועמדים להוקרה ולפרס ביום העצמאות."
    {jsonLd}
/>

<div class="space-y-8 py-6">
    <!-- כותרת -->
    <header class="text-center">
        <h1 class="text-3xl font-black text-white md:text-4xl">🏆 מצטייני הציבור</h1>
        <p class="mt-2 font-bold text-amber-400">
            המדורגים הגבוהים ביותר על ידי העם — מועמדים להוקרה ולפרס ביום העצמאות
        </p>
        <div class="mt-3 flex justify-center">
            <ShareBar
                text="מצטייני הציבור — המדורגים הגבוהים ביותר על ידי אזרחי ישראל בדירוג ציבורי"
                title="מצטייני הציבור — דירוג ציבורי"
                compact
            />
        </div>
    </header>

    <!-- פודיום / מצב ריק -->
    {#if data.top3.length}
        <Podium officials={data.top3} />
    {:else}
        <div class="rounded-2xl border border-white/10 bg-slate-800/80 p-6 text-center">
            <p class="font-bold text-gray-300">הפודיום עדיין ריק — היו הראשונים לדרג</p>
            <div class="mt-3 flex flex-wrap justify-center gap-2">
                {#each data.perGroup as g (g.key)}
                    <a
                        href={g.route}
                        class="rounded-full border border-white/10 bg-slate-800/80 px-4 py-1.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
                    >{g.icon} {g.title}</a>
                {/each}
            </div>
        </div>
    {/if}

    <!-- עשרת הגדולים -->
    {#if data.top10.length}
        <section>
            <h2 class="mb-3 text-lg font-black text-white">עשרת הגדולים</h2>
            <ol class="grid gap-2 sm:grid-cols-2">
                {#each data.top10 as official, i (official.id)}
                    <li class="flex items-center gap-2">
                        <span class="w-8 shrink-0 text-center text-sm font-black text-gray-500 tabular-nums" aria-label="מקום {i + 1}">
                            {#if i < 3}<span class="text-lg">{MEDALS[i]}</span>{:else}{i + 1}{/if}
                        </span>
                        <div class="min-w-0 flex-1">
                            <OfficialCard {official} compact />
                        </div>
                    </li>
                {/each}
            </ol>
        </section>
    {/if}

    <!-- מובילים לפי קטגוריה -->
    {#if data.top10.length}
        <section>
            <h2 class="mb-3 text-lg font-black text-white">מובילים לפי קטגוריה</h2>
            <div class="grid gap-4 md:grid-cols-3">
                {#each data.perGroup as g (g.key)}
                    <div class="rounded-2xl border border-white/10 bg-slate-800/80 p-3">
                        <a href={g.route} class="mb-2 flex items-center gap-1.5 text-sm font-bold text-blue-400 hover:text-blue-300">
                            <span>{g.icon}</span><span>{g.title}</span>
                        </a>
                        {#if g.top.length}
                            <div class="space-y-3 pt-2">
                                {#each g.top as official, i (official.id)}
                                    <OfficialCard {official} rank={i + 1} compact />
                                {/each}
                            </div>
                        {:else}
                            <p class="py-2 text-center text-xs text-gray-500">
                                אין עדיין דירוגים — <a href={g.route} class="text-blue-400 hover:text-blue-300">היו הראשונים</a>
                            </p>
                        {/if}
                    </div>
                {/each}
            </div>
        </section>
    {/if}

    <!-- תחתית הדירוג -->
    {#if data.bottom3.length}
        <section class="rounded-2xl border border-red-400/20 bg-slate-800/80 p-4">
            <h2 class="text-base font-black text-white">📉 בתחתית הדירוג</h2>
            <p class="mb-3 mt-0.5 text-xs text-gray-400">דורשים שיפור — הציבור מצפה ליותר</p>
            <div class="grid gap-2 sm:grid-cols-3">
                {#each data.bottom3 as official (official.id)}
                    <OfficialCard {official} compact />
                {/each}
            </div>
        </section>
    {/if}

    <!-- פס הסבר + קריאה לפעולה -->
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-800/80 p-4">
        <p class="min-w-56 flex-1 text-xs leading-relaxed text-gray-400">
            בדירוג ההוגן נכללים מדורגים עם {data.minReviews} דירוגים לפחות; הציון משוקלל כך שדירוג בודד לא יקפיץ לצמרת.
        </p>
        <span class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-bold text-gray-300">לדרג עכשיו:</span>
            {#each data.perGroup as g (g.key)}
                <a
                    href={g.route}
                    class="rounded-full border border-white/10 bg-slate-800/80 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-white/10"
                >{g.icon} {g.title}</a>
            {/each}
        </span>
    </div>
</div>
