export type UserRole = 'admin' | 'premium' | 'free' | 'banned';

export interface User {
  username: string;
  password?: string; // Storing for client-side demo persistence
  role: UserRole;
  premiumExpiresAt?: number; // Timestamp for when premium ends
}

export interface MatchData {
  id: number; // Internal ID for keys
  Tarih: string;
  Lig: string;
  EvSahibi: string;
  Deplasman: string;
  Iy: string;
  Ms: string;
  Iy05: string;
  Iy15: string;
  Ms15: string;
  Ms25: string;
  Ms35: string;
  Kg: string;
  Ms1: string | number;
  MsX: string | number;
  Ms2: string | number;
  Ust25: string | number;
  Alt25: string | number;
  KgVar: string | number;
  KgYok: string | number;
  IyMs: string;
  Arti6: string;
  [key: string]: string | number; // Index signature for dynamic access
}

export type FilterState = {
  [key in keyof MatchData]?: string;
};

export const COLUMNS: (keyof MatchData)[] = [
  "Tarih",
  "Lig",
  "EvSahibi",
  "Deplasman",
  "Iy",
  "Ms",
  "Iy05",
  "Iy15",
  "Ms15",
  "Ms25",
  "Ms35",
  "Kg",
  "Ms1",
  "MsX",
  "Ms2",
  "Ust25",
  "Alt25",
  "KgVar",
  "KgYok",
  "IyMs",
  "Arti6"
];

export const EXCEL_HEADERS: Record<string, string[]> = {
  Tarih: ['Tarih'],
  Lig: ['LİG', 'Lig'],
  EvSahibi: ['EV SAHİBİ', 'Ev Sahibi'],
  Deplasman: ['DEPLASMAN', 'Deplasman'],
  Iy: ['İY', 'Iy'],
  Ms: ['MS', 'Ms'],
  Iy05: ['İY 0.5', 'Iy 0.5'],
  Iy15: ['İY 1.5', 'Iy 1.5'],
  Ms15: ['MS 1.5', 'Ms 1.5'],
  Ms25: ['MS 2.5', 'Ms 2.5'],
  Ms35: ['MS 3.5', 'Ms 3.5'],
  Kg: ['KG', 'Kg'],
  Ms1: ['1', 'Ms1'],
  MsX: ['X', 'MsX'],
  Ms2: ['2', 'Ms2'],
  Ust25: ['2.5 /OVER', 'Ust25'],
  Alt25: ['2.5 /UNDE', '2.5 /UNDER', 'Alt25'],
  KgVar: ['YES', 'KgVar'],
  KgYok: ['NO', 'KgYok'],
  IyMs: ['İY/MS', 'IyMs'],
  Arti6: ['6+', 'Arti6']
};