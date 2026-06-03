<svelte:head>
    <title>הצהרת נגישות | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen py-12 px-4">
    <div class="max-w-3xl mx-auto">

        <!-- כותרת -->
        <div class="mb-10">
            <h2 class="text-4xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
                הצהרת נגישות
            </h2>
            <p class="text-gray-400 text-sm">עדכון אחרון: מרץ 2026</p>
        </div>

        <!-- תיאור כללי -->
        <section class="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6" aria-labelledby="general-heading">
            <h3 id="general-heading" class="text-xl font-bold text-white mb-3">על הנגישות באתר</h3>
            <p class="text-gray-300 leading-relaxed mb-3">
                אתר "קהילה בשכונה" מחויב לנגישות דיגיטלית מלאה לכלל המשתמשים, לרבות אנשים עם מוגבלויות.
                האתר פועל לעמוד בדרישות תקן ישראלי 5568 (WCAG 2.1 ברמה AA).
            </p>
            <p class="text-gray-300 leading-relaxed">
                הנגישות כוללת התאמות לאנשים עם לקויות ראייה, שמיעה, קוגניציה ומוטוריקה.
            </p>
        </section>

        <!-- ההתאמות שבוצעו -->
        <section class="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6" aria-labelledby="adaptations-heading">
            <h3 id="adaptations-heading" class="text-xl font-bold text-white mb-4">התאמות שבוצעו</h3>
            <ul class="space-y-3 text-gray-300">
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>הגדרת שפת הדף כעברית (<code lang="en" class="text-blue-300">lang="he" dir="rtl"</code>) לתמיכה בקוראי מסך</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>קישור "דלג לתוכן הראשי" מופיע עם פוקוס מקלדת לניווט מהיר</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>כל הכפתורים, הקישורים והשדות כוללים תיאורי <code lang="en" class="text-blue-300">aria-label</code> ברורים</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>חלונות קופצים (מודלים) מיישמים מלכודת פוקוס ומחזירים פוקוס לרכיב הפותח עם הסגירה</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>הודעות דינמיות (שגיאות, הצלחות) מוכרזות אוטומטית לקוראי מסך באמצעות <code lang="en" class="text-blue-300">aria-live</code></span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>תפריטי שפה כוללים <code lang="en" class="text-blue-300">aria-haspopup</code> ו-<code lang="en" class="text-blue-300">aria-expanded</code> לציון מצב הפתיחה</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>אנימציות מושבתות אוטומטית כאשר המשתמש הגדיר העדפת תנועה מופחתת (<code lang="en" class="text-blue-300">prefers-reduced-motion</code>)</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>תמונות דקורטיביות כוללות <code lang="en" class="text-blue-300">alt=""</code> ותמונות תוכן כוללות תיאור מלא</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>מבנה כותרות היררכי (<code lang="en" class="text-blue-300">h1 → h2 → h3</code>) בכל עמוד</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>ניגודיות טקסט עומדת בדרישות WCAG AA (לפחות 4.5:1 לטקסט רגיל)</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>טיקר החדשות הנע מוסתר מקוראי מסך; התוכן זמין בגרסה נגישה מקבילה</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>כל קישורים חיצוניים מסומנים בבירור כ"נפתח בחלון חדש"</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>טפסים כוללים <code lang="en" class="text-blue-300">&lt;label&gt;</code> מקושר לכל שדה, סימון שדות חובה וטיפול בשגיאות</span>
                </li>
            </ul>
        </section>

        <!-- תקלות ידועות -->
        <section class="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6" aria-labelledby="issues-heading">
            <h3 id="issues-heading" class="text-xl font-bold text-white mb-3">מגבלות ידועות</h3>
            <ul class="space-y-2 text-gray-300">
                <li class="flex items-start gap-2">
                    <span class="text-yellow-400 flex-shrink-0" aria-hidden="true">⚠</span>
                    <span>מפת השכונות האינטראקטיבית מבוססת על Google Maps Embed - ייתכן שחלק מפונקציות המפה אינן נגישות במלואן לקוראי מסך. ניתן לגשת לרשימת הקטגוריות כחלופה מלאה.</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-yellow-400 flex-shrink-0" aria-hidden="true">⚠</span>
                    <span>חלק מהרכיבים המורכבים (כמו מסך בחירת שכונה) ממשיכים לשפור מיפוי ARIA. עבודה בתהליך.</span>
                </li>
            </ul>
        </section>

        <!-- פרטי קשר -->
        <section class="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6 mb-6" aria-labelledby="contact-heading">
            <h3 id="contact-heading" class="text-xl font-bold text-white mb-3">פנייה בנושא נגישות</h3>
            <p class="text-gray-300 mb-4">
                נתקלת בבעיית נגישות? נשמח לשמוע ולטפל בהקדם.
            </p>
            <div class="space-y-2 text-gray-300">
                <p>
                    <strong class="text-white">דוא"ל:</strong>
                    <a href="mailto:freedomhasbegun@gmail.com" class="text-blue-400 hover:text-blue-300 underline mr-2">
                        freedomhasbegun@gmail.com
                    </a>
                </p>
                <p class="text-sm text-gray-400">
                    נשתדל להשיב תוך 5 ימי עסקים.
                </p>
            </div>
        </section>

        <!-- חזרה לדף הבית -->
        <div class="text-center mt-8">
            <a
                href="/"
                class="inline-block bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-all"
                aria-label="חזרה לדף הבית"
            >
                ← חזרה לדף הבית
            </a>
        </div>

    </div>
</div>
