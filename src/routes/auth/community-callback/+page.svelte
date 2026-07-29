<script lang="ts">
	import { onMount } from 'svelte';

	let { data } = $props();
	let phase = $state<'working' | 'not_registered'>('working');

	onMount(async () => {
		if (data.error) {
			phase = 'not_registered';
			return;
		}
		// ה-signIn() של @auth/sveltekit שולח כל provider שה-id שלו אינו "credentials"
		// אל /auth/signin/<id> — כתובת שרק מציגה מסך התחברות ולעולם לא מריצה authorize().
		// ה-SSO שלנו נקרא "gofreeil-sso", לכן חייבים לפנות ישירות לכתובת ה-callback,
		// שהיא היחידה שמריצה authorize() וקוראת את עוגיית gofreeil-auth המשותפת.
		try {
			// פעם ראשונה בדפדפן הזה → welcome=new מפעיל את מסך "ברוכים המצטרפים";
			// משתמש חוזר → welcome=back מפעיל את מסך "ברוכים השבים".
			const callbackUrl = new URL(data.returnTo || '/', location.origin);
			try {
				callbackUrl.searchParams.set(
					'welcome',
					localStorage.getItem('gofreeil-welcomed') ? 'back' : 'new'
				);
			} catch {
				/* localStorage חסום — ממשיכים בלי הברכה */
			}
			const res = await fetch('/auth/callback/gofreeil-sso', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'X-Auth-Return-Redirect': '1'
				},
				body: new URLSearchParams({
					callbackUrl: callbackUrl.href
				})
			});
			const { url } = await res.json();
			// authorize() נכשל (אין עוגייה משותפת תקינה) → Auth.js מחזיר אותנו למסך
			// ההתחברות; מתייחסים לזה כ"לא זוהה".
			if (!url || /\/auth\/(signin|error)|[?&]error=/.test(url)) {
				phase = 'not_registered';
				return;
			}
			window.location.href = url;
		} catch {
			phase = 'not_registered';
		}
	});
</script>

<svelte:head>
	<title>התחברות דרך יוצאים לחירות</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-[80vh] flex items-center justify-center px-4 py-12" dir="rtl">
	<div class="w-full max-w-md">
		<div class="bg-[#0f172a] rounded-3xl border border-white/10 shadow-2xl overflow-hidden text-center">
			<div class="h-1.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"></div>
			<div class="p-8 md:p-10">
				{#if phase === 'working'}
					<div class="flex justify-center mb-4">
						<div class="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500 to-pink-600 flex items-center justify-center shadow-xl animate-pulse">
							<span class="text-3xl">🕊️</span>
						</div>
					</div>
					<h1 class="text-2xl font-black text-white mb-2">מזהה אותך...</h1>
					<p class="text-gray-400 text-sm">רק רגע, מתחברים דרך יוצאים לחירות</p>
					<div class="mt-6 flex justify-center">
						<span class="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
					</div>
				{:else}
					<div class="flex justify-center mb-4">
						<div class="h-16 w-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-xl">
							<span class="text-3xl">🔒</span>
						</div>
					</div>
					<h1 class="text-2xl font-black text-yellow-300 mb-2">עדיין אין לכם חשבון</h1>
					<p class="text-gray-400 text-sm mb-6 leading-relaxed">
						לא מצאנו אתכם ברשימת המשתמשים של יוצאים לחירות. ההרשמה לוקחת דקה, ומשם אתם מזוהים בכל אתרי הרשת — בלי להירשם שוב.
					</p>
					<div class="flex flex-col gap-2.5">
						<a
							href="/register"
							class="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black hover:opacity-90 transition-opacity"
						>
							✨ הרשמה לאתר
						</a>
						<a href="/login" class="mt-1 text-sm text-gray-400 hover:text-gray-200 underline">
							חזרה להתחברות
						</a>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
