<script lang="ts">
    // כפתור "צלם עכשיו" לשימוש חוזר בכל טופס שיש בו העלאת תמונה.
    //
    // התנהגות:
    //   • נייד/טאבלט (pointer: coarse) — פותח את אפליקציית המצלמה של המכשיר דרך
    //     <input type="file" capture="environment">. זו החוויה הטובה ביותר: רזולוציה
    //     מלאה, פוקוס, פלאש, מצלמה קדמית/אחורית — הכל של מערכת ההפעלה.
    //   • דסקטופ — הדפדפן מתעלם מ-capture, ולכן נפתח מודל תצוגה חיה עם getUserMedia
    //     וכפתור צילום.
    //
    // הרכיב לא נוגע בתמונה עצמה: הוא רק מחזיר File[] ל-onfiles — בדיוק אותו handler
    // שהטופס כבר משתמש בו להעלאה מהמכשיר (דחיסה/קרופ/base64 נשארים איפה שהם).
    //
    // שימוש:
    //   <CameraCapture onfiles={processFile} />
    //   <CameraCapture onfiles={handleFiles} multiple compact />

    import { _ } from 'svelte-i18n';
    import { onDestroy } from 'svelte';

    let {
        onfiles,
        multiple = false,
        compact = false,
        class: className = ''
    }: {
        onfiles: (files: File[]) => void | Promise<void>;
        multiple?: boolean;
        compact?: boolean;
        class?: string;
    } = $props();

    let fileInput = $state<HTMLInputElement | null>(null);
    let videoEl = $state<HTMLVideoElement | null>(null);

    let modalOpen = $state(false);
    let starting = $state(false);
    let camError = $state('');
    let facing = $state<'environment' | 'user'>('environment');
    let hasMultipleCams = $state(false);
    let stream: MediaStream | null = null;

    function isTouchDevice() {
        return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
    }

    function handleChange(e: Event) {
        const input = e.target as HTMLInputElement;
        const files = Array.from(input.files ?? []).filter((f) => f.type.startsWith('image/'));
        input.value = '';
        if (files.length) onfiles(files);
    }

    function open() {
        // בנייד — ישר למצלמה של המכשיר
        if (isTouchDevice() || !navigator.mediaDevices?.getUserMedia) {
            fileInput?.click();
            return;
        }
        camError = '';
        modalOpen = true;
    }

    // מפעיל את הזרם ברגע שה-<video> קיים ב-DOM (וגם אחרי החלפת מצלמה)
    $effect(() => {
        if (!modalOpen || !videoEl) return;
        const el = videoEl;
        const want = facing;
        let cancelled = false;

        (async () => {
            starting = true;
            camError = '';
            stopStream();
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: want, width: { ideal: 1920 }, height: { ideal: 1440 } },
                    audio: false
                });
                if (cancelled) { stopStream(); return; }
                el.srcObject = stream;
                await el.play();
                const devices = await navigator.mediaDevices.enumerateDevices();
                hasMultipleCams = devices.filter((d) => d.kind === 'videoinput').length > 1;
            } catch {
                if (!cancelled) camError = $_('components.cam_no_access');
            } finally {
                if (!cancelled) starting = false;
            }
        })();

        return () => { cancelled = true; };
    });

    function stopStream() {
        stream?.getTracks().forEach((t) => t.stop());
        stream = null;
    }

    function close() {
        modalOpen = false;
        starting = false;
        stopStream();
    }

    function shoot() {
        if (!videoEl || !videoEl.videoWidth) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        canvas.getContext('2d')!.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
            (blob) => {
                if (!blob) return;
                const file = new File([blob], `camera-${canvas.width}x${canvas.height}.jpg`, {
                    type: 'image/jpeg'
                });
                close();
                onfiles([file]);
            },
            'image/jpeg',
            0.92
        );
    }

    onDestroy(stopStream);
</script>

<button
    type="button"
    onclick={open}
    aria-label={$_('components.cam_open_aria')}
    class={className ||
        'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 hover:border-blue-500/50 bg-white/5 hover:bg-blue-900/15 text-gray-300 hover:text-white text-sm font-bold transition-all cursor-pointer'}
>
    <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.7a1 1 0 0 0 .83-.45l.94-1.4A1 1 0 0 1 9.8 3.7h4.4a1 1 0 0 1 .83.45l.94 1.4a1 1 0 0 0 .83.45h1.7A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
        <circle cx="12" cy="12.5" r="3.5" />
    </svg>
    {#if !compact}<span>{$_('components.cam_take_photo')}</span>{/if}
</button>

<input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    capture="environment"
    {multiple}
    class="hidden"
    onchange={handleChange}
/>

{#if modalOpen}
    <!-- מודל צילום לדסקטופ -->
    <div
        class="fixed inset-0 z-[999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label={$_('components.cam_title')}
    >
        <div class="w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div class="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <h3 class="text-white font-bold text-sm">📷 {$_('components.cam_title')}</h3>
                <button
                    type="button"
                    onclick={close}
                    aria-label={$_('components.cam_cancel')}
                    class="w-8 h-8 rounded-full bg-white/5 hover:bg-red-600 text-gray-300 hover:text-white text-sm flex items-center justify-center transition-colors cursor-pointer"
                >✕</button>
            </div>

            <div class="relative bg-black aspect-video flex items-center justify-center">
                <!-- svelte-ignore a11y_media_has_caption -->
                <video bind:this={videoEl} playsinline muted class="w-full h-full object-contain"></video>
                {#if starting}
                    <p class="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                        {$_('components.cam_starting')}
                    </p>
                {/if}
                {#if camError}
                    <p class="absolute inset-0 flex items-center justify-center text-center px-6 text-red-300 text-sm">
                        {camError}
                    </p>
                {/if}
            </div>

            <div class="flex items-center justify-center gap-3 px-4 py-4">
                <button
                    type="button"
                    onclick={close}
                    class="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-bold transition-colors cursor-pointer"
                >{$_('components.cam_cancel')}</button>

                {#if hasMultipleCams && !camError}
                    <button
                        type="button"
                        onclick={() => (facing = facing === 'environment' ? 'user' : 'environment')}
                        class="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-bold transition-colors cursor-pointer"
                    >🔄 {$_('components.cam_switch')}</button>
                {/if}

                <button
                    type="button"
                    onclick={shoot}
                    disabled={starting || !!camError}
                    aria-label={$_('components.cam_shutter_aria')}
                    class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-all cursor-pointer"
                >📸 {$_('components.cam_shutter')}</button>
            </div>
        </div>
    </div>
{/if}
