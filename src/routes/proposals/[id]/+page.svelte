<script lang="ts">
    // דף הצעה אזרחית — הטקסט המלא, בעד/נגד, תמיכה וציר ההתקדמות
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { proposalStatusLabel } from '$lib/rating/types';
    import { absDate, isoDate, relDate } from '$lib/rating/time';
    import Seo from '$lib/components/rating/Seo.svelte';
    import ShareBar from '$lib/components/rating/ShareBar.svelte';
    import Avatar from '$lib/components/rating/Avatar.svelte';
    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    const p = $derived(data.proposal);
    const status = $derived(proposalStatusLabel(p.status));

    const metaDescription = $derived(
        `${p.text.slice(0, 150)}${p.text.length > 150 ? '…' : ''} · ${p.supportCount} תומכים`,
    );

    const shareText = $derived(
        `"${p.title}" — הצעה אזרחית במרחב ההצעות של דירוג ציבורי. ${p.supportCount} תומכים עד כה. מצטרפים?`,
    );

    // נקודת זמן אחת לכל הדף
    const now = Date.now();
</script>

<Seo title="{p.title} — מרחב ההצעות" description={metaDescription} />

<div class="flex flex-col gap-4 py-6">
    {#if data.pending}
        <p class="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-300">
            ⏳ ההצעה ממתינה לאישור צוות — כרגע רק אתם (ואנחנו) רואים אותה
        </p>
    {/if}

    {#if form?.error}
        <p class="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {form.error}
        </p>
    {/if}

    <!-- כותרת -->
    <section class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div class="flex flex-wrap items-center gap-2">
            <h1 class="min-w-0 flex-1 text-2xl font-black text-white sm:text-3xl" style="min-width: 14rem">
                {p.title}
            </h1>
            <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-bold text-gray-300 whitespace-nowrap">
                {status.icon} {status.label}
            </span>
        </div>
        <p class="mt-2 text-xs text-gray-500">
            הוצע ע"י {p.anonymous || !p.proposer_name ? 'אזרח/ית' : p.proposer_name}
            · <time datetime={isoDate(p.created_at)} title={absDate(p.created_at)}>{relDate(p.created_at, now)}</time>
            {#if p.mine}<span class="font-bold text-blue-300"> · ההצעה שלך</span>{/if}
        </p>

        <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-200">{p.text}</p>

        <!-- תמיכה + שיתוף -->
        <div class="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
            {#if data.loggedIn}
                <form method="POST" action="?/support" use:enhance>
                    <button
                        type="submit"
                        class="cursor-pointer rounded-xl border px-5 py-2 text-sm font-bold transition-colors {p.supportedByMe
                            ? 'border-purple-400/50 bg-purple-500/20 text-purple-200'
                            : 'btn-premium border-transparent text-white'}"
                        title={p.supportedByMe ? 'ביטול התמיכה' : 'תמיכה בהצעה'}
                    >🤝 {p.supportedByMe ? 'תמכתם' : 'תמיכה בהצעה'} ({p.supportCount})</button>
                </form>
            {:else}
                <a
                    href="/login?redirect=/proposals/{p.id}"
                    class="btn-premium rounded-xl px-5 py-2 text-sm font-bold text-white"
                >🤝 התחברות לתמיכה ({p.supportCount})</a>
            {/if}

            {#if p.mine || data.isAdmin}
                <form
                    method="POST"
                    action="?/delete_proposal"
                    use:enhance={({ cancel }) => {
                        if (!confirm('למחוק את ההצעה?')) cancel();
                        return async ({ result }) => {
                            if (result.type === 'success') goto('/proposals');
                        };
                    }}
                >
                    <button
                        type="submit"
                        class="del-btn cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-500 transition-colors"
                    >🗑️ מחיקה</button>
                </form>
            {/if}
        </div>

        <div class="mt-3 border-t border-white/10 pt-3">
            <ShareBar text={shareText} title="{p.title} — מרחב ההצעות" />
        </div>
    </section>

    <!-- בעד / נגד -->
    {#if p.pros.length || p.cons.length}
        <section class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.04] p-4">
                <h2 class="mb-2 text-sm font-bold text-emerald-300">👍 נימוקים בעד</h2>
                {#if p.pros.length}
                    <ul class="flex flex-col gap-1.5">
                        {#each p.pros as pro, i (i)}
                            <li class="flex items-start gap-2 text-sm leading-relaxed text-gray-200">
                                <span class="mt-0.5 text-emerald-400">•</span>
                                <span class="min-w-0 flex-1">{pro}</span>
                            </li>
                        {/each}
                    </ul>
                {:else}
                    <p class="text-sm text-gray-500">לא צוינו נימוקים בעד</p>
                {/if}
            </div>
            <div class="rounded-2xl border border-red-400/20 bg-red-500/[0.04] p-4">
                <h2 class="mb-2 text-sm font-bold text-red-300">👎 נימוקים נגד / סיכונים</h2>
                {#if p.cons.length}
                    <ul class="flex flex-col gap-1.5">
                        {#each p.cons as con, i (i)}
                            <li class="flex items-start gap-2 text-sm leading-relaxed text-gray-200">
                                <span class="mt-0.5 text-red-400">•</span>
                                <span class="min-w-0 flex-1">{con}</span>
                            </li>
                        {/each}
                    </ul>
                {:else}
                    <p class="text-sm text-gray-500">לא צוינו נימוקים נגד</p>
                {/if}
            </div>
        </section>
    {/if}

    <!-- מדורגים קשורים -->
    {#if data.linked.length}
        <section class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 class="mb-2 text-sm font-bold text-white">🗳️ מדורגים שקשורים להצעה</h2>
            <div class="flex flex-wrap gap-2">
                {#each data.linked as o (o.id)}
                    <a
                        href="/officials/{o.id}"
                        class="linked-chip flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pr-1 pl-3 transition-colors"
                    >
                        <Avatar name={o.name} image={o.image} size={26} />
                        <span class="text-sm font-bold text-gray-200">{o.name}</span>
                        {#if o.position}
                            <span class="text-xs text-gray-500">{o.position}</span>
                        {/if}
                    </a>
                {/each}
            </div>
        </section>
    {/if}

    <!-- ציר התקדמות -->
    {#if p.updates.length}
        <section class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 class="mb-3 text-sm font-bold text-white">📌 ציר ההתקדמות</h2>
            <ol class="flex flex-col gap-2">
                {#each [...p.updates].reverse() as u, i (i)}
                    <li class="flex items-start gap-3 text-sm">
                        <time
                            datetime={isoDate(u.date)}
                            title={absDate(u.date)}
                            class="mt-0.5 shrink-0 text-xs text-gray-500 tabular-nums"
                        >{absDate(u.date)}</time>
                        <span class="min-w-0 flex-1 leading-relaxed text-gray-200">{u.text}</span>
                    </li>
                {/each}
            </ol>
        </section>
    {/if}

    <div class="text-center">
        <a href="/proposals" class="text-sm text-blue-400 transition-colors hover:text-blue-300">
            ← חזרה למרחב ההצעות
        </a>
    </div>
</div>

<style>
    .linked-chip:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(96, 165, 250, 0.4);
    }
    .del-btn:hover {
        color: #fca5a5;
        border-color: rgba(248, 113, 113, 0.4);
    }
</style>
