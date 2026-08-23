<script lang="ts">
	import { onMount } from 'svelte';

	type TabId = 'terms' | 'privacy' | 'accessibility';

	const tabs: { id: TabId; label: string; icon: string }[] = [
		{ id: 'terms',         label: 'תנאי שימוש',               icon: '📋' },
		{ id: 'privacy',       label: 'מדיניות פרטיות ו‑Cookies', icon: '🔒' },
		{ id: 'accessibility', label: 'הצהרת נגישות',             icon: '♿' },
	];

	let activeTab = $state<TabId>('terms');

	onMount(() => {
		const hash = window.location.hash.slice(1) as TabId;
		if (tabs.find(t => t.id === hash)) activeTab = hash;
	});

	function setTab(id: TabId) {
		activeTab = id;
		history.replaceState(null, '', '#' + id);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<svelte:head>
	<title>תנאי שימוש ומדיניות — דירוג ציבורי</title>
	<meta
		name="description"
		content="תנאי השימוש, מדיניות הפרטיות והצהרת הנגישות של פלטפורמת הדירוג הציבורי — כללי פרסום, אחריות על תוכן גולשים ונוהל דיווח והסרה."
	/>
</svelte:head>

<div class="min-h-screen py-10 px-4 page-bg" dir="rtl">
	<div class="max-w-4xl mx-auto">

		<!-- כותרת -->
		<div class="text-center mb-8">
			<h1 class="text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
				מסמכים משפטיים — דירוג ציבורי
			</h1>
			<p class="text-gray-400 text-base">תנאי שימוש, מדיניות פרטיות ו‑Cookies והצהרת נגישות</p>
		</div>

		<!-- טאבים -->
		<div class="sticky top-0 z-30 tabs-bar pt-2 pb-3 mb-8 border-b border-white/10">
			<div class="flex flex-wrap gap-2 justify-center">
				{#each tabs as tab (tab.id)}
					<button
						onclick={() => setTab(tab.id)}
						class="tab-btn {activeTab === tab.id ? 'tab-active' : 'tab-inactive'}"
					>
						<span>{tab.icon}</span>
						<span>{tab.label}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- ===== תנאי שימוש ===== -->
		{#if activeTab === 'terms'}
		<div class="doc-card">
			<div class="doc-header">
				<h2 class="doc-title">📋 תנאי שימוש</h2>
				<p class="doc-date">תאריך עדכון אחרון: 14/7/2026</p>
			</div>

			<!-- תקציר בולט -->
			<div class="highlight-box">
				<p class="font-bold text-amber-200">בתמצית — חמשת הכללים שחובה להכיר:</p>
				<ul class="bullet-list">
					<li>הדירוגים, הביקורות והתגובות באתר הם <strong>דעות אישיות של גולשים בלבד</strong> — לא קביעות עובדתיות ולא עמדת האתר.</li>
					<li><strong>חל איסור מוחלט להכפיש</strong>, לפרסם לשון הרע או לייחס לדמות מדורגת עובדות שאינן אמת.</li>
					<li>הביקורת מותרת אך ורק על <strong>התפקוד הציבורי</strong> — לא על חיים פרטיים, משפחה או בריאות.</li>
					<li><strong>האתר אינו נושא באחריות לתוכן שמפרסמים המשתמשים</strong> — האחריות המלאה והבלעדית היא על המפרסם.</li>
					<li>נתקלתם בתוכן פוגעני? דווחו לנו ונפעל להסרתו בהקדם (נוהל "הודעה והסרה", סעיף 6).</li>
				</ul>
			</div>

			<div class="toc">
				<p class="toc-title">תוכן עניינים</p>
				<ol class="toc-list">
					<li>פתיח והסכמה לתנאים</li>
					<li>מהות התוכן באתר — דעות גולשים</li>
					<li>כללי פרסום — המותר והאסור</li>
					<li>אחריות המשתמש ושיפוי</li>
					<li>הגבלת אחריות האתר</li>
					<li>דיווח על תוכן פוגעני — נוהל "הודעה והסרה"</li>
					<li>זכות התגובה של הדמויות המדורגות</li>
					<li>מודרציה, הסרת תוכן וחסימת משתמשים</li>
					<li>הרשמה וחשבונות משתמש</li>
					<li>רישיון שימוש בתוכן גולשים</li>
					<li>קניין רוחני</li>
					<li>פרטיות</li>
					<li>שינויים בתנאי השימוש</li>
					<li>הדין החל וסמכות שיפוט</li>
					<li>יצירת קשר</li>
				</ol>
			</div>

			<section class="sec">
				<h3 class="sec-title">1. פתיח והסכמה לתנאים</h3>
				<p>אתר "דירוג ציבורי" ("האתר") הוא פלטפורמה אזרחית שבה הציבור מדרג ומבקר את תפקודם הציבורי של נבחרי ציבור, שופטים ועובדי ציבור ("הדמויות המדורגות") לפי מדדים קבועים, ומפרסם חוות דעת ותגובות.</p>
				<p>הכניסה לאתר, הגלישה בו, יצירת חשבון, פרסום דירוג, ביקורת או תגובה — מהוות הסכמה מלאה ובלתי מסויגת לתנאי שימוש אלה ולמדיניות הפרטיות. מי שאינו מסכים לתנאים — מתבקש להימנע משימוש באתר.</p>
				<p>שימוש של קטינים מתחת לגיל 18 מחייב אישור הורה או אפוטרופוס.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">2. מהות התוכן באתר — דעות גולשים</h3>
				<p>כל דירוג, ציון, ביקורת, תגובה או תוכן אחר שמפרסמים משתמשי האתר ("תוכן גולשים") הם <strong>הבעת דעה אישית וסובייקטיבית של המשתמש שפרסם אותם בלבד</strong>.</p>
				<ul class="bullet-list">
					<li>הציונים והממוצעים המוצגים באתר הם שקלול חשבוני של דעות גולשים — אין בהם קביעה עובדתית, מדידה אובייקטיבית או חוות דעת מקצועית.</li>
					<li>תוכן הגולשים אינו משקף את עמדת האתר, מפעיליו או בעליו, והאתר אינו מאמת, בודק או מאשר אותו מראש.</li>
					<li>אין להסתמך על תוכן באתר כעל עובדה, ייעוץ מקצועי או בסיס לקבלת החלטות — כל הסתמכות היא על אחריות המסתמך בלבד.</li>
				</ul>
			</section>

			<section class="sec">
				<h3 class="sec-title">3. כללי פרסום — המותר והאסור</h3>

				<h4 class="sub-title">3.1 המותר</h4>
				<p>ביקורת עניינית, מנומקת והוגנת על <strong>התפקוד הציבורי</strong> של הדמות המדורגת: החלטות, הצבעות, התנהלות מול הציבור, זמינות, שקיפות, יושרה ציבורית ותוצאות בפועל. מותרת גם ביקורת חריפה — כל עוד היא הבעת דעה כנה על התפקוד הציבורי ואינה כוללת עובדות שקריות.</p>

				<h4 class="sub-title">3.2 האסור — איסור הכפשה ולשון הרע</h4>
				<p>חל איסור מוחלט לפרסם באתר:</p>
				<ul class="bullet-list">
					<li><strong>לשון הרע והכפשות</strong> — לרבות ייחוס מעשים, התבטאויות או תכונות לדמות מדורגת בניגוד לאמת, בניגוד לחוק איסור לשון הרע, התשכ"ה–1965.</li>
					<li>קביעות עובדתיות שהמפרסם אינו יודע שהן אמת — יש להבחין בין דעה ("לדעתי תפקד רע") לבין עובדה ("קיבל שוחד") שאסור לפרסם ללא ביסוס.</li>
					<li>עיסוק בחייה הפרטיים של דמות מדורגת — משפחה, ילדים, בריאות, נטייה, אמונה ואורח חיים — שאינם חלק מהתפקוד הציבורי.</li>
					<li>הסתה לאלימות, איומים, גזענות, ביזוי על רקע מוצא, דת, מגדר או מוגבלות.</li>
					<li>פרסום פרטים אישיים מזהים (כתובת, טלפון, מיקום) של כל אדם.</li>
					<li>התחזות לאדם אחר, לרבות לדמות מדורגת, וכן פרסום בשם אדם אחר ללא הרשאה.</li>
					<li>תוכן מיני, ספאם, פרסומת מסחרית, קישורים זדוניים או כל תוכן בלתי חוקי אחר.</li>
				</ul>
			</section>

			<section class="sec">
				<h3 class="sec-title">4. אחריות המשתמש ושיפוי</h3>
				<p><strong>האחריות המלאה, הישירה והבלעדית לכל תוכן גולשים חלה על המשתמש שפרסם אותו.</strong> המשתמש מצהיר כי ידוע לו שפרסום לשון הרע עלול לחשוף אותו באופן אישי לתביעה אזרחית ולהליך פלילי.</p>
				<p>המשתמש מתחייב <strong>לשפות ולפצות את האתר</strong>, מפעיליו, בעליו ומי מטעמם, מיד עם דרישה ראשונה, בגין כל נזק, הפסד, תשלום, הוצאה משפטית או דרישת צד שלישי — שמקורם בתוכן שפרסם המשתמש או בהפרת תנאים אלה על ידו.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">5. הגבלת אחריות האתר</h3>
				<p><strong>האתר אינו נושא באחריות כלשהי לתוכן הגולשים המתפרסם בו.</strong> האתר משמש פלטפורמה טכנולוגית בלבד להבעת דעות הציבור, אינו יוזם את תוכן הגולשים, אינו עורך אותו ואינו בודק אותו מראש.</p>
				<ul class="bullet-list">
					<li>האתר, מפעיליו, בעליו, עובדיו וספקיו לא יישאו באחריות לכל נזק — ישיר, עקיף, תוצאתי, כספי או אחר — הנובע מתוכן גולשים, מהסתמכות עליו או מהשימוש באתר.</li>
					<li>השירות ניתן כמות שהוא (AS IS) — ללא התחייבות לזמינות, לרציפות, לדיוק או להיעדר תקלות. האתר רשאי להשעות או להפסיק את פעילותו בכל עת.</li>
					<li>אין באמור כדי לגרוע מחובות שלא ניתן להתנות עליהן לפי דין; במקרה כזה תחול האחריות המצומצמת ביותר המותרת בחוק.</li>
					<li>עם קבלת הודעה כדין על תוכן פוגעני, יפעל האתר לבדיקתו ולהסרתו בהתאם לנוהל שבסעיף 6 — פעולה זו היא לפנים משורת הדין ואינה מקימה לאתר אחריות לתוכן.</li>
				</ul>
			</section>

			<section class="sec">
				<h3 class="sec-title">6. דיווח על תוכן פוגעני — נוהל "הודעה והסרה"</h3>
				<p>הרואים עצמם נפגעים מתוכן באתר — לרבות דמות מדורגת, בא כוחה או כל גולש — מוזמנים לפנות אלינו בכתובת המייל שבסעיף 15, בציון: קישור לתוכן, פירוט הפגיעה הנטענת ופרטי קשר.</p>
				<ul class="bullet-list">
					<li>האתר יבחן כל פנייה בתוך זמן סביר, ורשאי להסיר, לערוך או להגביל תוכן לפי שיקול דעתו הבלעדי — ללא צורך בהנמקה.</li>
					<li>הגשת דיווח אינה מבטיחה הסרה, והחלטת האתר אינה קביעה משפטית לגבי התוכן.</li>
					<li>האתר רשאי למסור פרטי מפרסם תוכן לרשויות מוסמכות או לפי צו שיפוטי.</li>
				</ul>
			</section>

			<section class="sec">
				<h3 class="sec-title">7. זכות התגובה של הדמויות המדורגות</h3>
				<p>האתר מקדם שיח הוגן: כל דמות מדורגת זכאית להשיב על ביקורות ותגובות שפורסמו בדף שלה.</p>
				<ul class="bullet-list">
					<li>דמות מדורגת (או נציג מוסמך מטעמה) המעוניינת בכך תפנה אלינו לאימות זהות, וחשבונה יקושר לדף שלה.</li>
					<li>תגובות החשבון המאומת מסומנות בדף כ"תגובה רשמית" — כך הציבור יודע שזו תשובת הדמות עצמה.</li>
					<li>גם על תגובה רשמית חלים כל כללי הפרסום שבסעיף 3.</li>
				</ul>
			</section>

			<section class="sec">
				<h3 class="sec-title">8. מודרציה, הסרת תוכן וחסימת משתמשים</h3>
				<p>האתר רשאי, בכל עת ולפי שיקול דעתו הבלעדי, להסיר או לערוך תוכן גולשים, להשעות או לחסום חשבונות, להגביל גישה לשירותים ולמנוע פרסום — ללא הודעה מוקדמת וללא חובת הנמקה, לרבות במקרה של הפרת תנאים אלה או חשש להפרת דין.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">9. הרשמה וחשבונות משתמש</h3>
				<ul class="bullet-list">
					<li>פרסום דירוגים ותגובות מותר למשתמשים רשומים ומחוברים בלבד — כך נשמרת אמינות הדירוג.</li>
					<li>המשתמש מתחייב למסור פרטים נכונים בהרשמה, לשמור על סודיות פרטי הגישה, ולא להעביר את חשבונו לאחר. כל פעולה בחשבון תיחשב כפעולת בעליו.</li>
					<li>דירוג אחד לכל משתמש לכל דמות מדורגת; ניתן לעדכנו בכל עת. אסורה יצירת חשבונות מרובים להטיית הדירוג.</li>
					<li>ניתן לפרסם דירוג בעילום שם כלפי הציבור — אך זהות המפרסם שמורה במערכת וניתנת למסירה לפי דין.</li>
				</ul>
			</section>

			<section class="sec">
				<h3 class="sec-title">10. רישיון שימוש בתוכן גולשים</h3>
				<p>בפרסום תוכן באתר מעניק המשתמש לאתר רישיון בלתי‑בלעדי, עולמי, ללא תמלוגים ובלתי מוגבל בזמן — להציג, לשכפל, לעבד, לקצר ולהפיץ את התוכן במסגרת האתר ושירותיו. זכויות היוצרים בתוכן נותרות של המשתמש.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">11. קניין רוחני</h3>
				<p>כל הזכויות באתר — בעיצוב, בקוד, בממשק, בלוגו, במדדים ובמבנה הנתונים — שייכות למפעילי האתר. תמונות הדמויות המדורגות מוצגות ממקורות ציבוריים (למשל ויקיפדיה) בהתאם לרישיונות החלים עליהן. אין להעתיק, לשכפל או לכרות נתונים (Data Mining) מהאתר ללא אישור מראש ובכתב.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">12. פרטיות</h3>
				<p>איסוף המידע והשימוש בו מפורטים במדיניות הפרטיות, המהווה חלק בלתי נפרד מתנאים אלה.
					<button onclick={() => setTab('privacy')} class="inline-link">← למדיניות הפרטיות</button>
				</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">13. שינויים בתנאי השימוש</h3>
				<p>האתר רשאי לעדכן תנאים אלה מעת לעת. שינוי מהותי יפורסם באתר ותאריך "עודכן לאחרונה" יעודכן. המשך שימוש לאחר השינוי מהווה הסכמה לתנאים המעודכנים.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">14. הדין החל וסמכות שיפוט</h3>
				<p>על תנאים אלה ועל השימוש באתר יחולו דיני מדינת ישראל בלבד. סמכות השיפוט הבלעדית בכל מחלוקת נתונה לבתי המשפט המוסמכים במחוז ירושלים.</p>
			</section>

			<section class="sec contact-sec">
				<h3 class="sec-title">15. יצירת קשר ודיווחים</h3>
				<p>לשאלות, דיווח על תוכן פוגעני (סעיף 6) או בקשת אימות דמות מדורגת (סעיף 7):</p>
				<div class="contact-grid">
					<a href="mailto:freedomhasbegun@gmail.com" class="contact-item">
						<span class="contact-icon">✉️</span>
						<span>freedomhasbegun@gmail.com</span>
					</a>
					<a href="tel:0508750632" class="contact-item">
						<span class="contact-icon">📞</span>
						<span dir="ltr">050‑8750632</span>
					</a>
				</div>
			</section>
		</div>
		{/if}

		<!-- ===== מדיניות פרטיות ו-Cookies ===== -->
		{#if activeTab === 'privacy'}
		<div class="doc-card">
			<div class="doc-header">
				<h2 class="doc-title">🔒 מדיניות פרטיות ו‑Cookies</h2>
				<p class="doc-date">תאריך עדכון אחרון: 14/7/2026</p>
			</div>

			<section class="sec">
				<h3 class="sec-title">1. פתיח</h3>
				<p>מדיניות זו מסבירה איזה מידע אוסף אתר "דירוג ציבורי", למה הוא משמש וכיצד הוא נשמר. האתר פועל בהתאם לחוק הגנת הפרטיות, התשמ"א–1981 ותקנותיו. השימוש באתר מהווה הסכמה למדיניות זו.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">2. המידע שנאסף</h3>
				<h4 class="sub-title">2.1 מידע שנמסר ישירות</h4>
				<ul class="bullet-list">
					<li>בהרשמה והתחברות (Google / Facebook / חשבון "יוצאים לחירות"): שם, כתובת דוא״ל ותמונת פרופיל.</li>
					<li>תוכן שהמשתמש מפרסם: דירוגים, ציונים, ביקורות ותגובות — לרבות דירוגים שפורסמו בעילום שם, שזהות מפרסמם נשמרת במערכת.</li>
					<li>פניות שנשלחות אלינו.</li>
				</ul>
				<h4 class="sub-title">2.2 מידע שנאסף אוטומטית</h4>
				<ul class="bullet-list">
					<li>נתוני שימוש טכניים: כתובת IP, סוג דפדפן ומערכת הפעלה, עמודים שנצפו.</li>
					<li>Cookies חיוניים לניהול החיבור (session) והעדפות.</li>
				</ul>
			</section>

			<section class="sec">
				<h3 class="sec-title">3. מטרות השימוש במידע</h3>
				<ul class="bullet-list">
					<li>הפעלת האתר: זיהוי משתמשים, אכיפת "דירוג אחד למשתמש", הצגת תוכן.</li>
					<li>שמירת אמינות הדירוג ומניעת שימוש לרעה (חשבונות כפולים, ספאם).</li>
					<li>טיפול בדיווחים על תוכן פוגעני ובבקשות אימות של דמויות מדורגות.</li>
					<li>עמידה בדרישות דין, לרבות מסירת פרטי מפרסם לפי צו שיפוטי.</li>
					<li>ניתוח סטטיסטי אנונימי לשיפור השירות.</li>
				</ul>
			</section>

			<section class="sec">
				<h3 class="sec-title">4. שיתוף מידע עם צדדים שלישיים</h3>
				<p>האתר אינו סוחר במידע אישי. מידע מועבר רק ל: ספקי תשתית ואחסון הדרושים להפעלת האתר; שירותי התחברות (Google/Facebook) במסגרת תהליך ההזדהות שבחר המשתמש; ורשויות מוסמכות — לפי דרישה חוקית או צו שיפוטי.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">5. Cookies</h3>
				<p>האתר משתמש ב‑Cookies חיוניים לניהול חיבור מאובטח ולשמירת העדפות. ניתן לחסום או למחוק Cookies בהגדרות הדפדפן — אך ללא Cookies חיוניים לא ניתן להתחבר ולפרסם דירוגים.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">6. אבטחה ושמירת מידע</h3>
				<p>האתר נוקט אמצעי אבטחה מקובלים — הצפנת תעבורה, בקרות גישה ואימות מול שרת מרכזי. עם זאת, אין באפשרותנו להבטיח חסינות מוחלטת מפני פריצות. המידע נשמר כל עוד הוא דרוש לתפעול האתר או לפי דרישות הדין.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">7. זכויות המשתמש</h3>
				<p>בהתאם לחוק הגנת הפרטיות, כל משתמש זכאי לעיין במידע שנשמר עליו, לבקש תיקון מידע שגוי, לבקש מחיקת חשבונו ולבטל הסכמה לשימושים שאינם חיוניים. פנייה — בפרטי הקשר שבתחתית העמוד. מחיקת חשבון אינה מחייבת מחיקת תוכן שפורסם בפומבי, אלא אם נדרש לפי דין.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">8. שינויים במדיניות</h3>
				<p>האתר רשאי לעדכן מדיניות זו; שינוי מהותי יפורסם באתר. המשך שימוש מהווה הסכמה למדיניות המעודכנת.</p>
			</section>

			<section class="sec contact-sec">
				<h3 class="sec-title">9. יצירת קשר</h3>
				<div class="contact-grid">
					<a href="mailto:freedomhasbegun@gmail.com" class="contact-item">
						<span class="contact-icon">✉️</span>
						<span>freedomhasbegun@gmail.com</span>
					</a>
					<a href="tel:0508750632" class="contact-item">
						<span class="contact-icon">📞</span>
						<span dir="ltr">050‑8750632</span>
					</a>
				</div>
			</section>
		</div>
		{/if}

		<!-- ===== הצהרת נגישות ===== -->
		{#if activeTab === 'accessibility'}
		<div class="doc-card">
			<div class="doc-header">
				<h2 class="doc-title">♿ הצהרת נגישות</h2>
				<p class="text-gray-400 text-sm mt-1">עדכון אחרון: יולי 2026</p>
			</div>

			<section class="sec">
				<h3 class="sec-title">מטרה והתחייבות</h3>
				<p>אתר "דירוג ציבורי" מחויב לנגישות דיגיטלית לכלל המשתמשים, לרבות אנשים עם מוגבלויות, ופועל לעמוד בדרישות תקן ישראלי 5568 (WCAG 2.1 ברמה AA).</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">התאמות עיקריות</h3>
				<ul class="bullet-list">
					<li>הגדרת שפת הדף כעברית (<code lang="en" class="text-blue-300">lang="he" dir="rtl"</code>) לתמיכה בקוראי מסך</li>
					<li>ניווט מלא במקלדת, כולל טפסי הדירוג והתגובות</li>
					<li>תוויות <code lang="en" class="text-blue-300">aria-label</code> לרכיבים אינטראקטיביים ומבנה כותרות היררכי</li>
					<li>ניגודיות טקסט העומדת בדרישות WCAG AA</li>
					<li>תמונות כוללות טקסט חלופי; אווטארים דקורטיביים מוסתרים מקוראי מסך</li>
					<li>אנימציות מכבדות את העדפת <code lang="en" class="text-blue-300">prefers-reduced-motion</code></li>
				</ul>
			</section>

			<section class="sec">
				<h3 class="sec-title">מגבלות ידועות</h3>
				<p>ייתכנו רכיבים או תכנים שטרם הונגשו במלואם; אנו פועלים לשיפור מתמיד. נתקלתם בקושי? נשמח לדעת ולתקן.</p>
			</section>

			<section class="sec contact-sec">
				<h3 class="sec-title">פניות נגישות</h3>
				<div class="contact-grid">
					<a href="mailto:freedomhasbegun@gmail.com" class="contact-item">
						<span class="contact-icon">✉️</span>
						<span>freedomhasbegun@gmail.com</span>
					</a>
					<a href="tel:0508750632" class="contact-item">
						<span class="contact-icon">📞</span>
						<span dir="ltr">050‑8750632</span>
					</a>
				</div>
			</section>
		</div>
		{/if}

		<!-- חזרה לדף הבית + עלה לראש -->
		<div class="flex items-center justify-center gap-3 mt-10 flex-wrap">
			<a href="/" class="inline-block bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-all">
				← חזרה לדף הבית
			</a>
			<button
				onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
				class="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-lg hover:shadow-purple-500/30"
			>
				↑ עלה לראש הדף
			</button>
		</div>
	</div>
</div>

<style>
	.page-bg {
		background: linear-gradient(135deg, #0d0b2e 0%, #0f172a 35%, #1a0a3d 65%, #0c1a3a 100%);
	}

	.tabs-bar {
		background: rgba(10, 8, 40, 0.92);
		backdrop-filter: blur(10px);
	}

	.tab-btn {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.55rem 1.1rem;
		border-radius: 9999px;
		font-weight: 800;
		font-size: 0.88rem;
		transition: all 0.2s;
		border: 2px solid transparent;
		cursor: pointer;
	}
	.tab-active {
		background: linear-gradient(135deg, #2563eb, #7c3aed);
		color: #fff;
		border-color: #a78bfa;
		box-shadow: 0 0 18px rgba(124,58,237,0.55), 0 0 6px rgba(37,99,235,0.4);
	}
	.tab-inactive {
		background: rgba(255,255,255,0.08);
		color: #c4b5fd;
		border-color: rgba(167,139,250,0.25);
	}
	.tab-inactive:hover {
		background: rgba(124,58,237,0.2);
		color: #e9d5ff;
		border-color: rgba(167,139,250,0.5);
	}

	.doc-card {
		background: linear-gradient(135deg, rgba(13,11,46,0.97), rgba(30,20,80,0.85));
		border: 1px solid rgba(139,92,246,0.35);
		border-radius: 1.25rem;
		padding: 2rem;
		backdrop-filter: blur(8px);
	}
	@media (max-width: 640px) {
		.doc-card { padding: 1.25rem; }
	}

	.doc-header {
		border-bottom: 1px solid rgba(255,255,255,0.1);
		padding-bottom: 1.25rem;
		margin-bottom: 1.75rem;
	}
	.doc-title {
		font-size: 1.85rem;
		font-weight: 900;
		background: linear-gradient(to left, #60a5fa, #a78bfa, #f472b6);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin-bottom: 0.4rem;
	}
	.doc-date {
		color: #94a3b8;
		font-size: 0.95rem;
	}

	.highlight-box {
		background: rgba(245, 158, 11, 0.08);
		border: 1px solid rgba(245, 158, 11, 0.35);
		border-radius: 0.75rem;
		padding: 1rem 1.25rem;
		margin-bottom: 1.75rem;
	}
	.highlight-box p { margin-bottom: 0.5rem; }

	.toc {
		background: rgba(59,130,246,0.08);
		border: 1px solid rgba(59,130,246,0.2);
		border-radius: 0.75rem;
		padding: 1rem 1.25rem;
		margin-bottom: 1.75rem;
	}
	.toc-title {
		font-weight: 800;
		color: #93c5fd;
		margin-bottom: 0.6rem;
		font-size: 1rem;
	}
	.toc-list {
		list-style: decimal;
		padding-right: 1.2rem;
		color: #cbd5e1;
		font-size: 0.95rem;
		line-height: 1.8;
	}

	.sec {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid rgba(255,255,255,0.06);
	}
	.sec:last-child {
		border-bottom: none;
		margin-bottom: 0;
	}

	.sec-title {
		font-size: 1.2rem;
		font-weight: 800;
		color: #e2e8f0;
		margin-bottom: 0.75rem;
		padding-right: 0.75rem;
		border-right: 3px solid #8b5cf6;
	}

	.sub-title {
		font-size: 1.05rem;
		font-weight: 700;
		color: #a78bfa;
		margin: 0.9rem 0 0.45rem;
	}

	.sec p {
		color: #cbd5e1;
		font-size: 1rem;
		line-height: 1.9;
		margin-bottom: 0.5rem;
	}

	.bullet-list {
		list-style: none;
		padding: 0;
		margin: 0.5rem 0;
	}
	.bullet-list li {
		color: #cbd5e1;
		font-size: 1rem;
		line-height: 1.85;
		padding-right: 1.1rem;
		position: relative;
	}
	.bullet-list li::before {
		content: '•';
		position: absolute;
		right: 0;
		color: #8b5cf6;
		font-weight: 900;
	}

	.contact-sec { background: rgba(139,92,246,0.06); border-radius: 0.75rem; padding: 1.25rem; }

	.contact-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}
	.contact-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(255,255,255,0.06);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 0.6rem;
		padding: 0.6rem 1rem;
		color: #e2e8f0;
		font-size: 1rem;
		font-weight: 600;
		text-decoration: none;
		transition: background 0.2s;
	}
	.contact-item:hover { background: rgba(139,92,246,0.2); }
	.contact-icon { font-size: 1.1rem; }

	.inline-link {
		background: none;
		border: none;
		color: #818cf8;
		cursor: pointer;
		font-size: 0.95rem;
		padding: 0;
		text-decoration: underline;
		margin-right: 0.25rem;
	}
	.inline-link:hover { color: #a5b4fc; }
</style>
