import type { PageServerLoad } from './$types';

/**
 * דף ביניים לזיהוי אוטומטי (ראו $lib/server/ssoAdopt.ts). ה-hook הפנה לכאן כי
 * קיימת עוגיית gofreeil-auth ואין סשן מקומי. הדף עצמו מקים את הסשן בדפדפן
 * ומחזיר את המשתמש ליעד המקורי; כל כישלון — חזרה ליעד כאורח.
 */
export const load: PageServerLoad = async ({ url }) => {
	const raw = url.searchParams.get('redirect') ?? '/';
	// רק נתיב פנימי (מונע open-redirect; חוסם גם '/\' שהדפדפן הופך ל-//)
	const redirectTo = /^\/(?![/\\])/.test(raw) ? raw : '/';
	return { redirectTo };
};
