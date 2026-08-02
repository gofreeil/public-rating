<script lang="ts">
    // טופס הגשת הצעה אזרחית — נשלחת לבדיקת צוות לפני פרסום
    import { enhance } from '$app/forms';
    import BotFields from '$lib/components/rating/BotFields.svelte';
    import Seo from '$lib/components/rating/Seo.svelte';
    import type { ActionData } from './$types';

    let { form }: { form: ActionData } = $props();

    let submitting = $state(false);

    const inputCls =
        'w-full rounded-xl border border-white/10 bg-[#1e293b] px-3 py-2 text-sm text-white placeholder-gray-500 transition-colors focus:border-purple-500 focus:outline-none';
</script>

<Seo
    title="הצעה חדשה — מרחב ההצעות"
    description="הגשת הצעה אזרחית לשיפור השירות הציבורי — ההצעה נבדקת, מתפרסמת לדיון ציבורי וצוברת תמיכה."
/>

<div class="mx-auto flex max-w-2xl flex-col gap-4 py-6">
    <section class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h1 class="text-2xl font-black text-white">➕ הצעה חדשה</h1>
        <p class="mt-1 text-sm leading-relaxed text-gray-400">
            נסחו את ההצעה בבהירות — מה הבעיה ומה הפתרון. אחרי בדיקת צוות קצרה ההצעה
            תתפרסם במרחב, הציבור יוכל לתמוך בה, וההתקדמות שלה תתועד בשקיפות.
        </p>
    </section>

    {#if form?.success}
        <section class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-center">
            <p class="text-lg font-black text-emerald-300">✅ ההצעה נשלחה לבדיקה</p>
            <p class="mt-1 text-sm text-gray-300">
                אחרי אישור קצר של הצוות היא תעלה למרחב ההצעות ותיפתח לתמיכת הציבור.
            </p>
            <div class="mt-4 flex flex-wrap justify-center gap-2">
                <a href="/proposals" class="btn-premium rounded-xl px-5 py-2 text-sm font-bold text-white">
                    ← למרחב ההצעות
                </a>
            </div>
        </section>
    {:else}
        <form method="POST" class="relative flex flex-col gap-3" use:enhance={() => {
            submitting = true;
            return async ({ update }) => {
                submitting = false;
                await update({ reset: false });
            };
        }}>
            <BotFields />

            {#if form?.error}
                <p class="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {form.error}
                </p>
            {/if}

            <label class="flex flex-col gap-1">
                <span class="text-sm font-bold text-white">כותרת ההצעה *</span>
                <input
                    name="title"
                    required
                    minlength="5"
                    maxlength="120"
                    value={form?.values?.title ?? ''}
                    placeholder="למשל: פרסום יומן פגישות שבועי של כל שר"
                    class={inputCls}
                />
            </label>

            <label class="flex flex-col gap-1">
                <span class="text-sm font-bold text-white">ההצעה במלואה *</span>
                <textarea
                    name="text"
                    rows="6"
                    required
                    minlength="30"
                    maxlength="5000"
                    value={form?.values?.text ?? ''}
                    placeholder="מה הבעיה היום, מה הפתרון המוצע, ומי הגורם שאמור לבצע אותו"
                    class="{inputCls} leading-relaxed"
                ></textarea>
            </label>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label class="flex flex-col gap-1">
                    <span class="text-sm font-bold text-emerald-300">👍 נימוקים בעד (שורה לכל נימוק)</span>
                    <textarea
                        name="pros"
                        rows="4"
                        maxlength="3000"
                        value={form?.values?.pros ?? ''}
                        placeholder={'שקיפות מלאה לציבור\nחיסכון בכסף ציבורי'}
                        class="{inputCls} leading-relaxed"
                    ></textarea>
                </label>
                <label class="flex flex-col gap-1">
                    <span class="text-sm font-bold text-red-300">👎 נימוקים נגד / סיכונים</span>
                    <textarea
                        name="cons"
                        rows="4"
                        maxlength="3000"
                        value={form?.values?.cons ?? ''}
                        placeholder={'עומס בירוקרטי אפשרי\n(הצגת שני הצדדים מחזקת את ההצעה)'}
                        class="{inputCls} leading-relaxed"
                    ></textarea>
                </label>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3">
                <label class="flex cursor-pointer items-center gap-2 text-sm text-gray-400">
                    <input type="checkbox" name="anonymous" checked={form?.values?.anonymous ?? false} class="accent-purple-500" />
                    פרסום אנונימי (השם לא יוצג)
                </label>
                <button
                    type="submit"
                    disabled={submitting}
                    class="btn-premium cursor-pointer rounded-xl px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                >{submitting ? 'שולח...' : 'שליחת ההצעה לבדיקה'}</button>
            </div>
        </form>

        <p class="text-xs leading-relaxed text-gray-600">
            ההצעה מתפרסמת בשמכם (או אנונימית, לבחירתכם) ותחת אחריותכם. הצוות בודק שההצעה
            עניינית ואינה פוגענית — לא את עמדתה. פרטים
            <a href="/legal" class="text-blue-400/80 hover:underline">בתנאי השימוש</a>.
        </p>
    {/if}

    <div class="text-center">
        <a href="/proposals" class="text-sm text-blue-400 transition-colors hover:text-blue-300">← חזרה למרחב ההצעות</a>
    </div>
</div>
