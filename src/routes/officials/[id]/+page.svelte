<script lang="ts">
    // דף פרופיל מדורג — לב האתר: סיכום ציון, טופס דירוג ודירוגי הציבור
    import { groupByKey } from '$lib/rating/types';
    import { fmtScore } from '$lib/rating/aggregate';
    import { breadcrumbSchema, officialSchema } from '$lib/rating/schema';
    import Seo from '$lib/components/rating/Seo.svelte';
    import ShareBar from '$lib/components/rating/ShareBar.svelte';
    import Avatar from '$lib/components/rating/Avatar.svelte';
    import Stars from '$lib/components/rating/Stars.svelte';
    import Histogram from '$lib/components/rating/Histogram.svelte';
    import CriteriaBars from '$lib/components/rating/CriteriaBars.svelte';
    import RateForm from '$lib/components/rating/RateForm.svelte';
    import ReviewCard from '$lib/components/rating/ReviewCard.svelte';
    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    const official = $derived(data.official);
    const stats = $derived(data.stats);
    const group = $derived(groupByKey(official.group));

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
    image={official.image || undefined}
    {jsonLd}
/>

<div class="flex flex-col gap-4 py-6">
    <!-- כותרת: מי המדורג -->
    <section class="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <Avatar name={official.name} image={official.image} size={72} />
        <div class="min-w-0 flex-1">
            <h1 class="text-2xl font-black text-white sm:text-3xl">{official.name}</h1>
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
                <Histogram distribution={stats.distribution} count={stats.count} />
            </div>
            <div class="min-w-64 flex-1">
                <CriteriaBars perCriterion={stats.perCriterion} />
            </div>
        </div>

        <div class="mt-3 border-t border-white/10 pt-3">
            <ShareBar text={shareText} title="{official.name} — דירוג ציבורי" />
        </div>
    </section>

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
            <RateForm myReview={data.myReview} />
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
    <section class="flex flex-col gap-2">
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

        {#if data.reviews.length}
            {#each data.reviews as review (review.id)}
                <ReviewCard
                    {review}
                    officialId={official.id}
                    canDelete={data.isAdmin || review.mine}
                    loggedIn={data.me !== null}
                    comments={commentsByReview.get(review.id) ?? []}
                    officialName={official.name}
                    isAdmin={data.isAdmin}
                    isOfficialUser={data.isOfficialUser}
                />
            {/each}
        {:else}
            <div class="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-gray-500">
                אין עדיין דירוגים — היו הראשונים
            </div>
        {/if}

        <p class="text-xs leading-relaxed text-gray-600">
            הדירוגים והתגובות בעמוד זה הם דעות אישיות של משתמשים ואינם משקפים את עמדת האתר.
            נתקלתם בתוכן פוגעני? <a href="/legal" class="text-blue-400/80 hover:underline">דווחו לנו</a> ונטפל בהקדם.
        </p>
    </section>

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
