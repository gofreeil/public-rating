// ============================================================
// דף מדד בודד של דמות — /officials/[id]/[criterion]
//
// כאן נאספות הראיות הפומביות שרלוונטיות למדד: ציוצים ופרסומים,
// ראיונות לתקשורת, דיווחים וסיקור על פעולות הדמות, ולצידן ניתוח AI
// שגוזר מהן ציון והנמקה. הציון הציבורי בדף הראשי נשאר של הגולשים —
// כאן מוצג בנפרד מה שהראיות מלמדות על אותו מדד.
// ============================================================

import { error } from "@sveltejs/kit";
import { criterionByKey, type CriterionKey } from "$lib/rating/criteria";
import { isCriterionKey, type EvidenceItem } from "$lib/rating/evidence";
import { getEvidenceFor, getOfficial, getReviewsFor } from "$lib/server/rating";
import type { Review } from "$lib/rating/types";
import type { PageServerLoad } from "./$types";

/** סטטיסטיקת המדד הבודד — רק דירוגים שבהם המדד הזה סומן בפועל */
function criterionStats(reviews: Review[], key: CriterionKey) {
  const vals = reviews
    .map((r) => r.scores[key])
    .filter((v): v is number => typeof v === "number" && v >= 1 && v <= 5);
  const distribution: [number, number, number, number, number] = [
    0, 0, 0, 0, 0,
  ];
  for (const v of vals) distribution[Math.round(v) - 1]++;
  return {
    count: vals.length,
    average: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
    distribution,
  };
}

export const load: PageServerLoad = async (event) => {
  const criterion = criterionByKey(event.params.criterion);
  // מדד לא מוכר = כתובת שלא קיימת, לא מסך ריק
  if (!criterion || !isCriterionKey(event.params.criterion))
    throw error(404, "המדד לא נמצא");

  // כמו בדף הפרופיל: תקלת באקאנד לא הופכת ל-404 כוזב שגוגל יוריד מהאינדקס
  let official;
  try {
    official = await getOfficial(event.params.id);
  } catch (e) {
    console.warn(
      "[criterion] getOfficial failed:",
      e instanceof Error ? e.message : e,
    );
    throw error(503, "המערכת עמוסה כרגע — נסו לרענן בעוד רגע");
  }
  if (!official) throw error(404, "המדורג לא נמצא");

  let reviews: Review[] = [];
  try {
    reviews = await getReviewsFor(official.id);
  } catch {
    reviews = [];
  }

  // תיק הראיות עדיין ריק ברוב הדמויות — עמוד ריק, לא עמוד שנופל
  let evidence: EvidenceItem[] = [];
  try {
    evidence = await getEvidenceFor(official.id, criterion.key);
  } catch (e) {
    console.warn(
      "[criterion] getEvidenceFor failed:",
      e instanceof Error ? e.message : e,
    );
    evidence = [];
  }

  return {
    official,
    criterionKey: criterion.key,
    stats: criterionStats(reviews, criterion.key),
    analysis: official.ai_criteria[criterion.key] ?? null,
    evidence,
  };
};
