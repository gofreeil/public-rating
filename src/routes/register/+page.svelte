<script lang="ts">
	import { enhance } from '$app/forms';
	import { signIn } from '@auth/sveltekit/client';
	import { get } from 'svelte/store';
	import { t, locale } from 'svelte-i18n';

	let { data, form } = $props();
	let isLoading       = $state(false);
	let loadingProvider = $state<'google' | 'facebook' | null>(null);
	let showPassword    = $state(false);
	let showConfirm     = $state(false);

	// מוסיף welcome=new ליעד — מפעיל את מסך "ברוכים המצטרפים" אחרי ההרשמה
	function withWelcome(dest: string): string {
		try {
			const u = new URL(dest, window.location.origin);
			u.searchParams.set('welcome', 'new');
			return `${u.pathname}${u.search}${u.hash}`;
		} catch {
			return '/?welcome=new';
		}
	}

	// ב-Auth.js signIn(provider) הוא גם הרשמה וגם התחברות — משתמש חדש נוצר
	// אוטומטית ב-signIn callback, ולכן אין צורך ב-action שרתי נפרד להרשמה.
	async function registerWith(provider: 'google' | 'facebook') {
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

	// tFn: תרגום reactive - $t אסור ב-Svelte 5
	let _loc = $state(get(locale));
	$effect(() => locale.subscribe(l => (_loc = l)));
	const tFn = (k: string) => { void _loc; return get(t)(k); };

</script>

<svelte:head>
	<title>{tFn("register_title")}</title>
</svelte:head>

<div class="min-h-[80vh] flex items-center justify-center px-4 py-12" dir="rtl">
	<div class="w-full max-w-md">

		<!-- כרטיס -->
		<div class="bg-[#0f172a] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">

			<!-- פס עליון גרדיאנט -->
			<div class="h-1.5 bg-gradient-to-r from-green-500 via-blue-600 to-purple-600"></div>

			<div class="p-8 md:p-10">

				<!-- לוגו + כותרת -->
				<div class="text-center mb-8">
					<div class="flex justify-center mb-4">
						<div class="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-600 to-blue-700 flex items-center justify-center shadow-xl">
							<span class="text-3xl">🏘️</span>
						</div>
					</div>
					<h1 class="text-2xl font-black text-white mb-2">{tFn("join_community")}</h1>
					<p class="text-gray-400 text-sm">{tFn("create_account")}</p>
				</div>

				<!-- הודעת שגיאה -->
				{#if form?.error}
					<div role="alert" class="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-center">
						<p class="text-red-400 text-sm font-medium">{form.error}</p>
					</div>
				{/if}

				{#if data.oauth?.google}
				<!-- כפתור Google -->
				<button
					type="button"
					onclick={() => registerWith('google')}
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
					onclick={() => registerWith('facebook')}
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

				<!-- מפריד -->
				<div class="flex items-center gap-3 mb-6">
					<div class="flex-1 h-px bg-white/10"></div>
					<span class="text-xs text-gray-500">{tFn("or")}</span>
					<div class="flex-1 h-px bg-white/10"></div>
				</div>

				<!-- טופס הרשמה -->
				<form
					method="POST"
					use:enhance={() => {
						isLoading = true;
						return async ({ update }) => {
							isLoading = false;
							await update();
						};
					}}
				>
					<div class="mb-4">
						<label for="username" class="block text-sm font-medium text-gray-400 mb-2">{tFn("username_label")}</label>
						<input
							id="username"
							name="username"
							type="text"
							required
							autocomplete="username"
							value={form?.username ?? ''}
							class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3
							       text-white placeholder-gray-500 focus:outline-none focus:border-purple-500
							       focus:ring-1 focus:ring-purple-500 transition-colors"
							placeholder={tFn("username_placeholder")}
						/>
					</div>

					<div class="mb-4">
						<label for="email" class="block text-sm font-medium text-gray-400 mb-2">{tFn("email")}</label>
						<input
							id="email"
							name="email"
							type="email"
							required
							autocomplete="email"
							value={form?.email ?? ''}
							class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3
							       text-white placeholder-gray-500 focus:outline-none focus:border-purple-500
							       focus:ring-1 focus:ring-purple-500 transition-colors"
							placeholder="your@email.com"
						/>
					</div>

					<div class="mb-4">
						<label for="password" class="block text-sm font-medium text-gray-400 mb-2">{tFn("password_label")}</label>
						<div class="relative">
							<input
								id="password"
								name="password"
								type={showPassword ? 'text' : 'password'}
								required
								autocomplete="new-password"
								class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 pl-11
								       text-white placeholder-gray-500 focus:outline-none focus:border-purple-500
								       focus:ring-1 focus:ring-purple-500 transition-colors"
								placeholder={tFn("password_min")}
								minlength="6"
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

					<div class="mb-6">
						<label for="confirmPassword" class="block text-sm font-medium text-gray-400 mb-2">{tFn("confirm_password_label")}</label>
						<div class="relative">
							<input
								id="confirmPassword"
								name="confirmPassword"
								type={showConfirm ? 'text' : 'password'}
								required
								autocomplete="new-password"
								class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 pl-11
								       text-white placeholder-gray-500 focus:outline-none focus:border-purple-500
								       focus:ring-1 focus:ring-purple-500 transition-colors"
								placeholder={tFn("confirm_password_placeholder")}
							/>
							<button
								type="button"
								onclick={() => (showConfirm = !showConfirm)}
								class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
								aria-label={showConfirm ? 'הסתר אישור סיסמה' : 'הצג אישור סיסמה'}
							>
								{#if showConfirm}
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
						disabled={isLoading}
						class="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-green-600 to-blue-600
						       hover:from-green-500 hover:to-blue-500 text-white font-bold shadow-lg
						       transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60
						       disabled:cursor-not-allowed cursor-pointer"
					>
						{#if isLoading}
							<span class="inline-flex items-center gap-2">
								<span class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
								{tFn("registering")}
							</span>
						{:else}
							{tFn("register_btn")}
						{/if}
					</button>
				</form>

				<!-- לינק ללוגין -->
				<p class="mt-6 text-center text-sm text-gray-500">
					{tFn("already_registered")}
					<a href="/login" class="text-purple-400 hover:text-purple-300 font-medium transition-colors">
						{tFn("login_here")}
					</a>
				</p>

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
