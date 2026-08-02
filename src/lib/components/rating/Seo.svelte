<script lang="ts">
    // תגי SEO / שיתוף לדף בודד — title, description, canonical, Open Graph, JSON-LD
    import { page } from '$app/state';
    import { DEFAULT_OG_IMAGE, SITE_NAME, absUrl, jsonLdScript, metaTrim } from '$lib/seo';

    let {
        title = '',
        description = '',
        image = DEFAULT_OG_IMAGE,
        imageWidth = 0,
        imageHeight = 0,
        type = 'website',
        noindex = false,
        jsonLd = null,
    }: {
        /** כותרת הדף בלי שם האתר (מתווסף אוטומטית) */
        title?: string;
        description?: string;
        image?: string;
        /** מידות התמונה — בלעדיהן וואטסאפ ופייסבוק נוטים להציג תצוגה מוקטנת */
        imageWidth?: number;
        imageHeight?: number;
        type?: string;
        /** דפים אישיים/ניהוליים — לא לאינדוקס */
        noindex?: boolean;
        /** אובייקט schema.org (או מערך) לתוצאות עשירות בגוגל */
        jsonLd?: unknown;
    } = $props();

    const fullTitle = $derived(title ? `${title} — ${SITE_NAME}` : SITE_NAME);
    const desc = $derived(metaTrim(description));
    const canonical = $derived(absUrl(page.url.pathname));
    const ogImage = $derived(absUrl(image));

    // הפיצול מונע מהפרסר לסגור את בלוק הסקריפט על הליטרל
    const CLOSE = '<' + '/script>';
    const ldTag = $derived(
        jsonLd ? `<script type="application/ld+json">${jsonLdScript(jsonLd)}${CLOSE}` : '',
    );
</script>

<svelte:head>
    <title>{fullTitle}</title>
    <meta name="description" content={desc} />
    <link rel="canonical" href={canonical} />
    {#if noindex}
        <meta name="robots" content="noindex, nofollow" />
    {/if}

    <meta property="og:site_name" content={SITE_NAME} />
    <meta property="og:locale" content="he_IL" />
    <meta property="og:type" content={type} />
    <meta property="og:title" content={fullTitle} />
    <meta property="og:description" content={desc} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={ogImage} />
    <meta property="og:image:alt" content={fullTitle} />
    {#if imageWidth > 0 && imageHeight > 0}
        <meta property="og:image:width" content={String(imageWidth)} />
        <meta property="og:image:height" content={String(imageHeight)} />
    {/if}

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={fullTitle} />
    <meta name="twitter:description" content={desc} />
    <meta name="twitter:image" content={ogImage} />

    {#if ldTag}
        {@html ldTag}
    {/if}
</svelte:head>
