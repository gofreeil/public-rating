// ============================================================
// serverHealthTypes.ts - חוזה הנתונים של מדדי בריאות השרת.
// קובץ נייטרלי (לא תחת server/) כדי שגם רכיבי לקוח יוכלו לייבא את הטיפוסים
// בלי להיתקל בחסימת "server-only module" של SvelteKit.
// ============================================================

export interface HealthMetricCpu {
    score: number; load: number; util: number;
    load1: number; load5: number; load15: number;
    cores: number; ratio: number;
}
export interface HealthMetricMem {
    score: number; load: number; util: number; usedGb: number; totalGb: number;
}
export interface HealthMetricResp {
    score: number; load: number; util: number; latencyMs: number | null;
}

export interface ServerHealth {
    ok: boolean;
    timestamp: string;
    score: number;                 // עומס כללי 1-10 — נגזר מהמשאבים בלבד (מעבד/זיכרון/דיסק)
    load: number;                  // עומס מכויל של צוואר הבקבוק (0-100) - מניע את המחוג
    util: number;                  // אחוז ניצולת גולמי של צוואר הבקבוק (0-100)
    status: 'healthy' | 'moderate' | 'high' | 'critical';
    bottleneck: { key: string; label: string };   // תמיד מעבד/זיכרון/דיסק — לא זמן תגובה
    // הדאטהבייס איטי (חציון SELECT 1 מעל 150ms). דגל עצמאי ולא חלק מהציון: השהיית DB
    // היא סימפטום של משאב חנוק, לא משאב בפני עצמו — ראה ההערה ב-visit-stat controller.
    responseAlert?: boolean;
    metrics: {
        cpu: HealthMetricCpu;
        ram: HealthMetricMem;
        disk: HealthMetricMem | null;
        response: HealthMetricResp;
    };
    uptimeSec: number;
    hostname?: string;
}
