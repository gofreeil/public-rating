import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
    let session = null;
    try {
        session = await event.locals.auth();
    } catch {
        // session לא תקין - נמשיך כמשתמש אנונימי
    }

    // הצרכן היחיד של layoutUser היה דרואר הפרסומות (getUserById מול Strapi
    // בכל בקשה, בכל דף). עם הסרתו נחסכה קריאת רשת מכל טעינת דף.
    return { session };
};
