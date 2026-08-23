// ============================================================
// evidence.ts - תיק הראיות של מדד בודד אצל מדורג בודד
//
// לכל דמות באתר יש דף נפרד לכל אחד מחמשת מדדי הדירוג
// (/officials/[id]/[criterion]). בדף נאספות הראיות הפומביות
// שרלוונטיות למדד הזה — ציוצים ופרסומים ברשתות, ראיונות לתקשורת,
// דיווחים וסיקור תקשורתי — ולצידן ניתוח AI שגוזר מהן ציון והנמקה.
// הניתוח מזין בהמשך את הציון המוצג בדף הראשי של הדמות.
//
// אחסון: פריטי Strapi המשותף, קטגוריה pr_evidence,
//   label       = documentId של המדורג (שליפה אחת לכל תיק הראיות שלו)
//   description = ציטוט/תקציר הפריט
//   extra_fields= {criterion, kind, title, url, source, published_at, analysis}
// ============================================================

import { CRITERIA, type CriterionKey } from "./criteria";

export const EVIDENCE_CATEGORY = "pr_evidence";

/** סוג הראיה — קובע לאיזו רצועה בדף היא נכנסת */
export type EvidenceKind = "post" | "interview" | "coverage" | "record";

export const EVIDENCE_KINDS: {
  key: EvidenceKind;
  label: string;
  icon: string;
  /** מה נאסף ברצועה הזו — מוצג גם כשהיא ריקה */
  blurb: string;
}[] = [
  {
    key: "post",
    label: "ציוצים ופרסומים",
    icon: "💬",
    blurb: "אמירות פומביות של הדמות ברשתות החברתיות — בלשונה שלה",
  },
  {
    key: "interview",
    label: "ראיונות לתקשורת",
    icon: "🎙️",
    blurb: "ראיונות בטלוויזיה, ברדיו ובעיתונות שבהם התייחסה הדמות לנושא",
  },
  {
    key: "coverage",
    label: "דיווחים וסיקור תקשורתי",
    icon: "📰",
    blurb: "כתבות ותחקירים על פעולות הדמות — לא על דבריה אלא על מעשיה",
  },
  {
    key: "record",
    label: "מסמכים ונתונים רשמיים",
    icon: "📄",
    blurb: "פרוטוקולים, הצבעות, החלטות ודוחות מבקר — המקור הרשמי עצמו",
  },
];

export function evidenceKindOf(key: string | undefined | null): EvidenceKind {
  return EVIDENCE_KINDS.some((k) => k.key === key)
    ? (key as EvidenceKind)
    : "coverage";
}

export function evidenceKindLabel(key: EvidenceKind): {
  label: string;
  icon: string;
} {
  const k = EVIDENCE_KINDS.find((x) => x.key === key);
  return k ? { label: k.label, icon: k.icon } : { label: "ראיה", icon: "📄" };
}

/**
 * ניתוח AI של פריט ראיה בודד מול המדד שאליו הוא משויך.
 * הציון אינו הדירוג הציבורי — הוא קלט להערכה המסכמת של המדד.
 */
export interface EvidenceAnalysis {
  /** 1-5 שנגזרו מהפריט למדד; null = נותח ולא נמצא בו ציון */
  score: number | null;
  /** נימוק קצר בעברית — למה זה מה שהפריט מלמד על המדד */
  reasoning: string;
  /** הדגם שהפיק את הניתוח ("claude-opus-5") — לשקיפות */
  model: string;
  analyzed_at: string;
}

/** פריט ראיה בודד בתיק של מדד */
export interface EvidenceItem {
  /** documentId ב-Strapi */
  id: string;
  /** documentId של המדורג */
  official_id: string;
  criterion: CriterionKey;
  kind: EvidenceKind;
  title: string;
  /** ציטוט או תקציר — הטקסט שהניתוח נשען עליו */
  excerpt: string;
  /** קישור למקור הפומבי */
  url: string;
  /** שם המקור ("ynet", "X", "ערוץ 12", "פרוטוקול ועדת הכספים") */
  source: string;
  /** מועד הפרסום במקור (ISO); ריק = לא ידוע */
  published_at: string;
  analysis: EvidenceAnalysis | null;
  created_at: string;
}

/**
 * ההערכה המסכמת של המדד — נגזרת מכלל הראיות בתיק.
 * נשמרת על המדורג (extra_fields.ai_criteria[criterion]).
 */
export interface CriterionAnalysis {
  /** 1-5; null = טרם הופק ציון */
  score: number | null;
  /** סיכום בפסקה — מה הראיות מלמדות על המדד */
  summary: string;
  /** נקודות מפתח — שורות קצרות */
  highlights: string[];
  /** כמה פריטי ראיה עמדו בבסיס הסיכום */
  sources: number;
  model: string;
  updated_at: string;
}

/** תקין רק כשהמדד קיים — חוסם נתיבי-רפאים ב-/officials/[id]/[criterion] */
export function isCriterionKey(
  key: string | undefined | null,
): key is CriterionKey {
  return CRITERIA.some((c) => c.key === key);
}
