<script lang="ts">
    // ============================================================
    // AdCardPreview — עותק סטטי של כרטיס הפרסומת מהטור הימני באתר,
    // בלי קישור, בלי סבב ובלי דהיית-ריחוף. משמש את מסך הניהול לתצוגה
    // מקדימה: ריחוף על כותרת מודעה שעל האוויר (דסקטופ) או הקשה עליה
    // (נייד). זה אותו רכיב AdCard של הטור — מה שרואים כאן הוא בדיוק מה
    // שמוצג על האתר.
    // ============================================================
    import AdCard from '$lib/components/rating/AdCard.svelte';

    interface PreviewAd {
        title: string;
        subtitle?: string;
        cta?: string;
        gradientId?: string;
        logo?: string;
        mainImage?: string;
        mainImageFit?: unknown;
        adStyle?: unknown;
        shop?: boolean;
    }

    let { ad }: { ad: PreviewAd } = $props();
</script>

<!-- אותו רוחב של המשבצת בטור: w-36 -->
<div class="w-36">
    <AdCard {ad} still />
</div>
