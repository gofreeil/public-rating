<script lang="ts">
    import { onMount } from 'svelte';
    import { tweened } from 'svelte/motion';
    import { cubicOut } from 'svelte/easing';
    import { goto } from '$app/navigation';

    interface Props {
        animating?: boolean;
        newAmount?: number;
        total?: number;
    }

    let { animating = false, newAmount = 0, total = 0 }: Props = $props();

    const display = tweened(0, { duration: 1200, easing: cubicOut });
    let mounted = false;

    onMount(async () => {
        mounted = true;
        // אם לא הועבר total מבחוץ - שלוף מה-API
        if (total === 0) {
            try {
                const res  = await fetch('/api/community-fund');
                const data = await res.json();
                total = data.total ?? 0;
            } catch {}
        }
        display.set(total);
    });

    // כשמגיע newAmount חדש (אחרי תשלום) - עדכן
    $effect(() => {
        if (animating && newAmount > 0) {
            display.set(total);
        }
    });

    function handleClick() {
        goto('/community-fund');
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="fund-banner group relative overflow-hidden rounded-2xl cursor-pointer select-none"
    onclick={handleClick}
    onkeydown={(e) => e.key === 'Enter' && handleClick()}
    role="link"
    tabindex="0"
    aria-label="קופת השכונה - לחץ לפרטים"
>
    <!-- רקע גרדיאנט -->
    <div class="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-amber-600/20 to-green-600/20
                border border-yellow-500/30 rounded-2xl"></div>

    <!-- ניצוצות בזמן אנימציה -->
    {#if animating}
        <div class="sparkles pointer-events-none">
            {#each [0,1,2,3,4] as i}
                <span class="sparkle" style="--i:{i}">✨</span>
            {/each}
        </div>
    {/if}

    <div class="relative z-10 flex items-center justify-between gap-3 px-4 py-3">
        <!-- צד ימין: אייקון + כותרת -->
        <div class="flex items-center gap-3">
            <span class="text-3xl {animating ? 'animate-bounce' : ''}">🏦</span>
            <div>
                <p class="text-xs font-bold text-yellow-400/80 mb-0.5">קופת השכונה</p>
                <p class="text-[10px] text-gray-400">10% מכל תשלום</p>
            </div>
        </div>

        <!-- מרכז: סכום -->
        <div class="flex-1 text-center">
            <p class="text-2xl font-black {animating ? 'text-yellow-300' : 'text-yellow-400'}
                       transition-colors duration-300">
                ₪{Math.round($display).toLocaleString('he-IL')}
            </p>
            {#if animating && newAmount > 0}
                <p class="text-xs text-green-400 font-bold animate-pulse">
                    +₪{newAmount} נוסף עכשיו! 🎉
                </p>
            {/if}
        </div>

        <!-- צד שמאל: חץ -->
        <div class="text-gray-400 group-hover:text-yellow-400 transition-colors text-sm font-bold">
            לפרטים ←
        </div>
    </div>
</div>

<style>
    .fund-banner {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .fund-banner:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 32px rgba(234, 179, 8, 0.2);
    }

    .sparkle {
        position: absolute;
        font-size: 1.2rem;
        animation: sparkleAnim 1.5s ease-out calc(var(--i) * 0.2s) forwards;
        pointer-events: none;
        top: 50%;
        right: calc(20% + var(--i) * 15%);
    }

    @keyframes sparkleAnim {
        0%   { transform: translateY(0) scale(0.5); opacity: 0; }
        30%  { opacity: 1; transform: translateY(-20px) scale(1.2); }
        100% { transform: translateY(-50px) scale(0.8); opacity: 0; }
    }
</style>
