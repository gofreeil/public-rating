<script lang="ts">
    // תצוגת כוכבים עם מילוי חלקי (קריאה בלבד) — RTL: מילוי מימין לשמאל
    let {
        value = 0,
        size = 18,
        showValue = false,
    }: { value?: number; size?: number; showValue?: boolean } = $props();

    const pct = $derived(Math.max(0, Math.min(5, value)) / 5 * 100);
    const label = $derived(value > 0 ? `${(Math.round(value * 10) / 10).toFixed(1)} מתוך 5` : 'טרם דורג');
</script>

<span class="inline-flex items-center gap-1.5" role="img" aria-label={label}>
    <span class="relative inline-block leading-none" style="font-size:{size}px" aria-hidden="true">
        <span class="text-white/15 tracking-tight">★★★★★</span>
        <span
            class="absolute inset-0 overflow-hidden text-amber-400 tracking-tight whitespace-nowrap"
            style="width:{pct}%"
        >★★★★★</span>
    </span>
    {#if showValue}
        <span class="font-bold text-amber-300 tabular-nums" style="font-size:{size * 0.85}px" aria-hidden="true">
            {value > 0 ? (Math.round(value * 10) / 10).toFixed(1) : '—'}
        </span>
    {/if}
</span>
