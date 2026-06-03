// ============================================================
// db.ts - שכבת הנתונים
//
// פריטים + קופת קהילה + משתמשים → Strapi 5 (async, cloud-persistent)
// ============================================================

import { strapiGet, strapiPost, strapiPut } from './strapiClient.js';
import bcrypt from 'bcryptjs';

// ============================================================
// ---- Types ----
// ============================================================

export interface DbItem {
    id: string;
    category: string;
    label: string;
    description: string;
    contact: string;
    phone: string;
    address: string;
    icon: string;
    color: string;
    neighborhood: string;
    city: string;
    extra_fields: string;   // JSON string
    status: string;
    user_id: string | null;
    created_at: string;
}

export interface CreateItemData {
    id?: string;
    category: string;
    label: string;
    description?: string;
    contact?: string;
    phone?: string;
    address?: string;
    icon?: string;
    color?: string;
    neighborhood?: string;
    city?: string;
    extra_fields?: Record<string, unknown>;
    user_id?: string;
}

export interface DbUser {
    id: string;
    name: string | null;
    email: string | null;
    phone: string;
    neighborhood: string;
    city: string;
    avatar_url: string | null;
    provider: string | null;
    nickname: string;
    business: string;
    notifications: number;
    family_status: string;
    gender: string;
    birth_date: string;
    balance: number;
    role: 'user' | 'neighborhood_admin' | 'super_admin';
    banned: boolean;
    created_at: string;
}

export interface UpsertUserData {
    id: string;
    name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
    provider?: string;
}

export interface UpdateProfileData {
    name?: string;
    email?: string;
    phone?: string;
    neighborhood?: string;
    city?: string;
    nickname?: string;
    business?: string;
    notifications?: number;
    family_status?: string;
    gender?: string;
    avatar_url?: string;
    birth_date?: string;
}

// ============================================================
// ---- Strapi internal types (Items) ----
// ============================================================

interface StrapiItem {
    id: number;
    documentId: string;
    label: string;
    category: string;
    description: string | null;
    contact: string | null;
    phone: string | null;
    address: string | null;
    icon: string | null;
    color: string | null;
    neighborhood: string | null;
    city: string | null;
    extra_fields: Record<string, unknown> | null;
    status1: string | null;
    user_id: string | null;
    createdAt: string;
}

interface StrapiFundEntry {
    id: number;
    documentId: string;
    amount: number;
}

interface StrapiCommunityUser {
    id: number;
    documentId: string;
    external_id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    neighborhood: string | null;
    city: string | null;
    avatar_url: string | null;
    provider: string | null;
    password_hash: string | null;
    nickname: string | null;
    business: string | null;
    notifications: boolean | null;
    family_status: string | null;
    gender: string | null;
    birth_date: string | null;
    balance: number | null;
    role: string | null;
    banned: boolean | null;
    createdAt: string;
}

// ============================================================
// ---- Mappers ----
// ============================================================

function mapStrapiItem(item: StrapiItem): DbItem {
    return {
        id:           item.documentId,
        category:     item.category     ?? '',
        label:        item.label        ?? '',
        description:  item.description  ?? '',
        contact:      item.contact      ?? '',
        phone:        item.phone        ?? '',
        address:      item.address      ?? '',
        icon:         item.icon         ?? '📌',
        color:        item.color        ?? 'purple',
        neighborhood: item.neighborhood ?? '',
        city:         item.city         ?? '',
        extra_fields: item.extra_fields && typeof item.extra_fields === 'object'
            ? JSON.stringify(item.extra_fields)
            : '{}',
        status:       item.status1      ?? 'active',
        user_id:      item.user_id      ?? null,
        created_at:   item.createdAt    ?? '',
    };
}

function mapStrapiUser(u: StrapiCommunityUser): DbUser {
    return {
        id:            u.external_id,
        name:          u.name          ?? null,
        email:         u.email         ?? null,
        phone:         u.phone         ?? '',
        neighborhood:  u.neighborhood  ?? '',
        city:          u.city          ?? '',
        avatar_url:    u.avatar_url    ?? null,
        provider:      u.provider      ?? null,
        nickname:      u.nickname      ?? '',
        business:      u.business      ?? '',
        notifications: u.notifications ? 1 : 0,
        family_status: u.family_status ?? '',
        gender:        u.gender        ?? '',
        birth_date:    u.birth_date    ?? '',
        balance:       u.balance       ?? 0,
        role:          (u.role as DbUser['role']) ?? 'user',
        banned:        u.banned        ?? false,
        created_at:    u.createdAt     ?? '',
    };
}

// ============================================================
// ---- Items (Strapi) ----
// ============================================================

export async function getAllItems(): Promise<DbItem[]> {
    const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
        'filters[status1][$eq]': 'active',
        'sort':                  'createdAt:desc',
        'pagination[limit]':     '1000',
    });
    return (res.data ?? []).map(mapStrapiItem);
}

export async function createItem(data: CreateItemData): Promise<DbItem> {
    const res = await strapiPost<{ data: StrapiItem }>('/api/items', {
        data: {
            label:        data.label,
            category:     data.category,
            description:  data.description  ?? '',
            contact:      data.contact      ?? '',
            phone:        data.phone        ?? '',
            address:      data.address      ?? '',
            icon:         data.icon         ?? '📌',
            color:        data.color        ?? 'purple',
            neighborhood: data.neighborhood ?? '',
            city:         data.city         ?? '',
            extra_fields: data.extra_fields ?? {},
            status1:      'active',
            user_id:      data.user_id ?? null,
            publishedAt:  new Date().toISOString(),
        },
    });
    return mapStrapiItem(res.data);
}

export async function getDbItemById(id: string): Promise<DbItem | undefined> {
    try {
        const res = await strapiGet<{ data: StrapiItem }>(`/api/items/${id}`);
        if (!res.data) return undefined;
        return mapStrapiItem(res.data);
    } catch {
        return undefined;
    }
}

export async function getItemsByCategory(category: string): Promise<DbItem[]> {
    const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
        'filters[category][$eq]':  category,
        'filters[status1][$eq]':   'active',
        'sort':                    'createdAt:desc',
        'pagination[limit]':       '1000',
    });
    return (res.data ?? []).map(mapStrapiItem);
}

export async function searchItems(query: string): Promise<DbItem[]> {
    const q = query.trim();
    if (!q) return [];
    const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
        'filters[$or][0][label][$containsi]':       q,
        'filters[$or][1][description][$containsi]': q,
        'filters[$or][2][category][$containsi]':    q,
        'filters[status1][$eq]':                    'active',
        'sort':                                     'createdAt:desc',
        'pagination[limit]':                        '500',
    });
    return (res.data ?? []).map(mapStrapiItem);
}

export async function getItemsByUserId(userId: string): Promise<DbItem[]> {
    const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
        'filters[user_id][$eq]': userId,
        'sort':                  'createdAt:desc',
        'pagination[limit]':     '1000',
    });
    return (res.data ?? []).map(mapStrapiItem);
}

export async function resolveItem(documentId: string, resolverPhone: string): Promise<void> {
    await strapiPut(`/api/items/${documentId}`, {
        data: {
            status1:     'resolved',
            description: `[הוסר על ידי הפורסם - טלפון מחזיר: ${resolverPhone}]`,
        },
    });
}

export async function getResolvedCount(category: string): Promise<number> {
    const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
        'filters[category][$eq]':  category,
        'filters[status1][$eq]':   'resolved',
        'pagination[limit]':       '1',
        'pagination[withCount]':   'true',
    });
    return (res as unknown as { meta?: { pagination?: { total?: number } } }).meta?.pagination?.total ?? 0;
}

// ============================================================
// ---- Admin actions ----
// ============================================================

/** מחיקת פריט (אדמין בלבד) - מעביר לסטטוס deleted */
export async function adminDeleteItem(documentId: string, adminId: string): Promise<void> {
    await strapiPut(`/api/items/${documentId}`, {
        data: {
            status1:     'deleted',
            description: `[הוסר ע"י אדמין: ${adminId}]`,
        },
    });
}

/** שליפת כל המשתמשים (אדמין בלבד) */
export async function getAllUsers(jwt?: string): Promise<DbUser[]> {
    const res = await strapiGet<{ data: StrapiCommunityUser[] }>('/api/community-users', {
        'pagination[limit]': '1000',
        'sort':              'createdAt:desc',
    }, jwt);
    return (res.data ?? []).map(mapStrapiUser);
}

/** שינוי role של משתמש (סופר-אדמין בלבד) */
export async function setUserRole(externalId: string, role: string, neighborhood?: string): Promise<void> {
    const user = await findStrapiUser(externalId);
    if (!user) throw new Error('משתמש לא נמצא');
    await strapiPut(`/api/community-users/${user.documentId}`, {
        data: {
            role,
            ...(neighborhood !== undefined ? { neighborhood } : {}),
        },
    });
}

/** חסימת משתמש (אדמין בלבד) */
export async function banUser(externalId: string): Promise<void> {
    const user = await findStrapiUser(externalId);
    if (!user) throw new Error('משתמש לא נמצא');
    await strapiPut(`/api/community-users/${user.documentId}`, {
        data: { banned: true },
    });
}

/** ביטול חסימת משתמש */
export async function unbanUser(externalId: string): Promise<void> {
    const user = await findStrapiUser(externalId);
    if (!user) throw new Error('משתמש לא נמצא');
    await strapiPut(`/api/community-users/${user.documentId}`, {
        data: { banned: false },
    });
}

export async function getMessagesByUserId(userId: string): Promise<DbItem[]> {
    const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
        'filters[category][$eq]': 'message',
        'filters[user_id][$eq]':  userId,
        'sort':                   'createdAt:desc',
        'pagination[limit]':      '200',
    });
    return (res.data ?? []).map(mapStrapiItem);
}

// ============================================================
// ---- Community Fund (Strapi) ----
// ============================================================

export async function getFundTotal(): Promise<number> {
    const res = await strapiGet<{ data: StrapiFundEntry[] }>('/api/community-funds', {
        'pagination[limit]': '1000',
    });
    return (res.data ?? []).reduce((sum, entry) => sum + (entry.amount ?? 0), 0);
}

export async function addFundDonation(amount: number): Promise<number> {
    await strapiPost('/api/community-funds', {
        data: {
            amount,
            source:      'donation',
            publishedAt: new Date().toISOString(),
        },
    });
    return getFundTotal();
}

export async function addFundContribution(neighborhood: string, totalPayment: number): Promise<number> {
    const tithe = Math.round(totalPayment * 0.1);
    await strapiPost('/api/community-funds', {
        data: {
            amount:      tithe,
            source:      'order',
            note:        `10% מהזמנת פרסום - ${neighborhood}`,
            publishedAt: new Date().toISOString(),
        },
    });
    return getFundTotal();
}

// ============================================================
// ---- Users (Strapi - cloud-persistent) ----
// ============================================================

async function findStrapiUser(externalId: string, jwt?: string): Promise<StrapiCommunityUser | undefined> {
    const res = await strapiGet<{ data: StrapiCommunityUser[] }>('/api/community-users', {
        'filters[external_id][$eq]': externalId,
        'pagination[limit]':         '1',
    }, jwt);
    return res.data?.[0];
}

export async function upsertUser(data: UpsertUserData, jwt?: string): Promise<void> {
    const existing = await findStrapiUser(data.id, jwt);
    if (!existing) {
        await strapiPost('/api/community-users', {
            data: {
                external_id: data.id,
                name:        data.name        ?? null,
                email:       data.email       ?? null,
                avatar_url:  data.avatar_url  ?? null,
                provider:    data.provider    ?? null,
                publishedAt: new Date().toISOString(),
            },
        }, jwt);
    } else {
        const updates: Record<string, unknown> = {};
        if (data.name  && !existing.name)  updates.name  = data.name;
        if (data.email && !existing.email) updates.email = data.email;
        if (data.provider && !existing.provider) updates.provider = data.provider;
        if (data.avatar_url && !existing.avatar_url?.startsWith('data:')) {
            updates.avatar_url = data.avatar_url;
        }
        if (Object.keys(updates).length > 0) {
            await strapiPut(`/api/community-users/${existing.documentId}`, { data: updates }, jwt);
        }
    }
}

export async function getUserById(id: string, jwt?: string): Promise<DbUser | undefined> {
    const u = await findStrapiUser(id, jwt);
    return u ? mapStrapiUser(u) : undefined;
}

export async function getUserByEmail(email: string, jwt?: string): Promise<DbUser | undefined> {
    const res = await strapiGet<{ data: StrapiCommunityUser[] }>('/api/community-users', {
        'filters[email][$eq]': email,
        'pagination[limit]':   '1',
    }, jwt);
    const u = res.data?.[0];
    return u ? mapStrapiUser(u) : undefined;
}

export async function updateUserProfile(id: string, data: UpdateProfileData, jwt?: string): Promise<DbUser | undefined> {
    const existing = await findStrapiUser(id);
    if (!existing) return undefined;

    const updates: Record<string, unknown> = {};
    if (data.name          !== undefined) updates.name          = data.name;
    if (data.email         !== undefined) updates.email         = data.email;
    if (data.phone         !== undefined) updates.phone         = data.phone;
    if (data.neighborhood  !== undefined) updates.neighborhood  = data.neighborhood;
    if (data.city          !== undefined) updates.city          = data.city;
    if (data.nickname      !== undefined) updates.nickname      = data.nickname;
    if (data.business      !== undefined) updates.business      = data.business;
    if (data.notifications !== undefined) updates.notifications = data.notifications === 1;
    if (data.family_status !== undefined) updates.family_status = data.family_status;
    if (data.gender        !== undefined) updates.gender        = data.gender;
    if (data.avatar_url    !== undefined) updates.avatar_url    = data.avatar_url;
    if (data.birth_date    !== undefined) updates.birth_date    = data.birth_date;

    if (Object.keys(updates).length === 0) return getUserById(id);

    await strapiPut(`/api/community-users/${existing.documentId}`, { data: updates }, jwt);
    return getUserById(id);
}

// ============================================================
// ---- Credentials Auth ----
// ============================================================

export async function registerWithCredentials(
    name: string,
    email: string,
    password: string,
): Promise<DbUser> {
    const existing = await getUserByEmail(email);
    if (existing) throw new Error('Email already taken');

    const password_hash = await bcrypt.hash(password, 12);
    const id = `credentials_${email}`;

    await strapiPost('/api/community-users', {
        data: {
            external_id:   id,
            name,
            email,
            provider:      'credentials',
            password_hash,
            publishedAt:   new Date().toISOString(),
        },
    });

    return (await getUserById(id))!;
}

export async function verifyCredentials(
    email: string,
    password: string,
): Promise<DbUser | null> {
    const res = await strapiGet<{ data: (StrapiCommunityUser & { password_hash?: string })[] }>(
        '/api/community-users',
        {
            'filters[email][$eq]':    email,
            'filters[provider][$eq]': 'credentials',
            'pagination[limit]':      '1',
        },
    );
    const row = res.data?.[0];
    if (!row?.password_hash) return null;
    const valid = await bcrypt.compare(password, row.password_hash);
    return valid ? mapStrapiUser(row) : null;
}
