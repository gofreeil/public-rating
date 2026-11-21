<script lang="ts">
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(async () => {
		const back = data.redirectTo || '/';
		try {
			// ה-signIn() של @auth/sveltekit לא מריץ authorize() לספק עם id מותאם —
			// פונים ישירות ל-callback (אותה שיטה כמו ב-/auth/community-callback).
			const res = await fetch('/auth/callback/gofreeil-sso', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'X-Auth-Return-Redirect': '1'
				},
				body: new URLSearchParams({ callbackUrl: new URL(back, location.origin).href })
			});
			const { url } = await res.json();
			// authorize() נכשל (עוגייה מתה/חסרה) → נשארים אורחים ביעד המקורי
			if (!url || /\/auth\/(signin|error)|[?&]error=/.test(url)) {
				location.replace(back);
				return;
			}
			location.replace(url);
		} catch {
			location.replace(back);
		}
	});
</script>

<svelte:head>
	<title>מתחבר…</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center" dir="rtl">
	<div class="text-4xl">🕊️</div>
	<p class="font-bold text-white">מזהים אותך…</p>
	<noscript><a href={data.redirectTo || '/'} class="text-sm underline">להמשך</a></noscript>
</div>
