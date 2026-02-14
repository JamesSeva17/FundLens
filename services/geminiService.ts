
import { GoogleGenAI } from "@google/genai";
import { AppData, PriceResponse } from "../types";

export const getGeminiClient = (userKey?: string) => {
  const apiKey = userKey || process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined') {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Interacts with the portfolio as a fund manager based on user queries.
 */
export async function getPortfolioInsights(
  data: AppData,
  prices: Record<string, PriceResponse>,
  totalNetWorth: number,
  userQuery?: string
): Promise<{ text: string; sources?: { title: string; uri: string }[] }> {
  let ai;
  try {
    ai = getGeminiClient(data.geminiApiKey);
  } catch (e: any) {
    if (e.message === "API_KEY_MISSING") {
      throw new Error("API_KEY_ERROR");
    }
    throw e;
  }

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
      marketValue: `PHP ${marketValue.toLocaleString()}`,
      gainLossPct: gainLossPct.toFixed(2) + '%',
      allocation: allocation.toFixed(2) + '%'
    };
  });

  const basePrompt = `
    You are a world-class Senior Fund Manager and Financial Strategist specializing in the Philippine Stock Exchange (PSE) and global Cryptocurrency markets.
    
    Portfolio Snapshot:
    - Total Net Worth: PHP ${totalNetWorth.toLocaleString()}
    - Assets: ${JSON.stringify(assetSummary)}
    
    User Query: ${userQuery || "Provide a general strategic review of my portfolio and market outlook."}
    
    Guidelines:
    1. Respond as a professional advisor. Use data-driven insights.
    2. Reference current market trends (PSEi, Bitcoin price action, PH inflation) where relevant.
    3. Be concise and authoritative.
    4. Format with clean bullet points.
    5. Do NOT include generic disclaimers.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: basePrompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 2048 } 
      }
    });

    const text = response.text || "I was unable to analyze the data. Please try again with a more specific query.";
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks?.filter((c: any) => c.web).map((c: any) => ({
      title: c.web.title,
      uri: c.web.uri
    }));

    return { text, sources };
  } catch (error: any) {
    console.error("Gemini Interaction Error:", error);
    
    const errMsg = error?.message || "";
    if (errMsg.includes("Requested entity was not found") || errMsg.includes("API key not valid") || errMsg.includes("403")) {
      throw new Error("API_KEY_ERROR");
    }
    
    throw new Error("The fund manager is currently busy. Please check your connection or environment key configuration.");
  }
}
