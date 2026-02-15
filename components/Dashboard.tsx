import React, { useMemo, useState } from 'react';
import { AppData, PriceResponse } from '../types';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { getPortfolioInsights } from '../services/geminiService';
import { trackEvent } from '../services/analyticsService';

interface DashboardProps {
  data: AppData;
  prices: Record<string, PriceResponse>;
  total: number;
  onNavigate: (tab: 'portfolio' | 'savings' | 'settings') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, prices, total, onNavigate }) => {
  const [userQuery, setUserQuery] = useState('');
  const [analysis, setAnalysis] = useState<{ text: string; sources?: { title: string; uri: string }[] } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const portfolioValue = useMemo(() => {
    return data.assets.reduce((sum, asset) => {
      const price = prices[asset.ticker]?.price_php || 0;
      const totalUnits = asset.transactions.reduce((tsum, t) => tsum + t.units, 0);
      return sum + (totalUnits * price);
    }, 0);
  }, [data.assets, prices]);

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setError(null);
    
    // Track Interaction
    trackEvent('ai_manager_query', { query_length: userQuery.length });
    
    try {
      const result = await getPortfolioInsights(data, prices, total, userQuery);
      setAnalysis(result);
    } catch (err: any) {
      if (err.message === "API_KEY_ERROR") {
        setError("Your API Key is invalid or expired. Please re-configure in Settings.");
      } else {
        setError(err.message || "Failed to get AI response.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const chartData = useMemo(() => {
    return [...data.snapshots]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(s => {
        const snapshotTotal = s.platforms.reduce((sum, p) => sum + p.balance, 0);
        return {
          date: s.date,
          amount: snapshotTotal + portfolioValue
        };
      });
  }, [data.snapshots, portfolioValue]);

  const platformDiversification = useMemo(() => {
    const latestSnapshot = [...data.snapshots].sort((a, b) => b.date.localeCompare(a.date))[0];
    const platforms: Record<string, number> = {};

    latestSnapshot?.platforms.forEach(p => {
      platforms[p.name] = (platforms[p.name] || 0) + p.balance;
    });

    data.assets.forEach(asset => {
      const price = prices[asset.ticker]?.price_php || 0;
      const units = asset.transactions.reduce((sum, t) => sum + t.units, 0);
      const val = units * price;
      platforms[asset.platform] = (platforms[asset.platform] || 0) + val;
    });

    return Object.entries(platforms)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data.assets, data.snapshots, prices]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Net Worth</p>
          <h3 className="text-3xl font-black text-gray-900">
            ₱{total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </h3>
          <p className="text-xs text-gray-400 mt-2">Combined Assets & Savings</p>
        </div>

        <button 
          onClick={() => onNavigate('portfolio')}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-left hover:border-indigo-200 hover:shadow-md transition-all group active:scale-[0.98]"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Portfolio Allocation</p>
              <h3 className="text-2xl font-bold text-gray-900">
                ₱{portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </h3>
            </div>
            <i className="fas fa-arrow-right text-indigo-200 group-hover:text-indigo-500 transition-colors mt-1"></i>
          </div>
          <p className="text-xs text-gray-400 mt-2">{data.assets.length} Active Positions</p>
        </button>

        <button 
          onClick={() => onNavigate('savings')}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-left hover:border-indigo-200 hover:shadow-md transition-all group active:scale-[0.98]"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Available Savings</p>
              <h3 className="text-2xl font-bold text-indigo-600">
                ₱{(total - portfolioValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </h3>
            </div>
            <i className="fas fa-arrow-right text-indigo-200 group-hover:text-indigo-600 transition-colors mt-1"></i>
          </div>
          <p className="text-xs text-gray-400 mt-2">Banks, Cash & E-Wallets</p>
        </button>
      </div>

      {/* Interactive AI Fund Manager */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl shadow-xl border border-indigo-800 overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
                <i className="fas fa-brain text-white"></i>
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight leading-none">AI Fund Manager</h3>
                <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mt-1">Interactive Strategic Insights</p>
              </div>
            </div>
            
            <form onSubmit={handleAskAI} className="flex-1 max-w-xl flex gap-2">
              <input 
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Ask about your portfolio strategy..."
                className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-indigo-300/50 outline-none focus:border-indigo-400 transition-all"
              />
              <button 
                type="submit"
                disabled={isAnalyzing}
                className="bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
              >
                {isAnalyzing ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-paper-plane"></i>}
                Ask
              </button>
            </form>
          </div>
        </div>

        <div className="p-6 min-h-[100px]">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-4 flex items-center gap-3">
              <i className="fas fa-exclamation-triangle text-red-400"></i>
              <p className="text-xs text-red-200 font-bold">{error}</p>
            </div>
          )}

          {isAnalyzing ? (
            <div className="space-y-4 py-2">
              <div className="h-3 bg-white/5 rounded w-3/4 animate-pulse"></div>
              <div className="h-3 bg-white/5 rounded w-1/2 animate-pulse delay-75"></div>
              <div className="h-3 bg-white/5 rounded w-5/6 animate-pulse delay-150"></div>
            </div>
          ) : analysis ? (
            <div className="text-sm leading-relaxed text-indigo-50/90 whitespace-pre-line font-medium animate-in fade-in slide-in-from-top-2 duration-500">
              {analysis.text}
              
              {analysis.sources && analysis.sources.length > 0 && (
                <div className="mt-6 pt-4 border-t border-white/10">
                  <p className="text-[10px] text-indigo-400 uppercase font-black tracking-widest mb-3">Grounding Sources:</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.sources.map((source, i) => (
                      <a 
                        key={i} 
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-white/5 border border-white/5 hover:bg-white/10 hover:border-indigo-500/30 px-3 py-1.5 rounded-lg text-[10px] text-indigo-200 transition-all flex items-center gap-2"
                      >
                        <i className="fas fa-external-link-alt opacity-50 text-[8px]"></i>
                        {source.title || 'Source'}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-indigo-300/60 text-xs font-bold uppercase tracking-widest">
                Ask a question to begin analysis
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {['General review', 'Crypto risk', 'PSE outlook'].map(suggestion => (
                  <button 
                    key={suggestion}
                    onClick={() => { setUserQuery(suggestion); }}
                    className="text-[10px] text-indigo-400 border border-indigo-400/30 px-3 py-1 rounded-full hover:bg-indigo-400/10 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {analysis && !isAnalyzing && (
          <div className="px-6 py-3 bg-black/20 border-t border-white/5 flex justify-between items-center text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
            <span>Model: Gemini 3 Pro</span>
            <span>Live Analysis: {new Date().toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Historical Total Net Worth</h3>
        <div className="h-80 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => `₱${(val/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: number) => [`₱${val.toLocaleString()}`, 'Net Worth']}
                />
                <Area type="monotone" dataKey="amount" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <i className="fas fa-chart-line text-4xl mb-2"></i>
              <p>Add history to see your wealth timeline.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Wealth Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          {platformDiversification.length > 0 ? (
            platformDiversification.map(p => {
              const pct = total ? (p.value / total) * 100 : 0;
              return (
                <div key={p.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-gray-700">{p.name}</span>
                    <span className="text-gray-500">₱{p.value.toLocaleString()} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-2 text-center py-4 text-gray-400">No platform data.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;