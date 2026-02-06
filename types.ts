export type UserRole = 'admin' | 'premium' | 'free' | 'banned';

export interface User {
  username: string;
  password?: string; // Storing for client-side demo persistence
  role: UserRole;
  premiumExpiresAt?: number; // Timestamp for when premium ends
}

export interface MatchData {
  id: number; // Internal ID for keys
  MacSaati: string;
  Saat: string;
  Lig: string;
  EvSahibi: string;
  KonukEkip: string;
  IlkYariSonucu: string;
  MacSonucu: string;
  Ms1: string | number;
  Ms0: string | number;
  Ms2: string | number;
  Alt25: string | number;
  Ust25: string | number;
  Iy1: string | number;
  Iy0: string | number;
  Iy2: string | number;
  KgVar: string | number;
  KgYok: string | number;
  SkorDiger: string;
  AIlkYariMacSonucu: string;
  [key: string]: string | number; // Index signature for dynamic access
}

export type FilterState = {
  [key in keyof MatchData]?: string;
};

export const COLUMNS: (keyof MatchData)[] = [
  "MacSaati",
  "Saat",
  "Lig",
  "EvSahibi",
  "KonukEkip",
  "IlkYariSonucu",
  "MacSonucu",
  "Ms1",
  "Ms0",
  "Ms2",
  "Alt25",
  "Ust25",
  "Iy1",
  "Iy0",
  "Iy2",
  "KgVar",
  "KgYok",
  "SkorDiger",
  "AIlkYariMacSonucu"
];