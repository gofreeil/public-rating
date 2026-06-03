<script lang="ts">
    import { onMount } from "svelte";
    import { t } from "svelte-i18n";
    import { createEventDispatcher } from "svelte";
    import { slide } from "svelte/transition";
    import { goto } from "$app/navigation";
    import { enhance } from '$app/forms';
    import { triggerAdPopup } from "$lib/adPopupStore";
    import { items as itemsData } from "$lib/itemsData";
    import { citiesAndNeighborhoods } from "$lib/neighborhoodsData";
    import { neighborhoodState } from "$lib/neighborhoodState.svelte";
    import type { DbItem } from "$lib/server/db";

    const dispatch = createEventDispatcher();

    let { showNeighborhoodsMenu = $bindable(false), dbItems = [] as DbItem[] } = $props();

    const categories = [
        { id: "benefits", label: "כל היתרונות", icon: "⭐" },
        {
            id: "gemachim",
            label: 'גמ"חים',
            icon: "🎁",
            items: [
                { id: "gemach-books", label: 'גמ"ח ספרים' },
                { id: "gemach-tools", label: 'גמ"ח כלי עבודה' },
                { id: "gemach-baby", label: 'גמ"ח לתינוקות וילדים' },
                { id: "gemach-national", label: 'לאתר הגמ"חים הארצי' },
            ],
        },
        {
            id: "giveaway",
            label: "למסירה",
            icon: "📦",
            items: [
                { id: "giveaway-sofa", label: "ספה למסירה" },
                { id: "giveaway-fridge", label: "מקרר במצב מצוין" },
                { id: "giveaway-books", label: "ארגז ספרי קודש" },
            ],
        },
        {
            id: "business",
            label: "בייבי סיטר",
            icon: "👶",
            items: [
                { id: "babysitter-shira", label: "שירה בייביסיטר" },
                { id: "babysitter-evening", label: "בייבי סיטר בשעות הערב" },
                { id: "babysitter-regular", label: "בייבי סיטר קבוע" },
            ],
        },
        {
            id: "minyanim",
            label: "יהדות",
            icon: "✡️",
            items: [
                { id: "minyan-shacharit", label: "מניין שחרית מרכזי" },
                { id: "torah-class", label: "שיעור דף היומי" },
                { id: "mikveh", label: "מקוואות בשכונה" },
            ],
        },
        {
            id: "education",
            label: "חוגים",
            icon: "🎨",
            items: [
                { id: "activity-soccer", label: "חוג כדורגל לילדים" },
                { id: "art-class", label: "חוג ציור ופיסול" },
                { id: "music-class", label: "חוג נגינה בגיטרה" },
            ],
        },
        {
            id: "realestate",
            label: "אירוח לשבת",
            icon: "🕯️🕯️",
            items: [
                { id: "host-offer", label: "מציע לארח משפחה" },
                { id: "guest-request", label: "מחפש להתארח בשבת" },
            ],
        },
        {
            id: "security",
            label: "צימרים",
            icon: "🏡",
            items: [
                { id: "zimmer-pair", label: "צימר לזוגות" },
                { id: "zimmer-family", label: "צימר למשפחות" },
            ],
        },
        {
            id: "shops",
            label: "חנויות",
            icon: "🏪",
            items: [
                { id: "shop-makolet", label: "מכולת השכונה 24/7" },
                { id: "bakery", label: "מאפיית הבית" },
                { id: "pharmacy", label: "בית מרקחת שכונתי" },
            ],
        },
        {
            id: "restaurants",
            label: "חנות מזון",
            icon: "🍱",
            items: [
                { id: "pizza-local", label: "פיצה השכונה" },
                { id: "falafel-hot", label: "פלאפל חם וטרי" },
                { id: "grocery-delivery", label: "משלוחי פירות וירקות" },
            ],
        },
        {
            id: "rides",
            label: "טרמפים",
            icon: "🚗",
            items: [
                { id: "ride-jerusalem", label: "טרמפ יומי לירושלים (7:00)" },
                { id: "ride-tel-aviv", label: 'מציע טרמפ למרכז בסופ"ש' },
                { id: "ride-request", label: "מחפש טרמפ קבוע לבני ברק" },
            ],
        },
        {
            id: "for_kids",
            label: "לילדים",
            icon: "🎈",
            items: [
                { id: "jamboree", label: "ג'ימבורי שכונתי" },
                { id: "story-time", label: "שעת סיפור בספרייה" },
                { id: "playground-updates", label: "עדכוני גינות משחקים" },
            ],
        },
        {
            id: "jobs",
            label: "דרושים עובדים",
            icon: "💼",
            items: [
                { id: "job-full", label: "דרוש/ה עובד/ת למשרה מלאה" },
                { id: "job-teen", label: "עבודה לנוער בחופש" },
            ],
        },
        {
            id: "singles",
            label: "פנויים/פנויות",
            icon: "❤️",
            items: [
                { id: "match-offer", label: "הצעה לשידוך איכותי" },
                { id: "singles-meeting", label: "מפגש פנויים פנויות" },
            ],
        },
        {
            id: "attractions",
            label: "אטרקציות",
            icon: "🎡",
            items: [
                { id: "attraction-park", label: "פארק שעשועים מקומי" },
                { id: "attraction-museum", label: "מוזיאון המדע לילדים" },
                { id: "attraction-zoo", label: "פינת חי קהילתית" },
            ],
        },
        {
            id: "halls",
            label: "אולמות",
            icon: "🏛️",
            items: [
                { id: "hall-events", label: "אולם אירועים שכונתי" },
                { id: "hall-community", label: "אולם קהילתי להשכרה" },
                { id: "hall-wedding", label: "אולם שמחות" },
            ],
        },
        {
            id: "safe-space",
            label: "מרחב מוגן",
            icon: "🛡️",
            items: [
                { id: "safe-1", label: "מקלט ציבורי מרכזי" },
                { id: "safe-2", label: "מרחב מוגן קהילתי" },
            ],
        },
    ];

    let viewMode = $state<"map" | "list" | "search">("map");
    let showAddMenu = $state(false);
    let isFlipping = $state(false);
    let expandedCategories = $state(new Set<string>());
    let isLoggedIn = $state(false);
    let showHelpMenu = $state(false);
    let showWaves = $state(false);
    let showSuccessMessage = $state(false);
    let successMessageText = $state("");
    let isMouseOver = $state(false);
    let handRaised = $state(false);
    let showSurvey = $state(false);
    let raisedHandMessage = $state("");
    let raisedHandIcon = $state("");
    let selectedCategory = $state("benefits");
    let isAutoSwitching = $state(false);
    let userInteracted = $state(false);
    let selectedCity = $state("");

    // --- מודל קריאת עזרה ---
    let showRaiseHandModal = $state(false);
    let modalOptionId = $state(5);
    let modalSubmitting = $state(false);
    let modalSubmitted = $state(false);
    let modalError = $state('');
    let modalImageBase64 = $state('');
    let modalImagePreview = $state('');

    const fieldsByOption: Record<number, { descLabel: string; descPlaceholder: string; locationPlaceholder: string }> = {
        1: { descLabel: 'תיאור המצב', descPlaceholder: 'פרט את המצב - מה קרה, באיזו עזרה נדרש...', locationPlaceholder: 'רחוב, כניסה, קומה...' },
        2: { descLabel: 'פרטי הרכב', descPlaceholder: 'צבע הרכב, דגם, לוחית רישוי...', locationPlaceholder: 'היכן הרכב חונה? רחוב ומספר...' },
        3: { descLabel: 'תיאור הילד', descPlaceholder: 'גיל, לבוש, מאפיינים בולטים, מתי נעלם...', locationPlaceholder: 'איפה נראה לאחרונה? שם המקום, רחוב...' },
        4: { descLabel: 'תיאור בקשת העזרה', descPlaceholder: 'פרט מה קרה ובמה נדרשת עזרה...', locationPlaceholder: 'מיקום - רחוב, שכונה...' },
        5: { descLabel: 'תיאור הכלב', descPlaceholder: 'גזע, צבע, שם הכלב, מתי ואיפה נעלם...', locationPlaceholder: 'אזור שאבד לאחרונה...' },
    };

    function handleModalImageChange(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const MAX = 900;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const src = ev.target?.result as string;
            const img = new Image();
            img.onload = () => {
                let w = img.naturalWidth, h = img.naturalHeight;
                if (w > MAX || h > MAX) {
                    const r = Math.min(MAX / w, MAX / h);
                    w = Math.round(w * r); h = Math.round(h * r);
                }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
                const b64 = canvas.toDataURL('image/jpeg', 0.82);
                modalImageBase64 = b64; modalImagePreview = b64;
            };
            img.src = src;
        };
        reader.readAsDataURL(file);
    }

    // מצב חיפוש
    let searchQuery   = $state('');
    let searchResults = $derived(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return [];
        return dbItems.filter(item =>
            item.label?.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q) ||
            item.category?.toLowerCase().includes(q)
        ).sort((a, b) => {
            // השכונה שלך - ראשון
            const aNeigh = a.neighborhood === neighborhoodState.neighborhood ? 0 : 1;
            const bNeigh = b.neighborhood === neighborhoodState.neighborhood ? 0 : 1;
            if (aNeigh !== bNeigh) return aNeigh - bNeigh;
            // אחר כך העיר
            const aCity = a.city === neighborhoodState.city ? 0 : 1;
            const bCity = b.city === neighborhoodState.city ? 0 : 1;
            return aCity - bCity;
        });
    });

    // פריטים מהשכונה הנוכחית - ריאקטיבי לשינויי neighborhoodState
    let neighborhoodDbItems = $derived(
        dbItems.filter(d =>
            d.neighborhood === neighborhoodState.neighborhood ||
            (d.neighborhood === '' && d.city === neighborhoodState.city)
        )
    );
    let hasShownListAnimation = $state(false); // עקוב אם כבר הראינו את האנימציה
    let communityHelpCount = $state(135);
    const currentYear = new Date().getFullYear();

    // אנימציה של רשימה פעם אחת בלבד אחרי 15 שניות מכניסה לאתר
    let listAnimationTimeout: ReturnType<typeof setTimeout> | null = null;

    // מיפוי שכונות לכתובות Google Maps
    const neighborhoodMaps: Record<string, string> = {
        // ירושלים
        "קרית משה":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3391.8864700000003!2d35.21371!3d31.768319!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d7d634c1f8b9%3A0x1028fca4a63b44a!2z15nXqNeV16nXnNep150!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        רחביה: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3390.5!2d35.2137!3d31.7683!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d6df05982a2b%3A0x6f71c4d0e73b7e0a!2z16jXl9eR15nXlA!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        "גבעת שאול":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3389.2!2d35.1937!3d31.7883!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d6c234567890%3A0x1234567890abcdef!2z15ble16LXqiDXqNeqSDXqdei15XXnA!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        רמות: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3387.8!2d35.2337!3d31.8083!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d5e123456789%3A0x9876543210fedcba!2z16jXnteV16o!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        גילה: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3393.1!2d35.2437!3d31.7483!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d8f987654321%3A0xabcdef1234567890!2z15ble15nXnNeU!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        קטמון: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3392.3!2d35.2237!3d31.7583!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d7f456789012%3A0x2468ace013579bdf!2z16fXmNeY157XldefXnA!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        בקעה: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3391.5!2d35.2037!3d31.7683!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d6e789012345%3A0x13579bdf2468ace0!2z15HXp16LXlNeU!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        "מעלות דפנה":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3388.7!2d35.2537!3d31.7983!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d5d012345678%3A0xfedcba0987654321!2z157Xotec15XXqiDXk9ek16DXlA!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",

        // תל אביב
        "רמת אביב":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3378.2!2d34.7937!3d32.1183!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4ca6193b7c1f%3A0x8b5e5b5e5b5e5b5e!2z16jXnteqINeQ15HXmdeR!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        פלורנטין:
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3381.5!2d34.7637!3d32.0583!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4b36e5f6789a%3A0x1a2b3c4d5e6f7890!2z16TXnNeV16jXoNeY15nXnQ!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        "נווה צדק":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3381.8!2d34.7537!3d32.0483!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4b2f123456ab%3A0xabcdef0123456789!2z16DXldeV15Ug16bXk9en!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        "יפו העתיקה":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3382.1!2d34.7437!3d32.0383!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4b1e987654cd%3A0x9876543210fedcba!2z15nXpNeVINeU16LXqteZ15fXlA!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        "רמת החייל":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3379.5!2d34.8037!3d32.0983!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4d5a456789ef%3A0x2468ace013579bdf!2z16jXnteqINeU15fXmdeZ15w!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",

        // חיפה
        "כרמל צרפתי":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3348.2!2d34.9837!3d32.7983!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151dcf123456789a%3A0x1234567890abcdef!2z15vXqNee15wg16bXqNek16rXmQ!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        "נווה שאנן":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3349.1!2d34.9737!3d32.7883!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151dcf987654321b%3A0xfedcba0987654321!2z16DXldeV15Ug16nXkNeQ16DXnQ!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        "רמת אלמוגי":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3347.5!2d34.9937!3d32.8083!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151dcf456789012c%3A0x13579bdf2468ace0!2z16jXnteqINeQ15zXnteV15LXmQ!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        "בת גלים":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3350.2!2d34.9637!3d32.7783!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151dcf789012345d%3A0x2468ace013579bdf!2z15HXqiDXnNec15nXnQ!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",

        // נתניה
        "קרית השרון":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3365.2!2d34.8537!3d32.3283!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4f123456789e%3A0x1234567890abcdef!2z16fXqNeZ16rXqiDXlNep16jXldefXnA!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        "רמת פולג":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3364.8!2d34.8637!3d32.3383!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4f987654321f%3A0xfedcba0987654321!2z16jXnteqINeR15XXnNeL!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        "נווה גנים":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3366.1!2d34.8437!3d32.3183!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4f456789012g%3A0x13579bdf2468ace0!2z16DXldeV15Ug15LXoNeZ150!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
    };

    // פונקציה לקבלת כתובת המפה
    function getMapUrl(): string {
        const key = neighborhoodState.neighborhood;
        return neighborhoodMaps[key] || neighborhoodMaps["קרית משה"]; // ברירת מחדל
    }

    // מיפוי בין קטגוריות לסימונים במפה
    const categoryMarkers: Record<string, string[]> = {
        benefits: [
            "gemach-books",
            "babysitter-shira",
            "minyan-shacharit",
            "shop-makolet",
            "giveaway-sofa",
            "activity-soccer",
        ],
        gemachim: ["gemach-books"],
        giveaway: ["giveaway-sofa"],
        business: ["babysitter-shira"],
        minyanim: ["minyan-shacharit"],
        shops: ["shop-makolet"],
        restaurants: ["pizza-local", "falafel-hot"],
        rides: ["ride-jerusalem"],
        for_kids: ["jamboree"],
        attractions: ["attraction-park", "attraction-museum"],
        education: ["activity-soccer"],
        "safe-space": ["safe-1"],
    };

    const mapMarkers = [
        {
            id: "gemach-books",
            category: "gemachim",
            top: "25%",
            left: "30%",
            icon: "🎁",
            label: 'גמ"ח ספרים',
            color: "purple",
        },
        {
            id: "babysitter-shira",
            category: "business",
            top: "40%",
            left: "60%",
            icon: "👶",
            label: "בייבי סיטר (שירה)",
            color: "pink",
        },
        {
            id: "minyan-shacharit",
            category: "minyanim",
            top: "60%",
            left: "25%",
            icon: "✡️",
            label: "מניין שחרית",
            color: "blue",
        },
        {
            id: "shop-makolet",
            category: "shops",
            top: "35%",
            left: "75%",
            icon: "🏪",
            label: "מכולת 24/7",
            color: "green",
        },
        {
            id: "giveaway-sofa",
            category: "giveaway",
            top: "70%",
            left: "55%",
            icon: "📦",
            label: "ספה למסירה",
            color: "orange",
        },
        {
            id: "activity-soccer",
            category: "education",
            top: "50%",
            left: "45%",
            icon: "🎨",
            label: "חוג כדורגל",
            color: "red",
        },
        {
            id: "pizza-local",
            category: "restaurants",
            top: "45%",
            left: "20%",
            icon: "🍕",
            label: "פיצה השכונה",
            color: "orange",
        },
        {
            id: "ride-jerusalem",
            category: "rides",
            top: "80%",
            left: "40%",
            icon: "🚗",
            label: "טרמפים",
            color: "green",
        },
        {
            id: "jamboree",
            category: "for_kids",
            top: "15%",
            left: "65%",
            icon: "🎈",
            label: "ג'ימבורי",
            color: "pink",
        },
        {
            id: "attraction-park",
            category: "attractions",
            top: "10%",
            left: "15%",
            icon: "🎡",
            label: "פארק שעשועים",
            color: "indigo",
        },
        {
            id: "attraction-museum",
            category: "attractions",
            top: "20%",
            left: "85%",
            icon: "🏛️",
            label: "מוזיאון המדע",
            color: "indigo",
        },
        {
            id: "safe-1",
            category: "safe-space",
            top: "30%",
            left: "50%",
            icon: "🛡️",
            label: "מרחב מוגן",
            color: "yellow",
        },
    ];

    function isMarkerVisible(markerId: string): boolean {
        if (selectedCategory === "benefits") return true;
        const visibleMarkers = categoryMarkers[selectedCategory] || [];
        return visibleMarkers.includes(markerId);
    }

    function handleCategoryClick(categoryId: string) {
        selectedCategory = categoryId;
    }

    // citiesAndNeighborhoods imported from $lib/neighborhoodsData

    const helpOptions = [
        { id: 3, text: "הלך ילד לאיבוד", icon: "👶" },
        { id: 5, text: "אבד כלב", icon: "🐕" },
        { id: 1, text: "מבוגר זקוק לעזרה", icon: "👴" },
        { id: 2, text: "זקוק לעזרה עם הרכב להתנעה", icon: "🚗" },
        { id: 4, text: "אחר - כתוב את העזרה הזקוקה לך", icon: "✍️" },
    ];

    // Automatic switching was removed as per user request to keep it manual

    function handleMouseEnter() {
        isMouseOver = true;
    }

    function handleMouseLeave() {
        isMouseOver = false;
    }

    function toggleMenu() {
        showNeighborhoodsMenu = !showNeighborhoodsMenu;
        selectedCity = "";
        dispatch("toggleMenu");
    }

    // Public method that can be called from parent
    export function openMenu() {
        showNeighborhoodsMenu = true;
        selectedCity = "";
    }

    function selectCity(city: string) {
        selectedCity = selectedCity === city ? "" : city;
    }

    function selectNeighborhood(city: string, neighborhood: string) {
        neighborhoodState.select(neighborhood, city);
        showNeighborhoodsMenu = false;
        selectedCity = "";
    }

    onMount(() => {
        // אתחל שכונה מ-localStorage (אם הדף הראשי לא אתחל כבר)
        neighborhoodState.init();

        // אנימציה של רשימה פעם אחת בלבד! מצוין כמשיכת תשומת לב
        listAnimationTimeout = setTimeout(() => {
            // בצע רק אם המשתמש לא לחץ או שינה לפני כן
            if (
                !hasShownListAnimation &&
                !userInteracted &&
                !showAddMenu &&
                viewMode === "map"
            ) {
                hasShownListAnimation = true;
                isAutoSwitching = true;

                // עבור לרשימה
                isFlipping = true;
                setTimeout(() => {
                    viewMode = "list";
                }, 350);
                setTimeout(() => {
                    isFlipping = false;
                }, 700);

                // חזור למפה אחרי 3.5 שניות
                setTimeout(() => {
                    if (!userInteracted && viewMode === "list") {
                        isFlipping = true;
                        setTimeout(() => {
                            viewMode = "map";
                        }, 350);
                        setTimeout(() => {
                            isFlipping = false;
                            isAutoSwitching = false;
                        }, 700);
                    } else {
                        isAutoSwitching = false;
                    }
                }, 3500);
            }
        }, 8000); // 8 שניות

        // סגירת תפריט כשלוחצים מחוץ לו
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (
                showNeighborhoodsMenu &&
                !target.closest(".neighborhoods-menu-container")
            ) {
                showNeighborhoodsMenu = false;
                selectedCity = "";
            }
        };

        document.addEventListener("click", handleClickOutside);

        // Mobile scroll indicators logic - simplified
        const setupScrollIndicators = () => {
            const buttonsContainer = document.querySelector(
                ".category-buttons-container",
            ) as HTMLElement;
            if (!buttonsContainer) return;

            // Scrollable on mobile via touch/swipe (no arrow buttons needed)
        };

        // Setup scroll indicators after DOM is ready
        setupScrollIndicators();

        return () => {
            if (listAnimationTimeout) {
                clearTimeout(listAnimationTimeout);
            }
            document.removeEventListener("click", handleClickOutside);
        };
    });

    function handleViewToggle(isAutoParam = false) {
        if (showAddMenu) showAddMenu = false;

        const isAuto = isAutoParam === true; // וודא שזה בוליאני ולא אובייקט אירוע

        isFlipping = true;
        setTimeout(() => {
            const newViewMode = viewMode === "map" ? "list" : "map";
            viewMode = newViewMode;
            // אם חוזרים למפה, אפס את userInteracted כדי שהספירה תתחיל מחדש
            if (newViewMode === "map") {
                userInteracted = false;
            } else {
                // אם הולכים לרשימה, סמן שהיה אינטראקציה רק אם זה לא אוטומטי
                userInteracted = !isAuto;
            }
        }, 350); // Change content at middle of animation
        setTimeout(() => {
            isFlipping = false;
        }, 700);
    }

    function handleAddAdvantage() {
        showAddMenu = !showAddMenu;
    }

    function toggleCategory(categoryId: string) {
        const next = new Set(expandedCategories);
        if (next.has(categoryId)) {
            next.delete(categoryId);
        } else {
            next.add(categoryId);
        }
        expandedCategories = next;
    }

    function handleAddItem(categoryId: string) {
        showAddMenu = false;
        goto(`/add/${categoryId}`);
    }

    function handleHelpRequest(optionId: number) {
        if (showAddMenu) showAddMenu = false;
        showHelpMenu = false;

        // פתח מודל על דף הבית במקום לנווט לדף אחר
        modalOptionId = optionId;
        modalSubmitted = false;
        modalError = '';
        modalImageBase64 = '';
        modalImagePreview = '';
        showRaiseHandModal = true;
        return;

        // הקוד שלמטה נשמר כ-fallback אם הניווט נכשל
        const option = helpOptions.find((o) => o.id === optionId);
        const wasNotInMapView = viewMode !== "map";

        // עבור לתצוגת מפה כדי לראות את הגלים
        if (wasNotInMapView) {
            isFlipping = true;
            setTimeout(() => {
                viewMode = "map";
                userInteracted = false;
            }, 350);
            setTimeout(() => {
                isFlipping = false;
            }, 700);
        }

        // הפעל אנימציית גלים אחרי מעבר למפה
        setTimeout(
            () => {
                showWaves = true;
                handRaised = true; // סמן שהיד מורמת
                raisedHandMessage = option?.text || "";
                raisedHandIcon = option?.icon || "🆘";

                // כבה את הגלים אחרי 2 שניות
                setTimeout(() => {
                    showWaves = false;
                }, 2000);
            },
            wasNotInMapView ? 750 : 0,
        );

        if (optionId === 4) {
            // אפשרות "אחר" - פתח טופס
            setTimeout(
                () => {
                    const customHelp = prompt("תאר את העזרה שאתה זקוק לה:");
                    if (customHelp) {
                        raisedHandMessage = customHelp;
                        successMessageText = `בקשת עזרה נשלחה: ${customHelp}`;
                        showSuccessMessage = true;
                        setTimeout(() => {
                            showSuccessMessage = false;
                        }, 3000);
                    } else {
                        // אם ביטל - הורד את היד
                        handRaised = false;
                        raisedHandMessage = "";
                        raisedHandIcon = "";
                    }
                },
                wasNotInMapView ? 850 : 100,
            );
        } else {
            setTimeout(
                () => {
                    successMessageText = `בקשת עזרה נשלחה: ${option?.text}`;
                    showSuccessMessage = true;
                    setTimeout(() => {
                        showSuccessMessage = false;
                    }, 3000);
                },
                wasNotInMapView ? 750 : 0,
            );
        }
    }

    function handleLowerHand() {
        showSurvey = true;
    }

    function handleSurveyResponse(response: "community" | "other" | "cancel") {
        if (response === "community") {
            communityHelpCount = communityHelpCount + 1;
            successMessageText = "תודה! שמחים שהקהילה עזרה 🎉";
            showSuccessMessage = true;
            setTimeout(() => {
                showSuccessMessage = false;
            }, 3000);
        } else if (response === "other") {
            successMessageText = "תודה על המשוב! 👍";
            showSuccessMessage = true;
            setTimeout(() => {
                showSuccessMessage = false;
            }, 3000);
        }

        if (response !== "cancel") {
            handRaised = false;
            raisedHandMessage = "";
            raisedHandIcon = "";
        }
        showSurvey = false;
    }
</script>

<div class="flex flex-col gap-4">
    <div class="flex flex-col gap-4">
        <!-- כותרת שכונה - הוסרה לדף הראשי -->

        <div class="flex flex-col gap-2">
            <!-- Buttons Container with left-edge fade for mobile -->
            <div class="relative">
                <!-- fade on left edge: indicates hidden buttons off-screen (RTL) -->
                <div class="md:hidden pointer-events-none absolute top-0 left-0 bottom-0 w-6 z-10" style="background: linear-gradient(to right, rgba(7,11,20,0.75) 0%, transparent);"></div>
            <div
                class="category-buttons-container flex flex-nowrap md:flex-wrap justify-start md:justify-between gap-2 md:gap-x-2 md:gap-y-3 overflow-x-auto md:overflow-x-visible px-4 py-3 md:p-2 w-full"
            >
                {#each categories as category, index}
                    <button
                        onclick={() => handleCategoryClick(category.id)}
                        title="לחץ כדי לסנן במפה"
                        class="flex items-center justify-center gap-1.5 {selectedCategory === category.id
                            ? category.id === 'benefits'
                                ? 'bg-gradient-to-br from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-gray-900 border-yellow-500 ring-2 ring-yellow-300'
                                : 'bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-purple-500 ring-2 ring-purple-300'
                            : category.id === 'benefits'
                              ? 'bg-gradient-to-br from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-gray-900 border-yellow-500'
                              : 'bg-gradient-to-br from-white to-gray-200 hover:from-blue-100 hover:to-white text-gray-900 border-purple-300'} px-3 py-2 md:py-1.5 rounded-full md:rounded-lg text-sm md:text-xs font-bold shadow-lg transition-all hover:scale-105 border shrink-0 whitespace-nowrap md:flex-1 md:min-w-[15%] map-category-button"
                    >
                        <span
                            class="text-lg md:text-base icon"
                            style={category.id === "realestate"
                                ? "letter-spacing: -0.25em; margin-left: 0.15em; display: inline-block;"
                                : ""}>{category.icon}</span
                        >
                        {category.label}
                    </button>
                {/each}
            </div>
            </div><!-- /relative wrapper -->
        </div>
    </div>

    <!-- Map Container -->
    <div
        role="region"
        aria-label="Map and List View Container"
        class="relative w-full border-8 md:border-4 border-purple-600 shadow-2xl bg-[#0f172a] mb-8 transition-all duration-700"
        style="border-radius: 24px; transform-style: preserve-3d;"
        class:flipping-container={isFlipping}
        onmouseenter={handleMouseEnter}
        onmouseleave={handleMouseLeave}
    >
        <!-- כפתור מעבר תצוגה - משולש מקופל בפינה -->
        <button
            onclick={() => handleViewToggle(false)}
            class="page-corner absolute top-0 left-0 z-30 transition-all duration-500 hover:scale-110"
            class:flipping={isFlipping}
            class:auto-switching={isAutoSwitching}
            class:menu-open={showHelpMenu || showSurvey}
            style="position: absolute; top: 0; left: 0;"
            aria-label={viewMode === "map" ? "עבור לתצוגת רשימה" : "עבור לתצוגת מפה"}
        >
            <svg
                width="130"
                height="130"
                viewBox="0 0 130 130"
                class="transition-transform duration-500"
                aria-hidden="true"
                focusable="false"
            >
                <path
                    d="M 0,24 Q 0,0 24,0 L 130,0 L 0,130 Z"
                    fill="#9333ea"
                    class="transition-all duration-500"
                />
                <text
                    x="52"
                    y="42"
                    fill="white"
                    font-size="14"
                    font-weight="bold"
                    transform="rotate(-45 52 42)"
                    text-anchor="middle"
                    class="pointer-events-none"
                >
                    {viewMode === "map" ? "עבור לתצוגת" : "עבור לתצוגת"}
                </text>
                <text
                    x="60"
                    y="58"
                    fill="white"
                    font-size="14"
                    font-weight="bold"
                    transform="rotate(-45 60 58)"
                    text-anchor="middle"
                    class="pointer-events-none"
                >
                    {viewMode === "map" ? "רשימה" : "מפה"}
                </text>
            </svg>
        </button>

        {#if viewMode === "map"}
            <!-- תצוגת מפה -->
            <div
                class="w-full h-[350px] md:h-[450px] overflow-hidden relative"
                style="border-radius: 20px;"
            >
                <!-- אנימציית גלים -->
                {#if showWaves}
                    <div
                        class="absolute inset-0 flex items-end justify-center pointer-events-none z-10"
                    >
                        <div class="wave-container">
                            <div class="wave wave-1"></div>
                            <div class="wave wave-2"></div>
                            <div class="wave wave-3"></div>
                            <div class="wave wave-4"></div>
                        </div>
                    </div>
                {/if}

                <!-- בועת בקשת עזרה -->
                {#if handRaised && raisedHandMessage}
                    <div
                        class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
                    >
                        <div
                            class="bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl border-4 border-yellow-400 max-w-md"
                        >
                            <div class="flex items-center gap-4">
                                <span class="text-5xl">{raisedHandIcon}</span>
                                <div>
                                    <p class="font-black text-xl mb-1">
                                        🚨 בקשת עזרה פעילה
                                    </p>
                                    <p class="text-lg font-bold">
                                        {raisedHandMessage}
                                    </p>
                                    <p class="text-sm text-yellow-200 mt-2">
                                        ממתין לעזרה מהקהילה...
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- סמנים על המפה -->
                <div class="absolute inset-0 z-10 pointer-events-none">
                    {#each mapMarkers as marker}
                        {#if isMarkerVisible(marker.id)}
                            <a
                                href="/items/{marker.id}"
                                class="absolute transition-all duration-500 pointer-events-auto group/marker"
                                style="top: {marker.top}; left: {marker.left};"
                                onclick={(e) => {
                                    if (window.innerWidth < 1024) {
                                        e.preventDefault();
                                        triggerAdPopup(`/items/${marker.id}`);
                                    }
                                }}
                            >
                                <div
                                    class="text-center animate-fadeIn transform transition-transform group-hover/marker:scale-110"
                                >
                                    <span
                                        class="text-3xl drop-shadow-lg block group-hover/marker:bounce"
                                        >{marker.icon}</span
                                    >
                                    <div
                                        class="bg-{marker.color}-600 text-white text-xs px-2 py-1 rounded mt-1 whitespace-nowrap font-bold shadow-lg group-hover/marker:bg-{marker.color}-500 transition-colors"
                                    >
                                        {marker.label}
                                    </div>
                                </div>
                            </a>
                        {/if}
                    {/each}
                </div>

                <iframe
                    title="מפת {neighborhoodState.neighborhood}, {neighborhoodState.city}"
                    width="100%"
                    height="100%"
                    style="border:0"
                    src={getMapUrl()}
                    allowfullscreen
                    loading="lazy"
                    referrerpolicy="no-referrer-when-downgrade"
                >
                </iframe>

                <!-- Badge לפריטים חדשים בשכונה -->
                {#if neighborhoodDbItems.length > 0}
                    <button
                        onclick={() => handleViewToggle(false)}
                        class="absolute bottom-4 left-4 z-20 bg-green-600/90 backdrop-blur-sm text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg border border-green-400/50 hover:bg-green-500/90 transition-all hover:scale-105"
                        title="עבור לרשימה לצפייה בפריטים החדשים"
                    >
                        🆕 {neighborhoodDbItems.length} פריטים ב{neighborhoodState.neighborhood} - לחץ לצפייה
                    </button>
                {/if}
            </div>
        {:else if viewMode === "list"}
            <!-- תצוגת רשימה -->
            <div
                class="w-full h-[350px] md:h-[450px] overflow-y-auto p-3 md:p-6 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-purple-900/20"
                style="border-radius: 20px;"
            >
                <div class="space-y-2 md:space-y-3">
                    {#each categories.filter((cat) => cat.id !== "benefits") as category}
                        {@const categoryDbItems = dbItems.filter(d =>
                            d.category === category.id &&
                            (d.neighborhood === neighborhoodState.neighborhood ||
                             (d.neighborhood === '' && d.city === neighborhoodState.city))
                        )}
                        {@const totalItems = (category.items?.length || 0) + categoryDbItems.length}
                        {@const hasNationalPage = ['singles','security','attractions','jobs'].includes(category.id)}
                        <div
                            class="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg md:rounded-xl overflow-hidden transition-all"
                        >
                            <button
                                onclick={() => toggleCategory(category.id)}
                                class="w-full p-2 md:p-4 hover:border-purple-500 transition-all hover:bg-purple-900/20 cursor-pointer"
                            >
                                <div class="flex items-center justify-between">
                                    <div
                                        class="flex items-center gap-2 md:gap-3"
                                    >
                                        <span
                                            class="text-2xl md:text-xl md:text-3xl"
                                            >{category.icon}</span
                                        >
                                        <span
                                            class="text-white font-bold text-base md:text-sm md:text-lg"
                                            >{category.label}</span
                                        >
                                        {#if categoryDbItems.length > 0}
                                            <span class="bg-green-500/20 border border-green-500/40 text-green-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                                                🆕 {categoryDbItems.length} חדש
                                            </span>
                                        {/if}
                                        {#if hasNationalPage}
                                            <!-- קישור ארצי - ליד שם הקטגוריה בשורת הכותרת -->
                                            <span
                                                role="link"
                                                tabindex="0"
                                                onclick={(e) => { e.stopPropagation(); goto(`/national/${category.id}`); }}
                                                onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); goto(`/national/${category.id}`); } }}
                                                class="text-[11px] text-purple-400 hover:text-purple-300 cursor-pointer
                                                       underline underline-offset-2 decoration-purple-500/40 hover:decoration-purple-400
                                                       transition-colors font-medium whitespace-nowrap"
                                            >← לרשימה הארצית</span>
                                        {/if}
                                    </div>
                                    <div
                                        class="flex items-center gap-2 md:gap-3"
                                    >
                                        <span
                                            class="text-purple-400 text-sm md:text-xs md:text-sm"
                                            >{totalItems} פריטים</span
                                        >
                                        <svg
                                            class="w-5 h-5 md:w-4 md:h-4 md:w-6 md:h-6 text-purple-400 transition-transform duration-300 {expandedCategories.has(
                                                category.id,
                                            )
                                                ? 'rotate-180'
                                                : ''}"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M19 9l-7 7-7-7"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </button>


                            {#if expandedCategories.has(category.id)}
                                <div
                                    class="px-4 pb-4 space-y-2 animate-slideDown"
                                >
                                    <!-- פריטים סטטיים קיימים -->
                                    {#each category.items ?? [] as item}
                                        <a
                                            href="/items/{item.id}"
                                            class="bg-purple-900/20 border border-purple-500/20 rounded-lg p-3 hover:bg-purple-900/30 hover:border-purple-500/40 transition-all cursor-pointer flex items-center justify-between group/item"
                                        >
                                            <span class="text-white text-sm"
                                                >• {item.label}</span
                                            >
                                            <div
                                                class="bg-purple-600 group-hover/item:bg-purple-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                                            >
                                                צפה בפרטים
                                            </div>
                                        </a>
                                    {/each}

                                    <!-- פריטים מה-DB (חדשים) -->
                                    {#each categoryDbItems as dbItem}
                                        <a
                                            href="/items/{dbItem.id}"
                                            class="bg-green-900/15 border border-green-500/25 rounded-lg p-3 hover:bg-green-900/25 hover:border-green-500/40 transition-all cursor-pointer flex items-center justify-between group/item"
                                        >
                                            <div class="flex items-center gap-2 min-w-0">
                                                <span class="text-lg flex-shrink-0">{dbItem.icon}</span>
                                                <div class="min-w-0">
                                                    <span class="text-white text-sm block truncate">• {dbItem.label}</span>
                                                    {#if dbItem.neighborhood}
                                                        <span class="text-gray-500 text-xs">{dbItem.neighborhood}</span>
                                                    {/if}
                                                </div>
                                                <span class="bg-green-500/20 text-green-400 text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0">חדש</span>
                                            </div>
                                            <div
                                                class="bg-green-700 group-hover/item:bg-green-600 text-white px-3 py-1 rounded text-xs font-bold transition-colors flex-shrink-0 mr-2"
                                            >
                                                צפה בפרטים
                                            </div>
                                        </a>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        {#if showAddMenu}
            <!-- תצוגת הוספת יתרון (וילון גלילה) -->
            <div
                transition:slide={{ duration: 400 }}
                class="absolute top-0 inset-x-0 w-full h-full min-h-[350px] md:min-h-[450px] overflow-y-auto p-6 pt-12 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-purple-900/20 bg-[#0f172a] shadow-2xl z-40"
                style="border-radius: 18px;"
            >
                <div class="grid grid-cols-2 gap-2 md:gap-3">
                    {#each categories.filter((cat) => cat.id !== "benefits") as category}
                        <button
                            onclick={() => handleAddItem(category.id)}
                            class="w-full bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-xl p-2 md:p-3 hover:border-green-500 hover:from-green-900/40 hover:to-emerald-900/40 transition-all cursor-pointer"
                        >
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-1.5 md:gap-2">
                                    <span class="text-xl md:text-2xl"
                                        >{category.icon}</span
                                    >
                                    <span
                                        class="text-white font-bold text-xs md:text-sm"
                                        >{category.label}</span
                                    >
                                </div>
                                <div class="flex items-center">
                                    <span
                                        class="text-lg md:text-xl text-green-400"
                                        >➕</span
                                    >
                                </div>
                            </div>
                        </button>
                    {/each}
                </div>
            </div>
        {:else if viewMode === "search"}
            <!-- מצב חיפוש -->
            <div class="w-full h-[350px] md:h-[450px] flex flex-col p-3 md:p-5" style="border-radius: 20px;">
                <!-- שדה חיפוש -->
                <div class="flex gap-2 mb-4 mt-16 max-w-sm mx-auto w-full">
                    <input
                        bind:value={searchQuery}
                        type="text"
                        placeholder="חפש חוג, גמ&quot;ח, שמרטפ, מניין..."
                        autofocus
                        class="flex-1 bg-white/8 border border-white/20 rounded-xl px-5 py-3.5
                               text-white placeholder:text-gray-500 text-base focus:outline-none
                               focus:border-purple-500/60 transition-colors"
                        dir="rtl"
                    />
                    {#if searchQuery}
                        <button
                            onclick={() => searchQuery = ''}
                            class="text-gray-400 hover:text-white px-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-base cursor-pointer"
                        >✕</button>
                    {/if}
                </div>

                <!-- תוצאות -->
                <div class="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-transparent">
                    {#if !searchQuery.trim()}
                        <div class="text-center py-4 text-gray-500">
                            <div class="text-4xl mb-3">🔍</div>
                            <p class="text-sm">הקלד מה אתה מחפש</p>
                        </div>
                        <div class="flex justify-center mt-3">
                            <img src="/images/vaadei-search.png" alt="" class="max-w-[320px] w-full rounded-xl opacity-80" />
                        </div>
                    {:else if searchResults().length === 0}
                        <div class="text-center py-12 text-gray-500">
                            <div class="text-4xl mb-3">😕</div>
                            <p class="text-sm">לא נמצאו תוצאות</p>
                        </div>
                    {:else}
                        <p class="text-xs text-gray-500 mb-2">{searchResults().length} תוצאות</p>
                        {#each searchResults() as item}
                            <a
                                href="/items/{item.id}"
                                class="flex items-center gap-3 bg-white/4 hover:bg-white/8 border border-white/8 hover:border-purple-500/40 rounded-xl px-3 py-2.5 transition-all"
                            >
                                <span class="text-xl flex-shrink-0">{item.icon ?? '📌'}</span>
                                <div class="min-w-0 flex-1">
                                    <p class="text-white font-bold text-sm truncate">{item.label}</p>
                                    {#if item.description}
                                        <p class="text-gray-400 text-xs line-clamp-1">{item.description}</p>
                                    {/if}
                                </div>
                                {#if item.neighborhood === neighborhoodState.neighborhood}
                                    <span class="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full flex-shrink-0">השכונה שלך</span>
                                {:else if item.city === neighborhoodState.city}
                                    <span class="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full flex-shrink-0">{item.city}</span>
                                {/if}
                            </a>
                        {/each}
                    {/if}
                </div>
            </div>
        {/if}


        <!-- כפתור חיפוש - פינה ימנית עליונה -->
        <div class="absolute right-4 z-50" style="top: -14px;">
            <button
                onclick={() => { viewMode = viewMode === 'search' ? 'list' : 'search'; searchQuery = ''; }}
                title="חיפוש"
                class="flex items-center gap-1.5 bg-[#0f172a] border-2 {viewMode === 'search' ? 'border-purple-500 text-purple-300' : 'border-white/20 text-white/70'} hover:border-purple-500/70 hover:text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-xl transition-all hover:scale-105"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="7"/>
                    <path d="m21 21-4.35-4.35"/>
                </svg>
                <span class="text-xs hidden md:inline">חיפוש</span>
            </button>
        </div>

        <!-- כפתור הוסף יתרון - בחלק העליון -->
        <div
            class="absolute left-1/2 transform -translate-x-1/2 z-50"
            style="top: -10px;"
        >
            <button
                onclick={handleAddAdvantage}
                title={showAddMenu ? "סגור תפריט" : "הוסף יתרון חדש לשכונה"}
                class="relative group overflow-hidden bg-gradient-to-br {showAddMenu
                    ? 'from-green-900 via-emerald-900 to-teal-950'
                    : 'from-green-500 via-emerald-500 to-teal-600'} hover:{showAddMenu
                    ? 'from-green-800 via-emerald-800 to-teal-900'
                    : 'from-green-400 via-emerald-400 hover:to-teal-500'} text-white px-3 py-1.5 rounded-lg font-bold text-base shadow-xl transition-all hover:scale-105 border-2 {showAddMenu
                    ? 'border-red-500'
                    : 'border-purple-600'}"
            >
                <div
                    class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-once"
                ></div>
                <div class="relative flex flex-row items-center justify-center gap-1.5 whitespace-nowrap">
                    <span class="text-[10px] leading-none">{showAddMenu ? "✖️" : "➕"}</span>
                    <span class="leading-none">{showAddMenu ? "סגור" : "הוסף"}</span>
                </div>
            </button>
        </div>

        <!-- כפתור הרמת יד מיוחד - בתחתית המפה -->
        <div
            class="absolute -bottom-8 md:-bottom-8 left-1/2 transform -translate-x-1/2 z-50"
        >
            {#if !handRaised}
                <!-- כפתור הרמת יד רגיל -->
                <button
                    onclick={() => (showHelpMenu = !showHelpMenu)}
                    title="בקש עזרה מהקהילה"
                    class="relative group overflow-hidden bg-gradient-to-br from-red-500 via-pink-500 to-purple-600 hover:from-red-400 hover:via-pink-400 hover:to-purple-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-bold text-sm md:text-base shadow-xl transition-all hover:scale-105 border-2 md:border-4 border-purple-600"
                >
                    <div
                        class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-once"
                    ></div>
                    <div class="relative flex items-center gap-2 md:gap-3">
                        <span class="text-xl md:text-2xl">✋</span>
                        <span>הרמת יד</span>
                    </div>
                </button>
            {:else}
                <!-- כפתור יד מורמת -->
                <button
                    onclick={handleLowerHand}
                    title="הורד את היד"
                    class="relative group overflow-hidden bg-gradient-to-br from-yellow-500 via-orange-500 to-red-600 hover:from-yellow-400 hover:via-orange-400 hover:to-red-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-bold text-sm md:text-base shadow-xl transition-all hover:scale-105 border-2 md:border-4 border-yellow-400 animate-pulse"
                >
                    <div class="relative flex items-center gap-2 md:gap-3">
                        <span class="text-xl md:text-2xl">🙋</span>
                        <span>יד מורמת - לחץ להורדה</span>
                    </div>
                </button>
            {/if}

            <!-- תפריט עזרה -->
            {#if showHelpMenu}
                <div
                    class="fixed md:absolute bottom-24 md:bottom-full left-1/2 transform -translate-x-1/2 md:mb-2 w-80 max-w-[90vw] bg-white rounded-xl shadow-2xl border-2 border-purple-600 overflow-hidden animate-slideDown z-[100]"
                >
                    <div
                        class="bg-gradient-to-r from-red-500 to-pink-500 p-3 text-center"
                    >
                        <h3 class="text-white font-bold text-lg">פתח קריאה</h3>
                    </div>
                    <div class="p-2">
                        {#each helpOptions as option}
                            <button
                                onclick={() => handleHelpRequest(option.id)}
                                class="w-full flex items-center gap-3 p-3 hover:bg-red-50 rounded-lg transition-colors text-right border-b border-gray-200 last:border-b-0"
                            >
                                <span class="text-2xl">{option.icon}</span>
                                <span class="text-gray-800 font-medium text-sm"
                                    >{option.text}</span
                                >
                            </button>
                        {/each}
                    </div>
                    <button
                        onclick={() => (showHelpMenu = false)}
                        class="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 text-sm font-bold transition-colors"
                    >
                        ביטול
                    </button>
                </div>
            {/if}

            <!-- סקר הורדת יד -->
            {#if showSurvey}
                <div
                    class="fixed md:absolute bottom-24 md:bottom-full left-1/2 transform -translate-x-1/2 md:mb-2 w-80 max-w-[90vw] bg-white rounded-xl shadow-2xl border-2 border-yellow-600 overflow-hidden animate-slideDown z-[100]"
                >
                    <div
                        class="bg-gradient-to-r from-yellow-500 to-orange-500 p-3 text-center"
                    >
                        <h3 class="text-white font-bold text-lg">
                            איך הבעיה נפתרה?
                        </h3>
                    </div>
                    <div class="p-4 space-y-3">
                        <button
                            onclick={() => handleSurveyResponse("community")}
                            class="w-full flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border-2 border-green-300"
                        >
                            <span class="text-3xl">🤝</span>
                            <div class="text-right">
                                <p class="font-bold text-green-800">
                                    הקהילה עזרה לי
                                </p>
                                <p class="text-xs text-green-600">
                                    תודה לכולם!
                                </p>
                            </div>
                        </button>
                        <button
                            onclick={() => handleSurveyResponse("other")}
                            class="w-full flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border-2 border-blue-300"
                        >
                            <span class="text-3xl">✅</span>
                            <div class="text-right">
                                <p class="font-bold text-blue-800">
                                    הבעיה נפתרה אחרת
                                </p>
                                <p class="text-xs text-blue-600">
                                    הכל בסדר עכשיו
                                </p>
                            </div>
                        </button>
                    </div>
                    <button
                        onclick={() => handleSurveyResponse("cancel")}
                        class="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 text-sm font-bold transition-colors"
                    >
                        ביטול
                    </button>
                </div>
            {/if}
        </div>
    </div>
</div>

<div class="text-white text-lg text-center mt-2">
    הקהילה עזרה לפתור {communityHelpCount} קריאות בשנת {currentYear}
</div>

<!-- ===== מודל קריאת עזרה ===== -->
{#if showRaiseHandModal}
    <div
        class="fixed inset-0 z-[9999] flex items-start justify-center pt-6 pb-8 px-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
        onclick={(e) => { if (e.target === e.currentTarget) showRaiseHandModal = false; }}
    >
        <div class="w-full max-w-lg" onclick={(e) => e.stopPropagation()} dir="rtl">

            {#if modalSubmitted}
                <!-- מסך הצלחה -->
                <div class="bg-[#1e293b] border border-white/10 rounded-2xl p-8 shadow-2xl text-center mt-8">
                    <div class="text-6xl mb-4">✅</div>
                    <h2 class="text-xl font-black text-white mb-3">הקריאה נשלחה לקהילה!</h2>
                    <p class="text-gray-400 text-sm mb-6">אנחנו על זה - הקהילה תעזור בהקדם</p>
                    <button
                        onclick={() => showRaiseHandModal = false}
                        class="w-full py-3 rounded-xl font-black text-sm bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white shadow-lg transition-all"
                    >
                        סגור
                    </button>
                </div>
            {:else}
                <!-- כותרת -->
                <div class="text-center mb-6 mt-4">
                    <div class="text-5xl mb-3">{helpOptions.find(o => o.id === modalOptionId)?.icon ?? '🆘'}</div>
                    <h1 class="text-2xl font-black text-white mb-1">{helpOptions.find(o => o.id === modalOptionId)?.text ?? 'קריאת עזרה'}</h1>
                    <p class="text-gray-400 text-sm">מלא את הפרטים ונעדכן את הקהילה מיד</p>
                    <div class="mt-3 inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-1.5 text-xs font-bold text-red-400">
                        🆘 קריאת עזרה לקהילה
                    </div>
                </div>

                <!-- כרטיס טופס -->
                <div class="bg-[#1e293b] border border-white/10 rounded-2xl p-6 shadow-2xl">

                    {#if modalError}
                        <div class="mb-4 px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-bold">
                            ⚠️ {modalError}
                        </div>
                    {/if}

                    <form
                        method="POST"
                        action="/raise-hand/add"
                        use:enhance={() => {
                            modalSubmitting = true;
                            return async ({ result }) => {
                                modalSubmitting = false;
                                if (result.type === 'redirect') {
                                    modalSubmitted = true;
                                } else if (result.type === 'failure') {
                                    modalError = (result.data as Record<string, string>)?.error ?? 'שגיאה, נסה שוב';
                                }
                            };
                        }}
                        class="space-y-5"
                    >
                        <input type="hidden" name="option_id" value={modalOptionId} />

                        <!-- תיאור -->
                        <div>
                            <label for="modal-rh-desc" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                                {fieldsByOption[modalOptionId]?.descLabel ?? 'תיאור המצב'} *
                            </label>
                            <textarea
                                id="modal-rh-desc"
                                name="description"
                                rows="4"
                                required
                                placeholder={fieldsByOption[modalOptionId]?.descPlaceholder ?? ''}
                                class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600 resize-none"
                            ></textarea>
                        </div>

                        <!-- מיקום -->
                        <div>
                            <label for="modal-rh-location" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                                מיקום *
                            </label>
                            <input
                                id="modal-rh-location"
                                name="location"
                                type="text"
                                required
                                placeholder={fieldsByOption[modalOptionId]?.locationPlaceholder ?? 'מיקום...'}
                                class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                            />
                        </div>

                        <!-- תמונה -->
                        <div>
                            <p class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                                תמונה (אופציונלי)
                            </p>
                            {#if modalImagePreview}
                                <div class="relative w-full rounded-xl overflow-hidden border border-white/10">
                                    <img src={modalImagePreview} alt="תצוגה מקדימה" class="w-full max-h-52 object-contain bg-black/30" />
                                    <button
                                        type="button"
                                        onclick={() => { modalImageBase64 = ''; modalImagePreview = ''; }}
                                        class="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 text-white text-sm flex items-center justify-center transition-colors"
                                    >✕</button>
                                </div>
                            {:else}
                                <label class="flex flex-col items-center justify-center gap-2 w-full h-24 rounded-xl border-2 border-dashed border-white/15 hover:border-red-500/50 bg-white/3 hover:bg-red-900/10 cursor-pointer transition-all">
                                    <span class="text-2xl">📷</span>
                                    <span class="text-gray-400 text-sm font-bold">לחץ להעלאת תמונה</span>
                                    <input type="file" accept="image/*" class="hidden" onchange={handleModalImageChange} />
                                </label>
                            {/if}
                            <input type="hidden" name="image_base64" value={modalImageBase64} />
                        </div>

                        <!-- יצירת קשר -->
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label for="modal-rh-contact" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                                    שם ליצירת קשר
                                </label>
                                <input
                                    id="modal-rh-contact"
                                    name="contact"
                                    type="text"
                                    placeholder="שם פרטי"
                                    class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                                />
                            </div>
                            <div>
                                <label for="modal-rh-phone" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                                    טלפון *
                                </label>
                                <input
                                    id="modal-rh-phone"
                                    name="phone"
                                    type="tel"
                                    required
                                    placeholder="050-0000000"
                                    class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                                />
                            </div>
                        </div>

                        <!-- שלח -->
                        <button
                            type="submit"
                            disabled={modalSubmitting}
                            class="w-full py-3.5 rounded-xl font-black text-base transition-all
                                {modalSubmitting
                                    ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white shadow-lg hover:shadow-red-500/25'}"
                        >
                            {#if modalSubmitting}
                                שולח קריאת עזרה...
                            {:else}
                                ✋ שלח קריאת עזרה לקהילה
                            {/if}
                        </button>
                    </form>
                </div>

                <!-- סגירה -->
                <div class="text-center mt-5">
                    <button
                        onclick={() => showRaiseHandModal = false}
                        class="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                    >
                        ✕ סגור
                    </button>
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    @keyframes shimmer {
        0% {
            transform: translateX(-100%);
        }
        100% {
            transform: translateX(100%);
        }
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: scale(0.8);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }

    .animate-fadeIn {
        animation: fadeIn 0.5s ease-out;
    }

    @keyframes wave {
        0%,
        100% {
            transform: rotate(0deg);
        }
        25% {
            transform: rotate(-15deg);
        }
        75% {
            transform: rotate(15deg);
        }
    }

    .animate-shimmer-once {
        animation: shimmer 2s ease-in-out 1;
    }

    .animate-wave-once {
        display: inline-block;
        animation: wave 1.5s ease-in-out 1;
    }

    .page-corner {
        cursor: pointer;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        z-index: 30 !important;
    }

    .page-corner.menu-open {
        z-index: 0 !important;
    }

    .page-corner.flipping {
        animation: flip 0.5s ease-in-out;
    }

    @keyframes flip {
        0% {
            transform: rotateY(0deg);
        }
        50% {
            transform: rotateY(90deg);
        }
        100% {
            transform: rotateY(0deg);
        }
    }

    @keyframes peelPage {
        0% {
            transform: rotate(0deg) scale(1);
            transform-origin: top left;
        }
        50% {
            transform: rotate(-15deg) scale(1.3);
            transform-origin: top left;
        }
        100% {
            transform: rotate(0deg) scale(1);
            transform-origin: top left;
        }
    }

    @keyframes flipContainer {
        0% {
            transform: perspective(1000px) rotateY(0deg);
        }
        50% {
            transform: perspective(1000px) rotateY(-90deg);
        }
        100% {
            transform: perspective(1000px) rotateY(0deg);
        }
    }

    @keyframes waveExpand {
        0% {
            width: 0;
            height: 0;
            opacity: 0.8;
        }
        50% {
            opacity: 0.4;
        }
        100% {
            width: 600px;
            height: 600px;
            opacity: 0;
        }
    }

    .wave-container {
        position: relative;
        width: 0;
        height: 0;
        bottom: 0;
    }

    .wave {
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translate(-50%, 50%);
        border: 3px solid #ef4444;
        border-radius: 50%;
        animation: waveExpand 2s ease-out;
    }

    .wave-1 {
        animation-delay: 0s;
    }

    .wave-2 {
        animation-delay: 0.5s;
    }

    .wave-3 {
        animation-delay: 1s;
    }

    .wave-4 {
        animation-delay: 1.5s;
    }

    .flipping-container {
        animation: flipContainer 0.7s ease-in-out;
    }

    .page-corner.flipping {
        animation: peelPage 0.5s ease-in-out;
    }

    .page-corner.auto-switching {
        position: relative;
    }

    .page-corner.auto-switching::before {
        content: "";
        position: absolute;
        top: 50%;
        left: 50%;
        width: 4px;
        height: 4px;
        background: linear-gradient(45deg, #ffffff, #9333ea, #ffffff);
        border-radius: 50%;
        animation: lightningStrike 4s ease-in-out;
        z-index: 20;
    }

    @keyframes lightningStrike {
        0% {
            transform: translate(50px, -50px) scale(0);
            opacity: 0;
            box-shadow: 0 0 0 rgba(255, 255, 255, 0);
        }
        15% {
            transform: translate(35px, -35px) scale(2);
            opacity: 1;
            box-shadow:
                0 0 30px rgba(255, 255, 255, 1),
                0 0 60px rgba(147, 51, 234, 0.8);
        }
        30% {
            transform: translate(20px, -20px) scale(3);
            opacity: 1;
            box-shadow:
                0 0 40px rgba(255, 255, 255, 1),
                0 0 80px rgba(147, 51, 234, 1);
        }
        45% {
            transform: translate(10px, -10px) scale(4);
            opacity: 1;
            box-shadow:
                0 0 50px rgba(255, 255, 255, 1),
                0 0 100px rgba(147, 51, 234, 1);
        }
        60% {
            transform: translate(0, 0) scale(6);
            opacity: 1;
            box-shadow:
                0 0 60px rgba(255, 255, 255, 1),
                0 0 120px rgba(147, 51, 234, 1);
        }
        80% {
            transform: translate(0, 0) scale(4);
            opacity: 0.9;
            box-shadow:
                0 0 40px rgba(255, 255, 255, 0.8),
                0 0 80px rgba(147, 51, 234, 0.8);
        }
        100% {
            transform: translate(0, 0) scale(0);
            opacity: 0;
            box-shadow: 0 0 0 rgba(255, 255, 255, 0);
        }
    }

    .page-corner.auto-switching svg {
        animation: buttonGlow 4s ease-in-out;
    }

    @keyframes buttonGlow {
        0%,
        40% {
            filter: brightness(1) drop-shadow(0 0 0 rgba(147, 51, 234, 0));
        }
        60% {
            filter: brightness(2.5) drop-shadow(0 0 25px rgba(255, 255, 255, 1))
                drop-shadow(0 0 50px rgba(147, 51, 234, 1));
        }
        80% {
            filter: brightness(2) drop-shadow(0 0 20px rgba(255, 255, 255, 0.8))
                drop-shadow(0 0 40px rgba(147, 51, 234, 0.8));
        }
        100% {
            filter: brightness(1) drop-shadow(0 0 0 rgba(147, 51, 234, 0));
        }
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            max-height: 0;
        }
        to {
            opacity: 1;
            max-height: 500px;
        }
    }

    .animate-slideDown {
        animation: slideDown 0.3s ease-out;
    }

    iframe {
        filter: contrast(1.1);
    }

    /* Hide Google Maps controls */
    iframe {
        pointer-events: auto;
    }

    /* Custom scrollbar styling */
    :global(.scrollbar-thin::-webkit-scrollbar) {
        width: 8px;
    }

    :global(.scrollbar-thin::-webkit-scrollbar-track) {
        background: rgba(88, 28, 135, 0.2);
        border-radius: 10px;
        margin: 20px 0;
    }

    :global(.scrollbar-thin::-webkit-scrollbar-thumb) {
        background: #9333ea;
        border-radius: 10px;
    }

    :global(.scrollbar-thin::-webkit-scrollbar-thumb:hover) {
        background: #a855f7;
    }

    /* Mobile buttons layout */
    @media (max-width: 768px) {
        .map-category-button span.icon,
        .map-category-button span[style*="letter-spacing"] {
            display: none !important;
        }

        .category-buttons-container {
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
            scroll-behavior: smooth;
        }

        .category-buttons-container::-webkit-scrollbar {
            display: none;
        }

        /* Remove CSS pseudo-elements to prevent duplicates */
        .flex.flex-wrap.justify-start.gap-3.p-2.w-full.scrollable-mobile::before,
        .flex.flex-wrap.justify-start.gap-3.p-2.w-full.scrollable-mobile::after {
            display: none !important;
        }


        /* Reduce gaps on mobile - minimal between title and buttons, reasonable between buttons and map */
        div > .flex.flex-col.gap-4 {
            gap: 16px !important;
        }

        .flex.flex-col.gap-2 {
            gap: 0px !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        /* Target the first div with gap-4 specifically */
        .flex.flex-col.gap-4:first-child {
            gap: 0px !important;
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
        }

        /* Add margin to map container */
        .relative.w-full.border-4 {
            margin-top: 8px !important;
        }

        /* Make triangle button smaller on mobile */
        .page-corner svg {
            width: 80px !important;
            height: 80px !important;
        }

        .page-corner text {
            font-size: 14px !important;
        }
    }
</style>
