<script lang="ts">
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";

    const ads = [
        {
            text: "מעוניינים לפרסם כאן? צרו קשר עוד היום!",
            color: "from-blue-600 to-purple-600",
        },
        {
            text: "מבצע מיוחד לתושבי השכונה בחנות המכולת המרכזית",
            color: "from-green-600 to-emerald-600",
        },
        {
            text: "חדש! שירות בייביסיטר קהילתי מסובסד בשעות הערב",
            color: "from-orange-600 to-red-600",
        },
        {
            text: "הצטרפו לקבוצת הרכישה השכונתית וחסכו מאות שקלים",
            color: "from-purple-600 to-pink-600",
        },
    ];

    let currentIndex = $state(0);

    onMount(() => {
        const interval = setInterval(() => {
            currentIndex = (currentIndex + 1) % ads.length;
        }, 6000);

        return () => clearInterval(interval);
    });
</script>

<div
    class="w-full bg-[#0f172a] border-b border-white/5 md:hidden overflow-hidden h-10 flex items-center"
>
    <div class="relative w-full h-full flex items-center justify-center px-4">
        {#key currentIndex}
            <div
                in:fade={{ duration: 500 }}
                out:fade={{ duration: 500 }}
                class="absolute inset-0 flex items-center justify-center text-center"
            >
                <p
                    class="text-[13px] font-bold bg-gradient-to-r {ads[
                        currentIndex
                    ].color} bg-clip-text text-transparent px-4 truncate"
                >
                    {ads[currentIndex].text}
                </p>
            </div>
        {/key}
    </div>
</div>
