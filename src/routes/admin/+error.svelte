<script lang="ts">
    import { page } from '$app/state';
</script>

<svelte:head><title>שגיאה – פאנל ניהול</title></svelte:head>

<div dir="rtl" class="flex min-h-[50vh] items-center justify-center px-4">
    <div class="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <div class="mb-2 text-4xl" aria-hidden="true">{page.status === 403 ? '🚫' : '⚠️'}</div>
        <h1 class="mb-1 text-xl font-black text-white">
            {page.status === 403 ? 'אין הרשאת גישה' : 'משהו השתבש'}
        </h1>
        <p class="mb-4 text-sm text-gray-400">{page.error?.message || 'שגיאה לא צפויה'}</p>
        <div class="flex items-center justify-center gap-2">
            <a href="/" class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white hover:bg-white/10">
                חזרה לאתר
            </a>
            {#if page.status === 403}
                <a href="/login?redirect=/admin" class="btn-premium rounded-xl px-4 py-2 text-sm font-bold text-white">
                    התחברות עם חשבון אחר
                </a>
            {/if}
        </div>
    </div>
</div>
