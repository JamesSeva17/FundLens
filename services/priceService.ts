
import { Asset, PriceResponse } from "../types";
import { fetchPseStockPrice } from "./pseService";
import { fetchCryptoPrice } from "./cryptoService";

/**
 * The single source of truth for fetching prices.
 * Routes based on asset type to specific direct-data providers.
 */
export async function getPriceForAsset(asset: Asset, existingPrices: Record<string, PriceResponse> = {}): Promise<PriceResponse | null> {
  const type = asset.type;
  
  if (type === 'Stock') {
    return await fetchPseStockPrice(asset.ticker);
  } 
  
  if (type === 'Crypto') {
    return await fetchCryptoPrice(asset.ticker);
  }

  return null;
}
