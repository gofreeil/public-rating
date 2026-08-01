<script lang="ts">
    // אינדקס מלא — כל המדורגים, א-ב, בלי אינטראקטיביות ובלי חשיפה הדרגתית.
    import { fmtScore } from '$lib/rating/aggregate';
    import { breadcrumbSchema } from '$lib/rating/schema';
    import { SITE_URL } from '$lib/seo';
    import Seo from '$lib/components/rating/Seo.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    const jsonLd = $derived([
        {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'כל המדורגים בדירוג ציבורי',
            numberOfItems: data.total,
            itemListElement: data.groups.flatMap((g) =>
                g.officials.map((o) => ({
                    '@type': 'ListItem',
                    url: `${SITE_URL}/officials/${o.id}`,
                    name: o.name,
                })),
            ),
        },
        breadcrumbSchema([
            { name: 'דירוג ציבורי', path: '/' },
            { name: 'כל המדורגים', path: '/officials' },
        ]),
    ]);
</script>

<Seo
    title="כל המדורגים — אינדקס מלא"
    description="רשימה מלאה של כל חברי הכנסת, השרים, השופטים ועובדי הציבור הפתוחים לדירוג באתר — לפי סדר א-ב, עם הציון ומספר הדירוגים."
    {jsonLd}
/>

<div class="flex flex-col gap-5 py-6">
    <header>
        <h1 class="text-2xl font-black text-white sm:text-3xl">אינדקס המדורגים</h1>
        <p class="mt-1 text-sm text-gray-400">
            {data.total} מדורגים באתר · {data.totalRated} כבר קיבלו דירוג מהציבור
        </p>
    </header>

    {#if data.groups.length === 0}
        <div class="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
            <p class="font-bold text-white">הרשימה ריקה כרגע</p>
            <p class="mt-1 text-sm text-gray-400">נסו שוב בעוד רגע, או הציעו מדורג ראשון</p>
            <a href="/suggest" class="btn-premium mt-3 inline-block rounded-xl px-5 py-2 text-sm font-bold text-white">
                ➕ הציעו לדירוג
            </a>
        </div>
    {/if}

    {#each data.groups as g (g.key)}
        <section>
            <div class="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h2 class="text-lg font-black text-white">
                    {g.icon} {g.title}
                    <span class="text-sm font-normal text-gray-500">({g.officials.length})</span>
                </h2>
                <a href={g.route} class="text-xs font-bold text-blue-400 hover:text-blue-300">
                    ללוח המדורג ←
                </a>
            </div>

            <ul class="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                {#each g.officials as o (o.id)}
                    <li class="min-w-0">
                        <a
                            href="/officials/{o.id}"
                            class="index-link flex items-baseline gap-2 rounded-lg px-2 py-1.5 transition-colors"
                        >
                            <span class="min-w-0 flex-1 truncate text-sm text-gray-200">
                                {o.name}
                                {#if o.position}
                                    <span class="text-xs text-gray-500">· {o.position}</span>
                                {/if}
                            </span>
                            {#if o.count > 0}
                                <span class="shrink-0 text-xs font-bold text-amber-300 tabular-nums">
                                    {fmtScore(o.average)}
                                </span>
                                <span class="shrink-0 text-[11px] text-gray-600">({o.count})</span>
                            {:else}
                                <span class="shrink-0 text-[11px] text-gray-600">טרם דורג</span>
                            {/if}
                        </a>
                    </li>
                {/each}
            </ul>
        </section>
    {/each}

    <div class="text-center">
        <a href="/" class="text-sm text-blue-400 transition-colors hover:text-blue-300">← חזרה לדף הבית</a>
    </div>
</div>

<style>
    /* Tailwind v4: group-hover שבור — CSS מפורש */
    .index-link:hover {
        background: rgba(255, 255, 255, 0.06);
    }
    .index-link:hover span:first-child {
        color: #fff;
    }
</style>
