<script lang="ts">
    // דף פרופיל מדורג — לב האתר: סיכום ציון, טופס דירוג ודירוגי הציבור
    import { groupByKey } from '$lib/rating/types';
    import { fmtScore } from '$lib/rating/aggregate';
    import { breadcrumbSchema, officialSchema } from '$lib/rating/schema';
    import Seo from '$lib/components/rating/Seo.svelte';
    import ShareBar from '$lib/components/rating/ShareBar.svelte';
    import TrustPanel from '$lib/components/rating/TrustPanel.svelte';
    import TrendChart from '$lib/components/rating/TrendChart.svelte';
    import Avatar from '$lib/components/rating/Avatar.svelte';
    import Stars from '$lib/components/rating/Stars.svelte';
    import Histogram from '$lib/components/rating/Histogram.svelte';
    import CriteriaBars from '$lib/components/rating/CriteriaBars.svelte';
    import RateForm from '$lib/components/rating/RateForm.svelte';
    import ReviewList from '$lib/components/rating/ReviewList.svelte';
    import ProfileDetails from '$lib/components/rating/ProfileDetails.svelte';
    import KnessetRecord from '$lib/components/rating/KnessetRecord.svelte';
    import InquiryPanel from '$lib/components/rating/InquiryPanel.svelte';
    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    const official = $derived(data.official);
    const stats = $derived(data.stats);
    const group = $derived(groupByKey(official.group));

    // סינון דירוגים לפי מספר כוכבים — נבחר בלחיצה על ההיסטוגרמה
    let starFilter = $state<number | null>(null);

    function selectStar(star: number | null) {
        starFilter = star;
        if (star !== null) {
            document.getElementById('public-reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // תגובות מקובצות לפי הדירוג שעליו הגיבו
    const commentsByReview = $derived.by(() => {
        const map = new Map<string, typeof data.comments>();
        for (const c of data.comments) {
            const list = map.get(c.review_id);
            if (list) list.push(c);
            else map.set(c.review_id, [c]);
        }
        return map;
    });

    const metaDescription = $derived(
        `${official.name} — ${official.position}${official.org ? ` · ${official.org}` : ''}. ` +
            (stats.count > 0
                ? `ציון ${fmtScore(stats.average)} מתוך 5 על בסיס ${stats.count} דירוגי אזרחים.`
                : 'טרם דורג — היו הראשונים לדרג.'),
    );

    const seoTitle = $derived(
        stats.count > 0
            ? `${official.name} — ציון ${fmtScore(stats.average)}/5 (${stats.count} דירוגים)`
            : official.name,
    );

    const shareText = $derived(
        stats.count > 0
            ? `${official.name}${official.position ? ` (${official.position})` : ''} מדורג/ת ${fmtScore(stats.average)} מתוך 5 על ידי ${stats.count} אזרחים בדירוג ציבורי. מה הדירוג שלכם?`
            : `${official.name}${official.position ? ` (${official.position})` : ''} עדיין לא דורג/ה בדירוג ציבורי — היו הראשונים.`,
    );

    const jsonLd = $derived([
        officialSchema(official, stats, data.reviews, group),
        breadcrumbSchema([
            { name: 'דירוג ציבורי', path: '/' },
            ...(group ? [{ name: group.title, path: group.route }] : []),
            { name: official.name, path: `/officials/${official.id}` },
        ]),
    ]);
</script>

<Seo
    title={seoTitle}
    description={metaDescription}
    type="profile"
    image="/officials/{official.id}/og.png"
    imageWidth={1200}
    imageHeight={630}
    {jsonLd}
/>

<div class="flex flex-col gap-4 py-6">
    <!-- כותרת: מי המדורג -->
    <section class="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <Avatar name={official.name} image={official.image} size={72} />
        <div class="min-w-0 flex-1">
            <h1 class="flex flex-wrap items-center gap-2 text-2xl font-black text-white sm:text-3xl">
                {official.name}
                {#if official.verified}
                    <span
                        class="rounded-full border border-sky-400/40 bg-sky-500/10 px-2.5 py-0.5 text-xs font-bold text-sky-300"
                        title="הזהות, התפקיד ופרטי הקשר אומתו על ידי צוות האתר"
                    >✔️ פרופיל מאומת</span>
                {/if}
                {#if data.lastResponseAt}
                    <span
                        class="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-300"
                        title="ענה/תה רשמית לפניות ציבור באתר"
                    >🟢 מגיב/ה לפניות</span>
                {/if}
            </h1>
            <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-400">
                <span>{official.position}{official.org ? ` · ${official.org}` : ''}</span>
                {#if group}
                    <a
                        href={group.route}
                        class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-blue-400 transition-colors duration-150 hover:text-blue-300"
                    >{group.icon} {group.title}</a>
                {/if}
            </div>
            {#if official.bio}
                <p class="mt-1 truncate text-sm text-gray-500">{official.bio}</p>
            {/if}
        </div>
    </section>

    <!-- תעודת זהות ציבורית: קשר, שקיפות בפועל, התמחויות והבטחות -->
    <ProfileDetails {official} lastResponseAt={data.lastResponseAt} />

    <!-- רזומה פרלמנטרית מהקדנציה — נתוני הכנסת עצמם, לפני דעות הגולשים -->
    {#if official.knesset_record}
        <KnessetRecord record={official.knesset_record} name={official.name} />
    {/if}

    <!-- סיכום ציון: ממוצע + היסטוגרמה + מדדים -->
    <section class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div class="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div class="flex flex-col items-center gap-1">
                <span class="text-4xl font-black text-amber-400 tabular-nums">{fmtScore(stats.average)}</span>
                <Stars value={stats.average ?? 0} size={22} />
                <span class="text-xs text-gray-500">
                    {stats.count > 0 ? `מבוסס על ${stats.count} דירוגים` : 'אין עדיין דירוגים'}
                </span>
            </div>
            <div class="min-w-56 flex-1">
                <Histogram
                    distribution={stats.distribution}
                    count={stats.count}
                    selected={starFilter}
                    onselect={selectStar}
                />
            </div>
            <div class="min-w-64 flex-1">
                <CriteriaBars perCriterion={stats.perCriterion} />
            </div>
        </div>

        {#if stats.count > 0}
            <div class="mt-3 border-t border-white/10 pt-3">
                <TrustPanel {stats} reviews={data.reviews} />
            </div>
        {/if}

        <div class="mt-3 border-t border-white/10 pt-3">
            <ShareBar text={shareText} title="{official.name} — דירוג ציבורי" />
        </div>
    </section>

    <!-- מגמה לאורך זמן — מוצגת רק כשיש מספיק דירוגים לאורך יותר מחודש אחד -->
    <TrendChart reviews={data.reviews} />

    <!-- דרגו בעצמכם -->
    <section class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 class="mb-3 text-lg font-bold text-white">דרגו בעצמכם</h2>

        {#if data.me}
            {#if form?.success}
                <p class="mb-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                    ✅ הדירוג פורסם — תודה שתרמתם לשקיפות הציבורית
                </p>
            {:else if form?.error}
                <p class="mb-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {form.error}
                </p>
            {/if}
            <RateForm myReview={data.myReview} officialId={official.id} />
        {:else}
            <div class="flex flex-wrap items-center gap-3">
                <p class="flex-1 text-sm text-gray-400" style="min-width: 14rem">
                    רק משתמשים מחוברים מדרגים — כך נשמרת אמינות הדירוג
                </p>
                <a
                    href="/login?redirect=/officials/{official.id}"
                    class="btn-premium rounded-xl px-5 py-2 text-sm font-bold text-white"
                >התחברות לדירוג</a>
            </div>
        {/if}
    </section>

    <!-- דירוגי הציבור -->
    <section id="public-reviews" class="flex scroll-mt-20 flex-col gap-2">
        <div class="flex flex-wrap items-baseline gap-3">
            <h2 class="text-lg font-bold text-white">דירוגי הציבור ({stats.count})</h2>
            {#if data.isOfficialUser}
                <span class="rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                    🎖️ זה הדף שלך — התגובות שתפרסמו יסומנו כמענה רשמי
                </span>
            {/if}
        </div>

        {#if form?.commentError}
            <p class="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {form.commentError}
            </p>
        {/if}

        <ReviewList
            reviews={data.reviews}
            {commentsByReview}
            officialId={official.id}
            officialName={official.name}
            loggedIn={data.me !== null}
            isAdmin={data.isAdmin}
            isOfficialUser={data.isOfficialUser}
            {starFilter}
            onclearstar={() => (starFilter = null)}
        />

        <p class="text-xs leading-relaxed text-gray-600">
            הדירוגים והתגובות בעמוד זה הם דעות אישיות של משתמשים ואינם משקפים את עמדת האתר.
            נתקלתם בתוכן פוגעני, בלשון הרע או בזיהוי שגוי? לחצו על <b class="text-gray-500">🚩 דיווח</b>
            בכרטיס הרלוונטי — הדיווח נבדק על ידי צוות האתר. פרטים נוספים
            <a href="/legal" class="text-blue-400/80 hover:underline">בתנאי השימוש</a>.
        </p>
    </section>

    <!-- פניות ציבור -->
    {#if form?.inquiryError}
        <p class="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {form.inquiryError}
        </p>
    {:else if form?.inquirySuccess}
        <p class="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            ✅ הפנייה פורסמה — היא גלויה עכשיו לציבור ולמדורג
        </p>
    {/if}
    <InquiryPanel
        inquiries={data.inquiries}
        officialId={official.id}
        officialName={official.name}
        loggedIn={data.me !== null}
        isAdmin={data.isAdmin}
        isOfficialUser={data.isOfficialUser}
    />

    <div class="text-center">
        {#if group}
            <a href={group.route} class="text-sm text-blue-400 transition-colors hover:text-blue-300">
                ← חזרה ללוח {group.title}
            </a>
        {:else}
            <a href="/" class="text-sm text-blue-400 transition-colors hover:text-blue-300">← חזרה לדף הבית</a>
        {/if}
    </div>
</div>
