<script lang="ts">
    import { CRITERIA } from '$lib/rating/criteria';
    import { GROUPS } from '$lib/rating/types';
    import Seo from '$lib/components/rating/Seo.svelte';
    import FaqAccordion from '$lib/components/rating/FaqAccordion.svelte';
    import { FAQ_ITEMS } from '$lib/rating/faq';
    import { breadcrumbSchema, methodologySchema } from '$lib/rating/schema';

    const STEPS = [
        { icon: '🔎', title: 'מאתרים את המדורג', text: 'חיפוש מהיר או גלישה בלוחות — כנסת, שופטים ועובדי ציבור' },
        { icon: '⭐', title: 'מדרגים ב-5 מדדים', text: 'זמנים ותקנים, תרומה לעם, ראיית המציאות, לגופו של עניין ושקיפות — עם חוות דעת' },
        { icon: '📊', title: 'התמונה נחשפת לציבור', text: 'הדירוג המצטבר גלוי לכולם — שקוף, הוגן ובלתי תלוי' },
    ];

    const jsonLd = [
        methodologySchema(),
        breadcrumbSchema([
            { name: 'דירוג ציבורי', path: '/' },
            { name: 'אודות', path: '/about' },
        ]),
    ];
</script>

<Seo
    title="אודות והמתודולוגיה"
    description="פלטפורמה לדירוג ציבורי שבה עובדי ציבור, שופטים וחברי כנסת נבחנים לפי תרומתם לעם — מדורגים ומתוגמלים חברתית, לטובה ולרעה."
    {jsonLd}
/>

<div class="mx-auto max-w-3xl space-y-6 py-6">
    <!-- פתיחה -->
    <header class="text-center">
        <h1 class="text-3xl font-black text-white md:text-4xl">אודות — דירוג ציבורי</h1>
    </header>

    <!-- החזון -->
    <section id="vision" class="rounded-2xl border border-amber-400/25 bg-white/5 p-5 text-center">
        <h2 class="text-lg font-black text-white">החזון</h2>
        <p class="mt-2 text-lg font-bold leading-relaxed text-amber-300">
            כיצד יש לעובדי הציבור ולנבחריו אינטרס ליישר קו מהר עם העם?
        </p>
        <p class="mt-1 text-gray-300">חברה אחראית מחויבת לבדוק תמיד שהחתול לא שומר על השמנת.</p>
    </section>

    <!-- מה אנחנו עושים -->
    <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 class="text-lg font-black text-white">מה אנחנו עושים</h2>
        <p class="mt-2 text-sm leading-relaxed text-gray-300">
            פלטפורמה לדירוג ציבורי שבה עובדי ציבור, שופטים וחברי כנסת נבחנים בצורה אובייקטיבית לפי
            תרומתם לעם — מדורגים על ידי האזרחים ומתוגמלים חברתית, לטובה ולרעה. כמו באתרי הדירוג
            הגדולים בעולם, רק שכאן הלקוח הוא העם.
        </p>
    </section>

    <!-- איך זה עובד -->
    <section>
        <h2 class="mb-3 text-lg font-black text-white">איך זה עובד</h2>
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

    <!-- חמשת המדדים -->
    <section>
        <h2 class="mb-3 text-lg font-black text-white">חמשת המדדים</h2>
        <div class="grid gap-3 sm:grid-cols-2">
            {#each CRITERIA as c (c.key)}
                <div class="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <span class="text-2xl leading-none" aria-hidden="true">{c.icon}</span>
                    <div class="min-w-0">
                        <p class="text-sm font-bold text-white">{c.label}</p>
                        <p class="mt-0.5 text-xs leading-relaxed text-gray-400">{c.description}</p>
                    </div>
                </div>
            {/each}
        </div>
    </section>

    <!-- שאלות ותשובות — מקור אחד עם ה-JSON-LD למעלה -->
    <div id="methodology">
        <FaqAccordion items={FAQ_ITEMS} title="שאלות ותשובות על שיטת הדירוג" />
    </div>

    <!-- השלב הבא -->
    <section class="rounded-2xl border border-blue-400/25 bg-white/5 p-5">
        <h2 class="text-lg font-black text-white">🤖 השלב הבא: התוכנה החכמה</h2>
        <p class="mt-2 text-sm leading-relaxed text-gray-300">
            תוכנה שתקבל גישה לפרוטוקולים ולפעילות הציבורית מכוח חוק חופש המידע וזכות הציבור לדעת,
            תסנן פרמטרים רלוונטיים ותפנה את תשומת לב הציבור למקרים חשודים של הפרת אמונים או פגיעה
            בקופה הציבורית. במקרים חמורים — דרישת הבהרות פומבית ופנייה לתקשורת ולרשתות החברתיות.
        </p>
    </section>

    <!-- הוקרה ותגמול -->
    <section class="rounded-2xl border border-amber-400/25 bg-white/5 p-5">
        <h2 class="text-lg font-black text-white">🎖️ הוקרה ותגמול</h2>
        <p class="mt-2 text-sm leading-relaxed text-gray-300">
            עובדי ציבור מצטיינים יזכו להוקרה ציבורית; מדי שנה, ביום העצמאות, יוענקו תעודות ופרסים
            למובילי <a href="/top-rated" class="text-blue-400 hover:text-blue-300">דירוג המצטיינים</a>.
        </p>
    </section>

    <!-- קריאה לפעולה -->
    <div class="flex flex-wrap items-center justify-center gap-2">
        {#each GROUPS as g (g.key)}
            <a
                href={g.route}
                class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >{g.icon} {g.title}</a>
        {/each}
        <a href="/top-rated" class="btn-premium rounded-full px-4 py-2 text-sm font-bold text-white">
            🏆 מצטייני הציבור
        </a>
    </div>
</div>
