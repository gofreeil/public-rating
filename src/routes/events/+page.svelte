<script lang="ts">
    let today = new Date();
    let currentMonth = $state(today.getMonth());
    let currentYear  = $state(today.getFullYear());

    // Mock events data (later will come from server)
    const events = [
        { date: '2026-03-15', title: 'ערב שירה קהילתי', icon: '🎤', time: '20:00', location: 'בית הכנסת הגדול', color: 'green' },
        { date: '2026-03-18', title: 'יום משפחה בפארק', icon: '👨‍👩‍👧', time: '10:00–14:00', location: 'פארק השעשועים', color: 'blue' },
        { date: '2026-03-22', title: 'הרצאה: מיצוי זכויות', icon: '📚', time: '19:30', location: 'מרכז קהילתי - זום', color: 'purple' },
        { date: '2026-03-28', title: 'סדנת גינון עירוני', icon: '🌱', time: '09:00', location: 'גינת השכונה', color: 'orange' },
        { date: '2026-04-02', title: 'ניקיון שכונתי', icon: '🧹', time: '08:00', location: 'רחבת הכניסה', color: 'teal' },
        { date: '2026-04-10', title: 'שוק קהילתי', icon: '🛍️', time: '16:00–20:00', location: 'רחוב הראשי', color: 'pink' },
        { date: '2026-04-15', title: 'ערב טריוויה', icon: '🧠', time: '20:30', location: 'מועדון הנוער', color: 'yellow' },
    ];

    const hebrewMonths = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    const hebrewDays  = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

    function getDaysInMonth(month: number, year: number): number {
        return new Date(year, month + 1, 0).getDate();
    }

    function getFirstDayOfMonth(month: number, year: number): number {
        return new Date(year, month, 1).getDay();
    }

    let calendarDays = $derived.by(() => {
        const daysInMonth = getDaysInMonth(currentMonth, currentYear);
        const firstDay    = getFirstDayOfMonth(currentMonth, currentYear);
        const days: (number | null)[] = [];

        // Fill empty slots before first day
        for (let i = 0; i < firstDay; i++) days.push(null);
        // Fill actual days
        for (let d = 1; d <= daysInMonth; d++) days.push(d);

        return days;
    });

    function getEventsForDay(day: number) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return events.filter(e => e.date === dateStr);
    }

    function isToday(day: number): boolean {
        return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
    }

    function prevMonth() {
        if (currentMonth === 0) { currentMonth = 11; currentYear--; }
        else currentMonth--;
    }

    function nextMonth() {
        if (currentMonth === 11) { currentMonth = 0; currentYear++; }
        else currentMonth++;
    }

    let selectedEvent = $state<typeof events[0] | null>(null);

    // Upcoming events for the list view
    let upcomingEvents = $derived(
        events
            .filter(e => new Date(e.date) >= new Date(today.toDateString()))
            .sort((a, b) => a.date.localeCompare(b.date))
    );

    const colorMap: Record<string, string> = {
        green:  'bg-green-600/20 border-green-500/30 text-green-400',
        blue:   'bg-blue-600/20 border-blue-500/30 text-blue-400',
        purple: 'bg-purple-600/20 border-purple-500/30 text-purple-400',
        orange: 'bg-orange-600/20 border-orange-500/30 text-orange-400',
        teal:   'bg-teal-600/20 border-teal-500/30 text-teal-400',
        pink:   'bg-pink-600/20 border-pink-500/30 text-pink-400',
        yellow: 'bg-yellow-600/20 border-yellow-500/30 text-yellow-400',
    };

    function formatEventDate(dateStr: string): string {
        const d = new Date(dateStr);
        return `${d.getDate()} ${hebrewMonths[d.getMonth()]}`;
    }
</script>

<svelte:head>
    <title>לוח אירועים - קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] py-6 md:py-12 px-4">
    <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-8">
            <a href="/" class="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block transition-colors">→ חזרה לעמוד הראשי</a>
            <h1 class="text-3xl md:text-5xl font-black bg-gradient-to-r from-green-400 via-teal-400 to-blue-400 bg-clip-text text-transparent">
                🗓️ לוח אירועים קהילתי
            </h1>
            <p class="text-gray-400 mt-2 text-sm md:text-base">כל האירועים והמפגשים בשכונה במקום אחד</p>
        </div>

        <div class="flex flex-col lg:flex-row gap-6">
            <!-- Calendar Grid -->
            <div class="lg:w-2/3">
                <div class="rounded-2xl md:rounded-3xl bg-[#0f172a] border md:border-2 border-green-500/30 overflow-hidden shadow-2xl">
                    <!-- Month Navigation -->
                    <div class="bg-gradient-to-r from-green-600 to-teal-600 p-4 flex items-center justify-between">
                        <button onclick={nextMonth} aria-label="חודש הבא" class="text-white hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors font-bold text-lg">
                            <span aria-hidden="true">←</span>
                        </button>
                        <h2 id="calendar-title" class="text-xl md:text-2xl font-bold text-white">
                            {hebrewMonths[currentMonth]} {currentYear}
                        </h2>
                        <button onclick={prevMonth} aria-label="חודש קודם" class="text-white hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors font-bold text-lg">
                            <span aria-hidden="true">→</span>
                        </button>
                    </div>

                    <div class="p-3 md:p-5">
                        <!-- Day Headers -->
                        <div class="grid grid-cols-7 gap-1 mb-2">
                            {#each hebrewDays as day}
                                <div class="text-center text-xs md:text-sm font-bold text-gray-400 py-2">
                                    {day}
                                </div>
                            {/each}
                        </div>

                        <!-- Calendar Grid -->
                        <div class="grid grid-cols-7 gap-1" role="grid" aria-labelledby="calendar-title">
                            {#each calendarDays as day}
                                {#if day === null}
                                    <div class="aspect-square" role="gridcell" aria-label=" "></div>
                                {:else}
                                    {@const dayEvents = getEventsForDay(day)}
                                    <button
                                        role="gridcell"
                                        aria-label="{day} {hebrewMonths[currentMonth]}{dayEvents.length > 0 ? ' – ' + dayEvents.length + ' אירועים' : ''}{isToday(day) ? ' (היום)' : ''}"
                                        class="aspect-square rounded-xl border transition-all flex flex-col items-center justify-center gap-0.5 relative
                                            {isToday(day) ? 'bg-green-600/30 border-green-500/50 ring-2 ring-green-400/50' : 'border-white/5 hover:border-white/20 hover:bg-white/5'}
                                            {dayEvents.length > 0 ? 'cursor-pointer' : 'cursor-default'}"
                                        onclick={() => { if (dayEvents.length > 0) selectedEvent = dayEvents[0]; }}
                                    >
                                        <span class="text-sm md:text-base font-bold {isToday(day) ? 'text-green-300' : 'text-white/80'}" aria-hidden="true">
                                            {day}
                                        </span>
                                        {#if dayEvents.length > 0}
                                            <div class="flex gap-0.5" aria-hidden="true">
                                                {#each dayEvents as _ev}
                                                    <span class="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-400"></span>
                                                {/each}
                                            </div>
                                            <!-- Desktop: show event title -->
                                            <span class="hidden md:block text-[9px] text-green-300/70 leading-tight text-center truncate w-full px-1" aria-hidden="true">
                                                {dayEvents[0].icon} {dayEvents[0].title.slice(0, 12)}
                                            </span>
                                        {/if}
                                    </button>
                                {/if}
                            {/each}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Upcoming Events List -->
            <div class="lg:w-1/3">
                <div class="rounded-2xl md:rounded-3xl bg-[#0f172a] border md:border-2 border-green-500/30 overflow-hidden shadow-2xl">
                    <div class="bg-gradient-to-r from-teal-600 to-green-600 p-4">
                        <h3 class="text-lg font-bold text-white flex items-center gap-2">
                            📋 אירועים קרובים
                        </h3>
                    </div>
                    <div class="p-4 flex flex-col gap-3 max-h-[500px] overflow-y-auto">
                        {#each upcomingEvents as event}
                            <button
                                class="flex gap-3 items-start rounded-xl p-3 border transition-all text-right w-full
                                    {colorMap[event.color] ?? colorMap.green}
                                    {selectedEvent === event ? 'ring-2 ring-white/30 scale-[1.02]' : 'hover:scale-[1.01]'}"
                                onclick={() => selectedEvent = event}
                            >
                                <div class="text-2xl flex-shrink-0">{event.icon}</div>
                                <div class="min-w-0 flex-1">
                                    <p class="text-white text-sm font-bold leading-tight">{event.title}</p>
                                    <p class="text-gray-400 text-xs mt-1">📅 {formatEventDate(event.date)} · {event.time}</p>
                                    <p class="text-gray-500 text-xs mt-0.5">📍 {event.location}</p>
                                </div>
                            </button>
                        {/each}

                        {#if upcomingEvents.length === 0}
                            <p class="text-center text-gray-500 py-8">אין אירועים קרובים</p>
                        {/if}
                    </div>
                </div>

                <!-- Add Event CTA -->
                <div class="mt-4 rounded-2xl bg-gradient-to-r from-green-600/20 to-teal-600/20 border border-green-500/30 p-4 text-center">
                    <p class="text-white font-bold text-sm mb-2">רוצה להוסיף אירוע?</p>
                    <p class="text-gray-400 text-xs mb-3">שתף את הקהילה באירועים ומפגשים בשכונה</p>
                    <button class="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold px-6 py-2 rounded-full text-sm transition-all hover:scale-105 shadow-lg">
                        + הוסף אירוע
                    </button>
                </div>
            </div>
        </div>

        <!-- Selected Event Detail -->
        {#if selectedEvent}
            <div class="mt-6 rounded-2xl md:rounded-3xl bg-[#0f172a] border md:border-2 border-green-500/30 overflow-hidden shadow-2xl">
                <div class="bg-gradient-to-r from-green-600 to-teal-600 p-4 flex items-center justify-between">
                    <h3 class="text-lg font-bold text-white flex items-center gap-2">
                        {selectedEvent.icon} {selectedEvent.title}
                    </h3>
                    <button
                        onclick={() => selectedEvent = null}
                        class="text-white/70 hover:text-white text-xl font-bold transition-colors"
                    >
                        ✕
                    </button>
                </div>
                <div class="p-6 flex flex-col md:flex-row gap-6">
                    <div class="flex-1 space-y-3">
                        <div class="flex items-center gap-2 text-gray-300">
                            <span class="text-lg">📅</span>
                            <span class="font-bold">{formatEventDate(selectedEvent.date)}</span>
                        </div>
                        <div class="flex items-center gap-2 text-gray-300">
                            <span class="text-lg">🕐</span>
                            <span>{selectedEvent.time}</span>
                        </div>
                        <div class="flex items-center gap-2 text-gray-300">
                            <span class="text-lg">📍</span>
                            <span>{selectedEvent.location}</span>
                        </div>
                    </div>
                    <div class="flex gap-3">
                        <button class="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all hover:scale-105">
                            אני מגיע! ✓
                        </button>
                        <button class="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all border border-white/20">
                            שתף
                        </button>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>
