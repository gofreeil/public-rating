<script lang="ts">
    // שדות אנטי-בוט שקופים: שדה דבש שאדם לא רואה, וחותמת זמן ההצגה.
    // הבדיקה עצמה בשרת — ראו src/lib/server/rateLimit.ts
    import { onMount } from 'svelte';

    // ה-SSR לא יכול לחתום זמן אמיתי (הדף עשוי להיות מוגש מקאש), לכן
    // החותמת נכתבת בדפדפן ברגע ההצגה בפועל.
    let renderedAt = $state(0);
    onMount(() => {
        renderedAt = Date.now();
    });
</script>

<div aria-hidden="true" class="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0">
    <label>
        אל תמלאו שדה זה
        <input type="text" name="website" tabindex="-1" autocomplete="off" />
    </label>
</div>
<input type="hidden" name="rendered_at" value={renderedAt || ''} />
