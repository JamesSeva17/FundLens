
export type Platform = 'COL Financial' | 'Coins.ph' | 'Bybit' | 'Bank' | 'Cash' | 'E-Wallet';
export type AssetType = 'Stock' | 'Crypto' | 'Cash' | 'Other';

export interface Transaction {
  id: string;
  units: number;
  price: number;
  fee: number;
  date: string;
}

export interface Asset {
  id: string;
  ticker: string;
  name: string;
  type: AssetType;
  platform: Platform;
  transactions: Transaction[];
  iconUrl?: string;
}

export interface SnapshotPlatform {
  name: string;
  balance: number;
}

export interface MonthlySnapshot {
  id: string;
  date: string; // ISO format: YYYY-MM
  platforms: SnapshotPlatform[];
}

export interface AppData {
  assets: Asset[];
  snapshots: MonthlySnapshot[];
  platformIcons?: Record<string, string>;
  cloudSyncEnabled: boolean;
  jsonBinKey?: string;
  jsonBinId?: string;
  geminiApiKey?: string;
  geminiModel?: string;
}

export interface PriceResponse {
  platform: string;
  asset: string;
  price_php: number;
  currency: string;
  source: string;
  retrieved_at: string;
}

export interface LogoResponse {
  url: string;
  source: string;
}
