<script lang="ts">
    // ============================================================
    // דף הנחיתה של מודעה — כל התוכן נכתב בידי המפרסם, כלומר לא-אמין.
    //
    // Svelte מבריחה טקסט אבל לא href, ולכן כל כתובת יוצאת עוברת שוב דרך
    // safeHttpUrl גם כאן ולא רק בכתיבה: שורה שנשמרה לפני שהחיטוי נכנס,
    // או שנערכה ידנית באדמין של Strapi, לא תעקוף את הבדיקה.
    // ============================================================
    import { onMount } from 'svelte';
    import { trackAdLanding, trackAdLead } from '$lib/ads/adTrack';
    import { gradientCss, gradientInk } from '$lib/ads/gradients';
    import { safeDataImage, safeHttpUrl } from '$lib/ads/sanitize';
    import Seo from '$lib/components/rating/Seo.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    const ad = $derived(data.ad);
    const lp = $derived(ad.landing);

    const heroCss = $derived(gradientCss(ad.gradientId));
    const heroInk = $derived(gradientInk(ad.gradientId));

    // כל קישור יוצא מאומת שוב ברינדור
    const website = $derived(safeHttpUrl(lp.website));
    const heroImage = $derived(safeDataImage(lp.image) || safeDataImage(ad.mainImage));
    const logo = $derived(safeDataImage(ad.logo));

    const tel = $derived(lp.phone ? `tel:${lp.phone.replace(/[^\d+]/g, '')}` : '');
    const wa = $derived(lp.whatsapp ? `https://wa.me/${lp.whatsapp.replace(/[^\d]/g, '')}` : '');
    const mail = $derived(lp.email ? `mailto:${lp.email}` : '');

    const advantages = $derived(lp.advantages.filter((a) => a.trim()));
    const products = $derived(lp.products.filter((p) => p.name.trim()));

    onMount(() => trackAdLanding(ad.id));

    const contacts = $derived(
        [
            { href: tel, icon: '📞', label: lp.phone, name: 'טלפון' },
            { href: wa, icon: '💬', label: 'וואטסאפ', name: 'וואטסאפ' },
            { href: website, icon: '🌐', label: 'לאתר', name: 'אתר' },
            { href: mail, icon: '✉️', label: lp.email, name: 'דוא״ל' },
        ].filter((c) => c.href),
    );
</script>

<!--
  דף של מפרסם לא נכנס לאינדקס ולא מעביר משקל קישורים מדומיין של
  שקיפות אזרחית. אין Disallow ב-robots.txt בכוונה — חסימה שם הייתה
  מונעת מהזחלן לקרוא בכלל את ה-noindex.
-->
<Seo
    title={ad.title}
    description={lp.pitch || ad.subtitle}
    image={heroImage || undefined}
    noindex
/>

<div class="mx-auto flex max-w-3xl flex-col gap-4 py-6">
    <p class="text-center text-xs font-bold tracking-widest text-amber-400/80 uppercase">
        תוכן שיווקי
    </p>

    <!-- כותרת -->
    <section class="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div class="relative p-6 text-center" style="background: {heroCss}; color: {heroInk}">
            {#if logo}
                <img
                    src={logo}
                    alt=""
                    class="mx-auto mb-3 h-20 w-20 rounded-full border-2 border-white/30 object-cover shadow-lg"
                />
            {/if}
            <h1 class="text-2xl font-black sm:text-3xl">{lp.headline || ad.title}</h1>
            {#if ad.subtitle}
                <p class="mt-1 text-sm opacity-90">{ad.subtitle}</p>
            {/if}
        </div>

        {#if heroImage}
            <img src={heroImage} alt="" class="max-h-80 w-full object-cover" />
        {/if}

        {#if lp.pitch}
            <p class="p-5 text-center leading-relaxed whitespace-pre-line text-gray-200">
                {lp.pitch}
            </p>
        {/if}
    </section>

    <!-- יצירת קשר -->
    {#if contacts.length}
        <section class="flex flex-wrap justify-center gap-2">
            {#each contacts as c (c.name)}
                <a
                    href={c.href}
                    onclick={() => trackAdLead(ad.id)}
                    target={c.href.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer nofollow"
                    class="contact-btn flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition-colors"
                >
                    <span aria-hidden="true">{c.icon}</span>
                    <span>{c.label}</span>
                </a>
            {/each}
        </section>
    {/if}

    <!-- יתרונות -->
    {#if advantages.length}
        <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 class="mb-3 text-lg font-black text-white">למה אנחנו</h2>
            <ul class="flex flex-col gap-2">
                {#each advantages as a (a)}
                    <li class="flex items-start gap-2.5 text-sm leading-relaxed text-gray-300">
                        <span
                            class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black"
                            style="background: {heroCss}; color: {heroInk}"
                            aria-hidden="true">✓</span
                        >
                        <span>{a}</span>
                    </li>
                {/each}
            </ul>
        </section>
    {/if}

    <!-- הרחבה -->
    {#if lp.extended}
        <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p class="text-sm leading-relaxed whitespace-pre-line text-gray-300">{lp.extended}</p>
        </section>
    {/if}

    <!-- ייחודיות -->
    {#if lp.uniqueness}
        <section class="rounded-2xl border border-amber-400/25 bg-amber-500/[0.06] p-5">
            <h2 class="mb-2 text-lg font-black text-white">✨ מה מייחד אותנו</h2>
            <p class="text-sm leading-relaxed whitespace-pre-line text-gray-200">{lp.uniqueness}</p>
        </section>
    {/if}

    <!-- מוצרים -->
    {#if products.length}
        <section>
            <h2 class="mb-3 text-lg font-black text-white">מה אנחנו מציעים</h2>
            <div class="grid gap-3 sm:grid-cols-3">
                {#each products as p (p.id)}
                    <article class="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                        {#if safeDataImage(p.image)}
                            <img src={safeDataImage(p.image)} alt="" class="h-32 w-full object-cover" />
                        {/if}
                        <div class="flex flex-1 flex-col p-3">
                            <h3 class="text-sm font-bold text-white">{p.name}</h3>
                            {#if p.description}
                                <p class="mt-1 flex-1 text-xs leading-relaxed text-gray-400">{p.description}</p>
                            {/if}
                            {#if p.price}
                                <p class="mt-2 text-sm font-black text-amber-300">{p.price}</p>
                            {/if}
                        </div>
                    </article>
                {/each}
            </div>
        </section>
    {/if}

    <!-- פרטים -->
    {#if lp.address || lp.hours}
        <section class="flex flex-wrap gap-x-6 gap-y-2 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-gray-300">
            {#if lp.address}
                <span><b class="text-white">📍 כתובת:</b> {lp.address}</span>
            {/if}
            {#if lp.hours}
                <span><b class="text-white">🕒 שעות:</b> {lp.hours}</span>
            {/if}
        </section>
    {/if}

    <p class="text-center text-xs leading-relaxed text-gray-600">
        זהו תוכן שיווקי בתשלום. הפרסום באתר אינו מהווה המלצה של האתר על המפרסם,
        ואינו משפיע בשום צורה על הדירוגים — הציונים נקבעים אך ורק על ידי הציבור המדרג.
    </p>

    <div class="flex flex-wrap justify-center gap-4 text-sm">
        <a href="/" class="text-blue-400 transition-colors hover:text-blue-300">← חזרה לאתר</a>
        <a href="/advertise" class="text-blue-400 transition-colors hover:text-blue-300">
            📢 גם אתם רוצים לפרסם?
        </a>
    </div>
</div>

<style>
    /* Tailwind v4: group-hover שבור בפרויקט הזה — CSS מפורש */
    .contact-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(96, 165, 250, 0.4);
    }
</style>
