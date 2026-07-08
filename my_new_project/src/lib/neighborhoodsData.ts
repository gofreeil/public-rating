// Single source of truth for all cities and neighborhoods.
// Add a new city/neighborhood here and it will automatically
// appear everywhere in the app (advertise page, map, home page).

export interface CityEntry {
    city: string;
    neighborhoods: string[];
}

export const citiesData: CityEntry[] = [
    { city: "אופקים",              neighborhoods: ["מרכז העיר", "שכונה א", "שכונה ב"] },
    { city: "אפרת",                neighborhoods: ["הדגן", "הזית", "הגפן", "הרימון", "התאנה", "התמר", "הדקל", "האלון"] },
    { city: "אור יהודה",           neighborhoods: ["מרכז", "נווה אפריים", "קרית אונו הצעירה"] },
    { city: "אור עקיבא",           neighborhoods: ["מרכז העיר", "שכונת הגפן"] },
    { city: "אילת",                neighborhoods: ["שכונת התמרים", "שכונת הדקלים", "שכונת השחמון", "נאות אילות"] },
    { city: "אלעד",                neighborhoods: ["מרכז", "שכונת הרב קוק"] },
    { city: "אריאל",               neighborhoods: ["מרכז", "גבעה א", "גבעה ב"] },
    { city: "אשדוד",               neighborhoods: ["רובע א", "רובע ב", "רובע ג", "רובע ד", "רובע ה", "רובע ו", "רובע ז", "רובע ח", "צפון", "עיר ימים"] },
    { city: "אשקלון",              neighborhoods: ["ברנע", "גיורא", "שמשון", "הנשיא", "אפרידר", "עזתה"] },
    { city: "באר יעקב",            neighborhoods: ["מרכז", "שכונת הגנים"] },
    { city: "באר שבע",             neighborhoods: ["רמות", "נווה זאב", "נווה נוי", "נווה עופר", "שכונת ד", "עומר"] },
    { city: "בית שאן",             neighborhoods: ["מרכז", "קרית נחמה", "שכונה ב"] },
    { city: "בית שמש",             neighborhoods: ["בית שמש א", "בית שמש ב", "בית שמש ג", "רמת בית שמש א", "רמת בית שמש ב"] },
    { city: "בני ברק",             neighborhoods: ["פרדס כץ", "רמת אלחנן", "שיכון ה", "זיכרון מאיר"] },
    { city: "בת ים",               neighborhoods: ["מרכז", "קרית שלום", "רמת יוסף", "גבעת הגפן"] },
    { city: "גבעת שמואל",          neighborhoods: ["מרכז", "גבעת הגפן", "נאות רמז"] },
    { city: "גבעתיים",             neighborhoods: ["בורוכוב", "כצנלסון", "קרית יוסף", "רמת יוסף"] },
    { city: "גדרה",                neighborhoods: ["מרכז", "שכונת הגן", "גן הדרים"] },
    { city: "דימונה",              neighborhoods: ["מרכז", "שכונת כלנית", "שכונת נרקיס"] },
    { city: "הוד השרון",           neighborhoods: ["מרכז", "גנות", "צהלה", "שכונת אורנים"] },
    { city: "הרצליה",              neighborhoods: ["הרצליה פיתוח", "נוה עובד", "נווה ישראל", "שכונת הצוק"] },
    { city: "חדרה",                neighborhoods: ["מרכז", "אחוזה", "בנין ב", "שכונת הגנים"] },
    { city: "חולון",               neighborhoods: ["מרכז", "בת חן", "קריית בן גוריון", "קריית אברהם", "צהלה"] },
    { city: "חיפה",                neighborhoods: ["כרמל צרפתי", "נווה שאנן", "רמת אלמוגי", "בת גלים", "הדר הכרמל", "קרית חיים", "קרית שמואל", "רמב\"ם"] },
    { city: "טבריה",               neighborhoods: ["מרכז", "קרית שמואל", "שכונת הגבעה"] },
    { city: "טייבה",               neighborhoods: ["מרכז", "שכונה א", "שכונה ב"] },
    { city: "יבנה",                neighborhoods: ["מרכז", "אזור התעשייה", "שכונת הנביאים"] },
    { city: "יהוד-מונוסון",        neighborhoods: ["יהוד", "מונוסון", "שכונת הרימון"] },
    { city: "יקנעם עילית",         neighborhoods: ["מרכז", "שכונת הגבעה"] },
    { city: "ירושלים",             neighborhoods: ["קרית משה", "רחביה", "גבעת שאול", "רמות", "גילה", "קטמון", "בקעה", "מעלות דפנה", "הר נוף", "פסגת זאב", "מלחה", "עין כרם", "תלפיות", "ארנונה"] },
    { city: "כפר סבא",             neighborhoods: ["מרכז", "רמת כפר סבא", "נווה ים", "גני תקווה"] },
    { city: "לוד",                 neighborhoods: ["מרכז", "כרמים", "נווה ישראל", "שכונת גאולים"] },
    { city: "מגדל העמק",           neighborhoods: ["מרכז", "שכונת הגנים", "שכונה ב"] },
    { city: "מודיעין-מכבים-רעות",  neighborhoods: ["מכבים", "רעות", "מודיעין מרכז", "גני מודיעין", "האורנים"] },
    { city: "מודיעין עילית",        neighborhoods: ["שכונה א", "שכונה ב", "שכונה ג"] },
    { city: "מעלה אדומים",         neighborhoods: ["מרכז", "מצפה נבו", "מגדלים", "אדמות יוסף"] },
    { city: "נהריה",               neighborhoods: ["מרכז", "גבעת זיו", "שכונת ים"] },
    { city: "נס ציונה",            neighborhoods: ["מרכז", "קרית האולימפיאדה", "שכונת הגנים", "מרכז מסחרי"] },
    { city: "נצרת",                neighborhoods: ["מרכז", "עיר עתיקה", "רם"] },
    { city: "נצרת עילית",          neighborhoods: ["שכונה א", "שכונה ב", "גבעת האירוס"] },
    { city: "נתיבות",              neighborhoods: ["מרכז", "שכונה ב", "גינות"] },
    { city: "נתניה",               neighborhoods: ["קרית השרון", "רמת פולג", "נווה גנים", "עיר ימים", "צוקי ים", "מרכז"] },
    { city: "עכו",                 neighborhoods: ["עיר עתיקה", "וולפסון", "נווה אורים", "בן עמי"] },
    { city: "עפולה",               neighborhoods: ["מרכז", "שכונת ד", "שכונת המשכנות"] },
    { city: "פתח תקווה",           neighborhoods: ["קרית אריה", "נווה עוז", "שיכון דן", "מרכז", "כפר גנים", "סגולה"] },
    { city: "צפת",                 neighborhoods: ["מרכז", "עיר עתיקה", "כנען", "שכונת ה"] },
    { city: "קרית אונו",           neighborhoods: ["מרכז", "גבעת שמואל", "נאות אפק"] },
    { city: "קרית אתא",            neighborhoods: ["מרכז", "שכונת יוספטל", "שכונת הכרמל"] },
    { city: "קרית ביאליק",         neighborhoods: ["מרכז", "שכונה א", "קרית חיים מזרחית"] },
    { city: "קרית גת",             neighborhoods: ["מרכז", "שכונה ב", "כנות"] },
    { city: "קרית מוצקין",         neighborhoods: ["מרכז", "שכונת גורדון", "קרית חיים"] },
    { city: "קרית שמונה",          neighborhoods: ["מרכז", "שכונת תל חי", "צפון"] },
    { city: "ראש העין",            neighborhoods: ["מרכז", "נוות אפק", "כפר אברהם"] },
    { city: "ראשון לציון",         neighborhoods: ["נווה דקלים", "רמת אליהו", "שיכון ותיקים", "מרכז", "נחלת יהודה", "עולי ציון"] },
    { city: "רהט",                 neighborhoods: ["מרכז", "שכונה ב", "שכונה ג"] },
    { city: "רחובות",              neighborhoods: ["מרכז", "רמת רחובות", "נווה חוף", "שכונת הדרים", "כפר גנים"] },
    { city: "רמלה",                neighborhoods: ["מרכז", "גן החיות", "שכונת עמישב"] },
    { city: "רמת גן",              neighborhoods: ["מרכז", "בורוכוב", "נווה עוז", "כפר גנים", "נווה אפרים"] },
    { city: "רמת השרון",           neighborhoods: ["מרכז", "צהלה", "שכונת הצוק", "נווה מגן"] },
    { city: "רעננה",               neighborhoods: ["מרכז", "נווה זמר", "גני עם", "שכונת ד"] },
    { city: "שדרות",               neighborhoods: ["מרכז", "שכונה ב", "שכונת הדרים"] },
    { city: "תל אביב",             neighborhoods: ["רמת אביב", "פלורנטין", "נווה צדק", "יפו העתיקה", "רמת החייל", "הצפון הישן", "הצפון החדש", "לב העיר", "נמל תל אביב", "רוטשילד"] },
    { city: "תל מונד",             neighborhoods: ["מרכז", "שכונת הגנים"] },
];

// Convenience: plain object for components that need Record<string, string[]>
export const citiesAndNeighborhoods: Record<string, string[]> = Object.fromEntries(
    citiesData.map((e) => [e.city, e.neighborhoods]),
);

export const DEFAULT_NEIGHBORHOOD = "קרית משה";
export const LS_KEY = "shchuna_selected_neighborhood"; // localStorage key
