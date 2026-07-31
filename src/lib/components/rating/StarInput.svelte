<script lang="ts">
    // בחירת כוכבים אינטראקטיבית 1-5 — radiogroup נגיש עם roving tabindex,
    // ניווט בחצים (RTL), ניקוי בלחיצה חוזרת, ותצוגה מקדימה ב-hover.
    let {
        value = $bindable(0),
        name = '',
        size = 30,
        label = '',
    }: { value?: number; name?: string; size?: number; label?: string } = $props();

    let hovered = $state(0);
    const shown = $derived(hovered || value);

    const WORDS = ['', 'חלש', 'טעון שיפור', 'סביר', 'טוב', 'מצוין'];

    let group = $state<HTMLDivElement>();

    /** לחיצה חוזרת על אותו כוכב מנקה — "לא דורג" הוא מצב לגיטימי (מדד לא חובה) */
    function pick(n: number) {
        value = value === n ? 0 : n;
    }

    function focusStar(n: number) {
        group?.querySelector<HTMLButtonElement>(`[data-star="${n}"]`)?.focus();
    }

    function onKeyDown(e: KeyboardEvent) {
        // בתצוגה הכוכבים מסודרים 5←1 משמאל לימין, לכן חץ שמאלה מגדיל את הציון
        let next: number;
        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                next = Math.min(5, value + 1);
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                next = Math.max(1, (value || 1) - 1);
                break;
            case 'Home':
                next = 1;
                break;
            case 'End':
                next = 5;
                break;
            case 'Delete':
            case 'Backspace':
                next = 0;
                break;
            default:
                return;
        }
        e.preventDefault();
        value = next;
        focusStar(next || 1);
    }
</script>

<div
    bind:this={group}
    class="flex flex-wrap items-center gap-2"
    role="radiogroup"
    aria-label={label || 'דירוג'}
    tabindex={-1}
    onmouseleave={() => (hovered = 0)}
    onkeydown={onKeyDown}
>
    <div class="flex flex-row-reverse">
        {#each [5, 4, 3, 2, 1] as n (n)}
            <button
                type="button"
                role="radio"
                data-star={n}
                aria-checked={value === n}
                aria-label="{n} מתוך 5 — {WORDS[n]}"
                title={WORDS[n]}
                tabindex={n === (value || 1) ? 0 : -1}
                class="star-btn cursor-pointer px-0.5 leading-none transition-transform duration-100"
                class:filled={n <= shown}
                style="font-size:{size}px"
                onmouseenter={() => (hovered = n)}
                onfocus={() => (hovered = n)}
                onblur={() => (hovered = 0)}
                onclick={() => pick(n)}
            >★</button>
        {/each}
    </div>

    <span class="min-w-16 text-sm {shown ? 'font-semibold text-amber-300' : 'text-gray-500'}">
        {shown ? WORDS[shown] : 'לא דורג'}
    </span>

    {#if value > 0}
        <button
            type="button"
            onclick={() => (value = 0)}
            aria-label="ניקוי הדירוג של {label || 'המדד'}"
            title="ניקוי"
            class="clear-btn cursor-pointer rounded-full border border-white/10 px-1.5 text-xs text-gray-500 transition-colors"
        >✕</button>
    {/if}

    {#if name}
        <input type="hidden" {name} value={value || ''} />
    {/if}
</div>

<style>
    /* מילוי מימין לשמאל: flex-row-reverse + סימון "עד הכוכב" דרך class */
    .star-btn {
        color: rgba(255, 255, 255, 0.15);
    }
    .star-btn.filled {
        color: #fbbf24;
        text-shadow: 0 0 12px rgba(251, 191, 36, 0.35);
    }
    .star-btn:hover {
        transform: scale(1.15);
    }
    .star-btn:focus-visible {
        outline: 2px solid #60a5fa;
        outline-offset: 2px;
        border-radius: 4px;
    }
    .clear-btn:hover {
        color: #fca5a5;
        border-color: rgba(248, 113, 113, 0.4);
    }
</style>
