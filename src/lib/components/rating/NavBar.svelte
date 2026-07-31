<script lang="ts">
    // סרגל ניווט אופקי קומפקטי — מתחת ל-Header
    import { page } from '$app/state';

    const LINKS = [
        { href: '/', label: 'דף הבית' },
        { href: '/knesset', label: 'חברי כנסת' },
        { href: '/judges', label: 'שופטים' },
        { href: '/public-servants', label: 'עובדי ציבור' },
        { href: '/compare', label: '⚖️ השוואה' },
        { href: '/top-rated', label: '🏆 המצטיינים' },
    ];

    function isActive(href: string, pathname: string): boolean {
        if (href === '/') return pathname === '/';
        return pathname === href || pathname.startsWith(href + '/');
    }
</script>

<nav aria-label="ניווט ראשי" class="border-b border-white/10 bg-white/[0.02]">
    <div class="nav-scroll mx-auto flex max-w-5xl items-center overflow-x-auto whitespace-nowrap px-2 md:justify-center">
        {#each LINKS as link (link.href)}
            <a
                href={link.href}
                aria-current={isActive(link.href, page.url.pathname) ? 'page' : undefined}
                class="nav-link border-b-2 px-3 py-2 text-sm font-bold transition-colors
                    {isActive(link.href, page.url.pathname)
                        ? 'border-blue-500 text-white'
                        : 'border-transparent text-gray-400'}"
            >{link.label}</a>
        {/each}
    </div>
</nav>

<style>
    .nav-scroll {
        scrollbar-width: none;
    }
    .nav-scroll::-webkit-scrollbar {
        display: none;
    }
    .nav-link:hover {
        color: #e5e7eb;
    }
</style>
