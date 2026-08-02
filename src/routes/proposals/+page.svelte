<script lang="ts">
    // מרחב ההצעות — האזרחים מציעים, הציבור תומך, וההצעות המבוססות מוגשות הלאה
    import { PROPOSAL_STATUSES, proposalStatusLabel, type ProposalStatus } from '$lib/rating/types';
    import { absDate, isoDate, relDate } from '$lib/rating/time';
    import Seo from '$lib/components/rating/Seo.svelte';

    let { data } = $props();

    let statusFilter = $state<ProposalStatus | null>(null);

    const filtered = $derived(
        statusFilter ? data.proposals.filter((p) => p.status === statusFilter) : data.proposals,
    );

    /** כמה הצעות בכל סטטוס — לצ'יפים של הסינון */
    const statusCounts = $derived.by(() => {
        const counts = new Map<ProposalStatus, number>();
        for (const p of data.proposals) counts.set(p.status, (counts.get(p.status) ?? 0) + 1);
        return counts;
    });

    // נקודת זמן אחת לכל הדף — לא Date.now() בתוך הרינדור
    const now = Date.now();
</script>

<Seo
    title="מרחב ההצעות — הציבור מציע"
    description="הצעות אזרחיות לשיפור השירות הציבורי: האזרחים מציעים, הציבור דן ותומך, וההצעות המבוססות מוגשות לגורמים הרשמיים."
/>

<div class="flex flex-col gap-4 py-6">
    <!-- כותרת -->
    <section class="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div class="min-w-0 flex-1" style="min-width: 16rem">
            <h1 class="text-2xl font-black text-white sm:text-3xl">📜 מרחב ההצעות</h1>
            <p class="mt-1 text-sm leading-relaxed text-gray-400">
                האזרחים מציעים — הציבור דן ותומך. הצעה שצוברת תמיכה רחבה מוגשת לגורם הרשמי,
                וההתקדמות שלה מתועדת כאן בשקיפות מלאה.
            </p>
        </div>
        <a href="/proposals/new" class="btn-premium rounded-xl px-5 py-2.5 text-sm font-bold text-white">
            ➕ הצעה חדשה
        </a>
    </section>

    <!-- סינון לפי סטטוס -->
    {#if data.proposals.length}
        <div class="flex flex-wrap items-center gap-2 text-sm">
            <button
                onclick={() => (statusFilter = null)}
                class="cursor-pointer rounded-full border px-3 py-1 font-bold transition-colors {statusFilter === null
                    ? 'border-blue-400/50 bg-blue-500/15 text-blue-300'
                    : 'filter-chip border-white/10 bg-white/5 text-gray-400'}"
            >הכל ({data.proposals.length})</button>
            {#each PROPOSAL_STATUSES as s (s.key)}
                {@const count = statusCounts.get(s.key) ?? 0}
                {#if count > 0}
                    <button
                        onclick={() => (statusFilter = statusFilter === s.key ? null : s.key)}
                        class="cursor-pointer rounded-full border px-3 py-1 font-bold transition-colors {statusFilter === s.key
                            ? 'border-blue-400/50 bg-blue-500/15 text-blue-300'
                            : 'filter-chip border-white/10 bg-white/5 text-gray-400'}"
                    >{s.icon} {s.label} ({count})</button>
                {/if}
            {/each}
        </div>
    {/if}

    <!-- רשימת ההצעות -->
    {#if filtered.length}
        <div class="flex flex-col gap-3">
            {#each filtered as p (p.id)}
                {@const status = proposalStatusLabel(p.status)}
                <a
                    href="/proposals/{p.id}"
                    class="proposal-card block rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors"
                >
                    <div class="flex flex-wrap items-center gap-2">
                        <h2 class="min-w-0 flex-1 text-lg font-bold text-white" style="min-width: 12rem">{p.title}</h2>
                        <span class="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-bold text-gray-300 whitespace-nowrap">
                            {status.icon} {status.label}
                        </span>
                    </div>
                    <p class="mt-1.5 line-clamp-2 text-sm leading-relaxed text-gray-400">{p.text}</p>
                    <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span class="font-bold text-purple-300">🤝 {p.supportCount} תומכים</span>
                        {#if p.pros.length || p.cons.length}
                            <span>👍 {p.pros.length} בעד · 👎 {p.cons.length} נגד</span>
                        {/if}
                        {#if p.updates.length}
                            <span>📌 {p.updates.length} עדכונים</span>
                        {/if}
                        <span>
                            הוצע ע"י {p.anonymous || !p.proposer_name ? 'אזרח/ית' : p.proposer_name}
                            · <time datetime={isoDate(p.created_at)} title={absDate(p.created_at)}>{relDate(p.created_at, now)}</time>
                        </span>
                    </div>
                </a>
            {/each}
        </div>
    {:else}
        <div class="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <p class="font-bold text-white">
                {statusFilter ? 'אין הצעות בסטטוס הזה' : 'עוד אין הצעות — היו הראשונים להציע!'}
            </p>
            <p class="mt-1 text-sm text-gray-400">
                יש לכם רעיון לשיפור השירות הציבורי? הציעו אותו והציבור יצטרף.
            </p>
            <a href="/proposals/new" class="btn-premium mt-3 inline-block rounded-xl px-5 py-2 text-sm font-bold text-white">
                ➕ הצעה חדשה
            </a>
        </div>
    {/if}

    <p class="text-xs leading-relaxed text-gray-600">
        ההצעות במרחב הן יוזמות אישיות של משתמשים ואינן משקפות את עמדת האתר. כל הצעה עוברת
        בדיקת צוות לפני פרסום. פרטים נוספים
        <a href="/legal" class="text-blue-400/80 hover:underline">בתנאי השימוש</a>.
    </p>
</div>

<style>
    /* Tailwind v4: group-hover שבור — CSS מפורש */
    .proposal-card:hover {
        background: rgba(255, 255, 255, 0.09);
        border-color: rgba(96, 165, 250, 0.4);
    }
    .filter-chip:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
    }
</style>
