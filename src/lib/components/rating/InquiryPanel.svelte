<script lang="ts">
    // פניות ציבור למדורג — פנייה פומבית, הצטרפות לפנייה קיימת ומענה רשמי.
    // ההיגיון בשרת (actions בדף הפרופיל); כאן תצוגה וטפסים בלבד.
    import { enhance } from '$app/forms';
    import BotFields from './BotFields.svelte';
    import { absDate, isoDate, relDate } from '$lib/rating/time';
    import type { PublicInquiry } from '$lib/rating/types';

    let {
        inquiries,
        officialId,
        officialName,
        loggedIn,
        isAdmin,
        isOfficialUser,
    }: {
        inquiries: PublicInquiry[];
        officialId: string;
        officialName: string;
        loggedIn: boolean;
        isAdmin: boolean;
        isOfficialUser: boolean;
    } = $props();

    let submitting = $state(false);
    /** מזהה הפנייה שטופס המענה הרשמי שלה פתוח */
    let replyingTo = $state<string | null>(null);

    const answeredCount = $derived(inquiries.filter((i) => i.reply_text).length);

    // נקודת זמן אחת לכל הרשימה — לא Date.now() בתוך הרינדור
    const now = Date.now();
</script>

<section id="inquiries" class="scroll-mt-20 rounded-2xl border border-white/10 bg-slate-800/80 p-4">
    <div class="flex flex-wrap items-baseline gap-2">
        <h2 class="text-lg font-bold text-white">📨 פניות ציבור ({inquiries.length})</h2>
        {#if answeredCount > 0}
            <span class="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                נענו {answeredCount}
            </span>
        {/if}
    </div>
    <p class="mt-1 text-xs leading-relaxed text-gray-500">
        פנייה פומבית אל {officialName} — שקופה לכל הגולשים. הצטרפות לפנייה קיימת מחזקת אותה
        יותר מפנייה כפולה.
    </p>

    {#if isOfficialUser}
        <p class="mt-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300">
            🎖️ זה הדף שלך — מענה שתפרסמו על פנייה יסומן כמענה רשמי ויעדכן את חותם "מגיב לפניות"
        </p>
    {/if}

    <!-- טופס פנייה חדשה -->
    {#if loggedIn}
        <form
            method="POST"
            action="?/inquire"
            class="relative mt-3 flex flex-col gap-2"
            use:enhance={() => {
                submitting = true;
                return async ({ update }) => {
                    submitting = false;
                    await update();
                };
            }}
        >
            <BotFields />
            <textarea
                name="inquiry_text"
                rows="2"
                required
                minlength="10"
                maxlength="1000"
                placeholder="מה תרצו לשאול או לבקש מ{officialName}? (פומבי)"
                class="w-full rounded-xl border border-white/10 bg-[#1e293b] px-3 py-2 text-sm text-white placeholder-gray-500 transition-colors focus:border-purple-500 focus:outline-none"
            ></textarea>
            <div class="flex flex-wrap items-center justify-between gap-2">
                <label class="flex cursor-pointer items-center gap-2 text-xs text-gray-400">
                    <input type="checkbox" name="anonymous" class="accent-purple-500" />
                    פנייה אנונימית (השם לא יוצג)
                </label>
                <button
                    type="submit"
                    disabled={submitting}
                    class="btn-premium cursor-pointer rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
                >{submitting ? 'שולח...' : 'שליחת פנייה'}</button>
            </div>
        </form>
    {:else}
        <div class="mt-3 flex flex-wrap items-center gap-3">
            <p class="flex-1 text-sm text-gray-400" style="min-width: 14rem">
                רק משתמשים מחוברים פונים — כך כל פנייה עומדת מאחורי אדם אמיתי
            </p>
            <a
                href="/login?redirect=/officials/{officialId}"
                class="btn-premium rounded-xl px-5 py-2 text-sm font-bold text-white"
            >התחברות לפנייה</a>
        </div>
    {/if}

    <!-- רשימת הפניות -->
    {#if inquiries.length}
        <div class="mt-4 flex flex-col gap-3">
            {#each inquiries as inq (inq.id)}
                <article class="rounded-2xl border border-white/10 bg-slate-800/80 p-3">
                    <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span class="font-bold text-gray-300">
                            {inq.anonymous || !inq.author_name ? 'אזרח/ית' : inq.author_name}
                        </span>
                        <time datetime={isoDate(inq.created_at)} title={absDate(inq.created_at)}>
                            {relDate(inq.created_at, now)}
                        </time>
                        {#if inq.reply_text}
                            <span class="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-300">
                                🟢 נענתה
                            </span>
                        {:else}
                            <span class="rounded-full border border-white/10 bg-slate-800/80 px-2 py-0.5 text-gray-400">
                                ⏳ ממתינה למענה
                            </span>
                        {/if}
                        {#if inq.mine}
                            <span class="rounded-full border border-blue-400/30 bg-blue-500/10 px-2 py-0.5 font-bold text-blue-300">הפנייה שלך</span>
                        {/if}
                    </div>

                    <p class="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-200">{inq.text}</p>

                    <div class="mt-2 flex flex-wrap items-center gap-2">
                        {#if loggedIn && !inq.mine}
                            <form method="POST" action="?/join_inquiry" use:enhance>
                                <input type="hidden" name="inquiry_id" value={inq.id} />
                                <button
                                    type="submit"
                                    class="cursor-pointer rounded-full border px-3 py-1 text-xs font-bold transition-colors {inq.joinedByMe
                                        ? 'border-purple-400/40 bg-purple-500/15 text-purple-300'
                                        : 'join-btn border-white/10 bg-slate-800/80 text-gray-300'}"
                                    title={inq.joinedByMe ? 'ביטול ההצטרפות' : 'הצטרפות לפנייה — חיזוק הדרישה למענה'}
                                >🤝 {inq.joinedByMe ? 'הצטרפתם' : 'מצטרף/ת'} ({inq.joinCount})</button>
                            </form>
                        {:else}
                            <span class="rounded-full border border-white/10 bg-slate-800/80 px-3 py-1 text-xs text-gray-400">
                                🤝 {inq.joinCount} הצטרפו
                            </span>
                        {/if}

                        {#if isOfficialUser}
                            <button
                                type="button"
                                onclick={() => (replyingTo = replyingTo === inq.id ? null : inq.id)}
                                class="cursor-pointer rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500/20"
                            >🎖️ {inq.reply_text ? 'עדכון המענה' : 'מענה רשמי'}</button>
                        {/if}

                        {#if inq.mine || isAdmin}
                            <form
                                method="POST"
                                action="?/delete_inquiry"
                                use:enhance={({ cancel }) => {
                                    if (!confirm('למחוק את הפנייה?')) cancel();
                                    return async ({ update }) => update();
                                }}
                            >
                                <input type="hidden" name="inquiry_id" value={inq.id} />
                                <button
                                    type="submit"
                                    class="del-btn cursor-pointer rounded-full border border-white/10 bg-slate-800/80 px-3 py-1 text-xs text-gray-500 transition-colors"
                                >🗑️ מחיקה</button>
                            </form>
                        {/if}
                    </div>

                    <!-- מענה רשמי -->
                    {#if inq.reply_text}
                        <div class="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/[0.06] p-3">
                            <div class="flex flex-wrap items-center gap-2 text-xs">
                                <span class="font-bold text-amber-300">🎖️ מענה רשמי — {officialName}</span>
                                {#if inq.replied_at}
                                    <time
                                        datetime={isoDate(inq.replied_at)}
                                        title={absDate(inq.replied_at)}
                                        class="text-gray-500"
                                    >{relDate(inq.replied_at, now)}</time>
                                {/if}
                            </div>
                            <p class="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-gray-200">{inq.reply_text}</p>
                        </div>
                    {/if}

                    <!-- טופס מענה (חשבון הדמות בלבד) -->
                    {#if isOfficialUser && replyingTo === inq.id}
                        <form
                            method="POST"
                            action="?/reply_inquiry"
                            class="mt-2 flex flex-col gap-2"
                            use:enhance={() => {
                                return async ({ result, update }) => {
                                    if (result.type === 'success') replyingTo = null;
                                    await update();
                                };
                            }}
                        >
                            <input type="hidden" name="inquiry_id" value={inq.id} />
                            <textarea
                                name="reply_text"
                                rows="2"
                                required
                                minlength="2"
                                maxlength="2000"
                                value={inq.reply_text}
                                placeholder="המענה הרשמי שלכם לפנייה (פומבי)"
                                class="w-full rounded-xl border border-amber-400/30 bg-[#1e293b] px-3 py-2 text-sm text-white placeholder-gray-500 transition-colors focus:border-amber-400 focus:outline-none"
                            ></textarea>
                            <div class="flex gap-2">
                                <button
                                    type="submit"
                                    class="cursor-pointer rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-1.5 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500/25"
                                >פרסום המענה</button>
                                <button
                                    type="button"
                                    onclick={() => (replyingTo = null)}
                                    class="cursor-pointer rounded-xl border border-white/10 bg-slate-800/80 px-4 py-1.5 text-xs text-gray-400 transition-colors hover:bg-white/10"
                                >ביטול</button>
                            </div>
                        </form>
                    {/if}
                </article>
            {/each}
        </div>
    {:else}
        <p class="mt-4 rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-gray-500">
            עוד אין פניות ציבור — היו הראשונים לפנות.
        </p>
    {/if}
</section>

<style>
    /* Tailwind v4: group-hover שבור — CSS מפורש */
    .join-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
    }
    .del-btn:hover {
        color: #fca5a5;
        border-color: rgba(248, 113, 113, 0.4);
    }
</style>
