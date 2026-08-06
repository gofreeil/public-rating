<script lang="ts">
	import { ads } from '$lib/adsData';

	interface LayoutUser {
		id: string;
		name: string | null;
		email: string | null;
		nickname: string;
		phone: string;
		city: string;
		neighborhood: string;
		avatar_url: string | null;
		gender: string;
		business: string;
		family_status: string;
		birth_date: string;
		notifications: number;
		balance: number;
	}

	interface Props {
		currentUser?: { username: string; avatar_url?: string | null };
		layoutUser?: LayoutUser | null;
	}
	let { currentUser, layoutUser }: Props = $props();

	// חישוב אחוז מילוי פרופיל
	let profileCompletion = $derived(layoutUser ? Math.round([
		!!layoutUser.avatar_url,
		!!layoutUser.name,
		!!layoutUser.email,
		!!layoutUser.nickname,
		!!layoutUser.phone,
		!!layoutUser.city,
		!!layoutUser.neighborhood,
		!!layoutUser.gender,
		!!layoutUser.business,
		!!layoutUser.family_status,
		!!layoutUser.birth_date,
		!!layoutUser.notifications,
	].filter(Boolean).length / 12 * 100) : 0);

	let ringColor = $derived(
		profileCompletion < 40 ? '#ef4444' :
		profileCompletion < 70 ? '#eab308' : '#22c55e'
	);
	const ringC = 2 * Math.PI * 43; // r=43

	let open = $state(false);
	let collapsed = $state(false);

	function closeAll() {
		open = false;
		collapsed = false;
	}

	// ---- Swipe gestures (Drawer) ----
	let drawerTouchStartX = 0;
	let drawerTouchStartY = 0;

	function onDrawerTouchStart(e: TouchEvent) {
		drawerTouchStartX = e.touches[0].clientX;
		drawerTouchStartY = e.touches[0].clientY;
	}

	function onDrawerTouchEnd(e: TouchEvent) {
		const dx = e.changedTouches[0].clientX - drawerTouchStartX;
		const dy = e.changedTouches[0].clientY - drawerTouchStartY;
		if (dx < -50 && Math.abs(dx) > Math.abs(dy)) {
			closeAll();
		}
	}

	// ---- לשונית ----
	let tabY = $state(0);
	let tabDragging = $state(false);
	let tabDragStartClientY = 0;
	let tabDragStartTabY = 0;
	let tabTouchStartX = 0;
	let tabTouchStartY = 0;
	let tabTouchStartTime = 0;
	let tabSwipeHandled = false;
	let tabAxis: 'h' | 'v' | null = null;

	let drawerSystemEl: HTMLElement | null = null;
	let isDraggingH = false;
	let dragStartLeftPx = -340;
	const DRAWER_WIDTH = 340;
	const OPEN_THRESHOLD = 100;
	const CLOSE_THRESHOLD = -100;
	const COLLAPSE_THRESHOLD = -20;

	$effect(() => {
		if (typeof window !== 'undefined' && tabY === 0) {
			tabY = Math.round(window.innerHeight * 4 / 5);
		}
	});

	function onTabTouchStart(e: TouchEvent) {
		tabTouchStartX        = e.touches[0].clientX;
		tabTouchStartY        = e.touches[0].clientY;
		tabDragStartClientY   = e.touches[0].clientY;
		tabDragStartTabY      = tabY;
		tabTouchStartTime     = Date.now();
		tabDragging           = false;
		tabSwipeHandled       = false;
		tabAxis               = null;
		isDraggingH           = false;
		dragStartLeftPx       = open ? 0 : -(drawerSystemEl?.offsetWidth ?? DRAWER_WIDTH);
	}

	function onTabTouchMove(e: TouchEvent) {
		const dx = e.touches[0].clientX - tabTouchStartX;
		const dy = e.touches[0].clientY - tabDragStartClientY;
		const absX = Math.abs(dx), absY = Math.abs(dy);

		if (tabAxis === null && (absX > 10 || absY > 10)) {
			tabAxis = absX > absY ? 'h' : 'v';
		}

		if (tabAxis !== null) {
			try { e.preventDefault(); } catch { /* passive */ }
		}

		if (tabAxis === 'h' && drawerSystemEl) {
			isDraggingH = true;
			const w = drawerSystemEl.offsetWidth || DRAWER_WIDTH;
			let newLeft = dragStartLeftPx + dx;
			if (newLeft > 0) newLeft = 0;
			if (newLeft < -w - 20) newLeft = -w - 20;
			drawerSystemEl.style.transition = 'none';
			drawerSystemEl.style.left = newLeft + 'px';

			if (!open) {
				collapsed = dx <= COLLAPSE_THRESHOLD;
			}
		}

		if (tabAxis === 'v' && absY > 20) {
			tabDragging = true;
			let newY = tabDragStartTabY + dy;
			newY = Math.max(60, Math.min(window.innerHeight - 60, newY));
			tabY = newY;
		}
	}

	function nonPassiveTouch(node: HTMLElement) {
		const opts: AddEventListenerOptions = { passive: false };
		node.addEventListener('touchstart', onTabTouchStart, opts);
		node.addEventListener('touchmove',  onTabTouchMove,  opts);
		node.addEventListener('touchend',   onTabTouchEnd,   opts);
		return {
			destroy() {
				node.removeEventListener('touchstart', onTabTouchStart, opts);
				node.removeEventListener('touchmove',  onTabTouchMove,  opts);
				node.removeEventListener('touchend',   onTabTouchEnd,   opts);
			}
		};
	}

	function onTabTouchEnd(e: TouchEvent) {
		const dx = e.changedTouches[0].clientX - tabTouchStartX;
		const dy = e.changedTouches[0].clientY - tabTouchStartY;
		const totalMove = Math.sqrt(dx * dx + dy * dy);
		const isTap = totalMove < 15;

		if (isDraggingH && drawerSystemEl) {
			drawerSystemEl.style.transition = '';
			drawerSystemEl.style.left = '';

			if (!open) {
				if (dx >= OPEN_THRESHOLD) {
					open = true;
					collapsed = false;
				}
			} else {
				if (dx <= CLOSE_THRESHOLD) {
					open = false;
					collapsed = false;
				}
			}
			tabSwipeHandled = true;
			e.preventDefault();
		} else if (tabDragging) {
			tabSwipeHandled = true;
		} else if (isTap) {
			if (open) closeAll();
			else open = true;
			tabSwipeHandled = true;
			e.preventDefault();
		}

		isDraggingH = false;
		tabDragging = false;
	}

	function onTabClick() {
		if (tabSwipeHandled) {
			tabSwipeHandled = false;
			return;
		}
		if (open) closeAll();
		else open = true;
	}

	$effect(() => {
		function handleKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape' && open) {
				closeAll();
			}
		}
		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});
</script>

<!-- מוצג רק בנייד -->
<div class="lg:hidden" dir="rtl">

	<!-- Overlay כהה כשפתוח -->
	{#if open}
	<button
		class="overlay"
		onclick={closeAll}
		aria-label="סגור פרסומות"
	></button>
	{/if}

	<!-- ה-Drawer והלשונית נעים יחד כיחידה אחת -->
	<div class="drawer-system" class:is-open={open} bind:this={drawerSystemEl}>

	<!-- Drawer -->
	<div class="drawer"
		role="dialog"
		aria-modal="true"
		aria-label="האזור האישי וההטבות מהקהילה הארצית"
		aria-hidden={!open}
		ontouchstart={onDrawerTouchStart}
		ontouchend={onDrawerTouchEnd}
	>
		<!-- כותרת Drawer -->
		<div class="drawer-header">
			<button class="close-btn" onclick={closeAll} aria-label="סגור">✕</button>
		</div>

		<!-- כפתור התחברות / אזור אישי -->
		<div class="section-title">האזור האישי</div>
		<div class="auth-section">
			{#if currentUser && layoutUser}
			<!-- מיני-כרטיס פרופיל -->
			<a href="/my-ratings" onclick={closeAll}
				class="block w-full bg-gradient-to-br from-indigo-900/40 to-purple-900/40 hover:from-indigo-900/60 hover:to-purple-900/60 border-2 border-purple-500/50 rounded-2xl p-4 transition-all no-underline shadow-lg shadow-purple-500/10">
				<div class="flex items-center gap-4">

					<!-- תמונה + מעגל מילוי -->
					<div class="relative flex-shrink-0">
						{#if layoutUser.avatar_url}
							<img src={layoutUser.avatar_url} alt="avatar"
								class="w-16 h-16 rounded-full object-cover border-2 border-purple-500/40" />
						{:else}
							<div class="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600">
								<svg viewBox="0 0 24 24" class="w-8 h-8 text-gray-400" fill="currentColor">
									<circle cx="12" cy="8" r="4"/>
									<path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
								</svg>
							</div>
						{/if}
						<!-- מעגל אחוזים -->
						<svg class="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
							viewBox="0 0 92 92">
							<circle cx="46" cy="46" r="43" stroke="rgba(255,255,255,0.08)" stroke-width="3" fill="none"/>
							<circle cx="46" cy="46" r="43"
								stroke={ringColor} stroke-width="3" fill="none"
								stroke-linecap="round"
								stroke-dasharray={ringC}
								stroke-dashoffset={ringC * (1 - profileCompletion / 100)}
								style="transition: stroke-dashoffset 0.6s ease; filter: drop-shadow(0 0 4px {ringColor}88);"
							/>
						</svg>
						<!-- % -->
						<span class="absolute -bottom-1 -right-1 text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-[#0f172a]"
							style="background:{ringColor}; color:#000;">
							{profileCompletion}%
						</span>
					</div>

					<!-- שם + הודעות -->
					<div class="flex flex-col gap-1 min-w-0">
						<span class="text-white font-black text-base truncate">
							{layoutUser.nickname || layoutUser.name || currentUser.username}
						</span>
						<span class="text-orange-400 text-xs font-bold">📩 הודעות אישיות</span>
						<span class="text-gray-400 text-xs">לדירוגים שלי ←</span>
					</div>

					<!-- יתרה -->
					<div class="flex-shrink-0 flex flex-col items-center gap-1 mr-auto">
						<img src="/images/wallet.png" alt="ארנק" class="w-10 h-10 object-contain" />
						<span class="text-green-400 text-xs font-black">{layoutUser.balance ?? 0}₪</span>
					</div>

				</div>
			</a>
			{:else if currentUser}
			<a href="/my-ratings" class="profile-btn" onclick={closeAll}>
				{#if currentUser.avatar_url}
				<img src={currentUser.avatar_url} alt="avatar" class="profile-avatar" />
				{:else}
				<span class="profile-avatar-placeholder">👤</span>
				{/if}
				<div class="profile-btn-text">
					<span class="profile-btn-name">{currentUser.username}</span>
					<span class="profile-btn-sub">לדירוגים שלי שלי ←</span>
				</div>
			</a>
			{:else}
			<a href="/login?redirect=/profile" class="login-btn" onclick={closeAll}>
				<div class="anon-avatar-wrap">
					<span class="anon-avatar">
						<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
							<circle cx="20" cy="20" r="20" fill="#374151"/>
							<circle cx="20" cy="16" r="7" fill="#6b7280"/>
							<ellipse cx="20" cy="34" rx="12" ry="8" fill="#6b7280"/>
						</svg>
					</span>
					<span class="login-icon">🔐</span>
				</div>
				<div class="login-btn-text">
					<span class="login-btn-title">התחברות / הרשמה</span>
					<span class="login-btn-sub">לדירוגים שלי שלך ←</span>
				</div>
			</a>
			{/if}
		</div>

		<!-- כותרת הטבות -->
		<div class="section-title">הטבות ארציות <span class="title-gold">יוצאים לחירות</span></div>

		<!-- רשימת פרסומות -->
		<div class="benefits-list">
			{#each ads as ad (ad.id)}
			<a
				href={ad.href}
				target="_blank"
				rel="noopener noreferrer"
				class="benefit-card"
				onclick={closeAll}
			>
				<div class="benefit-img-wrap">
					<!-- שלב 1: תמונה מפוקסלת מהפרונטאנד - נטענת מיד, מוסתרת מאחורי blur -->
					<img
						src={ad.image}
						alt=""
						aria-hidden="true"
						class="benefit-img-thumb"
						decoding="async"
					/>
					<!-- שלב 2: תמונה מלאה - מופיעה בהדרגה אחרי טעינה -->
					<img
						src={ad.image}
						alt={ad.title}
						class="benefit-img"
						decoding="async"
						style={ad.imageScale ? `transform: scale(${ad.imageScale});` : ''}
						onload={(e) => (e.currentTarget as HTMLImageElement).classList.add('loaded')}
					/>
				</div>
				<div class="benefit-body">
					<p class="benefit-title">{ad.title}</p>
					<p class="benefit-desc">{ad.description}</p>
					<span class="benefit-cta">← {ad.cta}</span>
				</div>
			</a>
			{/each}
		</div>
	</div>

	<!-- לשונית מחוברת לקצה הימני של הבאנר, נעה איתו ימינה/שמאלה -->
	<button
		class="tab"
		class:tab-dragging={tabDragging}
		class:tab-collapsed={collapsed && !open}
		style="top: {tabY > 0 ? `${tabY}px` : '80%'}; transform: translateY(-50%);"
		onclick={onTabClick}
		use:nonPassiveTouch
		aria-label="פתח הטבות לקהילה"
	>
		{#if !(collapsed && !open)}
			<span class="tab-text">לדירוגים שלי ולהטבות</span>
		{/if}
	</button>

	</div>

</div>

<style>
	/* ---- Overlay ---- */
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		z-index: 1100;
		cursor: pointer;
		border: none;
		padding: 0;
	}

	/* ---- מערכת drawer+tab שזזה כיחידה אחת ---- */
	.drawer-system {
		position: fixed;
		top: 0;
		left: -340px; /* fallback לדפדפנים בלי min() */
		/* במסכים צרים (הגדלת תצוגה במכשיר) הרוחב מוגבל ל-92vw; ההיסט חייב
		   להתאים לרוחב בפועל — אחרת הלשונית גולשת אל מחוץ למסך משמאל */
		left: calc(-1 * min(340px, 92vw));
		height: 100vh; /* fallback לדפדפנים בלי תמיכה ב-dvh */
		height: 100dvh;
		width: 340px;
		max-width: 92vw;
		z-index: 1200;
		transition: left 0.55s cubic-bezier(0.32, 0.72, 0.24, 1);
		pointer-events: none;
	}

	.drawer-system.is-open {
		left: 0px;
	}

	/* ---- Drawer ---- */
	.drawer {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		width: 100%;
		background: linear-gradient(180deg, #0a0f1e 0%, #070b14 100%);
		border-left: none;
		border-right: 1px solid rgba(99, 102, 241, 0.2);
		display: flex;
		flex-direction: column;
		box-shadow: 8px 0 32px rgba(0, 0, 0, 0.5);
		pointer-events: auto;
	}

	/* ---- כותרת ---- */
	.drawer-header {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		position: relative;
		padding: 0.5rem 1rem;
		flex-shrink: 0;
	}

	/* ---- כותרת סקציה ---- */
	.section-title {
		font-size: 1.25rem;
		font-weight: 900;
		background: linear-gradient(90deg, #38bdf8, #818cf8, #a78bfa);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		text-align: center;
		padding: 0.9rem 1.25rem 0.6rem;
		letter-spacing: 0.05em;
		flex-shrink: 0;
		border-top: 2px solid rgba(56, 189, 248, 0.25);
		text-shadow: none;
		position: relative;
	}

	.section-title::after {
		content: '';
		display: none;
		margin: 0.4rem auto 0;
		width: 48px;
		height: 3px;
		border-radius: 2px;
		background: linear-gradient(90deg, #38bdf8, #818cf8, #a78bfa);
	}

	.drawer-title {
		font-size: 1rem;
		font-weight: 700;
		color: #e0e7ff;
		text-align: center;
	}

	.title-gold {
		color: #fbbf24;
	}

	.close-btn {
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.12);
		color: #9ca3af;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		font-size: 0.8rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}

	.close-btn:hover { background: rgba(255,255,255,0.15); }

	/* ---- כפתור auth ---- */
	.auth-section {
		padding: 0.75rem;
		padding-bottom: 1rem;
		margin-bottom: 0.5rem;
		border-bottom: 1px solid rgba(99,102,241,0.15);
		flex-shrink: 0;
	}

	.profile-btn, .login-btn {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		text-decoration: none;
		transition: background 0.2s;
	}

	.profile-btn {
		background: rgba(99,102,241,0.12);
		border: 1px solid rgba(99,102,241,0.3);
	}
	.profile-btn:hover { background: rgba(99,102,241,0.22); }

	.login-btn {
		background: rgba(250,204,21,0.1);
		border: 1px solid rgba(250,204,21,0.3);
	}
	.login-btn:hover { background: rgba(250,204,21,0.18); }

	.profile-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
		border: 2px solid rgba(99,102,241,0.5);
	}

	.profile-avatar-placeholder {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: rgba(99,102,241,0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.2rem;
		flex-shrink: 0;
	}

	.anon-avatar-wrap {
		position: relative;
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}

	.anon-avatar {
		border-radius: 50%;
		overflow: hidden;
		display: flex;
	}

	.login-icon {
		font-size: 0.9rem;
		position: absolute;
		bottom: -2px;
		left: -4px;
	}

	.profile-btn-text, .login-btn-text {
		display: flex;
		flex-direction: column;
		text-align: right;
		flex: 1;
	}

	.profile-btn-name {
		font-size: 0.9rem;
		font-weight: 700;
		color: #e0e7ff;
	}

	.profile-btn-sub, .login-btn-sub {
		font-size: 0.7rem;
		color: #94a3b8;
	}

	.login-btn-title {
		font-size: 0.9rem;
		font-weight: 700;
		color: #fde047;
	}

	/* ---- רשימת פרסומות ---- */
	.benefits-list {
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		flex: 1;
		min-height: 0;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		scrollbar-width: thin;
		scrollbar-color: rgba(99,102,241,0.3) transparent;
	}

	/* ---- כרטיס פרסומת ---- */
	.benefit-card {
		display: flex;
		gap: 0.75rem;
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(99,102,241,0.15);
		border-radius: 0.75rem;
		text-decoration: none;
		transition: background 0.2s, border-color 0.2s, transform 0.15s;
		padding: 0.75rem;
		align-items: center;
		min-height: 96px;
	}

	.benefit-card:hover {
		background: rgba(99,102,241,0.12);
		border-color: rgba(99,102,241,0.35);
		transform: scale(1.01);
	}

	.benefit-img-wrap {
		position: relative;
		width: 72px;
		height: 72px;
		border-radius: 0.5rem;
		overflow: hidden;
		flex-shrink: 0;
		background: #1e293b;
	}

	/* שלב 1 - תמונה מפוקסלת (מלאה אבל מטושטשת מאוד) */
	.benefit-img-thumb {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: 1;
		filter: blur(12px);
		transform: scale(1.12);
		image-rendering: pixelated;
	}

	/* שלב 2 - תמונה מלאה, מופיעה על גבי ה-thumb */
	.benefit-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: 2;
		opacity: 0;
		transition: opacity 0.5s ease;
	}

	.benefit-img.loaded {
		opacity: 1;
	}

.benefit-body {
		flex: 1;
		min-width: 0;
	}

	.benefit-title {
		font-size: 0.9rem;
		font-weight: 700;
		color: #f1f5f9;
		margin: 0 0 0.2rem;
		line-height: 1.3;
		white-space: normal;
		word-break: break-word;
	}

	.benefit-desc {
		font-size: 0.75rem;
		color: #94a3b8;
		margin: 0 0 0.3rem;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		line-height: 1.4;
	}

	.benefit-cta {
		display: inline-block;
		font-size: 0.7rem;
		color: #a5b4fc;
		font-weight: 600;
		background: rgba(99,102,241,0.12);
		border-radius: 4px;
		padding: 0.15rem 0.45rem;
	}

	/* ---- כרטיס ריק ---- */
	.ad-empty {
		justify-content: center;
		border-style: dashed;
		border-color: rgba(99,102,241,0.3);
		background: transparent;
	}

	.ad-empty-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 0.5rem;
	}

	.ad-empty-icon { font-size: 1.3rem; }
	.ad-empty-text { font-size: 0.75rem; font-weight: 600; color: #6366f1; margin: 0; }
	.ad-empty-sub  { font-size: 0.65rem; color: #64748b; margin: 0; }

	/* ---- לשונית — מחוברת לקצה הימני של ה-drawer בתוך drawer-system ---- */
	.tab {
		position: absolute;
		left: 100%;
		z-index: 2;
		background: linear-gradient(180deg, rgba(79, 70, 229, 0.78), rgba(124, 58, 237, 0.78));
		backdrop-filter: blur(3px);
		-webkit-backdrop-filter: blur(3px);
		border: none;
		border-radius: 0 9px 9px 0;
		padding: 0.6rem 0.3rem;
		cursor: grab;
		box-shadow: 2px 0 6px rgba(79,70,229,0.25);
		transition: padding 0.2s ease, box-shadow 0.2s, border-radius 0.2s;
		touch-action: none;
		overscroll-behavior: contain;
		user-select: none;
		pointer-events: auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
	}

	.tab::after {
		content: '';
		width: 0;
		height: 0;
		border-top: 5px solid transparent;
		border-bottom: 5px solid transparent;
		border-left: 6px solid rgba(255, 255, 255, 0.9);
		filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.4));
	}

	.tab:hover {
		box-shadow: 2px 0 10px rgba(79,70,229,0.45);
	}

	.tab-dragging {
		cursor: grabbing;
		opacity: 0.85;
		transition: none;
	}

	/* מצב מצומצם: רק המשולש נשאר גלוי */
	.tab.tab-collapsed {
		padding: 0.35rem 0.2rem;
		gap: 0;
		border-radius: 0 6px 6px 0;
	}

	.tab.tab-collapsed::after {
		border-top-width: 4px;
		border-bottom-width: 4px;
		border-left-width: 5px;
	}

	.tab-text {
		writing-mode: vertical-rl;
		text-orientation: mixed;
		transform: rotate(180deg);
		font-size: 0.6rem;
		font-weight: 700;
		color: #fff;
		letter-spacing: 0.05em;
	}
</style>
