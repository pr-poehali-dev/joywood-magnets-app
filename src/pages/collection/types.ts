export interface Magnet {
  id: number;
  breed: string;
  stars: number;
  category: string;
  given_at: string;
}

export interface BonusRecord {
  id: number;
  milestone_count: number;
  milestone_type: string;
  reward: string;
  given_at: string;
}

export interface RatingEntry {
  name: string;
  total_magnets: number;
  total_amount: number;
}

export interface Rating {
  rank_magnets: number;
  rank_amount: number;
  total_participants: number;
  my_total_amount: number;
  top_magnets: RatingEntry[];
  top_amount: RatingEntry[];
}

export interface CollectionData {
  client_name: string;
  phone: string;
  magnets: Magnet[];
  total_magnets: number;
  unique_breeds: number;
  bonuses: BonusRecord[];
  rating?: Rating;
}

export type Step = "phone" | "verify" | "collection";

export const SESSION_KEY = "jw_collection_session";
export const SESSION_TTL = 60 * 60 * 1000;

export function saveSession(phone: string, collectionData: CollectionData, photos: Record<string, string>) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ phone, data: collectionData, photos, at: Date.now() }));
}

export function loadSession(): { phone: string; data: CollectionData; photos: Record<string, string> } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (Date.now() - s.at > SESSION_TTL) { localStorage.removeItem(SESSION_KEY); return null; }
    return s;
  } catch { return null; }
}
