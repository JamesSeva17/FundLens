
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

  const now = new Date();
  const currentYear = now.getFullYear();
  const sortedSnaps = [...data.snapshots].sort((a, b) => a.date.localeCompare(b.date));
  const latestSnap = sortedSnaps[sortedSnaps.length - 1];

  // 1. Prepare Investment Assets Summary (Current State)
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
      totalGainLoss: `${gainLossPct >= 0 ? '+' : ''}${gainLossPct.toFixed(2)}%`,
      allocation: `${allocation.toFixed(2)}%`
    };
  });

  // 2. Prepare Yearly Performance Summary (The "Whole History" View)
  // Group snapshots by year to find start/end balances for historical context
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
      annualGrowth: `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(2)}%`,
      dataPoints: yearSnaps.length
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

    // Latest month performance
    const prev = history.length > 1 ? history[history.length - 2] : null;
    const momPct = prev && prev.balance > 0 ? ((current.balance - prev.balance) / prev.balance) * 100 : 0;

    return {
      name,
      currentBalance: `PHP ${current.balance.toLocaleString()}`,
      inceptionDate: inception.date,
      inceptionBalance: `PHP ${inception.balance.toLocaleString()}`,
      lifetimeGrowth: `${lifetimePct >= 0 ? '+' : ''}${lifetimePct.toFixed(2)}%`,
      lastMonthGrowth: prev ? `${momPct >= 0 ? '+' : ''}${momPct.toFixed(2)}%` : 'N/A'
    };
  });

  const basePrompt = `
    You are a world-class Senior Fund Manager and Wealth Strategist. 
    Analyze the user's FULL financial history and current holdings to provide deep insights.
    
    CURRENT NET WORTH: PHP ${totalNetWorth.toLocaleString()}

    1. YEARLY PERFORMANCE TIMELINE:
    ${JSON.stringify(yearlyPerformance, null, 2)}
    
    2. INDIVIDUAL WALLET HISTORY & LIFETIME ACCRUED:
    ${JSON.stringify(walletHistory, null, 2)}

    3. CURRENT INVESTMENT PORTFOLIO (STOCKS/CRYPTO):
    ${JSON.stringify(assetSummary, null, 2)}
    
    USER QUERY: ${userQuery || "Perform a comprehensive historical analysis and identify my most successful assets over time."}
    
    STRATEGIC INSTRUCTIONS:
    - When asked about "the whole year", "last year", or "history", use the YEARLY PERFORMANCE TIMELINE.
    - Identify which year had the highest growth.
    - When identifying "top performers", look at 'lifetimeGrowth' for long-term or 'lastMonthGrowth' for short-term.
    - Use your Google Search tool to check current market conditions (PSEi, Bitcoin, PH Inflation) to explain WHY certain assets might be performing this way.
    - Be authoritative. If a user is losing money in one area but gaining in another, highlight the diversification benefit.
    - Format with professional markdown: use headings, bold text, and bullet points.
    - Do NOT mention that you are an AI or give generic financial advice disclaimers.
  `;

  try {
    const modelToUse = data.geminiModel || 'gemini-3-pro-preview';
    const isPro = modelToUse.includes('pro');
    const budget = isPro ? 32768 : 8192; // Higher budget for complex history

    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: basePrompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: budget } 
      }
    });

    const text = response.text || "History analysis failed. Please ensure you have snapshots logged.";
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.filter((c: any) => c.web).map((c: any) => ({
      title: c.web.title,
      uri: c.web.uri
    }));

    return { text, sources };
  } catch (error: any) {
    console.error("Gemini Interaction Error:", error);
    throw new Error("API_ERROR");
  }
}
