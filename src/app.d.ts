// See https://svelte.dev/docs/kit/types#app.d.ts
import type { DefaultSession } from '@auth/sveltekit';

declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            auth: () => Promise<import('@auth/sveltekit').Session | null>;
        }
        interface PageData {
            session?: import('@auth/sveltekit').Session | null;
        }
        // interface PageState {}
        // interface Platform {}
    }
}

// הרחב את טיפוסי Auth.js לכלול שדות מותאמים
declare module '@auth/core/types' {
    interface Session {
        user: {
            id: string;
            provider?: string;
            strapiJwt?: string;
            // neighborhood_admin — ערך ישן של אדמין האתר (לפני rating_admin)
            role?: 'user' | 'rating_admin' | 'neighborhood_admin' | 'super_admin';
            neighborhood?: string;
            banned?: boolean;
        } & DefaultSession['user'];
    }
}

declare module '@auth/core/jwt' {
    interface JWT {
        dbUserId?: string;
        provider?: string;
        strapiJwt?: string;
        role?: 'user' | 'rating_admin' | 'neighborhood_admin' | 'super_admin';
        neighborhood?: string;
        banned?: boolean;
    }
}

export {};
