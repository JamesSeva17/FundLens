
import { GoogleGenAI } from "@google/genai";
import { AppData, PriceResponse } from "../types";

export const getGeminiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export interface PortfolioInsight {
  analysis: string;
  timestamp: string;
}

/**
 * Analyzes the user's portfolio as a senior fund manager.
 * Uses thinking capabilities and Google Search for market context.
 */
export async function getPortfolioInsights(
  data: AppData,
  prices: Record<string, PriceResponse>,
  totalNetWorth: number
): Promise<string> {
  const ai = getGeminiClient();

  // Prepare a concise summary for the AI
  const assetSummary = data.assets.map(asset => {
    const currentPrice = prices[asset.ticker]?.price_php || 0;
    const totalUnits = asset.transactions.reduce((s, t) => s + t.units, 0);
    const totalInvested = asset.transactions.reduce((s, t) => s + (t.units * t.price) + t.fee, 0);
    const marketValue = totalUnits * currentPrice;
    const gainLossPct = totalInvested > 0 ? ((marketValue - totalInvested) / totalInvested) * 100 : 0;
    const allocation = totalNetWorth > 0 ? (marketValue / totalNetWorth) * 100 : 0;

    return {
      ticker: asset.ticker,
      type: asset.type,
      platform: asset.platform,
      gainLossPct: gainLossPct.toFixed(2) + '%',
      allocation: allocation.toFixed(2) + '%'
    };
  });

  const prompt = `
    You are a world-class Senior Fund Manager and Financial Strategist specializing in both the Philippine Stock Exchange (PSE) and global Cryptocurrency markets.
    
    Current Portfolio Context:
    - Total Net Worth: PHP ${totalNetWorth.toLocaleString()}
    - Asset Breakdown: ${JSON.stringify(assetSummary)}
    
    Task:
    Provide a professional, strategic analysis of this portfolio. 
    1. Cross-reference these holdings with current market trends in the Philippines and global macro conditions.
    2. Evaluate asset allocation and diversification.
    3. Identify potential risks (e.g., overexposure to specific sectors or volatile assets).
    4. Provide actionable "Fund Manager Insights" for the next quarter.
    
    Constraint:
    - Keep the tone sophisticated, objective, and authoritative.
    - Be concise (max 350 words).
    - Use bullet points for readability.
    - Focus on performance and strategy.
    - Do NOT include a disclaimer about not being a financial advisor.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // For gemini-3-pro-preview, we must provide a valid budget or let it default.
        // We set a 2k budget to allow for sophisticated "thinking" about the portfolio.
        thinkingConfig: { thinkingBudget: 2048 } 
      }
    });

    return response.text || "Unable to generate analysis at this time.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to reach the fund manager.");
  }
}
