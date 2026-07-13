<script lang="ts">
    // בחירת כוכבים אינטראקטיבית 1-5 — נגישה (radiogroup), עם hover preview
    let {
        value = $bindable(0),
        name = '',
        size = 30,
        label = '',
    }: { value?: number; name?: string; size?: number; label?: string } = $props();

    let hovered = $state(0);
    const shown = $derived(hovered || value);

    const WORDS = ['', 'חלש', 'טעון שיפור', 'סביר', 'טוב', 'מצוין'];
</script>

<div class="flex items-center gap-2 flex-wrap" role="radiogroup" aria-label={label || 'דירוג'}>
    <div class="flex flex-row-reverse" onmouseleave={() => (hovered = 0)}>
        {#each [5, 4, 3, 2, 1] as n (n)}
            <button
                type="button"
                role="radio"
                aria-checked={value === n}
                aria-label="{n} מתוך 5"
                class="star-btn leading-none px-0.5 transition-transform duration-100 cursor-pointer"
                class:filled={n <= shown}
                style="font-size:{size}px"
                onmouseenter={() => (hovered = n)}
                onfocus={() => (hovered = n)}
                onblur={() => (hovered = 0)}
                onclick={() => (value = n)}
            >★</button>
        {/each}
    </div>
    <span class="text-sm min-w-16 {shown ? 'text-amber-300 font-semibold' : 'text-gray-500'}">
        {shown ? WORDS[shown] : 'לא דורג'}
    </span>
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
</style>
