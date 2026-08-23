<script lang="ts">
    // מגמת הדירוג לאורך זמן — סדרה אחת, ולכן בלי מקרא: הכותרת מזהה אותה.
    // ציר Y קבוע על 1–5 (סולם הדירוג המלא) ולא נחתך לטווח הנתונים — ציר
    // קטוע היה מנפח שינוי של עשירית לגרף דרמטי.
    import { fmtScore, ratingTrend } from '$lib/rating/aggregate';
    import { absDate } from '$lib/rating/time';
    import type { PublicReview } from '$lib/rating/types';

    let { reviews }: { reviews: PublicReview[] } = $props();

    const trend = $derived(ratingTrend(reviews));

    // מערכת קואורדינטות פנימית. היחס נשמר (בלי preserveAspectRatio="none")
    // כי מתיחה לא-אחידה הייתה הופכת את סמני הנקודות לאליפסות.
    const W = 600;
    const H = 100;
    const PAD_X = 12;
    const PAD_Y = 14;

    function x(i: number, n: number): number {
        if (n <= 1) return W / 2;
        // RTL: הזמן זורם מימין לשמאל, כמו קריאת הטקסט סביבו
        return W - PAD_X - (i / (n - 1)) * (W - PAD_X * 2);
    }

    function y(avg: number): number {
        const clamped = Math.min(5, Math.max(1, avg));
        return H - PAD_Y - ((clamped - 1) / 4) * (H - PAD_Y * 2);
    }

    const coords = $derived(
        trend.points.map((p, i) => ({ ...p, cx: x(i, trend.points.length), cy: y(p.avg) })),
    );
    const linePath = $derived(coords.map((c) => `${c.cx},${c.cy}`).join(' '));
    const midLine = $derived(y(3));

    const TONE = {
        up: { color: '#34d399', label: 'במגמת שיפור', icon: '↗' },
        down: { color: '#f87171', label: 'במגמת ירידה', icon: '↘' },
        flat: { color: '#94a3b8', label: 'יציב', icon: '→' },
    } as const;
    const tone = $derived(TONE[trend.direction]);

    let hovered = $state<number | null>(null);
</script>

{#if trend.points.length >= 2}
    <section class="rounded-2xl border border-white/10 bg-slate-800/80 p-3">
        <div class="mb-1 flex flex-wrap items-center gap-2">
            <h3 class="text-sm font-bold text-white">מגמת הדירוג לאורך זמן</h3>
            <span
                class="rounded-full border px-2 py-0.5 text-xs font-bold"
                style="color: {tone.color}; border-color: {tone.color}44; background: {tone.color}14"
            >
                <span aria-hidden="true">{tone.icon}</span>
                {tone.label}
                {#if trend.direction !== 'flat'}
                    ({trend.delta > 0 ? '+' : '−'}{fmtScore(Math.abs(trend.delta))})
                {/if}
            </span>
        </div>

        <!-- הנתונים עצמם, לקוראי מסך ולמי שהגרף לא נגיש לו -->
        <ul class="sr-only">
            {#each trend.points as p (p.iso)}
                <li>{p.label}: ממוצע {fmtScore(p.avg)} מתוך {p.count} דירוגים</li>
            {/each}
        </ul>

        <svg
            viewBox="0 0 {W} {H}"
            class="h-auto w-full"
            role="img"
            aria-label="ממוצע הדירוג לפי חודש, {trend.points.length} חודשים. {tone.label}."
        >
            <!-- קו האמצע (3) — עוגן קריאה, לא רשת מלאה -->
            <line
                x1={PAD_X}
                x2={W - PAD_X}
                y1={midLine}
                y2={midLine}
                stroke="rgba(255,255,255,0.12)"
                stroke-width="1"
                stroke-dasharray="3 4"
            />

            <polyline
                points={linePath}
                fill="none"
                stroke={tone.color}
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                vector-effect="non-scaling-stroke"
            />

            {#each coords as c, i (c.iso)}
                <circle
                    cx={c.cx}
                    cy={c.cy}
                    r={hovered === i ? 7 : 5.5}
                    fill={tone.color}
                    stroke="#0f172a"
                    stroke-width="2"
                    vector-effect="non-scaling-stroke"
                />
                <!-- שטח מגע רחב בהרבה מהסמן עצמו -->
                <circle
                    cx={c.cx}
                    cy={c.cy}
                    r="20"
                    fill="transparent"
                    aria-hidden="true"
                    onmouseenter={() => (hovered = i)}
                    onmouseleave={() => (hovered = null)}
                >
                    <title>{c.label}: {fmtScore(c.avg)} ({c.count} דירוגים)</title>
                </circle>
            {/each}
        </svg>

        <!--
          תוויות ישירות רק בקצוות, לא על כל נקודה.
          ב-RTL הילד הראשון יושב מימין — ושם נמצאת הנקודה הוותיקה ביותר.
        -->
        <div class="flex items-baseline justify-between text-[11px] text-gray-500">
            <time datetime={coords[0]?.iso} title={absDate(coords[0]?.iso ?? '')}>
                {coords[0]?.label} · {fmtScore(coords[0]?.avg)}
            </time>
            {#if hovered !== null}
                <span class="font-bold" style="color: {tone.color}">
                    {coords[hovered].label} · {fmtScore(coords[hovered].avg)}
                    ({coords[hovered].count} דירוגים)
                </span>
            {/if}
            <time datetime={coords.at(-1)?.iso} title={absDate(coords.at(-1)?.iso ?? '')}>
                {coords.at(-1)?.label} · {fmtScore(coords.at(-1)?.avg)}
            </time>
        </div>

        <p class="mt-1 text-[11px] leading-relaxed text-gray-400">
            ממוצע הדירוגים שהתקבלו בכל חודש. הציר מוצג על סולם 1–5 המלא.
        </p>
    </section>
{/if}
