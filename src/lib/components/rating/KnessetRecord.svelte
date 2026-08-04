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

    const seniority = $derived(record.knessets.length);
    const bills = $derived(record.bills);
    const mq = $derived(record.ministry_queries);

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
        <div class="flex flex-wrap items-center gap-2">
            {#if seniority}
                <span
                    title="הכנסות שבהן כיהן/ה: {knessetRanges(record.knessets)}"
                    class="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300"
                >🎖️ {seniority === 1 ? 'קדנציה ראשונה' : `${seniority} קדנציות`} · כנסות {knessetRanges(record.knessets)}</span>
            {/if}
            {#each record.roles as role (role.title + role.from)}
                <span class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300">
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
            </div>
        {/if}

        <p class="text-xs text-gray-600">
            הנתונים נשאבים אוטומטית ממאגר הנתונים הפתוח של הכנסת ומשקפים את מה שנרשם בו
            {#if record.synced_at}· עודכן {absDate(record.synced_at)}{/if}
        </p>
    </div>
</section>
