<script lang="ts">
    // אנימציה של גלים
    let mounted = false;
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";

    let container: HTMLElement;
    let mouseX = 0;
    let mouseY = 0;
    let showTooltip = false;
    let tooltipTimeout: ReturnType<typeof setTimeout>;
    let selectedOption = $state<'yes' | 'no' | 'maybe' | null>(null);

    function handleMouseMove(e: MouseEvent) {
        if (!container) return;
        const rect = container.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    }

    function handleMouseEnter() {
        showTooltip = true;
        clearTimeout(tooltipTimeout);
        tooltipTimeout = setTimeout(() => {
            showTooltip = false;
        }, 4500);
    }

    function handleMouseLeave() {
        showTooltip = false;
        clearTimeout(tooltipTimeout);
    }

    function handleFocusIn() {
        showTooltip = true;
        clearTimeout(tooltipTimeout);
        tooltipTimeout = setTimeout(() => {
            showTooltip = false;
        }, 4500);
    }

    function handleFocusOut() {
        showTooltip = false;
        clearTimeout(tooltipTimeout);
    }

    onMount(() => {
        mounted = true;
    });
</script>

<div
    bind:this={container}
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
    onmousemove={handleMouseMove}
    onfocusin={handleFocusIn}
    onfocusout={handleFocusOut}
    role="region"
    aria-label="משאל עם קהילתי"
    class="referendum-banner group relative overflow-hidden rounded-2xl shadow-2xl my-8 cursor-default"
>
    <!-- רקע גרדיאנט -->
    <div
        class="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500"
    ></div>

    <!-- Tooltip העוקב אחרי העכבר -->
    {#if showTooltip}
        <div
            transition:fade={{ duration: 1500, delay: 3000 }}
            class="pointer-events-none absolute z-50 flex flex-row gap-2 p-3 bg-white/10 backdrop-blur-xl border border-white/30 rounded-xl shadow-2xl transition-all duration-75 ease-out"
            style="left: {mouseX + 20}px; top: {mouseY +
                20}px; transform: translate(0, 0);"
        >
            <div class="badge-tooltip">
                <span class="text-lg">✓</span>
                <span>דמוקרטיה ישירה</span>
            </div>
            <div class="badge-tooltip">
                <span class="text-lg">🎯</span>
                <span>השפעה אמיתית</span>
            </div>
            <div class="badge-tooltip">
                <span class="text-lg">⚡</span>
                <span>תוצאות מיידיות</span>
            </div>
        </div>
    {/if}

    <!-- תוכן -->
    <div class="relative z-10 p-4 md:p-6 md:p-8">
        <!-- כותרת עם כפתור בצד -->
        <div class="flex items-center justify-between mb-3 md:mb-4">
            <div class="flex items-center gap-2 md:gap-3">
                <span class="text-4xl md:text-5xl md:text-6xl">🗳️</span>
                <div>
                    <h2 class="text-2xl md:text-3xl md:text-4xl font-black leading-tight">
                        <span
                            class="inline-block transform hover:scale-110 transition-transform"
                            >משאל</span
                        >
                        <span
                            class="inline-block transform hover:scale-110 transition-transform text-yellow-300"
                        >
                            עם</span
                        >
                    </h2>
                    <p class="text-sm md:text-base md:text-lg font-bold text-blue-100">
                        הקול שלך משנה את המציאות
                    </p>
                </div>
            </div>

            <!-- כפתור פעולה - Hidden on mobile -->
            <button
                class="hidden md:block cta-button-small transition-all duration-300 hover:scale-105 flex-shrink-0"
                aria-label="השתתף במשאל הקהילה עכשיו"
            >
                <div
                    class="relative bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl px-6 py-4 shadow-lg"
                >
                    <div class="text-center">
                        <div class="text-2xl font-black text-purple-900 mb-1">
                            השתתף עכשיו
                        </div>
                        <div class="text-xs font-bold text-purple-800">
                            קולך נשמע! 📢
                        </div>
                    </div>
                </div>
            </button>
        </div>

        <!-- סטטיסטיקות מונפשות -->
        <div class="mt-3 md:mt-4 grid grid-cols-3 gap-2 md:gap-3 text-center">
            <div class="stat-box">
                <div class="text-xl md:text-2xl font-black text-yellow-300">12,847</div>
                <div class="text-[10px] md:text-xs text-blue-200">משתתפים</div>
            </div>
            <div class="stat-box">
                <div class="text-xl md:text-2xl font-black text-yellow-300">156</div>
                <div class="text-[10px] md:text-xs text-blue-200">משאלים פעילים</div>
            </div>
            <div class="stat-box">
                <div class="text-xl md:text-2xl font-black text-yellow-300">89%</div>
                <div class="text-[10px] md:text-xs text-blue-200">שביעות רצון</div>
            </div>
        </div>

        <!-- דוגמה למשאל - מיחזור אשפה -->
        <div
            class="mt-3 md:mt-4 bg-white/10 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/20"
        >
            <div class="flex items-start gap-2 mb-2 md:mb-3">
                <span class="text-xl md:text-2xl">♻️</span>
                <div class="flex-1">
                    <h3 class="text-base md:text-lg font-bold text-white mb-1">
                        משאל לדוגמה
                    </h3>
                    <p class="text-white/90 text-xs md:text-sm leading-relaxed">
                        האם אתם מעוניינים לעבור למערכת מיחזור אשפה קהילתית חדשה
                        שתוזיל את העלויות ב-30% ותשפר את השירות
                    </p>
                </div>
            </div>

            <div class="space-y-1.5 md:space-y-2" role="group" aria-label="אפשרויות הצבעה">
                <button
                    class="poll-option poll-yes"
                    aria-pressed={selectedOption === 'yes'}
                    onclick={() => (selectedOption = 'yes')}
                >
                    <span class="text-base md:text-lg" aria-hidden="true">✅</span>
                    <span class="font-bold text-xs md:text-sm">כן, אני בעד!</span>
                    <span class="text-[10px] md:text-xs opacity-80">(67%)</span>
                </button>
                <button
                    class="poll-option poll-no"
                    aria-pressed={selectedOption === 'no'}
                    onclick={() => (selectedOption = 'no')}
                >
                    <span class="text-base md:text-lg" aria-hidden="true">❌</span>
                    <span class="font-bold text-xs md:text-sm">לא, אני מעדיף להשאר במצב הנוכחי</span>
                    <span class="text-[10px] md:text-xs opacity-80">(23%)</span>
                </button>
                <button
                    class="poll-option poll-maybe"
                    aria-pressed={selectedOption === 'maybe'}
                    onclick={() => (selectedOption = 'maybe')}
                >
                    <span class="text-base md:text-lg" aria-hidden="true">🤔</span>
                    <span class="font-bold text-xs md:text-sm">צריך לבדוק עוד פרטים</span>
                    <span class="text-[10px] md:text-xs opacity-80">(10%)</span>
                </button>
            </div>

            <div class="mt-2 md:mt-3 text-center text-[10px] md:text-xs text-blue-200">
                <span class="font-bold">1,247</span> תושבים הצביעו עד כה
            </div>
        </div>
    </div>
</div>

<style>
    .referendum-banner {
        min-height: 200px;
    }

    .badge-tooltip {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: white;
        font-weight: 800;
        font-size: 0.875rem;
        white-space: nowrap;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .stat-box {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        padding: 0.75rem;
        border-radius: 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
    }

    .stat-box:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
    }

    .poll-option {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        border: 2px solid rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        text-align: right;
    }

    .poll-option:hover {
        transform: translateX(-4px);
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.5);
    }

    .poll-yes:hover {
        background: rgba(34, 197, 94, 0.2);
        border-color: rgb(34, 197, 94);
    }

    .poll-no:hover {
        background: rgba(239, 68, 68, 0.2);
        border-color: rgb(239, 68, 68);
    }

    .poll-maybe:hover {
        background: rgba(251, 191, 36, 0.2);
        border-color: rgb(251, 191, 36);
    }

    @media (max-width: 768px) {
        .referendum-banner {
            min-height: 200px;
        }
    }
</style>
