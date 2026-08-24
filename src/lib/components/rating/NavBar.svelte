<script lang="ts">
    // סרגל ניווט אופקי קומפקטי — מתחת ל-Header
    import { page } from '$app/state';
    import { GROUPS } from '$lib/rating/types';

    let { loggedIn = false }: { loggedIn?: boolean } = $props();

    // הלוחות נגזרים מ-GROUPS — הוספת קטגוריה מדורגת חדשה לא דורשת עריכה כאן
    // accent: שלושת הלוחות — לב האתר, ולכן בכחול ולא באפור.
    // דף הבית ואודות לא חוזרים כאן — שניהם קיימים בהדר שמעל.
    const LINKS = $derived([
        ...GROUPS.map((g) => ({ href: g.route, label: g.title, accent: true })),
        { href: '/top-rated', label: '🏆 המצטיינים', accent: false },
        { href: '/compare', label: '⚖️ השוואה', accent: false },
        ...(loggedIn ? [{ href: '/my-ratings', label: '⭐ הדירוגים שלי', accent: false }] : []),
    ]);

    function isActive(href: string, pathname: string): boolean {
        if (href === '/') return pathname === '/';
        return pathname === href || pathname.startsWith(href + '/');
    }
</script>

<!--
  דביק: הלוחות ארוכים, ואחרי גלילה של עשרות כרטיסים המעבר בין קטגוריות
  דרש חזרה לראש הדף. הרקע אטום למחצה עם טשטוש כדי שהכרטיסים שמתחת
  לא יבצבצו דרך הסרגל.
-->
<nav
    aria-label="ניווט ראשי"
    class="nav-sticky sticky top-0 z-30 border-b border-white/10"
>
    <div class="nav-scroll mx-auto flex max-w-5xl items-center overflow-x-auto whitespace-nowrap px-2 md:justify-center">
        {#each LINKS as link (link.href)}
            <a
                href={link.href}
                aria-current={isActive(link.href, page.url.pathname) ? 'page' : undefined}
                class="nav-link border-b-2 px-3 py-2 text-sm font-bold transition-colors
                    {isActive(link.href, page.url.pathname)
                        ? 'border-blue-500 text-white'
                        : link.accent
                          ? 'border-transparent text-blue-400'
                          : 'border-transparent text-gray-200'}"
            >{link.label}</a>
        {/each}
    </div>
</nav>

<style>
    .nav-sticky {
        background: rgba(15, 23, 42, 0.92);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }
    .nav-scroll {
        scrollbar-width: none;
    }
    .nav-scroll::-webkit-scrollbar {
        display: none;
    }
    .nav-link:hover {
        color: #fff;
    }
</style>
