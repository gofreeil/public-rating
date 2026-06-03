# CLAUDE.md - הנחיות לפרויקט קהילה בשכונה

## סקירת הפרויקט

פלטפורמת קהילה שכונתית ישראלית המחברת תושבים לשירותים מקומיים, יתרונות שכונתיים ויוזמות קהילתיות. מתמקד בירושלים (קרית משה) עם תמיכה בעיר נוספות.

## טכנולוגיות ואיך להריץ

- **Framework**: SvelteKit 2.x + Svelte 5
- **Styling**: Tailwind CSS 4.x
- **שפות**: TypeScript
- **i18n**: svelte-i18n (עברית, אנגלית, רוסית)

```bash
npm run dev       # שרת פיתוח
npm run build     # בניית ייצור
npm run check     # בדיקת TypeScript + Svelte
npm run preview   # תצוגה מקדימה של build
```

## מבנה הפרויקט

```
src/
├── lib/
│   ├── components/         # רכיבי UI לשימוש חוזר
│   │   ├── Header.svelte         # כותרת עליונה עם בחירת שפה
│   │   ├── Footer.svelte         # כותרת תחתונה
│   │   ├── AdsSidebar.svelte     # סרגל פרסומות צד ימין (דסקטופ)
│   │   ├── MobileAdsBanner.svelte # פרסומות נייד
│   │   ├── MobileTextAds.svelte  # פרסומות טקסט נייד
│   │   ├── JerusalemMap.svelte   # מפת שכונות אינטראקטיבית
│   │   ├── LostAndFound.svelte   # מקטע אבידות ומצבי חירום
│   │   ├── NewsTicker.svelte     # טיקר חדשות
│   │   ├── FacebookComments.svelte # תגובות פייסבוק
│   │   ├── FullAdModal.svelte    # מודל פרסומת מלאה
│   │   └── ReferendumBanner.svelte # באנר קמפיין
│   ├── adsData.ts            # נתוני פרסומות וטיפוסים
│   ├── itemsData.ts          # נתוני פריטים/יתרונות קהילתיים
│   ├── i18n.ts               # הגדרות רב-לשוניות
│   └── index.ts              # ייצוא רכיבים
└── routes/
    ├── +layout.svelte        # Layout ראשי (3 עמודות: פרסומות|תוכן|פרסומות)
    ├── +page.svelte          # דף הבית
    ├── community-fund/
    │   └── +page.svelte      # כותל המשאלות
    └── items/[id]/
        └── +page.svelte      # דף פרט פריט דינמי
```

## עיצוב ו-RTL

- **כיווניות**: RTL (ימין לשמאל) לעברית
- **גופן**: "Assistant" (גופן ישראלי) משקלים 300-700
- **ערכת צבעים**: ערכה כהה - `#070b14`, `#0f172a` עם גרדיאנטים כחול-סגול-ורוד
- **Breakpoints**:
  - נייד: < 768px
  - דסקטופ: > 1024px

**חשוב**: תמיד לשמור על תאימות RTL. להשתמש ב-`dir="rtl"` ולהיזהר עם מרווחים ושוליים.

## i18n - רב-לשוניות

קובץ ההגדרות: `src/lib/i18n.ts`

- שפת ברירת מחדל: **עברית (he)**
- שפות נתמכות: עברית, אנגלית (`en`), רוסית (`ru`)
- כל תוכן טקסט חדש חייב להיות מתורגם לשלוש השפות

```typescript
// דוגמת שימוש ברכיב
import { _ } from 'svelte-i18n';
$_('key.name')
```

## קטגוריות הפלטפורמה

היתרונות השכונתיים מחולקים לקטגוריות:
- **גמח** - שירותי השאלה חינם
- **מסירה** - פריטים למסירה חינם
- **בייבי סיטר** - שמרטפים
- **יהדות** - מניינים, שיעורים, שבת
- **חוגים** - חוגים ותחביבים
- **אירוח לשבת** - הכנסת אורחים
- **צימרים** - השכרת נופש
- **חנויות ומסעדות** - עסקים מקומיים
- **טרמפים** - נסיעות משותפות
- **עבודות, שידוכים, אירועים**

## נתוני הפרסומות (`adsData.ts`)

הפרסומות מוגדרות כ-array של אובייקטים עם:
```typescript
interface Ad {
  id: number;
  title: string;
  description: string;
  color: string;        // צבע גרדיאנט
  icon: string;         // אמוג'י
  fullDescription: string;
  contact?: string;
}
```

## נתוני הפריטים (`itemsData.ts`)

```typescript
interface Item {
  id: string;
  label: string;
  icon: string;
  description: string;
  address?: string;
  phone?: string;
}
```

## כללי עבודה חשובים

1. **שפה**: הפרויקט בעברית - שמות משתנים וקומנטים יכולים להיות באנגלית, אך תוכן UI תמיד דרך i18n
2. **Svelte 5**: להשתמש בסינטקס החדש - `$state()`, `$derived()`, `$effect()` במקום `writable`/`readable`
3. **Tailwind 4**: להשתמש בסינטקס החדש של Tailwind 4 (לא להשתמש ב-`@apply` כשאפשר)
4. **ריספונסיבי**: כל שינוי חייב לתמוך בנייד ודסקטופ
5. **ביצועים**: לשמור על אנימציות קלילות - `pulse-slow` מוגדר ב-tailwind.config.js (11 שניות)

## פקודות שימושיות

```bash
# בדיקת שגיאות TypeScript
npm run check

# בניה + בדיקה לפני commit
npm run build && npm run check
```

## הנחיות לסיום משימה

בסיום כל משימה יש לבצע בסדר הבא:
1. **צליל** - הרץ `echo -e "\a"` בבאש כדי להשמיע צליל התראה
2. **סיכום** - סכם בטבלה או ברשימה ברורה מה נבנה/שונה בסשן זה
3. **שאל** - "לדחוף לשרת (`git push`) או לתקן/לשנות משהו לפני?"
