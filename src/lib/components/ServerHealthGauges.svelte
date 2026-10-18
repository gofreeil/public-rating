<script lang="ts">
	// ============================================================
	// ServerHealthGauges - "לוח מכוונים" למצב שרת ה-VPS (הבאקאנד).
	// מד עומס ראשי 1-10 (ספידומטר) + מדים משניים: מעבד/זיכרון/דיסק/זמן-תגובה,
	// כמו בלוח מכוונים ברכב. הנתונים מגיעים מ-/api/server-health.
	// אין פולינג אוטומטי — ראה ההערה אצל refresh() למטה.
	//
	// המד הראשי משקף את המשאבים בלבד (מעבד/זיכרון/דיסק). זמן התגובה מוצג כמד לעצמו
	// ולא נכנס לציון הכולל: הוא סימפטום של משאב חנוק, לא משאב רביעי. כשהוא איטי
	// באמת מגיע responseAlert מהשרת ומוצגת שורת התרעה נפרדת.
	// ============================================================
	import { onMount, onDestroy, untrack } from 'svelte';
	import type { ServerHealth } from '$lib/serverHealthTypes';

	// live=true: טיימר קל לתווית "עודכן לפני X" + כפתור רענון ידני.
	// live=false (דף הסטטיסטיקה + לוח הניהול): תמונת-מצב מרגע הכניסה בלבד — בלי טיימר ובלי רענון.
	// summaryOnly=true (לוח הניהול): רק המחוג הראשי (הקיצור של כולם), בלי המדים המשניים.
	// mainHref: הופך את כרטיס המחוג הראשי לקישור (לוח הניהול → באנר השעונים בדף הסטטיסטיקה).
	let { initial = null, monthlyVisits = 0, live = true, summaryOnly = false, mainHref = null }:
		{ initial?: ServerHealth | null; monthlyVisits?: number; live?: boolean; summaryOnly?: boolean; mainHref?: string | null } = $props();

	// untrack: תמונת-מצב פותחת מהשרת; מכאן והלאה המדידות מגיעות מהרענון הפנימי
	let health = $state<ServerHealth | null>(untrack(() => initial));
	let loading = $state(false);
	let now = $state(Date.now());

	// ---------- גאומטריית המחוג (חצי-עיגול, 0 משמאל → 10 מימין) ----------
	const CX = 100, CY = 100, R = 82;
	const TAU = Math.PI / 180;
	const deg = (v: number) => v * TAU;
	function pt(r: number, d: number): [number, number] {
		return [CX + r * Math.cos(deg(d)), CY - r * Math.sin(deg(d))];
	}
	// מסלול קשת בין שתי זוויות (דגימת נקודות - חסין מדגלי arc של SVG)
	function arc(r: number, fromDeg: number, toDeg: number): string {
		const step = fromDeg > toDeg ? -3 : 3;
		const pts: [number, number][] = [];
		for (let a = fromDeg; step < 0 ? a > toDeg : a < toDeg; a += step) pts.push(pt(r, a));
		pts.push(pt(r, toDeg));
		return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
	}
	// אחוז ניצולת (0-100) → זווית: 0%→180° (שמאל), 100%→0° (ימין)
	const utilDeg = (util: number) => 180 - (Math.max(0, Math.min(100, util)) / 100) * 180;
	// סיבוב המחוג (מצויר כלפי מעלה) לזווית הערך
	const needleRot = (util: number) => Math.max(0, Math.min(100, util)) * 1.8 - 90;

	// אזורי הצבע קבועים (לא תלויים בערך) - מחושבים פעם אחת
	const ZONE_GREEN = arc(R, utilDeg(0), utilDeg(60));   // 0-60%  ירוק
	const ZONE_AMBER = arc(R, utilDeg(60), utilDeg(85));  // 60-85% כתום
	const ZONE_RED   = arc(R, utilDeg(85), utilDeg(100)); // 85%+   אדום
	// סימוני 0..10 למד הראשי
	const TICKS = Array.from({ length: 11 }, (_, i) => {
		const d = utilDeg(i * 10);
		return { i, in: pt(R - 12, d), out: pt(R - 3, d), lbl: pt(R - 24, d) };
	});

	function zoneColor(util: number): string {
		if (util >= 85) return '#ef4444';
		if (util >= 60) return '#f59e0b';
		return '#22c55e';
	}

	// ---------- טקסטים ----------
	const STATUS: Record<string, { title: string; tone: string; icon: string }> = {
		healthy:  { title: 'השרת נושם בנוחות',                 tone: '#22c55e', icon: '✅' },
		moderate: { title: 'עומס בינוני — עדיין בשליטה',        tone: '#f59e0b', icon: '⚙️' },
		high:     { title: 'עומס גבוה — התחל לתכנן שדרוג',       tone: '#fb923c', icon: '⚠️' },
		critical: { title: 'עומס קריטי — מומלץ לשדרג עכשיו',     tone: '#ef4444', icon: '🔴' },
	};

	function fmtUptime(sec: number): string {
		const d = Math.floor(sec / 86400);
		const h = Math.floor((sec % 86400) / 3600);
		const m = Math.floor((sec % 3600) / 60);
		if (d > 0) return `${d} ימים ${h} שע'`;
		if (h > 0) return `${h} שעות ${m} דק'`;
		return `${m} דקות`;
	}
	function fmtAgo(iso: string): string {
		const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
		if (s < 60) return `לפני ${s} שנ'`;
		return `לפני ${Math.floor(s / 60)} דק'`;
	}
	const nf = new Intl.NumberFormat('he-IL');

	// מגמת העומס: ממוצע-הדקה מול ממוצע-רבע-השעה. תמונת-מצב רגעית לא מבחינה בין
	// קפיצה חולפת לעומס מתמשך, וזו בדיוק ההבחנה שקובעת אם צריך לשדרג או להתעלם.
	const TREND: Record<string, { icon: string; label: string }> = {
		rising:  { icon: '🔺', label: 'עולה' },
		falling: { icon: '🔻', label: 'יורדת' },
		steady:  { icon: '➖', label: 'יציבה' },
	};
	const loadTrend = $derived.by(() => {
		const c = health?.metrics.cpu;
		if (!c) return 'steady';
		const diff = c.load1 - c.load15;
		// שינוי יחסי מול רבע השעה; בעומס אפסי היחס מתפוצץ, ולכן שם נשען על הפרש מוחלט
		const rel = c.load15 > 0.05 ? diff / c.load15 : (Math.abs(diff) > 0.2 ? Math.sign(diff) : 0);
		if (rel > 0.25) return 'rising';
		if (rel < -0.25) return 'falling';
		return 'steady';
	});

	// ---------- רענון ----------
	// אין פולינג אוטומטי - כדי לא להעמיס על השרת. המדד מציג את מצב השרת
	// כפי שנמדד בטעינת הדף (כלומר: מתעדכן בכל פעם שנכנסים ל-/admin), ומעבר לכך
	// רק בלחיצה ידנית על ↻. פותחים את הדף פעם-פעמיים ביום = מתעדכן פעם-פעמיים ביום.
	async function refresh() {
		loading = true;
		try {
			const res = await fetch('/api/server-health', { headers: { accept: 'application/json' } });
			health = res.ok ? await res.json() : null;
		} catch {
			health = null; // אין תקשורת = אינדיקציה בפני עצמה
		} finally {
			loading = false;
		}
	}

	// טיימר קל (ללא רשת) לעדכון תווית "עודכן לפני X" בלבד
	let tick: ReturnType<typeof setInterval>;
	onMount(() => {
		if (live) tick = setInterval(() => (now = Date.now()), 30_000);
		if (!initial) refresh(); // טעינה ראשונית נכשלה בשרת → משיכה אחת בצד-לקוח (חד-פעמי בכניסה)
	});
	onDestroy(() => clearInterval(tick));

	// מדים משניים נגזרים מה-health
	const subGauges = $derived.by(() => {
		const h = health;
		if (!h) return [];
		const m = h.metrics;
		return [
			{ key: 'cpu',  icon: '🔥', label: 'מעבד',     load: m.cpu.load ?? m.cpu.util,  util: m.cpu.util,  score: m.cpu.score,
			  sub: `עומס ${m.cpu.load1} · ${m.cpu.cores} ליבות` },
			{ key: 'ram',  icon: '🧠', label: 'זיכרון RAM', load: m.ram.load ?? m.ram.util,  util: m.ram.util,  score: m.ram.score,
			  sub: `${m.ram.usedGb} / ${m.ram.totalGb} GB` },
			{ key: 'disk', icon: '💾', label: 'דיסק',     load: m.disk?.load ?? m.disk?.util ?? 0, util: m.disk?.util ?? 0, score: m.disk?.score ?? 1,
			  sub: m.disk ? `${m.disk.usedGb} / ${m.disk.totalGb} GB` : 'לא זמין' },
			{ key: 'resp', icon: '⚡', label: 'זמן תגובה', load: m.response.load ?? m.response.util, util: m.response.util, score: m.response.score,
			  sub: m.response.latencyMs == null ? 'אין מדידה' : `${m.response.latencyMs} ms` },
		];
	});
</script>

<div class="panel" dir="rtl">
	<div class="panel-head">
		<div class="title">
			<span class="ico">🖥️</span>
			<div>
				<h2>מצב השרת</h2>
				<p>עומס הבאקאנד — מתי צריך לשדרג{#if live} · לחץ ↻ לרענון{/if}</p>
			</div>
		</div>
		<div class="live">
			{#if health}
				<span class="dot" class:pulsing={!loading} style="background:{STATUS[health.status].tone}"></span>
				<span class="ago">{fmtAgo(health.timestamp)}</span>
			{/if}
			{#if live}
				<button class="refresh" onclick={refresh} disabled={loading} title="רענן עכשיו">
					{loading ? '⏳' : '↻'}
				</button>
			{/if}
		</div>
	</div>

	{#if !health}
		<!-- מצב "אין תקשורת" - כשלעצמו האינדיקציה החזקה ביותר -->
		<div class="offline">
			<div class="off-ico">🔌</div>
			<div>
				<div class="off-title">אין תקשורת עם השרת</div>
				<div class="off-sub">הבאקאנד לא הגיב. ייתכן שהשרת עמוס מדי, מופעל מחדש, או למטה.</div>
			</div>
		</div>
	{:else}
		{@const st = STATUS[health.status]}
		<div class="grid" class:solo={summaryOnly}>
			<!-- מד ראשי (כש-mainHref מוגדר — קישור לבאנר השעונים המלא) -->
			<svelte:element
				this={mainHref ? 'a' : 'div'}
				href={mainHref ?? undefined}
				title={mainHref ? 'לכל שעוני השרת — דף הסטטיסטיקה' : undefined}
				class="main-card"
				class:clickable={!!mainHref}
				style="--tone:{st.tone}"
			>
				<div class="dial big">
					<svg viewBox="0 0 200 118" role="img" aria-label="עומס כללי {health.score} מתוך 10">
						<path d={ZONE_GREEN} class="track" stroke="#22c55e" />
						<path d={ZONE_AMBER} class="track" stroke="#f59e0b" />
						<path d={ZONE_RED}   class="track" stroke="#ef4444" />
						{#each TICKS as t}
							<line x1={t.in[0]} y1={t.in[1]} x2={t.out[0]} y2={t.out[1]} class="tick" />
							<text x={t.lbl[0]} y={t.lbl[1] + 3} class="tick-lbl">{t.i}</text>
						{/each}
						<g class="needle" style="transform:rotate({needleRot(health.load ?? health.util)}deg)">
							<polygon points="{CX-4},{CY} {CX+4},{CY} {CX},{CY - (R - 20)}" fill={st.tone} />
						</g>
						<circle cx={CX} cy={CY} r="8" class="hub" />
						<circle cx={CX} cy={CY} r="3" fill={st.tone} />
					</svg>
					<div class="readout">
						<div class="score" style="color:{st.tone}">{health.score}<span class="max">/10</span></div>
					</div>
				</div>
				<div class="status-line" style="color:{st.tone}">
					<span class="s-ico">{st.icon}</span> {st.title}
				</div>
				{#if health.score >= 7}
					<div class="bottleneck">צוואר הבקבוק כרגע: <b>{health.bottleneck.label}</b> ({health.util}%)</div>
				{:else}
					<div class="bottleneck subtle">המשאב העמוס ביותר: <b>{health.bottleneck.label}</b> ({health.util}%)</div>
				{/if}
				<!-- התרעה עצמאית: DB איטי. לא מנפחת את הציון הכולל, אבל גם לא נבלעת בו -->
				{#if health.responseAlert}
					<div class="resp-alert">
						⚡ הדאטהבייס מגיב לאט (<b>{health.metrics.response.latencyMs} ms</b>)
						<span class="hint">שאילתת בדיקה ריקה לא אמורה לקחת יותר מכמה מילישניות. לרוב זה סימפטום של משאב חנוק ולא תקלה בדאטהבייס עצמו.</span>
					</div>
				{/if}
			</svelte:element>

			<!-- מדים משניים (מוסתרים כשמוצג רק המחוג הראשי) -->
			{#if !summaryOnly}
			<div class="mini-grid">
				{#each subGauges as g (g.key)}
					{@const c = zoneColor(g.load)}
					<div class="mini-card">
						<div class="mini-head"><span>{g.icon}</span> {g.label}</div>
						<div class="dial mini">
							<svg viewBox="0 0 200 118" role="img" aria-label="{g.label} {g.util}%">
								<path d={ZONE_GREEN} class="track thin" stroke="#22c55e" />
								<path d={ZONE_AMBER} class="track thin" stroke="#f59e0b" />
								<path d={ZONE_RED}   class="track thin" stroke="#ef4444" />
								<g class="needle" style="transform:rotate({needleRot(g.load)}deg)">
									<polygon points="{CX-3.5},{CY} {CX+3.5},{CY} {CX},{CY - (R - 24)}" fill={c} />
								</g>
								<circle cx={CX} cy={CY} r="6" class="hub" />
							</svg>
							<div class="readout">
								<div class="mscore" style="color:{c}">{g.score}<span class="max">/10</span></div>
								<div class="mutil">{g.util}%</div>
							</div>
						</div>
						<div class="mini-sub">{g.sub}</div>
					</div>
				{/each}
			</div>
			{/if}
		</div>

		<!-- שורת מידע -->
		<div class="info">
			<div class="chip"><span>⏱️</span> פעילות: <b>{fmtUptime(health.uptimeSec)}</b></div>
			<div class="chip"><span>🧩</span> ליבות: <b>{health.metrics.cpu.cores}</b></div>
			<!-- באתר הדירוג אין מונה כניסות משלו — הצ'יפ מוצג רק כשמועבר מונה -->
			{#if monthlyVisits > 0}
				<div class="chip"><span>📈</span> כניסות החודש: <b>{nf.format(monthlyVisits)}</b></div>
			{/if}
			<!-- מגמת העומס (1 / 5 / 15 דק') — עונה על מה שתמונת-מצב רגעית לא יכולה -->
			<div class="chip" title="ממוצע עומס המעבד ב-1 / 5 / 15 הדקות האחרונות">
				<span>{TREND[loadTrend].icon}</span> מגמת עומס:
				<b dir="ltr">{health.metrics.cpu.load1} · {health.metrics.cpu.load5} · {health.metrics.cpu.load15}</b>
				<span class="trend-lbl">{TREND[loadTrend].label}</span>
			</div>
			<!-- תגובת DB רק כשהמדים המשניים מוסתרים; אחרת זו כפילות של מד "זמן תגובה" שלצידו -->
			{#if summaryOnly && health.metrics.response.latencyMs != null}
				<div class="chip"><span>⚡</span> תגובת DB: <b>{health.metrics.response.latencyMs} ms</b></div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.panel {
		background: linear-gradient(160deg, #0b1220, #0f172a);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 1.25rem;
		padding: 1.25rem 1.25rem 1rem;
	}
	.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
	.title { display: flex; align-items: center; gap: 0.7rem; }
	.title .ico { font-size: 1.8rem; }
	.title h2 { font-size: 1.35rem; font-weight: 900; color: #fff; line-height: 1.1; }
	.title p { font-size: 0.8rem; color: #94a3b8; margin-top: 2px; }
	.live { display: flex; align-items: center; gap: 0.55rem; }
	.dot { width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 8px currentColor; }
	.dot.pulsing { animation: pulse 2s ease-in-out infinite; }
	@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
	.ago { font-size: 0.72rem; color: #64748b; }
	.refresh {
		background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
		color: #cbd5e1; width: 32px; height: 32px; border-radius: 0.6rem; cursor: pointer; font-size: 1rem;
		transition: background .15s;
	}
	.refresh:hover:not(:disabled) { background: rgba(255,255,255,0.12); }
	.refresh:disabled { cursor: default; opacity: 0.6; }

	.grid { display: grid; grid-template-columns: minmax(240px, 1fr) 2fr; gap: 1rem; }
	@media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
	/* summaryOnly: רק המחוג הראשי, טור יחיד */
	.grid.solo { grid-template-columns: 1fr; }
	.grid.solo .main-card { max-width: 340px; margin-inline: auto; }

	.main-card {
		background: rgba(255,255,255,0.03); border: 1px solid var(--tone);
		border-radius: 1rem; padding: 0.75rem 1rem 1rem; text-align: center;
		box-shadow: 0 0 24px -12px var(--tone);
		display: flex; flex-direction: column; align-items: center;
	}
	.main-card.clickable { cursor: pointer; text-decoration: none; color: inherit; transition: transform .2s, box-shadow .2s; }
	.main-card.clickable:hover { transform: translateY(-2px); box-shadow: 0 0 30px -8px var(--tone); }
	.dial { position: relative; width: 100%; }
	.dial.big { max-width: 300px; }
	.dial.mini { max-width: 190px; }
	.dial svg { width: 100%; height: auto; display: block; overflow: visible; }
	.track { fill: none; stroke-width: 14; stroke-linecap: round; opacity: 0.9; }
	.track.thin { stroke-width: 10; }
	.tick { stroke: rgba(255,255,255,0.35); stroke-width: 1.5; }
	.tick-lbl { fill: #94a3b8; font-size: 9px; font-weight: 700; text-anchor: middle; }
	.hub { fill: #0f172a; stroke: rgba(255,255,255,0.4); stroke-width: 1.5; }
	.needle {
		transform-box: view-box;
		transform-origin: 100px 100px;
		transition: transform .8s cubic-bezier(.34, 1.56, .64, 1);
	}

	.readout { position: absolute; left: 0; right: 0; bottom: 2px; text-align: center; }
	/* הזזה קלה שמאלה כדי שהמספר לא יישב על בסיס המחוג כשהוא עומד כמעט זקוף */
	.score { font-size: 2.6rem; font-weight: 900; line-height: 1; transform: translateX(-7px); }
	.mscore { font-size: 1.5rem; font-weight: 900; line-height: 1; }
	.max { font-size: 0.9rem; font-weight: 700; color: #64748b; }
	.mscore .max { font-size: 0.7rem; }
	.mutil { font-size: 0.7rem; color: #94a3b8; font-weight: 700; margin-top: 1px; }

	.status-line { font-size: 1rem; font-weight: 800; margin-top: 0.35rem; }
	.s-ico { margin-inline-end: 2px; }
	.bottleneck { font-size: 0.8rem; color: #cbd5e1; margin-top: 0.35rem; }
	.bottleneck.subtle { color: #94a3b8; }
	.bottleneck b { color: #fff; }

	/* התרעת DB איטי - נבדלת ויזואלית מצוואר הבקבוק, כי היא סימפטום ולא משאב */
	.resp-alert {
		font-size: 0.78rem; color: #fcd34d; margin-top: 0.5rem;
		background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.3);
		border-radius: 0.6rem; padding: 0.4rem 0.55rem; text-align: start;
	}
	.resp-alert b { color: #fff; font-weight: 800; }
	.resp-alert .hint { display: block; color: #94a3b8; font-size: 0.7rem; margin-top: 2px; font-weight: 600; line-height: 1.35; }

	.trend-lbl { color: #94a3b8; font-size: 0.72rem; }

	.mini-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; }
	@media (max-width: 640px) { .mini-grid { grid-template-columns: repeat(2, 1fr); } }
	.mini-card {
		background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
		border-radius: 0.9rem; padding: 0.5rem 0.4rem 0.6rem; text-align: center;
	}
	.mini-head { font-size: 0.8rem; font-weight: 800; color: #e2e8f0; display: flex; align-items: center; justify-content: center; gap: 0.3rem; }
	.mini-sub { font-size: 0.72rem; color: #94a3b8; margin-top: 0.1rem; font-weight: 600; direction: ltr; }

	.info { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; padding-top: 0.85rem; border-top: 1px solid rgba(255,255,255,0.07); }
	.chip {
		font-size: 0.78rem; color: #cbd5e1; background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08); border-radius: 0.6rem; padding: 0.3rem 0.6rem;
		display: flex; align-items: center; gap: 0.35rem;
	}
	.chip b { color: #fff; font-weight: 800; }

	.offline { display: flex; align-items: center; gap: 1rem; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.35); border-radius: 1rem; padding: 1.1rem 1.25rem; }
	.off-ico { font-size: 2rem; }
	.off-title { font-size: 1.05rem; font-weight: 900; color: #fca5a5; }
	.off-sub { font-size: 0.85rem; color: #cbd5e1; margin-top: 2px; }
</style>
