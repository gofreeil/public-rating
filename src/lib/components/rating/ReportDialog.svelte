<script lang="ts">
    // דיווח על תוכן פוגעני — נפתח בתוך הכרטיס, לא כמודאל.
    // פתוח גם לאורח: מי שנפגע מתוכן אינו בהכרח משתמש רשום.
    import { enhance } from '$app/forms';
    import { REPORT_REASONS } from '$lib/rating/types';
    import BotFields from './BotFields.svelte';

    let {
        targetId,
        targetType = 'review',
    }: { targetId: string; targetType?: 'review' | 'comment' } = $props();

    let open = $state(false);
    let sending = $state(false);
    let done = $state(false);
    let error = $state('');

    const label = $derived(targetType === 'comment' ? 'התגובה' : 'הדירוג');
</script>

{#if done}
    <span class="me-auto text-xs font-semibold text-emerald-300">✓ הדיווח התקבל — תודה</span>
{:else}
    <button
        type="button"
        onclick={() => (open = !open)}
        aria-expanded={open}
        title="דיווח על תוכן פוגעני"
        class="report-btn me-auto cursor-pointer text-xs text-gray-500 transition-colors"
    >🚩 דיווח</button>
{/if}

{#if open && !done}
    <!-- basis-full: הפאנל יורד לשורה משלו בתוך סרגל הפעולות (flex-wrap) -->
    <form
        method="POST"
        action="?/report"
        class="relative mt-2 flex w-full basis-full flex-col gap-2 rounded-2xl border border-red-400/20 bg-red-500/[0.04] p-3"
        use:enhance={() => {
            sending = true;
            error = '';
            return async ({ result }) => {
                sending = false;
                if (result.type === 'success' && result.data?.reportSuccess) {
                    done = true;
                    open = false;
                } else if (result.type === 'failure') {
                    error = String(result.data?.reportError ?? 'שגיאה בשליחת הדיווח');
                } else if (result.type === 'error') {
                    error = 'שגיאה בשליחת הדיווח — נסו שוב';
                }
                // בכוונה בלי update(): רענון הדף היה סוגר את הפאנל ומאבד את ההקשר
            };
        }}
    >
        <BotFields />
        <input type="hidden" name="target_id" value={targetId} />
        <input type="hidden" name="target_type" value={targetType} />

        <p class="text-sm font-bold text-white">דיווח על {label}</p>

        <fieldset class="flex flex-col gap-1">
            <legend class="mb-1 text-xs text-gray-400">מה הבעיה?</legend>
            {#each REPORT_REASONS as r, i (r.key)}
                <label class="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                    <input
                        type="radio"
                        name="reason"
                        value={r.key}
                        required
                        checked={i === 0}
                        class="h-3.5 w-3.5 accent-red-500"
                    />
                    {r.label}
                </label>
            {/each}
        </fieldset>

        <textarea
            name="details"
            rows="2"
            maxlength="1000"
            placeholder="פרטים נוספים (לא חובה) — מה בדיוק שגוי או פוגעני…"
            class="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-400/50 focus:outline-none"
        ></textarea>

        <input
            type="email"
            name="contact"
            maxlength="200"
            placeholder="דוא״ל למעקב (לא חובה)"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-400/50 focus:outline-none"
        />

        {#if error}
            <p class="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
            </p>
        {/if}

        <div class="flex flex-wrap items-center gap-3">
            <button
                type="submit"
                disabled={sending}
                class="rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-1.5 text-xs font-bold text-red-200 transition-colors hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >{sending ? 'שולח…' : 'שליחת דיווח'}</button>
            <button
                type="button"
                onclick={() => (open = false)}
                class="cursor-pointer text-xs text-gray-400 hover:text-gray-200"
            >ביטול</button>
            <span class="text-[11px] text-gray-500">הדיווח נבדק על ידי צוות האתר</span>
        </div>
    </form>
{/if}

<style>
    .report-btn:hover {
        color: #fca5a5;
    }
</style>
