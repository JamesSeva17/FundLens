
import React, { useState, useMemo } from 'react';
import { AppData, Asset, PriceResponse, Platform, AssetType, Transaction } from '../types';
import { getPriceForAsset } from '../services/priceService';
import AssetIcon from './AssetIcon';

interface PortfolioProps {
  data: AppData;
  prices: Record<string, PriceResponse>;
  updateData: (partial: Partial<AppData>) => void;
  setPrices: React.Dispatch<React.SetStateAction<Record<string, PriceResponse>>>;
}

const Portfolio: React.FC<PortfolioProps> = ({ data, prices, updateData, setPrices }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    ticker: '',
    platform: 'COL Financial' as Platform,
    type: 'Stock' as AssetType,
    units: '',
    price: '',
    fee: '0',
    date: new Date().toISOString().split('T')[0]
  });

  // Extract unique existing tickers for auto-suggestion
  const existingTickers = useMemo(() => {
    return Array.from(new Set(data.assets.map(a => a.ticker))).sort();
  }, [data.assets]);

  // Helper to format string as currency (with commas)
  const formatCurrency = (val: string) => {
    let numeric = val.replace(/[^0-9.]/g, '');
    const split = numeric.split('.');
    if (split.length > 2) numeric = split[0] + '.' + split[1];
    const [integer, decimal] = numeric.split('.');
    const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decimal !== undefined ? `${formattedInteger}.${decimal}` : formattedInteger;
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Parse strings back to numbers by removing commas
    const units = parseFloat(formData.units.replace(/,/g, ''));
    const buyPrice = parseFloat(formData.price.replace(/,/g, ''));
    const fee = parseFloat(formData.fee.replace(/,/g, '')) || 0;
    const tickerUpper = formData.ticker.toUpperCase().trim();

    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      units: units,
      price: buyPrice,
      fee: fee,
      date: formData.date
    };

    const existingAssetIndex = data.assets.findIndex(a => a.ticker === tickerUpper && a.platform === formData.platform);

    let assetsToSave = [...data.assets];
    let activeAsset: Asset;
    
    if (existingAssetIndex >= 0) {
      const existingAsset = { ...assetsToSave[existingAssetIndex] };
      existingAsset.transactions = [...existingAsset.transactions, newTransaction];
      assetsToSave[existingAssetIndex] = existingAsset;
      activeAsset = existingAsset;
    } else {
      const newAsset: Asset = {
        id: Math.random().toString(36).substr(2, 9),
        ticker: tickerUpper,
        name: tickerUpper,
        type: formData.type,
        platform: formData.platform,
        transactions: [newTransaction]
      };
      assetsToSave.push(newAsset);
      activeAsset = newAsset;
    }

    updateData({ assets: assetsToSave });
    setShowAddForm(false);
    setIsSubmitting(false);
    setFormData({
      ticker: '',
      platform: formData.platform,
      type: formData.type,
      units: '',
      price: '',
      fee: '0',
      date: new Date().toISOString().split('T')[0]
    });

    try {
      const priceRes = await getPriceForAsset(activeAsset, prices);
      if (priceRes) {
        setPrices(prev => ({ ...prev, [tickerUpper]: priceRes }));
      }
    } catch (err) {
      console.error("Price retrieval failed during add:", err);
    }
  };

  const removeTransaction = (assetId: string, transactionId: string) => {
    if (!window.confirm("Remove this transaction?")) return;
    const updatedAssets = data.assets.map(asset => {
      if (asset.id === assetId) {
        return { ...asset, transactions: asset.transactions.filter(t => t.id !== transactionId) };
      }
      return asset;
    }).filter(asset => asset.transactions.length > 0);
    updateData({ assets: updatedAssets });
  };

  const deleteAsset = (assetId: string) => {
    if (!window.confirm("Delete this entire position?")) return;
    updateData({ assets: data.assets.filter(a => a.id !== assetId) });
  };

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Positions</h3>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-black text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          <i className="fas fa-plus mr-1"></i> Add
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddAsset} className="bg-white p-5 rounded-3xl border border-indigo-50 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[9px] font-black text-indigo-300 uppercase mb-1">Ticker</label>
              <input 
                type="text" 
                required 
                list="ticker-suggestions"
                value={formData.ticker} 
                onChange={e => setFormData({...formData, ticker: e.target.value.toUpperCase()})} 
                placeholder="BTC or AC" 
                className="w-full bg-transparent text-black border-b border-gray-100 p-2 font-bold focus:border-indigo-500 outline-none text-sm uppercase" 
              />
              <datalist id="ticker-suggestions">
                {existingTickers.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-[9px] font-black text-indigo-300 uppercase mb-1">Platform</label>
              <select value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value as Platform, type: (e.target.value === 'COL Financial' ? 'Stock' : 'Crypto')})} className="w-full bg-transparent text-black border-b border-gray-100 p-2 font-bold focus:border-indigo-500 outline-none text-sm appearance-none">
                <option value="COL Financial">COL</option>
                <option value="Coins.ph">Coins.ph</option>
                <option value="Bybit">Bybit</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black text-indigo-300 uppercase mb-1">Units</label>
              <input type="text" required value={formData.units} onChange={e => setFormData({...formData, units: formatCurrency(e.target.value)})} className="w-full bg-transparent text-black border-b border-gray-100 p-2 font-bold focus:border-indigo-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-indigo-300 uppercase mb-1">Buy Price</label>
              <input type="text" required value={formData.price} onChange={e => setFormData({...formData, price: formatCurrency(e.target.value)})} className="w-full bg-transparent text-black border-b border-gray-100 p-2 font-bold focus:border-indigo-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-indigo-300 uppercase mb-1">Fees</label>
              <input type="text" value={formData.fee} onChange={e => setFormData({...formData, fee: formatCurrency(e.target.value)})} className="w-full bg-transparent text-black border-b border-gray-100 p-2 font-bold focus:border-indigo-500 outline-none text-sm" />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-gray-50">
            <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-gray-400 font-bold text-xs">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black shadow-lg disabled:opacity-50 text-xs">
              {isSubmitting ? 'Syncing...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-3 bg-gray-50/40 border-b border-gray-100 px-4 py-4 md:px-8">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Coin</div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Avg & Gain</div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Holdings</div>
        </div>

        <div className="divide-y divide-gray-50">
          {data.assets.length === 0 ? (
            <div className="px-6 py-16 text-center text-gray-300 font-black text-xs uppercase tracking-widest">No positions found</div>
          ) : (
            data.assets.map(asset => {
              const totalUnits = asset.transactions.reduce((s, t) => s + t.units, 0);
              const totalInvested = asset.transactions.reduce((s, t) => s + (t.units * t.price) + t.fee, 0);
              const avgBuyPrice = totalUnits > 0 ? totalInvested / totalUnits : 0;
              
              const currentPrice = prices[asset.ticker]?.price_php;
              const marketValue = currentPrice !== undefined ? totalUnits * currentPrice : null;
              const netGL = marketValue !== null ? marketValue - totalInvested : null;
              const netGLPct = marketValue !== null && totalInvested > 0 ? (netGL! / totalInvested) * 100 : null;
              
              const isExpanded = expandedAsset === asset.id;

              return (
                <div key={asset.id} className="flex flex-col">
                  <div 
                    className={`hover:bg-indigo-50/30 transition-all cursor-pointer grid grid-cols-3 items-center px-4 py-4 md:px-8 ${isExpanded ? 'bg-indigo-50/50' : ''}`}
                    onClick={() => setExpandedAsset(isExpanded ? null : asset.id)}
                  >
                    <div className="flex items-center gap-3">
                      <AssetIcon symbol={asset.ticker} type={asset.type} customUrl={asset.iconUrl} />
                      <div className="min-w-0">
                        <p className="font-black text-gray-900 leading-tight text-sm truncate">{asset.ticker}</p>
                        <p className="text-[8px] text-indigo-300 font-black uppercase tracking-tight leading-none mt-1">{asset.platform.split(' ')[0]}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center text-center">
                      <p className="text-xs font-bold text-gray-600 leading-tight">
                        ₱{avgBuyPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                      <div className="mt-1 flex items-center justify-center gap-1.5 flex-wrap">
                        {netGL !== null ? (
                          <div className={`flex items-center gap-1 font-black leading-none ${netGL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            <span className="text-[10px]">{netGL >= 0 ? '+' : ''}{netGLPct?.toFixed(1)}%</span>
                            <span className="text-[9px] opacity-60">
                              ({netGL >= 0 ? '+' : ''}₱{Math.abs(Math.round(netGL)).toLocaleString()})
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-300 animate-pulse">...</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end text-right">
                      <p className="text-xs font-black text-gray-900 leading-tight">
                        {marketValue !== null ? `₱${marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '...'}
                      </p>
                      <p className="text-[9px] font-bold text-gray-400 mt-1 leading-none">
                        {totalUnits.toLocaleString()} <span className="opacity-50">Units</span>
                      </p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-indigo-50/20 border-t border-indigo-100/30 p-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-indigo-50">
                          <p className="text-[8px] font-black text-indigo-300 uppercase mb-1">Cost Basis</p>
                          <p className="text-xs font-black text-gray-900 leading-none">₱{totalInvested.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-indigo-50">
                          <p className="text-[8px] font-black text-indigo-300 uppercase mb-1">Gain</p>
                          <p className={`text-xs font-black leading-none ${netGL !== null && netGL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {netGL !== null ? `${netGL >= 0 ? '+' : '-'}₱${Math.abs(Math.round(netGL)).toLocaleString()}` : '...'}
                          </p>
                        </div>
                        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-indigo-50 col-span-2 flex justify-between items-center">
                          <div className="flex flex-col">
                            <p className="text-[8px] font-black text-indigo-300 uppercase mb-1">Mkt Price ({asset.platform})</p>
                            <p className="text-[10px] font-bold text-gray-500 leading-none">
                              {currentPrice ? `₱${currentPrice.toLocaleString()} @ ${new Date(prices[asset.ticker].retrieved_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` : 'Syncing...'}
                            </p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); deleteAsset(asset.id); }} className="bg-red-50 text-red-500 p-2 px-4 rounded-xl text-[9px] font-black uppercase hover:bg-red-100 transition-colors">
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Log History</h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {asset.transactions.sort((a,b) => b.date.localeCompare(a.date)).map((t) => (
                            <div key={t.id} className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-gray-900">{t.date}</span>
                                <span className="text-[10px] font-black text-indigo-600">{t.units.toLocaleString()} Units</span>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                                <div className="flex flex-col">
                                   <span className="text-[8px] text-gray-400 font-bold uppercase">Price</span>
                                   <span className="text-[10px] font-bold text-gray-700">₱{t.price.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <span className="text-[8px] text-gray-400 font-bold uppercase">Subtotal</span>
                                    <p className="text-[10px] font-black text-gray-900">₱{(t.units * t.price + t.fee).toLocaleString()}</p>
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); removeTransaction(asset.id, t.id); }} className="text-gray-200 hover:text-red-500 transition-colors">
                                    <i className="fas fa-trash-alt text-[9px]"></i>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
