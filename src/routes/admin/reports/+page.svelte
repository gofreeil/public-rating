<script lang="ts">
    // תור טיפול בדיווחי תוכן — סופר-אדמין
    import { enhance } from '$app/forms';
    import { reportReasonLabel } from '$lib/rating/types';
    import Seo from '$lib/components/rating/Seo.svelte';
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    const pending = $derived(data.reports.filter((r) => r.status === 'pending'));
    const handled = $derived(data.reports.filter((r) => r.status === 'handled'));

    function fmtDate(iso: string): string {
        const d = new Date(iso);
        return Number.isFinite(d.getTime()) ? d.toLocaleString('he-IL') : '';
    }
</script>

<Seo title="דיווחי תוכן — ניהול" description="תור טיפול בדיווחי תוכן" noindex />

<div class="flex flex-col gap-4 py-6">
    <header class="flex flex-wrap items-baseline justify-between gap-2">
        <h1 class="text-2xl font-black text-white">🚩 דיווחי תוכן</h1>
        <span class="text-sm text-gray-400">
            {pending.length} ממתינים · {handled.length} טופלו
        </span>
    </header>

    <nav class="flex flex-wrap gap-2 text-sm">
        <a href="/admin" class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-300 hover:text-white">← ניהול</a>
        <a href="/admin/officials" class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-300 hover:text-white">מדורגים</a>
    </nav>

    {#if form?.success}
        <p class="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            ✅ {form.message}
        </p>
    {:else if form?.error}
        <p class="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {form.error}
        </p>
    {/if}

    {#if data.reports.length === 0}
        <div class="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
            <div class="text-4xl">✨</div>
            <p class="mt-2 font-bold text-white">אין דיווחים — התור נקי</p>
        </div>
    {/if}

    {#each [{ title: 'ממתינים לטיפול', list: pending, open: true }, { title: 'טופלו', list: handled, open: false }] as section (section.title)}
        {#if section.list.length}
            <section class="flex flex-col gap-2">
                <h2 class="text-lg font-black text-white">{section.title} ({section.list.length})</h2>

                {#each section.list as r (r.id)}
                    <article
                        class="flex flex-col gap-2 rounded-2xl border p-3 {r.status === 'pending'
                            ? 'border-red-400/25 bg-red-500/[0.04]'
                            : 'border-white/10 bg-white/5 opacity-70'}"
                    >
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="rounded-full border border-red-400/40 bg-red-500/15 px-2 py-0.5 text-xs font-bold text-red-300">
                                {reportReasonLabel(r.reason)}
                            </span>
                            <span class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-gray-400">
                                {r.target_type === 'official' ? 'התנהלות המדורג' : r.target_type === 'comment' ? 'תגובה' : 'דירוג'}
                            </span>
                            {#if r.official_id}
                                <a
                                    href="/officials/{r.official_id}"
                                    target="_blank"
                                    rel="noopener"
                                    class="text-xs font-bold text-blue-400 hover:text-blue-300"
                                >על {r.official_name || 'מדורג'} ↗</a>
                            {/if}
                            <span class="mr-auto text-xs text-gray-500">{fmtDate(r.created_at)}</span>
                        </div>

                        {#if r.snapshot}
                            <blockquote class="rounded-xl border-r-2 border-white/15 bg-white/[0.03] px-3 py-2 text-sm leading-relaxed whitespace-pre-line text-gray-300">
                                {r.snapshot}
                            </blockquote>
                        {/if}

                        {#if r.details}
                            <p class="text-sm text-gray-400">
                                <b class="text-gray-300">נימוק המדווח:</b>
                                {r.details}
                            </p>
                        {/if}

                        {#if r.reporter_contact}
                            <p class="text-xs text-gray-500">מענה למדווח: {r.reporter_contact}</p>
                        {/if}

                        {#if r.status === 'pending'}
                            <div class="flex flex-wrap items-center gap-2 border-t border-white/5 pt-2">
                                {#if r.target_type !== 'official'}
                                <form
                                    method="POST"
                                    action="?/remove_content"
                                    use:enhance={({ cancel }) => {
                                        if (!confirm('להסיר את התוכן המדווח ולסגור את הדיווח?')) {
                                            cancel();
                                            return;
                                        }
                                        return async ({ update }) => await update();
                                    }}
                                >
                                    <input type="hidden" name="report_id" value={r.id} />
                                    <input type="hidden" name="target_id" value={r.target_id} />
                                    <button
                                        type="submit"
                                        class="cursor-pointer rounded-xl border border-red-400/40 bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-200 transition-colors hover:bg-red-500/25"
                                    >🗑 הסרת התוכן</button>
                                </form>
                                {/if}

                                <form method="POST" action="?/dismiss" use:enhance>
                                    <input type="hidden" name="report_id" value={r.id} />
                                    <button
                                        type="submit"
                                        class="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-gray-300 transition-colors hover:bg-white/10"
                                    >{r.target_type === 'official' ? '✓ טופל — סגירת הדיווח' : '✓ נבדק — התוכן תקין'}</button>
                                </form>
                            </div>
                        {/if}
                    </article>
                {/each}
            </section>
        {/if}
    {/each}
</div>
