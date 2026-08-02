<script lang="ts">
    // תוצאות חיפוש מדורגים — היעד של תיבת החיפוש שבכותרת
    import { goto } from '$app/navigation';
    import { fmtScore } from '$lib/rating/aggregate';
    import { GROUPS } from '$lib/rating/types';
    import Avatar from '$lib/components/rating/Avatar.svelte';
    import Seo from '$lib/components/rating/Seo.svelte';
    import Stars from '$lib/components/rating/Stars.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    // svelte-ignore state_referenced_locally
    let query = $state(data.q);

    function submit(e: SubmitEvent) {
        e.preventDefault();
        const q = query.trim();
        goto(q ? `/search?q=${encodeURIComponent(q)}` : '/search', { keepFocus: true });
    }
</script>

<!-- דפי תוצאות חיפוש אינם נכנסים לאינדקס — תוכן דליל ואינסופי -->
<Seo
    title={data.q ? `חיפוש: ${data.q}` : 'חיפוש מדורגים'}
    description="חיפוש חברי כנסת, שרים, שופטים ועובדי ציבור בדירוג הציבורי."
    noindex
/>

<div class="mx-auto flex max-w-3xl flex-col gap-4 py-6">
    <header>
        <h1 class="text-2xl font-black text-white sm:text-3xl">🔍 חיפוש מדורגים</h1>
        {#if data.q}
            <p class="mt-1 text-sm text-gray-400">
                {data.total} תוצאות עבור "{data.q}"
                {#if data.total > data.results.length}
                    <span class="text-gray-500">(מוצגות {data.results.length} הראשונות)</span>
                {/if}
            </p>
        {/if}
    </header>

    <form onsubmit={submit} class="flex flex-wrap gap-2">
        <input
            type="search"
            bind:value={query}
            placeholder="שם, תפקיד, סיעה, ערכאה או משרד…"
            aria-label="חיפוש מדורגים"
            class="min-w-40 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-400/60 focus:outline-none"
        />
        <button type="submit" class="btn-premium rounded-xl px-5 py-2 text-sm font-bold text-white">
            חיפוש
        </button>
    </form>

    {#if !data.q}
        <div class="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center">
            <p class="text-sm text-gray-400">הקלידו שם של נבחר או עובד ציבור, או עיינו בלוחות:</p>
            <div class="mt-3 flex flex-wrap justify-center gap-2">
                {#each GROUPS as g (g.key)}
                    <a href={g.route} class="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-bold text-white transition-colors hover:bg-white/10">
                        {g.icon} {g.title}
                    </a>
                {/each}
            </div>
        </div>
    {:else if data.results.length === 0}
        <div class="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <p class="mb-1 font-bold text-white">לא נמצאו תוצאות עבור "{data.q}"</p>
            <p class="mb-3 text-sm text-gray-400">
                אולי הוא עדיין לא ברשימה — אפשר להציע להוסיף אותו
            </p>
            <a href="/suggest" class="btn-premium inline-block rounded-xl px-5 py-2 text-sm font-bold text-white">
                ➕ הציעו לדירוג
            </a>
        </div>
    {:else}
        <ul class="flex flex-col gap-2">
            {#each data.results as o (o.id)}
                <li>
                    <a
                        href="/officials/{o.id}"
                        class="result-card flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition-colors"
                    >
                        <Avatar name={o.name} image={o.image} size={48} />
                        <span class="min-w-0 flex-1">
                            <span class="block truncate font-bold text-white">{o.name}</span>
                            <span class="block truncate text-xs text-gray-400">
                                {o.position}{o.org ? ` · ${o.org}` : ''}
                            </span>
                            <span class="mt-0.5 block text-[11px] text-gray-500">
                                {o.groupIcon} {o.groupTitle}
                            </span>
                        </span>
                        <span class="flex shrink-0 flex-col items-center gap-0.5">
                            {#if o.count > 0}
                                <Stars value={o.average ?? 0} size={14} />
                                <span class="text-xs font-bold text-amber-300 tabular-nums">
                                    {fmtScore(o.average)}
                                    <span class="font-normal text-gray-500">({o.count})</span>
                                </span>
                            {:else}
                                <span class="text-[11px] text-gray-500">טרם דורג</span>
                            {/if}
                        </span>
                    </a>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    /* Tailwind v4: group-hover שבור — CSS מפורש */
    .result-card:hover {
        background: rgba(255, 255, 255, 0.09);
        border-color: rgba(96, 165, 250, 0.4);
    }
</style>
