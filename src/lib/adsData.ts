export interface Ad {
    id: number;
    title: string;
    description: string;
    cta: string;
    href: string;
    image: string;
    color: string;
}

export const ads: Ad[] = [
    {
        id: 1,
        title: "בתי הפיוס",
        description: "מתנדבים לתת לך עזרה מלאה בדין / פיוס בכל סיכסוך",
        cta: "יש לך סיכסוך? לחץ לפתרון",
        href: "https://chachmim.vercel.app/",
        image: "/images/bati-hapius.png",
        color: "from-orange-600 to-red-600"
    },
    {
        id: 2,
        title: "ועדי שכונות",
        description: "מהפכת משילות העם על המוסדות",
        cta: "הכר והשתתף במהפכת משילות העם על מוסדותיו",
        href: "https://neighborhoods-il.vercel.app/",
        image: "/images/news/vaadei-shchunot.png",
        color: "from-blue-600 to-cyan-600"
    },
    {
        id: 3,
        title: "קבוצת רכישה",
        description: "הוזל את ההוצאות שלך",
        cta: "הצטרף לקבוצת הרכישה שלנו והוזל מיד את ההוצאות!",
        href: "https://purchasing-groups.vercel.app/",
        image: "/images/whatsapp_cta.png",
        color: "from-green-800 to-emerald-900"
    },
    {
        id: 4,
        title: "מועדון המשקיעים החברתי",
        description: "התחבר עם קבוצת המשקיעים שלנו",
        cta: "התחבר עם קבוצת המשקיעים שלנו",
        href: "https://www.melecshop.com/page/free",
        image: "/images/partners/investments.png",
        color: "from-amber-600 to-orange-600"
    },
    {
        id: 5,
        title: "גידול ביתי",
        description: "מערכת לגידול ביתי (בקרוב)",
        cta: "מערכת לגידול ביתי - לחץ לפרטים",
        href: "https://www.melecshop.com/page/free",
        image: "/images/partners/growing-system.png",
        color: "from-teal-500 to-teal-600"
    },
    {
        id: 6,
        title: "בעלי מקצוע כשירים",
        description: "חתמו על תנאי הקהילה ונותנים לנו הנחות והטבות יחודיות",
        cta: "מחפש בעל מקצוע איכותי באזורך?",
        href: "https://index-chi-sage.vercel.app/",
        image: "/images/professionals.png",
        color: "from-yellow-500 to-orange-500"
    },
    {
        id: 7,
        title: "ביקורת על העיריה",
        description: "הזכות לחיות - תלונות לעיריה",
        cta: "יש לך תלונה לעיריה שמזלזלים בה? - לא עוד",
        href: "https://criticism.vercel.app/",
        image: "/images/bikoret-iriya.png",
        color: "from-red-600 to-pink-600"
    },
    {
        id: 8,
        title: "סיוע לנפגעים מינית",
        description: "תמיכה וסיוע לנפגעים מינית",
        cta: "לחץ לפרטים",
        href: "https://www.melecshop.com/page/kids_FNL3",
        image: "/images/support-victims.jpeg",
        color: "from-fuchsia-600 to-pink-600"
    },
    {
        id: 11,
        title: "החנות החברתית",
        description: "מוצרים נבחרים לבריאות טבעית, חקלאות ביתית, טכנולוגיה ועוד",
        cta: "כנסו לחנות לחיים טובים יותר",
        href: "https://heirut-shop.vercel.app/",
        image: "/images/freedom-store.png",
        color: "from-emerald-600 to-teal-700"
    }
];
