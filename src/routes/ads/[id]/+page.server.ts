// ============================================================
// /ads/[id] — דף הנחיתה המקומי של מודעה.
//
// זו הסיבה שהפלטפורמה קיימת: קליק על מודעה נשאר באתר במקום לשלוח את
// הגולש לאתר של המפרסם.
//
// הקובץ הזה הוא גם גבול הפרטיות. באתר המקור הוחזר אובייקט המודעה
// המלא, ולכן האימייל של המפרסם ושל האדמין שאישר נכנסו ל-HTML של דף
// עם cache-control: public. כאן מוחזר toPublicAd בלבד.
// ============================================================

import { error } from '@sveltejs/kit';
import { getAd, isExpired, toPublicAd } from '$lib/server/ads';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
    let ad;
    try {
        ad = await getAd(params.id);
    } catch (e) {
        console.warn('[ads] landing load failed:', e instanceof Error ? e.message : e);
        error(503, 'המערכת עמוסה כרגע — נסו לרענן בעוד רגע');
    }

    // מודעה שטרם אושרה, שנדחתה או שפג תוקפה אינה קיימת כלפי חוץ
    if (!ad || ad.status !== 'approved' || isExpired(ad)) {
        error(404, 'הפרסומת לא נמצאה');
    }

    setHeaders({ 'cache-control': 'public, s-maxage=60, stale-while-revalidate=600' });
    return { ad: toPublicAd(ad) };
};
