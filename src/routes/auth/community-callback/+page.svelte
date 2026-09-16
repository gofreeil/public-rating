<script lang="ts">
	import { onMount } from 'svelte';
	import { signIn } from '@auth/sveltekit/client';

	let { data } = $props();
	let phase = $state<'working' | 'not_registered'>('working');
	let oauthLoading = $state<'google' | 'facebook' | null>(null);

	// הרשמה בלחיצה מתוך מסך "עדיין אין חשבון": Google/Facebook יוצרים חשבון
	// ומחזירים ליעד המקורי - בלי לשלוח את המשתמש לטופס.
	async function joinWith(provider: 'google' | 'facebook') {
		oauthLoading = provider;
		try {
			const u = new URL(data.returnTo || '/', location.origin);
			u.searchParams.set('welcome', 'new');
			await signIn(provider, { callbackUrl: `${u.pathname}${u.search}${u.hash}` });
		} catch {
			oauthLoading = null;
		}
	}

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
					<h1 class="text-2xl font-black text-yellow-300 mb-2">עוד רגע ואתם בפנים</h1>
					<p class="text-gray-300 text-sm mb-1 leading-relaxed">
						אתם בקבוצות הווצאפ של יוצאים לחירות, אבל עדיין אין לכם חשבון באתר. זה בסדר גמור, ככה זה לכולם בפעם הראשונה.
					</p>
					<p class="text-gray-400 text-sm mb-6 leading-relaxed">
						לחיצה אחת למטה יוצרת לכם חשבון, ומשם אתם מזוהים בכל אתרי יוצאים לחירות בלי להירשם שוב.
					</p>
					<div class="flex flex-col gap-2.5">
						{#if data.oauth?.google}
						<button
							type="button"
							onclick={() => joinWith('google')}
							disabled={oauthLoading !== null}
							class="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-bold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
						>
							{#if oauthLoading === 'google'}
								<span class="w-5 h-5 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin flex-shrink-0"></span>
							{:else}
								<svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
									<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
									<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
									<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
									<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
								</svg>
							{/if}
							<span>המשך עם Google</span>
						</button>
						{/if}
						{#if data.oauth?.facebook}
						<button
							type="button"
							onclick={() => joinWith('facebook')}
							disabled={oauthLoading !== null}
							class="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
						>
							{#if oauthLoading === 'facebook'}
								<span class="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin flex-shrink-0"></span>
							{:else}
								<svg class="w-5 h-5 flex-shrink-0" fill="white" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
									<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
								</svg>
							{/if}
							<span>המשך עם Facebook</span>
						</button>
						{/if}
						<a
							href="/register"
							class="mt-1 text-sm text-gray-400 hover:text-gray-200 underline"
						>
							מעדיפים אימייל וסיסמה? הרשמה ידנית
						</a>
						<a href="/login" class="text-sm text-gray-500 hover:text-gray-300 underline">
							חזרה להתחברות
						</a>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
