<script lang="ts">
    import { goto } from '$app/navigation';

    let { data } = $props();

    let query = $state(data.query);

    function doSearch() {
        const q = query.trim();
        if (!q) return;
        goto(`/search?q=${encodeURIComponent(q)}`);
    }

    function handleKey(e: KeyboardEvent) {
        if (e.key === 'Enter') doSearch();
    }

    const totalResults = $derived(
        data.results.neighborhood.length +
        data.results.city.length +
        data.results.nearby.length +
        data.results.other.length
    );
</script>

<svelte:head>
    <title>חיפוש: {data.query}</title>
</svelte:head>

<div class="min-h-screen" style="background: #070b14;">
    <div class="max-w-3xl mx-auto px-4 py-8">

        <!-- שדה חיפוש -->
        <div class="mb-8">
            <div class="flex gap-2">
                <input
                    bind:value={query}
                    onkeydown={handleKey}
                    type="text"
                    placeholder="חפש חוג, שירות, עסק..."
                    class="flex-1 bg-[#0f172a] border border-white/15 rounded-2xl px-5 py-3
                           text-white placeholder:text-gray-500 focus:outline-none
                           focus:border-purple-500/60 text-base transition-colors"
                    dir="rtl"
                />
                <button
                    onclick={doSearch}
                    class="bg-gradient-to-l from-purple-600 to-blue-600 hover:from-purple-500
                           hover:to-blue-500 text-white font-bold px-6 py-3 rounded-2xl
                           transition-all cursor-pointer shadow-lg"
                >
                    🔍 חפש
                </button>
            </div>
            {#if data.query}
                <p class="text-gray-400 text-sm mt-3 text-right">
                    נמצאו <span class="text-white font-bold">{totalResults}</span> תוצאות עבור "<span class="text-purple-300">{data.query}</span>"
                </p>
            {/if}
        </div>

        {#if !data.query}
            <!-- מצב ריק -->
            <div class="text-center py-20">
                <div class="text-6xl mb-4">🔍</div>
                <p class="text-gray-400 text-lg">הקלד מה אתה מחפש</p>
                <p class="text-gray-600 text-sm mt-2">חוג, גמח, שמרטפ, מניין, עסק...</p>
            </div>

        {:else if totalResults === 0}
            <!-- אין תוצאות -->
            <div class="text-center py-20">
                <div class="text-6xl mb-4">😕</div>
                <p class="text-gray-300 text-lg font-bold">לא נמצאו תוצאות</p>
                <p class="text-gray-500 text-sm mt-2">נסה מילה אחרת או בדוק את האיות</p>
            </div>

        {:else}
            <!-- תוצאות השכונה -->
            {#if data.results.neighborhood.length > 0}
                <section class="mb-8">
                    <div class="flex items-center gap-2 mb-4">
                        <span class="text-xl">🏘️</span>
                        <h2 class="text-white font-black text-lg">השכונה שלך</h2>
                        <span class="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold px-2 py-0.5 rounded-full">
                            {data.results.neighborhood.length}
                        </span>
                    </div>
                    <div class="flex flex-col gap-3">
                        {#each data.results.neighborhood as item}
                            <a href="/items/{item.id}" class="result-card border-purple-500/30 hover:border-purple-400/60">
                                <span class="text-2xl flex-shrink-0">{item.icon ?? '📌'}</span>
                                <div class="min-w-0 flex-1">
                                    <p class="text-white font-bold text-sm">{item.label}</p>
                                    {#if item.description}
                                        <p class="text-gray-400 text-xs mt-0.5 line-clamp-2">{item.description}</p>
                                    {/if}
                                    <p class="text-purple-400/70 text-xs mt-1">📍 {item.neighborhood}</p>
                                </div>
                                <span class="text-xs bg-white/5 text-gray-400 px-2 py-1 rounded-lg flex-shrink-0">{item.category}</span>
                            </a>
                        {/each}
                    </div>
                </section>
            {/if}

            <!-- תוצאות העיר -->
            {#if data.results.city.length > 0}
                <section class="mb-8">
                    <div class="flex items-center gap-2 mb-4">
                        <span class="text-xl">🏙️</span>
                        <h2 class="text-white font-black text-lg">בעירך - {data.userCity}</h2>
                        <span class="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold px-2 py-0.5 rounded-full">
                            {data.results.city.length}
                        </span>
                    </div>
                    <div class="flex flex-col gap-3">
                        {#each data.results.city as item}
                            <a href="/items/{item.id}" class="result-card border-blue-500/20 hover:border-blue-400/50">
                                <span class="text-2xl flex-shrink-0">{item.icon ?? '📌'}</span>
                                <div class="min-w-0 flex-1">
                                    <p class="text-white font-bold text-sm">{item.label}</p>
                                    {#if item.description}
                                        <p class="text-gray-400 text-xs mt-0.5 line-clamp-2">{item.description}</p>
                                    {/if}
                                    <p class="text-blue-400/70 text-xs mt-1">📍 {item.neighborhood}, {item.city}</p>
                                </div>
                                <span class="text-xs bg-white/5 text-gray-400 px-2 py-1 rounded-lg flex-shrink-0">{item.category}</span>
                            </a>
                        {/each}
                    </div>
                </section>
            {/if}

            <!-- ערים קרובות -->
            {#if data.results.nearby.length > 0}
                <section class="mb-8">
                    <div class="flex items-center gap-2 mb-4">
                        <span class="text-xl">🗺️</span>
                        <h2 class="text-white font-black text-lg">ערים קרובות</h2>
                        <span class="bg-green-500/20 text-green-300 border border-green-500/30 text-xs font-bold px-2 py-0.5 rounded-full">
                            {data.results.nearby.length}
                        </span>
                    </div>
                    <div class="flex flex-col gap-3">
                        {#each data.results.nearby as item}
                            <a href="/items/{item.id}" class="result-card border-green-500/20 hover:border-green-400/50">
                                <span class="text-2xl flex-shrink-0">{item.icon ?? '📌'}</span>
                                <div class="min-w-0 flex-1">
                                    <p class="text-white font-bold text-sm">{item.label}</p>
                                    {#if item.description}
                                        <p class="text-gray-400 text-xs mt-0.5 line-clamp-2">{item.description}</p>
                                    {/if}
                                    <p class="text-green-400/70 text-xs mt-1">📍 {item.neighborhood}, {item.city}</p>
                                </div>
                                <span class="text-xs bg-white/5 text-gray-400 px-2 py-1 rounded-lg flex-shrink-0">{item.category}</span>
                            </a>
                        {/each}
                    </div>
                </section>
            {/if}

            <!-- שאר הארץ -->
            {#if data.results.other.length > 0}
                <section class="mb-8">
                    <div class="flex items-center gap-2 mb-4">
                        <span class="text-xl">🇮🇱</span>
                        <h2 class="text-white font-black text-lg">שאר הארץ</h2>
                        <span class="bg-white/10 text-gray-300 border border-white/10 text-xs font-bold px-2 py-0.5 rounded-full">
                            {data.results.other.length}
                        </span>
                    </div>
                    <div class="flex flex-col gap-3">
                        {#each data.results.other as item}
                            <a href="/items/{item.id}" class="result-card border-white/10 hover:border-white/25">
                                <span class="text-2xl flex-shrink-0">{item.icon ?? '📌'}</span>
                                <div class="min-w-0 flex-1">
                                    <p class="text-white font-bold text-sm">{item.label}</p>
                                    {#if item.description}
                                        <p class="text-gray-400 text-xs mt-0.5 line-clamp-2">{item.description}</p>
                                    {/if}
                                    {#if item.city}
                                        <p class="text-gray-500 text-xs mt-1">📍 {item.city}</p>
                                    {/if}
                                </div>
                                <span class="text-xs bg-white/5 text-gray-400 px-2 py-1 rounded-lg flex-shrink-0">{item.category}</span>
                            </a>
                        {/each}
                    </div>
                </section>
            {/if}
        {/if}
    </div>
</div>

<style>
    :global(.result-card) {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        background: rgba(255,255,255,0.03);
        border-radius: 1rem;
        border-width: 1px;
        border-style: solid;
        padding: 0.875rem 1rem;
        transition: all 0.2s;
        text-decoration: none;
    }
    :global(.result-card:hover) {
        background: rgba(255,255,255,0.06);
        transform: translateY(-1px);
    }
</style>
