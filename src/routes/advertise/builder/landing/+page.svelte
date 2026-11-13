<script lang="ts">
    // ============================================================
    // עורך דף הנחיתה (שלב ב' של הסטודיו) - עותק של הסטודיו בקהילה בשכונה:
    // פרטי קשר, כותרת ופתיח, תמונה, יתרונות, מוצרים, "מה מייחד אותנו",
    // כתובת ושעות, תצוגה חיה של הדף האמיתי ושליחה.
    //
    // מה ששייך לאתר הזה בלבד: בחירת תקופת הפרסום בשליחה, תקרת המשקל
    // של השרת (MAX_AD_TOTAL_BYTES), ושליחה ב-POST לפרסומת חדשה או ב-PUT
    // לעריכת פרסומת קיימת (?edit=<id> בבילדר).
    // ============================================================
    import { onMount, untrack } from "svelte";
    import CameraCapture from "$lib/components/CameraCapture.svelte";
    import { _ } from "svelte-i18n";
    import { browser } from "$app/environment";
    import { goto } from "$app/navigation";
    import { DEFAULT_AD_STYLE, parseAdStyle, lpLogoStyle, type AdStyle, type LpLogoAlign, type LogoBg } from "$lib/adStyle";
    import { normalizeGradientId } from "$lib/ads/gradients";
    import { dataUrlBytes, fmtKb, MAX_AD_TOTAL_BYTES } from "$lib/ads/adImage";
    import { normalizePlanDays } from "$lib/ads/plans";
    import { AD_DRAFT_KEY, markAdSubmitted, clearAdSubmitted, getAdEditTarget, clearAdEditTarget, getAdPlanDays } from "$lib/adDraft";

    let { data } = $props<{
        data: {
            layoutUser?: { email?: string | null; phone?: string | null; nickname?: string | null } | null;
            isSuperAdmin?: boolean;
            plans: Array<{ days: number; label: string; title: string; price: number }>;
        };
    }>();

    // ===== Persistence - same key as the main builder so state shares freely =====
    const LS_KEY = AD_DRAFT_KEY;
    // תקופת הפרסום (ימים) - ברירת המחדל היא המסלול שנבחר במחירון
    let durationDays = $state<number>(30);
    // עריכה של פרסומת קיימת (PUT) - היעד נקבע בבילדר מ-?edit=<id>
    let editTarget = $state<string | null>(null);
    // שדה דבש - מוסתר מהמשתמש, ממולא רק בידי בוט
    let companyUrl = $state("");

    // ===== Access gate (same logic as the main builder) =====
    let accessGranted = $state(false);
    let accessChecked = $state(false);
    let isSuperAdmin = $derived(Boolean(data?.isSuperAdmin));

    type ProductRow = { id: number; name: string; price: string; image: string; description: string };

    // ===== All landing-page fields (editable) =====
    let landingHeadline   = $state<string>("");
    let landingPitch      = $state<string>("");
    let landingExtended   = $state<string>("");
    let landingImage      = $state<string>("");
    let landingAdvantages = $state<[string, string, string]>(["", "", ""]);
    // untrack: ערך פתיחה מהפרופיל בלבד. אלה שדות שהמפרסם עורך, ורענון של
    // data לא אמור לדרוס לו את מה שהקליד.
    let phone             = $state<string>(untrack(() => data?.layoutUser?.phone) ?? "");
    let whatsapp          = $state<string>(untrack(() => data?.layoutUser?.phone) ?? "");
    let website           = $state<string>("");
    let email             = $state<string>(untrack(() => data?.layoutUser?.email) ?? "");
    let products          = $state<ProductRow[]>([]);
    let uniqueness        = $state<string>("");
    let address           = $state<string>("");
    let hours             = $state<string>("");
    let nextProductId     = 1;

    // ===== Read-only fields used in the preview (filled in earlier steps) =====
    let title       = $state<string>("");
    let subtitle    = $state<string>("");
    let hoverText   = $state<string>("");
    let cta         = $state<string>("הקלק לפרטים והזמנות");
    let mainImage   = $state<string>("");
    // מיקום+זום שנבחרו בבילדר — עוברים כמו-שהם אל המודעה בשליחה
    let mainImageFit = $state<{ x: number; y: number; z: number }>({ x: 50, y: 50, z: 1 });
    // תמונה ייעודית לנייד (אופציונלית) + החיתוך שנבחר לה. ריק = הנייד
    // ממשיך עם התמונה הראשית, בדיוק כמו לפני התוספת.
    let mobileImage    = $state<string>("");
    let mobileImageFit = $state<{ x: number; y: number; z: number }>({ x: 50, y: 50, z: 1 });
    let logo        = $state<string>("");
    let logoShape   = $state<"square" | "circle">("square");
    let gradient    = $state<string>("from-amber-500 to-orange-600");
    // העיצוב שנקבע בשלבים הקודמים - עובר כמו-שהוא אל המודעה בשליחה.
    // בלעדיו הפרסומת מתפרסמת עם ברירות המחדל של האתר: הלוגו קופץ ממקום
    // שהמפרסם גרר אליו, הרצועה משנה גובה והכותרת מאבדת צבע ומיקום.
    let lpAlign     = $state<LpLogoAlign>("right");
    let lpBg        = $state<LogoBg | null>(null);
    let lpSize      = $state<number | null>(null);
    let adStyleFromDraft = $state<AdStyle>({ ...DEFAULT_AD_STYLE });
    const lpStyle   = $derived<AdStyle>({ ...adStyleFromDraft, lpLogoAlign: lpAlign, lpLogoBg: lpBg, lpLogoSize: lpSize });

    // ===== Drag state =====
    let isDraggingLandingImage = $state(false);
    let draggingProductId = $state<number | null>(null);

    // ===== Image helpers =====
    async function fileToDataUrl(file: File): Promise<string> {
        return new Promise((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result as string);
            fr.onerror = rej;
            fr.readAsDataURL(file);
        });
    }
    function approxDataUrlBytes(dataUrl: string): number {
        const i = dataUrl.indexOf(",");
        const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
        return Math.ceil(b64.length * 3 / 4);
    }
    async function compressImageToFit(file: File, maxBytes: number, maxEdge = 1000): Promise<{ dataUrl: string; wasCompressed: boolean; originalMB: number; finalMB: number }> {
        const originalMB = file.size / (1024 * 1024);
        const srcUrl = await fileToDataUrl(file);
        // גם תמונה שקטנה מהתקרה נטענת פעם אחת ל-Image: קובץ שהדפדפן לא יודע
        // לפענח (HEIC מאייפון, קובץ פגום) חייב להיזרק כאן - אחרת הוא נשמר
        // כמו-שהוא ומוצג בהמשך כתמונה שבורה בלי שום הסבר.
        const img = new Image();
        img.src = srcUrl;
        await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("image load failed")); });
        if (file.size <= maxBytes) {
            return { dataUrl: srcUrl, wasCompressed: false, originalMB, finalMB: originalMB };
        }
        let w = img.naturalWidth, h = img.naturalHeight;
        const MAX_EDGE = maxEdge;
        const longest = Math.max(w, h);
        if (longest > MAX_EDGE) {
            const scale = MAX_EDGE / longest;
            w = Math.round(w * scale);
            h = Math.round(h * scale);
        }
        let quality = 0.85;
        let dataUrl = "";
        for (let attempt = 0; attempt < 10; attempt++) {
            const canvas = document.createElement("canvas");
            canvas.width = w; canvas.height = h;
            canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
            dataUrl = canvas.toDataURL("image/jpeg", quality);
            if (approxDataUrlBytes(dataUrl) <= maxBytes) break;
            if (quality > 0.5) {
                quality -= 0.1;
            } else {
                w = Math.round(w * 0.85);
                h = Math.round(h * 0.85);
                quality = 0.7;
            }
        }
        return { dataUrl, wasCompressed: true, originalMB, finalMB: approxDataUrlBytes(dataUrl) / (1024 * 1024) };
    }

    let compressNotice = $state<{ visible: boolean; originalMB: number; finalMB: number }>({ visible: false, originalMB: 0, finalMB: 0 });
    let compressNoticeTimer: number | null = null;
    function showCompressNotice(originalMB: number, finalMB: number) {
        if (compressNoticeTimer) { clearTimeout(compressNoticeTimer); compressNoticeTimer = null; }
        compressNotice = { visible: true, originalMB, finalMB };
        compressNoticeTimer = window.setTimeout(() => {
            compressNotice = { ...compressNotice, visible: false };
            compressNoticeTimer = null;
        }, 9000);
    }
    function dismissCompressNotice() {
        if (compressNoticeTimer) { clearTimeout(compressNoticeTimer); compressNoticeTimer = null; }
        compressNotice = { ...compressNotice, visible: false };
    }

    // כשל בקריאת תמונה (פורמט לא נתמך, קובץ פגום) חייב משוב נראה - בלעדיו
    // ההעלאה נכשלת בשקט והמפרסם בטוח שהאתר שבור (קרה בפועל, 23.8.2026).
    let uploadErrorVisible = $state(false);
    let uploadErrorTimer: number | null = null;
    function showUploadError() {
        if (uploadErrorTimer) { clearTimeout(uploadErrorTimer); uploadErrorTimer = null; }
        uploadErrorVisible = true;
        uploadErrorTimer = window.setTimeout(() => { uploadErrorVisible = false; uploadErrorTimer = null; }, 12000);
    }
    function dismissUploadError() {
        if (uploadErrorTimer) { clearTimeout(uploadErrorTimer); uploadErrorTimer = null; }
        uploadErrorVisible = false;
    }

    async function processImageFile(file: File | null | undefined, target: "landing" | { kind: "product"; id: number }) {
        if (!file) return;
        if (!file.type.startsWith("image/")) { alert($_("advertise.b_upload_image_file")); return; }
        // כל המודעה נשמרת בשורה אחת (תקרת בקשה של Strapi ~1MB, והשרת אוכף
        // MAX_AD_TOTAL_BYTES כולל) — תמונת נחיתה/מוצר חייבת להישאר קטנה
        const MAX_BYTES = 220 * 1024;
        let result: Awaited<ReturnType<typeof compressImageToFit>>;
        try {
            result = await compressImageToFit(file, MAX_BYTES);
        } catch {
            showUploadError();
            return;
        }
        const { dataUrl, wasCompressed, originalMB, finalMB } = result;
        if (wasCompressed) showCompressNotice(originalMB, finalMB);
        if (target === "landing") {
            landingImage = dataUrl;
        } else {
            const idx = products.findIndex(p => p.id === target.id);
            if (idx >= 0) {
                products[idx] = { ...products[idx], image: dataUrl };
                products = [...products];
            }
        }
    }
    async function handleLandingImage(e: Event) {
        const f = (e.target as HTMLInputElement).files?.[0];
        await processImageFile(f, "landing");
    }
    async function handleProductImage(e: Event, id: number) {
        const f = (e.target as HTMLInputElement).files?.[0];
        await processImageFile(f, { kind: "product", id });
    }
    function clearLandingImage() { landingImage = ""; }

    function dragOverLanding(e: DragEvent) {
        if (!e.dataTransfer?.types.includes("Files")) return;
        e.preventDefault(); e.stopPropagation();
        isDraggingLandingImage = true;
    }
    function dragLeaveLanding(e: DragEvent) {
        e.preventDefault(); e.stopPropagation();
        isDraggingLandingImage = false;
    }
    async function dropLanding(e: DragEvent) {
        e.preventDefault(); e.stopPropagation();
        isDraggingLandingImage = false;
        const f = e.dataTransfer?.files?.[0];
        await processImageFile(f, "landing");
    }
    function dragOverProduct(e: DragEvent, id: number) {
        if (!e.dataTransfer?.types.includes("Files")) return;
        e.preventDefault(); e.stopPropagation();
        draggingProductId = id;
    }
    function dragLeaveProduct(e: DragEvent) {
        e.preventDefault(); e.stopPropagation();
        draggingProductId = null;
    }
    async function dropProduct(e: DragEvent, id: number) {
        e.preventDefault(); e.stopPropagation();
        draggingProductId = null;
        const f = e.dataTransfer?.files?.[0];
        await processImageFile(f, { kind: "product", id });
    }

    function addProduct() {
        products = [...products, { id: nextProductId++, name: "", price: "", image: "", description: "" }];
    }
    function removeProduct(id: number) {
        products = products.filter(p => p.id !== id);
    }

    // ===== Load draft from localStorage on mount =====
    function checkAccess() {
        if (!browser) return;
        // אותו כלל כמו בבילדר: סופר-אדמין / מסלול שנבחר במחירון / עריכת פרסומת קיימת
        editTarget = getAdEditTarget();
        const plan = getAdPlanDays();
        if (plan) durationDays = normalizePlanDays(plan);
        accessGranted = isSuperAdmin || plan !== null || editTarget !== null;
        accessChecked = true;
    }

    onMount(() => {
        if (!browser) return;
        checkAccess();

        const blockOutsideDrop = (e: DragEvent) => {
            if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
        };
        window.addEventListener("dragover", blockOutsideDrop);
        window.addEventListener("drop", blockOutsideDrop);

        if (!accessGranted) {
            return () => {
                window.removeEventListener("dragover", blockOutsideDrop);
                window.removeEventListener("drop", blockOutsideDrop);
            };
        }

        try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                landingHeadline = d.landingHeadline ?? "";
                landingPitch    = d.landingPitch    ?? "";
                landingExtended = d.landingExtended ?? "";
                landingImage    = d.landingImage    ?? "";
                if (Array.isArray(d.landingAdvantages)) {
                    landingAdvantages = [
                        d.landingAdvantages[0] ?? "",
                        d.landingAdvantages[1] ?? "",
                        d.landingAdvantages[2] ?? "",
                    ];
                }
                phone     = d.phone    ?? phone;
                whatsapp  = d.whatsapp ?? whatsapp;
                website   = d.website  ?? "";
                email     = d.email    ?? email;
                products  = Array.isArray(d.products) ? d.products : [];
                nextProductId = (products.reduce((m, p) => Math.max(m, p.id), 0) || 0) + 1;
                uniqueness = d.uniqueness ?? "";
                address    = d.address    ?? "";
                hours      = d.hours      ?? "";

                title     = d.title     ?? "";
                subtitle  = d.subtitle  ?? "";
                hoverText = d.hoverText ?? "";
                cta       = d.cta       ?? cta;
                mainImage = d.mainImage ?? "";
                mainImageFit = {
                    x: typeof d.mainImageObjectX === "number" ? d.mainImageObjectX : 50,
                    y: typeof d.mainImageObjectY === "number" ? d.mainImageObjectY : 50,
                    z: typeof d.mainImageZoom === "number" ? d.mainImageZoom : 1,
                };
                mobileImage = d.mobileImage ?? "";
                mobileImageFit = {
                    x: typeof d.mobileImageObjectX === "number" ? d.mobileImageObjectX : 50,
                    y: typeof d.mobileImageObjectY === "number" ? d.mobileImageObjectY : 50,
                    z: typeof d.mobileImageZoom === "number" ? d.mobileImageZoom : 1,
                };
                logo      = d.logo      ?? "";
                logoShape = d.logoShape ?? "square";
                gradient  = normalizeGradientId(d.gradient ?? gradient);
                lpAlign = d.lpLogoAlign === "center" || d.lpLogoAlign === "left" ? d.lpLogoAlign : "right";
                lpBg = d.lpLogoBg === "white" || d.lpLogoBg === "black" || d.lpLogoBg === "clear" ? d.lpLogoBg : null;
                lpSize = typeof d.lpLogoSize === "number" ? d.lpLogoSize : null;
                // הטיוטה שומרת את השדות בשמות של הבילדר; כאן הם נארזים
                // לאובייקט העיצוב שנשלח עם המודעה
                adStyleFromDraft = parseAdStyle({
                    logoShape:    d.logoShape,
                    hoverLogo:    d.hoverLogo,
                    hoverLogoX:   d.hoverLogoX,
                    hoverLogoY:   d.hoverLogoY,
                    hoverLogoSize: d.hoverLogoSize,
                    logoBg:       d.logoBg,
                    logoSize:     d.logoSize,
                    logoAnchor:   d.logoPosition,
                    logoX:        d.logoFreeX,
                    logoY:        d.logoFreeY,
                    bandHeight:   d.diagHeight,
                    titleOffsetY: d.titleOffsetY,
                    titleColor:   d.titleColor,
                    titleFontSize: d.titleFontSize,
                    // טיפוגרפיית תת-הכותרת משלב 5
                    subFontSize:   d.subFontSize,
                    subLineHeight: d.subLineHeight,
                    subAlign:      d.subAlign,
                    // הזזת הטקסטים בפופ-אפ הנייד (שלב 7)
                    mobTitleX: d.mobTitleX, mobTitleY: d.mobTitleY,
                    mobSubX:   d.mobSubX,   mobSubY:   d.mobSubY,
                    mobCtaX:   d.mobCtaX,   mobCtaY:   d.mobCtaY,
                }) ?? { ...DEFAULT_AD_STYLE };
            }
        } catch {}

        return () => {
            window.removeEventListener("dragover", blockOutsideDrop);
            window.removeEventListener("drop", blockOutsideDrop);
        };
    });

    // ===== Persist all editable fields back to the same draft =====
    // הריצה הראשונה היא טעינת הטיוטה ולא עריכה, ולכן היא לא מבטלת את
    // סימון "נשלחה לאישור" - אחרת עצם הכניסה לעמוד הייתה מחזירה את הנדנוד
    let persistRanOnce = false;
    // הטיוטה (כולל כל התמונות כ-base64) יכולה לחצות את מכסת ה-localStorage;
    // אז setItem נזרק, שום דבר לא נשמר, והעבודה נעלמת ברענון/מעבר עמוד.
    // הדגל מציג אזהרה קבועה עד שהטיוטה מצטמקת ונשמרת שוב בהצלחה.
    let draftSaveFailed = $state(false);
    $effect(() => {
        if (!browser) return;
        try {
            const raw = localStorage.getItem(LS_KEY);
            const cur = raw ? JSON.parse(raw) : {};
            const merged = {
                ...cur,
                landingHeadline, landingPitch, landingExtended, landingImage, landingAdvantages,
                phone, whatsapp, website, email,
                products, uniqueness, address, hours,
                lpLogoAlign: lpAlign, lpLogoBg: lpBg, lpLogoSize: lpSize,
            };
            localStorage.setItem(LS_KEY, JSON.stringify(merged));
            draftSaveFailed = false;
        } catch {
            draftSaveFailed = true;
        }
        if (persistRanOnce) clearAdSubmitted(); else persistRanOnce = true;
    });

    // ===== Preview helpers (same rules as the real landing page) =====
    let previewHeroImage = $derived(landingImage || mainImage || "");
    let previewAdvantages = $derived(landingAdvantages.filter(a => a.trim()));
    // היתרונות נכנסים לטור שליד התמונה רק כשהפתיח קצר; אחרת הטור גבוה
    // מהתמונה, האיזון נשבר, והם יורדים לשורה רחבה מתחת.
    let previewAdvInHero = $derived(
        Boolean(previewHeroImage) && previewAdvantages.length > 0 && (landingPitch || subtitle || "").length <= 300
    );

    // ===== Validation + submit =====
    // תמונה, כותרת וכותרת משנה של הכרטיס נופלות למקבילות שבדף הנחיתה - הכיוון
    // ההפוך של "אחרת נשתמש בכותרת הראשית". הטקסט עובר במלואו, בלי חיתוך:
    // הכותרת והסלוגן יושבים מעל התמונה ופשוט נפרשים על עוד שורות.
    let adImage    = $derived(mainImage || landingImage);
    let adTitle    = $derived(title.trim() || landingHeadline.trim());
    let adSubtitle = $derived(subtitle.trim() || landingPitch.trim());

    // אין חסימה בצד הלקוח: כל שדה ריק נופל למה שהגולש כבר מילא (כאן או
    // בפרסומת הקיימת - בשרת). אם באמת אין ממה לקחת, השרת מחזיר הודעה ברורה
    // שמוצגת ליד הכפתור.
    let submitting = $state(false);
    let submitted  = $state(false);

    let submitError = $state<string>("");
    // השליחה הייתה עריכה של פרסומת קיימת (לטקסט מסך הסיום)
    let editedDone = $state(false);

    // ===== גלילה איטית אל הודעת ההצלחה =====
    // אחרי השליחה הטופס הארוך מתקפל והגולש נשאר גלול עמוק למטה מול רקע ריק.
    // גוללים לאט למעלה אל ההודעה כדי שיראה את המשוב - בלי קפיצה חדה.
    let successEl = $state<HTMLElement | null>(null);

    function slowScrollTo(el: HTMLElement) {
        // 8rem = scroll-margin-top של הכרטיסים בעמוד - מפצה על הכותרת הקבועה
        const targetY = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 128);
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
            window.scrollTo(0, targetY);
            return;
        }
        const startY = window.scrollY;
        const delta = targetY - startY;
        if (Math.abs(delta) < 8) return;
        // איטי מאוד בכוונה, אך מוגבל כדי שמסע קצר לא ייגרר וארוך לא יימשך נצח
        const duration = Math.min(4000, Math.max(2200, Math.abs(delta) * 1.5));
        let cancelled = false;
        const cancel = () => { cancelled = true; };
        // הגולש שגולל בעצמו משתלט על ההגה - לא נלחמים בו
        window.addEventListener("wheel", cancel, { once: true, passive: true });
        window.addEventListener("touchstart", cancel, { once: true, passive: true });
        const ease = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
        let t0: number | null = null;
        const step = (ts: number) => {
            if (cancelled) return;
            if (t0 === null) t0 = ts;
            const p = Math.min(1, (ts - t0) / duration);
            window.scrollTo(0, startY + delta * ease(p));
            if (p < 1) requestAnimationFrame(step);
            else {
                window.removeEventListener("wheel", cancel);
                window.removeEventListener("touchstart", cancel);
            }
        };
        requestAnimationFrame(step);
    }

    $effect(() => {
        if (submitted && successEl) {
            const el = successEl;
            // מחכים לפריים אחרי שהעמוד התקצר, כדי למדוד מיקום ונקודת מוצא נכונים
            requestAnimationFrame(() => slowScrollTo(el));
        }
    });

    // Extract a user-facing message from a failed server response. Server errors
    // in this project are Hebrew strings inside a JSON body ({ message } from
    // SvelteKit error(), sometimes { error }). Anything else - raw JSON, English
    // text like "Internal Error", or an unparseable body - must never reach the
    // user, so we fall back to a friendly Hebrew message instead.
    async function extractServerError(res: Response): Promise<string> {
        let serverMsg = "";
        try {
            const body = await res.json();
            if (typeof body?.message === "string") serverMsg = body.message;
            else if (typeof body?.error === "string") serverMsg = body.error;
        } catch {}
        serverMsg = serverMsg.trim();
        // Only show it if it looks like a deliberate Hebrew message (contains
        // Hebrew letters); otherwise it's technical/English - use the generic text.
        if (serverMsg && /[\u0590-\u05FF]/.test(serverMsg)) return serverMsg;
        return $_("advertise.l_err_generic");
    }

    // ===== שמירה על תקרת המשקל של השרת (MAX_AD_TOTAL_BYTES) =====
    // השרת דוחה מודעה שסך כל התמונות שבה (כולל מוצרים ולוגו) חורג מהתקרה.
    // לכן לפני השליחה מודדים את המשקל בפועל, ואם צריך מכווצים את התמונה
    // הגדולה ביותר שוב ושוב עד שהכול נכנס.
    const MIN_IMG_CHARS = 90_000;   // מתחת לזה כבר לא מכווצים תמונה בודדת

    function bodyBytes(p: { mainImage: string; logo?: unknown; mobileImage?: unknown; landing: { image: string; products: ProductRow[] } }): number {
        return dataUrlBytes(p.mainImage) + dataUrlBytes(String(p.logo ?? "")) + dataUrlBytes(String(p.mobileImage ?? ""))
            + dataUrlBytes(p.landing.image) + p.landing.products.reduce((n, x) => n + dataUrlBytes(x.image), 0);
    }

    /** דחיסה מחדש של data-URI קיים אל מתחת ליעד (אורך מחרוזת בתווים) */
    async function recompressDataUrl(dataUrl: string, maxChars: number): Promise<string> {
        try {
            const img = new Image();
            img.src = dataUrl;
            await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("image load failed")); });
            let w = img.naturalWidth, h = img.naturalHeight;
            let quality = 0.75;
            let out = dataUrl;
            for (let attempt = 0; attempt < 12; attempt++) {
                const canvas = document.createElement("canvas");
                canvas.width = w; canvas.height = h;
                const c = canvas.getContext("2d");
                if (!c) return dataUrl;
                c.drawImage(img, 0, 0, w, h);
                out = canvas.toDataURL("image/jpeg", quality);
                if (out.length <= maxChars) return out;
                if (quality > 0.45) quality -= 0.1;
                else { w = Math.round(w * 0.8); h = Math.round(h * 0.8); quality = 0.6; }
            }
            return out;
        } catch {
            return dataUrl;
        }
    }

    type SubmitPayload = {
        mainImage: string;
        landing: { image: string; products: ProductRow[] } & Record<string, unknown>;
    } & Record<string, unknown>;

    /** מכווץ את התמונות בחבילה (הגדולה קודם) עד שהמשקל נכנס מתחת לתקרה.
     * הלוגו לא נוגעים בו — הוא קטן ממילא ודחיסת JPEG הייתה מוחקת שקיפות. */
    async function shrinkPayloadImages(payload: SubmitPayload): Promise<boolean> {
        const BODY_LIMIT = MAX_AD_TOTAL_BYTES;
        for (let round = 0; round < 15 && bodyBytes(payload as any) > BODY_LIMIT; round++) {
            const imgs: Array<{ cur: string; apply: (v: string) => void }> = [];
            const push = (cur: string, apply: (v: string) => void) => {
                if (typeof cur === "string" && cur.startsWith("data:image/")) imgs.push({ cur, apply });
            };
            push(payload.mainImage, (v) => { payload.mainImage = v; });
            push(payload.mobileImage as string, (v) => { payload.mobileImage = v; });
            push(payload.landing?.image, (v) => { payload.landing.image = v; });
            for (const p of payload.landing?.products ?? []) push(p.image, (v) => { p.image = v; });
            imgs.sort((a, b) => b.cur.length - a.cur.length);
            const big = imgs[0];
            if (!big || big.cur.length <= MIN_IMG_CHARS) return bodyBytes(payload as any) <= BODY_LIMIT;
            big.apply(await recompressDataUrl(big.cur, Math.max(MIN_IMG_CHARS, Math.floor(big.cur.length * 0.6))));
        }
        return bodyBytes(payload as any) <= BODY_LIMIT;
    }

    async function submitAd() {
        if (submitting) return;
        submitting = true;
        submitError = "";
        try {
            const payload: SubmitPayload = {
                company_url: companyUrl,
                title: adTitle, subtitle: adSubtitle, hoverText, cta, gradientId: gradient,
                logo, mainImage: adImage,
                // החיתוך שנבחר שייך לתמונת הפרסומת; לתמונת דף הנחיתה - ברירת המחדל
                mainImageFit: mainImage ? mainImageFit : undefined,
                // ריקים כשהמפרסם לא העלה תמונה ייעודית לנייד
                mobileImage, mobileImageFit,
                // התקופה שנבחרה - השרת מנרמל אותה למסלולים הקיימים בלבד
                requestedDurationDays: durationDays,
                adStyle: lpStyle,
                landing: {
                    headline: landingHeadline || adTitle, pitch: landingPitch, extended: landingExtended, image: landingImage, advantages: landingAdvantages, uniqueness, phone, whatsapp, website, email, address, hours,
                    // עותק עמוק — כיווץ תמונות מוצר לא ישנה את המצב שעל המסך
                    products: products.map((p) => ({ ...p })),
                },
            };
            if (!(await shrinkPayloadImages(payload))) {
                throw new Error($_("advertise.l_err_too_heavy"));
            }
            // עריכת פרסומת קיימת = PUT עליה (מתעדכנת במקום, בלי תור אישור חדש);
            // אחרת פרסומת חדשה שממתינה לאישור
            const res = editTarget
                ? await fetch(`/api/ads/${encodeURIComponent(editTarget)}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  })
                : await fetch("/api/ads/submit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
            if (!res.ok) {
                throw new Error(await extractServerError(res));
            }
            editedDone = editTarget !== null;
            submitted = true;
            // מכאן הטיוטה כבר אצל המנהל - האזור האישי מפסיק לנדנד "סיים את עריכתו"
            markAdSubmitted();
            // יעד העריכה נצרך - שליחה עתידית לא תתקשר בטעות לפרסומת הזו
            clearAdEditTarget();
        } catch (e) {
            // fetch rejects with a TypeError ("Failed to fetch") on a network
            // failure - show a Hebrew connectivity message instead of English.
            if (e instanceof TypeError) {
                submitError = $_("advertise.l_err_network");
            } else if (e instanceof Error && e.message) {
                submitError = e.message;
            } else {
                submitError = $_("advertise.l_err_generic");
            }
        } finally {
            submitting = false;
        }
    }

    function goBack() { goto("/advertise/builder"); }

    // משקל התמונות כרגע מול התקרה של השרת
    const curBytes = $derived(bodyBytes({ mainImage: adImage, logo, mobileImage, landing: { image: landingImage, products } }));
    const overweight = $derived(curBytes > MAX_AD_TOTAL_BYTES);
</script>

<svelte:head>
    <title>{$_('advertise.r_landing_head')}</title>
    <meta name="robots" content="noindex" />
</svelte:head>

<div class="ad-builder max-w-5xl mx-auto px-4 py-8 md:py-12" dir="rtl">

    {#if accessChecked && !accessGranted}
        <div class="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6 text-center">
            <h1 class="text-xl font-black text-amber-300 mb-2">{$_("advertise.l_gate_title")}</h1>
            <p class="text-sm text-gray-300 mb-4">{$_("advertise.l_gate_body")}</p>
            <button type="button" onclick={goBack}
                    class="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-bold">
                {$_("advertise.l_back_builder")}
            </button>
        </div>
    {:else if accessGranted}

        {#if compressNotice.visible}
            <div class="compress-toast" role="status" aria-live="polite">
                <button type="button" class="compress-toast-close" onclick={dismissCompressNotice} aria-label={$_("advertise.close")}>✕</button>
                <p class="text-sm text-amber-100 font-bold m-0">
                    {$_("advertise.l_ct_compressed", { values: { a: compressNotice.originalMB.toFixed(1), b: compressNotice.finalMB.toFixed(1) } })}
                </p>
            </div>
        {/if}

        {#if uploadErrorVisible}
            <div class="compress-toast error-toast" role="alert">
                <button type="button" class="compress-toast-close" onclick={dismissUploadError} aria-label={$_("advertise.close")}>✕</button>
                <p class="text-sm text-red-100 font-bold m-0">
                    {$_("advertise.b_err_image_read")}
                </p>
            </div>
        {/if}

        {#if draftSaveFailed}
            <div class="compress-toast error-toast draft-warn" role="alert">
                <p class="text-sm text-red-100 font-bold m-0">
                    {$_("advertise.b_err_draft_save")}
                </p>
            </div>
        {/if}

        <!-- ===== Page header - מוסתר אחרי השליחה: אין להציג "שלב הבא - עריכה" כשהעריכה כבר הסתיימה ===== -->
        {#if !submitted}
        <header class="text-center mb-8">
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-4">
                <span class="text-amber-300 text-xs font-bold tracking-wider">{$_("advertise.l_badge")}</span>
            </div>
            <h1 class="text-3xl md:text-4xl font-black text-white mb-3">{$_("advertise.l_title")}</h1>
            <p class="text-gray-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
                {$_("advertise.l_intro")}
            </p>
            <div class="mt-4">
                <button type="button" onclick={goBack}
                        class="text-xs text-gray-400 hover:text-amber-300 transition-colors">
                    {$_("advertise.l_back_edit")}
                </button>
            </div>
        </header>
        {/if}

        {#if !submitted}

        <!-- =================== STEP 1: LANDING LINK / CONTACT =================== -->
        <section class="step-card">
            <div class="step-head">
                <span class="step-num">1</span>
                <h2>{$_("advertise.l_s1_title")}</h2>
            </div>
            <p class="step-help">{$_("advertise.l_s1_help")}</p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="lp-phone" class="field-label">{$_("advertise.l_phone")}</label>
                    <input id="lp-phone" type="tel" bind:value={phone} placeholder="050-1234567" class="text-input" />
                </div>
                <div>
                    <label for="lp-whatsapp" class="field-label">{$_("advertise.l_whatsapp")}</label>
                    <input id="lp-whatsapp" type="tel" bind:value={whatsapp} placeholder="050-1234567" class="text-input" />
                </div>
                <div>
                    <label for="lp-website" class="field-label">{$_("advertise.l_website")}</label>
                    <input id="lp-website" type="url" bind:value={website} placeholder="https://my-site.co.il" class="text-input" />
                </div>
                <div>
                    <label for="lp-email" class="field-label">{$_("advertise.l_email")}</label>
                    <input id="lp-email" type="email" bind:value={email} placeholder="me@example.com" class="text-input" />
                </div>

                <div class="md:col-span-2">
                    <label for="lp-headline" class="field-label">{$_("advertise.l_headline_label")}</label>
                    <input id="lp-headline" type="text" bind:value={landingHeadline} placeholder={$_("advertise.l_headline_ph")} class="text-input" />
                </div>
                <div class="md:col-span-2">
                    <label for="lp-pitch" class="field-label">{$_("advertise.l_pitch_label")}</label>
                    <textarea id="lp-pitch" bind:value={landingPitch} rows="3" placeholder={$_("advertise.l_pitch_ph")} class="text-input"></textarea>
                </div>
                <div class="md:col-span-2">
                    <label for="lp-extended" class="field-label">{$_("advertise.l_extended_label")}</label>
                    <p class="text-xs text-gray-400 mb-1.5 leading-relaxed">
                        {$_("advertise.l_extended_help")}
                    </p>
                    <textarea id="lp-extended" bind:value={landingExtended} rows="8"
                              placeholder={$_("advertise.l_extended_ph")}
                              class="text-input"></textarea>
                </div>

                <div class="md:col-span-2">
                    <span class="field-label">{$_("advertise.l_image_label")}</span>
                    <p class="text-xs text-gray-400 mb-2 leading-relaxed">
                        {$_("advertise.l_image_help")}
                    </p>
                    <label class="upload-zone-sm"
                           class:has-image={!!landingImage}
                           class:dragging={isDraggingLandingImage}
                           ondragover={dragOverLanding}
                           ondragleave={dragLeaveLanding}
                           ondrop={dropLanding}>
                        {#if landingImage}
                            <img src={landingImage} alt={$_("advertise.l_image_alt")} />
                            <button type="button" class="remove-x" onclick={(e) => { e.preventDefault(); clearLandingImage(); }} aria-label={$_("advertise.b_remove_image")}>✕</button>
                        {:else}
                            <div class="text-center">
                                <div class="text-2xl mb-1">{isDraggingLandingImage ? "✨" : "🖼️"}</div>
                                <p class="text-xs font-bold text-gray-300">{isDraggingLandingImage ? $_("advertise.b_release") : $_("advertise.l_upload_image")}</p>
                            </div>
                        {/if}
                        <input type="file" accept="image/*" onchange={handleLandingImage} class="hidden" />
                    </label>
                    <CameraCapture onfiles={(files) => processImageFile(files[0], "landing")} class="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-white/15 hover:border-amber-400/60 bg-white/5 hover:bg-amber-500/10 text-gray-200 hover:text-white text-sm font-bold transition-all cursor-pointer" />
                </div>

                <div class="md:col-span-2">
                    <span class="field-label">{$_("advertise.l_adv_label")}</span>
                    <p class="text-xs text-gray-400 mb-2 leading-relaxed">
                        {$_("advertise.l_adv_help_pre")} <strong class="text-amber-300">{$_("advertise.l_adv_help_strong")}</strong> {$_("advertise.l_adv_help_post")}
                    </p>
                    <div class="space-y-2">
                        <input type="text" bind:value={landingAdvantages[0]} maxlength="80"
                               placeholder={$_("advertise.l_adv1_ph")} class="text-input" />
                        <input type="text" bind:value={landingAdvantages[1]} maxlength="80"
                               placeholder={$_("advertise.l_adv2_ph")} class="text-input" />
                        <input type="text" bind:value={landingAdvantages[2]} maxlength="80"
                               placeholder={$_("advertise.l_adv3_ph")} class="text-input" />
                    </div>
                </div>
            </div>
        </section>

        <!-- =================== STEP 2: PRODUCTS =================== -->
        <section class="step-card">
            <div class="step-head">
                <span class="step-num">2</span>
                <h2>{$_("advertise.l_s2_title")}</h2>
            </div>
            <p class="step-help">{$_("advertise.l_s2_help")}</p>

            <div class="space-y-3">
                {#each products as p, idx (p.id)}
                    <div class="product-row">
                        <label class="upload-zone-sm"
                               class:has-image={!!p.image}
                               class:dragging={draggingProductId === p.id}
                               ondragover={(e) => dragOverProduct(e, p.id)}
                               ondragleave={dragLeaveProduct}
                               ondrop={(e) => dropProduct(e, p.id)}>
                            {#if p.image}
                                <img src={p.image} alt={p.name} />
                            {:else}
                                <div class="text-center text-xs text-gray-400">
                                    {#if draggingProductId === p.id}✨<br/>{$_("advertise.b_release")}{:else}📷<br/>{$_("advertise.l_photo")}{/if}
                                </div>
                            {/if}
                            <input type="file" accept="image/*" onchange={(e) => handleProductImage(e, p.id)} class="hidden" />
                        </label>
                        <CameraCapture onfiles={(files) => processImageFile(files[0], { kind: 'product', id: p.id })} compact class="shrink-0 inline-flex items-center justify-center px-2.5 py-2 rounded-lg border border-white/15 hover:border-amber-400/60 bg-white/5 hover:bg-amber-500/10 text-gray-300 hover:text-white transition-all cursor-pointer" />
                        <div class="grow grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input type="text" bind:value={products[idx].name} placeholder={$_("advertise.l_product_name_ph")} class="text-input small" />
                            <input type="text" bind:value={products[idx].price} placeholder={$_("advertise.l_price_ph")} class="text-input small" />
                            <input type="text" bind:value={products[idx].description} placeholder={$_("advertise.l_desc_ph")} class="text-input small" />
                        </div>
                        <button type="button" onclick={() => removeProduct(p.id)} class="remove-btn" aria-label={$_("advertise.remove")}>✕</button>
                    </div>
                {/each}
            </div>

            {#if products.length < 3}
                <button type="button" onclick={addProduct}
                    class="mt-3 w-full py-3 rounded-xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/70 font-bold text-sm transition-colors">
                    {$_("advertise.l_add_product")}
                </button>
            {/if}
        </section>

        <!-- =================== STEP 3: UNIQUENESS =================== -->
        <section class="step-card">
            <div class="step-head">
                <span class="step-num">3</span>
                <h2>{$_("advertise.l_s3_title")}</h2>
            </div>
            <p class="step-help">
                🌟 <strong class="text-amber-300">{$_("advertise.l_s3_help_strong")}</strong>
                {$_("advertise.l_s3_help")}
            </p>

            <textarea bind:value={uniqueness} rows="5" maxlength="500"
                      placeholder={$_("advertise.l_uniq_ph")}
                      class="text-input"></textarea>
            <div class="text-xs text-gray-500 mt-1 text-left">{uniqueness.length}/500</div>
        </section>

        <!-- =================== STEP 4: ADDRESS =================== -->
        <section class="step-card">
            <div class="step-head">
                <span class="step-num">4</span>
                <h2>{$_("advertise.l_s4_title")}</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2">
                    <label for="lp-address" class="field-label">{$_("advertise.l_address_label")}</label>
                    <input id="lp-address" type="text" bind:value={address}
                           placeholder={$_("advertise.l_address_ph")} class="text-input" />
                </div>
                <div class="md:col-span-2">
                    <label for="lp-hours" class="field-label">{$_("advertise.l_hours_label")}</label>
                    <input id="lp-hours" type="text" bind:value={hours}
                           placeholder={$_("advertise.l_hours_ph")} class="text-input" />
                </div>
            </div>
        </section>

        {#if logo}
            <section class="step-card">
                <div class="flex flex-wrap items-center gap-3 text-xs">
                    <span class="font-bold text-gray-300">{$_("advertise.l_logo_ctrl")}</span>
                    <div class="inline-flex rounded-lg border border-white/10 bg-black/20 p-1">
                        {#each [["right", "b_pos_right"], ["center", "l_logo_center"], ["left", "b_pos_left"]] as [v, k]}
                            <button type="button" onclick={() => (lpAlign = v as LpLogoAlign)}
                                class="px-2.5 py-1 rounded-md font-bold transition-colors {lpAlign === v ? 'bg-amber-500 text-black' : 'text-gray-300 hover:text-white'}">{$_("advertise." + k)}</button>
                        {/each}
                    </div>
                    <div class="inline-flex rounded-lg border border-white/10 bg-black/20 p-1">
                        {#each [["white", "b_bg_white"], ["black", "b_bg_black"], ["clear", "b_bg_clear"]] as [v, k]}
                            <button type="button" onclick={() => (lpBg = v as LogoBg)}
                                class="px-2.5 py-1 rounded-md font-bold transition-colors {(lpBg ?? adStyleFromDraft.logoBg) === v ? 'bg-amber-500 text-black' : 'text-gray-300 hover:text-white'}">{$_("advertise." + k)}</button>
                        {/each}
                    </div>
                    <div class="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-2 py-1">
                        <button type="button" aria-label="-" class="w-6 h-6 rounded-md font-bold text-gray-300 bg-white/5" onclick={() => (lpSize = Math.max(30, (lpSize ?? 54) - 6))}>−</button>
                        <input type="range" min="30" max="140" step="2" class="w-20 accent-amber-500" value={lpSize ?? 54} oninput={(e) => (lpSize = +e.currentTarget.value)} />
                        <button type="button" aria-label="+" class="w-6 h-6 rounded-md font-bold text-gray-300 bg-white/5" onclick={() => (lpSize = Math.min(140, (lpSize ?? 54) + 6))}>+</button>
                    </div>
                </div>
            </section>
        {/if}

        <!-- =================== LIVE PREVIEW ===================  -->
        <section class="step-card">
            <div class="step-head">
                <span class="step-num">🔍</span>
                <h2>{$_("advertise.l_preview_title")}</h2>
            </div>
            <p class="step-help">{$_("advertise.l_preview_help")}</p>

            <!-- התצוגה המקדימה מחקה 1:1 את דף הנחיתה האמיתי (routes/ads/[id]):
                 טקסט ליד התמונה, לא מתחתיה, כדי שהכל ייכנס במסך אחד בלי גלילה. -->
            <div class="preview-frame landing">
                <div class="landing-mock">
                    <header class="landing-hero bg-gradient-to-br {gradient}">
                        <div class="landing-hero-inner" class:has-media={!!previewHeroImage}>
                            <div class="landing-copy">
                                {#if logo}
                                    <img src={logo} alt={$_("advertise.b_logo_alt")} class="landing-logo {logoShape === 'circle' ? 'landing-logo-circle' : ''}" style={lpLogoStyle(lpStyle)} />
                                {/if}
                                <h1>{landingHeadline || title || $_("advertise.l_ph_headline")}</h1>
                                <p>{landingPitch || subtitle || $_("advertise.l_ph_pitch")}</p>

                                {#if previewAdvInHero}
                                    <ul class="advantages-list on-hero">
                                        {#each previewAdvantages as adv}
                                            <li class="advantage-item">
                                                <span class="advantage-check" aria-hidden="true">✓</span>
                                                <span class="advantage-text">{adv}</span>
                                            </li>
                                        {/each}
                                    </ul>
                                {/if}

                                <div class="landing-actions">
                                    {#if phone}
                                        <a href="tel:{phone}" class="landing-cta">📞 {phone}</a>
                                    {/if}
                                    {#if whatsapp}
                                        <a href="https://wa.me/{whatsapp.replace(/\D/g,'')}" class="landing-cta wa">{$_("advertise.l_wa_label", { values: { phone: whatsapp } })}</a>
                                    {:else if website}
                                        <a href={website} class="landing-cta ghost">{$_("advertise.l_to_site")}</a>
                                    {/if}
                                    {#if !phone && !whatsapp && !website}
                                        <span class="landing-cta opacity-60">{$_("advertise.l_complete_contact")}</span>
                                    {/if}
                                </div>
                            </div>

                            {#if previewHeroImage}
                                <div class="landing-media">
                                    <img src={previewHeroImage} alt={title} />
                                </div>
                            {/if}
                        </div>
                    </header>

                    {#if previewAdvantages.length > 0 && !previewAdvInHero}
                        <section class="landing-section landing-advantages">
                            <ul class="advantages-list strip">
                                {#each previewAdvantages as adv}
                                    <li class="advantage-item">
                                        <span class="advantage-check tinted bg-gradient-to-br {gradient}" aria-hidden="true">✓</span>
                                        <span class="advantage-text">{adv}</span>
                                    </li>
                                {/each}
                            </ul>
                        </section>
                    {/if}

                    {#if landingExtended || uniqueness}
                        <section class="landing-section landing-about">
                            {#if landingExtended}
                                <article>
                                    <h2>{$_("advertise.l_our_story")}</h2>
                                    <p style="white-space: pre-line">{landingExtended}</p>
                                </article>
                            {/if}
                            {#if uniqueness}
                                <article>
                                    <h2>{$_("advertise.l_why_us")}</h2>
                                    <p style="white-space: pre-line">{uniqueness}</p>
                                </article>
                            {/if}
                        </section>
                    {/if}

                    {#if products.length > 0}
                        <section class="landing-section">
                            <h2>{$_("advertise.l_our_products")}</h2>
                            <div class="products-grid">
                                {#each products as p}
                                    <div class="product-card">
                                        {#if p.image}
                                            <img src={p.image} alt={p.name} />
                                        {:else}
                                            <div class="img-placeholder small">{$_("advertise.l_photo")}</div>
                                        {/if}
                                        <div class="product-info">
                                            <p class="product-name">{p.name || $_("advertise.l_ph_product_name")}</p>
                                            {#if p.description}<p class="product-desc">{p.description}</p>{/if}
                                            {#if p.price}<p class="product-price">₪{p.price}</p>{/if}
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </section>
                    {/if}

                    <!-- רק מה שלא כבר מופיע ככפתור בהדר — כל פרט קשר פעם אחת -->
                    {#if email || (website && whatsapp) || address || hours}
                        <section class="landing-section landing-contact">
                            <h2>{$_("advertise.l_contact")}</h2>
                            {#if email || (website && whatsapp)}
                                <div class="contact-pills">
                                    {#if email}<a class="contact-pill" href="mailto:{email}">✉️ {email}</a>{/if}
                                    {#if website && whatsapp}<a class="contact-pill" href={website} target="_blank" rel="noopener">🌐 {website}</a>{/if}
                                </div>
                            {/if}
                            {#if address || hours}
                                <p class="contact-meta">
                                    {#if address}📍 {address}{/if}{#if address && hours} · {/if}{#if hours}🕒 {hours}{/if}
                                </p>
                            {/if}
                        </section>
                    {/if}
                </div>
            </div>
        </section>

        <!-- =================== SUBMIT =================== -->
        <section class="step-card">
            <div class="step-head">
                <span class="step-num">✓</span>
                <h2>{$_("advertise.l_final_title")}</h2>
            </div>

            <!-- שדה דבש -->
            <div aria-hidden="true" class="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0">
                <label>
                    {$_("advertise.r_honeypot")}
                    <input type="text" name="company_url" tabindex="-1" autocomplete="off" bind:value={companyUrl} />
                </label>
            </div>

            {#if !editTarget}
                <div class="mb-4">
                    <p class="field-label">{$_("advertise.r_period_title")}</p>
                    <div class="flex flex-wrap gap-2">
                        {#each data.plans as p (p.days)}
                            <button type="button" onclick={() => (durationDays = p.days)} aria-pressed={durationDays === p.days}
                                class="px-4 py-2 rounded-xl border text-sm font-bold transition-colors {durationDays === p.days ? 'border-amber-400 bg-amber-500 text-black' : 'border-white/10 bg-white/5 text-gray-300 hover:text-white'}">
                                {p.label} · ₪{p.price}
                            </button>
                        {/each}
                    </div>
                    <p class="text-xs text-gray-400 mt-2">{$_("advertise.r_period_note")}</p>
                </div>
            {/if}

            <p class="text-xs mb-3 {overweight ? 'text-red-300 font-bold' : 'text-gray-400'}">
                {overweight
                    ? $_("advertise.r_overweight", { values: { cur: fmtKb(curBytes), max: fmtKb(MAX_AD_TOTAL_BYTES) } })
                    : $_("advertise.r_weight", { values: { cur: fmtKb(curBytes), max: fmtKb(MAX_AD_TOTAL_BYTES) } })}
            </p>

            <ul class="checklist">
                <li class:done={!!adImage}><span>{adImage ? "✅" : "⬜"}</span> {$_("advertise.b_main_image_alt")}</li>
                <li class:done={!!adTitle}><span>{adTitle ? "✅" : "⬜"}</span> {$_("advertise.b_s3_title")}</li>
                <li class:done={!!adSubtitle}><span>{adSubtitle ? "✅" : "⬜"}</span> {$_("advertise.cl_subtitle")}</li>
                <li class:done={!!hoverText}><span>{hoverText ? "✅" : "⬜"}</span> {$_("advertise.cl_hover")}</li>
                <li class:done={!!(phone || website)}><span>{(phone || website) ? "✅" : "⬜"}</span> {$_("advertise.cl_channel")}</li>
                <li class:done={products.length > 0}><span>{products.length > 0 ? "✅" : "⬜"}</span> {$_("advertise.cl_products", { values: { n: products.length } })}</li>
                <li class:done={!!uniqueness}><span>{uniqueness ? "✅" : "⬜"}</span> {$_("advertise.cl_unique")}</li>
                <li class:done={!!address}><span>{address ? "✅" : "⬜"}</span> {$_("advertise.cl_address")}</li>
            </ul>

            {#if submitError}
                <p class="text-red-300 text-sm mt-3 font-bold">{$_("advertise.l_submit_err", { values: { msg: submitError } })}</p>
            {/if}

            <button type="button" onclick={submitAd} disabled={submitting || overweight}
                class="mt-5 w-full py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black text-lg shadow-xl shadow-green-500/30 transition-all
                       {!submitting && !overweight ? 'hover:scale-[1.02] active:scale-95' : 'opacity-50 cursor-not-allowed'}">
                {#if submitting}{$_("advertise.sending")}{:else if editTarget}{$_("advertise.r_save")}{:else}{$_("advertise.l_submit")}{/if}
            </button>
        </section>

        {:else}
            <!-- =================== DONE =================== -->
            <section class="step-card success-card" bind:this={successEl}>
                <div class="text-center py-6">
                    <div class="text-6xl mb-3">🎉</div>
                    <h2 class="text-2xl md:text-3xl font-black text-green-300 mb-2">{editedDone ? $_("advertise.r_done_title_edit") : $_("advertise.l_done_title")}</h2>
                    <p class="text-gray-300 max-w-lg mx-auto">
                        {editedDone ? $_("advertise.r_done_body_edit") : $_("advertise.r_done_body")}
                    </p>
                    <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <a href="/" class="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition-colors">
                            {$_("advertise.l_home")}
                        </a>
                        <a href="/advertise/manage" class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors">
                            {$_("advertise.r_my_ads")}
                        </a>
                    </div>
                </div>
            </section>
        {/if}

    {/if}
</div>

<style>
    .ad-builder :global(*) { box-sizing: border-box; }

    /* ============== Compress notice toast ============== */
    :global(.compress-toast) {
        position: fixed;
        top: 5rem; left: 50%;
        transform: translateX(-50%);
        z-index: 60;
        width: calc(100% - 1.5rem); max-width: 32rem;
        padding: 0.875rem 2.5rem 0.875rem 1rem;
        border-radius: 1rem;
        border: 1px solid rgba(251, 191, 36, 0.55);
        background: linear-gradient(135deg, rgba(120, 53, 15, 0.92), rgba(146, 64, 14, 0.88));
        box-shadow: 0 18px 40px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(251, 191, 36, 0.15) inset;
        backdrop-filter: blur(8px);
    }
    :global(.compress-toast-close) {
        position: absolute;
        top: 0.4rem; left: 0.5rem;
        width: 1.6rem; height: 1.6rem;
        border-radius: 9999px;
        background: rgba(0, 0, 0, 0.35);
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.75rem; line-height: 1;
        display: flex; align-items: center; justify-content: center;
        border: 1px solid rgba(255, 255, 255, 0.18);
        cursor: pointer;
    }
    :global(.compress-toast-close:hover) { background: rgba(220, 38, 38, 0.85); }
    /* גרסת שגיאה של אותו toast - אדום במקום ענבר */
    :global(.compress-toast.error-toast) {
        border-color: rgba(248, 113, 113, 0.6);
        background: linear-gradient(135deg, rgba(127, 29, 29, 0.94), rgba(153, 27, 27, 0.9));
        box-shadow: 0 18px 40px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(248, 113, 113, 0.18) inset;
    }
    /* אזהרת "הטיוטה לא נשמרת" יושבת בתחתית - קבועה, ולא מתנגשת עם toast עליון */
    :global(.compress-toast.draft-warn) {
        top: auto;
        bottom: 1rem;
    }

    /* ============== Step Card ============== */
    :global(.step-card) {
        background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 1.25rem;
        padding: 1.25rem 1.25rem 1.5rem;
        margin-bottom: 1.25rem;
        scroll-margin-top: 8rem;
        position: relative;
    }
    @media (min-width: 768px) {
        :global(.step-card) { padding: 1.75rem; margin-bottom: 1.75rem; }
    }
    :global(.success-card) {
        background: linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04));
        border-color: rgba(16,185,129,0.4);
    }

    :global(.step-head) {
        display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;
        color: rgb(229,231,235); font-weight: 900; flex-wrap: wrap;
    }
    :global(.step-head h2) {
        font-size: 1.125rem; font-weight: 900; line-height: 1.3; margin: 0;
    }
    @media (min-width: 768px) {
        :global(.step-head h2) { font-size: 1.5rem; }
    }
    :global(.step-num) {
        width: 2rem; height: 2rem; border-radius: 9999px;
        display: flex; align-items: center; justify-content: center;
        background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%);
        color: #000; font-weight: 900; font-size: 0.95rem;
        opacity: 0.85; flex-shrink: 0;
    }
    :global(.step-help) {
        color: rgb(156, 163, 175); font-size: 0.875rem; line-height: 1.55; margin: 0 0 1rem;
    }

    /* ============== Inputs ============== */
    :global(.text-input) {
        width: 100%; padding: 0.75rem 1rem; border-radius: 0.75rem;
        background: rgba(255,255,255,0.04); border: 2px solid rgba(255,255,255,0.08);
        color: white; font-size: 0.95rem; font-weight: 500; outline: none;
        transition: border-color 0.15s, background 0.15s;
        font-family: inherit;
    }
    :global(.text-input.small) { padding: 0.55rem 0.75rem; font-size: 0.85rem; }
    :global(.text-input::placeholder) { color: rgb(107, 114, 128); }
    :global(.text-input:focus) {
        border-color: rgba(245, 158, 11, 0.6);
        background: rgba(255,255,255,0.06);
    }
    :global(.field-label) {
        display: block; color: rgb(209, 213, 219); font-weight: 700; font-size: 0.85rem;
        margin-bottom: 0.4rem;
    }

    /* ============== Upload zone ============== */
    :global(.upload-zone-sm) {
        position: relative; display: flex; align-items: center; justify-content: center;
        width: 100%; max-width: 360px;
        min-height: 160px;
        border: 2px dashed rgba(245, 158, 11, 0.4); border-radius: 0.85rem;
        background: rgba(245, 158, 11, 0.04); cursor: pointer; overflow: hidden;
    }
    :global(.upload-zone-sm.has-image) { border-style: solid; padding: 0; }
    :global(.upload-zone-sm img) { width: 100%; height: 100%; object-fit: cover; }
    :global(.upload-zone-sm.dragging) {
        border-color: rgb(34, 197, 94);
        background: rgba(34, 197, 94, 0.12);
        box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.25);
    }
    :global(.remove-x) {
        position: absolute; top: 0.4rem; left: 0.4rem; z-index: 5;
        width: 1.75rem; height: 1.75rem; border-radius: 9999px;
        background: rgba(0,0,0,0.65); color: white; border: 1px solid rgba(255,255,255,0.2);
        font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
    :global(.remove-x:hover) { background: rgba(220,38,38,0.85); }

    /* ============== Product row ============== */
    :global(.product-row) {
        display: flex; align-items: stretch; gap: 0.75rem;
        background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
        border-radius: 0.85rem; padding: 0.75rem;
    }
    @media (max-width: 768px) {
        :global(.product-row) { flex-direction: column; }
    }
    :global(.product-row .grow) { flex: 1; }
    :global(.product-row .upload-zone-sm) {
        width: 100px; height: 100px; min-height: 100px; flex-shrink: 0;
    }
    :global(.remove-btn) {
        width: 2rem; height: 2rem; border-radius: 9999px; background: rgba(255,255,255,0.05);
        color: rgb(156, 163, 175); border: 1px solid rgba(255,255,255,0.08);
        cursor: pointer; align-self: center; flex-shrink: 0;
    }
    :global(.remove-btn:hover) { background: rgba(220,38,38,0.6); color: white; }

    /* ============== Preview frame ============== */
    :global(.preview-frame) { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }

    /* ============== LANDING MOCK ============== */
    :global(.landing-mock) {
        width: 100%; max-width: 720px; background: #0f172a;
        border-radius: 0.85rem; overflow: hidden; border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    }
    :global(.landing-hero) { padding: 1.5rem 1.35rem; }
    :global(.landing-hero-inner) {
        display: grid; gap: 1.25rem; align-items: center; text-align: center;
    }
    @media (min-width: 700px) {
        :global(.landing-hero) { padding: 1.9rem 1.75rem; }
        :global(.landing-hero-inner.has-media) {
            grid-template-columns: minmax(0, 1fr) minmax(0, 17rem);
            text-align: right;
        }
    }
    :global(.landing-copy) { min-width: 0; }
    :global(.landing-media) { min-width: 0; }
    :global(.landing-media img) {
        display: block; width: auto; max-width: 100%; max-height: 12rem;
        margin-inline: auto; border-radius: 0.8rem; box-shadow: 0 10px 26px rgba(0,0,0,0.35);
    }
    @media (min-width: 700px) {
        :global(.landing-media img) { max-height: 20rem; }
    }
    :global(.landing-logo) {
        width: 54px; height: 54px;
        border-radius: 0.6rem;
        background: white;
        padding: 5px;
        object-fit: contain;
        margin: 0 0 0.6rem;
        box-shadow: 0 4px 14px rgba(0,0,0,0.35);
    }
    :global(.landing-logo.landing-logo-circle) { border-radius: 9999px; }
    :global(.landing-hero h1) { color: white; font-size: 1.45rem; font-weight: 900; margin: 0 0 0.4rem; line-height: 1.25; }
    :global(.landing-hero p)  { color: rgba(255,255,255,0.92); font-size: 0.95rem; margin: 0; line-height: 1.45; white-space: pre-line; overflow-wrap: anywhere; }
    :global(.landing-actions) { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; margin-top: 0.9rem; }
    @media (min-width: 700px) {
        :global(.has-media .landing-actions) { justify-content: flex-start; }
    }

    :global(.advantages-list) {
        list-style: none; padding: 0; margin: 0;
        display: grid; gap: 0.45rem;
        text-align: right;
    }
    :global(.advantages-list.on-hero) { margin-top: 0.9rem; }
    :global(.advantages-list.strip) {
        grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
        gap: 0.5rem 1.25rem;
    }
    :global(.advantage-item) {
        display: flex; align-items: center; gap: 0.6rem;
        background: transparent;
        border: 0;
        border-radius: 0;
        text-align: right;
    }
    :global(.advantage-check) {
        flex-shrink: 0;
        width: 22px; height: 22px;
        border-radius: 9999px;
        display: flex; align-items: center; justify-content: center;
        background-color: rgba(255,255,255,0.92);
        color: #111827;
        font-weight: 900;
        font-size: 0.75rem;
        line-height: 1;
    }
    /* הגרדיאנט מגיע ממחלקות Tailwind על האלמנט - רק צבע הרקע מתבטל */
    :global(.advantage-check.tinted) { background-color: transparent; color: #fff; }
    :global(.advantage-text) {
        color: rgb(229,231,235);
        font-size: 0.92rem;
        line-height: 1.35;
        font-weight: 600;
    }
    :global(.on-hero .advantage-text) { color: rgba(255,255,255,0.95); }
    :global(.landing-cta) {
        display: inline-flex; align-items: center; padding: 0.55rem 1.1rem; border-radius: 9999px;
        background: white; color: black; font-weight: 800; font-size: 0.95rem;
        text-decoration: none; box-shadow: 0 8px 25px rgba(0,0,0,0.25);
    }
    :global(.landing-cta.wa) { background: #16a34a; color: #fff; }
    :global(.landing-cta.ghost) {
        background: rgba(255,255,255,0.15); color: #fff;
        border: 1px solid rgba(255,255,255,0.35);
    }
    :global(.landing-section) {
        padding: 1.1rem 1.4rem; border-top: 1px solid rgba(255,255,255,0.05);
    }
    :global(.landing-section h2) {
        color: white; font-size: 1.05rem; font-weight: 900; margin: 0 0 0.5rem;
    }
    :global(.landing-section p) { color: rgb(209,213,219); font-size: 0.9rem; line-height: 1.55; overflow-wrap: anywhere; }
    :global(.landing-about) { display: grid; gap: 1rem; }
    @media (min-width: 700px) {
        :global(.landing-about) { grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 1.75rem; }
    }
    :global(.products-grid) {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.75rem;
    }
    :global(.product-card) {
        background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
        border-radius: 0.75rem; overflow: hidden; display: flex; flex-direction: column;
    }
    :global(.product-card img) { width: 100%; height: 100px; object-fit: cover; }
    :global(.product-info) { padding: 0.6rem; }
    :global(.product-name)  { color: white; font-weight: 700; font-size: 0.85rem; margin: 0 0 0.2rem; }
    :global(.product-desc)  { color: rgb(156,163,175); font-size: 0.72rem; margin: 0 0 0.3rem; line-height: 1.3; }
    :global(.product-price) { color: #fbbf24; font-weight: 900; font-size: 0.95rem; margin: 0; }
    :global(.landing-contact) { text-align: center; }
    :global(.contact-pills) { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
    :global(.contact-pill) {
        display: inline-flex; align-items: center; gap: 0.35rem;
        padding: 0.45rem 0.9rem; border-radius: 9999px;
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
        color: rgb(229,231,235); font-size: 0.875rem; font-weight: 700; text-decoration: none;
    }
    :global(.contact-pill:hover) {
        background: rgba(251,191,36,0.12); border-color: rgba(251,191,36,0.45); color: #fde68a;
    }
    :global(.contact-meta) { color: rgb(156,163,175); font-size: 0.825rem; margin: 0.75rem 0 0; }

    :global(.img-placeholder) {
        width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
        background: rgba(255,255,255,0.03); color: rgb(107, 114, 128); font-size: 0.85rem; font-weight: 700;
    }
    :global(.img-placeholder.small) { font-size: 0.7rem; }

    /* ============== Checklist ============== */
    :global(.checklist) {
        list-style: none; padding: 0; margin: 0;
        display: grid; grid-template-columns: 1fr; gap: 0.5rem;
    }
    @media (min-width: 640px) {
        :global(.checklist) { grid-template-columns: 1fr 1fr; }
    }
    :global(.checklist li) {
        background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
        border-radius: 0.6rem; padding: 0.55rem 0.85rem;
        color: rgb(156,163,175); font-size: 0.875rem;
        display: flex; align-items: center; gap: 0.5rem;
    }
    :global(.checklist li.done) {
        color: rgb(229,231,235);
        background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.25);
    }
</style>
