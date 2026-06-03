<script lang="ts">
	import { onMount } from 'svelte';

	type TabId = 'terms' | 'privacy' | 'regulations' | 'accessibility';

	const tabs: { id: TabId; label: string; icon: string }[] = [
		{ id: 'terms',         label: 'תנאי שימוש',                   icon: '📋' },
		{ id: 'privacy',       label: 'מדיניות פרטיות ו‑Cookies',     icon: '🔒' },
		{ id: 'regulations',   label: 'תקנון האתר',                   icon: '📜' },
		{ id: 'accessibility', label: 'הצהרת נגישות',                 icon: '♿' },
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
	<title>תנאי שימוש ומדיניות – קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen py-10 px-4 page-bg" dir="rtl">
	<div class="max-w-4xl mx-auto">

		<!-- כותרת -->
		<div class="text-center mb-8">
			<h1 class="text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
				מסמכים משפטיים
			</h1>
			<p class="text-gray-400 text-base">תנאי שימוש, מדיניות פרטיות ו‑Cookies, תקנון האתר והצהרת נגישות</p>
		</div>

		<!-- טאבים -->
		<div class="sticky top-0 z-30 tabs-bar pt-2 pb-3 mb-8 border-b border-white/10">
			<div class="flex flex-wrap gap-2 justify-center">
				{#each tabs as tab}
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
				<p class="doc-date">תאריך עדכון אחרון: 29/3/2026</p>
			</div>

			<div class="toc">
				<p class="toc-title">תוכן עניינים</p>
				<ol class="toc-list">
					<li>פתיח</li>
					<li>תוכן גולשים</li>
					<li>הרשמה וחשבונות משתמש</li>
					<li>שימוש מותר ואסור</li>
					<li>איסוף מידע ושיתוף עם צדדים שלישיים</li>
					<li>קניין רוחני</li>
					<li>הגבלת אחריות</li>
					<li>מחיקת חשבון וזכויות משתמש</li>
					<li>שינויים בתנאי השימוש</li>
					<li>הדין החל וסמכות שיפוט</li>
					<li>יצירת קשר</li>
				</ol>
			</div>

			<section class="sec">
				<h3 class="sec-title">1. פתיח</h3>
				<p>השימוש באתר, בתכניו ובשירותיו כפוף לתנאי שימוש אלה ("תנאי השימוש") ולמדיניות הפרטיות של האתר.</p>
				<p>הכניסה לאתר, השימוש בו, יצירת חשבון, פרסום תוכן או מסירת מידע אישי מהווים את הסכמתך המלאה לתנאים אלה. האתר מיועד לשימוש על ידי כלל הציבור, לרבות משפחות וקטינים.</p>
				<p>שימוש של קטינים מתחת לגיל 18 מחייב את אישור הוריהם או האפוטרופוס החוקי שלהם.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">2. תוכן גולשים</h3>
				<p>האתר מאפשר למשתמשים לפרסם תכנים שונים, לרבות טקסט, תמונות, מיקום גאוגרפי, פרטי קשר, קישורים, מידע על אירועים, מודעות, שירותים, הצעות ותגובות ("תוכן גולשים").</p>

				<h4 class="sub-title">2.1 אחריות על תוכן גולשים</h4>
				<p>כל תוכן גולשים מפורסם על אחריותו הבלעדית של המשתמש שיצר או העלה אותו. האתר, מפעיליו, מנהליו ובעליו אינם אחראים לכל נזק, הפסד, טעות, הטעיה, פגיעה בפרטיות, לשון הרע, הפרת זכויות יוצרים או כל פגיעה אחרת הנובעת מתוכן גולשים.</p>

				<h4 class="sub-title">2.2 רישיון שימוש שהמשתמש מעניק לאתר</h4>
				<p>בפרסום תוכן גולשים, המשתמש מעניק לאתר רישיון בלתי‑בלעדי, עולמי, ללא תמלוגים, בלתי מוגבל בזמן, להציג, לשכפל, להפיץ, להתאים, לערוך, לתרגם, לשלב, לפרסם ולהשתמש בתוכן בכל דרך הדרושה לצורך תפעול האתר ושיפורו.</p>

				<h4 class="sub-title">2.3 איסור פרסום תכנים אסורים</h4>
				<p>המשתמש מתחייב שלא לפרסם תכנים הכוללים:</p>
				<ul class="bullet-list">
					<li>מידע שקרי או מטעה</li>
					<li>לשון הרע</li>
					<li>פגיעה בפרטיות</li>
					<li>תמונות של קטינים ללא אישור הורה</li>
					<li>תוכן פוגעני, מאיים, גזעני או בלתי חוקי</li>
					<li>פרטים אישיים של אדם אחר ללא הסכמתו</li>
					<li>פרסום מסחרי ללא אישור האתר</li>
					<li>תכנים בעל אופי מיני או תכנים למבוגרים בלבד</li>
				</ul>

				<h4 class="sub-title">2.4 זכות האתר להסיר תוכן</h4>
				<p>האתר רשאי, לפי שיקול דעתו הבלעדי, להסיר כל תוכן גולשים, לחסום משתמשים, למחוק מידע או להגביל גישה - ללא צורך בהודעה מוקדמת וללא חובת נימוק.</p>

				<h4 class="sub-title">2.5 אחריות המשתמש</h4>
				<p>המשתמש מצהיר כי הוא בעל הזכויות בתוכן שפרסם, התוכן אינו מפר זכויות יוצרים, התוכן אינו מפר חוק כלשהו, והתוכן אינו פוגע בצד שלישי.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">3. הרשמה, חשבונות משתמש ואימות זהות</h3>

				<h4 class="sub-title">3.1 יצירת חשבון</h4>
				<p>כדי להשתמש בחלק מהשירותים באתר, ייתכן שהמשתמש יידרש ליצור חשבון משתמש ולמסור פרטים כגון שם מלא, ת"ז, תאריך לידה, מספר טלפון, כתובת דוא״ל, כתובת מגורים, מיקום גאוגרפי, תמונת פרופיל ופרטים נוספים לפי הצורך.</p>
				<p>המשתמש מצהיר כי כל הפרטים שמסר בעת ההרשמה הם נכונים, מדויקים, מלאים ועדכניים.</p>

				<h4 class="sub-title">3.2 אבטחת חשבון</h4>
				<p>המשתמש אחראי לשמור על סודיות פרטי הגישה לחשבונו, לרבות סיסמה, קוד אימות או כל אמצעי זיהוי אחר. כל פעולה שתתבצע באמצעות חשבון המשתמש תיחשב כפעולה של המשתמש עצמו.</p>

				<h4 class="sub-title">3.3 אימות זהות</h4>
				<p>האתר רשאי לדרוש אימות זהות באמצעים שונים, לרבות אימות מספר טלפון, אימות דוא״ל, אימות דו‑שלבי, ואימות באמצעות צד שלישי (Google, Facebook וכו׳). האתר רשאי לחסום או להגביל חשבון שלא עבר אימות כנדרש.</p>

				<h4 class="sub-title">3.4 אחריות המשתמש לחשבונו</h4>
				<p>המשתמש מתחייב שלא להעביר את חשבונו לאחר, לא לאפשר שימוש לא מורשה, ולדווח לאתר על כל שימוש חריג או חשוד.</p>

				<h4 class="sub-title">3.5 סגירת חשבון</h4>
				<p>האתר רשאי, לפי שיקול דעתו הבלעדי, לסגור או להשעות חשבון משתמש במקרה של הפרת תנאי השימוש, פרסום תוכן אסור, שימוש לרעה בשירותים, חשד לפעילות בלתי חוקית, או בקשת המשתמש לסגור את החשבון. סגירת חשבון אינה מחייבת את האתר למחוק תוכן שפורסם על ידי המשתמש, אלא אם הדבר נדרש לפי חוק.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">4. שימוש מותר ואסור באתר</h3>

				<h4 class="sub-title">4.1 שימוש מותר</h4>
				<p>המשתמש רשאי להשתמש באתר ובשירותיו לצרכים הבאים בלבד: פרסום מודעות, שירותים, אירועים ותוכן קהילתי; יצירת קשר עם משתמשים אחרים לצורך פעילות קהילתית; שימוש במידע המופיע באתר לצרכים אישיים ולא‑מסחריים; השתתפות בפעילויות, חוגים ויוזמות קהילתיות. כל שימוש אחר מחייב אישור מפורש בכתב ממפעילי האתר.</p>

				<h4 class="sub-title">4.2 שימוש אסור</h4>
				<p>המשתמש מתחייב שלא לבצע באתר: הפרת חוקי מדינת ישראל, הונאה, התחזות או מסירת מידע כוזב, פגיעה בפרטיות, פרסום מסחרי ללא אישור, שליחת ספאם, חדירה למערכות האתר, שימוש ברובוטים או כלים אוטומטיים, פרסום תכנים פוגעניים, גזעניים, אלימים או פורנוגרפיים.</p>

				<h4 class="sub-title">4.3 שימוש על ידי קטינים</h4>
				<p>קטינים רשאים להשתמש באתר רק באישור הורה. הורה המאשר שימוש נושא באחריות מלאה לפעילות הקטין. חל איסור מוחלט על פרסום מידע מזהה על קטינים ללא אישור מפורש.</p>

				<h4 class="sub-title">4.4 סנקציות על שימוש אסור</h4>
				<p>האתר רשאי לחסום משתמש, להסיר תוכן, להגביל גישה לשירותים, למסור מידע לרשויות במקרה של חשד לעבירה, ולנקוט בצעדים משפטיים.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">5. איסוף מידע, שימוש במידע ושיתוף עם צדדים שלישיים</h3>
				<p>האתר אוסף מידע אישי, טכני, סטטיסטי והתנהגותי על משתמשיו, בהתאם למדיניות הפרטיות. השימוש באתר מהווה הסכמה לאיסוף, עיבוד ושימוש במידע בהתאם לתנאים אלה.</p>

				<h4 class="sub-title">5.1 סוגי מידע שנאסף</h4>
				<p>האתר עשוי לאסוף: שם מלא, מספר טלפון, כתובת דוא״ל, כתובת מגורים, ת"ז, מצב משפחתי, תמונות, מיקום גאוגרפי, פרטי קשר, תוכן גולשים, כתובת IP, מזהי מכשיר, נתוני דפדפן, קוקיז ונתוני שימוש.</p>

				<h4 class="sub-title">5.2 מטרות השימוש במידע</h4>
				<p>האתר משתמש במידע לצורך תפעול האתר ושיפור השירות, התאמת חוויית המשתמש, הצגת תוכן מותאם אישית, אבטחת מידע ומניעת הונאות, ניתוח סטטיסטי ואנליטי, שליחת עדכונים והתראות, ועמידה בדרישות חוק.</p>

				<h4 class="sub-title">5.3 שיתוף מידע עם צדדים שלישיים</h4>
				<p>האתר רשאי לשתף מידע עם ספקי שירות לצורך אחסון, אבטחה, שליחת הודעות ואנליטיקה; עם שותפים עסקיים לצורך פרסום וקידום; ועם רשויות אכיפה במקרים של צו בית משפט או חשד לעבירה.</p>

				<h4 class="sub-title">5.4 מסחר במידע</h4>
				<p>האתר לא ימכור מידע מזהה על קטינים. האתר רשאי לעשות שימוש מסחרי במידע אישי של משתמשים בגירים, בכפוף להסכמתם ולחוק.</p>

				<h4 class="sub-title">5.5 שמירת מידע ואבטחת מידע</h4>
				<p>האתר נוקט באמצעי אבטחה סבירים ומקובלים, לרבות הצפנה, גיבויים, בקרות גישה וניטור פעילות. עם זאת, האתר אינו יכול להבטיח אבטחה מוחלטת.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">6. קניין רוחני</h3>

				<h4 class="sub-title">6.1 בעלות על תכני האתר</h4>
				<p>כל זכויות היוצרים, סימני המסחר, העיצובים, הטקסטים, התמונות, הקוד, בסיסי הנתונים, הלוגו, הממשק, התוכן המקורי וכל חומר אחר המופיע באתר - הם רכושו הבלעדי של מפעיל האתר, אלא אם צוין אחרת במפורש. אין להעתיק, לשכפל, להפיץ, לפרסם, לשדר, לתרגם, לעבד, ליצור יצירות נגזרות או לעשות כל שימוש אחר בתכני האתר - ללא אישור מראש ובכתב.</p>

				<h4 class="sub-title">6.2 זכויות יוצרים בתוכן גולשים</h4>
				<p>תוכן גולשים שייך למשתמש שיצר אותו. עם זאת, כפי שנכתב בסעיף 2.2, המשתמש מעניק לאתר רישיון שימוש רחב לצורך תפעול האתר ושיפורו.</p>

				<h4 class="sub-title">6.3 שימוש אסור בתוכן האתר</h4>
				<p>המשתמש מתחייב שלא להעתיק תכני האתר לצורך יצירת אתר מתחרה, לא לעשות שימוש מסחרי ללא רשות, ולא לבצע כריית מידע (Data Mining) ללא אישור.</p>

				<h4 class="sub-title">6.4 דיווח על הפרת זכויות יוצרים</h4>
				<p>אם סבורים כי תוכן באתר מפר זכויות יוצרים - ניתן לפנות למפעילי האתר, והאתר רשאי להסיר את התוכן לפי שיקול דעתו.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">7. הגבלת אחריות</h3>

				<h4 class="sub-title">7.1 אחריות כללית</h4>
				<p>השימוש באתר ובשירותיו נעשה על אחריות המשתמש בלבד. האתר, מפעיליו, בעליו, מנהליו, עובדיו וספקיו אינם אחראים לכל נזק ישיר, עקיף, תוצאתי, כספי, פיזי, רגשי או אחר - הנובע מהשימוש באתר או מהסתמכות על תוכן המופיע בו.</p>

				<h4 class="sub-title">7.2 אחריות על תוכן גולשים</h4>
				<p>האתר אינו אחראי לתוכן שמפורסם על ידי משתמשים. כל הסתמכות על תוכן גולשים היא באחריות המשתמש בלבד.</p>

				<h4 class="sub-title">7.3 זמינות האתר</h4>
				<p>האתר אינו מתחייב שהשירותים יהיו זמינים בכל עת, ללא תקלות, ללא הפרעות וללא שגיאות. האתר רשאי להפסיק את פעילותו באופן זמני או קבוע ללא הודעה מוקדמת.</p>

				<h4 class="sub-title">7.4 אבטחת מידע</h4>
				<p>האתר נוקט באמצעי אבטחה סבירים, אך אינו יכול להבטיח הגנה מוחלטת מפני פריצות, גניבת מידע, תקיפות סייבר וכשלים טכנולוגיים.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">8. מחיקת חשבון, שמירת מידע וזכויות משתמש</h3>

				<h4 class="sub-title">8.1 בקשת מחיקת חשבון</h4>
				<p>המשתמש רשאי לבקש את מחיקת חשבונו בכל עת. האתר יפעל למחיקת החשבון בתוך זמן סביר, בהתאם לדרישות החוק. מחיקת חשבון אינה מחייבת את האתר למחוק תוכן גולשים שפורסם בפומבי, מידע שנדרש לשמירה לפי חוק, או מידע אנונימי וסטטיסטי.</p>

				<h4 class="sub-title">8.2 זכויות משתמש לפי חוק הגנת הפרטיות</h4>
				<p>בהתאם לחוק הגנת הפרטיות, התשמ"א–1981, המשתמש זכאי לעיין במידע שנשמר עליו, לבקש תיקון מידע שגוי, לבקש מחיקת מידע אישי, לבקש הגבלת שימוש ולבטל הסכמה לשימוש במידע.</p>

				<h4 class="sub-title">8.3 מידע על קטינים</h4>
				<p>הורה רשאי לבקש מחיקה מלאה של מידע על ילדו. האתר אינו רשאי למכור מידע מזהה על קטינים, ורשאי לשמור מידע אנונימי בלבד לצרכים סטטיסטיים.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">9. שינויים בתנאי השימוש</h3>
				<p>האתר רשאי לעדכן, לשנות או להחליף את תנאי השימוש בכל עת. שינויים מהותיים יתפרסמו באתר ויכולים לכלול הודעה בעמוד הבית, הודעה למשתמשים רשומים ועדכון תאריך "עודכן לאחרונה". המשך השימוש באתר לאחר פרסום השינויים מהווה הסכמה מלאה לתנאים המעודכנים.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">10. הדין החל וסמכות שיפוט</h3>
				<p>על תנאי שימוש אלה יחולו אך ורק דיני מדינת ישראל. בכל מחלוקת, תביעה או הליך משפטי - הסמכות הבלעדית תינתן לבתי המשפט המוסמכים במחוז ירושלים. לא יחולו על האתר דינים זרים, אמנות בינלאומיות או כללי משפט שאינם חלק מהדין הישראלי.</p>
			</section>

			<section class="sec contact-sec">
				<h3 class="sec-title">11. יצירת קשר</h3>
				<p>לכל שאלה, פנייה, בקשה או דיווח - ניתן ליצור קשר עם מפעילי האתר:</p>
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
				<p class="doc-date">תאריך עדכון אחרון: 29/3/2026</p>
			</div>

			<section class="sec">
				<h3 class="sec-title">1. פתיח</h3>
				<p>מדיניות זו מסבירה כיצד אתר קהילה בשכונה ("האתר") אוסף, משתמש, שומר ומגן על מידע אישי של משתמשיו, וכן כיצד האתר עושה שימוש בקבצי Cookies ובטכנולוגיות דומות.</p>
				<p>השימוש באתר מהווה הסכמה למדיניות זו ולתנאי השימוש. המדיניות חלה על כל משתמש באתר, לרבות מבוגרים, הורים וקטינים. האתר פועל בהתאם לחוק הגנת הפרטיות, התשמ"א‑1981, תקנות הגנת הפרטיות, וחוק התקשורת (ספאם).</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">2. מידע הנאסף על המשתמשים</h3>

				<h4 class="sub-title">2.1 מידע שמוסר המשתמש באופן ישיר</h4>
				<ul class="bullet-list">
					<li>שם מלא, מספר טלפון, כתובת דוא״ל, כתובת מגורים</li>
					<li>ת"ז, תמונות, מיקום גאוגרפי, פרטי קשר</li>
					<li>מידע על ילדים (באישור הורה בלבד)</li>
					<li>תוכן שהמשתמש מפרסם באתר</li>
				</ul>

				<h4 class="sub-title">2.2 מידע הנאסף אוטומטית</h4>
				<ul class="bullet-list">
					<li>כתובת IP, סוג דפדפן ומערכת הפעלה, מזהי מכשיר</li>
					<li>עמודים שנצפו, פעולות שבוצעו, נתוני שימוש</li>
					<li>Cookies וטכנולוגיות מעקב</li>
				</ul>

				<h4 class="sub-title">2.3 מידע מצד שלישי</h4>
				<p>האתר עשוי לקבל מידע משירותי אימות זהות, שירותי אנליטיקה, ספקי פרסום, שירותי מיקום ורשתות חברתיות (אם המשתמש מתחבר דרכן).</p>

				<h4 class="sub-title">2.4 מידע על קטינים</h4>
				<p>מידע על קטינים ייאסף רק באישור הורה. האתר אינו מוכר מידע מזהה על קטינים. מידע אנונימי עשוי להישמר לצרכים סטטיסטיים בלבד.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">3. מטרות השימוש במידע</h3>
				<ul class="bullet-list">
					<li><strong>תפעול ושיפור האתר</strong> - הפעלת האתר, התאמת חוויית המשתמש, איתור תקלות</li>
					<li><strong>יצירת קשר</strong> - שליחת התראות, הודעות מערכת, מענה לפניות</li>
					<li><strong>התאמת תוכן</strong> - הצגת תוכן מותאם ומודעות רלוונטיות</li>
					<li><strong>אבטחת מידע</strong> - אימות זהות, מניעת הונאות, איתור פעילות חשודה</li>
					<li><strong>מטרות סטטיסטיות</strong> - ניתוח מגמות, הפקת דוחות</li>
					<li><strong>פרסום ושיווק</strong> - רק בכפוף להסכמה</li>
					<li><strong>עמידה בדרישות חוק</strong> - מניעת עבירות, מענה לדרישות רשויות</li>
				</ul>
			</section>

			<section class="sec">
				<h3 class="sec-title">4. שיתוף מידע עם צדדים שלישיים</h3>
				<p>האתר עשוי לשתף מידע עם ספקי שירות (אחסון, אבטחה, אנליטיקה, תשלומים), שותפים עסקיים לצורך קידום ופרסום, רשתות פרסום ושיווק (בכפוף להסכמה), ורשויות מוסמכות במקרי צו בית משפט או דרישה חוקית. מידע על קטינים לא יועבר לצרכים מסחריים.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">5. Cookies וטכנולוגיות מעקב</h3>

				<h4 class="sub-title">5.1 מה הם Cookies?</h4>
				<p>Cookies הם קבצים קטנים הנשמרים בדפדפן ומאפשרים זיהוי משתמשים, שמירת העדפות, שיפור ביצועים, ניתוח תנועה והתאמת פרסום.</p>

				<h4 class="sub-title">5.2 סוגי Cookies</h4>
				<ul class="bullet-list">
					<li>Cookies חיוניים - לתפעול בסיסי</li>
					<li>Cookies פונקציונליים - לשיפור חוויית המשתמש</li>
					<li>Cookies אנליטיים - לניתוח שימושיות</li>
					<li>Cookies של פרסום - להתאמת פרסומות</li>
					<li>Cookies של צד שלישי - Google Analytics, Google Ads, Meta, YouTube</li>
				</ul>

				<h4 class="sub-title">5.3 ניהול Cookies</h4>
				<p>המשתמש יכול למחוק Cookies, לחסום Cookies, לבטל פרסום מותאם ולהשתמש בגלישה פרטית. חסימה מסוימת עלולה לפגוע בתפקוד האתר.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">6. שמירת מידע ואבטחת מידע</h3>
				<p>המידע יישמר לצורך תפעול האתר, עמידה בדרישות חוק, הגנה משפטית, מניעת הונאות וניתוח סטטיסטי אנונימי. האתר נוקט באמצעי אבטחה הכוללים הצפנה, גיבויים, בקרות גישה, ניטור ושרתים מאובטחים. במקרה של דליפה: האתר יפעל לצמצום הנזק, יעדכן משתמשים וישתף פעולה עם רשויות.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">7. זכויות משתמש</h3>
				<p>לפי חוק הגנת הפרטיות: זכות לעיון במידע, זכות לתיקון מידע, זכות למחיקה, זכות להגבלת שימוש, זכות לביטול הסכמה, וזכויות הורים לגבי קטינים.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">8. העברת מידע לחו״ל</h3>
				<p>האתר עשוי להעביר מידע לשרתים מחוץ לישראל, בכפוף להגנה מספקת, הסכמי עיבוד נתונים, הצפנה ודרישות החוק. מידע על קטינים לא יועבר לצרכים מסחריים.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">9. שינויי מדיניות</h3>
				<p>האתר רשאי לעדכן את המדיניות. שינויים מהותיים יפורסמו באתר. המשך שימוש באתר מהווה הסכמה למדיניות המעודכנת.</p>
			</section>

			<section class="sec contact-sec">
				<h3 class="sec-title">10. יצירת קשר</h3>
				<p>לכל שאלה או בקשה בנוגע למדיניות:</p>
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

		<!-- ===== תקנון האתר ===== -->
		{#if activeTab === 'regulations'}
		<div class="doc-card">
			<div class="doc-header">
				<h2 class="doc-title">📜 תקנון האתר – קהילה בשכונה</h2>
			</div>

			<section class="sec">
				<h3 class="sec-title">1. פתיח והסכמה לתנאים</h3>
				<p>תקנון זה מגדיר את תנאי השימוש באתר קהילה בשכונה ("האתר"). השימוש באתר מהווה הסכמה מלאה לתנאים המפורטים במסמך זה. אם אינך מסכים לתנאים - עליך להימנע משימוש באתר.</p>

				<h4 class="sub-title">1.1 מטרת האתר</h4>
				<p>האתר משמש כמרכז קהילתי דיגיטלי הכולל תכנים חינוכיים, פעילויות לילדים, מידע קהילתי, אזור משתמשים רשומים ואפשרות להעלאת תכנים.</p>

				<h4 class="sub-title">1.2 קבלת התנאים</h4>
				<p>השימוש באתר מהווה אישור שקראת את התקנון והסכמה לכל תנאיו.</p>

				<h4 class="sub-title">1.3 הגבלת גיל</h4>
				<p>חלק מהשירותים עשויים לדרוש אישור הורה לקטינים.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">2. הרשמה לאתר וחשבון משתמש</h3>
				<p>ייתכן שתידרש הרשמה הכוללת פרטים בסיסיים, בחירת סיסמה ואישור תנאי השימוש. המשתמש אחראי לשמירת הסיסמה, עדכון פרטים ודיווח על שימוש לא מורשה. אין להשתמש בחשבון שאינו שלך ואין לאפשר לאחרים להשתמש בחשבונך. ניתן לבקש מחיקת חשבון בכל עת - האתר רשאי לשמור מידע מסוים בהתאם לחוק.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">3. שימוש מותר ואסור באתר</h3>
				<p><strong>מותר:</strong> צפייה בתכנים, השתתפות בפעילויות, העלאת תכנים בהתאם לכללים.</p>
				<p><strong>אסור:</strong> פגיעה באתר או במשתמשים, הפרת זכויות יוצרים, העלאת תכנים פוגעניים, שימוש בבוטים, התחזות או פעילות לא חוקית. המשתמש אחראי לכל תוכן שהוא מעלה.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">4. תוכן גולשים (UGC)</h3>
				<p>התוכן חייב להיות חוקי, מקורי ולא פוגעני. המשתמש מעניק לאתר רישיון לא בלעדי להצגת התוכן. האתר רשאי להסיר כל תוכן שאינו עומד בכללים. ניתן לדווח על תכנים בעייתיים.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">5. קניין רוחני וזכויות יוצרים</h3>
				<p>כל תכני האתר מוגנים בזכויות יוצרים. מותר ציטוט קצר ושימוש לצורכי לימוד ומחקר. האתר רשאי להסיר תכנים מפרים ולחסום משתמשים.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">6. פרטיות ואבטחת מידע</h3>
				<p>האתר אוסף מידע שנמסר על ידי המשתמש, מידע טכני ו‑Cookies לצורך תפעול האתר, שיפור השירות, אבטחה ויצירת קשר. המידע נשמר רק למשך הזמן הנדרש. מדיניות הפרטיות המלאה מהווה חלק מהתקנון.
					<button onclick={() => setTab('privacy')} class="inline-link">← קרא את מדיניות הפרטיות המלאה</button>
				</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">7. הגבלת אחריות</h3>
				<p>האתר אינו אחראי לטעויות, נזקים או הסתמכות על מידע. ייתכנו תקלות, תחזוקה או הפסקות שירות. האתר אינו אחראי לנזקים ישירים או עקיפים, ולא לתוכן של צדדים שלישיים.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">8. הפסקת שימוש וחסימת משתמשים</h3>
				<p>האתר רשאי לחסום משתמש במקרה של הפרת תנאים, פגיעה באתר, תכנים אסורים ועוד. הפסקת שירות כוללת חסימת חשבון, מחיקת תכנים וחסימת IP. האתר רשאי לשנות או להפסיק שירותים ולא אחראי לנזקים עקב חסימה.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">9. שינויים בתקנון</h3>
				<p>שינויים יפורסמו באמצעות עדכון תאריך, הודעה באתר או הודעה למשתמשים. שימוש באתר לאחר עדכון התקנון מהווה הסכמה לתנאים החדשים.</p>
			</section>

			<section class="sec contact-sec">
				<h3 class="sec-title">10. יצירת קשר</h3>
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
				<p class="text-gray-400 text-sm mt-1">עדכון אחרון: מרץ 2026</p>
			</div>

			<section class="sec">
				<h3 class="sec-title">מטרה והתחייבות</h3>
				<p>אתר "קהילה בשכונה" מחויב לנגישות דיגיטלית מלאה לכלל המשתמשים, לרבות אנשים עם מוגבלויות.
				האתר פועל לעמוד בדרישות תקן ישראלי 5568 (WCAG 2.1 ברמה AA), וכולל התאמות לאנשים עם לקויות ראייה, שמיעה, קוגניציה ומוטוריקה.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">היקף</h3>
				<p>מדיניות זו חלה על כל דפי האתר, ממשקי משתמש, מסמכים דיגיטליים ושירותים מקוונים המוצעים על ידי האתר.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">עקרונות הנגשה</h3>
				<ul class="bullet-list">
					<li><strong>נגישות תוכן</strong> - טקסטים, תמונות, וידאו וקבצים יונגשו בהתאם להנחיות נגישות מקובלות.</li>
					<li><strong>נגישות ניווט</strong> - תפריטים וקישורים יהיו ברורים, עקביים ונגישים באמצעות מקלדת.</li>
					<li><strong>נגישות חזותית</strong> - צבעים וניגודיות ייבחרו כך שיתאימו לקריאה; טקסטים חשובים יהיו ניתנים להגדלה.</li>
					<li><strong>נגישות שמיעתית</strong> - תכני וידאו יכללו כתוביות; תכנים קוליים ילוּוו בתמלול כאשר רלוונטי.</li>
					<li><strong>נגישות טכנית</strong> - האתר ישאף לעמוד בסטנדרטים טכניים מקובלים (WCAG) במידה וניתן.</li>
				</ul>
			</section>

			<section class="sec">
				<h3 class="sec-title">התאמות שבוצעו</h3>
				<ul class="bullet-list">
					<li><strong class="text-green-400">✓</strong> הגדרת שפת הדף כעברית (<code lang="en" class="text-blue-300">lang="he" dir="rtl"</code>) לתמיכה בקוראי מסך</li>
					<li><strong class="text-green-400">✓</strong> קישור "דלג לתוכן הראשי" מופיע עם פוקוס מקלדת לניווט מהיר</li>
					<li><strong class="text-green-400">✓</strong> כל הכפתורים, הקישורים והשדות כוללים תיאורי <code lang="en" class="text-blue-300">aria-label</code> ברורים</li>
					<li><strong class="text-green-400">✓</strong> חלונות קופצים מיישמים מלכודת פוקוס ומחזירים פוקוס לרכיב הפותח עם הסגירה</li>
					<li><strong class="text-green-400">✓</strong> הודעות דינמיות מוכרזות אוטומטית לקוראי מסך באמצעות <code lang="en" class="text-blue-300">aria-live</code></li>
					<li><strong class="text-green-400">✓</strong> תפריטי שפה כוללים <code lang="en" class="text-blue-300">aria-haspopup</code> ו-<code lang="en" class="text-blue-300">aria-expanded</code> לציון מצב הפתיחה</li>
					<li><strong class="text-green-400">✓</strong> אנימציות מושבתות אוטומטית עם <code lang="en" class="text-blue-300">prefers-reduced-motion</code></li>
					<li><strong class="text-green-400">✓</strong> תמונות דקורטיביות כוללות <code lang="en" class="text-blue-300">alt=""</code> ותמונות תוכן כוללות תיאור מלא</li>
					<li><strong class="text-green-400">✓</strong> מבנה כותרות היררכי (<code lang="en" class="text-blue-300">h1 → h2 → h3</code>) בכל עמוד</li>
					<li><strong class="text-green-400">✓</strong> ניגודיות טקסט עומדת בדרישות WCAG AA (לפחות 4.5:1 לטקסט רגיל)</li>
					<li><strong class="text-green-400">✓</strong> טיקר החדשות הנע מוסתר מקוראי מסך; התוכן זמין בגרסה נגישה מקבילה</li>
					<li><strong class="text-green-400">✓</strong> כל קישורים חיצוניים מסומנים בבירור כ"נפתח בחלון חדש"</li>
					<li><strong class="text-green-400">✓</strong> טפסים כוללים <code lang="en" class="text-blue-300">&lt;label&gt;</code> מקושר לכל שדה, סימון שדות חובה וטיפול בשגיאות</li>
				</ul>
			</section>

			<section class="sec">
				<h3 class="sec-title">מגבלות ידועות</h3>
				<ul class="bullet-list">
					<li><strong class="text-yellow-400">⚠</strong> מפת השכונות האינטראקטיבית מבוססת על Google Maps Embed - ייתכן שחלק מפונקציות המפה אינן נגישות במלואן לקוראי מסך. ניתן לגשת לרשימת הקטגוריות כחלופה מלאה.</li>
					<li><strong class="text-yellow-400">⚠</strong> חלק מהרכיבים המורכבים (כמו מסך בחירת שכונה) ממשיכים לשפר מיפוי ARIA. עבודה בתהליך.</li>
					<li><strong class="text-yellow-400">⚠</strong> ייתכנו תכנים או שירותים שאינם ניתנים להנגשה מלאה מטעמי טכנולוגיה או צד שלישי; האתר יפעל לציין מגבלות אלה ולחפש חלופות.</li>
				</ul>
			</section>

			<section class="sec">
				<h3 class="sec-title">התאמות פרטניות</h3>
				<p>משתמשים הזקוקים להתאמות מיוחדות מוזמנים לפנות לצוות האתר; האתר ישקול בקשות סבירות ויפעל לספק פתרונות בהתאם ליכולת הטכנית והמשאבים.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">כתב ויתור (Disclaimer)</h3>
				<p>התכנים והשירותים באתר ניתנים למשתמשים כפי שהם, ללא הבטחה מפורשת או משתמעת לגבי שלמותם, דיוקם או התאמתם למטרה מסוימת. השימוש בתכנים ובשירותים נעשה על אחריות המשתמש בלבד. התכנים באתר נועדו למידע כללי בלבד ואינם מהווים ייעוץ מקצועי משפטי, רפואי, פיננסי או אחר.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">מדיניות החזרים וביטולים</h3>
				<p>מוצרים דיגיטליים - בדרך כלל לא יינתן החזר לאחר הורדה או גישה לתוכן דיגיטלי, אלא במקרים חריגים. מוצרים פיזיים - החזר יינתן בהתאם לתנאי החזרת מוצרים, כשהמוצר באריזתו המקורית ובמצב תקין. לבקשות החזר: יש לפנות לשירות הלקוחות עם פרטי הזמנה - האתר יבחן את הבקשה ויעדכן על החלטתו בתוך זמן סביר.</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">מדיניות שימוש בתמונות וזכויות יוצרים</h3>
				<ul class="bullet-list">
					<li>המשתמש מצהיר כי הוא בעל הזכויות בתמונה שהעלה, או שיש לו רישיון לשימוש בה.</li>
					<li>אין להעלות תמונות שמפרות זכויות יוצרים, זכויות פרטיות, או מכילות תוכן פוגעני.</li>
					<li>המשתמש מעניק לאתר רישיון לא בלעדי, ללא תמלוגים, לשימוש והצגת התמונות שהועלו.</li>
					<li>אין לפרסם תמונות של אנשים ללא הסכמתם. פרסום תמונות של קטינים מחייב הסכמת הורה.</li>
					<li>הפרות עלולות לגרור הסרה של תמונות, השעיית חשבון וצעדים משפטיים.</li>
				</ul>
			</section>

			<section class="sec contact-sec">
				<h3 class="sec-title">יצירת קשר ודיווח על בעיות נגישות</h3>
				<p>לכל בעיה או בקשה בנוגע לנגישות:</p>
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
		color: #6b7280;
		font-size: 0.95rem;
	}

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
		color: #9ca3af;
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
