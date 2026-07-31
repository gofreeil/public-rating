<script lang="ts">
    // שאלות ותשובות — <details> נייטיבי: נגיש מהמקלדת ללא JS,
    // והתשובות נמצאות ב-HTML גם כשהן סגורות (חשוב לזחלני חיפוש).
    import type { FaqItem } from '$lib/rating/faq';

    let {
        items,
        title = 'שאלות ותשובות',
        compact = false,
    }: { items: FaqItem[]; title?: string; compact?: boolean } = $props();
</script>

<section class="flex flex-col gap-2">
    {#if title}
        <h2 class="font-black text-white {compact ? 'text-base' : 'text-lg md:text-xl'}">
            {title}
        </h2>
    {/if}

    {#each items as item (item.q)}
        <details class="faq-item rounded-2xl border border-white/10 bg-white/5">
            <summary class="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-white">
                <span>{item.q}</span>
                <span class="faq-marker shrink-0 text-gray-500" aria-hidden="true">⌄</span>
            </summary>
            <p class="px-4 pb-3 text-sm leading-relaxed text-gray-400">{item.a}</p>
        </details>
    {/each}
</section>

<style>
    /* הסתרת המשולש הדיפולטי — הסמן שלנו מסתובב במקומו */
    .faq-item summary::-webkit-details-marker {
        display: none;
    }
    .faq-item summary {
        list-style: none;
    }
    .faq-item summary:hover {
        background: rgba(255, 255, 255, 0.04);
        border-radius: 1rem;
    }
    .faq-item summary:focus-visible {
        outline: 2px solid #60a5fa;
        outline-offset: -2px;
        border-radius: 1rem;
    }
    .faq-marker {
        transition: transform 0.15s ease;
    }
    .faq-item[open] .faq-marker {
        transform: rotate(180deg);
    }
</style>
