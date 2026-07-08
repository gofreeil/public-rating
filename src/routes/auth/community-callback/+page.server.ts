import type { PageServerLoad } from './$types';

/**
 * חזרה מ-SSO של "יוצאים לחירות" (community.gofreeil.com/sso).
 * קהילה כבר קבעה את העוגייה המשותפת gofreeil-auth על .gofreeil.com; כאן רק
 * מחלצים את יעד החזרה ומסמנים אם קהילה החזירה שגיאה (לא רשום/לא מחובר).
 * הקליינט קורא ל-signIn('gofreeil-sso') שקורא את העוגייה ומקים סשן.
 */
export const load: PageServerLoad = async ({ url }) => {
    const raw = url.searchParams.get('returnTo') ?? '/';
    const returnTo = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
    const error = url.searchParams.get('error');
    return { returnTo, error };
};
