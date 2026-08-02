<script lang="ts">
    // ============================================================
    // דף "פרסמו אצלנו" — מקומי לאתר הדירוג הציבורי בלבד.
    //
    // קודם ישב כאן טופס הזמנת הפרסום של "קהילה בשכונה": בחירת שכונות,
    // מחירון לפי מספר שכונות, ואישור הזמנה שנשלח מ/אל ads@shchuna.co.il.
    // כלומר הבאנר הימני באתר הזה אמנם הפנה פנימה, אבל נחת על מכירת פרסום
    // באתר אחר ולחשבון אחר. הדף הזה מוכר את המקומות של האתר הזה בלבד,
    // באותו מודל שקיים באתר הגמ"ח הארצי.
    // ============================================================
    import Seo from '$lib/components/rating/Seo.svelte';

    const email = 'freedomhasbegun@gmail.com';

    const mailto =
        `mailto:${email}` +
        `?subject=${encodeURIComponent('פרסום באתר דירוג ציבורי')}` +
        `&body=${encodeURIComponent(
            'שלום,\nאשמח לפרסם באתר דירוג ציבורי.\n\n' +
                'שם העסק / הארגון:\n' +
                'טלפון לחזרה:\n' +
                'המקום המבוקש (טור ימני / נייד / שניהם):\n' +
                'תקופה מבוקשת:\n',
        )}`;

    // המקומות שקיימים בפועל באתר — בלי הבטחות למה שאין
    const placements = [
        {
            icon: '🖥️',
            title: 'בדסקטופ — הטור הימני',
            where: 'עמודה קבועה בצד ימין, בכל דפי האתר',
            points: [
                'נשארת על המסך גם בזמן גלילה בלוחות הדירוג',
                'המשבצות מתחלפות במחזור — כל מודעה מקבלת את הבמה',
                'מוצגת לכל גולשי הדסקטופ לאורך כל הביקור',
            ],
        },
        {
            icon: '📱',
            title: 'בנייד — הלשונית הנפתחת',
            where: 'לשונית קבועה בתחתית המסך, נפתחת בלחיצה',
            points: [
                'נגישה מכל דף בלי להסתיר את התוכן',
                'נפתחת ביוזמת הגולש — חשיפה בלי הפרעה',
                'אותה מודעה, מותאמת למסך קטן',
            ],
        },
    ];

    const audience = [
        { icon: '🏛️', text: 'אזרחים שבאים לבדוק את תפקודם של נבחרי ציבור' },
        { icon: '⚖️', text: 'קהל ער לשקיפות, לאחריותיות ולשירות הציבורי' },
        { icon: '🔍', text: 'תנועה מחיפוש אורגני על שמות מכהנים' },
    ];

    const steps = [
        { n: 1, title: 'פונים אלינו', text: 'מייל עם שם העסק, טלפון והמקום המבוקש' },
        { n: 2, title: 'מתאמים', text: 'נחזור אליכם עם זמינות, מחיר ותקופה' },
        { n: 3, title: 'עולים לאוויר', text: 'שולחים קריאייטיב, ואנחנו מעלים את המודעה' },
    ];
</script>

<Seo
    title="פרסום באתר"
    description="פרסום באתר דירוג ציבורי — טור פרסומות קבוע בדסקטופ ולשונית בנייד, מול קהל אזרחים שמתעניין בשקיפות ובתפקוד נבחרי הציבור."
/>

<div class="mx-auto flex max-w-3xl flex-col gap-4 py-8">
    <header class="text-center">
        <h1 class="text-3xl font-black text-white md:text-4xl">📢 פרסמו אצלנו</h1>
        <p class="mt-2 text-gray-300">
            פרסום באתר <b class="text-white">דירוג ציבורי</b> — חשיפה לאזרחים שבאים לכאן
            לבדוק את מי שמשרת אותם
        </p>
    </header>

    <!-- הקהל -->
    <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 class="mb-3 text-lg font-black text-white">למי אתם מגיעים</h2>
        <ul class="flex flex-col gap-2">
            {#each audience as a (a.text)}
                <li class="flex items-start gap-2.5 text-sm text-gray-300">
                    <span aria-hidden="true" class="text-lg leading-none">{a.icon}</span>
                    <span>{a.text}</span>
                </li>
            {/each}
        </ul>
    </section>

    <!-- המקומות -->
    <section class="grid gap-3 sm:grid-cols-2">
        {#each placements as p (p.title)}
            <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div class="mb-1 text-3xl" aria-hidden="true">{p.icon}</div>
                <h2 class="text-lg font-black text-white">{p.title}</h2>
                <p class="mt-0.5 text-xs text-gray-500">{p.where}</p>
                <ul class="mt-3 flex flex-col gap-1.5">
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

    <!-- איך מפרסמים -->
    <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 class="mb-4 text-lg font-black text-white">איך מפרסמים?</h2>
        <ol class="flex flex-col gap-3">
            {#each steps as s (s.n)}
                <li class="flex items-start gap-3">
                    <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-sm font-black text-blue-300">
                        {s.n}
                    </span>
                    <span class="min-w-0">
                        <span class="block text-sm font-bold text-white">{s.title}</span>
                        <span class="block text-sm text-gray-400">{s.text}</span>
                    </span>
                </li>
            {/each}
        </ol>
    </section>

    <!-- יצירת קשר -->
    <section class="rounded-2xl border border-amber-400/25 bg-gradient-to-l from-amber-500/10 to-transparent p-6 text-center">
        <h2 class="text-xl font-black text-white">מעוניינים?</h2>
        <p class="mt-1 text-sm text-gray-300">כתבו לנו ונחזור אליכם עם זמינות ומחיר</p>
        <a href={mailto} class="btn-premium mt-4 inline-block rounded-xl px-6 py-3 text-sm font-bold text-white">
            ✉️ שליחת פנייה
        </a>
        <p class="mt-3 text-xs text-gray-500">
            או ישירות:
            <a href="mailto:{email}" class="text-blue-400 hover:text-blue-300">{email}</a>
        </p>
    </section>

    <p class="text-center text-xs leading-relaxed text-gray-600">
        הפרסום באתר אינו מהווה המלצה של האתר על המפרסם, ואינו משפיע בשום צורה על
        הדירוגים — הציונים נקבעים אך ורק על ידי הציבור המדרג.
    </p>

    <div class="text-center">
        <a href="/" class="text-sm text-blue-400 transition-colors hover:text-blue-300">← חזרה לדף הבית</a>
    </div>
</div>
