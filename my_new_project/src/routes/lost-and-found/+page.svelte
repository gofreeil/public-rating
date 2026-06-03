<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    type LafType = 'all' | 'lost' | 'found';
    let filter = $state<LafType>('found');

    // Message modal state
    let msgModal = $state<{ id: string; label: string; user_id: string } | null>(null);
    let msgSending = $state(false);

    // Resolve modal state
    let resolveModal = $state<{ id: string; label: string; user_id: string; type: 'lost' | 'found' } | null>(null);
    let resolveSending = $state(false);
    let resolvedIds = $state<string[]>([]);

    $effect(() => {
        if (form?.msgSent) msgModal = null;
        if (form?.resolved && form.resolvedItemId) {
            resolvedIds = [...resolvedIds, form.resolvedItemId];
            resolveModal = null;
        }
    });

    function getItemType(extraFields: string): 'lost' | 'found' {
        try {
            const ef = JSON.parse(extraFields);
            return ef.type === 'lost' ? 'lost' : 'found';
        } catch {
            return 'found';
        }
    }

    function getItemImage(extraFields: string): string {
        try { return JSON.parse(extraFields)?.image ?? ''; }
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

    let filtered = $derived(
        filter === 'all'
            ? data.items
            : data.items.filter(i => getItemType(i.extra_fields) === filter)
    );
</script>

<svelte:head>
    <title>אבדות ומציאות | קהילה בשכונה</title>
</svelte:head>

<!-- Message modal -->
{#if msgModal}
    <div class="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center px-4" dir="rtl">
        <div class="w-full max-w-md bg-[#1e293b] rounded-2xl border border-white/10 shadow-2xl p-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="font-black text-white text-lg">✉️ שלח הודעה לפורסם</h2>
                <button onclick={() => msgModal = null} class="text-gray-400 hover:text-white text-xl leading-none">✕</button>
            </div>
            <p class="text-gray-400 text-sm mb-4">
                בנוגע ל: <span class="text-blue-300 font-bold">{msgModal.label}</span>
            </p>

            {#if form?.msgSent}
                <div class="text-center py-6">
                    <div class="text-4xl mb-2">✅</div>
                    <p class="text-green-300 font-bold">ההודעה נשלחה בהצלחה!</p>
                    <p class="text-gray-400 text-sm mt-1">הפורסם יראה אותה בהודעות האישיות שלו</p>
                    <button onclick={() => msgModal = null}
                        class="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors text-sm">
                        סגור
                    </button>
                </div>
            {:else}
                {#if form?.msgError}
                    <div class="mb-3 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm">
                        ⚠️ {form.msgError}
                    </div>
                {/if}

                <form method="POST" action="?/sendMessage"
                    use:enhance={() => {
                        msgSending = true;
                        return async ({ update }) => { await update(); msgSending = false; };
                    }}
                    class="space-y-4">
                    <input type="hidden" name="recipient_id" value={msgModal.user_id} />
                    <input type="hidden" name="item_label" value={msgModal.label} />

                    <div>
                        <label for="msg-body" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-1.5">
                            ההודעה שלך *
                        </label>
                        <textarea
                            id="msg-body"
                            name="message"
                            rows="3"
                            required
                            placeholder="כתוב את הודעתך כאן..."
                            class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600 resize-none"
                        ></textarea>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label for="msg-name" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-1.5">
                                שמך *
                            </label>
                            <input id="msg-name" type="text" name="sender_name" required placeholder="שם פרטי"
                                class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-3 py-2.5 text-white text-sm outline-none transition-colors placeholder:text-gray-600" />
                        </div>
                        <div>
                            <label for="msg-phone" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-1.5">
                                טלפון *
                            </label>
                            <input id="msg-phone" type="tel" name="sender_phone" required placeholder="050-0000000"
                                class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-3 py-2.5 text-white text-sm outline-none transition-colors placeholder:text-gray-600" />
                        </div>
                    </div>

                    <button type="submit" disabled={msgSending}
                        class="w-full py-3 rounded-xl font-black text-sm transition-all
                            {msgSending ? 'bg-white/10 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg'}">
                        {msgSending ? 'שולח...' : '✉️ שלח הודעה'}
                    </button>
                </form>
            {/if}
        </div>
    </div>
{/if}

<!-- Resolve modal -->
{#if resolveModal}
    <div class="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center px-4" dir="rtl">
        <div class="w-full max-w-md bg-[#1e293b] rounded-2xl border border-white/10 shadow-2xl p-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="font-black text-white text-lg">✅ הורדת מודעה</h2>
                <button onclick={() => resolveModal = null} class="text-gray-400 hover:text-white text-xl leading-none">✕</button>
            </div>

            <p class="text-gray-300 text-sm mb-3 leading-relaxed">
                נודה לך שתדווח גם כשהאבדה שבה - כדי שנשמח יחד ונקדם חברה מתוקנת יותר 🤝
            </p>
            <p class="text-gray-500 text-sm mb-5">
                לפני הסרת המודעה <span class="text-white font-bold">"{resolveModal.label}"</span>,
                נשמח לדעת:
            </p>

            {#if form?.resolveError}
                <div class="mb-3 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm">
                    ⚠️ {form.resolveError}
                </div>
            {/if}

            <form method="POST" action="?/resolveItem"
                use:enhance={() => {
                    resolveSending = true;
                    return async ({ update }) => { await update(); resolveSending = false; };
                }}
                class="space-y-4">
                <input type="hidden" name="item_id" value={resolveModal.id} />
                <input type="hidden" name="item_user_id" value={resolveModal.user_id} />

                <div>
                    <label for="resolver-phone" class="block text-sm font-bold text-white mb-2">
                        {resolveModal.type === 'lost'
                            ? '📞 מה מספר הטלפון של מי שהחזיר לך את האבדה?'
                            : '📞 מה מספר הטלפון של מי שקיבל ממך את הפריט?'}
                    </label>
                    <input
                        id="resolver-phone"
                        type="tel"
                        name="resolver_phone"
                        required
                        placeholder="050-0000000"
                        class="w-full bg-white/5 border border-white/10 focus:border-green-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                    />
                    <p class="text-gray-500 text-xs mt-1.5">הפרטים נשמרים לצורך מעקב ואינם מפורסמים</p>
                </div>

                <div class="flex gap-3">
                    <button type="button" onclick={() => resolveModal = null}
                        class="flex-1 py-3 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/10">
                        ביטול
                    </button>
                    <button type="submit" disabled={resolveSending}
                        class="flex-1 py-3 rounded-xl font-black text-sm transition-all
                            {resolveSending ? 'bg-white/10 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white shadow-lg'}">
                        {resolveSending ? 'מסיר...' : '✅ הסר מודעה'}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<div class="max-w-2xl mx-auto px-4 py-8" dir="rtl">

    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
        <div>
            <h1 class="text-2xl font-black text-white flex items-center gap-2">
                🔍 אבדות ומציאות
            </h1>
            <p class="text-gray-400 text-sm mt-0.5">{data.items.length} מודעות פעילות</p>
            {#if data.returnedCount > 0}
                <p class="text-green-400 text-xs mt-1 font-bold">🕊️ {data.returnedCount} אבידות הושבו דרך הקהילה</p>
            {/if}
        </div>
        <a
            href="/lost-and-found/add"
            class="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg"
        >
            + הוסף מודעה
        </a>
    </div>

    <!-- Filter tabs -->
    <div class="flex gap-2 mb-6">
        {#each [
            { value: 'all',   label: '🔍 הכל',  count: data.items.length },
            { value: 'lost',  label: '❓ אבד',   count: data.items.filter(i => getItemType(i.extra_fields) === 'lost').length },
            { value: 'found', label: '✅ נמצא',  count: data.items.filter(i => getItemType(i.extra_fields) === 'found').length },
        ] as tab}
            <button
                onclick={() => filter = tab.value as LafType}
                class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all border
                    {filter === tab.value
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}"
            >
                {tab.label}
                <span class="text-xs opacity-70">({tab.count})</span>
            </button>
        {/each}
    </div>

    <!-- Items list -->
    {#if filtered.length === 0}
        <div class="text-center py-16 text-gray-500">
            <div class="text-5xl mb-3">🔍</div>
            <p class="font-bold text-lg text-gray-400">אין מודעות עדיין</p>
            <p class="text-sm mt-1">היה הראשון להוסיף!</p>
            <a href="/lost-and-found/add"
               class="mt-4 inline-block bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
                + הוסף מודעה
            </a>
        </div>
    {:else}
        <div class="space-y-3">
            {#each filtered.filter(i => !resolvedIds.includes(i.id)) as item}
                {@const type    = getItemType(item.extra_fields)}
                {@const image   = getItemImage(item.extra_fields)}
                {@const isOwner = data.currentUserId && item.user_id === data.currentUserId}
                <a href="/lost-and-found/{item.id}" class="relative rounded-2xl border border-white/10 bg-white/5 overflow-hidden hover:bg-white/8 transition-all block no-underline group">
                    {#if image}
                        <div class="relative w-full h-40">
                            <img src={image} alt={item.label} class="w-full h-full object-cover" />
                            <div class="absolute inset-0 bg-gradient-to-t from-[#0f172a]/80 to-transparent"></div>
                        </div>
                    {/if}

                    <!-- Type badge -->
                    <div class="absolute top-0 right-0 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-bl-xl
                        {type === 'found' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}">
                        {type === 'found' ? '✅ נמצא' : '❓ אבד'}
                    </div>

                    <div class="p-4 {image ? '' : 'mt-3'}">
                        <h3 class="font-black text-white text-base mb-2 leading-tight">{item.label}</h3>

                        {#if item.description}
                            <p class="text-gray-400 text-sm mb-2 leading-snug">{item.description.replace(/^(❓ אבד|✅ נמצא) \| /, '')}</p>
                        {/if}

                        <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                            {#if item.address}<span>📍 {item.address}</span>{/if}
                            {#if item.contact}<span>👤 {item.contact}</span>{/if}
                            {#if item.created_at}<span>🕒 {formatDate(item.created_at)}</span>{/if}
                        </div>

                        <div class="flex flex-col gap-2" onclick={(e) => e.stopPropagation()}>
                            {#if item.phone}
                                <div class="flex gap-2">
                                    <a href="tel:{item.phone}"
                                        class="flex-1 text-center py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-sm font-bold transition-all border border-blue-500/30">
                                        📞 {item.phone}
                                    </a>
                                    <a href={waLink(item.phone)} target="_blank" rel="noopener noreferrer"
                                        aria-label="שלח הודעת וואטסאפ (נפתח בחלון חדש)"
                                        class="px-4 py-2 rounded-xl bg-green-600/20 hover:bg-green-600 text-green-300 hover:text-white text-sm font-bold transition-all border border-green-500/30">
                                        💬
                                    </a>
                                </div>
                            {/if}

                            {#if item.user_id && !isOwner}
                                <button
                                    onclick={() => msgModal = { id: item.id, label: item.label, user_id: item.user_id! }}
                                    class="w-full py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white text-sm font-bold transition-all border border-purple-500/30"
                                >
                                    ✉️ שלח הודעה לפורסם
                                </button>
                            {/if}

                            {#if isOwner}
                                <button
                                    onclick={() => resolveModal = { id: item.id, label: item.label, user_id: item.user_id!, type }}
                                    class="w-full py-2 rounded-xl bg-red-600/15 hover:bg-red-600/30 text-red-400 hover:text-red-300 text-xs font-bold transition-all border border-red-500/20"
                                >
                                    🗑️ הורד מודעה
                                </button>
                            {/if}
                        </div>
                    </div>
                </a>
            {/each}
        </div>
    {/if}

    <!-- Back -->
    <div class="text-center mt-8">
        <a href="/" class="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← חזרה לדף הראשי
        </a>
    </div>
</div>
