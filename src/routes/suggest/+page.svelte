<script lang="ts">
    import { enhance } from '$app/forms';
    import { GROUPS, groupByKey } from '$lib/rating/types';
    import Seo from '$lib/components/rating/Seo.svelte';
    import BotFields from '$lib/components/rating/BotFields.svelte';
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    // ---- שדות הטופס (שרידות ערכים אחרי כישלון ולידציה בשרת) ----
    let groupKey = $state(form?.values?.group || data.group || 'knesset');
    let name = $state(form?.values?.name ?? '');
    let position = $state(form?.values?.position ?? '');
    let org = $state(form?.values?.org ?? '');
    let bio = $state(form?.values?.bio ?? '');
    let submitting = $state(false);

    const group = $derived(groupByKey(groupKey) ?? GROUPS[0]);
    const successGroup = $derived(form?.success ? groupByKey(form.group) : undefined);

    const inputCls =
        'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-400/60 focus:outline-none';
</script>

<Seo
    title="הציעו מדורג"
    description="מכירים נבחר ציבור, שופט או עובד ציבור שהציבור צריך לדרג? הציעו להוסיף אותו לפלטפורמת הדירוג הציבורי."
/>

<div class="mx-auto max-w-xl space-y-4 py-6">
    {#if form?.success}
        <!-- ---- כרטיס הצלחה ---- -->
        <div class="rounded-2xl border border-green-400/30 bg-green-500/10 p-6 text-center">
            <p class="mb-1 text-lg font-bold text-green-300">✅ ההצעה נשלחה לאישור המערכת — תודה!</p>
            <p class="mb-4 text-sm text-gray-400">לאחר אישור, המדורג יופיע בלוח וכולם יוכלו לדרג אותו.</p>
            <div class="flex flex-wrap justify-center gap-2">
                {#if successGroup}
                    <a href={successGroup.route} class="btn-premium rounded-xl px-4 py-2 text-sm font-bold text-white">
                        {successGroup.icon} ללוח {successGroup.title}
                    </a>
                {/if}
                <a href="/" class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:text-white">
                    לדף הבית
                </a>
            </div>
        </div>
    {:else}
        <div class="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <h1 class="mb-1 text-xl font-black text-white">➕ הציעו לדירוג</h1>
            <p class="mb-4 text-sm text-gray-400">
                מכירים {group.singular} שהציבור צריך לדרג? ההצעה תעבור אישור מערכת קצר לפני פרסום.
            </p>

            {#if form?.error}
                <p class="mb-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {form.error}
                </p>
            {/if}

            <form
                method="POST"
                class="relative space-y-3"
                use:enhance={() => {
                    submitting = true;
                    return async ({ update }) => {
                        await update();
                        submitting = false;
                    };
                }}
            >
                <BotFields />
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label class="block">
                        <span class="mb-1 block text-xs font-semibold text-gray-400">קטגוריה *</span>
                        <select name="group" bind:value={groupKey} required class={inputCls}>
                            {#each GROUPS as g (g.key)}
                                <option value={g.key} class="bg-slate-900 text-white">{g.icon} {g.title}</option>
                            {/each}
                        </select>
                    </label>
                    <label class="block">
                        <span class="mb-1 block text-xs font-semibold text-gray-400">שם מלא *</span>
                        <input
                            type="text"
                            name="name"
                            bind:value={name}
                            required
                            minlength="2"
                            maxlength="80"
                            placeholder="למשל: ישראל ישראלי"
                            class={inputCls}
                        />
                    </label>
                    <label class="block">
                        <span class="mb-1 block text-xs font-semibold text-gray-400">תפקיד</span>
                        <input
                            type="text"
                            name="position"
                            bind:value={position}
                            list="positions-list"
                            maxlength="60"
                            placeholder={group.positions[0]}
                            class={inputCls}
                        />
                        <datalist id="positions-list">
                            {#each group.positions as p (p)}
                                <option value={p}></option>
                            {/each}
                        </datalist>
                    </label>
                    <label class="block">
                        <span class="mb-1 block text-xs font-semibold text-gray-400">{group.orgLabel}</span>
                        <input type="text" name="org" bind:value={org} maxlength="60" class={inputCls} />
                    </label>
                </div>
                <label class="block">
                    <span class="mb-1 block text-xs font-semibold text-gray-400">רקע קצר (רשות)</span>
                    <textarea
                        name="bio"
                        bind:value={bio}
                        rows="3"
                        maxlength="600"
                        placeholder="כמה מילים על התפקיד והפעילות הציבורית..."
                        class="{inputCls} resize-y"
                    ></textarea>
                </label>

                <div class="flex flex-wrap items-center gap-3">
                    <button
                        type="submit"
                        disabled={submitting}
                        class="btn-premium cursor-pointer rounded-xl px-6 py-2 text-sm font-bold text-white disabled:opacity-60"
                    >
                        {submitting ? 'שולח...' : 'שליחת ההצעה'}
                    </button>
                    <a href={group.route} class="text-sm text-blue-400 transition-colors hover:text-blue-300">
                        ← חזרה ללוח {group.title}
                    </a>
                </div>
            </form>
        </div>
    {/if}
</div>
