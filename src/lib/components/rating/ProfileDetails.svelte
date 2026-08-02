<script lang="ts">
    // תעודת זהות ציבורית של המדורג — פרטי קשר, שקיפות בפועל, התמחויות,
    // נוכחות והבטחות במעקב. מציגה רק מה שקיים; בלי נתונים — לא מוצגת כלל.
    import { PROMISE_STATUSES, type Official, type PromiseStatus } from '$lib/rating/types';
    import { absDate } from '$lib/rating/time';

    let {
        official,
        lastResponseAt = null,
    }: { official: Official; lastResponseAt?: string | null } = $props();

    function waHref(v: string): string {
        return v.startsWith('http') ? v : `https://wa.me/${v.replace(/\D/g, '')}`;
    }

    const contactChips = $derived.by(() => {
        const c = official.contacts;
        const chips: { icon: string; label: string; href: string; external: boolean }[] = [];
        if (c.email) chips.push({ icon: '📧', label: 'דוא"ל', href: `mailto:${c.email}`, external: false });
        if (c.phone) chips.push({ icon: '📞', label: c.phone, href: `tel:${c.phone.replace(/[^\d+]/g, '')}`, external: false });
        if (c.whatsapp) chips.push({ icon: '💬', label: 'וואטסאפ', href: waHref(c.whatsapp), external: true });
        if (c.facebook) chips.push({ icon: '📘', label: 'פייסבוק', href: c.facebook, external: true });
        if (c.website) chips.push({ icon: '🌐', label: 'אתר רשמי', href: c.website, external: true });
        return chips;
    });

    // שקיפות בפועל: מה המדורג עצמו מפרסם ועושה — נפרד מדירוגי הגולשים
    const transparency = $derived([
        {
            icon: '📜',
            label: 'מצע והתחייבויות',
            ok: Boolean(official.platform_url),
            href: official.platform_url || null,
            title: official.platform_url ? 'פורסם — לצפייה' : 'לא פורסם / לא ידוע',
        },
        {
            icon: '📄',
            label: 'דין וחשבון שנתי',
            ok: Boolean(official.annual_report_url),
            href: official.annual_report_url || null,
            title: official.annual_report_url ? 'פורסם — לצפייה' : 'לא פורסם / לא ידוע',
        },
        {
            icon: '📨',
            label: 'מענה לפניות הציבור',
            ok: Boolean(lastResponseAt),
            href: null,
            title: lastResponseAt ? `מענה אחרון: ${absDate(lastResponseAt)}` : 'טרם נענו פניות באתר',
        },
    ]);

    const hasAnything = $derived(
        contactChips.length > 0 ||
            official.specialties.length > 0 ||
            official.promises.length > 0 ||
            official.attendance_score !== null ||
            Boolean(official.platform_url || official.annual_report_url || lastResponseAt),
    );

    function promiseMeta(status: PromiseStatus) {
        return PROMISE_STATUSES.find((s) => s.key === status) ?? PROMISE_STATUSES[3];
    }

    const PROMISE_COLORS: Record<PromiseStatus, string> = {
        kept: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
        in_progress: 'border-amber-400/30 bg-amber-500/10 text-amber-300',
        broken: 'border-red-400/30 bg-red-500/10 text-red-300',
        unknown: 'border-white/10 bg-white/5 text-gray-400',
    };
</script>

{#if hasAnything}
    <section class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 class="mb-3 text-lg font-bold text-white">תעודת זהות ציבורית</h2>

        <div class="flex flex-col gap-3">
            <!-- שקיפות בפועל -->
            <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-bold text-gray-500">שקיפות בפועל:</span>
                {#each transparency as t (t.label)}
                    {#if t.ok && t.href}
                        <a
                            href={t.href}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            title={t.title}
                            class="chip-ok rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-300 transition-colors"
                        >✓ {t.icon} {t.label}</a>
                    {:else if t.ok}
                        <span
                            title={t.title}
                            class="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-300"
                        >✓ {t.icon} {t.label}</span>
                    {:else}
                        <span
                            title={t.title}
                            class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-500"
                        >— {t.icon} {t.label}</span>
                    {/if}
                {/each}
                {#if official.attendance_score !== null}
                    <span
                        title="אחוז נוכחות בדיונים/הצבעות — מנתונים רשמיים"
                        class="rounded-full border border-blue-400/30 bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-300 tabular-nums"
                    >🪑 נוכחות {official.attendance_score}%</span>
                {/if}
            </div>

            <!-- פרטי קשר רשמיים -->
            {#if contactChips.length}
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-xs font-bold text-gray-500">יצירת קשר:</span>
                    {#each contactChips as chip (chip.label)}
                        <a
                            href={chip.href}
                            target={chip.external ? '_blank' : undefined}
                            rel={chip.external ? 'noopener noreferrer nofollow' : undefined}
                            class="contact-chip rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 transition-colors"
                        >{chip.icon} {chip.label}</a>
                    {/each}
                </div>
            {/if}

            <!-- תחומי התמחות -->
            {#if official.specialties.length}
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-xs font-bold text-gray-500">תחומי עיסוק:</span>
                    {#each official.specialties as s (s)}
                        <span class="rounded-full border border-purple-400/20 bg-purple-500/10 px-2.5 py-1 text-xs text-purple-300">{s}</span>
                    {/each}
                </div>
            {/if}

            <!-- הבטחות במעקב -->
            {#if official.promises.length}
                <div class="border-t border-white/10 pt-3">
                    <h3 class="mb-2 text-sm font-bold text-white">📋 הבטחות במעקב</h3>
                    <ul class="flex flex-col gap-1.5">
                        {#each official.promises as p, i (i)}
                            {@const meta = promiseMeta(p.status)}
                            <li class="flex flex-wrap items-center gap-2 text-sm">
                                <span class="whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-bold {PROMISE_COLORS[p.status]}">
                                    {meta.icon} {meta.label}
                                </span>
                                <span class="min-w-0 flex-1 leading-relaxed text-gray-300">{p.text}</span>
                            </li>
                        {/each}
                    </ul>
                    <p class="mt-2 text-xs text-gray-600">
                        מעקב ההבטחות מתעדכן על ידי צוות האתר על סמך מקורות פומביים.
                    </p>
                </div>
            {/if}
        </div>
    </section>
{/if}

<style>
    /* Tailwind v4: group-hover שבור — CSS מפורש */
    .contact-chip:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
    }
    .chip-ok:hover {
        background: rgba(16, 185, 129, 0.2);
    }
</style>
