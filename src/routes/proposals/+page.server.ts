// ============================================================
// מרחב ההצעות — רשימת ההצעות האזרחיות המאושרות
// ============================================================

import { listProposals } from '$lib/server/rating';
import { toPublicProposal } from '$lib/rating/aggregate';
import type { CivicProposal } from '$lib/rating/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try {
        session = await event.locals.auth();
    } catch {}
    const meId = session?.user?.id ?? null;

    let proposals: CivicProposal[] = [];
    try {
        proposals = await listProposals();
    } catch {
        proposals = [];
    }

    return {
        proposals: proposals.map((p) => toPublicProposal(p, meId)),
        loggedIn: Boolean(meId),
    };
};
