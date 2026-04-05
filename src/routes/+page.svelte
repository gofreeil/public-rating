<div class="space-y-16 py-8">

    <!-- קומה ראשונה: נבחרי ציבור -->
    <section>
        <div class="text-center mb-8">
            <!-- תמונה מעל הכותרת -->
            <div class="flex justify-center mb-6">
                <div class="relative inline-block">
                    <img
                        src="/images/דירוג ציבורי.jpeg"
                        alt="דירוג ציבורי"
                        class="h-96 w-auto object-contain rounded-3xl"
                    />
                    <div class="absolute inset-0 rounded-3xl" style="box-shadow: inset 0 0 80px 40px #0f172a;"></div>
                </div>
            </div>
            <!-- כותרת -->
            <h2 class="text-3xl md:text-4xl font-black text-white mb-3">
                נבחרי הציבור המדורגים ביותר
            </h2>
            <p class="text-amber-400 text-lg font-bold">
                מיועדים לפרס השנה עבור פעילותם לטובת העם
            </p>
        </div>

        <div class="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                {#each [1,2,3,4,5] as i}
                    <div class="flex flex-col items-center gap-3">
                        <div class="w-20 h-20 rounded-full bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center text-gray-500 text-3xl">
                            👤
                        </div>
                        <p class="text-gray-400 text-sm font-bold">נבחר ציבור #{i}</p>
                        <div class="flex gap-0.5 text-amber-400 text-lg">★★★★★</div>
                        <p class="text-gray-500 text-xs">טרם דורג</p>
                    </div>
                {/each}
            </div>
        </div>
        <div class="text-center mt-4">
            <a href="/top-rated" class="text-blue-400 hover:text-blue-300 text-sm font-bold transition-colors">לדף המלא ←</a>
        </div>
    </section>

    <!-- קומה שנייה: דירוג חברי כנסת -->
    <section>
        <div class="text-center mb-8">
            <h2 class="text-3xl md:text-4xl font-black text-white mb-3">
                דירוג חברי כנסת
            </h2>
        </div>

        <div class="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                {#each [1,2,3,4,5] as i}
                    <div class="flex flex-col items-center gap-3">
                        <div class="w-20 h-20 rounded-full bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center text-gray-500 text-3xl">
                            👤
                        </div>
                        <p class="text-gray-400 text-sm font-bold">חבר כנסת #{i}</p>
                        <div class="flex gap-0.5 text-amber-400 text-lg">★★★★★</div>
                        <p class="text-gray-500 text-xs">טרם דורג</p>
                    </div>
                {/each}
            </div>
        </div>
        <div class="text-center mt-4">
            <a href="/knesset" class="text-blue-400 hover:text-blue-300 text-sm font-bold transition-colors">לדף המלא ←</a>
        </div>
    </section>

    <!-- קומה שלישית: דירוג שופטים -->
    <section>
        <div class="text-center mb-8">
            <h2 class="text-3xl md:text-4xl font-black text-white mb-3">
                דירוג שופטים
            </h2>
        </div>

        <div class="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                {#each [1,2,3,4,5] as i}
                    <div class="flex flex-col items-center gap-3">
                        <div class="w-20 h-20 rounded-full bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center text-gray-500 text-3xl">
                            👤
                        </div>
                        <p class="text-gray-400 text-sm font-bold">שופט #{i}</p>
                        <div class="flex gap-0.5 text-amber-400 text-lg">★★★★★</div>
                        <p class="text-gray-500 text-xs">טרם דורג</p>
                    </div>
                {/each}
            </div>
        </div>
        <div class="text-center mt-4">
            <a href="/judges" class="text-blue-400 hover:text-blue-300 text-sm font-bold transition-colors">לדף המלא ←</a>
        </div>
    </section>

    <!-- קומה רביעית: דירוג עובדי ציבור -->
    <section>
        <div class="text-center mb-8">
            <h2 class="text-3xl md:text-4xl font-black text-white mb-3">
                דירוג עובדי ציבור
            </h2>
        </div>

        <div class="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                {#each [1,2,3,4,5] as i}
                    <div class="flex flex-col items-center gap-3">
                        <div class="w-20 h-20 rounded-full bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center text-gray-500 text-3xl">
                            👤
                        </div>
                        <p class="text-gray-400 text-sm font-bold">עובד ציבור #{i}</p>
                        <div class="flex gap-0.5 text-amber-400 text-lg">★★★★★</div>
                        <p class="text-gray-500 text-xs">טרם דורג</p>
                    </div>
                {/each}
            </div>
        </div>
        <div class="text-center mt-4">
            <a href="/public-servants" class="text-blue-400 hover:text-blue-300 text-sm font-bold transition-colors">לדף המלא ←</a>
        </div>
    </section>

</div>
