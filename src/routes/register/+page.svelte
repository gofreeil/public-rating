<script lang="ts">
	import { enhance } from '$app/forms';
	import { get } from 'svelte/store';
	import { t, locale } from 'svelte-i18n';

	let { form } = $props();
	let isLoading    = $state(false);
	let showPassword = $state(false);
	let showConfirm  = $state(false);
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
