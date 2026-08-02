<script lang="ts">
    // האזור האישי של המדרג — מה דירגתי, איפה אני מול הציבור, ומה עלה בגורל הצעותיי
    import { enhance } from '$app/forms';
    import { CRITERIA } from '$lib/rating/criteria';
    import { fmtScore } from '$lib/rating/aggregate';
    import { absDate, isoDate, relDate } from '$lib/rating/time';
    import { groupByKey } from '$lib/rating/types';
    import Avatar from '$lib/components/rating/Avatar.svelte';
    import Seo from '$lib/components/rating/Seo.svelte';
    import Stars from '$lib/components/rating/Stars.svelte';
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    const now = Date.now();

    /** פער בין הדירוג שלי לממוצע הציבורי — הסיפור המעניין בדף הזה */
    function gap(mine: number, publicAvg: number | null): { text: string; tone: string } | null {
        if (publicAvg === null) return null;
        const d = mine - publicAvg;
        if (Math.abs(d) < 0.5) return { text: 'תואם לציבור', tone: 'text-gray-500' };
        return d > 0
            ? { text: `מחמיר/ה פחות מהציבור (+${fmtScore(d)})`, tone: 'text-emerald-400/80' }
            : { text: `מחמיר/ה יותר מהציבור (${fmtScore(Math.abs(d))}-)`, tone: 'text-amber-400/80' };
    }
</script>

<Seo
    title="הדירוגים שלי"
    description="הדירוגים שפרסמתי, הפער ביני לבין הציבור וסטטוס ההצעות ששלחתי."
    noindex
/>

<div class="flex flex-col gap-4 py-6">
    <header class="flex flex-wrap items-baseline justify-between gap-2">
        <h1 class="text-2xl font-black text-white sm:text-3xl">⭐ הדירוגים שלי</h1>
        {#if data.mine.length}
            <span class="text-sm text-gray-400">
                {data.mine.length} דירוגים · ממוצע שנתתי {fmtScore(data.avgGiven)}
            </span>
        {/if}
    </header>

    {#if form?.success}
        <p class="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            ✅ {form.message}
        </p>
    {:else if form?.error}
        <p class="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {form.error}
        </p>
    {/if}

    {#if data.mine.length === 0}
        <div class="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
            <div class="text-4xl">⭐</div>
            <p class="mt-2 font-bold text-white">עוד לא דירגתם אף אחד</p>
            <p class="mt-1 text-sm text-gray-400">
                הדירוג שלכם הוא הקול שלכם — בחרו לוח והתחילו
            </p>
            <div class="mt-4 flex flex-wrap justify-center gap-2">
                {#each ['knesset', 'judges', 'public_servants'] as key (key)}
                    {@const g = groupByKey(key)}
                    {#if g}
                        <a href={g.route} class="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-bold text-white transition-colors hover:bg-white/10">
                            {g.icon} {g.title}
                        </a>
                    {/if}
                {/each}
            </div>
        </div>
    {:else}
        <div class="flex flex-col gap-3">
            {#each data.mine as m (m.reviewId)}
                {@const g = gap(m.overall, m.official.publicAverage)}
                <article class="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div class="flex flex-wrap items-center gap-3">
                        <Avatar name={m.official.name} image={m.official.image} size={44} />
                        <div class="min-w-0 flex-1">
                            <a href="/officials/{m.official.id}" class="block truncate font-bold text-white hover:text-blue-300">
                                {m.official.name}
                            </a>
                            <span class="block truncate text-xs text-gray-400">
                                {m.official.position}{m.official.org ? ` · ${m.official.org}` : ''}
                            </span>
                        </div>

                        <div class="flex flex-col items-center">
                            <span class="text-[11px] text-gray-500">הדירוג שלי</span>
                            <span class="flex items-center gap-1.5">
                                <Stars value={m.overall} size={14} />
                                <b class="text-sm text-amber-300 tabular-nums">{fmtScore(m.overall)}</b>
                            </span>
                        </div>

                        <div class="flex flex-col items-center">
                            <span class="text-[11px] text-gray-500">הציבור</span>
                            <span class="text-sm font-bold text-gray-300 tabular-nums">
                                {fmtScore(m.official.publicAverage)}
                                <span class="text-[11px] font-normal text-gray-600">({m.official.publicCount})</span>
                            </span>
                        </div>
                    </div>

                    {#if m.text}
                        <p class="mt-2 line-clamp-3 text-sm leading-relaxed whitespace-pre-line text-gray-300">
                            {m.text}
                        </p>
                    {/if}

                    <div class="mt-2 flex flex-wrap gap-1">
                        {#each CRITERIA as c (c.key)}
                            {#if typeof m.scores[c.key] === 'number'}
                                <span class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-400">
                                    {c.short} <b class="text-amber-300 tabular-nums">{m.scores[c.key]}</b>
                                </span>
                            {/if}
                        {/each}
                    </div>

                    <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/5 pt-2 text-xs">
                        {#if g}
                            <span class={g.tone}>{g.text}</span>
                        {/if}
                        {#if m.anonymous}
                            <span class="text-gray-500">🕶️ פורסם אנונימית</span>
                        {/if}
                        {#if m.helpfulCount > 0}
                            <span class="text-blue-300/80">👍 {m.helpfulCount} סימנו כמועיל</span>
                        {/if}
                        <time datetime={isoDate(m.updated_at)} title={absDate(m.updated_at)} class="text-gray-500">
                            עודכן {relDate(m.updated_at, now)}
                        </time>

                        <a href="/officials/{m.official.id}" class="mr-auto font-bold text-blue-400 hover:text-blue-300">
                            ✏️ עריכה
                        </a>
                        <form
                            method="POST"
                            action="?/delete_review"
                            use:enhance={({ cancel }) => {
                                if (!confirm(`למחוק את הדירוג שלכם על ${m.official.name}?`)) {
                                    cancel();
                                    return;
                                }
                                return async ({ update }) => await update();
                            }}
                        >
                            <input type="hidden" name="review_id" value={m.reviewId} />
                            <button type="submit" class="cursor-pointer text-red-400/80 transition-colors hover:text-red-300">
                                🗑 מחיקה
                            </button>
                        </form>
                    </div>
                </article>
            {/each}
        </div>
    {/if}

    <!-- הצעות שממתינות לאישור -->
    {#if data.mySuggestions.length}
        <section class="rounded-2xl border border-white/10 bg-white/5 p-3">
            <h2 class="mb-2 font-black text-white">ההצעות שלי ({data.mySuggestions.length})</h2>
            <ul class="flex flex-col gap-1.5">
                {#each data.mySuggestions as s (s.id)}
                    {@const g = groupByKey(s.group)}
                    <li class="flex flex-wrap items-center gap-2 text-sm">
                        <span class="font-bold text-white">{s.name}</span>
                        {#if s.position}<span class="text-xs text-gray-500">{s.position}</span>{/if}
                        {#if g}<span class="text-xs text-gray-500">· {g.title}</span>{/if}
                        <span class="mr-auto rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                            ⏳ ממתין לאישור
                        </span>
                    </li>
                {/each}
            </ul>
        </section>
    {/if}

    <div class="flex flex-wrap justify-center gap-3 text-sm">
        <a href="/suggest" class="text-blue-400 transition-colors hover:text-blue-300">➕ הצעת מדורג</a>
        <a href="/" class="text-blue-400 transition-colors hover:text-blue-300">← דף הבית</a>
    </div>
</div>
