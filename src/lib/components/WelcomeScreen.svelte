<script lang="ts">
	/**
	 * מסך פתיחה מלא אחרי הרשמה / זיהוי ראשון — גלובלי (מוצג ב-+layout), כדי שיופיע
	 * בכל יעד נחיתה. מקור-אמת: פרמטר `welcome` ב-URL שנשתל בזרימות ההרשמה / ה-SSO:
	 *   welcome=1 | welcome=new  → "ברוכים המצטרפים"
	 *   welcome=back             → "ברוכים השבים"
	 * בשני המצבים מוצגת רשת הלוגואים של כל האתרים (networkSites — הרשימה
	 * הקנונית המלאה, כולל האתר הנוכחי; לא adsData שמשמש לרוטציית פרסומות).
	 *
	 * עצמאי בכוונה: קורא את ה-URL דרך window.location ב-onMount (לא $app/state) —
	 * כדי שאותו רכיב יעבוד בכל מאגרי הרשת ללא תלות ב-i18n.
	 */
	import { onMount } from 'svelte';
	import { networkSites } from '$lib/networkSites';

	let { userName = '' }: { userName?: string } = $props();

	const WELCOME_MS = 7000;
	// לוגו האתר — המשתנה היחיד שמשתנה בין אתרי הרשת
	const LOGO_SRC = '/images/public-rating-logo.png';

	let kind = $state<'new' | 'back' | null>(null);
	let visible = $state(false);
	let fill = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function dismiss() {
		if (timer) clearTimeout(timer);
		visible = false;
		try {
			const url = new URL(window.location.href);
			url.searchParams.delete('welcome');
			history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
		} catch {
			/* ignore */
		}
	}

	onMount(() => {
		const p = new URLSearchParams(window.location.search).get('welcome');
		kind = p === '1' || p === 'new' ? 'new' : p === 'back' ? 'back' : null;
		if (!kind) return;
		visible = true;
		// מסמנים שהדפדפן הזה כבר קיבל ברכה — כניסות SSO הבאות לא יציגו שוב "ברוכים המצטרפים"
		try {
			localStorage.setItem('gofreeil-welcomed', '1');
		} catch {
			/* ignore */
		}
		requestAnimationFrame(() => (fill = true));
		timer = setTimeout(dismiss, WELCOME_MS);
		return () => {
			if (timer) clearTimeout(timer);
		};
	});
</script>

{#if visible && kind}
	<div
		role="dialog"
		aria-modal="true"
		dir="rtl"
		class="fixed inset-0 z-[1300] overflow-y-auto
			{kind === 'new'
			? 'bg-gradient-to-br from-blue-950 via-[#070b14] to-purple-950'
			: 'bg-gradient-to-br from-emerald-950 via-[#070b14] to-blue-950'}"
	>
		<button
			type="button"
			onclick={dismiss}
			aria-label="סגירה"
			class="fixed top-4 left-4 z-[1310] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-gray-200 transition-colors hover:bg-white/20 hover:text-white"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" focusable="false">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>

		<div class="min-h-full flex items-start md:items-center justify-center px-3 py-8 sm:px-4 sm:py-12">
			<div class="w-full max-w-none sm:max-w-3xl lg:max-w-5xl text-center">
				{#if kind === 'new'}
					<img
						src={LOGO_SRC}
						alt="לוגו האתר"
						class="mx-auto w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover bg-white ring-2 ring-purple-400/40 shadow-lg mb-4"
					/>
					<h2 class="flex items-center justify-center gap-2 text-white font-black text-3xl sm:text-4xl mb-3">
						<span class="text-xl" aria-hidden="true">🎉</span>
						<span>ברוכים המצטרפים</span>
					</h2>
					<p class="text-gray-200 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-6">
						נרשמת בהצלחה — ומעכשיו אתה מוכר בכל אתרי רשת יוצאים לחירות, ללא צורך בהזדהות נוספת.
					</p>
					<p class="text-purple-200 text-base sm:text-lg font-bold tracking-wide mb-4">
						יוצאים לחירות מוכיחים שעולם חדש הוא אפשרי
					</p>
				{:else}
					<div class="text-7xl sm:text-8xl mb-4">👋</div>
					<h2 class="text-white font-black text-3xl sm:text-4xl mb-3">
						ברוכים השבים{userName.trim() ? `, ${userName.trim()}` : ''}!
					</h2>
					<p class="text-gray-200 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-6">
						טוב לראות אותך שוב ברשת יוצאים לחירות.
					</p>
				{/if}
				<!-- לוגואים של כל האתרים ברשת (הרשימה הקנונית המלאה, כולל האתר
				     הנוכחי) — מוצגים בשני המצבים (מצטרפים + שבים). flex-wrap עם
				     מרכוז כדי שהשורה האחרונה (חלקית) תתמרכז ולא תישאר צמודה לצד -->
				<div class="flex flex-wrap justify-center gap-2 sm:gap-3" aria-label="אתרי רשת יוצאים לחירות">
					{#each networkSites as site (site.id)}
						<a
							href={site.href}
							target="_blank"
							rel="noopener noreferrer"
							title={site.title}
							class="group flex flex-col items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 {kind === 'new' ? 'hover:border-purple-400/40' : 'hover:border-emerald-400/40'} p-2 sm:p-3 transition-all hover:-translate-y-0.5 grow-0 basis-[calc(33.333%-0.34rem)] sm:basis-[calc(25%-0.57rem)] lg:basis-[calc(20%-0.6rem)]"
						>
							<div class="w-full aspect-[4/3] overflow-hidden rounded-lg bg-gradient-to-br {site.color}">
								<img
									src={site.image}
									alt={site.title}
									loading="lazy"
									class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
								/>
							</div>
							<span class="text-xs sm:text-sm leading-tight font-semibold text-gray-200 line-clamp-2 text-center">{site.title}</span>
						</a>
					{/each}
				</div>
			</div>
		</div>

		<!-- פס זמן — מתמלא עד סוף המסך (7 שניות) ואז המסך נסגר -->
		<div class="fixed bottom-0 left-0 right-0 h-1.5 bg-white/10 z-[1310]">
			<div
				class="h-full {kind === 'new' ? 'bg-purple-400' : 'bg-emerald-400'}"
				style="width: {fill ? '100%' : '0%'}; transition: width {WELCOME_MS}ms linear;"
			></div>
		</div>
	</div>
{/if}
