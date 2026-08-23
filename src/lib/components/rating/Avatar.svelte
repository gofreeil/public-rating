<script lang="ts">
    // אווטאר: תמונת פנים אמיתית כשקיימת (extra_fields.image), אחרת ראשי-תיבות עם גרדיאנט דטרמיניסטי
    // mdSize — גודל מוגדל בדסקטופ (מ-md ומעלה); ברירת מחדל: אותו גודל כמו במובייל
    let {
        name = '',
        size = 56,
        mdSize = 0,
        image = ''
    }: { name?: string; size?: number; mdSize?: number; image?: string } = $props();

    const lgSize = $derived(mdSize || size);

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

    const vars = $derived(
        `--av:${size}px;--av-md:${lgSize}px;--av-fs:${size * 0.36}px;--av-fs-md:${lgSize * 0.36}px;`
    );
</script>

{#if showImage}
    <img
        src={image}
        alt=""
        loading="lazy"
        referrerpolicy="no-referrer"
        class="avatar rounded-full border border-white/15 bg-white/10 object-cover object-top shrink-0 select-none"
        style={vars}
        onerror={() => (failedSrc = image)}
        aria-hidden="true"
    />
{:else}
    <span
        class="avatar inline-flex items-center justify-center rounded-full font-bold text-white shrink-0 select-none"
        style="{vars}
               background:linear-gradient(135deg, hsl({hue} 65% 42%), hsl({hue + 40} 70% 30%));
               box-shadow: inset 0 -2px 6px rgba(0,0,0,.35);"
        aria-hidden="true"
    >{initials}</span>
{/if}

<style>
    .avatar {
        width: var(--av);
        height: var(--av);
        font-size: var(--av-fs);
    }
    @media (min-width: 768px) {
        .avatar {
            width: var(--av-md);
            height: var(--av-md);
            font-size: var(--av-fs-md);
        }
    }
</style>
