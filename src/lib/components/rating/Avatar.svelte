<script lang="ts">
    // אווטאר ראשי-תיבות עם גרדיאנט דטרמיניסטי לפי השם (אין תמונות פנים בפלטפורמה)
    let { name = '', size = 56 }: { name?: string; size?: number } = $props();

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

<span
    class="inline-flex items-center justify-center rounded-full font-bold text-white select-none shrink-0"
    style="width:{size}px;height:{size}px;font-size:{size * 0.36}px;
           background:linear-gradient(135deg, hsl({hue} 65% 42%), hsl({hue + 40} 70% 30%));
           box-shadow: inset 0 -2px 6px rgba(0,0,0,.35);"
    aria-hidden="true"
>{initials}</span>
