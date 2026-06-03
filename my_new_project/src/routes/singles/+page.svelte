<script lang="ts">
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    type Gender = 'all' | 'male' | 'female';
    let filter = $state<Gender>('all');

    function getGender(extraFields: string): 'male' | 'female' {
        try {
            const ef = JSON.parse(extraFields);
            return ef.gender === 'male' ? 'male' : 'female';
        } catch { return 'male'; }
    }

    function getAge(extraFields: string): string {
        try { return JSON.parse(extraFields)?.age ?? ''; }
        catch { return ''; }
    }

    function getCity(extraFields: string): string {
        try { return JSON.parse(extraFields)?.city ?? ''; }
        catch { return ''; }
    }

    function getDescription(extraFields: string): string {
        try { return JSON.parse(extraFields)?.about ?? ''; }
        catch { return ''; }
    }

    function waLink(phone: string): string {
        const digits = phone.replace(/\D/g, '').replace(/^0/, '972');
        return `https://wa.me/${digits}`;
    }

    let filtered = $derived(
        filter === 'all'
            ? data.items
            : data.items.filter(i => getGender(i.extra_fields) === filter)
    );

    // Mock data for display
    const mockSingles = [
        { id: '1', label: 'דוד כ.', gender: 'male' as const, age: '28', city: 'ירושלים', description: 'סטודנט למדעי המחשב, אוהב טיולים ומוזיקה. מחפש בת זוג רצינית.', contact: 'דוד', phone: '050-1234567' },
        { id: '2', label: 'שרה מ.', gender: 'female' as const, age: '25', city: 'ירושלים', description: 'מורה לאנגלית, אוהבת ספרים ובישול. מחפשת בן זוג ירא שמיים.', contact: 'שרה', phone: '050-2345678' },
        { id: '3', label: 'יוסף ל.', gender: 'male' as const, age: '31', city: 'בני ברק', description: 'מהנדס תוכנה, בוגר ישיבה. מחפש בת זוג עם ערכים.', contact: 'יוסף', phone: '050-3456789' },
        { id: '4', label: 'רחל א.', gender: 'female' as const, age: '24', city: 'רמת גן', description: 'סטודנטית לעבודה סוציאלית, מתנדבת. מחפשת בן זוג רציני.', contact: 'רחל', phone: '050-4567890' },
        { id: '5', label: 'משה ד.', gender: 'male' as const, age: '29', city: 'ירושלים', description: 'עורך דין, אוהב ספורט ושיעורי תורה. מחפש את הבת זוג הנכונה.', contact: 'משה', phone: '050-5678901' },
        { id: '6', label: 'לאה ב.', gender: 'female' as const, age: '27', city: 'פתח תקווה', description: 'גרפיקאית, אוהבת אמנות ויצירה. מחפשת בן זוג עם חוש הומור.', contact: 'לאה', phone: '050-6789012' },
        { id: '7', label: 'אברהם ש.', gender: 'male' as const, age: '33', city: 'ירושלים', description: 'רואה חשבון, אוהב חסד ועזרה לזולת. מחפש בת זוג לבניין בית.', contact: 'אברהם', phone: '050-7890123' },
        { id: '8', label: 'מרים ג.', gender: 'female' as const, age: '26', city: 'ירושלים', description: 'אחות מוסמכת, אוהבת טבע וטיולים. מחפשת בן זוג אמיתי.', contact: 'מרים', phone: '050-8901234' },
    ];

    let filteredMock = $derived(
        filter === 'all'
            ? mockSingles
            : mockSingles.filter(s => s.gender === filter)
    );
</script>

<svelte:head>
    <title>לוח פנויים ופנויות | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-6">
            <span class="text-5xl mb-3 block">💑</span>
            <h1 class="text-3xl font-black text-white mb-2">לוח פנויים ופנויות</h1>
            <p class="text-gray-400">לוח ארצי - מציאת בן/בת זוג מכל רחבי הארץ</p>
        </div>

        <!-- Filter tabs -->
        <div class="flex justify-center gap-2 mb-6">
            <button
                onclick={() => filter = 'all'}
                class="px-5 py-2 rounded-full text-sm font-bold transition-all {filter === 'all' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
            >
                🌍 הכל
            </button>
            <button
                onclick={() => filter = 'male'}
                class="px-5 py-2 rounded-full text-sm font-bold transition-all {filter === 'male' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
            >
                👨 פנויים
            </button>
            <button
                onclick={() => filter = 'female'}
                class="px-5 py-2 rounded-full text-sm font-bold transition-all {filter === 'female' ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
            >
                👩 פנויות
            </button>
        </div>

        <!-- Add button -->
        <div class="flex justify-center mb-6">
            <a
                href="/singles/add"
                class="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold px-6 py-3 rounded-full shadow-lg hover:shadow-pink-500/25 transition-all hover:scale-105"
            >
                <span class="text-lg">💌</span>
                פרסם מודעה חדשה
            </a>
        </div>

        <!-- Counter -->
        <div class="text-center mb-6">
            <p class="text-gray-500 text-sm">💑 {filteredMock.length} פרופילים פעילים</p>
        </div>

        <!-- Cards grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each filteredMock as person}
                {@const isMale = person.gender === 'male'}
                <div class="rounded-2xl bg-[#0f172a] border {isMale ? 'border-blue-500/30' : 'border-pink-500/30'} overflow-hidden shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                    <!-- Card header -->
                    <div class="bg-gradient-to-r {isMale ? 'from-blue-600 to-cyan-600' : 'from-pink-600 to-rose-500'} p-4 flex items-center gap-3">
                        <div class="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
                            {isMale ? '👨' : '👩'}
                        </div>
                        <div>
                            <h3 class="text-white font-black text-lg">{person.label}</h3>
                            <div class="flex items-center gap-3 text-white/80 text-sm">
                                <span>🎂 {person.age}</span>
                                <span>📍 {person.city}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Card body -->
                    <div class="p-4">
                        <p class="text-gray-300 text-sm leading-relaxed mb-4">{person.description}</p>

                        <div class="flex gap-2">
                            <a
                                href={waLink(person.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="שלח הודעת וואטסאפ ל-{person.label} (נפתח בחלון חדש)"
                                class="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
                            >
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.03L.789 23.702l4.823-1.467A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.33 0-4.481-.76-6.234-2.048l-.447-.334-2.862.87.908-2.745-.367-.472A9.718 9.718 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
                                WhatsApp
                            </a>
                            <a
                                href="tel:{person.phone}"
                                class="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-sm"
                            >
                                📞 התקשר
                            </a>
                        </div>
                    </div>
                </div>
            {/each}
        </div>

        {#if filteredMock.length === 0}
            <div class="text-center py-16">
                <span class="text-5xl mb-4 block">💔</span>
                <p class="text-gray-400 text-lg">אין פרופילים בקטגוריה זו כרגע</p>
                <p class="text-gray-500 text-sm mt-2">היה הראשון לפרסם!</p>
            </div>
        {/if}

        <!-- Back link -->
        <div class="text-center mt-8">
            <a href="/" class="text-gray-500 hover:text-white transition-colors text-sm">← חזרה לדף הראשי</a>
        </div>
    </div>
</div>
