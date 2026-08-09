// ============================================================
// adsData.ts - טור אתרי הרשת של "יוצאים לחירות" (דסקטופ + מגירת הנייד)
// עדכן כאן בלבד - יתעדכן אוטומטית בכל המקומות.
// זהה לרשימה באתר קהילה בשכונה, למעט החלפת המודעה העצמית
// (דירוג ציבורי) במודעה של קהילה בשכונה.
// ============================================================

export interface Ad {
    /** פרסומות הרשת ממוספרות; מודעה של מפרסם משולם נושאת את מזהה המסמך */
    id: number | string;
    title: string;
    description: string;
    cta: string;
    href: string;
    image: string;
    color: string;
    /** גרדיאנט CSS מהרשימה הסגורה (מודעה משולמת) - עוקף את מחלקות color */
    colorCss?: string;
    imageHeight?: string;   // גובה מותאם לתמונה (ברירת מחדל: 160px)
    imageScale?: number;    // זום יחסית ל-cover (1 = מילוי המשבצת; מעל 1 = תקריב)
    hover?: string;         // טקסט tooltip בריחוף מעל כפתור ה-CTA
    /** יעד פנימי באתר (דף נחיתה של מפרסם) - נפתח באותה לשונית ובלי noopener */
    internal?: boolean;
}

export const ads: Ad[] = [
    {
        id: 1,
        title: "בתי הפיוס",
        description: "מתנדבים לתת לך עזרה מלאה בדין / פיוס בכל סיכסוך",
        cta: "יש לך סיכסוך? לחץ לפתרון",
        href: "https://chachmim.gofreeil.com/",
        image: "/images/bati-hapius.webp",
        color: "from-orange-600 to-red-600"
    },
    {
        id: 9,
        title: 'הגמ"ח הארצי',
        description: 'כל הגמחים תחת קורת גג אחת',
        cta: 'לאתר הגמ"ח הארצי',
        hover: 'מצא כל גמח בקלות!',
        href: "https://gemach.gofreeil.com/",
        image: "/images/gemach-harzi.webp",
        color: "from-pink-600 via-fuchsia-600 to-purple-700",
    },
    {
        id: 2,
        title: "ועדי שכונות",
        description: "מהפכת משילות העם על המוסדות",
        cta: "הכר והשתתף במהפכת משילות העם על מוסדותיו",
        href: "https://neighborhoods.gofreeil.com/",
        image: "/images/news/vaadei-shchunot.webp",
        color: "from-blue-600 to-cyan-600",
        imageHeight: "110px"
    },
    {
        id: 5,
        title: "מבקר רשויות המדינה",
        description: "מבקרים את הרשויות, ממצים את זכות התושב",
        cta: "מבקרים את הרשויות, ממצים את זכות התושב",
        href: "https://criticism.gofreeil.com/",
        image: "/images/mevaker-rashuyot.webp",
        color: "from-blue-700 to-indigo-700",
        imageHeight: "120px",
        imageScale: 1.2,
    },
    {
        id: 10,
        title: 'קהילה בשכונה',
        description: 'כל יתרונות השכונה תחת קורת גג אחת',
        cta: 'לאתר קהילה בשכונה',
        hover: 'כל היתרונות בשכונה שלך!',
        href: "https://community.gofreeil.com/",
        image: "/images/community-neighborhood.png",
        color: "from-blue-500 to-purple-600",
    },
    {
        id: 8,
        title: "משאלי העם",
        description: "הבע דעתך על הסוגיות האקטואליות",
        cta: "הבע דעתך על הסוגיות האקטואליות",
        hover: "הבע דעתך על הסוגיות האקטואליות",
        href: "https://referendum.gofreeil.com/",
        image: "/images/referendum.webp",
        color: "from-purple-600 to-indigo-700"
    },
    {
        id: 3,
        title: "קבוצת רכישה",
        description: "הוזל את ההוצאות שלך",
        cta: "הצטרף לקבוצת הרכישה שלנו והוזל מיד את ההוצאות!",
        href: "https://groups.gofreeil.com/",
        image: "/images/whatsapp_cta.webp",
        color: "from-green-800 to-emerald-900"
    },
    {
        id: 6,
        title: "בעלי מקצוע כשירים",
        description: "חתמו על תנאי הקהילה ונותנים לנו הנחות והטבות יחודיות",
        cta: "מחפש בעל מקצוע איכותי באזורך?",
        href: "https://index.gofreeil.com/",
        image: "/images/professionals.webp",
        color: "from-yellow-500 to-orange-500",
        imageHeight: "110px"
    },
    {
        id: 7,
        title: "חנות החירות",
        description: "מוצרים נבחרים לבריאות טבעית, חקלאות ביתית, טכנולוגיה ועוד",
        cta: "כנסו לחנות לחיים טובים יותר",
        hover: "החנות שלנו!",
        href: "https://shop.gofreeil.com/",
        image: "/images/shop.webp",
        color: "from-emerald-600 to-teal-700",
        imageHeight: "110px"
    }
];
