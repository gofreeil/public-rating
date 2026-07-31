<script lang="ts">
    import Board from '$lib/components/rating/Board.svelte';
    import Seo from '$lib/components/rating/Seo.svelte';
    import { boardSchema, breadcrumbSchema } from '$lib/rating/schema';
    import { groupByKey } from '$lib/rating/types';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
    const group = groupByKey('knesset')!;

    const jsonLd = $derived([
        boardSchema(group, data.officials),
        breadcrumbSchema([
            { name: 'דירוג ציבורי', path: '/' },
            { name: group.title, path: group.route },
        ]),
    ]);
</script>

<Seo
    title="דירוג חברי כנסת ושרים"
    description="דרגו את חברי הכנסת והשרים: עמידה בזמנים ובתקנים, תרומה לעם, ראיית המציאות ושקיפות. דירוג ציבורי אמיתי מהאזרחים."
    {jsonLd}
/>

<div class="space-y-4 py-6">
    <Board {group} officials={data.officials} />
    <div class="text-center">
        <a href="/" class="text-sm text-blue-400 transition-colors hover:text-blue-300">← חזרה לדף הבית</a>
    </div>
</div>
