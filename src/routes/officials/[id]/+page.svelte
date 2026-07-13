<script lang="ts">
    // דף פרופיל מדורג — לב האתר: סיכום ציון, טופס דירוג ודירוגי הציבור
    import { groupByKey } from '$lib/rating/types';
    import { fmtScore } from '$lib/rating/aggregate';
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

    const metaDescription = $derived(
        `${official.name} — ${official.position}${official.org ? ` · ${official.org}` : ''}. ` +
            (stats.count > 0
                ? `ציון ${fmtScore(stats.average)} מתוך 5 על בסיס ${stats.count} דירוגי אזרחים.`
                : 'טרם דורג — היו הראשונים לדרג.'),
    );
</script>

<svelte:head>
    <title>{official.name} — דירוג ציבורי</title>
    <meta name="description" content={metaDescription} />
</svelte:head>

<div class="flex flex-col gap-4 py-6">
    <!-- כותרת: מי המדורג -->
    <section class="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <Avatar name={official.name} size={72} />
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
        <h2 class="text-lg font-bold text-white">דירוגי הציבור ({stats.count})</h2>

        {#if data.reviews.length}
            {#each data.reviews as review (review.id)}
                <ReviewCard
                    {review}
                    officialId={official.id}
                    canDelete={data.isAdmin || review.mine}
                    loggedIn={data.me !== null}
                />
            {/each}
        {:else}
            <div class="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-gray-500">
                אין עדיין דירוגים — היו הראשונים
            </div>
        {/if}
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
