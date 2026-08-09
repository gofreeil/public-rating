<script lang="ts">
    // ============================================================
    // בילדר הפרסומת — עיצוב הכרטיס ודף הנחיתה, עם תצוגה מקדימה חיה.
    //
    // הבילדר במקור הוא עורך קנבס של ~1,300 שורות (גרירת לוגו, זום,
    // היסטים). כאן נבחר עורך טפסים עם תצוגה מקדימה: הוא מכסה את אותה
    // יכולת מוצרית — מפרסם מעצב, רואה ושולח — בשבריר המורכבות, ובלי
    // ממשק גרירה שקשה להפעיל בנייד ובמקלדת.
    // ============================================================
    import { goto } from '$app/navigation';
    import AdCardEditor from '$lib/components/rating/AdCardEditor.svelte';
    import { compressImage, dataUrlBytes, fmtKb, MAX_AD_TOTAL_BYTES } from '$lib/ads/adImage';
    import Seo from '$lib/components/rating/Seo.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    // ---- הכרטיס ----
    let title = $state('');
    let subtitle = $state('');
    let hoverText = $state('');
    let cta = $state('לפרטים');
    let gradientId = $state('amber');
    let cardStyle = $state<Record<string, unknown>>({});
    let mainImage = $state('');
    let logo = $state('');

    // ---- דף הנחיתה ----
    let headline = $state('');
    let pitch = $state('');
    let extended = $state('');
    let advantages = $state(['', '', '']);
    let uniqueness = $state('');
    let phone = $state('');
    let whatsapp = $state('');
    let website = $state('');
    let email = $state('');
    let address = $state('');
    let hours = $state('');
    let landingImage = $state('');

    let durationDays = $state(30);

    // שדה דבש — מוסתר מהמשתמש, ממולא רק בידי בוט
    let companyUrl = $state('');

    let sending = $state(false);
    let error = $state('');
    // השגיאה נקשרת לאזור ההעלאה שבו קרתה — מוצגת שם, לא בסקשן אחר
    let imageError = $state<{ zone: '' | 'card' | 'landing'; msg: string }>({ zone: '', msg: '' });

    const totalBytes = $derived(
        dataUrlBytes(mainImage) + dataUrlBytes(logo) + dataUrlBytes(landingImage),
    );
    // מעל התקרה השרת ידחה (413) — לכן חוסמים כבר כאן, עם הסבר, במקום
    // לתת ללחוץ "שליחה" ולגלות את הבעיה בסוף
    const overweight = $derived(totalBytes > MAX_AD_TOTAL_BYTES);
    const canSend = $derived(Boolean(title.trim()) && !sending && !overweight);

    async function pickImage(e: Event, target: 'main' | 'logo' | 'landing') {
        const input = e.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        imageError = { zone: '', msg: '' };
        try {
            const compressed = await compressImage(file, target === 'logo' ? 90 * 1024 : 220 * 1024);
            if (target === 'main') mainImage = compressed;
            else if (target === 'logo') logo = compressed;
            else landingImage = compressed;
        } catch (err) {
            imageError = {
                zone: target === 'landing' ? 'landing' : 'card',
                msg: err instanceof Error ? err.message : 'שגיאה בטעינת התמונה',
            };
        } finally {
            input.value = '';
        }
    }

    async function submit(e: SubmitEvent) {
        e.preventDefault();
        if (!canSend) return;
        sending = true;
        error = '';

        try {
            const res = await fetch('/api/ads/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_url: companyUrl,
                    title,
                    subtitle,
                    hoverText,
                    cta,
                    gradientId,
                    style: cardStyle,
                    mainImage,
                    logo,
                    requestedDurationDays: durationDays,
                    landing: {
                        headline: headline || title,
                        pitch,
                        extended,
                        image: landingImage,
                        advantages,
                        uniqueness,
                        phone,
                        whatsapp,
                        website,
                        email,
                        address,
                        hours,
                        products: [],
                    },
                }),
            });
            const body = await res.json();
            if (!res.ok || !body.ok) {
                error = body.error ?? 'השליחה נכשלה';
                if (body.login) goto(body.login);
                return;
            }
            goto('/advertise/manage?sent=1');
        } catch {
            error = 'שגיאת רשת — נסו שוב';
        } finally {
            sending = false;
        }
    }

    const inputCls =
        'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-400/60 focus:outline-none';
    const labelCls = 'mb-1 block text-xs font-semibold text-gray-400';
</script>

<Seo title="עיצוב פרסומת" description="עצבו את הפרסומת שלכם ושלחו אותה לאישור" noindex />

<div class="flex flex-col gap-4 py-6 lg:flex-row lg:items-start">
    <!-- ---- הטופס ---- -->
    <form onsubmit={submit} class="flex min-w-0 flex-1 flex-col gap-4">
        <header>
            <h1 class="text-2xl font-black text-white sm:text-3xl">🎨 עיצוב הפרסומת</h1>
            <p class="mt-1 text-sm text-gray-400">
                שלום {data.name} — מלאו את הפרטים, ראו את התצוגה המקדימה ושלחו לאישור
            </p>
        </header>

        <!-- שדה דבש -->
        <div aria-hidden="true" class="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0">
            <label>
                אל תמלאו שדה זה
                <input type="text" name="company_url" tabindex="-1" autocomplete="off" bind:value={companyUrl} />
            </label>
        </div>

        {#if error}
            <p class="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
        {/if}

        <section class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 class="mb-3 font-black text-white">הכרטיס בטור הפרסומות</h2>
            <div class="grid gap-3 sm:grid-cols-2">
                <label class="block sm:col-span-2">
                    <span class={labelCls}>כותרת * (עד 35)</span>
                    <input bind:value={title} required maxlength="35" class={inputCls} />
                </label>
                <label class="block sm:col-span-2">
                    <span class={labelCls}>שורת משנה (עד 70)</span>
                    <input bind:value={subtitle} maxlength="70" class={inputCls} />
                </label>
                <label class="block sm:col-span-2">
                    <span class={labelCls}>משפט המכירה — מוצג בריחוף על הכרטיס (עד 90)</span>
                    <!-- textarea ולא input: אפשר לרדת שורה, וירידות השורה נשמרות
                         עד ל-tooltip שהגולש רואה -->
                    <textarea bind:value={hoverText} maxlength="90" rows="3" class={inputCls}></textarea>
                </label>
                <label class="block sm:col-span-2">
                    <span class={labelCls}>טקסט הכפתור</span>
                    <input bind:value={cta} maxlength="30" class={inputCls} />
                </label>
                <label class="block">
                    <span class={labelCls}>תמונה ראשית</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp" onchange={(e) => pickImage(e, 'main')} class={inputCls} />
                </label>
                <label class="block">
                    <span class={labelCls}>לוגו (עגול)</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp" onchange={(e) => pickImage(e, 'logo')} class={inputCls} />
                </label>
            </div>
            {#if imageError.zone === 'card'}
                <p class="mt-2 text-xs text-red-300">{imageError.msg}</p>
            {/if}
            <p class="mt-2 text-xs {overweight ? 'font-bold text-red-300' : 'text-gray-500'}">
                התמונות נדחסות אוטומטית. משקל נוכחי: {fmtKb(totalBytes)} מתוך {fmtKb(MAX_AD_TOTAL_BYTES)} המותרים.
                {#if overweight}
                    הסירו או החליפו תמונה — אי אפשר לשלוח מעל התקרה.
                {/if}
            </p>
        </section>

        <section class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 class="mb-3 font-black text-white">דף הנחיתה שלכם באתר</h2>
            <div class="grid gap-3 sm:grid-cols-2">
                <label class="block sm:col-span-2">
                    <span class={labelCls}>כותרת ראשית (ריק = כותרת הכרטיס)</span>
                    <input bind:value={headline} maxlength="60" class={inputCls} />
                </label>
                <label class="block sm:col-span-2">
                    <span class={labelCls}>תיאור קצר</span>
                    <textarea bind:value={pitch} rows="2" maxlength="400" class={inputCls}></textarea>
                </label>
                <label class="block sm:col-span-2">
                    <span class={labelCls}>תיאור מורחב</span>
                    <textarea bind:value={extended} rows="3" maxlength="2000" class={inputCls}></textarea>
                </label>
                {#each [0, 1, 2] as i (i)}
                    <label class="block">
                        <span class={labelCls}>יתרון {i + 1}</span>
                        <input bind:value={advantages[i]} maxlength="80" class={inputCls} />
                    </label>
                {/each}
                <label class="block">
                    <span class={labelCls}>מה מייחד אתכם</span>
                    <input bind:value={uniqueness} maxlength="500" class={inputCls} />
                </label>
                <label class="block sm:col-span-2">
                    <span class={labelCls}>תמונה לדף הנחיתה</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp" onchange={(e) => pickImage(e, 'landing')} class={inputCls} />
                    {#if imageError.zone === 'landing'}
                        <span class="mt-1 block text-xs text-red-300">{imageError.msg}</span>
                    {/if}
                </label>

                <label class="block">
                    <span class={labelCls}>טלפון</span>
                    <input bind:value={phone} maxlength="25" class={inputCls} />
                </label>
                <label class="block">
                    <span class={labelCls}>וואטסאפ</span>
                    <input bind:value={whatsapp} maxlength="25" class={inputCls} />
                </label>
                <label class="block">
                    <span class={labelCls}>דוא״ל</span>
                    <input bind:value={email} type="email" maxlength="200" class={inputCls} />
                </label>
                <label class="block">
                    <span class={labelCls}>אתר (http/https בלבד)</span>
                    <input bind:value={website} maxlength="400" placeholder="https://" class={inputCls} />
                </label>
                <label class="block">
                    <span class={labelCls}>כתובת</span>
                    <input bind:value={address} maxlength="120" class={inputCls} />
                </label>
                <label class="block">
                    <span class={labelCls}>שעות פעילות</span>
                    <input bind:value={hours} maxlength="120" class={inputCls} />
                </label>
            </div>
        </section>

        <section class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 class="mb-3 font-black text-white">תקופת הפרסום</h2>
            <div class="flex flex-wrap gap-2">
                {#each data.plans as p (p.days)}
                    <button
                        type="button"
                        onclick={() => (durationDays = p.days)}
                        aria-pressed={durationDays === p.days}
                        class="cursor-pointer rounded-xl border px-4 py-2 text-sm font-bold transition-colors {durationDays ===
                        p.days
                            ? 'border-blue-400/50 bg-blue-500/20 text-blue-200'
                            : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'}"
                    >{p.label} · ₪{p.price}</button>
                {/each}
            </div>
            <p class="mt-2 text-xs text-gray-500">
                התשלום מתואם מול צוות האתר אחרי האישור. הפרסומת עולה לאוויר רק לאחר אישור.
            </p>
        </section>

        <div class="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={!canSend} class="btn-premium rounded-xl px-6 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
                {sending ? 'שולח…' : 'שליחה לאישור'}
            </button>
            <a href="/advertise" class="text-sm text-gray-400 hover:text-gray-200">ביטול</a>
        </div>
        {#if overweight}
            <p class="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-300">
                ⚖️ המודעה כבדה מדי ({fmtKb(totalBytes)} מתוך {fmtKb(MAX_AD_TOTAL_BYTES)}) — הקטינו או הסירו תמונה כדי לשלוח.
            </p>
        {/if}
    </form>

    <!-- ---- עורך הכרטיס: תצוגה מקדימה חיה + פקדי עיצוב ---- -->
    <aside class="lg:w-72 lg:shrink-0">
        <AdCardEditor
            {title}
            {subtitle}
            {hoverText}
            {cta}
            bind:gradientId
            {mainImage}
            {logo}
            bind:style={cardStyle}
        />
    </aside>
</div>
