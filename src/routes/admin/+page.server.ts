import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// כמו בגמ"ח הארצי: אין מסך "סקירה" נפרד — פאנל הניהול פרוס באזור האישי
// (/my-ratings#admin), עם אותם אריחים ומונים. /admin נשאר חי כהפניה, כי
// הוא מקושר מסימניות ומשמש fallback לכפתור "חזור". ניהול המשתמשים עבר
// ל-/admin/users.
export const load: PageServerLoad = async () => {
    redirect(302, '/my-ratings#admin');
};
