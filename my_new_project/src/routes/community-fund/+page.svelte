<script lang="ts">
	import { onMount } from 'svelte';

	let wishText = $state('');
	let showSuccess = $state(false);

	let totalDonated     = $state(0);
	let totalDistributed = $state(0);

	onMount(async () => {
		try {
			const res = await fetch('/api/community-fund');
			if (res.ok) {
				const data = await res.json();
				totalDonated     = data.totalDonated     ?? 0;
				totalDistributed = data.totalDistributed ?? 0;
			}
		} catch {
			// אם ה-API לא זמין - נשאר 0
		}
	});

	function handleSubmit() {
		if (!wishText.trim()) {
			alert('נא לכתוב את המשאלה שלך');
			return;
		}
		showSuccess = true;
		setTimeout(() => {
			showSuccess = false;
			wishText = '';
		}, 3000);
	}
</script>

<div class="min-h-screen py-12 px-4">
	<div class="max-w-4xl mx-auto">

		<!-- כותרת -->
		<div class="text-center mb-8">
			<h2 class="text-4xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
				🙏 כותל המשאלות
			</h2>
			<p class="text-gray-300 text-lg">
				מקום לחלוק את המשאלות והחלומות שלך עם הקהילה
			</p>
		</div>

		<!-- ===== קופת העיר ===== -->
		<div class="text-center mb-10 fund-bg">
			<h2 class="text-2xl font-bold text-yellow-300 mb-6">קופת העיר</h2>

			<!-- תמונת קופת העיר -->
			<div class="bag-scene">
				<!-- אנימציית מטבעות - מושהית לשימוש עתידי
				<svg class="coins-svg" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
					<defs>
						<radialGradient id="cg1" cx="35%" cy="30%" r="70%">
							<stop offset="0%" stop-color="#fef9c3"/>
							<stop offset="45%" stop-color="#fbbf24"/>
							<stop offset="100%" stop-color="#92400e"/>
						</radialGradient>
					</defs>
					<g class="coin-anim c1">
						<ellipse cx="60" cy="30" rx="14" ry="6" fill="url(#cg1)"/>
						<ellipse cx="60" cy="27" rx="14" ry="6" fill="#fde68a"/>
						<ellipse cx="60" cy="27" rx="12" ry="4.5" fill="#fbbf24"/>
						<text x="60" y="29.5" text-anchor="middle" font-size="6" fill="#92400e" font-weight="bold">₪</text>
					</g>
					<g class="coin-anim c2">
						<ellipse cx="100" cy="20" rx="14" ry="6" fill="url(#cg1)"/>
						<ellipse cx="100" cy="17" rx="14" ry="6" fill="#fde68a"/>
						<ellipse cx="100" cy="17" rx="12" ry="4.5" fill="#fbbf24"/>
						<text x="100" y="19.5" text-anchor="middle" font-size="6" fill="#92400e" font-weight="bold">₪</text>
					</g>
					<g class="coin-anim c3">
						<ellipse cx="140" cy="30" rx="14" ry="6" fill="url(#cg1)"/>
						<ellipse cx="140" cy="27" rx="14" ry="6" fill="#fde68a"/>
						<ellipse cx="140" cy="27" rx="12" ry="4.5" fill="#fbbf24"/>
						<text x="140" y="29.5" text-anchor="middle" font-size="6" fill="#92400e" font-weight="bold">₪</text>
					</g>
				</svg>
				-->

				<img
					src="/images/קופת העיר.png"
					alt="קופת העיר"
					class="bag-img"
				/>
			</div>

		<!-- סטטיסטיקות -->
		<div class="stats-row">
			<div class="stat-item">
				<span class="stat-label-green">נצבר בקופה</span>
				<span class="stat-value">₪{totalDonated.toLocaleString('he-IL')}</span>
				<span class="stat-sub">סכום כולל שהתקבל מתרומות</span>
			</div>
			<div class="stat-divider"></div>
			<div class="stat-item">
				<span class="stat-label-blue">חולק מהקופה</span>
				<span class="stat-value">₪{totalDistributed.toLocaleString('he-IL')}</span>
				<span class="stat-sub">סכום שחולק מתחילת הפעילות</span>
			</div>
		</div>
		</div>
		<!-- ===== סוף קופת העיר ===== -->

		<!-- מידע על כותל המשאלות -->
		<div class="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-2xl p-6 mb-8 backdrop-blur-sm">
			<h2 class="text-2xl font-bold text-white mb-4 flex items-center gap-2">
				<span>✨</span>
				מה זה כותל המשאלות?
			</h2>
			<p class="text-gray-300 mb-4">
				כותל המשאלות הוא מקום מיוחד בו חברי הקהילה יכולים לחלוק את המשאלות, החלומות והתקוות שלהם.
				כל משאלה נכתבת באהבה ובתקווה שתתגשם.
			</p>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
				<div class="bg-blue-600/20 p-4 rounded-lg border border-blue-500/30">
					<div class="text-3xl mb-2">💫</div>
					<h3 class="font-bold text-white mb-1">משאלות אישיות</h3>
					<p class="text-sm text-gray-400">חלוק את החלומות שלך</p>
				</div>
				<div class="bg-purple-600/20 p-4 rounded-lg border border-purple-500/30">
					<div class="text-3xl mb-2">🤲</div>
					<h3 class="font-bold text-white mb-1">תמיכה קהילתית</h3>
					<p class="text-sm text-gray-400">הקהילה תומכת במשאלות</p>
				</div>
				<div class="bg-pink-600/20 p-4 rounded-lg border border-pink-500/30">
					<div class="text-3xl mb-2">🌟</div>
					<h3 class="font-bold text-white mb-1">כוח החלום</h3>
					<p class="text-sm text-gray-400">כל משאלה יכולה להתגשם</p>
				</div>
			</div>
		</div>

		<!-- טופס הוספת משאלה -->
		<div class="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-8 backdrop-blur-sm">
			<h3 class="text-2xl font-bold text-white mb-6">הוסף משאלה</h3>
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-6" novalidate>
				<div>
					<label for="wish-input" class="block text-white font-bold mb-2">
						המשאלה שלך
						<span class="text-red-400 mr-1" aria-hidden="true">*</span>
						<span class="sr-only">(שדה חובה)</span>
					</label>
					<textarea
						id="wish-input"
						bind:value={wishText}
						placeholder="כתוב כאן את המשאלה שלך..."
						rows="6"
						required
						aria-required="true"
						class="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
					></textarea>
					<p class="text-sm text-gray-400 mt-2" aria-live="polite">💡 טיפ: כתוב משאלה חיובית ומלאת תקווה</p>
				</div>
				<button
					type="submit"
					class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 rounded-lg transition-all hover:scale-105 shadow-lg"
				>
					🙏 הוסף משאלה לכותל
				</button>
			</form>
		</div>

		<!-- הודעת הצלחה – aria-live מבטיח שקורא מסך יכריז עליה -->
		<div
            role="status"
            aria-live="assertive"
            aria-atomic="true"
        >
            {#if showSuccess}
                <div class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-slideDown">
                    <div class="bg-green-600 text-white px-8 py-6 rounded-xl shadow-2xl border-2 border-green-400">
                        <div class="flex items-center gap-4">
                            <span class="text-4xl" aria-hidden="true">✨</span>
                            <div>
                                <p class="font-bold text-xl">המשאלה נוספה בהצלחה!</p>
                                <p class="text-sm text-green-100">המשאלה שלך נוספה לכותל</p>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}
        </div>

		<!-- חזרה לדף הבית -->
		<div class="text-center mt-8">
			<a
				href="/"
				class="inline-block bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-all"
			>
				← חזרה לדף הבית
			</a>
		</div>
	</div>
</div>

<style>
	/* ===== רקע סקציית הקופה ===== */
	.fund-bg {
		background: linear-gradient(to bottom,
			#070b14 0%,
			#000000 8%,
			#000000 92%,
			#070b14 100%
		);
		padding-top: 1.5rem;
		padding-bottom: 1.5rem;
		margin-left: -1rem;
		margin-right: -1rem;
		padding-left: 1rem;
		padding-right: 1rem;
	}

	/* ===== סצנת הקופה ===== */
	.bag-scene {
		position: relative;
		width: 100%;
		max-width: 480px;
		margin: 0 auto 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.bag-img {
		width: 480px;
		height: auto;
		filter: drop-shadow(0 0 18px rgba(251,191,36,0.25));
		object-fit: contain;
		/* קצוות רכים אחידים מכל הצדדים */
		mask-image:
			linear-gradient(to right,  transparent 0%, black 12%, black 88%, transparent 100%),
			linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%);
		mask-composite: intersect;
		-webkit-mask-image:
			linear-gradient(to right,  transparent 0%, black 12%, black 88%, transparent 100%),
			linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%);
		-webkit-mask-composite: source-in;
	}

	@keyframes bag-bob {
		0%, 100% { transform: translateY(0); }
		50%       { transform: translateY(-7px); }
	}

	/* ===== שורות סטטיסטיקה ===== */
	.stats-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0;
		flex-wrap: wrap;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 0.75rem 2.5rem;
	}

	.stat-divider {
		width: 1px;
		height: 60px;
		background: rgba(255,255,255,0.15);
	}

	.stat-label-green {
		font-size: 0.8rem;
		font-weight: 700;
		color: #86efac;
		letter-spacing: 0.05em;
	}

	.stat-label-blue {
		font-size: 0.8rem;
		font-weight: 700;
		color: #93c5fd;
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 900;
		color: #ffffff;
		line-height: 1;
	}

	.stat-sub {
		font-size: 0.72rem;
		color: #6b7280;
	}

	/* ===== הודעת הצלחה ===== */
	@keyframes slideDown {
		from { opacity: 0; transform: translate(-50%, -60%); }
		to   { opacity: 1; transform: translate(-50%, -50%); }
	}
	.animate-slideDown {
		animation: slideDown 0.3s ease-out;
	}
</style>
