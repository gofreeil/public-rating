// כל ה-routes של /auth/* מטופלים על ידי ה-handle hook (src/hooks.server.ts)
// שמתבסס על SvelteKitAuth מ-@auth/sveltekit.
// קובץ זה הוא placeholder בלבד - ה-handle מיירט בקשות אלו לפני שהן מגיעות לכאן.

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// fallback - לא אמור להיגיע לכאן
export const GET: RequestHandler = async () => { throw error(404); };
export const POST: RequestHandler = async () => { throw error(404); };
