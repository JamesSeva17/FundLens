
/**
 * Scraper for TradingView to fetch PSE stock logos.
 */
const PROXY_URL = "https://corsproxy.io/?";

export async function getTradingViewLogo(symbol: string): Promise<string | null> {
  const ticker = symbol.toUpperCase().trim();
  try {
    const targetUrl = `https://www.tradingview.com/symbols/PSE-${ticker}/`;
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`);
    
    if (!response.ok) throw new Error(`Logo Scraper: HTTP ${response.status}`);
    
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Look for TradingView symbol logos
    const images = doc.querySelectorAll('img[src*="s3-symbol-logo.tradingview.com"]');
    
    for (const img of Array.from(images)) {
      const src = (img as HTMLImageElement).src;
      // Filter out 'source' (broker/exchange) logos, we want the asset specific logo
      if (!src.includes('/source/')) {
        return src;
      }
    }
    return null;
  } catch (error) {
    console.error(`Logo Scraper: Failed for ${ticker}`, error);
    return null;
  }
}
