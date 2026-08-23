<script lang="ts">
    // סרגל שיתוף — מנוע הצמיחה של אתר שקיפות אזרחי הוא ההפצה ברשתות.
    // בנייד: שיתוף מערכת (navigator.share); בדסקטופ: כפתורים ישירים + העתקה.
    import { page } from '$app/state';
    import { absUrl } from '$lib/seo';

    let {
        /** הטקסט שילווה את הקישור */
        text,
        /** נתיב לשיתוף; ברירת מחדל — הדף הנוכחי */
        path = '',
        /** כותרת לשיתוף המערכת בנייד */
        title = 'דירוג ציבורי',
        compact = false,
    }: { text: string; path?: string; title?: string; compact?: boolean } = $props();

    const url = $derived(absUrl(path || page.url.pathname));
    const message = $derived(`${text}\n${url}`);

    let copied = $state(false);
    let copyTimer: ReturnType<typeof setTimeout> | undefined;

    const NETWORKS = $derived([
        {
            key: 'whatsapp',
            label: 'וואטסאפ',
            icon: '💬',
            color: '#25D366',
            href: `https://wa.me/?text=${encodeURIComponent(message)}`,
        },
        {
            key: 'facebook',
            label: 'פייסבוק',
            icon: 'f',
            color: '#1877F2',
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        },
        {
            key: 'x',
            label: 'X',
            icon: '𝕏',
            color: '#e7e9ea',
            href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        },
        {
            key: 'telegram',
            label: 'טלגרם',
            icon: '✈️',
            color: '#2AABEE',
            href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
        },
    ]);

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            return; // דפדפן ללא הרשאת clipboard — הכפתורים האחרים עדיין עובדים
        }
        copied = true;
        clearTimeout(copyTimer);
        copyTimer = setTimeout(() => (copied = false), 2000);
    }

    async function nativeShare() {
        try {
            await navigator.share({ title, text, url });
        } catch {
            // המשתמש ביטל — אין מה לעשות
        }
    }

    // נקבע רק בדפדפן — כדי שה-SSR וההידרציה יסכימו על אותו HTML
    let canNativeShare = $state(false);
    $effect(() => {
        canNativeShare = typeof navigator.share === 'function';
    });
</script>

<div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="שיתוף">
    {#if !compact}
        <span class="ml-1 text-xs font-bold text-gray-400">שתפו:</span>
    {/if}

    {#each NETWORKS as n (n.key)}
        <a
            href={n.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="שיתוף ב{n.label}"
            title="שיתוף ב{n.label}"
            class="share-btn flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-800/80 text-sm transition-colors"
            style="--hover: {n.color}"
        >
            <span aria-hidden="true" style="color: {n.color}">{n.icon}</span>
        </a>
    {/each}

    <button
        type="button"
        onclick={copyLink}
        aria-label={copied ? 'הקישור הועתק' : 'העתקת קישור'}
        title="העתקת קישור"
        class="share-btn flex h-8 cursor-pointer items-center gap-1 rounded-full border border-white/10 bg-slate-800/80 px-2.5 text-xs font-bold transition-colors {copied
            ? 'text-emerald-300'
            : 'text-gray-300'}"
        style="--hover: #60a5fa"
    >
        <span aria-hidden="true">{copied ? '✓' : '🔗'}</span>
        <span>{copied ? 'הועתק' : 'העתקה'}</span>
    </button>

    {#if canNativeShare}
        <button
            type="button"
            onclick={nativeShare}
            class="share-btn flex h-8 cursor-pointer items-center gap-1 rounded-full border border-white/10 bg-slate-800/80 px-2.5 text-xs font-bold text-gray-300 transition-colors sm:hidden"
            style="--hover: #a78bfa"
        >
            <span aria-hidden="true">📤</span>
            <span>שיתוף</span>
        </button>
    {/if}
</div>

<style>
    /* Tailwind v4: group-hover שבור — CSS מפורש */
    .share-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: color-mix(in srgb, var(--hover) 55%, transparent);
    }
    .share-btn:focus-visible {
        outline: 2px solid var(--hover);
        outline-offset: 2px;
    }
</style>
