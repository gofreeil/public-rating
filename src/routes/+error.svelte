<script lang="ts">
    // עמוד שגיאה מעוצב — בלי זה SvelteKit מציג עמוד ברירת-מחדל באנגלית (LTR)
    import { page } from '$app/state';

    const is404 = $derived(page.status === 404);
</script>

<svelte:head>
    <title>{page.status} — דירוג ציבורי</title>
</svelte:head>

<div class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
    <span class="text-5xl">{is404 ? '🔍' : '⚠️'}</span>
    <h1 class="text-2xl font-black text-white">
        {is404 ? 'העמוד לא נמצא' : 'משהו השתבש'}
    </h1>
    <p class="text-sm text-gray-400">
        {#if is404}
            {page.error?.message && page.error.message !== 'Not Found'
                ? page.error.message
                : 'הקישור שהגעתם אליו לא קיים או שהוסר.'}
        {:else}
            המערכת עמוסה או שיש תקלה רגעית — נסו לרענן בעוד רגע.
        {/if}
    </p>
    <div class="mt-2 flex flex-wrap justify-center gap-2">
        <a href="/" class="btn-premium rounded-xl px-5 py-2 text-sm font-bold text-white">לדף הבית</a>
        <a
            href="/top-rated"
            class="rounded-xl border border-white/10 bg-slate-800/80 px-5 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10"
        >🏆 המצטיינים</a>
    </div>
</div>
