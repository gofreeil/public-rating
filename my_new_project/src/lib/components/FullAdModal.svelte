<script lang="ts">
    import { fade, scale } from "svelte/transition";
    import type { Ad } from "$lib/adsData";
    import { onMount } from "svelte";

    let { ad, onClose }: { ad: Ad; onClose: () => void } = $props();

    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let modalElement: HTMLDivElement;
    let closeButton: HTMLButtonElement;
    let previousFocus: HTMLElement | null = null;

    onMount(() => {
        // שמור את האלמנט שהיה בפוקוס לפני פתיחת החלון
        previousFocus = document.activeElement as HTMLElement;
        // העבר פוקוס לכפתור הסגירה
        closeButton?.focus();

        // Touch handlers (swipe to close)
        const handleTouchStart = (e: TouchEvent) => {
            startY = e.touches[0].clientY;
            isDragging = true;
        };
        const handleTouchMove = (e: TouchEvent) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            if (diff < 0 && modalElement) {
                modalElement.style.transform = `translateY(${diff}px) scale(0.9)`;
                modalElement.style.opacity = `${1 + diff / 300}`;
            }
        };
        const handleTouchEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            const diff = currentY - startY;
            if (diff < -100) {
                onClose();
            } else if (modalElement) {
                modalElement.style.transform = 'scale(0.9)';
                modalElement.style.opacity = '1';
            }
        };

        // Focus trap - מניעת יציאה מהחלון עם Tab
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
                return;
            }
            if (e.key !== 'Tab') return;

            const focusableSelectors =
                'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
            const focusableEls = Array.from(
                modalElement?.querySelectorAll(focusableSelectors) ?? []
            ) as HTMLElement[];
            if (focusableEls.length === 0) return;

            const first = focusableEls[0];
            const last = focusableEls[focusableEls.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('touchstart', handleTouchStart);
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            // החזר פוקוס לרכיב שפתח את החלון
            previousFocus?.focus();
        };
    });
</script>

<!-- Backdrop -->
<div
    class="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md"
    transition:fade
    onclick={onClose}
    aria-hidden="true"
></div>

<!-- Dialog -->
<div
    class="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
    transition:fade
>
    <div
        bind:this={modalElement}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-ad-title"
        class="pointer-events-auto bg-[#0f172a] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative"
        transition:scale={{ start: 0.9, duration: 300 }}
    >
        <!-- Close Button -->
        <button
            bind:this={closeButton}
            class="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            onclick={onClose}
            aria-label="סגור"
        >
            <span aria-hidden="true">✕</span>
        </button>

        <!-- Image -->
        <div class="h-64 overflow-hidden relative">
            <img
                src={ad.image}
                alt={ad.title}
                class="w-full h-full object-cover"
            />
            <div
                class="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent"
                aria-hidden="true"
            ></div>
        </div>

        <!-- Content -->
        <div class="p-8 text-center">
            <h2
                id="modal-ad-title"
                class="text-3xl font-black bg-gradient-to-r {ad.color} bg-clip-text text-transparent mb-4"
            >
                {ad.title}
            </h2>
            <p class="text-gray-300 text-lg mb-8 leading-relaxed">
                {ad.description}
            </p>

            <a
                href={ad.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="{ad.cta} – {ad.title} (נפתח בחלון חדש)"
                class="inline-block w-full py-4 px-8 rounded-2xl bg-gradient-to-r {ad.color} text-white font-black text-xl shadow-xl hover:scale-105 active:scale-95 transition-all shadow-blue-500/20"
            >
                {ad.cta}
            </a>
        </div>
    </div>
</div>
