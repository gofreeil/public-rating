<script lang="ts">
    import { onMount } from "svelte";
    import { browser } from "$app/environment";
    import { citiesData, LS_KEY, DEFAULT_NEIGHBORHOOD } from "$lib/neighborhoodsData";
    import { coinAnim } from "$lib/coinAnimationState.svelte";

    const packages = [
        {
            name: "באנר צד",
            icon: "📌",
            location: "סרגל ימין/שמאל",
            size: "144×560px",
            color: "from-blue-600 to-cyan-600",
            border: "border-blue-500/40",
            bg: "bg-blue-900/10",
            features: ["חשיפה גבוהה בכל עמוד", "קהל מקומי ממוקד", "לינק לאתר שלך"],
        },
        {
            name: "כרטיס תוכן",
            icon: "🖼️",
            location: "עמוד הבית - סרגל שמאל",
            size: "192×auto",
            color: "from-purple-600 to-pink-600",
            border: "border-purple-500/40",
            bg: "bg-purple-900/10",
            features: ["תמונה + כותרת + תיאור", "hover עם מידע נוסף", "לינק לאתר שלך"],
        },
        {
            name: "פרסומת נייד",
            icon: "📱",
            location: "בנר תחתון בנייד",
            size: "מסך מלא",
            color: "from-green-600 to-emerald-600",
            border: "border-green-500/40",
            bg: "bg-green-900/10",
            features: ["נראות מקסימלית בנייד", "מופיע לכל מבקר", "קישור ישיר לעסק"],
        },
    ];

    // ---- City selection (price × number of active neighborhoods in city) ----
    const defaultCity = citiesData.find(c => c.neighborhoods.includes(DEFAULT_NEIGHBORHOOD))?.city ?? citiesData[0].city;
    let selectedCities = $state<Set<string>>(new Set([defaultCity]));
    let isNational = $state(false);
    let showPicker = $state(false);

    // Pre-selected item info coming from /add/[category] flow
    let pendingItemLabel    = $state('');
    let pendingItemCategory = $state('');

    onMount(() => {
        if (!browser) return;

        // Read last neighborhood chosen on the home page - map to its city
        const saved = localStorage.getItem(LS_KEY);
        if (saved) {
            try {
                const { neighborhood } = JSON.parse(saved);
                if (neighborhood) {
                    const found = citiesData.find(c => c.neighborhoods.includes(neighborhood));
                    if (found) selectedCities = new Set([found.city]);
                }
            } catch {}
        }

        // Auto-select pricing row from /add/[category] redirect
        try {
            const pending = localStorage.getItem('pending_ad');
            if (pending) {
                const { priceRow, categoryLabel, itemLabel } = JSON.parse(pending);
                if (typeof priceRow === 'number' && priceRow >= 1 && priceRow <= 9) {
                    planMap = new Map([[priceRow, 'half']]);
                }
                if (categoryLabel) pendingItemCategory = String(categoryLabel);
                if (itemLabel)     pendingItemLabel     = String(itemLabel);
                localStorage.removeItem('pending_ad');
            }
        } catch {}
    });

    function setNational() {
        isNational = true;
        selectedCities = new Set();
    }

    function toggleCity(cityName: string) {
        const next = new Set(selectedCities);
        if (next.has(cityName)) {
            if (next.size > 1) next.delete(cityName); // keep at least one
        } else {
            next.add(cityName);
        }
        selectedCities = next;
        isNational = false;
    }

    let neighborhoodLabel = $derived(
        isNational
            ? "ארצי - כל הארץ"
            : selectedCities.size === 1
                ? [...selectedCities][0]
                : `${[...selectedCities][0]} +${selectedCities.size - 1}`
    );

    // ---- Toast ----
    let toastVisible = $state(false);
    let toastTimer: ReturnType<typeof setTimeout> | null = null;

    function showToast() {
        toastVisible = true;
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { toastVisible = false; }, 5000);
    }

    // ---- Email confirmation ----
    let userEmail      = $state('');
    let emailSending   = $state(false);
    let emailSent      = $state(false);
    let emailError     = $state('');

    async function sendOrderEmail() {
        if (!userEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
            emailError = 'נא להזין כתובת אימייל תקינה';
            return;
        }
        emailError   = '';
        emailSending = true;

        try {
            const res = await fetch('/api/send-order-email', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email:             userEmail,
                    selectedItems,
                    neighborhoodLabel,
                    neighborhoodCount,
                    totalPayment,
                    totalMonthly,
                }),
            });

            const data = await res.json();
            if (data.success) {
                emailSent = true;
                // השרת כבר הוסיף את המעשר - מפעיל אנימציה עם הנתונים שחזרו
                const tithe = Math.round(totalPayment * 0.1);
                if (tithe > 0) {
                    coinAnim.trigger(tithe, totalPayment, data.fundTotal ?? tithe);
                }
            } else {
                emailError = data.message || 'שגיאה בשליחת המייל';
            }
        } catch {
            emailError = 'בעיית תקשורת - נסה שוב';
        } finally {
            emailSending = false;
        }
    }

    const rows = [
        { num: 1, type: "פרסומת ארוכה",  half: 15,  total: 90,  single: 25, reach: "לכל שכונה רצויה",   details: "מופיע ל-6 שניות ונעלם 12 שניות" },
        { num: 2, type: "עסק",            half: 25,  total: 150, single: 35, reach: "לכל שכונה רצויה",   details: "מופיע במפה וברשימה" },
        { num: 3, type: "חוג",            half: 15,  total: 90,  single: 25, reach: "לכל שכונה רצויה",   details: "מופיע במפה וברשימה" },
        { num: 4, type: "צימר / סאבלט",  half: 45,  total: 270, single: 60, reach: "לכל שכונה רצויה",   details: "מופיע במפה וברשימה" },
        { num: 5, type: "דרושים לעבודה", half: 15,  total: 90,  single: 25, reach: "לכל שכונה רצויה",   details: "מופיע רק ברשימה" },
        { num: 6, type: "פנויים פנויות", half: 20,  total: 120, single: 30, reach: "כולל רשימה ארצית",  details: "מופיע רק ברשימה" },
        { num: 7, type: "פרסומת קבועה",  half: 60,  total: 360, single: 85, reach: "ארצי בלבד",         details: "קבוע" },
        { num: 8, type: "בייבי סיטר",    half: 8,   total: 48,  single: 20, reach: "לכל שכונה רצויה",   details: "מופיע במפה וברשימה" },
        { num: 9, type: "אולמות",         half: 45,  total: 270, single: 60, reach: "לכל שכונה רצויה",   details: "מופיע במפה וברשימה" },
    ];

    // ---- Calculator state: each row can be 'half' | 'single' | unset ----
    type Plan = 'half' | 'single';
    let planMap = $state<Map<number, Plan>>(new Map());

    function setPlan(num: number, plan: Plan) {
        const next = new Map(planMap);
        if (next.get(num) === plan) {
            next.delete(num);           // clicking active side = turn off
        } else {
            next.set(num, plan);
            showToast();                // remind user which neighborhood they're advertising in
        }
        planMap = next;
    }

    let selectedItems  = $derived(
        rows
            .filter(r  => planMap.has(r.num))
            .map(r => ({ ...r, plan: planMap.get(r.num)! }))
    );

    // Price multiplier = total neighborhoods in selected cities
    const totalNeighborhoodsCount = citiesData.reduce((s, c) => s + c.neighborhoods.length, 0);
    let neighborhoodCount = $derived(
        isNational
            ? totalNeighborhoodsCount
            : Math.max(1, citiesData
                .filter(c => selectedCities.has(c.city))
                .reduce((s, c) => s + c.neighborhoods.length, 0))
    );

    // Base price per neighborhood (before multiplying)
    let basePayment  = $derived(selectedItems.reduce((s, r) => s + (r.plan === 'half' ? r.total  : r.single), 0));
    let baseMonthly  = $derived(selectedItems.reduce((s, r) => s + (r.plan === 'half' ? r.half   : r.single), 0));

    // Actual totals after × neighborhoods
    let totalPayment = $derived(basePayment  * neighborhoodCount);
    let totalMonthly = $derived(baseMonthly  * neighborhoodCount);

    let halfItems        = $derived(selectedItems.filter(r => r.plan === 'half'));
    let singleItems      = $derived(selectedItems.filter(r => r.plan === 'single'));
    let hasSelection     = $derived(planMap.size > 0);

    // תמונת רקע לכל שכונה - מוצגת בכפתור הבחירה כשבוחרים שכונה בודדת
    const neighborhoodImages: Record<string, string> = {
        'קרית משה':    '/images/kiryat-moshe-vaad.jfif',
        'רחביה':       '/images/neighborhoods/rehavia.jpg',
        'גבעת שאול':   '/images/neighborhoods/givat-shaul.jpg',
        'רמות':        '/images/neighborhoods/ramot.jpg',
        'גילה':        '/images/neighborhoods/gilo.jpg',
        'קטמון':       '/images/neighborhoods/katamon.jpg',
        'בקעה':        '/images/neighborhoods/baka.jpg',
        'מעלות דפנה':  '/images/neighborhoods/maalot-dafna.jpg',
        'רמת אביב':    '/images/neighborhoods/ramat-aviv.jpg',
        'פלורנטין':    '/images/neighborhoods/florentin.jpg',
        'נווה צדק':    '/images/neighborhoods/neve-tzedek.jpg',
        'יפו העתיקה':  '/images/neighborhoods/jaffa.jpg',
        'רמת החייל':   '/images/neighborhoods/ramat-hahail.jpg',
        'כרמל צרפתי':  '/images/neighborhoods/french-carmel.jpg',
        'נווה שאנן':   '/images/neighborhoods/neve-shaanan.jpg',
        'בת גלים':     '/images/neighborhoods/bat-galim.jpg',
    };

    // City images - keyed by city name
    const cityImages: Record<string, string> = {
        'ירושלים':       '/images/kiryat-moshe-vaad.jfif',
        'תל אביב':       '/images/neighborhoods/florentin.jpg',
        'חיפה':          '/images/neighborhoods/french-carmel.jpg',
    };

    let neighborhoodImage = $derived(
        !isNational && selectedCities.size === 1
            ? (cityImages[[...selectedCities][0]] ?? null)
            : null
    );

    // Build mailto body
    let mailtoBody = $derived(
        `ערים: ${neighborhoodLabel} (×${neighborhoodCount} שכונות)%0A` +
        selectedItems.map(r =>
            `${r.type} - ${r.plan === 'half' ? `חצי שנה ₪${r.total * neighborhoodCount}` : `חודש בודד ₪${r.single * neighborhoodCount}`}`
        ).join('%0A') + `%0A%0Aסה״כ: ₪${totalPayment}`
    );
</script>

<svelte:head>
    <title>פרסום באתר | קהילה בשכונה</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-8 md:py-12" dir="rtl">

    <!-- Success banner from /add/[category] flow -->
    {#if pendingItemLabel}
        <div class="mb-8 rounded-2xl border-2 border-green-500/40 bg-green-900/20 p-5 text-center"
             style="animation: slideDown 0.4s ease-out;">
            <div class="text-3xl mb-2">✅</div>
            <p class="text-green-300 font-black text-base mb-1">
                "{pendingItemLabel}" נשמר בהצלחה!
            </p>
            <p class="text-gray-400 text-sm">
                הפריט כבר מופיע ברשימת השכונה.
                כעת בחר תוכנית פרסום כדי לשפר את החשיפה שלו ↓
            </p>
        </div>
    {/if}

    <!-- Header -->
    <div class="text-center mb-10 md:mb-14">
        <div class="text-5xl mb-4">📢</div>
        <h1 class="text-3xl md:text-5xl font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent mb-4">
            {pendingItemLabel ? 'שדרג את החשיפה שלך' : 'פרסם באתר הקהילה'}
        </h1>
        <p class="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            היחשף לתושבי השכונה ישירות - קהל מקומי, ממוקד ומעורב
        </p>
    </div>

    <!-- Packages -->
    <h2 class="text-xl md:text-2xl font-black text-white mb-6 text-center">אפשרויות פרסום</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        {#each packages as pkg}
            <div class="rounded-2xl border-2 {pkg.border} {pkg.bg} p-5 flex flex-col">
                <div class="text-3xl mb-3">{pkg.icon}</div>
                <h3 class="text-lg font-black text-white mb-1">{pkg.name}</h3>
                <p class="text-xs text-gray-400 mb-3">{pkg.location}</p>
                <div class="text-xs bg-white/10 rounded-lg px-2 py-1 text-gray-300 mb-4 inline-block w-fit">{pkg.size}</div>
                <ul class="space-y-1.5 mt-auto">
                    {#each pkg.features as feature}
                        <li class="text-sm text-gray-300 flex items-center gap-2">
                            <span class="text-green-400 flex-shrink-0">✓</span>
                            {feature}
                        </li>
                    {/each}
                </ul>
            </div>
        {/each}
    </div>

    <!-- Pricing Table heading -->
    <h2 class="text-xl md:text-2xl font-black text-white mb-6 text-center">מחירון</h2>

    <!-- Neighborhood picker trigger -->
    <p class="text-gray-300 text-base font-bold text-center mb-3">תחילה בחר עיר / שכונה</p>
    <button
        type="button"
        onclick={() => showPicker = !showPicker}
        class="w-full rounded-2xl border-2 px-6 py-5 text-center transition-all cursor-pointer mb-4 relative overflow-hidden
            {showPicker
                ? 'border-amber-500/60 shadow-lg shadow-amber-500/10'
                : neighborhoodImage
                    ? 'border-amber-500/40 hover:border-amber-400/70'
                    : 'bg-white/5 border-white/10 hover:border-amber-400/40 hover:bg-amber-900/10'}"
        style={neighborhoodImage
            ? `background-image: url('${neighborhoodImage}'); background-size: cover; background-position: center;`
            : ""}
    >
        {#if neighborhoodImage}
            <!-- dark overlay so text stays readable -->
            <div class="absolute inset-0 bg-black/55 rounded-2xl"></div>
        {/if}
        <div class="relative z-10">
            <div class="text-xl md:text-2xl font-black text-amber-400 mb-1 leading-tight drop-shadow-lg" title={neighborhoodLabel}>
                {neighborhoodLabel}
            </div>
            <div class="text-xs md:text-sm flex items-center justify-center gap-1
                {neighborhoodImage ? 'text-gray-200' : 'text-gray-400'}">
                <span>קהל מקומי</span>
                <span class="text-amber-500/70">✏️</span>
            </div>
        </div>
    </button>

    <!-- City Picker Panel -->
    {#if showPicker}
        <div class="mb-8 rounded-2xl border border-amber-500/30 bg-gray-950/95 backdrop-blur p-5 shadow-2xl"
             style="animation: slideDown 0.2s ease-out;">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-white font-black text-base flex items-center gap-2">
                    📍 בחר ערים לפרסום
                </h3>
                <button
                    type="button"
                    onclick={() => showPicker = false}
                    class="text-gray-500 hover:text-white transition-colors text-sm font-bold px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10"
                >אישור ✓</button>
            </div>

            <!-- National option -->
            <button
                type="button"
                onclick={setNational}
                class="w-full mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all font-bold text-sm
                    {isNational
                        ? 'border-purple-500 bg-purple-500/20 text-white'
                        : 'border-white/10 bg-white/3 text-gray-400 hover:border-purple-400/40 hover:text-gray-200'}"
            >
                <span class="text-lg">🌍</span>
                <div class="flex flex-col items-start">
                    <span>ארצי - כל הארץ</span>
                    <span class="text-xs font-normal text-gray-500">{totalNeighborhoodsCount} שכונות פעילות</span>
                </div>
                {#if isNational}<span class="mr-auto text-purple-400">✓</span>{/if}
            </button>

            <!-- City buttons -->
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                {#each citiesData as cityEntry}
                    {@const selected = !isNational && selectedCities.has(cityEntry.city)}
                    <button
                        type="button"
                        onclick={() => toggleCity(cityEntry.city)}
                        class="flex flex-col items-start px-4 py-3 rounded-xl border-2 transition-all text-right
                            {selected
                                ? 'border-amber-500 bg-amber-500/15 text-white'
                                : 'border-white/10 bg-white/3 text-gray-400 hover:border-amber-400/40 hover:text-gray-200'}"
                    >
                        <div class="flex items-center justify-between w-full">
                            <span class="font-black text-base">{cityEntry.city}</span>
                            {#if selected}<span class="text-amber-400 text-base">✓</span>{/if}
                        </div>
                        <span class="text-sm mt-0.5 {selected ? 'text-amber-400/80' : 'text-gray-400'}">
                            {cityEntry.neighborhoods.length} שכונות
                        </span>
                    </button>
                {/each}
            </div>

            <p class="text-gray-600 text-xs mt-4 text-center">המחיר מחושב לפי מספר השכונות הפעילות בכל עיר · ניתן לבחור מספר ערים</p>
        </div>
    {/if}

    <!-- Pricing Table -->
    <p class="text-gray-200 text-base font-bold text-center mb-6">
        הזז את המתג לבחירת תוכנית - המחשבון יחשב אוטומטית ↓
    </p>

    <div class="mb-6 overflow-x-auto rounded-2xl border border-white/10">
        <table class="w-full text-base text-right">
            <thead>
                <tr class="bg-amber-500/20 border-b border-amber-500/30">
                    <th class="px-4 py-4 font-black text-amber-400 text-center">#</th>
                    <th class="px-4 py-4 font-black text-amber-400">סוג</th>
                    <th class="px-4 py-4 font-black text-amber-400 whitespace-nowrap text-center">
                        לחודש ₪<br/><span class="text-sm font-normal text-amber-400/70">(חצי שנה)</span>
                    </th>
                    <th class="px-4 py-4 font-black text-amber-400 whitespace-nowrap text-center">
                        לחודש<br/><span class="text-sm font-normal text-amber-400/70">בודד</span>
                    </th>
                    <th class="px-4 py-4 font-black text-amber-400">פריסה</th>
                    <th class="px-4 py-4 font-black text-amber-400">פרטים</th>
                    <!-- Toggle column header - last = left side in RTL -->
                    <th class="px-4 py-4 text-center bg-white/8 border-r border-white/10">
                        <div class="flex flex-col items-center gap-1">
                            <span class="text-xs font-bold text-amber-400/80">½שנה</span>
                            <div class="flex items-center gap-1">
                                <div class="h-px w-4 bg-amber-500/50"></div>
                                <div class="w-2 h-2 rounded-full bg-white/30"></div>
                                <div class="h-px w-4 bg-blue-400/40"></div>
                            </div>
                            <span class="text-xs font-bold text-blue-400/80">חודש</span>
                        </div>
                    </th>
                </tr>
            </thead>
            <tbody>
                {#each rows as row, i}
                    {@const plan = planMap.get(row.num)}
                    <tr class="border-b border-white/5 transition-colors
                        {plan === 'half'   ? 'bg-amber-500/10'
                         : plan === 'single' ? 'bg-blue-500/10'
                         : i % 2 === 0      ? 'bg-white/3'
                         :                    'bg-white/5'}">

                        <td class="px-4 py-4 text-center font-bold
                            {plan ? 'text-amber-400' : 'text-gray-400'}">{row.num}</td>

                        <td class="px-4 py-4 font-bold relative group/typecell
                            {plan === 'half' ? 'text-amber-300' : plan === 'single' ? 'text-blue-300' : 'text-white'}">
                            {row.type}
                            {#if row.num === 1}
                                <!-- Tooltip: "פרסומת ארוכה" = הפרסומות שבצד ימין -->
                                <div class="pointer-events-none absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2
                                            opacity-0 group-hover/typecell:opacity-100 transition-opacity duration-200
                                            bg-gray-900 border border-purple-500/60 text-white text-xs font-medium
                                            px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                                    📢 הפרסומות שבצד ימין
                                    <div class="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0
                                                border-x-4 border-x-transparent border-t-4 border-t-gray-900"></div>
                                </div>
                            {/if}
                        </td>

                        <td class="px-4 py-4 text-center">
                            <span class="font-black {plan === 'half' ? 'text-amber-300' : 'text-amber-400'}">₪{row.half}</span>
                            <span class="text-gray-500 text-sm block">סה"כ ₪{row.total}</span>
                        </td>

                        <td class="px-4 py-4 text-center">
                            <span class="font-bold {plan === 'single' ? 'text-blue-300' : 'text-gray-300'}">₪{row.single}</span>
                        </td>

                        <td class="px-4 py-4 text-gray-300 text-sm">{row.reach}</td>
                        <td class="px-4 py-4 text-gray-400 text-sm">{row.details}</td>

                        <!-- 3-state toggle - last column = left side in RTL -->
                        <td class="px-3 py-3 text-center border-r border-white/10"
                            style="background: {plan === 'half' ? 'rgba(245,158,11,0.12)' : plan === 'single' ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.06)'}">
                            <div class="flex justify-center" role="presentation" onclick={(e) => e.stopPropagation()}>
                                <div
                                    class="relative inline-flex h-9 rounded-full transition-all duration-300"
                                    style="
                                        padding: 2px;
                                        background: {plan === 'half' ? 'rgba(245,158,11,0.15)' : plan === 'single' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)'};
                                        border: 1.5px solid {plan === 'half' ? 'rgba(245,158,11,0.5)' : plan === 'single' ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.12)'};
                                    "
                                >
                                    <!-- Half-year segment (right in RTL = first child) -->
                                    <button
                                        type="button"
                                        onclick={() => setPlan(row.num, 'half')}
                                        class="relative z-10 rounded-full px-3 text-xs font-black transition-all duration-200 whitespace-nowrap leading-none flex items-center"
                                        style="background: {plan === 'half' ? '#f59e0b' : 'transparent'}; color: {plan === 'half' ? '#000' : '#6b7280'};"
                                        title="חצי שנה"
                                    >½שנה</button>

                                    {#if !plan}
                                        <div class="self-center w-1 h-1 rounded-full bg-white/20 mx-0.5 flex-shrink-0"></div>
                                    {/if}

                                    <!-- Single-month segment (left in RTL = second child) -->
                                    <button
                                        type="button"
                                        onclick={() => setPlan(row.num, 'single')}
                                        class="relative z-10 rounded-full px-3 text-xs font-black transition-all duration-200 whitespace-nowrap leading-none flex items-center"
                                        style="background: {plan === 'single' ? '#3b82f6' : 'transparent'}; color: {plan === 'single' ? '#fff' : '#6b7280'};"
                                        title="חודש בודד"
                                    >חודש</button>
                                </div>
                            </div>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>

    <!-- ===== Calculator Banner ===== -->
    {#if hasSelection}
        <div class="mb-12 rounded-2xl border-2 border-white/20 bg-gradient-to-br from-gray-900 to-gray-950 p-6 md:p-8 shadow-2xl"
             style="animation: slideDown 0.3s ease-out;">

            <!-- Title -->
            <div class="flex flex-wrap items-center justify-center gap-2 mb-6">
                <span class="text-3xl">🧮</span>
                <h2 class="text-xl md:text-2xl font-black text-white">מחשבון פרסום</h2>
                <span class="bg-white/10 border border-white/20 text-gray-300 text-xs font-black px-2 py-0.5 rounded-full">
                    {planMap.size} נבחרו
                </span>
                {#if neighborhoodCount > 1}
                    <span class="bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black px-2 py-0.5 rounded-full">
                        × {neighborhoodCount} שכונות
                    </span>
                {/if}
            </div>

            <!-- Selected items breakdown -->
            <div class="bg-black/40 rounded-xl border border-white/10 mb-6 overflow-hidden">
                <div class="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">פרסומות שנבחרו</p>
                    <div class="flex gap-3 text-[10px]">
                        {#if halfItems.length > 0}
                            <span class="text-amber-400 font-bold">🟡 {halfItems.length} חצי שנה</span>
                        {/if}
                        {#if singleItems.length > 0}
                            <span class="text-blue-400 font-bold">🔵 {singleItems.length} חודש בודד</span>
                        {/if}
                    </div>
                </div>
                <ul class="divide-y divide-white/5">
                    {#each selectedItems as item}
                        <li class="flex items-center justify-between px-4 py-3 gap-3">
                            <div class="flex items-center gap-2 min-w-0">
                                <button
                                    type="button"
                                    onclick={() => { const n = new Map(planMap); n.delete(item.num); planMap = n; }}
                                    class="text-gray-600 hover:text-red-400 transition-colors text-xs flex-shrink-0"
                                    aria-label="הסר"
                                >✕</button>
                                <span class="font-bold text-sm truncate
                                    {item.plan === 'half' ? 'text-amber-200' : 'text-blue-200'}">{item.type}</span>
                            </div>
                            <div class="flex items-center gap-3 flex-shrink-0">
                                <!-- Plan badge -->
                                <span class="text-[10px] font-black px-2 py-0.5 rounded-full
                                    {item.plan === 'half'
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}">
                                    {item.plan === 'half' ? '½ שנה' : 'חודש'}
                                </span>
                                <!-- Price -->
                                <div class="flex flex-col items-end gap-0.5">
                                    <span class="font-black text-sm {item.plan === 'half' ? 'text-amber-400' : 'text-blue-400'}">
                                        ₪{item.plan === 'half' ? item.total * neighborhoodCount : item.single * neighborhoodCount}
                                    </span>
                                    {#if neighborhoodCount > 1}
                                        <span class="text-gray-600 text-[10px] whitespace-nowrap">
                                            ₪{item.plan === 'half' ? item.total : item.single} × {neighborhoodCount}
                                        </span>
                                    {:else}
                                        <span class="text-gray-600 text-xs">
                                            {item.plan === 'half' ? 'ל-6 חודשים' : 'לחודש'}
                                        </span>
                                    {/if}
                                </div>
                            </div>
                        </li>
                    {/each}
                </ul>
            </div>

            <!-- Total -->
            <div class="rounded-2xl border-2 border-white/20 bg-white/5 p-6 text-center mb-6">
                <p class="text-gray-400 text-sm mb-2 font-bold">סה"כ לתשלום</p>
                {#if neighborhoodCount > 1}
                    <p class="text-gray-500 text-xs mb-1">₪{basePayment} × {neighborhoodCount} שכונות</p>
                {/if}
                <p class="text-5xl md:text-6xl font-black text-white mb-2">₪{totalPayment}</p>
                <p class="text-gray-500 text-sm">
                    {#if halfItems.length > 0 && singleItems.length > 0}
                        כולל {halfItems.length} חבילות חצי שנה + {singleItems.length} חודשים בודדים
                    {:else if halfItems.length > 0}
                        חבילת חצי שנה • שווה ₪{totalMonthly} לחודש
                    {:else}
                        {singleItems.length} פרסומות לחודש אחד
                    {/if}
                </p>
            </div>

            <!-- Breakdown cards (only if both plan types selected) -->
            {#if halfItems.length > 0 && singleItems.length > 0}
                <div class="grid grid-cols-2 gap-3 mb-6">
                    <div class="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-center">
                        <p class="text-[10px] text-amber-400/70 font-bold uppercase mb-1">חצי שנה</p>
                        <p class="text-xl font-black text-amber-400">₪{halfItems.reduce((s,r) => s + r.total, 0) * neighborhoodCount}</p>
                        <p class="text-[10px] text-gray-500">{halfItems.length} פרסומות × 6 חודשים{neighborhoodCount > 1 ? ` × ${neighborhoodCount}` : ''}</p>
                    </div>
                    <div class="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
                        <p class="text-[10px] text-blue-400/70 font-bold uppercase mb-1">חודש בודד</p>
                        <p class="text-xl font-black text-blue-400">₪{singleItems.reduce((s,r) => s + r.single, 0) * neighborhoodCount}</p>
                        <p class="text-[10px] text-gray-500">{singleItems.length} פרסומות × חודש{neighborhoodCount > 1 ? ` × ${neighborhoodCount}` : ''}</p>
                    </div>
                </div>
            {/if}

            <!-- ===== Email confirmation section ===== -->
            {#if emailSent}
                <!-- Success state -->
                <div class="rounded-2xl border-2 border-green-500/40 bg-green-900/20 p-5 text-center mb-4"
                     style="animation: slideDown 0.3s ease-out;">
                    <div class="text-3xl mb-2">✅</div>
                    <p class="text-green-300 font-black text-base mb-1">המייל נשלח בהצלחה!</p>
                    <p class="text-gray-400 text-sm">
                        שלחנו אישור הזמנה לכתובת
                        <span class="text-green-400 font-bold">{userEmail}</span>
                    </p>
                    <p class="text-gray-500 text-xs mt-2">ניצור איתך קשר תוך 24 שעות לתיאום הסופי</p>
                </div>
            {:else}
                <!-- Email input -->
                <div class="rounded-2xl border border-white/15 bg-white/3 p-5 mb-4"
                     style="animation: slideDown 0.25s ease-out;">
                    <p class="text-gray-300 text-sm font-bold mb-3 text-center">
                        📧 קבל אישור הזמנה למייל
                    </p>
                    <div class="flex flex-col sm:flex-row gap-2">
                        <input
                            type="email"
                            bind:value={userEmail}
                            placeholder="your@email.com"
                            dir="ltr"
                            class="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3
                                   text-white placeholder:text-gray-600 text-sm
                                   focus:outline-none focus:border-amber-500/60 focus:bg-amber-900/10
                                   transition-all"
                            onkeydown={(e) => { if (e.key === 'Enter') sendOrderEmail(); }}
                        />
                        <button
                            type="button"
                            onclick={sendOrderEmail}
                            disabled={emailSending}
                            class="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3
                                   font-black text-sm transition-all shadow-lg
                                   {emailSending
                                       ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                       : 'bg-amber-500 hover:bg-amber-400 text-black hover:scale-105 shadow-amber-500/20'}"
                        >
                            {#if emailSending}
                                <span class="inline-block w-4 h-4 border-2 border-gray-500 border-t-amber-400 rounded-full"
                                      style="animation: spin 0.7s linear infinite;"></span>
                                שולח…
                            {:else}
                                ✉️ שלח אישור - ₪{totalPayment}
                            {/if}
                        </button>
                    </div>
                    {#if emailError}
                        <p class="text-red-400 text-xs mt-2 text-center font-bold">{emailError}</p>
                    {/if}
                </div>
            {/if}

            <!-- CTA buttons -->
            <div class="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                    href="https://wa.me/972500000000?text=שלום, אני מעוניין לפרסם: {selectedItems.map(r => r.type).join(', ')}. סה״כ ₪{totalPayment}."
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="שלח הזמנת פרסום בוואטסאפ (נפתח בחלון חדש)"
                    class="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-black px-6 py-3 rounded-xl text-sm transition-all hover:scale-105 shadow-lg shadow-green-500/20"
                >
                    💬 שלח בוואטסאפ
                </a>
            </div>

            <!-- Clear -->
            <div class="text-center mt-4">
                <button
                    type="button"
                    onclick={() => planMap = new Map()}
                    class="text-xs text-gray-600 hover:text-gray-400 transition-colors underline underline-offset-2"
                >נקה בחירה</button>
            </div>
        </div>

    {:else}
        <!-- Empty state -->
        <div class="mb-12 rounded-2xl border-2 border-dashed border-white/10 bg-white/2 p-5 text-center">
            <p class="text-gray-500 text-sm">
                🧮 הזז מתג בטבלה כדי לפתוח את
                <span class="text-white font-bold">מחשבון הפרסום</span>
            </p>
        </div>
    {/if}

    <!-- Secure Payment -->
    <div class="mt-8 rounded-2xl bg-white/3 border border-white/10 p-6 md:p-8" dir="rtl">
        <h2 class="text-xl md:text-2xl font-black text-white mb-2 text-center flex items-center justify-center gap-2">
            🔒 תשלום מאובטח
        </h2>
        <p class="text-gray-400 text-sm text-center mb-6">
            התשלום מתבצע בצורה מאובטחת דרך חברת הסליקה - פרטי האשראי שלך לא מגיעים אלינו
        </p>

        <div class="flex flex-wrap justify-center gap-3 mb-6">
            {#each ["Visa", "Mastercard", "American Express", "Bit", "PayPal"] as method}
                <div class="bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-sm font-bold text-gray-300">{method}</div>
            {/each}
        </div>

        <div class="rounded-xl border-2 border-dashed border-blue-500/40 bg-blue-900/10 p-6 text-center">
            <div class="text-3xl mb-3">💳</div>
            <h3 class="text-white font-black mb-1">סליקה מאובטחת</h3>
            <p class="text-gray-400 text-sm mb-4">מחוברים לחברת סליקה מורשית - עסקה מאובטחת ב-SSL</p>
            <div class="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="https://meshulam.co.il" target="_blank" rel="noopener noreferrer"
                   aria-label="לדף התשלום – משולם (נפתח בחלון חדש)"
                   class="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-3 rounded-xl text-sm transition-all hover:scale-105">
                    🔗 לדף התשלום - משולם
                </a>
                <a href="https://grow.co.il" target="_blank" rel="noopener noreferrer"
                   aria-label="לדף התשלום – Grow (נפתח בחלון חדש)"
                   class="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-black px-6 py-3 rounded-xl text-sm transition-all hover:scale-105">
                    🔗 לדף התשלום - Grow
                </a>
            </div>
            <p class="text-gray-600 text-xs mt-4">* לאחר השלמת הרכישה נצור איתכם קשר לתיאום פרסום תוך 24 שעות</p>
        </div>

        <div class="flex flex-wrap justify-center gap-4 mt-5">
            {#each [
                { icon: "🔒", label: "SSL מאובטח" },
                { icon: "✅", label: "PCI DSS תקן" },
                { icon: "🏦", label: "בנק ישראל מורשה" },
                { icon: "↩️", label: "החזר כספי תוך 14 יום" },
            ] as badge}
                <div class="flex items-center gap-1.5 text-xs text-gray-400">
                    <span>{badge.icon}</span>
                    <span>{badge.label}</span>
                </div>
            {/each}
        </div>
    </div>

    <!-- Contact CTA -->
    <div class="mt-8 rounded-2xl bg-gradient-to-br from-amber-900/30 to-yellow-900/20 border-2 border-amber-500/40 p-6 md:p-10 text-center">
        <h2 class="text-2xl md:text-3xl font-black text-amber-400 mb-3">ליצירת קשר</h2>
        <p class="text-gray-300 mb-6 text-base md:text-lg">ליצירת קשר אנושי</p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="mailto:ads@shchuna.co.il"
               class="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-black px-6 py-3 rounded-xl text-base transition-all hover:scale-105 shadow-lg shadow-amber-500/30">
                ✉️ שלח מייל
            </a>
            <a href="https://wa.me/972500000000" target="_blank" rel="noopener noreferrer"
               aria-label="צור קשר בוואטסאפ (נפתח בחלון חדש)"
               class="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-black px-6 py-3 rounded-xl text-base transition-all hover:scale-105 shadow-lg shadow-green-500/30">
                💬 וואטסאפ
            </a>
        </div>
        <p class="text-gray-500 text-sm mt-4">ads@shchuna.co.il</p>
    </div>
</div>

<!-- Toast: neighborhood reminder -->
{#if toastVisible}
    <div
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-max max-w-xs md:max-w-sm"
        style="animation: slideUp 0.3s ease-out;"
        dir="rtl"
    >
        <div class="rounded-2xl bg-gray-900 border border-amber-500/50 shadow-2xl px-5 py-4 flex items-start gap-3">
            <span class="text-2xl flex-shrink-0">📍</span>
            <div class="flex-1 min-w-0">
                <p class="text-white font-bold text-sm leading-snug">
                    מפרסם ב: <span class="text-amber-400">{neighborhoodLabel}</span>
                </p>
                <p class="text-gray-400 text-xs mt-0.5">רוצה לפרסם בשכונות נוספות?</p>
                <button
                    type="button"
                    onclick={() => { toastVisible = false; showPicker = true; window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    class="text-amber-400 text-xs hover:text-amber-300 transition-colors mt-1 underline underline-offset-2 font-bold"
                >שנה שכונות ←</button>
            </div>
            <button
                type="button"
                onclick={() => toastVisible = false}
                class="text-gray-600 hover:text-white transition-colors text-sm flex-shrink-0 mt-0.5"
                aria-label="סגור"
            >✕</button>
        </div>
    </div>
{/if}

<style>
    @keyframes slideDown {
        from { opacity: 0; transform: translateY(-10px); }
        to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideUp {
        from { opacity: 0; transform: translate(-50%, 16px); }
        to   { opacity: 1; transform: translate(-50%, 0); }
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style>
