<script lang="ts">
    // חיפוש מדורגים עם השלמה אוטומטית — לב דף הבית
    import { goto } from '$app/navigation';
    import { heMatches } from '$lib/rating/heSearch';
    import Avatar from './Avatar.svelte';

    interface SearchOfficial {
        id: string;
        name: string;
        position: string;
        org: string;
        image?: string;
    }

    let {
        officials,
        placeholder = 'חיפוש לפי שם, תפקיד או ארגון…',
    }: { officials: SearchOfficial[]; placeholder?: string } = $props();

    let query = $state('');
    let open = $state(false);
    let active = $state(-1);

    const results = $derived.by(() => {
        const q = query.trim();
        if (!q) return [];
        return officials.filter((o) => heMatches(q, o.name, o.position, o.org)).slice(0, 8);
    });

    const showList = $derived(open && query.trim().length > 0);

    function select(id: string) {
        open = false;
        active = -1;
        query = '';
        goto('/officials/' + id);
    }

    function onInput() {
        open = true;
        active = -1;
    }

    function onKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            open = false;
            active = -1;
            return;
        }
        if (!results.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            open = true;
            active = (active + 1) % results.length;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            open = true;
            active = active <= 0 ? results.length - 1 : active - 1;
        } else if (e.key === 'Enter') {
            const pick = active >= 0 ? results[active] : results.length === 1 ? results[0] : null;
            if (pick) {
                e.preventDefault();
                select(pick.id);
            }
        }
    }
</script>

<div class="relative w-full text-start">
    <span class="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-lg" aria-hidden="true">🔍</span>
    <input
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls="official-search-list"
        aria-activedescendant={active >= 0 ? `official-search-opt-${active}` : undefined}
        aria-autocomplete="list"
        aria-label="חיפוש מדורגים"
        autocomplete="off"
        {placeholder}
        bind:value={query}
        oninput={onInput}
        onfocus={() => (open = true)}
        onblur={() => (open = false)}
        onkeydown={onKeydown}
        class="w-full rounded-full border border-white/15 bg-slate-800/80 py-3 ps-11 pe-5 text-white placeholder-gray-500 outline-none transition-colors focus:border-blue-500/60 focus:bg-white/10"
    />

    {#if showList}
        <!-- mousedown נבלע כדי שה-blur לא יסגור לפני הקליק -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
            class="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-slate-800 shadow-2xl"
            onmousedown={(e) => e.preventDefault()}
            role="presentation"
        >
            {#if results.length}
                <ul id="official-search-list" role="listbox" aria-label="תוצאות חיפוש">
                    {#each results as o, i (o.id)}
                        <li
                            id="official-search-opt-{i}"
                            role="option"
                            aria-selected={i === active}
                        >
                            <button
                                type="button"
                                class="search-opt flex w-full items-center gap-2.5 px-4 py-2 text-start {i === active ? 'bg-white/10' : ''}"
                                onclick={() => select(o.id)}
                                onmousemove={() => (active = i)}
                                tabindex="-1"
                            >
                                <Avatar name={o.name} image={o.image} size={32} />
                                <span class="min-w-0">
                                    <span class="block truncate text-sm font-bold text-white">{o.name}</span>
                                    <span class="block truncate text-xs text-gray-400">
                                        {o.position}{o.org ? ` · ${o.org}` : ''}
                                    </span>
                                </span>
                            </button>
                        </li>
                    {/each}
                </ul>
            {:else}
                <p class="px-4 py-3 text-sm text-gray-400">
                    לא נמצא —
                    <a href="/suggest" class="font-bold text-blue-400 hover:text-blue-300">הציעו לדירוג ←</a>
                </p>
            {/if}
        </div>
    {/if}
</div>

<style>
    /* Tailwind v4: group-hover שבור — CSS מפורש */
    .search-opt:hover {
        background: rgba(255, 255, 255, 0.1);
    }
</style>
