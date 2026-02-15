
import { GoogleGenAI } from "@google/genai";
import { AppData, PriceResponse, MonthlySnapshot } from "../types";

export const getGeminiClient = (userKey?: string) => {
  const apiKey = userKey || process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined') {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Interacts with the portfolio as a fund manager based on user queries.
 * Analyzes current holdings and full historical snapshots.
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

  const sortedSnaps = [...data.snapshots].sort((a, b) => a.date.localeCompare(b.date));

  // 1. Prepare Investment Assets Summary (Current State)
  const assetSummary = data.assets.map(asset => {
    const currentPrice = prices[asset.ticker]?.price_php || 0;
    
    // Correctly calculate Net Units (Gross - Fees taken in units)
    const netUnits = asset.transactions.reduce((s, t) => s + (t.units - (t.feeIsUnit ? t.fee : 0)), 0);
    
    // Correctly calculate Total Invested (Principal + Fees paid in currency)
    const totalInvested = asset.transactions.reduce((s, t) => s + (t.units * t.price) + (t.feeIsUnit ? 0 : t.fee), 0);
    
    const marketValue = netUnits * currentPrice;
    const gainLossPct = totalInvested > 0 ? ((marketValue - totalInvested) / totalInvested) * 100 : 0;
    const allocation = totalNetWorth > 0 ? (marketValue / totalNetWorth) * 100 : 0;

    return {
      ticker: asset.ticker,
      type: asset.type,
      platform: asset.platform,
      marketValue: `PHP ${marketValue.toLocaleString()}`,
      netUnits: netUnits.toLocaleString(),
      totalGainLoss: `${gainLossPct >= 0 ? '+' : ''}${gainLossPct.toFixed(2)}%`,
      allocation: `${allocation.toFixed(2)}%`
    };
  });

  // 2. Prepare Yearly Performance Summary
  const yearsInData = Array.from(new Set(sortedSnaps.map(s => s.date.substring(0, 4)))).sort();
  const yearlyPerformance = yearsInData.map(year => {
    const yearSnaps = sortedSnaps.filter(s => s.date.startsWith(year));
    const startBalance = yearSnaps[0].platforms.reduce((sum, p) => sum + p.balance, 0);
    const endBalance = yearSnaps[yearSnaps.length - 1].platforms.reduce((sum, p) => sum + p.balance, 0);
    const growth = endBalance - startBalance;
    const growthPct = startBalance > 0 ? (growth / startBalance) * 100 : 0;
    
    return {
      year,
      startingNetWorth: `PHP ${startBalance.toLocaleString()}`,
      endingNetWorth: `PHP ${endBalance.toLocaleString()}`,
      annualGrowth: `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(2)}%`
    };
  });

  // 3. Individual Wallet Lifetime Performance
  const uniqueWalletNames = Array.from(new Set(data.snapshots.flatMap(s => s.platforms.map(p => p.name))));
  const walletHistory = uniqueWalletNames.map(name => {
    const history = sortedSnaps
      .map(s => ({ date: s.date, balance: s.platforms.find(p => p.name === name)?.balance }))
      .filter(h => h.balance !== undefined) as { date: string, balance: number }[];
    
    const inception = history[0];
    const current = history[history.length - 1];
    const lifetimeGrowth = current.balance - inception.balance;
    const lifetimePct = inception.balance > 0 ? (lifetimeGrowth / inception.balance) * 100 : 0;

    return {
      name,
      currentBalance: `PHP ${current.balance.toLocaleString()}`,
      lifetimeGrowth: `${lifetimePct >= 0 ? '+' : ''}${lifetimePct.toFixed(2)}%`
    };
  });

  const basePrompt = `
    You are a world-class Senior Fund Manager. Analyze the user's FULL financial history.
    CURRENT NET WORTH: PHP ${totalNetWorth.toLocaleString()}

    1. YEARLY PERFORMANCE TIMELINE:
    ${JSON.stringify(yearlyPerformance, null, 2)}
    
    2. INDIVIDUAL WALLET HISTORY:
    ${JSON.stringify(walletHistory, null, 2)}

    3. CURRENT INVESTMENT PORTFOLIO (Accounting for Net Units after Fees):
    ${JSON.stringify(assetSummary, null, 2)}
    
    USER QUERY: ${userQuery || "Perform a comprehensive historical analysis."}
    
    Instructions:
    - Use 'netUnits' for all current balance explanations.
    - Identify historical performance trends.
    - Use Google Search to cross-reference why certain years might have had high growth (e.g. market cycles).
    - Format with professional markdown.
  `;

  try {
    const modelToUse = data.geminiModel || 'gemini-3-pro-preview';
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: basePrompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: modelToUse.includes('pro') ? 32768 : 8192 } 
      }
    });

    return { 
      text: response.text || "History analysis failed.",
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.filter((c: any) => c.web).map((c: any) => ({
        title: c.web.title,
        uri: c.web.uri
      }))
    };
  } catch (error: any) {
    console.error("Gemini Interaction Error:", error);
    throw new Error("API_ERROR");
  }
}
