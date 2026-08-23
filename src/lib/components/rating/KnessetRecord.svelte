<script lang="ts">
    // רזומה פרלמנטרית מהקדנציה — ספירות מה-OData הרשמי של הכנסת בלבד.
    // אין כאן ציון ואין פרשנות: המספרים הם החומר שהמדרג/ת שופט/ת לפיו.
    import type { KnessetRecord } from '$lib/rating/types';
    import { absDate } from '$lib/rating/time';

    let { record, name }: { record: KnessetRecord; name: string } = $props();

    /** "15.11.2022" — תאריך יום בלבד, בלי שעה */
    function day(iso: string): string {
        const t = new Date(iso);
        if (!Number.isFinite(t.getTime())) return '';
        return t.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });
    }

    /** [17,18,20,21,22] → "17, 18, 20–22" */
    function knessetRanges(nums: number[]): string {
        const sorted = [...nums].sort((a, b) => a - b);
        const parts: string[] = [];
        let i = 0;
        while (i < sorted.length) {
            let j = i;
            while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
            parts.push(j > i + 1 ? `${sorted[i]}–${sorted[j]}` : sorted.slice(i, j + 1).join(', '));
            i = j + 1;
        }
        return parts.join(', ');
    }

    /**
     * ח"כ שנכנס, פרש וחזר (חוק הנורבגי) מופיע בכנסת כמה שורות באותו תפקיד.
     * לתצוגה מאחדים לשורה אחת: הכניסה המוקדמת ביותר, והסיום רק אם כל
     * הכהונות הסתיימו.
     */
    const roles = $derived.by(() => {
        const merged = new Map<string, { title: string; from: string; to: string | null }>();
        for (const r of record.roles) {
            const prev = merged.get(r.title);
            if (!prev) merged.set(r.title, { ...r });
            else {
                if (r.from < prev.from) prev.from = r.from;
                prev.to = prev.to && r.to ? (r.to > prev.to ? r.to : prev.to) : null;
            }
        }
        return [...merged.values()].sort((a, b) => a.from.localeCompare(b.from));
    });

    const seniority = $derived(record.knessets.length);
    const bills = $derived(record.bills);
    const mq = $derived(record.ministry_queries);

    /** "הצעת חוק X (תיקון — ...), התשפ"ה-2025" → מוצג כמו שהוא, רק בלי רווחים כפולים */
    const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

    // מוצג רק מה שיש בו נתון — לשר בלי חקיקה פרטית אין "0 מכל דבר"
    const hasBills = $derived(bills.lead > 0 || bills.cosigned > 0);
    const hasOversight = $derived(record.queries > 0 || record.agenda > 0);

    const billChips = $derived(
        [
            { label: 'עברו קריאה שלישית', n: bills.passed, cls: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' },
            { label: 'בהליכי חקיקה', n: bills.in_progress, cls: 'border-blue-400/30 bg-blue-500/10 text-blue-300' },
            { label: 'נעצרו או נדחו', n: bills.stopped, cls: 'border-white/10 bg-white/5 text-gray-400' },
            { label: 'מוזגו עם הצעה אחרת', n: bills.merged, cls: 'border-white/10 bg-white/5 text-gray-400' },
        ].filter((c) => c.n > 0),
    );
</script>

<section class="rounded-2xl border border-white/10 bg-white/5 p-4">
    <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 class="text-lg font-bold text-white">🏛️ הרזומה בכנסת ה-{record.knesset_num}</h2>
        <span class="text-xs text-gray-500">מהמאגר הרשמי של הכנסת (OData)</span>
    </div>

    <div class="flex flex-col gap-3">
        <!-- ותק וציר התפקידים בקדנציה -->
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {#if seniority}
                <span
                    title="הכנסות שבהן כיהן/ה: {knessetRanges(record.knessets)}"
                    class="font-bold text-amber-300"
                >🎖️ {seniority === 1 ? 'קדנציה ראשונה' : `${seniority} קדנציות`} · כנסות {knessetRanges(record.knessets)}</span>
            {/if}
            {#each roles as role, i (role.title)}
                {#if seniority || i > 0}<span aria-hidden="true" class="text-white/25">|</span>{/if}
                <span class="text-gray-300">
                    {role.title}
                    <span class="text-gray-500">
                        מ־{day(role.from)}{#if role.to} עד {day(role.to)}{/if}
                    </span>
                </span>
            {/each}
        </div>

        <!-- חקיקה -->
        {#if hasBills}
            <div class="border-t border-white/10 pt-3">
                <h3 class="mb-2 text-sm font-bold text-white">
                    📝 חקיקה
                    <span class="font-normal text-gray-400">
                        · {bills.lead} הצעות חוק כיוזם/ת ראשי/ת{#if bills.cosigned}, ועוד {bills.cosigned} כחתום/ה{/if}
                    </span>
                </h3>
                <div class="flex flex-wrap items-center gap-2">
                    {#each billChips as chip (chip.label)}
                        <span class="rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums {chip.cls}">
                            {chip.n} {chip.label}
                        </span>
                    {/each}
                </div>

                <!-- החוקים שעברו: ההישג הקונקרטי, פתוח כברירת מחדל -->
                {#if record.passed_bills.length}
                    <details open class="mt-3">
                        <summary class="cursor-pointer text-sm font-bold text-emerald-300 marker:text-emerald-400">
                            ✅ חוקים שהתקבלו ({record.passed_bills.length})
                        </summary>
                        <ul class="mt-2 flex flex-col gap-1.5 border-r-2 border-emerald-400/20 pr-3">
                            {#each record.passed_bills as b (b.name)}
                                <li class="text-sm leading-relaxed text-gray-300">
                                    {clean(b.name)}
                                    {#if b.date}<span class="text-xs text-gray-500"> · פורסם {day(b.date)}</span>{/if}
                                </li>
                            {/each}
                        </ul>
                    </details>
                {/if}

                <!-- מה שנמצא כרגע על שולחן הכנסת -->
                {#if record.active_bills.length}
                    <details class="mt-2">
                        <summary class="cursor-pointer text-sm font-bold text-blue-300 marker:text-blue-400">
                            🔵 הצעות בהליכי חקיקה ({bills.in_progress}{#if bills.in_progress > record.active_bills.length}, מוצגות {record.active_bills.length} האחרונות{/if})
                        </summary>
                        <ul class="mt-2 flex flex-col gap-1.5 border-r-2 border-blue-400/20 pr-3">
                            {#each record.active_bills as b (b.name)}
                                <li class="text-sm leading-relaxed text-gray-300">
                                    {clean(b.name)}
                                    {#if b.status}<span class="text-xs text-gray-500"> · {b.status}</span>{/if}
                                </li>
                            {/each}
                        </ul>
                    </details>
                {/if}
            </div>
        {:else}
            <div class="border-t border-white/10 pt-3">
                <p class="text-sm text-gray-400">
                    📝 לא נרשמו הצעות חוק ביוזמת {name} בכנסת ה-{record.knesset_num}.
                </p>
            </div>
        {/if}

        <!-- פיקוח פרלמנטרי -->
        {#if hasOversight}
            <div class="border-t border-white/10 pt-3">
                <h3 class="mb-2 text-sm font-bold text-white">🔍 פיקוח פרלמנטרי</h3>
                <div class="flex flex-wrap items-center gap-2">
                    {#if record.queries}
                        <span
                            title="שאילתות שהוגשו לשרי הממשלה"
                            class="rounded-full border border-purple-400/30 bg-purple-500/10 px-2.5 py-1 text-xs font-bold text-purple-300 tabular-nums"
                        >{record.queries} שאילתות</span>
                    {/if}
                    {#if record.agenda}
                        <span
                            title="הצעות לסדר היום שהוגשו למליאה"
                            class="rounded-full border border-purple-400/30 bg-purple-500/10 px-2.5 py-1 text-xs font-bold text-purple-300 tabular-nums"
                        >{record.agenda} הצעות לסדר היום</span>
                    {/if}
                </div>

                {#if record.recent_queries.length}
                    <details class="mt-2">
                        <summary class="cursor-pointer text-sm font-bold text-purple-300 marker:text-purple-400">
                            ❓ נושאי השאילתות ({record.queries}{#if record.queries > record.recent_queries.length}, מוצגות {record.recent_queries.length} האחרונות{/if})
                        </summary>
                        <ul class="mt-2 flex flex-col gap-1.5 border-r-2 border-purple-400/20 pr-3">
                            {#each record.recent_queries as q (q.name + q.submitted)}
                                <li class="text-sm leading-relaxed text-gray-300">
                                    {clean(q.name)}
                                    <span class="text-xs text-gray-500">
                                        · הוגשה {day(q.submitted)}
                                        {#if q.replied}· נענתה {day(q.replied)}{:else}· <span class="text-amber-400/80">טרם נענתה</span>{/if}
                                    </span>
                                </li>
                            {/each}
                        </ul>
                    </details>
                {/if}

                {#if record.recent_agenda.length}
                    <details class="mt-2">
                        <summary class="cursor-pointer text-sm font-bold text-purple-300 marker:text-purple-400">
                            🗣️ נושאי ההצעות לסדר היום ({record.recent_agenda.length})
                        </summary>
                        <ul class="mt-2 flex flex-col gap-1.5 border-r-2 border-purple-400/20 pr-3">
                            {#each record.recent_agenda as topic (topic)}
                                <li class="text-sm leading-relaxed text-gray-300">{clean(topic)}</li>
                            {/each}
                        </ul>
                    </details>
                {/if}
            </div>
        {/if}

        <!-- מענה לפיקוח: רק לשרים — השאילתות שהופנו למשרד שבראשותם -->
        {#if mq && mq.total}
            <div class="border-t border-white/10 pt-3">
                <h3 class="mb-2 text-sm font-bold text-white">
                    📨 מענה לשאילתות <span class="font-normal text-gray-400">· {mq.ministry}</span>
                </h3>
                <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 tabular-nums">
                        {mq.total} שאילתות הופנו למשרד
                    </span>
                    <span
                        class="rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums {mq.answered === mq.total
                            ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-amber-400/30 bg-amber-500/10 text-amber-300'}"
                    >{mq.answered} נענו</span>
                    {#if mq.late}
                        <span
                            title="נענו אחרי המועד שנקבע להשבה"
                            class="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300 tabular-nums"
                        >{mq.late} באיחור מהמועד שנקבע</span>
                    {/if}
                </div>

                {#if mq.recent.length}
                    <details class="mt-2">
                        <summary class="cursor-pointer text-sm font-bold text-gray-300">
                            📋 השאילתות האחרונות למשרד ({mq.recent.length})
                        </summary>
                        <ul class="mt-2 flex flex-col gap-1.5 border-r-2 border-white/10 pr-3">
                            {#each mq.recent as q (q.name + q.submitted)}
                                <li class="text-sm leading-relaxed text-gray-300">
                                    {clean(q.name)}
                                    <span class="text-xs text-gray-500">
                                        · הוגשה {day(q.submitted)}
                                        {#if q.replied}· נענתה {day(q.replied)}{:else}· <span class="text-amber-400/80">טרם נענתה</span>{/if}
                                    </span>
                                </li>
                            {/each}
                        </ul>
                    </details>
                {/if}
            </div>
        {/if}

        {#if record.email}
            <div class="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                <span class="text-xs font-bold text-gray-500">לשכה בכנסת:</span>
                <a
                    href="mailto:{record.email}"
                    dir="ltr"
                    class="record-link rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 transition-colors"
                >📧 {record.email}</a>
            </div>
        {/if}

        <p class="text-xs text-gray-400">
            הנתונים נשאבים אוטומטית ממאגר הנתונים הפתוח של הכנסת ומשקפים את מה שנרשם בו
            {#if record.synced_at}· עודכן {absDate(record.synced_at)}{/if}
        </p>
    </div>
</section>

<style>
    /* Tailwind v4: group-hover שבור — CSS מפורש */
    .record-link:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
    }
    /* משולש הפתיחה של details — צמוד לטקסט ב-RTL */
    details > summary {
        list-style-position: inside;
    }
</style>
