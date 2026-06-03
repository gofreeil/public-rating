<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let submitting   = $state(false);
    let imageBase64  = $state('');
    let imagePreview = $state('');

    // שדות דינמיים לפי סוג הקריאה
    const fieldsByOption: Record<string, { descLabel: string; descPlaceholder: string; locationPlaceholder: string }> = {
        '1': {
            descLabel:          'תיאור המצב',
            descPlaceholder:    'פרט את המצב - מה קרה, באיזו עזרה נדרש...',
            locationPlaceholder:'רחוב, כניסה, קומה...',
        },
        '2': {
            descLabel:          'פרטי הרכב',
            descPlaceholder:    'צבע הרכב, דגם, לוחית רישוי...',
            locationPlaceholder:'היכן הרכב חונה? רחוב ומספר...',
        },
        '3': {
            descLabel:          'תיאור הילד',
            descPlaceholder:    'גיל, לבוש, מאפיינים בולטים, מתי נעלם...',
            locationPlaceholder:'איפה נראה לאחרונה? שם המקום, רחוב...',
        },
        '4': {
            descLabel:          'תיאור בקשת העזרה',
            descPlaceholder:    'פרט מה קרה ובמה נדרשת עזרה...',
            locationPlaceholder:'מיקום - רחוב, שכונה...',
        },
        '5': {
            descLabel:          'תיאור הכלב',
            descPlaceholder:    'גזע, צבע, שם הכלב, מתי ואיפה נעלם...',
            locationPlaceholder:'אזור שאבד לאחרונה...',
        },
    };

    let fields = $derived(fieldsByOption[data.optionId] ?? fieldsByOption['4']);

    function handleImageChange(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const MAX = 900;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const src = ev.target?.result as string;
            const img = new Image();
            img.onload = () => {
                let w = img.naturalWidth, h = img.naturalHeight;
                if (w > MAX || h > MAX) {
                    const r = Math.min(MAX / w, MAX / h);
                    w = Math.round(w * r); h = Math.round(h * r);
                }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
                const b64 = canvas.toDataURL('image/jpeg', 0.82);
                imageBase64 = b64; imagePreview = b64;
            };
            img.src = src;
        };
        reader.readAsDataURL(file);
    }
</script>

<svelte:head>
    <title>{data.option.icon} {data.option.text} | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen flex items-start justify-center pt-8 pb-16 px-4 cursor-pointer" dir="rtl"
    onclick={(e) => { if (e.target === e.currentTarget) history.back(); }}
    role="button" tabindex="-1">
    <div class="w-full max-w-lg cursor-default" onclick={(e) => e.stopPropagation()}>

        <!-- Header -->
        <div class="text-center mb-8">
            <div class="text-5xl mb-3">{data.option.icon}</div>
            <h1 class="text-2xl font-black text-white mb-1">{data.option.text}</h1>
            <p class="text-gray-400 text-sm">מלא את הפרטים ונעדכן את הקהילה מיד</p>
            <div class="mt-3 inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-1.5 text-xs font-bold text-red-400">
                🆘 קריאת עזרה לקהילה
            </div>
        </div>

        <!-- Form card -->
        <div class="bg-[#1e293b] border border-white/10 rounded-2xl p-6 shadow-2xl">

            {#if form?.error}
                <div class="mb-4 px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-bold">
                    ⚠️ {form.error}
                </div>
            {/if}

            <form method="POST"
                use:enhance={() => {
                    submitting = true;
                    return async ({ update }) => { await update(); submitting = false; };
                }}
                class="space-y-5">

                <input type="hidden" name="option_id" value={data.optionId} />

                <!-- Description -->
                <div>
                    <label for="rh-desc" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        {fields.descLabel} *
                    </label>
                    <textarea
                        id="rh-desc"
                        name="description"
                        rows="4"
                        required
                        placeholder={fields.descPlaceholder}
                        class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600 resize-none"
                    ></textarea>
                </div>

                <!-- Location -->
                <div>
                    <label for="rh-location" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        מיקום *
                    </label>
                    <input
                        id="rh-location"
                        name="location"
                        type="text"
                        required
                        placeholder={fields.locationPlaceholder}
                        class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                    />
                </div>

                <!-- Image -->
                <div>
                    <p class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        תמונה (אופציונלי)
                    </p>
                    {#if imagePreview}
                        <div class="relative w-full rounded-xl overflow-hidden border border-white/10">
                            <img src={imagePreview} alt="תצוגה מקדימה" class="w-full max-h-52 object-contain bg-black/30" />
                            <button type="button" onclick={() => { imageBase64 = ''; imagePreview = ''; }}
                                class="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 text-white text-sm flex items-center justify-center transition-colors">✕</button>
                        </div>
                    {:else}
                        <label class="flex flex-col items-center justify-center gap-2 w-full h-24 rounded-xl border-2 border-dashed border-white/15 hover:border-red-500/50 bg-white/3 hover:bg-red-900/10 cursor-pointer transition-all">
                            <span class="text-2xl">📷</span>
                            <span class="text-gray-400 text-sm font-bold">לחץ להעלאת תמונה</span>
                            <input type="file" accept="image/*" class="hidden" onchange={handleImageChange} />
                        </label>
                    {/if}
                    <input type="hidden" name="image_base64" value={imageBase64} />
                </div>

                <!-- Contact -->
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="rh-contact" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                            שם ליצירת קשר
                        </label>
                        <input id="rh-contact" name="contact" type="text" placeholder="שם פרטי"
                            class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600" />
                    </div>
                    <div>
                        <label for="rh-phone" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                            טלפון *
                        </label>
                        <input id="rh-phone" name="phone" type="tel" required placeholder="050-0000000"
                            class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600" />
                    </div>
                </div>

                <!-- Submit -->
                <button type="submit" disabled={submitting}
                    class="w-full py-3.5 rounded-xl font-black text-base transition-all
                        {submitting
                            ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white shadow-lg hover:shadow-red-500/25'}">
                    {#if submitting}
                        שולח קריאת עזרה...
                    {:else}
                        ✋ שלח קריאת עזרה לקהילה
                    {/if}
                </button>
            </form>
        </div>

        <div class="text-center mt-6">
            <a href="/" class="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                ← חזרה לדף הראשי
            </a>
        </div>
    </div>
</div>
