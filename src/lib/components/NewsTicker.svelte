<script lang="ts">
    let paused = $state(false);

    const newsItems = [
        {
            line1: "מערכת חדשה לניהול ועדי שכונות",
            line2: "הושקה השבוע בהצלחה רבה",
        },
        { line1: "קבוצת הרכישה למזון אורגני", line2: "חצתה את רף 200 המשפחות" },
        { line1: "מיזם 'בעלי מקצוע כשירים'", line2: "התרחב ל-5 ערים נוספות" },
        {
            line1: "השקעות קבוצתיות: נכס חדש",
            line2: "נרכש עבור חברי הקהילה בירושלים",
        },
        {
            line1: "מפגש תושבים בנושא מיצוי זכויות",
            line2: "יתקיים ביום שלישי הקרוב בזום",
        },
        {
            line1: "עדכון: הושלמה פריסת עמדות",
            line2: "הגידול הביתי בשכונות המרכז",
        },
    ];
</script>

<section
    aria-label="חדשות הקהילה"
    class="news-ticker-container border-b border-blue-900/30 bg-[#0f172a]/90 py-4 backdrop-blur-md"
>
    <!-- תוכן נגיש לקוראי מסך (מוסתר ויזואלית) -->
    <ul class="sr-only">
        {#each newsItems as item}
            <li>{item.line1} – {item.line2}</li>
        {/each}
    </ul>

    <!-- כפתור עצירה/הפעלה - נגיש למקלדת, מוסתר ויזואלית -->
    <button
        onclick={() => (paused = !paused)}
        class="sr-only focus:not-sr-only focus:fixed focus:top-16 focus:right-4 focus:z-50 focus:bg-blue-700 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm"
        aria-label={paused ? 'המשך הפעלת טיקר חדשות' : 'עצור טיקר חדשות'}
    >
        {paused ? '▶ המשך' : '⏸ עצור'}
    </button>

    <div class="mx-auto max-w-7xl flex items-center px-4" aria-hidden="true">
        <!-- Ticker Label -->
        <div
            class="z-10 bg-red-600 px-6 py-4 rounded-lg text-lg font-black text-white shadow-xl flex-shrink-0 ml-6 flex-col items-center justify-center border border-red-400 lg:flex hidden"
        >
            <span>חדשות</span>
            <span>הקהילה:</span>
        </div>

        <!-- Scrolling Content -->
        <div class="overflow-hidden flex-grow relative h-16">
            <div
                class="ticker-content flex gap-16 items-center absolute right-0 whitespace-nowrap h-full"
                class:paused
            >
                {#each [...newsItems, ...newsItems] as item}
                    <div class="flex items-center gap-16 h-full">
                        <div class="flex flex-col justify-center text-center">
                            <span class="text-xl font-bold text-blue-100"
                                >{item.line1}</span
                            >
                            <span class="text-xl font-medium text-blue-300"
                                >{item.line2}</span
                            >
                        </div>
                        <!-- Separator Line -->
                        <div
                            class="h-12 w-px bg-gradient-to-b from-transparent via-gray-600 to-transparent"
                        ></div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
</section>

<style>
    .ticker-content {
        right: 0;
        animation: ticker-move 85s linear infinite;
    }

    @keyframes ticker-move {
        from {
            transform: translateX(0);
        }
        to {
            transform: translateX(50%);
        }
    }

    /* עצירה בריחוף ובמצב paused */
    .news-ticker-container:hover .ticker-content,
    .ticker-content.paused {
        animation-play-state: paused;
    }

    /* כיבוי אנימציה למשתמשים עם העדפת תנועה מופחתת */
    @media (prefers-reduced-motion: reduce) {
        .ticker-content {
            animation: none;
            position: static;
            white-space: normal;
            flex-wrap: wrap;
        }
    }
</style>
