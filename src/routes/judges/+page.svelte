<script lang="ts">
    import Board from '$lib/components/rating/Board.svelte';
    import { groupByKey } from '$lib/rating/types';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
    const group = groupByKey('judges')!;
</script>

<svelte:head>
    <title>דירוג שופטים — דירוג ציבורי</title>
    <meta
        name="description"
        content="דרגו את שופטי ישראל: זמני טיפול, הגינות דיונית, חזון ושקיפות. דירוג ציבורי אמיתי מהאזרחים."
    />
</svelte:head>

<div class="space-y-4 py-6">
    <Board {group} officials={data.officials} />
    <div class="text-center">
        <a href="/" class="text-sm text-blue-400 transition-colors hover:text-blue-300">← חזרה לדף הבית</a>
    </div>
</div>
