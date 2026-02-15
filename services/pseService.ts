
import { PriceResponse } from "../types";

/**
 * Direct scraper for PSE Edge.
 * Switched to corsproxy.io for better reliability and direct response handling.
 */
const PROXY_URL = "https://corsproxy.io/?";

// In-memory caches
const PRICE_CACHE: Record<string, PriceResponse> = {};
const COMPANY_ID_CACHE: Record<string, string> = {};
const PENDING_REQUESTS: Record<string, Promise<PriceResponse | null>> = {};

const CACHE_TTL_MS = 60 * 1000; // 1 minute price cache

async function getCompanyId(symbol: string): Promise<string | null> {
  const ticker = symbol.toUpperCase().trim();
  if (COMPANY_ID_CACHE[ticker]) return COMPANY_ID_CACHE[ticker];

  try {
    // Add cache buster to ID search as well
    const targetUrl = `https://edge.pse.com.ph/autoComplete/searchCompanyNameSymbol.ax?term=${encodeURIComponent(ticker)}&_t=${Date.now()}`;
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
    
    if (!response.ok) throw new Error(`Network Error: ${response.status}`);
    
    const data = await response.json();

    // Look for exact symbol match
    const match = data.find((item: any) => 
      item.symbol.toUpperCase().trim() === ticker
    );

    if (match?.cmpyId) {
      COMPANY_ID_CACHE[ticker] = match.cmpyId;
      return match.cmpyId;
    }
    return null;
  } catch (error) {
    console.error(`PSE Scraper: Error finding ID for ${ticker}:`, error);
    return null;
  }
}

async function getLastTradedPrice(companyId: string): Promise<string | null> {
  try {
    // CRITICAL: Added timestamp cache buster to bypass proxy caching
    const targetUrl = `https://edge.pse.com.ph/companyPage/stockData.do?cmpy_id=${companyId}&_t=${Date.now()}`;
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
    
    if (!response.ok) throw new Error(`Network Error: ${response.status}`);
    
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const ths = Array.from(doc.querySelectorAll("th"));

    // Navigate to the "Last Traded Price" row using the sibling relationship
    for (const th of ths) {
      if (th.textContent?.trim() === "Last Traded Price") {
        const td = th.nextElementSibling;
        if (td) return td.textContent?.trim() || null;
      }
    }
    return null;
  } catch (error) {
    console.error(`PSE Scraper: Error getting price for ID ${companyId}:`, error);
    return null;
  }
}

/**
 * Main fetch function with 1-minute caching and request collapsing.
 */
export async function fetchPseStockPrice(symbol: string): Promise<PriceResponse | null> {
  const ticker = symbol.toUpperCase().trim();
  
  // 1. Check if we already have a fresh result in cache
  const cached = PRICE_CACHE[ticker];
  if (cached) {
    const age = Date.now() - new Date(cached.retrieved_at).getTime();
    if (age < CACHE_TTL_MS) {
      return cached;
    }
  }

  // 2. Check if a request for this ticker is already in flight (Request Collapsing)
  if (PENDING_REQUESTS[ticker]) {
    return PENDING_REQUESTS[ticker];
  }

  // 3. Perform the fetch and track it
  const fetchAction = (async () => {
    try {
      const companyId = await getCompanyId(ticker);
      if (!companyId) return null;

      const priceStr = await getLastTradedPrice(companyId);
      if (!priceStr) return null;

      const price = parseFloat(priceStr.replace(/,/g, ""));
      const result: PriceResponse = {
        platform: "COL Financial",
        asset: ticker,
        price_php: price,
        currency: "PHP",
        source: "PSE Edge",
        retrieved_at: new Date().toISOString()
      };

      PRICE_CACHE[ticker] = result;
      return result;
    } catch (err) {
      console.error(`PSE Scraper: Failed to fetch ${ticker}`, err);
      return null;
    } finally {
      // Clean up pending tracker
      delete PENDING_REQUESTS[ticker];
    }
  })();

  PENDING_REQUESTS[ticker] = fetchAction;
  return fetchAction;
}
