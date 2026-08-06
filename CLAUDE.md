# CLAUDE.md - דירוג ציבורי (rating.gofreeil.com)

## סקירת הפרויקט

פלטפורמת דירוג ציבורי של "יוצאים לחירות": הציבור מדרג נבחרי ציבור, שופטים ועובדי ציבור לפי 5 מדדים (זמנים ותקנים, תרומה לעם, ראיית המציאות, לגופו של עניין, שקיפות וקשב). הריפו הוא פורק של אתר הקהילה — חלק מהנתיבים הישנים (אבדות, פנויים, קופת קהילה) עדיין קיימים כשאריות.

## טכנולוגיות

- **Framework**: SvelteKit 2.x + Svelte 5 (runes בלבד: `$state`, `$derived`, `$props`, `$bindable`)
- **Styling**: Tailwind CSS 4.x (זהירות: `group-hover` שבור — CSS מפורש; `-translate-*` מתקמפל לתכונת `translate`)
- **Backend**: Strapi 5 המשותף של gofreeil (`STRAPI_URL`, בפרודקשן api.gofreeil.com) — אין content-type ייעודי; הכל items
- **Auth**: Auth.js — Google / Facebook / credentials / SSO "יוצאים לחירות" (עוגיית gofreeil-auth)

```bash
npm run dev       # שרת פיתוח
npm run build     # בניית ייצור
npm run check     # בדיקת TypeScript + Svelte
```

## מודל הנתונים (items ב-Strapi המשותף)

| קטגוריה | תפקיד | שדות |
|---|---|---|
| `pr_official` | מדורג | label=שם, description=רקע, extra_fields={group, position, org, approved, suggested_by, official_user_id} |
| `pr_review` | דירוג משתמש | **label=documentId של המדורג** (לסינון מדויק), description=טקסט, user_id=מדרג, extra_fields={scores, reviewer_name, anonymous, helpful_by} |
| `pr_comment` | תגובה על דירוג | **label=documentId של המדורג** (שליפה אחת לדף), description=טקסט, user_id=מגיב, extra_fields={review_id, commenter_name, official_reply} |
| `pr_sync` | יומן סנכרון | label=knesset_sync (רשומה אחת, upsert), extra_fields={log} — הדוח האחרון של סנכרון הכנסת+שקוף |

- `official_user_id` = חשבון הדמות עצמה (נקבע באדמין) — תגובותיה מסומנות "תגובה רשמית"; **לא נשלח לדפדפן** (עלול להכיל אימייל)
- סנכרון חיצוני (`src/lib/server/knessetSync.ts`, כפתור ב-/admin/officials): מצבת המכהנים מ-OData הכנסת (מקור אמת לתפקיד/סיעה; התאמה לפי `knesset_person_id` ואז שם) + מדד המיניסטרמטר של שקוף (wp-json, נשמר ב-extra_fields.shakuf ומוצג ב-ProfileDetails). לא דורס שדות ידניים, לא מוחק אף מדורג (עוזבים מדווחים בלבד)
- רזומה פרלמנטרית (`extra_fields.knesset_record`, קומפוננטה KnessetRecord): חקיקה לפי סטטוס, שאילתות, הצעות לסדר, ציר תפקידים, ולשרים — מענה לשאילתות שהופנו למשרד. נמשכת מה-OData בכפתור לכל מדורג או בריצה מרוכזת במנות (תקציב 40ש', TTL 14 יום)

- דירוג אחד למשתמש למדורג — upsert ב-`upsertReview`
- מיון הוגן: שקלול בייסיאני (IMDb, m=3) ב-`aggregate.ts`; סף פרסים = 3 דירוגים
- כל כתיבה חייבת `invalidateRating()` (קאש 60ש' ב-`src/lib/server/rating.ts`)

## מבנה הקוד החדש

```
src/lib/rating/          criteria.ts (4 המדדים) · types.ts (GROUPS, Official, Review) · aggregate.ts · heSearch.ts
src/lib/server/rating.ts שכבת הנתונים (קריאה/כתיבה/קאש)
src/lib/components/rating/  Stars, StarInput, Avatar, OfficialCard, Board, Histogram,
                             CriteriaBars, RateForm, ReviewCard, Podium, OfficialSearch, NavBar
src/routes/              / (בית) · /knesset /judges /public-servants (לוחות) · /officials/[id] (פרופיל+דירוג)
                         /top-rated (מצטיינים) · /about (חזון) · /suggest (הצעת מדורג) · /admin/officials (ניהול)
scripts/seed-officials.mjs  זריעת מדורגים ראשונים: node scripts/seed-officials.mjs --url https://api.gofreeil.com
scripts/fetch-knesset-members.mjs  משיכת כל הח"כים/השרים המכהנים מ-OData הכנסת אל seed-officials.json (ואז seed + enrich)
scripts/sync-knesset-records.mjs  ייבוא מרוכז של הכל (מצבת + רזומות + שקוף) בלי מגבלת זמן של פונקציית שרת:
                             node scripts/sync-knesset-records.mjs --url https://api.gofreeil.com [--only "שם,שם"] [--concurrency 1] [--dry]
                             הכנסת מחזירה HTTP 481 בעומס — משלימים את הנכשלים בריצה חוזרת עם --concurrency 1
```

## עיצוב ו-RTL

- RTL גלובלי, גופן Assistant, ערכה כהה `#0f172a`, כרטיסים `bg-white/5 border-white/10 rounded-2xl`
- CTA: `btn-premium` (גרדיאנט כחול-סגול); כוכבים amber-400
- סגנון: מינימליסטי וקומפקטי — אלמנטים זה לצד זה (flex-wrap), כמה שפחות גלילה
- טקסט UI: עברית ישירה (בלי מפתחות i18n בדפי הדירוג); ברירת מחדל עברית — אסור getLocaleFromNavigator

## כללי עבודה

1. דפי שרת עמידים: כל קריאת Strapi ב-try/catch → empty state, לא 500
2. form actions עם use:enhance; כל וריאנטי ה-fail חייבים אותה צורה (למשל תמיד `values`)
3. אדמין = `session.user.role === 'super_admin'` — לבדוק גם בתוך כל action, לא רק ב-load
4. `npm run build && npm run check` לפני commit

## הנחיות לסיום משימה

בסיום כל משימה יש לבצע בסדר הבא:
1. **צליל** - הרץ `echo -e "\a"` בבאש כדי להשמיע צליל התראה
2. **סיכום** - סכם בטבלה או ברשימה ברורה מה נבנה/שונה בסשן זה
3. **שאל** - "לדחוף לשרת (`git push`) או לתקן/לשנות משהו לפני?"
