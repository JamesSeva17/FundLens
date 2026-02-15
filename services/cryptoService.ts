
import { PriceResponse } from "../types";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const PRICE_CACHE: Record<string, PriceResponse> = {};
const PENDING_REQUESTS: Record<string, Promise<PriceResponse | null>> = {};
const CACHE_TTL_MS = 60 * 1000; // 1 minute price cache

/**
 * Fetches crypto price from CoinGecko using the 'symbols' parameter.
 */
export async function fetchCryptoPrice(symbol: string): Promise<PriceResponse | null> {
  const ticker = symbol.toLowerCase().trim();

  // 1. Cache Check
  const cached = PRICE_CACHE[ticker.toUpperCase()];
  if (cached) {
    const age = Date.now() - new Date(cached.retrieved_at).getTime();
    if (age < CACHE_TTL_MS) return cached;
  }

  // 2. Request Collapsing
  if (PENDING_REQUESTS[ticker]) return PENDING_REQUESTS[ticker];

  const fetchAction = (async () => {
    try {
      // CRITICAL: Added timestamp to skip cached responses from proxies
      const url = `${COINGECKO_BASE}/coins/markets?vs_currency=php&symbols=${ticker}&_t=${Date.now()}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        if (res.status === 429) console.warn("CoinGecko: Rate limit reached.");
        return null;
      }
      
      const data = await res.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        return null;
      }

      const marketData = data.find((c: any) => c.symbol.toLowerCase() === ticker) || data[0];
      const price = marketData.current_price;

      if (price === undefined || price === null) return null;

      const result: PriceResponse = {
        platform: "Crypto Exchange",
        asset: ticker.toUpperCase(),
        price_php: price,
        currency: "PHP",
        source: "CoinGecko Markets",
        retrieved_at: new Date().toISOString()
      };

      PRICE_CACHE[ticker.toUpperCase()] = result;
      return result;
    } catch (err) {
      console.error(`Crypto Scraper: Error fetching ${ticker.toUpperCase()}`, err);
      return null;
    } finally {
      delete PENDING_REQUESTS[ticker];
    }
  })();

  PENDING_REQUESTS[ticker] = fetchAction;
  return fetchAction;
}
