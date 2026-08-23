<script lang="ts">
    // דף מדד בודד של דמות — תיק הראיות שעליו יתבסס הציון.
    // כרגע ריק כמעט בכל הדמויות: המבנה עומד, החומר נכנס בהמשך.
    import { CRITERIA, criterionByKey } from '$lib/rating/criteria';
    import { EVIDENCE_KINDS, type EvidenceItem } from '$lib/rating/evidence';
    import { groupByKey } from '$lib/rating/types';
    import { fmtScore } from '$lib/rating/aggregate';
    import { absDate } from '$lib/rating/time';
    import { breadcrumbSchema } from '$lib/rating/schema';
    import Seo from '$lib/components/rating/Seo.svelte';
    import Avatar from '$lib/components/rating/Avatar.svelte';
    import Stars from '$lib/components/rating/Stars.svelte';
    import Histogram from '$lib/components/rating/Histogram.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    const official = $derived(data.official);
    const stats = $derived(data.stats);
    const criterion = $derived(criterionByKey(data.criterionKey)!);
    const group = $derived(groupByKey(official.group));
    const profileUrl = $derived(`/officials/${official.id}`);

    /** הראיות מסודרות לרצועות לפי סוג — רצועה ריקה מציגה מה ייכנס אליה */
    const byKind = $derived.by(() => {
        const map = new Map<string, EvidenceItem[]>();
        for (const k of EVIDENCE_KINDS) map.set(k.key, []);
        for (const e of data.evidence) map.get(e.kind)?.push(e);
        return map;
    });

    const analyzedCount = $derived(data.evidence.filter((e) => e.analysis).length);

    const metaDescription = $derived(
        `${criterion.label} — ${official.name}: ציוצים, ראיונות, דיווחים וסיקור תקשורתי על פעולות ${official.name} במדד הזה, וניתוח שלהם.`,
    );

    // דף ריק (בלי חומר ובלי ניתוח) לא נכנס לאינדקס — 5 דפים לכל דמות בלי תוכן
    // הם בדיוק "thin content" שגוגל מעניש עליו. מרגע שנכנס חומר הדף נפתח לאינדוקס.
    const hasContent = $derived(data.evidence.length > 0 || Boolean(data.analysis?.summary));

    const jsonLd = $derived(
        breadcrumbSchema([
            { name: 'דירוג ציבורי', path: '/' },
            ...(group ? [{ name: group.title, path: group.route }] : []),
            { name: official.name, path: profileUrl },
            { name: criterion.label, path: `${profileUrl}/${criterion.key}` },
        ]),
    );
</script>

<Seo
    title="{official.name} — {criterion.label}"
    description={metaDescription}
    image="/officials/{official.id}/og.png"
    imageWidth={1200}
    imageHeight={630}
    noindex={!hasContent}
    {jsonLd}
/>

<div class="flex flex-col gap-4 py-6">
    <div class="-mb-2">
        <a href={profileUrl} class="text-sm text-blue-400 transition-colors hover:text-blue-300">
            ← חזרה לדף {official.name}
        </a>
    </div>

    <!-- כותרת: מי, איזה מדד, ומה הציון הציבורי שלו כרגע -->
    <section class="rounded-2xl border border-white/10 bg-slate-800/80 p-4">
        <div class="flex flex-wrap items-center gap-4">
            <a href={profileUrl} class="shrink-0">
                <Avatar name={official.name} image={official.image} size={64} />
            </a>
            <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <h1 class="text-2xl font-black text-white">
                        <span aria-hidden="true">{criterion.icon}</span>
                        {criterion.label}
                    </h1>
                    <a href={profileUrl} class="text-sm font-bold text-blue-400 hover:text-blue-300">
                        {official.name}
                    </a>
                </div>
                <p class="mt-1 text-sm leading-relaxed text-gray-300">{criterion.description}</p>
                <p class="mt-0.5 text-xs text-gray-400">
                    {official.position}{official.org ? ` · ${official.org}` : ''}
                </p>
            </div>

            <!-- ציון המדד לפי דירוגי הגולשים — אותו מספר שבשורת המדד בפרופיל -->
            <div class="flex shrink-0 flex-col items-center gap-1">
                <span class="text-4xl font-black tabular-nums text-amber-400">
                    {stats.count > 0 ? fmtScore(stats.average) : '0.0'}
                </span>
                <Stars value={stats.average ?? 0} size={20} />
                <span class="text-xs text-gray-400">{stats.count} דירוגי ציבור</span>
            </div>
        </div>

        {#if stats.count > 0}
            <div class="mt-3 max-w-md border-t border-white/10 pt-3">
                <Histogram distribution={stats.distribution} count={stats.count} />
            </div>
        {/if}
    </section>

    <!-- מעבר מהיר בין חמשת המדדים של אותה דמות -->
    <nav class="flex flex-wrap gap-2" aria-label="מדדים נוספים של {official.name}">
        {#each CRITERIA as c (c.key)}
            {@const active = c.key === criterion.key}
            <a
                href="{profileUrl}/{c.key}"
                aria-current={active ? 'page' : undefined}
                class="rounded-full border px-3 py-1 text-xs font-bold transition-colors {active
                    ? 'border-blue-400/50 bg-blue-500/15 text-blue-200'
                    : 'border-white/10 bg-slate-800/80 text-gray-300 hover:text-white'}"
            >
                <span aria-hidden="true">{c.icon}</span>
                {c.short}
            </a>
        {/each}
    </nav>

    <!-- ניתוח ה-AI: מה הראיות שנאספו מלמדות על המדד -->
    <section class="rounded-2xl border border-purple-400/20 bg-purple-500/5 p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-lg font-bold text-white">🤖 ניתוח החומר</h2>
            {#if data.analysis && data.analysis.score !== null}
                <span class="flex items-center gap-2 text-sm">
                    <Stars value={data.analysis.score} size={16} />
                    <span class="font-black tabular-nums text-amber-300">
                        {fmtScore(data.analysis.score)}
                    </span>
                </span>
            {/if}
        </div>

        {#if data.analysis && (data.analysis.summary || data.analysis.highlights.length)}
            {#if data.analysis.summary}
                <p class="mt-2 text-sm leading-relaxed text-gray-200">{data.analysis.summary}</p>
            {/if}
            {#if data.analysis.highlights.length}
                <ul class="mt-2 flex flex-col gap-1">
                    {#each data.analysis.highlights as h (h)}
                        <li class="flex gap-2 text-sm leading-relaxed text-gray-300">
                            <span class="text-purple-300" aria-hidden="true">•</span>
                            <span>{h}</span>
                        </li>
                    {/each}
                </ul>
            {/if}
            <p class="mt-3 border-t border-white/10 pt-2 text-xs leading-relaxed text-gray-400">
                מבוסס על {data.analysis.sources} פריטי חומר{data.analysis.model
                    ? ` · ${data.analysis.model}`
                    : ''}{data.analysis.updated_at ? ` · עודכן ב-${absDate(data.analysis.updated_at)}` : ''}.
                הניתוח הוא הצעה לקריאת החומר — הציון בדף הדמות נקבע בדירוגי הציבור.
            </p>
        {:else}
            <p class="mt-2 text-sm leading-relaxed text-gray-300">
                טרם נותח החומר במדד הזה. כשייאספו כאן ציוצים, ראיונות ודיווחים על פעולות
                {official.name}, יופיעו כאן סיכום ונקודות המפתח שעולות מהם ביחס למדד
                "{criterion.short}" — כל טענה עם קישור למקור שממנו נלקחה.
            </p>
        {/if}
    </section>

    <!-- תיק הראיות: רצועה לכל סוג חומר. ריקה = כתוב מה ייכנס אליה -->
    {#each EVIDENCE_KINDS as kind (kind.key)}
        {@const items = byKind.get(kind.key) ?? []}
        <section class="rounded-2xl border border-white/10 bg-slate-800/80 p-4">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
                <h2 class="text-lg font-bold text-white">
                    <span aria-hidden="true">{kind.icon}</span>
                    {kind.label}
                </h2>
                {#if items.length}
                    <span class="text-xs text-gray-400">{items.length} פריטים</span>
                {/if}
            </div>
            <p class="mt-0.5 text-xs text-gray-400">{kind.blurb}</p>

            {#if items.length}
                <ul class="mt-3 flex flex-col gap-2">
                    {#each items as item (item.id)}
                        <li class="rounded-xl border border-white/10 bg-white/5 p-3">
                            <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                <h3 class="text-sm font-bold text-white">{item.title || item.source}</h3>
                                {#if item.source && item.title}
                                    <span class="text-xs text-gray-400">{item.source}</span>
                                {/if}
                                {#if item.published_at}
                                    <span class="text-xs text-gray-400">· {absDate(item.published_at)}</span>
                                {/if}
                            </div>
                            {#if item.excerpt}
                                <p class="mt-1 text-sm leading-relaxed text-gray-300">{item.excerpt}</p>
                            {/if}
                            {#if item.analysis}
                                <div class="mt-2 rounded-lg border border-purple-400/20 bg-purple-500/5 p-2">
                                    <div class="flex flex-wrap items-center gap-2">
                                        <span class="text-xs font-bold text-purple-300">🤖 מה זה מלמד</span>
                                        {#if item.analysis.score !== null}
                                            <span class="text-xs font-black tabular-nums text-amber-300">
                                                {fmtScore(item.analysis.score)}/5
                                            </span>
                                        {/if}
                                    </div>
                                    {#if item.analysis.reasoning}
                                        <p class="mt-1 text-sm leading-relaxed text-gray-300">
                                            {item.analysis.reasoning}
                                        </p>
                                    {/if}
                                </div>
                            {/if}
                            {#if item.url}
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener nofollow"
                                    class="mt-2 inline-block text-xs font-bold text-blue-400 hover:text-blue-300"
                                >
                                    למקור ↗
                                </a>
                            {/if}
                        </li>
                    {/each}
                </ul>
            {:else}
                <p
                    class="mt-3 rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-4 text-center text-sm text-gray-400"
                >
                    טרם נאסף חומר מסוג זה.
                </p>
            {/if}
        </section>
    {/each}

    <!-- שקיפות: מה הדף הזה כן, ומה הוא לא -->
    <section class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 class="text-sm font-bold text-white">איך הדף הזה עובד</h2>
        <p class="mt-1 text-sm leading-relaxed text-gray-300">
            החומר בדף נאסף ממקורות פומביים בלבד — פרסומים של {official.name}, ראיונות שנתנ/ה,
            כתבות ודיווחים על פעולותיו/ה, ומסמכים רשמיים. לכל פריט מופיע קישור למקור כדי שתוכלו
            לבדוק בעצמכם. הניתוח מסכם את החומר ביחס למדד "{criterion.short}" בלבד ואינו מחליף את
            דירוגי הציבור: הציון בדף הדמות נקבע על ידי האזרחים שדירגו.
            {#if analyzedCount}
                כרגע {analyzedCount} מתוך {data.evidence.length} הפריטים נותחו.
            {/if}
        </p>
        <div class="mt-3">
            <a href={profileUrl} class="text-sm font-bold text-blue-400 hover:text-blue-300">
                ← לדף המלא של {official.name}
            </a>
        </div>
    </section>
</div>
