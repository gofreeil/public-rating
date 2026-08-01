<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
	import { get } from 'svelte/store';
	import { t, locale } from 'svelte-i18n';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import InAppBrowserNotice from '$lib/components/rating/InAppBrowserNotice.svelte';

	let { data, form } = $props();

	let isLoading       = $state(false);
	let loadingProvider = $state<'google' | 'facebook' | 'credentials' | null>(null);
	let mode            = $state<'oauth' | 'email'>('oauth');
	let showPassword    = $state(false);
	let credError       = $state<string | null>(null);

	// מוסיף welcome=back ליעד — מפעיל את מסך "ברוכים השבים" אחרי ההתחברות
	function withWelcome(dest: string): string {
		try {
			const u = new URL(dest, window.location.origin);
			u.searchParams.set('welcome', 'back');
			return `${u.pathname}${u.search}${u.hash}`;
		} catch {
			return '/?welcome=back';
		}
	}

	async function loginWith(provider: 'google' | 'facebook') {
		isLoading = true;
		loadingProvider = provider;
		try {
			await signIn(provider, {
				callbackUrl: withWelcome(data.redirectTo || '/'),
			});
		} catch {
			isLoading = false;
			loadingProvider = null;
		}
	}

	// SSO: מפנים לקהילת "יוצאים לחירות", היא קובעת את העוגייה המשותפת gofreeil-auth
	// על .gofreeil.com ומחזירה ל-callback שמקים סשן דרך ספק gofreeil-sso.
	function loginWithCommunity() {
		isLoading = true;
		const returnTo = data.redirectTo || '/';
		const callback = `${window.location.origin}/auth/community-callback?returnTo=${encodeURIComponent(returnTo)}`;
		window.location.href = `https://community.gofreeil.com/sso?callback=${encodeURIComponent(callback)}`;
	}

	// תרגום שגיאות OAuth
	function errorMessage(code: string | null): string {
		if (!code) return '';
		const map: Record<string, string> = {
			OAuthSignin:           'שגיאה בהתחברות. נסה שוב.',
			OAuthCallback:         'שגיאה בחזרה מהספק. נסה שוב.',
			OAuthAccountNotLinked: 'החשבון כבר קיים עם ספק אחר.',
			Callback:              'שגיאה בתהליך ההתחברות.',
			CredentialsSignin:     'אימייל או סיסמה שגויים.',
			Default:               'שגיאה לא ידועה. נסה שוב.',
		};
		return map[code] ?? map['Default'];
	}
	// tFn: תרגום reactive - $t אסור ב-Svelte 5
	let _loc = $state(get(locale));
	$effect(() => locale.subscribe(l => (_loc = l)));
	const tFn = (k: string) => { void _loc; return get(t)(k); };

</script>

<svelte:head>
	<title>{tFn("login_title")}</title>
</svelte:head>

<div
	class="min-h-[80vh] flex items-center justify-center px-4 py-12"
	dir="rtl"
	onclick={() => goto('/')}
>
	<div class="w-full max-w-md" onclick={(e) => e.stopPropagation()}>

		<!-- כרטיס -->
		<div class="bg-[#0f172a] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">

			<!-- פס עליון גרדיאנט -->
			<div class="h-1.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"></div>

			<div class="p-8 md:p-10">

				<!-- לוגו + כותרת -->
				<div class="text-center mb-8">
					<div class="flex justify-center mb-4">
						<div class="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center shadow-xl">
							<span class="text-3xl">🏘️</span>
						</div>
					</div>
					<h1 class="text-2xl font-black text-white mb-2">{tFn("welcome_back")}</h1>
					<p class="text-gray-400 text-sm">{tFn("login_subtitle")}</p>
				</div>

				<!-- הודעת שגיאה -->
				{#if data.error}
					<div id="login-error" role="alert" class="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-center">
						<p class="text-red-400 text-sm font-medium">{errorMessage(data.error)}</p>
					</div>
				{/if}
				{#if form?.error || credError}
					<div id="login-error" role="alert" class="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-center">
						<p class="text-red-400 text-sm font-medium">{credError ?? form?.error}</p>
					</div>
				{/if}
				{#if data.registered}
					<div role="status" class="mb-6 rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-3 text-center">
						<p class="text-green-400 text-sm font-medium">{tFn("registered_success")}</p>
					</div>
				{/if}

				<InAppBrowserNotice />

				{#if mode === 'oauth'}
					{#if data.oauth?.google}
					<!-- כפתור Google -->
					<button
						type="button"
						onclick={() => loginWith('google')}
						disabled={isLoading}
						class="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 active:bg-gray-100
						       text-gray-900 font-bold py-3.5 px-6 rounded-2xl shadow-lg transition-all duration-200
						       hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed mb-4
						       cursor-pointer"
					>
						{#if loadingProvider === 'google'}
							<span class="w-5 h-5 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin flex-shrink-0"></span>
						{:else}
							<svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
								<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
								<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
								<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
								<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
							</svg>
						{/if}
						<span>{tFn("continue_google")}</span>
					</button>
					{/if}

					{#if data.oauth?.facebook}
					<!-- כפתור Facebook -->
					<button
						type="button"
						onclick={() => loginWith('facebook')}
						disabled={isLoading}
						class="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166FE5] active:bg-[#1466D4]
						       text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg transition-all duration-200
						       hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed mb-6
						       cursor-pointer"
					>
						{#if loadingProvider === 'facebook'}
							<span class="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin flex-shrink-0"></span>
						{:else}
							<svg class="w-5 h-5 flex-shrink-0" fill="white" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
								<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
							</svg>
						{/if}
						<span>{tFn("continue_facebook")}</span>
					</button>
					{/if}

					<!-- יוצאים לחירות (SSO) -->
					<button
						type="button"
						onclick={loginWithCommunity}
						disabled={isLoading}
						class="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-amber-500 to-pink-600
						       hover:from-amber-400 hover:to-pink-500 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg
						       transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl
						       disabled:opacity-60 disabled:cursor-not-allowed mb-3 cursor-pointer"
					>
						<span class="text-xl flex-shrink-0">🕊️</span>
						<span>התחבר דרך "יוצאים לחירות"</span>
					</button>
					<p class="text-center text-xs text-gray-500 mb-6 leading-relaxed">
						רשום כבר בקהילה, בשכונה או באתר אחר של יוצאים לחירות? המערכת תזהה אותך אוטומטית.
					</p>

					<!-- מפריד -->
					<div class="flex items-center gap-3 mb-6">
						<div class="flex-1 h-px bg-white/10"></div>
						<span class="text-xs text-gray-500">{tFn("or")}</span>
						<div class="flex-1 h-px bg-white/10"></div>
					</div>

					<!-- מעבר לאימייל/סיסמה -->
					<button
						type="button"
						onclick={() => (mode = 'email')}
						class="w-full py-3 px-6 rounded-2xl border border-white/10 text-gray-300 hover:text-white
						       hover:border-white/20 hover:bg-white/5 transition-all duration-200 text-sm font-medium cursor-pointer"
					>
						{tFn("login_with_email")}
					</button>

				{:else}
					<!-- טופס אימייל/סיסמה -->
					<form method="POST" action="?/credentials" use:enhance={() => {
						isLoading = true;
						loadingProvider = 'credentials';
						credError = null;
						return async ({ result }) => {
							if (result.type === 'success') {
								// שרת אישר - עכשיו signIn דרך Auth.js
								const formEl = document.querySelector('form[action="?/credentials"]') as HTMLFormElement;
								const email = (formEl?.querySelector('#email') as HTMLInputElement)?.value;
								const password = (formEl?.querySelector('#password') as HTMLInputElement)?.value;
								await signIn('credentials', {
									email,
									password,
									callbackUrl: withWelcome(data.redirectTo || '/'),
								});
							} else if (result.type === 'failure') {
								credError = (result.data as { error?: string })?.error ?? 'שגיאה לא ידועה';
								isLoading = false;
								loadingProvider = null;
							} else {
								isLoading = false;
								loadingProvider = null;
							}
						};
					}}>
						<input type="hidden" name="redirectTo" value={data.redirectTo} />

						<div class="mb-4">
							<label for="email" class="block text-sm font-medium text-gray-400 mb-2">{tFn("email")}</label>
							<input
								id="email"
								name="email"
								type="email"
								required
								autocomplete="email"
								aria-describedby={data.error || credError || form?.error ? 'login-error' : undefined}
								class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3
								       text-white placeholder-gray-500 focus:outline-none focus:border-purple-500
								       focus:ring-1 focus:ring-purple-500 transition-colors"
								placeholder="your@email.com"
							/>
						</div>

						<div class="mb-6">
							<label for="password" class="block text-sm font-medium text-gray-400 mb-2">{tFn("password_label")}</label>
							<div class="relative">
								<input
									id="password"
									name="password"
									type={showPassword ? 'text' : 'password'}
									required
									autocomplete="current-password"
									class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 pl-11
									       text-white placeholder-gray-500 focus:outline-none focus:border-purple-500
									       focus:ring-1 focus:ring-purple-500 transition-colors"
									placeholder="••••••••"
								/>
								<button
									type="button"
									onclick={() => (showPassword = !showPassword)}
									class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
									aria-label={showPassword ? tFn('hide_password') : tFn('show_password')}
								>
									{#if showPassword}
										<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" focusable="false">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
										</svg>
									{:else}
										<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" focusable="false">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
										</svg>
									{/if}
								</button>
							</div>
						</div>

						<button
							type="submit"
							class="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600
							       hover:from-blue-500 hover:to-purple-500 text-white font-bold shadow-lg
							       transition-all duration-200 hover:-translate-y-0.5 cursor-pointer mb-4"
						>
							התחברות
						</button>
					</form>

					<!-- חזרה ל-OAuth -->
					<button
						type="button"
						onclick={() => (mode = 'oauth')}
						class="w-full py-2 text-sm text-gray-500 hover:text-gray-400 transition-colors cursor-pointer mb-4"
					>
						{tFn("back_to_oauth")}
					</button>

					<!-- לינק להרשמה -->
					<p class="text-center text-sm text-gray-500">
						{tFn("no_account")}
						<a href="/register" class="text-purple-400 hover:text-purple-300 font-medium transition-colors">
							{tFn("register_here")}
						</a>
					</p>
				{/if}

				<!-- הערה (רק ב-OAuth mode) -->
				{#if mode === 'oauth'}
					<div class="mt-6 text-center">
						<p class="text-xs text-gray-500 leading-relaxed">
							בהתחברות אתה מאשר את
							<a href="/legal" target="_blank" class="text-purple-400 hover:text-purple-300 transition-colors">תנאי השימוש ומדיניות הפרטיות</a>
						</p>
					</div>
				{/if}

			</div>
		</div>

		<!-- קישור חזרה -->
		<div class="text-center mt-6">
			<a href="/" class="text-gray-500 hover:text-gray-400 text-sm transition-colors">
				{tFn("back_home_arrow")}
			</a>
		</div>

	</div>
</div>
