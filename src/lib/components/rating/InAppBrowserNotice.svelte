<script lang="ts">
    // התראת דפדפן מוטמע (WebView).
    //
    // קישורי דירוג מופצים כמעט כולם בוואטסאפ ובפייסבוק, ששניהם פותחים
    // דפדפן מוטמע. גוגל חוסם התחברות OAuth בדפדפן מוטמע וזורק
    // "Error 403: disallowed_useragent" — המשתמש רואה מסך שגיאה באנגלית
    // ומוותר. עדיף להזהיר לפני הלחיצה מאשר להסביר אחריה.
    import { onMount } from 'svelte';

    let isInApp = $state(false);
    let copied = $state(false);

    // FBAN/FBAV = פייסבוק, Instagram, Line, MicroMessenger = WeChat.
    // וואטסאפ אינו מסמן את עצמו במחרוזת ייעודית באנדרואיד, ולכן נבדק גם
    // הדפוס הכללי של WebView באנדרואיד (wv) ושל WKWebView באייפון.
    const PATTERNS =
        /(FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|Twitter|TikTok|; wv\)|WhatsApp)/i;

    onMount(() => {
        const ua = navigator.userAgent || '';
        const iosWebView =
            /iPhone|iPod|iPad/.test(ua) && !/Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);
        isInApp = PATTERNS.test(ua) || iosWebView;
    });

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(location.href);
        } catch {
            return;
        }
        copied = true;
        setTimeout(() => (copied = false), 2500);
    }
</script>

{#if isInApp}
    <div class="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm">
        <p class="font-bold text-amber-200">
            ⚠️ נראה שפתחתם את הדף מתוך אפליקציה (וואטסאפ / פייסבוק)
        </p>
        <p class="mt-1 leading-relaxed text-amber-100/80">
            התחברות עם גוגל חסומה בדפדפן מוטמע. פתחו את הדף בדפדפן הרגיל —
            בתפריט <b>⋮</b> או <b>⋯</b> שבפינה, בחרו <b>"פתח בדפדפן"</b>.
            אפשר גם להתחבר כאן עם דוא״ל וסיסמה, בלי לצאת מהאפליקציה.
        </p>
        <button
            type="button"
            onclick={copyLink}
            class="mt-2 cursor-pointer rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-100 transition-colors hover:bg-amber-500/25"
        >{copied ? '✓ הקישור הועתק — הדביקו בדפדפן' : '🔗 העתקת הקישור לדף הזה'}</button>
    </div>
{/if}
