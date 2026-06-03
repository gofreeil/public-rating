import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// מחזיר את המפתח הציבורי בלבד - אין token, אין מידע רגיש
export const GET = () => json({ key: env.PUBLIC_VAPID_PUBLIC_KEY ?? '' });
