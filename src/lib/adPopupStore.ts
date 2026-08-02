import { writable } from 'svelte/store';
import { ads, type Ad } from './adsData';

const STORAGE_KEY = 'ad_deck';

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getFullAds(): Ad[] {
    return ads.filter(a => a.title && a.description && a.image && a.href);
}

// טוען או יוצר חפיסה מ-localStorage
function loadDeck(): { deck: number[]; pos: number } {
    if (typeof window === 'undefined') return { deck: [], pos: 0 };

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const saved = JSON.parse(raw) as { deck: number[]; pos: number };
            if (Array.isArray(saved.deck) && saved.deck.length > 0 && saved.pos < saved.deck.length) {
                return saved;
            }
        }
    } catch {}

    return buildNewDeck();
}

// בונה חפיסה חדשה מעורבבת ושומר ב-localStorage
function buildNewDeck(): { deck: number[]; pos: number } {
    const fullAds = getFullAds();
    const deck = shuffle(fullAds.map(a => a.id));
    const state = { deck, pos: 0 };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
    return state;
}

function saveDeckState(deck: number[], pos: number) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ deck, pos })); } catch {}
}

function getNextFullAd(): Ad | null {
    const fullAds = getFullAds();
    if (!fullAds.length) return null;

    let { deck, pos } = loadDeck();

    // סיבוב נגמר → חפיסה חדשה
    if (pos >= deck.length) {
        ({ deck, pos } = buildNewDeck());
    }

    const id = deck[pos];
    const ad = fullAds.find(a => a.id === id) ?? fullAds[0];

    saveDeckState(deck, pos + 1);
    return ad;
}

export const adPopup = writable<{ ad: Ad; pendingHref?: string } | null>(null);

export function triggerAdPopup(pendingHref?: string): boolean {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) return false;
    const ad = getNextFullAd();
    if (!ad) return false;
    adPopup.set({ ad, pendingHref });
    return true;
}

export function closeAdPopup() {
    adPopup.set(null);
}
