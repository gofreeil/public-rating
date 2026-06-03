<script lang="ts">
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    function getSender(extraFields: string): { name: string; phone: string } {
        try {
            const ef = JSON.parse(extraFields);
            return { name: ef.sender_name ?? '', phone: ef.sender_phone ?? '' };
        } catch {
            return { name: '', phone: '' };
        }
    }

    function getItemLabel(extraFields: string): string {
        try { return JSON.parse(extraFields)?.item_label ?? ''; }
        catch { return ''; }
    }

    function formatDate(iso: string): string {
        if (!iso) return '';
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1)  return 'עכשיו';
        if (mins < 60) return `לפני ${mins} דק'`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `לפני ${hours} שע'`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'אתמול';
        return `לפני ${days} ימים`;
    }

    function waLink(phone: string): string {
        const digits = phone.replace(/\D/g, '').replace(/^0/, '972');
        return `https://wa.me/${digits}`;
    }
</script>

<svelte:head>
    <title>הודעות אישיות | קהילה בשכונה</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-8" dir="rtl">

    <!-- Header -->
    <div class="mb-6">
        <h1 class="text-2xl font-black text-white flex items-center gap-2">
            ✉️ הודעות אישיות
        </h1>
        <p class="text-gray-400 text-sm mt-0.5">{data.messages.length} הודעות</p>
    </div>

    {#if data.messages.length === 0}
        <div class="text-center py-16">
            <div class="text-5xl mb-3">📭</div>
            <p class="font-bold text-lg text-gray-400">אין הודעות עדיין</p>
            <p class="text-gray-500 text-sm mt-1">כשמישהו ישלח לך הודעה בנוגע למודעה שפרסמת - היא תופיע כאן</p>
        </div>
    {:else}
        <div class="space-y-3">
            {#each data.messages as msg}
                {@const sender    = getSender(msg.extra_fields)}
                {@const itemLabel = getItemLabel(msg.extra_fields)}
                <div class="rounded-2xl border border-purple-500/20 bg-purple-900/10 p-4 hover:bg-purple-900/20 transition-all">
                    <!-- Header row -->
                    <div class="flex items-start justify-between gap-2 mb-2">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                                {sender.name?.charAt(0) || '?'}
                            </div>
                            <div>
                                <p class="text-white font-bold text-sm leading-tight">{sender.name || 'אנונימי'}</p>
                                {#if itemLabel}
                                    <p class="text-gray-500 text-xs">בנוגע ל: {itemLabel}</p>
                                {/if}
                            </div>
                        </div>
                        <span class="text-gray-500 text-xs flex-shrink-0">{formatDate(msg.created_at)}</span>
                    </div>

                    <!-- Message body -->
                    <p class="text-gray-300 text-sm leading-relaxed bg-white/5 rounded-xl px-4 py-3 mb-3">
                        {msg.description}
                    </p>

                    <!-- Reply buttons -->
                    {#if sender.phone}
                        <div class="flex gap-2">
                            <a href="tel:{sender.phone}"
                                class="flex-1 text-center py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-sm font-bold transition-all border border-blue-500/30">
                                📞 {sender.phone}
                            </a>
                            <a href={waLink(sender.phone)} target="_blank" rel="noopener noreferrer"
                                aria-label="שלח הודעת וואטסאפ (נפתח בחלון חדש)"
                                class="px-4 py-2 rounded-xl bg-green-600/20 hover:bg-green-600 text-green-300 hover:text-white text-sm font-bold transition-all border border-green-500/30">
                                💬 וואטסאפ
                            </a>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}

    <!-- Back -->
    <div class="text-center mt-8">
        <a href="/profile" class="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← חזרה לפרופיל
        </a>
    </div>
</div>
