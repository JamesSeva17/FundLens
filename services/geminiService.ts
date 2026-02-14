
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

  // 1. Prepare Investment Assets Summary
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

  // 2. Prepare Savings (Wallets) Summary
  // We look at the latest snapshot and compare it to the previous one to find performance
  const sortedSnapshots = [...data.snapshots].sort((a, b) => b.date.localeCompare(a.date));
  const latestSnap = sortedSnapshots[0];
  const prevSnap = sortedSnapshots[1];

  const savingsSummary = latestSnap?.platforms.map(p => {
    const prevBal = prevSnap?.platforms.find(prevP => prevP.name === p.name)?.balance || 0;
    const diff = p.balance - prevBal;
    const pct = prevBal > 0 ? (diff / prevBal) * 100 : 0;
    
    return {
      walletName: p.name,
      currentBalance: `PHP ${p.balance.toLocaleString()}`,
      performanceMoM: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
      nominalChange: `PHP ${diff.toLocaleString()}`
    };
  }) || [];

  const basePrompt = `
    You are a world-class Senior Fund Manager and Financial Strategist specializing in the Philippine Stock Exchange (PSE) and global Cryptocurrency markets.
    
    User Financial Data:
    - Total Net Worth: PHP ${totalNetWorth.toLocaleString()}
    
    1. Investment Portfolio (Stocks/Crypto):
    ${JSON.stringify(assetSummary, null, 2)}
    
    2. Savings Breakdown (Banks/Wallets/Cash):
    ${JSON.stringify(savingsSummary, null, 2)}
    
    User Query: ${userQuery || "Provide a general strategic review of my portfolio and market outlook."}
    
    Guidelines:
    1. Respond as a professional advisor. Use data-driven insights based specifically on the User Financial Data provided above.
    2. If the user asks about "best performers", look at the "performanceMoM" field for Savings or "gainLossPct" for Investments.
    3. Reference current market trends (PSEi, Bitcoin price action, PH inflation) where relevant using your search tools.
    4. Be concise, authoritative, and helpful.
    5. Format with clean bullet points.
    6. Do NOT include generic disclaimers.
  `;

  try {
    const modelToUse = data.geminiModel || 'gemini-3-pro-preview';
    const isPro = modelToUse.includes('pro');
    const budget = isPro ? 4096 : 1024;

    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: basePrompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: budget } 
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
    throw new Error("The fund manager is currently busy. Please check your connection or model settings.");
  }
}
