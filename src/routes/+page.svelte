<script lang="ts">
    // דף הבית — דירוג ציבורי
    import { CRITERIA } from '$lib/rating/criteria';
    import { GROUPS, groupByKey } from '$lib/rating/types';
    import { websiteSchema } from '$lib/rating/schema';
    import { absDate, isoDate, relDate } from '$lib/rating/time';
    import Seo from '$lib/components/rating/Seo.svelte';
    import OfficialCard from '$lib/components/rating/OfficialCard.svelte';
    import OfficialSearch from '$lib/components/rating/OfficialSearch.svelte';
    import Stars from '$lib/components/rating/Stars.svelte';

    let { data } = $props();

    const STEPS = [
        { icon: '🔎', title: 'מאתרים את המדורג', text: 'חיפוש מהיר או גלישה בלוחות — כנסת, שופטים ועובדי ציבור' },
        { icon: '⭐', title: 'מדרגים ב-5 מדדים', text: 'זמנים ותקנים, תרומה לעם, ראיית המציאות, לגופו של עניין ושקיפות — עם חוות דעת' },
        { icon: '📊', title: 'התמונה נחשפת לציבור', text: 'הדירוג המצטבר גלוי לכולם — שקוף, הוגן ובלתי תלוי' },
    ];

    // נקודת זמן אחת לכל הדף — לא Date.now() בתוך הרינדור
    const now = Date.now();
</script>

<Seo
    title="הציבור מדרג את משרתיו"
    description="שקיפות, אחריות ודירוג אמיתי של חברי כנסת, שופטים ועובדי ציבור על ידי העם. חמישה מדדים: זמנים ותקנים, תרומה לעם, ראיית המציאות, לגופו של עניין ושקיפות."
    jsonLd={websiteSchema(data.stats.officialCount, data.stats.reviewCount)}
/>

<div class="space-y-8 py-2 md:py-4">

    <!-- a) Hero + חיפוש + צ'יפים -->
    <section class="text-center">
        <div class="relative mx-auto inline-block">
            <img
                src="/images/public-rating.jpeg"
                alt="דירוג ציבורי"
                class="max-h-56 w-auto rounded-2xl object-contain"
            />
            <div class="absolute inset-0 rounded-2xl" style="box-shadow: inset 0 0 30px 10px #0f172a;"></div>
        </div>
        <h1 class="mt-3 text-3xl font-black text-white md:text-4xl">הציבור מדרג את משרתיו</h1>
        <p class="mt-2 text-sm text-gray-400 md:text-base">
            שקיפות, אחריות ודירוג אמיתי של נבחרי ועובדי הציבור — על ידי העם
        </p>

        <div class="mx-auto mt-4 max-w-xl">
            <OfficialSearch officials={data.searchIndex} />
        </div>

        <div class="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-bold text-white">
                🗳️ {data.stats.officialCount} מדורגים
            </span>
            <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-bold text-white">
                ⭐ {data.stats.reviewCount} דירוגים
            </span>
            {#each GROUPS as g (g.key)}
                <a href={g.route} class="chip-link rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-300 transition-colors">
                    {g.icon} {g.title}
                </a>
            {/each}
        </div>
    </section>

    <!-- b) כרטיסי קטגוריות -->
    <section class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {#each GROUPS as g (g.key)}
            <a href={g.route} class="cat-card flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors">
                <span class="flex items-center gap-2">
                    <span class="text-2xl">{g.icon}</span>
                    <span class="font-black text-white">{g.title}</span>
                </span>
                <span class="text-xs leading-relaxed text-gray-400">{g.blurb}</span>
                <span class="mt-1 flex items-center justify-between text-xs">
                    <span class="text-gray-500">{data.groupCounts[g.key]} מדורגים</span>
                    <span class="font-bold text-blue-400">ללוח המלא ←</span>
                </span>
            </a>
        {/each}
    </section>

    <!-- c+d) המובילים והנמוכים בכל קטגוריה -->
    {#if data.showcase.length}
        <section class="space-y-6">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <h2 class="text-lg font-black text-white md:text-xl">🏆 המובילים והנמוכים — לפי קטגוריה</h2>
                <a href="/top-rated" class="text-sm font-bold text-blue-400 hover:text-blue-300">לכל המצטיינים ←</a>
            </div>
            {#each data.showcase as s (s.key)}
                {@const g = groupByKey(s.key)}
                <div>
                    <div class="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                        <h3 class="font-black text-white">{g?.icon} {g?.title}</h3>
                        <a href={g?.route} class="text-xs font-bold text-blue-400 hover:text-blue-300">ללוח המלא ←</a>
                    </div>
                    <div class="grid grid-cols-1 gap-3 {s.bottom.length ? 'lg:grid-cols-2' : ''}">
                        <div class="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.04] p-3">
                            <h4 class="mb-2 text-sm font-bold text-emerald-300">🏆 שלושת המדורגים הגבוה ביותר</h4>
                            <div class="flex flex-col gap-2">
                                {#each s.top as official, i (official.id)}
                                    <OfficialCard {official} rank={i + 1} compact />
                                {/each}
                            </div>
                        </div>
                        {#if s.bottom.length}
                            <div class="rounded-2xl border border-red-400/20 bg-red-500/[0.04] p-3">
                                <h4 class="mb-2 text-sm font-bold text-red-300">📉 שלושת המדורגים הנמוך ביותר</h4>
                                <div class="flex flex-col gap-2">
                                    {#each s.bottom as official (official.id)}
                                        <OfficialCard {official} compact />
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        </section>
    {:else}
        <section>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                <p class="font-bold text-white">עוד לא דורג אף אחד — היו הראשונים!</p>
                <p class="mt-1 text-sm text-gray-400">בחרו לוח, מצאו את המדורג ושתפו את דעתכם</p>
                <div class="mt-3 flex flex-wrap justify-center gap-2">
                    {#each GROUPS as g (g.key)}
                        <a href={g.route} class="btn-premium rounded-full px-4 py-1.5 text-sm font-bold text-white">
                            {g.icon} {g.title}
                        </a>
                    {/each}
                </div>
            </div>
        </section>
    {/if}

    <!-- e) חמשת המדדים -->
    <section>
        <h2 class="mb-3 text-lg font-black text-white md:text-xl">חמשת המדדים</h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {#each CRITERIA as c (c.key)}
                <div class="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                    <span class="text-2xl" aria-hidden="true">{c.icon}</span>
                    <p class="mt-1 text-sm font-black text-white">{c.short}</p>
                    <p class="mt-1 text-xs leading-relaxed text-gray-500">{c.description}</p>
                </div>
            {/each}
        </div>
    </section>

    <!-- f) איך זה עובד -->
    <section>
        <h2 class="mb-3 text-lg font-black text-white md:text-xl">איך זה עובד</h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {#each STEPS as step, i (step.title)}
                <div class="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                    <span
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-l from-blue-600 to-purple-600 text-sm font-black text-white"
                    >{i + 1}</span>
                    <span>
                        <span class="block text-sm font-black text-white">{step.icon} {step.title}</span>
                        <span class="mt-0.5 block text-xs leading-relaxed text-gray-400">{step.text}</span>
                    </span>
                </div>
            {/each}
        </div>
    </section>

    <!-- g) ביקורות אחרונות -->
    {#if data.recentReviews.length}
        <section>
            <h2 class="mb-3 text-lg font-black text-white md:text-xl">ביקורות אחרונות</h2>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {#each data.recentReviews as r (r.id)}
                    <article class="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <span class="text-sm font-bold text-white">
                                {r.anonymous || !r.reviewer_name ? 'אזרח/ית' : r.reviewer_name}
                            </span>
                            <Stars value={r.overall} size={14} />
                        </div>
                        <p class="line-clamp-3 text-sm leading-relaxed text-gray-300">{r.text}</p>
                        <div class="mt-auto flex flex-wrap items-center justify-between gap-2 text-xs">
                            <a href="/officials/{r.official.id}" class="font-bold text-blue-400 hover:text-blue-300">
                                על {r.official.name}{r.official.position ? ` · ${r.official.position}` : ''}
                            </a>
                            <time datetime={isoDate(r.created_at)} title={absDate(r.created_at)} class="text-gray-500">
                                {relDate(r.created_at, now)}
                            </time>
                        </div>
                    </article>
                {/each}
            </div>
        </section>
    {/if}

    <!-- h) פס חזון -->
    <section class="rounded-2xl border border-white/10 bg-gradient-to-l from-blue-600/15 to-purple-600/15 p-4 text-center">
        <p class="font-black text-white">"חברה אחראית בודקת שהחתול לא שומר על השמנת"</p>
        <p class="mt-1 text-sm text-gray-400">
            דירוג ציבורי הוא כלי הביקורת של האזרח על משרתיו —
            <a href="/about#vision" class="font-bold text-blue-400 hover:text-blue-300">לחזון בעמוד האודות ←</a>
        </p>
    </section>

</div>

<style>
    /* Tailwind v4: group-hover שבור — CSS מפורש */
    .cat-card:hover {
        background: rgba(255, 255, 255, 0.09);
        border-color: rgba(96, 165, 250, 0.4);
    }
    .chip-link:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
    }
</style>
