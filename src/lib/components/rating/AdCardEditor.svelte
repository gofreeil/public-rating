<script lang="ts">
    // ============================================================
    // עורך הכרטיס — נייד תחילה.
    //
    // שלוש החלטות שנובעות מכך שהעורך הזה מופעל בעיקר באצבע:
    // 1. התצוגה המקדימה דביקה בראש המסך ומוגבלת לגובה המסך, כך שהיא
    //    נשארת מול העין בזמן שגוללים בין הפקדים.
    // 2. כל פקדי המגע גדולים מ-44px, וה-thumb של הסליידרים הוגדל ידנית —
    //    ברירת המחדל של הדפדפן קטנה מדי לאצבע.
    // 3. לצד הגרירה יש כפתורי חיצים. גרירה אינה נגישה במקלדת, וגם באצבע
    //    כיוונון עדין קשה — החיצים מזיזים באחוז אחד בכל לחיצה.
    // ============================================================
    import { AD_GRADIENTS } from '$lib/ads/gradients';
    import { DEFAULT_CARD_STYLE, type AdCardStyle } from '$lib/ads/types';
    import AdCard from './AdCard.svelte';

    let {
        title = '',
        subtitle = '',
        hoverText = '',
        cta = 'לפרטים',
        gradientId = $bindable('amber'),
        mainImage = '',
        logo = '',
        style = $bindable<Partial<AdCardStyle>>({}),
    }: {
        title?: string;
        subtitle?: string;
        hoverText?: string;
        cta?: string;
        gradientId?: string;
        mainImage?: string;
        logo?: string;
        style?: Partial<AdCardStyle>;
    } = $props();

    const s = $derived({ ...DEFAULT_CARD_STYLE, ...style });
    /** הלוגו הונח בנקודה חופשית שנגררה, ולא על עוגן למעלה/למטה */
    const logoFree = $derived(typeof s.logo_x === 'number' && typeof s.logo_y === 'number');

    function set(patch: Partial<AdCardStyle>) {
        style = { ...style, ...patch };
    }

    function nudge(dx: number, dy: number) {
        set({
            image_x: Math.max(-50, Math.min(50, s.image_x + dx)),
            image_y: Math.max(-50, Math.min(50, s.image_y + dy)),
        });
    }

    function reset() {
        set({ image_x: 0, image_y: 0, image_zoom: 1 });
    }

    const TITLE_COLORS = ['#ffffff', '#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#0f172a'];
    const btn =
        'flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg text-gray-200 transition-colors hover:bg-white/10 active:bg-white/20';
</script>

<div class="flex flex-col gap-4">
    <!-- ---- התצוגה המקדימה ---- -->
    <div class="preview-wrap sticky top-16 z-10 -mx-1 flex flex-col items-center gap-1 bg-[#0f172a]/95 py-2 backdrop-blur">
        <p class="text-[11px] font-bold tracking-widest text-amber-400 uppercase">
            כך תיראה הפרסומת
        </p>
        <div class="card-frame">
            <AdCard
                {title}
                {subtitle}
                {hoverText}
                {cta}
                {gradientId}
                {mainImage}
                {logo}
                style={s}
                editable
                onmove={(next) => set(next)}
                onlogomove={(next) => set(next)}
            />
        </div>
        {#if mainImage}
            <p class="text-[11px] text-gray-500">גררו את התמונה כדי למקם אותה</p>
        {/if}
        {#if logo}
            <p class="text-[11px] text-gray-500">
                🖐️ אפשר לגרור גם את הלוגו לכל מקום בכרטיס
                {#if typeof s.logo_x === 'number' && typeof s.logo_y === 'number'}
                    <span class="tabular-nums text-gray-400">({s.logo_x}% · {s.logo_y}%)</span>
                    <button
                        type="button"
                        class="cursor-pointer rounded-md border border-white/15 px-1.5 text-amber-300 hover:border-amber-400/60"
                        onclick={() => set({ logo_x: null, logo_y: null })}
                    >
                        למיקום ברירת המחדל
                    </button>
                {/if}
            </p>
        {/if}
    </div>

    <!-- ---- מיקום התמונה ---- -->
    {#if mainImage}
        <section class="rounded-2xl border border-white/10 bg-white/5 p-3">
            <h3 class="mb-2 text-sm font-black text-white">מיקום התמונה</h3>

            <div class="flex flex-wrap items-center gap-3">
                <!-- חיצים: הדרך היחידה לכוונון עדין באצבע, והיחידה במקלדת -->
                <div class="grid grid-cols-3 gap-1" role="group" aria-label="הזזת התמונה">
                    <span></span>
                    <button type="button" class={btn} onclick={() => nudge(0, -1)} aria-label="הזז למעלה">↑</button>
                    <span></span>
                    <button type="button" class={btn} onclick={() => nudge(1, 0)} aria-label="הזז ימינה">→</button>
                    <button type="button" class={btn} onclick={reset} aria-label="איפוס מיקום">⟳</button>
                    <button type="button" class={btn} onclick={() => nudge(-1, 0)} aria-label="הזז שמאלה">←</button>
                    <span></span>
                    <button type="button" class={btn} onclick={() => nudge(0, 1)} aria-label="הזז למטה">↓</button>
                    <span></span>
                </div>

                <label class="min-w-40 flex-1">
                    <span class="mb-1 flex items-center justify-between text-xs font-semibold text-gray-400">
                        <span>זום</span>
                        <span class="tabular-nums">{s.image_zoom.toFixed(1)}×</span>
                    </span>
                    <input
                        type="range"
                        min="0.5"
                        max="4"
                        step="0.1"
                        value={s.image_zoom}
                        oninput={(e) => set({ image_zoom: Number(e.currentTarget.value) })}
                        aria-label="רמת הזום"
                        class="range"
                    />
                </label>
            </div>
        </section>
    {/if}

    <!-- ---- הכותרת ---- -->
    <section class="rounded-2xl border border-white/10 bg-white/5 p-3">
        <h3 class="mb-2 text-sm font-black text-white">הכותרת</h3>

        <label class="block">
            <span class="mb-1 flex items-center justify-between text-xs font-semibold text-gray-400">
                <span>מיקום אנכי</span>
                <span class="tabular-nums">{s.title_offset_y}%</span>
            </span>
            <input
                type="range"
                min="-60"
                max="20"
                step="1"
                value={s.title_offset_y}
                oninput={(e) => set({ title_offset_y: Number(e.currentTarget.value) })}
                aria-label="מיקום אנכי של הכותרת"
                class="range"
            />
        </label>

        <p class="mt-3 mb-1 text-xs font-semibold text-gray-400">צבע הכותרת</p>
        <div class="flex flex-wrap gap-2" role="group" aria-label="בחירת צבע הכותרת">
            {#each TITLE_COLORS as c (c)}
                <button
                    type="button"
                    onclick={() => set({ title_color: c })}
                    aria-label="צבע {c}"
                    aria-pressed={s.title_color === c}
                    class="h-11 w-11 cursor-pointer rounded-xl border-2 transition-transform {s.title_color === c
                        ? 'border-blue-400 scale-110'
                        : 'border-white/15'}"
                    style="background: {c}"
                ></button>
            {/each}
        </div>
    </section>

    <!-- ---- הפס והלוגו ---- -->
    <section class="rounded-2xl border border-white/10 bg-white/5 p-3">
        <h3 class="mb-2 text-sm font-black text-white">הפס והלוגו</h3>

        <label class="block">
            <span class="mb-1 flex items-center justify-between text-xs font-semibold text-gray-400">
                <span>גובה הפס האלכסוני</span>
                <span class="tabular-nums">{s.diag_height === 0 ? 'ללא' : `${s.diag_height}%`}</span>
            </span>
            <input
                type="range"
                min="0"
                max="45"
                step="1"
                value={s.diag_height}
                oninput={(e) => set({ diag_height: Number(e.currentTarget.value) })}
                aria-label="גובה הפס האלכסוני"
                class="range"
            />
        </label>

        {#if logo}
            <div class="mt-3 flex flex-wrap gap-4">
                <div>
                    <p class="mb-1 text-xs font-semibold text-gray-400">צורת הלוגו</p>
                    <div class="flex gap-2">
                        {#each [{ v: 'circle', l: '⬤ עגול' }, { v: 'square', l: '⬛ מרובע' }] as o (o.v)}
                            <button
                                type="button"
                                onclick={() => set({ logo_shape: o.v as 'circle' | 'square' })}
                                aria-pressed={s.logo_shape === o.v}
                                class="h-11 cursor-pointer rounded-xl border px-3 text-xs font-bold transition-colors {s.logo_shape ===
                                o.v
                                    ? 'border-blue-400/50 bg-blue-500/20 text-blue-200'
                                    : 'border-white/10 bg-white/5 text-gray-300'}"
                            >{o.l}</button>
                        {/each}
                    </div>
                </div>
                <div>
                    <p class="mb-1 text-xs font-semibold text-gray-400">מיקום הלוגו</p>
                    <div class="flex gap-2">
                        <!-- שתי הפינות נשארו קיצורי דרך בלחיצה — והן מבטלות
                             מיקום חופשי שנגרר, אחרת הלחיצה נראית כאילו לא עשתה כלום -->
                        {#each [{ v: 'top', l: '↑ למעלה' }, { v: 'bottom', l: '↓ למטה' }] as o (o.v)}
                            <button
                                type="button"
                                onclick={() => set({ logo_position: o.v as 'top' | 'bottom', logo_x: null, logo_y: null })}
                                aria-pressed={!logoFree && s.logo_position === o.v}
                                class="h-11 cursor-pointer rounded-xl border px-3 text-xs font-bold transition-colors {!logoFree &&
                                s.logo_position === o.v
                                    ? 'border-blue-400/50 bg-blue-500/20 text-blue-200'
                                    : 'border-white/10 bg-white/5 text-gray-300'}"
                            >{o.l}</button>
                        {/each}
                    </div>
                </div>
            </div>
        {/if}
    </section>

    <!-- ---- צבע הכרטיס ---- -->
    <section class="rounded-2xl border border-white/10 bg-white/5 p-3">
        <h3 class="mb-2 text-sm font-black text-white">צבע הכפתור והפס</h3>
        <div class="flex flex-wrap gap-2" role="group" aria-label="בחירת צבע הכרטיס">
            {#each AD_GRADIENTS as g (g.id)}
                <button
                    type="button"
                    onclick={() => (gradientId = g.id)}
                    aria-pressed={gradientId === g.id}
                    aria-label={g.label}
                    class="h-11 w-11 cursor-pointer rounded-xl border-2 transition-transform {gradientId === g.id
                        ? 'border-blue-400 scale-110'
                        : 'border-white/15'}"
                    style="background: {g.css}"
                ></button>
            {/each}
        </div>
    </section>
</div>

<style>
    /* גובה התצוגה נגזר מהמסך: בנייד היא חייבת להישאר גלויה יחד עם פקד אחד
       לפחות, אחרת המשתמש מכוונן בעיוורון. היחס זהה לכרטיס האמיתי. */
    .card-frame {
        height: min(46vh, 470px);
        aspect-ratio: 144 / 470;
    }

    /* ה-thumb הדיפולטי כ-14px — קטן מדי לאצבע */
    .range {
        width: 100%;
        height: 44px;
        background: transparent;
        cursor: pointer;
        -webkit-appearance: none;
        appearance: none;
    }
    .range::-webkit-slider-runnable-track {
        height: 6px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.14);
    }
    .range::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        margin-top: -9px;
        height: 24px;
        width: 24px;
        border-radius: 999px;
        background: #60a5fa;
        border: 2px solid #0f172a;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
    }
    .range::-moz-range-track {
        height: 6px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.14);
    }
    .range::-moz-range-thumb {
        height: 24px;
        width: 24px;
        border-radius: 999px;
        background: #60a5fa;
        border: 2px solid #0f172a;
    }
    .range:focus-visible::-webkit-slider-thumb {
        outline: 2px solid #93c5fd;
        outline-offset: 2px;
    }
</style>
