<script lang="ts">
    import Seo from '$lib/components/rating/Seo.svelte';

    const IMAGE = '/images/public-hearing.webp';
</script>

<Seo
    title="שימוע ציבורי — דירוג וביקורת שופטים על ידי העם"
    description="אולם שימוע ציבורי: דירוג וביקורת שופטים על ידי ועדי השכונות."
    image={IMAGE}
    imageWidth={2000}
    imageHeight={1116}
/>

<div class="space-y-3 py-4">
    <h1 class="text-center text-xl font-black text-white md:text-2xl">⚖️ דירוג וביקורת שופטים על ידי העם</h1>
    <img
        src={IMAGE}
        alt="אולם שימוע ציבורי — דירוג וביקורת שופטים על ידי העם"
        width="2000"
        height="1116"
        class="h-auto w-full rounded-2xl border border-white/10 shadow-2xl"
    />
    <div class="text-center">
        <a href="/judges" class="text-sm text-blue-400 transition-colors hover:text-blue-300">← לדירוג השופטים</a>
    </div>
</div>
