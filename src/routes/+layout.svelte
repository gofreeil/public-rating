<script lang="ts">
	import "../app.css";
	import "flag-icons/css/flag-icons.min.css";
	import "$lib/i18n";
	import Header from "$lib/components/Header.svelte";
	import NavBar from "$lib/components/rating/NavBar.svelte";
	import RightAdBanner from "$lib/components/RightAdBanner.svelte";
	import AdsSidebar from "$lib/components/AdsSidebar.svelte";
	import Footer from "$lib/components/Footer.svelte";
	import CoinAnimation from "$lib/components/CoinAnimation.svelte";
	import MobileAdsDrawer from "$lib/components/MobileAdsDrawer.svelte";
	import MobileAdPopup from "$lib/components/MobileAdPopup.svelte";
	import WelcomeScreen from "$lib/components/WelcomeScreen.svelte";
	import { signOut } from "@auth/sveltekit/client";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";

	let { children, data } = $props();

	// ממפה את session.user לצורה שה-Header מצפה לה
	let currentUser = $derived(
		data.session?.user
			? {
				username:   data.session.user.name  ?? data.session.user.email ?? 'משתמש',
				avatar_url: (data.session.user as { avatar_url?: string }).avatar_url ?? data.session.user.image ?? null,
			  }
			: undefined
	);

	async function handleLogout() {
		await signOut({ redirectTo: '/' });
	}

	function handleShowAuth() {
		goto(`/login?redirect=${encodeURIComponent(page.url.pathname)}`);
	}
</script>

<svelte:head>
	<title>דירוג ציבורי</title>
	<link rel="icon" href="/images/public-rating.jpeg" type="image/jpeg" />
	<!-- tabnav: מושבת לבינתיים - לא רשום על הדומיין הנוכחי -->
	<!-- <script src="https://widget.tabnav.com/widget.min.js.gz" defer></script> -->
	<!-- <noscript>נדרש ג'אווה סקריפט כדי ש<a href="https://tabnav.com/he">הנגשת אתרים</a> תעבוד כראוי.</noscript> -->
</svelte:head>

<a href="#main-content" class="skip-link">דלג לתוכן הראשי</a>
<!-- מסך פתיחה אחרי הרשמה / זיהוי ראשון — גלובלי, מופעל ע"י ?welcome ב-URL -->
<WelcomeScreen />
<CoinAnimation />
<MobileAdsDrawer currentUser={currentUser} layoutUser={data.layoutUser} />
<MobileAdPopup />
<div class="min-h-screen flex flex-col bg-[#0f172a]">
	<Header
		currentUser={currentUser}
		onLogout={handleLogout}
		onShowAuth={handleShowAuth}
	/>

	<NavBar />

	<div class="layout-container flex-grow">
		<RightAdBanner />
		<main id="main-content" tabindex="-1" class="main-content">
			{@render children()}
		</main>
		<AdsSidebar />
	</div>

	<Footer />
</div>

<style>
	.layout-container {
		max-width: 1440px;
		margin: 0 auto;
		display: flex;
		gap: 2rem;
		padding: 2rem 2rem 0 2rem;
		width: 100%;
	}

	.main-content {
		flex: 1;
		min-width: 0;
	}

	@media (max-width: 1024px) {
		.layout-container {
			padding: 1rem;
			flex-direction: column;
		}
	}
</style>
