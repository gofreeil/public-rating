<script lang="ts">
    // פודיום אולימפי לשלושת המצטיינים — סדר חזותי: [שני | ראשון | שלישי]
    import type { RatedOfficial } from '$lib/rating/types';
    import { fmtScore } from '$lib/rating/aggregate';
    import Avatar from './Avatar.svelte';
    import Stars from './Stars.svelte';

    let { officials = [] }: { officials: RatedOfficial[] } = $props();

    const MEDALS = ['🥇', '🥈', '🥉'];

    // מקבלים את השלישייה לפי סדר הדירוג; מציבים חזותית 2-1-3 (חסרים מדולגים)
    const slots = $derived(
        [1, 0, 2]
            .filter((i) => i < officials.length && officials[i])
            .map((i) => ({ official: officials[i], rank: i + 1 })),
    );

    const BASE = [
        'h-16 border-amber-400/40 bg-gradient-to-b from-amber-400/25 to-amber-400/5 text-amber-300',
        'h-10 border-white/20 bg-gradient-to-b from-white/15 to-white/5 text-gray-300',
        'h-7 border-orange-400/30 bg-gradient-to-b from-orange-400/20 to-orange-400/5 text-orange-300',
    ];
</script>

{#if slots.length}
    <div class="flex items-end justify-center gap-2 sm:gap-5">
        {#each slots as { official, rank } (official.id)}
            {@const first = rank === 1}
            <a
                href="/officials/{official.id}"
                class="podium-slot flex w-28 flex-col items-center text-center sm:w-40"
                style={first ? 'translate: 0 -10px' : ''}
            >
                <span class="leading-none {first ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}" aria-hidden="true">{MEDALS[rank - 1]}</span>
                <span class="mt-1.5"><Avatar name={official.name} image={official.image} size={first ? 72 : 56} /></span>
                <span class="podium-name mt-1.5 w-full truncate font-bold text-white {first ? '' : 'text-sm'}">{official.name}</span>
                <span class="w-full truncate text-xs text-gray-400">{official.position}</span>
                <span class="mt-1 flex items-center gap-1.5">
                    <Stars value={official.stats.average ?? 0} size={first ? 15 : 13} />
                    <span class="text-xs font-bold text-amber-300 tabular-nums">{fmtScore(official.stats.average)}</span>
                </span>
                <span class="text-[11px] text-gray-500">
                    {official.stats.count === 1 ? 'דירוג אחד' : `${official.stats.count} דירוגים`}
                </span>
                <span
                    class="mt-2 flex w-full items-start justify-center rounded-t-xl border border-b-0 pt-1 text-sm font-black {BASE[rank - 1]}"
                    aria-label="מקום {rank}"
                >{rank}</span>
            </a>
        {/each}
    </div>
{/if}

<style>
    /* Tailwind v4: group-hover שבור — CSS מפורש */
    .podium-slot:hover .podium-name {
        color: #93c5fd;
    }
</style>
