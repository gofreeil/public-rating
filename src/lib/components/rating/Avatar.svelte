<script lang="ts">
    // אווטאר: תמונת פנים אמיתית כשקיימת (extra_fields.image), אחרת ראשי-תיבות עם גרדיאנט דטרמיניסטי
    let { name = '', size = 56, image = '' }: { name?: string; size?: number; image?: string } = $props();

    // כשל טעינה (קישור מת/חסום) → נופלים לראשי-תיבות; מתאפס כשמגיעה תמונה אחרת
    let failedSrc = $state('');
    const showImage = $derived(!!image && failedSrc !== image);

    const initials = $derived.by(() => {
        const words = (name || '').trim().split(/\s+/).filter(Boolean);
        if (!words.length) return '?';
        if (words.length === 1) return words[0].slice(0, 2);
        return words[0][0] + words[words.length - 1][0];
    });

    const HUES = [212, 262, 292, 322, 190, 160, 24, 244];
    const hue = $derived.by(() => {
        let h = 0;
        for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997;
        return HUES[h % HUES.length];
    });
</script>

{#if showImage}
    <img
        src={image}
        alt=""
        loading="lazy"
        referrerpolicy="no-referrer"
        class="rounded-full object-cover object-top select-none shrink-0 border border-white/15 bg-white/10"
        style="width:{size}px;height:{size}px;"
        onerror={() => (failedSrc = image)}
        aria-hidden="true"
    />
{:else}
    <span
        class="inline-flex items-center justify-center rounded-full font-bold text-white select-none shrink-0"
        style="width:{size}px;height:{size}px;font-size:{size * 0.36}px;
               background:linear-gradient(135deg, hsl({hue} 65% 42%), hsl({hue + 40} 70% 30%));
               box-shadow: inset 0 -2px 6px rgba(0,0,0,.35);"
        aria-hidden="true"
    >{initials}</span>
{/if}
