
import React, { useMemo } from 'react';
import { AppData, PriceResponse } from '../types';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface DashboardProps {
  data: AppData;
  prices: Record<string, PriceResponse>;
  total: number;
  analysis?: string | null;
  isAnalyzing?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ data, prices, total, analysis, isAnalyzing }) => {
  const portfolioValue = useMemo(() => {
    return data.assets.reduce((sum, asset) => {
      const price = prices[asset.ticker]?.price_php || 0;
      const totalUnits = asset.transactions.reduce((tsum, t) => tsum + t.units, 0);
      return sum + (totalUnits * price);
    }, 0);
  }, [data.assets, prices]);

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

  const prevSnapshotTotal = useMemo(() => {
    const sorted = [...data.snapshots].sort((a, b) => b.date.localeCompare(a.date));
    if (sorted.length < 2) return null;
    return sorted[1].platforms.reduce((sum, p) => sum + p.balance, 0);
  }, [data.snapshots]);

  const prevTotal = prevSnapshotTotal !== null ? prevSnapshotTotal + portfolioValue : null;
  const momChange = prevTotal !== null ? total - prevTotal : 0;
  const momPct = prevTotal ? (momChange / prevTotal) * 100 : 0;

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
          {prevTotal !== null ? (
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-sm font-bold ${momChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {momChange >= 0 ? '+' : ''}₱{Math.abs(momChange).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                ({momChange >= 0 ? '+' : ''}{momPct.toFixed(1)}%)
              </span>
              <span className="text-xs text-gray-400">vs. last month</span>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-2">Comparison not available yet</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">Portfolio Allocation</p>
          <h3 className="text-2xl font-bold text-gray-900">
            ₱{portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </h3>
          <p className="text-xs text-gray-400 mt-2">{data.assets.length} Active Investments</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">Savings</p>
          <h3 className="text-2xl font-bold text-indigo-600">
            ₱{(total - portfolioValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </h3>
          <p className="text-xs text-gray-400 mt-2">Banks, Cash & E-Wallets</p>
        </div>
      </div>

      {/* AI Analysis Section */}
      {(analysis || isAnalyzing) && (
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-3xl shadow-xl text-white border border-indigo-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-indigo-500 p-2 rounded-xl">
              <i className="fas fa-brain text-white"></i>
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight leading-none">Fund Manager Analysis</h3>
              <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mt-1">Strategic AI Insights</p>
            </div>
          </div>
          
          {isAnalyzing ? (
            <div className="space-y-3 py-4">
              <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse"></div>
              <div className="h-4 bg-white/10 rounded w-1/2 animate-pulse"></div>
              <div className="h-4 bg-white/10 rounded w-5/6 animate-pulse"></div>
            </div>
          ) : (
            <div className="text-sm leading-relaxed text-indigo-50/90 whitespace-pre-line font-medium">
              {analysis}
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-[10px] font-bold text-indigo-300 uppercase">
            <span>Model: Gemini 3 Pro</span>
            <span>Refreshed: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      )}

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
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(val) => `₱${(val/1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: number) => [`₱${val.toLocaleString()}`, 'Total Net Worth']}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#4f46e5" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <i className="fas fa-chart-line text-4xl mb-2"></i>
              <p>Add savings history to see your net worth timeline.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <h3 className="text-lg font-bold text-gray-900">Wealth Distribution (By Platform)</h3>
        </div>
        <div className="p-6">
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
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 text-center py-4 text-gray-400">
                No platform data available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
