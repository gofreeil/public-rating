<script lang="ts">
    // דף הכרת הטוב — כל המילים הטובות שנכתבו על המדורג, וטופס טקסט חופשי
    import { enhance } from '$app/forms';
    import { absDate, isoDate, relDate } from '$lib/rating/time';
    import Seo from '$lib/components/rating/Seo.svelte';
    import Avatar from '$lib/components/rating/Avatar.svelte';
    import BotFields from '$lib/components/rating/BotFields.svelte';
    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    const official = $derived(data.official);
    const notes = $derived(data.notes);

    let sending = $state(false);

    // נקודת זמן אחת לכל הרשימה — לא Date.now() בתוך הרינדור
    const now = Date.now();
</script>

<Seo
    title="הכרת הטוב — {official.name}"
    description="מילים טובות שכתבו אזרחים על {official.name}{official.position
        ? ` (${official.position})`
        : ''} — מה נעשה כאן נכון, ולמי מגיעה תודה."
/>

<div class="flex flex-col gap-4 py-6">
    <div class="-mb-2">
        <a
            href="/officials/{official.id}"
            class="text-sm text-blue-400 transition-colors hover:text-blue-300"
        >← חזרה לדף {official.name}</a>
    </div>

    <!-- כותרת הדף -->
    <section class="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4">
        <div class="flex flex-wrap items-center gap-4">
            <Avatar name={official.name} image={official.image} size={64} />
            <div class="min-w-0 flex-1">
                <h1 class="text-2xl font-black text-white sm:text-3xl">
                    🌻 הכרת הטוב — {official.name}
                </h1>
                <p class="mt-1 text-sm text-gray-300">
                    {official.position}{official.org ? ` · ${official.org}` : ''}
                </p>
            </div>
            <span
                class="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-300"
            >{notes.length} מילים טובות</span>
        </div>
        <p class="mt-3 text-sm leading-relaxed text-gray-300">
            ביקורת ציבורית שלמה כוללת גם תודה. כאן כותבים בטקסט חופשי מה נעשה כאן נכון —
            טיפול שהסתיים בזמן, יחס אנושי, עמידה בהבטחה או החלטה אמיצה. הדף פומבי,
            והמילים מוצגות בשם הכותב אלא אם בחר אנונימיות.
        </p>
    </section>

    <!-- טופס כתיבה -->
    <section class="rounded-2xl border border-white/10 bg-slate-800/80 p-4">
        {#if form?.gratitudeSuccess}
            <p
                class="mb-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-300"
            >
                ✓ תודה — המילה הטובה שלך פורסמה בדף.
            </p>
        {/if}

        {#if data.loggedIn}
            <form
                method="POST"
                action="?/thank"
                class="relative flex flex-col gap-2"
                use:enhance={() => {
                    sending = true;
                    return async ({ update }) => {
                        sending = false;
                        await update();
                    };
                }}
            >
                <BotFields />
                <label for="gratitude-text" class="text-sm font-bold text-white">
                    מה תרצו לומר ל{official.name}?
                </label>
                <textarea
                    id="gratitude-text"
                    name="text"
                    rows="4"
                    required
                    minlength="10"
                    maxlength="1000"
                    placeholder="ספרו במילים שלכם — מה נעשה כאן נכון, ולמה זה חשוב…"
                    value={form?.values?.text ?? ''}
                    class="w-full resize-y rounded-xl border border-white/10 bg-[#1e293b] px-3 py-2 text-sm text-white placeholder-gray-500 transition-colors focus:border-emerald-400 focus:outline-none"
                ></textarea>
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <label class="flex cursor-pointer items-center gap-2 text-xs text-gray-400">
                        <input type="checkbox" name="anonymous" class="accent-emerald-500" />
                        פרסום אנונימי (השם לא יוצג)
                    </label>
                    <button
                        type="submit"
                        disabled={sending}
                        class="cursor-pointer rounded-xl border border-emerald-400 bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >{sending ? 'שולח…' : '🌻 פרסום המילה הטובה'}</button>
                </div>

                {#if form?.gratitudeError}
                    <p
                        class="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
                    >{form.gratitudeError}</p>
                {/if}
            </form>
        {:else}
            <div class="flex flex-wrap items-center gap-3">
                <p class="flex-1 text-sm text-gray-400" style="min-width: 14rem">
                    רק משתמשים מחוברים כותבים — כך מאחורי כל מילה טובה עומד אדם אמיתי
                </p>
                <a
                    href="/login?redirect=/officials/{official.id}/gratitude"
                    class="btn-premium rounded-xl px-5 py-2 text-sm font-bold text-white"
                >התחברות לכתיבה</a>
            </div>
        {/if}
    </section>

    <!-- המילים שנכתבו -->
    {#if notes.length}
        <section class="flex flex-col gap-3">
            {#each notes as note (note.id)}
                <article class="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] p-3">
                    <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span class="font-bold text-emerald-300">
                            {note.anonymous || !note.author_name ? 'אזרח/ית' : note.author_name}
                        </span>
                        <time datetime={isoDate(note.created_at)} title={absDate(note.created_at)}>
                            {relDate(note.created_at, now)}
                        </time>
                        {#if note.mine || data.isAdmin}
                            <form method="POST" action="?/delete_gratitude" class="mr-auto" use:enhance>
                                <input type="hidden" name="gratitude_id" value={note.id} />
                                <button
                                    type="submit"
                                    class="cursor-pointer text-xs text-gray-500 transition-colors hover:text-red-300"
                                >מחיקה</button>
                            </form>
                        {/if}
                    </div>
                    <p class="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-gray-200">
                        {note.text}
                    </p>
                </article>
            {/each}
        </section>
    {:else}
        <p class="rounded-2xl border border-dashed border-white/10 bg-slate-800/55 p-6 text-center text-sm text-gray-400">
            עדיין לא נכתבה כאן מילה טובה על {official.name}. אם מגיעה — היו הראשונים.
        </p>
    {/if}

    <div class="text-center">
        <a
            href="/officials/{official.id}"
            class="text-sm text-blue-400 transition-colors hover:text-blue-300"
        >← חזרה לדף {official.name}</a>
    </div>
</div>
