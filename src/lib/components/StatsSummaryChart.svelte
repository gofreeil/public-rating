<script lang="ts">
	// ============================================================
	// StatsSummaryChart - "הגרף הראשי" (הועתק מקהילה בשכונה): כמה סדרות לפי
	// חודש בשנה הנוכחית, בקנה-מידה משותף — גובה כל מלבן משקף את המספר בפועל.
	// הנתונים מגיעים מה-load של הדף, הרכיב רק מצייר.
	// ============================================================
	type MonthCount = { month: string; count: number };
	type Series = { key: string; label: string; byMonth: MonthCount[]; bar: string; dot: string; text: string };

	let { series, title = 'סקירה כללית' }: { series: Series[]; title?: string } = $props();

	const MONTH_NAMES = [
		'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
		'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
	];
	const MONTH_SHORT = [
		'ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני',
		'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳',
	];

	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonthIdx = now.getMonth();
	const fmt = (n: number) => n.toLocaleString('he-IL');

	// סדרה של 12 חודשים לשנה הנוכחית מתוך { month:"YYYY-MM", count }
	const monthsOfYear = (byMonth: MonthCount[]): number[] => {
		const m = new Map(byMonth.map((r) => [r.month, r.count]));
		return Array.from({ length: 12 }, (_, i) => m.get(`${currentYear}-${String(i + 1).padStart(2, '0')}`) ?? 0);
	};

	const rows = $derived(series.map((s) => ({ ...s, data: monthsOfYear(s.byMonth) })));
	const months = Array.from({ length: 12 }, (_, i) => i);
	const max = $derived(Math.max(1, ...rows.flatMap((s) => s.data)));
</script>

<div class="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-3 sm:p-4">
	<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
		<h2 class="text-base font-black">📊 {title} · {currentYear}</h2>
		<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
			{#each rows as s (s.key)}
				<span class="flex items-center gap-1.5 text-xs text-gray-300">
					<span class="h-2.5 w-2.5 rounded-sm {s.dot}"></span>
					<span class="font-bold">{s.label}</span>
				</span>
			{/each}
		</div>
	</div>
	<!-- עמודות לכל חודש: מלבנים חופפים חלקית (הנמוך מקדימה) עם מספר מעל כל אחד -->
	<div class="flex h-40 items-end gap-1 border-b border-white/10 pb-px sm:gap-2">
		{#each months as mi (mi)}
			<div class="isolate flex h-full min-w-0 flex-1 items-end justify-center" title={`${MONTH_NAMES[mi]} · ${rows.map((s) => `${s.label} ${fmt(s.data[mi])}`).join(' · ')}`}>
				{#each rows as s, si (s.key)}
					{@const val = s.data[mi]}
					<div class="relative flex h-full w-[46%] flex-col items-center justify-end" style="z-index: {Math.round(999 - val)}; margin-inline-start: {si === 0 ? '0' : '-0.6rem'}">
						<div class="mb-0.5 text-[9px] leading-none font-black tabular-nums sm:text-[10px] {s.text} {val === 0 ? 'opacity-0' : ''}">{fmt(val)}</div>
						<div class="w-full rounded-t bg-gradient-to-t {s.bar} shadow-md ring-1 ring-black/25 transition-all duration-500 hover:brightness-125" style="height: {val === 0 ? 0 : Math.max(2, (val / max) * 82)}%"></div>
					</div>
				{/each}
			</div>
		{/each}
	</div>
	<div class="mt-1.5 flex gap-1 sm:gap-2">
		{#each months as mi (mi)}
			<div class="flex-1 text-center text-[9px] font-bold sm:text-[11px] {mi === currentMonthIdx ? 'text-white' : 'text-gray-400'}">{MONTH_SHORT[mi]}</div>
		{/each}
	</div>
</div>
