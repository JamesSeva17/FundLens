
import { PriceResponse } from "../types";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const PRICE_CACHE: Record<string, PriceResponse> = {};
const ID_MAP_CACHE: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'USDT': 'tether',
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'LINK': 'chainlink',
  'SHIB': 'shiba-inu',
  'AVAX': 'avalanche-2',
  'DAI': 'dai',
  'UNI': 'uniswap',
  'ATOM': 'cosmos'
};
const PENDING_REQUESTS: Record<string, Promise<PriceResponse | null>> = {};
const CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Resolves a ticker symbol to a CoinGecko ID.
 */
async function getCoinId(symbol: string): Promise<string | null> {
  const ticker = symbol.toUpperCase().trim();
  if (ID_MAP_CACHE[ticker]) return ID_MAP_CACHE[ticker];

  try {
    const res = await fetch(`${COINGECKO_BASE}/search?query=${ticker}`);
    if (!res.ok) return null;
    const data = await res.json();
    const match = data.coins.find((c: any) => c.symbol === ticker);
    if (match) {
      ID_MAP_CACHE[ticker] = match.id;
      return match.id;
    }
    return null;
  } catch (err) {
    console.error(`Crypto Scraper: Mapping error for ${ticker}`, err);
    return null;
  }
}

/**
 * Fetches crypto price from CoinGecko with caching.
 */
export async function fetchCryptoPrice(symbol: string): Promise<PriceResponse | null> {
  const ticker = symbol.toUpperCase().trim();

  // 1. Cache Check
  const cached = PRICE_CACHE[ticker];
  if (cached) {
    const age = Date.now() - new Date(cached.retrieved_at).getTime();
    if (age < CACHE_TTL_MS) return cached;
  }

  // 2. Request Collapsing
  if (PENDING_REQUESTS[ticker]) return PENDING_REQUESTS[ticker];

  const fetchAction = (async () => {
    try {
      const coinId = await getCoinId(ticker);
      if (!coinId) return null;

      const res = await fetch(`${COINGECKO_BASE}/simple/price?ids=${coinId}&vs_currencies=php`);
      if (!res.ok) throw new Error("CoinGecko API Error");
      
      const data = await res.json();
      const price = data[coinId]?.php;

      if (price === undefined) return null;

      const result: PriceResponse = {
        platform: "Crypto Exchange",
        asset: ticker,
        price_php: price,
        currency: "PHP",
        source: "CoinGecko",
        retrieved_at: new Date().toISOString()
      };

      PRICE_CACHE[ticker] = result;
      return result;
    } catch (err) {
      console.error(`Crypto Scraper: Failed to fetch ${ticker}`, err);
      return null;
    } finally {
      delete PENDING_REQUESTS[ticker];
    }
  })();

  PENDING_REQUESTS[ticker] = fetchAction;
  return fetchAction;
}
