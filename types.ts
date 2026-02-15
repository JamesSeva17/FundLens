export type Platform = 'COL Financial' | 'Coins.ph' | 'Bybit' | 'Bank' | 'Cash' | 'E-Wallet';
export type AssetType = 'Stock' | 'Crypto' | 'Cash' | 'Other';

export interface Transaction {
  id: string;
  units: number;
  price: number;
  fee: number;
  feeIsUnit?: boolean; // If true, fee is subtracted from units. If false/undefined, fee is added to cost.
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
  assetIcons?: Record<string, string>; // Stores cached URLs for asset logos (e.g. { "GLO": "url" })
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