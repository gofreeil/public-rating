<script lang="ts">
	import { goto } from '$app/navigation';
	import { coinAnim } from '$lib/coinAnimationState.svelte';

	// Stage: 1=burst, 2=travel, 3=fill bag, 4=summary+countdown
	let stage = $state(0);
	let countdown = $state(3);
	let displayTotal = $state(0);
	let prevTotal = $state(0);

	$effect(() => {
		if (!coinAnim.active) { stage = 0; return; }

		const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		prevTotal = coinAnim.newFundTotal - coinAnim.amount;

		if (prefersReduced) {
			// דלג ישירות לסיכום ללא אנימציה
			displayTotal = coinAnim.newFundTotal;
			stage = 4;
			countdown = 3;
			const cd = setInterval(() => {
				countdown--;
				if (countdown <= 0) {
					clearInterval(cd);
					coinAnim.reset();
					goto('/');
				}
			}, 1000);
			return () => clearInterval(cd);
		}

		stage = 1;

		// Stage 1 → 2 after 1.8s
		const t1 = setTimeout(() => { stage = 2; }, 1800);

		// Stage 2 → 3 after 3.8s
		const t2 = setTimeout(() => {
			stage = 3;
			// counter tick
			displayTotal = prevTotal;
			const target = coinAnim.newFundTotal;
			const steps  = 40;
			const inc    = (target - prevTotal) / steps;
			let   i      = 0;
			const ticker = setInterval(() => {
				i++;
				displayTotal = Math.round(prevTotal + inc * i);
				if (i >= steps) { displayTotal = target; clearInterval(ticker); }
			}, 40);
		}, 3800);

		// Stage 3 → 4 after 6.3s
		const t3 = setTimeout(() => {
			stage = 4;
			countdown = 3;
			const cd = setInterval(() => {
				countdown--;
				if (countdown <= 0) {
					clearInterval(cd);
					coinAnim.reset();
					goto('/');
				}
			}, 1000);
		}, 6300);

		return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
	});

	// coin positions for burst stage (angle in degrees)
	const coinAngles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
</script>

{#if coinAnim.active}
<div class="overlay" role="dialog" aria-modal="true" aria-label="העברת מעשר לקופת העיר">

	<!-- ===== STAGE 1: coins burst ===== -->
	{#if stage === 1}
	<div class="stage stage1">
		<div class="stage1-coins">
			{#each coinAngles as angle, i}
			<svg class="coin-s1" style="--angle:{angle}deg; --delay:{i * 0.08}s"
				viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
				<ellipse cx="20" cy="24" rx="17" ry="7" fill="#92400e" opacity="0.5"/>
				<ellipse cx="20" cy="20" rx="17" ry="17" fill="url(#cg-burst)"/>
				<ellipse cx="20" cy="20" rx="14" ry="14" fill="#fbbf24"/>
				<text x="20" y="25" text-anchor="middle" font-size="13" fill="#92400e" font-weight="bold">₪</text>
				<defs>
					<radialGradient id="cg-burst" cx="35%" cy="30%" r="70%">
						<stop offset="0%" stop-color="#fef9c3"/>
						<stop offset="50%" stop-color="#fbbf24"/>
						<stop offset="100%" stop-color="#92400e"/>
					</radialGradient>
				</defs>
			</svg>
			{/each}
		</div>
		<p class="stage-label">מעביר מעשר לקופת העיר...</p>
	</div>
	{/if}

	<!-- ===== STAGE 2: travel ===== -->
	{#if stage === 2}
	<div class="stage stage2">
		<div class="travel-row">
			<div class="travel-source">
				<span class="travel-icon">📋</span>
				<span class="travel-sub">הזמנה</span>
			</div>
			<div class="travel-path">
				<svg class="path-svg" viewBox="0 0 260 60" xmlns="http://www.w3.org/2000/svg">
					<path d="M10 30 Q130 5 250 30" stroke="#fbbf24" stroke-width="2"
						stroke-dasharray="8 5" fill="none" opacity="0.6"/>
					<!-- animated coin along path -->
					<circle r="10" fill="#fbbf24">
						<animateMotion dur="1.8s" repeatCount="indefinite"
							path="M10 30 Q130 5 250 30"/>
					</circle>
					<text text-anchor="middle" font-size="9" fill="#92400e" font-weight="bold">
						<textPath href="#tp" startOffset="50%">₪</textPath>
					</text>
					<path id="tp" d="M10 30 Q130 5 250 30" fill="none"/>
				</svg>
			</div>
			<div class="travel-dest">
				<img src="/images/kupat-hair.png" alt="קופת העיר" class="travel-bag"/>
				<span class="travel-sub">קופת העיר</span>
			</div>
		</div>
		<p class="stage-amount">₪{coinAnim.amount.toLocaleString('he-IL')} מועברים לקופה</p>
	</div>
	{/if}

	<!-- ===== STAGE 3: bag fills ===== -->
	{#if stage === 3}
	<div class="stage stage3">
		<div class="bag-wrap">
			<div class="falling-coins" aria-hidden="true">
				{#each [0,1,2,3,4,5] as i}
				<svg class="coin-fall" style="--fi:{i}"
					viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
					<ellipse cx="15" cy="15" rx="13" ry="13" fill="#fbbf24"/>
					<text x="15" y="20" text-anchor="middle" font-size="11" fill="#92400e" font-weight="bold">₪</text>
				</svg>
				{/each}
			</div>
			<img src="/images/kupat-hair.png" alt="קופת העיר" class="bag-fill"/>
		</div>
		<div class="counter-wrap">
			<span class="counter-label">סכום בקופה</span>
			<span class="counter-value">₪{displayTotal.toLocaleString('he-IL')}</span>
		</div>
	</div>
	{/if}

	<!-- ===== STAGE 4: summary ===== -->
	{#if stage === 4}
	<div class="stage stage4">
		<div class="summary-card">
			<div class="summary-emoji">🙏</div>
			<h2 class="summary-title">תודה שתרמת לקופת העיר!</h2>
			<div class="summary-rows">
				<div class="summary-row">
					<span class="sr-label">שילמת</span>
					<span class="sr-value">₪{coinAnim.orderTotal.toLocaleString('he-IL')}</span>
				</div>
				<div class="summary-row highlight">
					<span class="sr-label">תרמת לקופה (10%)</span>
					<span class="sr-value gold">₪{coinAnim.amount.toLocaleString('he-IL')}</span>
				</div>
				<div class="summary-row">
					<span class="sr-label">סה"כ בקופה כעת</span>
					<span class="sr-value">₪{coinAnim.newFundTotal.toLocaleString('he-IL')}</span>
				</div>
			</div>
			<p class="summary-email">📧 הפרטים והקבלה יישלחו לאימייל שלך</p>
			<p class="summary-countdown">חוזר לדף הבית בעוד {countdown}...</p>
		</div>
	</div>
	{/if}

</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: rgba(4, 8, 20, 0.95);
		display: flex;
		align-items: center;
		justify-content: center;
		direction: rtl;
	}

	/* ---- shared stage ---- */
	.stage {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2rem;
		animation: fadeIn 0.4s ease-out;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: scale(0.95); }
		to   { opacity: 1; transform: scale(1); }
	}

	.stage-label {
		font-size: 1.4rem;
		font-weight: 700;
		color: #fde68a;
		text-align: center;
	}

	/* ---- stage 1: burst ---- */
	.stage1-coins {
		position: relative;
		width: 260px;
		height: 260px;
	}

	.coin-s1 {
		position: absolute;
		width: 40px;
		height: 40px;
		top: 50%;
		left: 50%;
		transform-origin: center;
		animation: coin-burst 1.4s cubic-bezier(0.2, 0.8, 0.4, 1) both;
		animation-delay: var(--delay);
	}

	@keyframes coin-burst {
		0%   { transform: translate(-50%, -50%) rotate(0deg) scale(0); opacity: 1; }
		60%  { opacity: 1; }
		100% {
			transform:
				translate(
					calc(-50% + cos(var(--angle)) * 110px),
					calc(-50% + sin(var(--angle)) * 110px)
				)
				rotate(720deg)
				scale(1);
			opacity: 0;
		}
	}

	/* ---- stage 2: travel ---- */
	.travel-row {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.travel-source, .travel-dest {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
	}

	.travel-icon { font-size: 2.5rem; }

	.travel-bag {
		width: 90px;
		height: auto;
		filter: drop-shadow(0 0 12px rgba(251,191,36,0.5));
	}

	.travel-sub {
		font-size: 0.8rem;
		color: #9ca3af;
	}

	.path-svg {
		width: 260px;
		height: 60px;
	}

	.stage-amount {
		font-size: 1.8rem;
		font-weight: 900;
		color: #fbbf24;
		text-shadow: 0 0 20px rgba(251,191,36,0.6);
	}

	/* ---- stage 3: fill bag ---- */
	.bag-wrap {
		position: relative;
		width: 240px;
	}

	.bag-fill {
		width: 240px;
		height: auto;
		filter: drop-shadow(0 0 20px rgba(251,191,36,0.4));
	}

	.falling-coins {
		position: absolute;
		top: -30px;
		left: 50%;
		transform: translateX(-50%);
		width: 120px;
		height: 30px;
	}

	.coin-fall {
		position: absolute;
		width: 24px;
		height: 24px;
		animation: coin-rain 0.9s ease-in infinite;
		animation-delay: calc(var(--fi) * 0.15s);
		left: calc(var(--fi) * 18px + 4px);
		opacity: 0;
	}

	@keyframes coin-rain {
		0%   { opacity: 0;   transform: translateY(0)     rotate(0deg); }
		15%  { opacity: 1; }
		80%  { opacity: 0.8; }
		100% { opacity: 0;   transform: translateY(50px)  rotate(180deg); }
	}

	.counter-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.counter-label {
		font-size: 0.85rem;
		color: #86efac;
		font-weight: 700;
		letter-spacing: 0.05em;
	}

	.counter-value {
		font-size: 2.5rem;
		font-weight: 900;
		color: #ffffff;
		line-height: 1;
	}

	/* ---- stage 4: summary ---- */
	.summary-card {
		background: linear-gradient(135deg, rgba(30,20,5,0.95), rgba(10,8,2,0.98));
		border: 1px solid rgba(251,191,36,0.35);
		border-radius: 1.5rem;
		padding: 2.5rem 2rem;
		max-width: 380px;
		width: 90vw;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		box-shadow: 0 0 60px rgba(251,191,36,0.15);
	}

	.summary-emoji { font-size: 3rem; }

	.summary-title {
		font-size: 1.4rem;
		font-weight: 900;
		color: #fde68a;
		text-align: center;
		margin: 0;
	}

	.summary-rows {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		background: rgba(255,255,255,0.04);
	}

	.summary-row.highlight {
		background: rgba(251,191,36,0.1);
		border: 1px solid rgba(251,191,36,0.25);
	}

	.sr-label { font-size: 0.9rem; color: #9ca3af; }
	.sr-value { font-size: 1rem; font-weight: 700; color: #fff; }
	.sr-value.gold { color: #fbbf24; }

	.summary-email {
		font-size: 0.85rem;
		color: #6b7280;
		text-align: center;
		margin: 0;
	}

	.summary-countdown {
		font-size: 0.95rem;
		color: #fbbf24;
		font-weight: 700;
		margin: 0;
		animation: pulse-cd 1s ease-in-out infinite;
	}

	@keyframes pulse-cd {
		0%, 100% { opacity: 1; }
		50%       { opacity: 0.5; }
	}
</style>
