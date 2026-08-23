<script lang="ts">
    // דיווח על התנהלות המדורג עצמו — הפרת אמונים או התנהלות פוגענית.
    // בניגוד לדיווח על תוכן באתר, כאן הטענה היא על הדמות; לכן חובה פירוט.
    // פתוח גם לאורח: מי שנפגע מבעל תפקיד אינו בהכרח משתמש רשום.
    import { enhance } from '$app/forms';
    import { MISCONDUCT_REASONS } from '$lib/rating/types';
    import BotFields from './BotFields.svelte';

    let {
        officialName,
        group = '',
        gratitudeHref = '',
    }: {
        officialName: string;
        group?: string;
        /** קישור לדף הכרת הטוב — הכפתור החיובי שעומד כאן לצד הדיווח */
        gratitudeHref?: string;
    } = $props();

    // עובד ציבור אינו נבחר ואינו נשבע אמונים — החריגה הרלוונטית היא סמכות ותקינות
    const label = $derived(
        group === 'public_servants'
            ? 'דיווח על חריגה מסמכות / התנהלות לא תקינה'
            : 'דיווח על הפרת אמונים / התנהלות פוגענית'
    );

    let open = $state(false);
    let sending = $state(false);
    let done = $state(false);
    let error = $state('');
</script>

<section class="flex flex-col items-center gap-2">
    {#if done}
        <p class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-center text-sm font-bold text-emerald-300">
            ✓ הדיווח התקבל — צוות האתר יבחן אותו. תודה.
        </p>
    {:else}
        <div class="flex flex-wrap items-center justify-center gap-3">
            {#if gratitudeHref}
                <a
                    href={gratitudeHref}
                    class="rounded-xl border border-emerald-400 bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/50 transition-colors hover:bg-emerald-500"
                >🌻 הכרת הטוב</a>
            {/if}
            <button
                type="button"
                onclick={() => (open = !open)}
                aria-expanded={open}
                class="cursor-pointer rounded-xl border border-red-400 bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-950/50 transition-colors hover:bg-red-500"
            >🚨 {label}</button>
        </div>

        {#if open}
            <form
                method="POST"
                action="?/report"
                class="flex w-full max-w-2xl flex-col gap-2 rounded-2xl border border-red-400/25 bg-red-500/[0.05] p-4 text-right"
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
                        // בלי update(): רענון הדף היה סוגר את הפאנל ומאבד את מה שנכתב
                    };
                }}
            >
                <BotFields />
                <input type="hidden" name="target_type" value="official" />

                <p class="text-sm font-bold text-white">דיווח על התנהלות {officialName}</p>
                <p class="text-xs leading-relaxed text-gray-400">
                    הדיווח מגיע לצוות האתר בלבד ואינו מתפרסם. אין זו תלונה רשמית לרשויות —
                    בעניין פלילי יש לפנות למשטרה, ובעניין אתי למבקר המדינה או לוועדת האתיקה.
                </p>

                <fieldset class="flex flex-col gap-1">
                    <legend class="mb-1 text-xs text-gray-400">מהות הדיווח</legend>
                    {#each MISCONDUCT_REASONS as r, i (r.key)}
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
                    rows="4"
                    required
                    minlength="20"
                    maxlength="1000"
                    placeholder="מה קרה? מתי, היכן, ומה הראיה או המקור (קישור לפרסום, מספר החלטה, עדות)…"
                    class="w-full resize-y rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-400/50 focus:outline-none"
                ></textarea>

                <input
                    type="email"
                    name="contact"
                    maxlength="200"
                    placeholder="דוא״ל למעקב (לא חובה)"
                    class="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-400/50 focus:outline-none"
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
                        class="cursor-pointer rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-1.5 text-xs font-bold text-red-200 transition-colors hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                    >{sending ? 'שולח…' : 'שליחת דיווח'}</button>
                    <button
                        type="button"
                        onclick={() => (open = false)}
                        class="cursor-pointer text-xs text-gray-400 hover:text-gray-200"
                    >ביטול</button>
                    <span class="text-[11px] text-gray-500">דיווח כוזב עלול להוות עבירה</span>
                </div>
            </form>
        {/if}
    {/if}
</section>
