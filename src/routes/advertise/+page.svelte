<script lang="ts">
    // ============================================================
    // דף "פרסמו אצלנו" - מחירון ובחירת מסלול, מקומי לאתר הדירוג הציבורי.
    //
    // אותו מסע כמו בדף הפרסום של קהילה בשכונה: בוחרים מסלול ← רואים סיכום
    // מחיר ותאריך סיום ← ממשיכים לסטודיו (בילדר ודף נחיתה). המסלול נשמר
    // בדפדפן (adDraft) והסטודיו נפתח רק אחריו.
    //
    // מה ששייך לאתר הזה בלבד: אין סליקה מקוונת - התשלום מתואם מול הצוות
    // אחרי אישור הפרסומת (השרת מסמן payment=pending), ואין בחירת שכונות,
    // קודי הנחה ותוספות מפה.
    // ============================================================
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import Seo from '$lib/components/rating/Seo.svelte';
    import { adPlans, DEFAULT_PLAN_DAYS } from '$lib/ads/plans';
    import { clearAdDraft, clearAdEditTarget, getAdEditTarget, getAdPlanDays, setAdPlanDays } from '$lib/adDraft';

    const email = 'freedomhasbegun@gmail.com';

    // המקומות שקיימים בפועל באתר — בלי הבטחות למה שאין
    const placements = [
        {
            icon: '🖥️',
            title: 'בדסקטופ — הטור הימני',
            where: 'עמודה קבועה בצד ימין, בכל דפי האתר',
            points: [
                'נשארת על המסך גם בזמן גלילה בלוחות הדירוג',
                'המשבצות מתחלפות במחזור — כל מודעה מקבלת את הבמה',
            ],
        },
        {
            icon: '📱',
            title: 'בנייד — הלשונית הנפתחת',
            where: 'לשונית קבועה בתחתית המסך, נפתחת בלחיצה',
            points: [
                'נגישה מכל דף בלי להסתיר את התוכן',
                'נפתחת ביוזמת הגולש — חשיפה בלי הפרעה',
            ],
        },
    ];

    const audience = [
        { icon: '🏛️', text: 'אזרחים שבאים לבדוק את תפקודם של נבחרי ציבור' },
        { icon: '⚖️', text: 'קהל ער לשקיפות, לאחריותיות ולשירות הציבורי' },
        { icon: '🔍', text: 'תנועה מחיפוש אורגני על שמות מכהנים' },
    ];

    // "איך מפרסמים" - המסע בסטודיו
    const steps = [
        { n: 1, title: 'בוחרים מסלול', text: 'תקופת הפרסום והמחיר - כאן למעלה' },
        { n: 2, title: 'מעצבים', text: 'כרטיס הפרסומת (7 שלבים) ודף הנחיתה עם תצוגה חיה; הטיוטה נשמרת אוטומטית' },
        { n: 3, title: 'שולחים לאישור', text: 'הצוות מאשר, מתאם תשלום, והפרסומת עולה לאוויר' },
    ];

    let selected = $state<number>(DEFAULT_PLAN_DAYS);
    let plan = $derived(adPlans.find((p) => p.days === selected) ?? adPlans[0]);

    onMount(() => {
        const saved = getAdPlanDays();
        if (saved && adPlans.some((p) => p.days === saved)) selected = saved;
    });

    function fmtDate(d: Date) {
        return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    // הערכה: התקופה נספרת מרגע האישור, לא מרגע הבחירה
    let endsOn = $derived(fmtDate(new Date(Date.now() + plan.days * 86_400_000)));

    function perDay(p: { price: number; days: number }) {
        return (p.price / p.days).toFixed(p.price / p.days < 10 ? 1 : 0);
    }

    function continueToBuilder() {
        setAdPlanDays(plan.days);
        // הגעה דרך המחירון = פרסומת חדשה. טיוטה שנפתחה לעריכת פרסומת קיימת
        // לא נגררת לכאן - אחרת השליחה הייתה דורסת את הפרסומת הקיימת (PUT)
        if (getAdEditTarget()) {
            clearAdEditTarget();
            clearAdDraft();
        }
        goto('/advertise/builder');
    }

    const mailto = $derived(
        `mailto:${email}` +
            `?subject=${encodeURIComponent('פרסום באתר דירוג ציבורי')}` +
            `&body=${encodeURIComponent(
                `שלום,\nאשמח לפרסם באתר דירוג ציבורי.\n\nמסלול: ${plan.title} — ₪${plan.price}\n\n` +
                    'שם העסק / הארגון:\n' +
                    'טלפון לחזרה:\n',
            )}`,
    );
</script>

<Seo
    title="פרסום באתר"
    description="פרסום באתר דירוג ציבורי — טור פרסומות קבוע בדסקטופ ולשונית בנייד, מול קהל אזרחים שמתעניין בשקיפות ובתפקוד נבחרי הציבור."
/>

<div class="mx-auto flex max-w-3xl flex-col gap-3 py-4">
    <header class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 class="text-2xl font-black text-white md:text-3xl">📢 פרסמו אצלנו</h1>
        <p class="text-sm text-gray-300">
            חשיפה באתר <b class="text-white">דירוג ציבורי</b> לאזרחים שבאים לבדוק את מי שמשרת אותם
        </p>
    </header>

    <!-- ===== בחירת מסלול ===== -->
    <section class="rounded-2xl border border-amber-400/25 bg-gradient-to-l from-amber-500/10 to-transparent p-4">
        <div class="mb-3 flex items-center gap-2">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/25 text-xs font-black text-amber-300">1</span>
            <h2 class="text-lg font-black text-white">בחרו מסלול פרסום</h2>
        </div>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {#each adPlans as p (p.days)}
                <button
                    type="button"
                    onclick={() => (selected = p.days)}
                    aria-pressed={selected === p.days}
                    class="cursor-pointer rounded-xl border px-2 py-2.5 text-center transition-colors {selected === p.days
                        ? 'border-amber-400 bg-amber-500/20 text-white'
                        : 'border-white/10 bg-slate-800/80 text-gray-300 hover:bg-white/10'}"
                >
                    <span class="block text-sm font-black">{p.label}</span>
                    <span class="block text-lg font-black text-amber-300">₪{p.price}</span>
                    <span class="block text-[11px] text-gray-500">₪{perDay(p)} ליום</span>
                </button>
            {/each}
        </div>

        <!-- סיכום ההזמנה -->
        <div class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
            <div class="text-sm text-gray-300">
                <b class="text-white">{plan.title}</b> — סה״כ <b class="text-amber-300">₪{plan.price}</b>
                <span class="block text-xs text-gray-500">
                    אם תאושר היום, תרוץ עד {endsOn}. התשלום מתואם מול הצוות לאחר אישור הפרסומת.
                </span>
            </div>
            <div class="flex flex-wrap gap-2">
                <button type="button" onclick={continueToBuilder} class="btn-premium cursor-pointer rounded-xl px-5 py-2.5 text-sm font-bold text-white">
                    🎨 המשך לעיצוב הפרסומת
                </button>
                <a
                    href={mailto}
                    class="rounded-xl border border-white/10 bg-slate-800/80 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
                >✉️ שליחת פנייה</a>
            </div>
        </div>
    </section>

    <!-- ===== המקומות + הקהל ===== -->
    <section class="grid gap-2 sm:grid-cols-2">
        {#each placements as p (p.title)}
            <div class="rounded-2xl border border-white/10 bg-slate-800/80 p-4">
                <div class="flex items-center gap-2">
                    <span class="text-2xl" aria-hidden="true">{p.icon}</span>
                    <div class="min-w-0">
                        <h2 class="text-base font-black text-white">{p.title}</h2>
                        <p class="text-xs text-gray-500">{p.where}</p>
                    </div>
                </div>
                <ul class="mt-2 flex flex-col gap-1">
                    {#each p.points as pt (pt)}
                        <li class="flex items-start gap-2 text-sm leading-relaxed text-gray-300">
                            <span aria-hidden="true" class="text-emerald-400">✓</span>
                            <span>{pt}</span>
                        </li>
                    {/each}
                </ul>
            </div>
        {/each}
    </section>

    <section class="rounded-2xl border border-white/10 bg-slate-800/80 p-4">
        <h2 class="mb-2 text-base font-black text-white">למי אתם מגיעים</h2>
        <ul class="flex flex-col gap-1.5">
            {#each audience as a (a.text)}
                <li class="flex items-start gap-2.5 text-sm text-gray-300">
                    <span aria-hidden="true" class="text-lg leading-none">{a.icon}</span>
                    <span>{a.text}</span>
                </li>
            {/each}
        </ul>
    </section>

    <!-- ===== איך מפרסמים ===== -->
    <section class="rounded-2xl border border-white/10 bg-slate-800/80 p-4">
        <h2 class="mb-3 text-base font-black text-white">איך מפרסמים?</h2>
        <ol class="grid gap-3 sm:grid-cols-3">
            {#each steps as s (s.n)}
                <li class="flex items-start gap-2.5">
                    <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-sm font-black text-blue-300">
                        {s.n}
                    </span>
                    <span class="min-w-0">
                        <span class="block text-sm font-bold text-white">{s.title}</span>
                        <span class="block text-xs text-gray-400">{s.text}</span>
                    </span>
                </li>
            {/each}
        </ol>
    </section>

    <p class="text-center text-xs text-gray-500">
        כבר יש לכם פרסומת?
        <a href="/advertise/manage" class="text-blue-400 hover:text-blue-300">לניהול הפרסומות שלי</a>
        · או ישירות:
        <a href="mailto:{email}" class="text-blue-400 hover:text-blue-300">{email}</a>
    </p>

    <p class="text-center text-xs leading-relaxed text-gray-600">
        הפרסום באתר אינו מהווה המלצה של האתר על המפרסם, ואינו משפיע בשום צורה על
        הדירוגים — הציונים נקבעים אך ורק על ידי הציבור המדרג.
    </p>

    <div class="text-center">
        <a href="/" class="text-sm text-blue-400 transition-colors hover:text-blue-300">← חזרה לדף הבית</a>
    </div>
</div>
