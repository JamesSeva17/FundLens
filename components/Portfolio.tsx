import React, { useState, useMemo, useEffect } from 'react';
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
    feeIsUnit: false,
    date: new Date().toISOString().split('T')[0]
  });

  const isColPlatform = formData.platform === 'COL Financial';

  // Platform-specific defaults
  useEffect(() => {
    const cryptoPlatforms: Platform[] = ['Coins.ph', 'Bybit'];
    const isCryptoPlatform = cryptoPlatforms.includes(formData.platform);
    setFormData(prev => ({ 
      ...prev, 
      feeIsUnit: isCryptoPlatform,
      type: formData.platform === 'COL Financial' ? 'Stock' : 'Crypto',
      fee: formData.platform === 'COL Financial' ? '0' : prev.fee
    }));
  }, [formData.platform]);

  // Group and sort assets
  const groupedAssets = useMemo(() => {
    // 1. Calculate P/L for all assets
    const assetsWithPL = data.assets.map(asset => {
      const netUnits = asset.transactions.reduce((s, t) => s + (t.units - (t.feeIsUnit ? t.fee : 0)), 0);
      const totalInvested = asset.transactions.reduce((s, t) => s + (t.units * t.price) + (t.feeIsUnit ? 0 : t.fee), 0);
      const currentPrice = prices[asset.ticker]?.price_php;
      const profit = currentPrice !== undefined ? (netUnits * currentPrice) - totalInvested : -Infinity;
      return { asset, profit, netUnits, totalInvested, currentPrice };
    });

    // 2. Group by platform
    const groups: Record<string, typeof assetsWithPL> = {};
    assetsWithPL.forEach(item => {
      const p = item.asset.platform;
      if (!groups[p]) groups[p] = [];
      groups[p].push(item);
    });

    // 3. Sort internally by profit
    Object.keys(groups).forEach(p => {
      groups[p].sort((a, b) => b.profit - a.profit);
    });

    return groups;
  }, [data.assets, prices]);

  const existingTickers = useMemo(() => {
    return Array.from(new Set(data.assets.map(a => a.ticker))).sort();
  }, [data.assets]);

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
    
    const units = parseFloat(formData.units.replace(/,/g, ''));
    const buyPrice = parseFloat(formData.price.replace(/,/g, ''));
    const fee = parseFloat(formData.fee.replace(/,/g, '')) || 0;
    const tickerUpper = formData.ticker.toUpperCase().trim();

    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      units: units,
      price: buyPrice,
      fee: fee,
      feeIsUnit: formData.feeIsUnit,
      date: isColPlatform ? new Date().toISOString().split('T')[0] : formData.date
    };

    const existingAssetIndex = data.assets.findIndex(a => a.ticker === tickerUpper && a.platform === formData.platform);

    let assetsToSave = [...data.assets];
    let activeAsset: Asset;
    
    if (existingAssetIndex >= 0) {
      const existingAsset = { ...assetsToSave[existingAssetIndex] };
      if (isColPlatform) {
        existingAsset.transactions = [newTransaction];
      } else {
        existingAsset.transactions = [...existingAsset.transactions, newTransaction];
      }
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
    setFormData(prev => ({
      ...prev,
      ticker: '',
      units: '',
      price: '',
      fee: '0'
    }));

    try {
      const priceRes = await getPriceForAsset(activeAsset);
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

  const previewNetUnits = useMemo(() => {
    const u = parseFloat(formData.units.replace(/,/g, '')) || 0;
    const f = parseFloat(formData.fee.replace(/,/g, '')) || 0;
    return formData.feeIsUnit ? u - f : u;
  }, [formData.units, formData.fee, formData.feeIsUnit]);

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Positions</h3>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-black text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          <i className={`fas ${showAddForm ? 'fa-times' : 'fa-plus'} mr-1`}></i> {showAddForm ? 'Close' : 'Add'}
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
              <select 
                value={formData.platform} 
                onChange={e => setFormData({...formData, platform: e.target.value as Platform})} 
                className="w-full bg-transparent text-black border-b border-gray-100 p-2 font-bold focus:border-indigo-500 outline-none text-sm appearance-none"
              >
                <option value="COL Financial">COL Financial</option>
                <option value="Coins.ph">Coins.ph</option>
                <option value="Bybit">Bybit</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black text-indigo-300 uppercase mb-1">{isColPlatform ? 'Average Price (PHP)' : 'Buy Price (PHP)'}</label>
              <input type="text" required value={formData.price} onChange={e => setFormData({...formData, price: formatCurrency(e.target.value)})} className="w-full bg-transparent text-black border-b border-gray-100 p-2 font-bold focus:border-indigo-500 outline-none text-sm" />
            </div>
            <div className={isColPlatform ? 'col-span-2' : ''}>
              <label className="block text-[9px] font-black text-indigo-300 uppercase mb-1">{isColPlatform ? 'Units Held' : 'Gross Units'}</label>
              <input type="text" required value={formData.units} onChange={e => setFormData({...formData, units: formatCurrency(e.target.value)})} className="w-full bg-transparent text-black border-b border-gray-100 p-2 font-bold focus:border-indigo-500 outline-none text-sm" />
            </div>
            
            {!isColPlatform && (
              <>
                <div className="flex flex-col">
                  <label className="block text-[9px] font-black text-indigo-300 uppercase mb-1">Fees</label>
                  <div className="flex gap-2">
                    <input type="text" value={formData.fee} onChange={e => setFormData({...formData, fee: formatCurrency(e.target.value)})} className="flex-1 bg-transparent text-black border-b border-gray-100 p-2 font-bold focus:border-indigo-500 outline-none text-sm" />
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, feeIsUnit: !formData.feeIsUnit})}
                      className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${formData.feeIsUnit ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}
                    >
                      {formData.feeIsUnit ? (formData.ticker || 'Asset') : 'PHP'}
                    </button>
                  </div>
                </div>
                <div>
                   <label className="block text-[9px] font-black text-indigo-300 uppercase mb-1">Trade Date</label>
                   <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-transparent text-black border-b border-gray-100 p-2 font-bold focus:border-indigo-500 outline-none text-sm" />
                </div>
              </>
            )}

            <div className="col-span-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex justify-between items-center">
               <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{isColPlatform ? 'Current Bag' : 'Est. Net Holdings'}</span>
               <span className="text-sm font-black text-indigo-900">{previewNetUnits.toLocaleString()} {formData.ticker}</span>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-gray-50">
            <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-gray-400 font-bold text-xs uppercase tracking-widest">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black shadow-lg disabled:opacity-50 text-xs uppercase tracking-widest">
              {isSubmitting ? 'Syncing...' : isColPlatform ? 'Set Position' : 'Save Transaction'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-4 bg-gray-50/40 border-b border-gray-100 px-4 py-4 md:px-8">
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Asset & Cost</div>
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Market Price</div>
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">P/L</div>
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Current Value / Holdings</div>
        </div>

        <div className="divide-y divide-gray-50">
          {data.assets.length === 0 ? (
            <div className="px-6 py-16 text-center text-gray-300 font-black text-xs uppercase tracking-widest">No positions found</div>
          ) : (
            // Fix: Explicitly cast Object.entries to fix "Property 'map' does not exist on type 'unknown'" error on platform items.
            (Object.entries(groupedAssets) as [string, any[]][]).sort(([pA], [pB]) => pA.localeCompare(pB)).map(([platform, items]) => (
              <React.Fragment key={platform}>
                {/* Platform Section Header */}
                <div className="bg-indigo-50/20 px-4 py-3 md:px-8 border-y border-indigo-50/50">
                  <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">{platform}</h4>
                </div>

                {items.map(({ asset, profit, netUnits, totalInvested, currentPrice }) => {
                  const marketValue = currentPrice !== undefined ? netUnits * currentPrice : null;
                  const netGL = profit !== -Infinity ? profit : null;
                  const netGLPct = marketValue !== null && totalInvested > 0 ? (netGL! / totalInvested) * 100 : null;
                  const isExpanded = expandedAsset === asset.id;

                  return (
                    <div key={asset.id} className="flex flex-col">
                      <div 
                        className={`hover:bg-indigo-50/30 transition-all cursor-pointer grid grid-cols-4 items-center px-4 py-5 md:px-8 ${isExpanded ? 'bg-indigo-50/50' : ''}`}
                        onClick={() => setExpandedAsset(isExpanded ? null : asset.id)}
                      >
                        {/* Col 1: Name, Platform, Cost */}
                        <div className="flex items-center gap-3">
                          <AssetIcon symbol={asset.ticker} type={asset.type} customUrl={asset.iconUrl} size="sm" />
                          <div className="min-w-0">
                            <p className="font-black text-gray-900 leading-tight text-xs truncate">{asset.ticker}</p>
                            <p className="text-[8px] font-black text-gray-400 mt-1 uppercase tracking-tighter">
                              Cost: ₱{totalInvested.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>

                        {/* Col 2: Market Price */}
                        <div className="text-center">
                          <p className="text-xs font-black text-gray-700 leading-tight">
                            {currentPrice !== undefined ? `₱${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '...'}
                          </p>
                        </div>

                        {/* Col 3: Profit/Loss */}
                        <div className="flex flex-col items-center text-center">
                          {netGL !== null ? (
                            <>
                              <div className={`flex items-center gap-1 font-black leading-none ${netGL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                <span className="text-[10px]">{netGL >= 0 ? '+' : ''}{netGLPct?.toFixed(1)}%</span>
                              </div>
                              <p className={`text-[9px] font-bold mt-1 leading-none ${netGL >= 0 ? 'text-green-600/60' : 'text-red-600/60'}`}>
                                {netGL >= 0 ? '+' : ''}₱{Math.abs(Math.round(netGL)).toLocaleString()}
                              </p>
                            </>
                          ) : (
                            <span className="text-[10px] font-bold text-gray-300 animate-pulse">...</span>
                          )}
                        </div>

                        {/* Col 4: Holdings & Current Value */}
                        <div className="flex flex-col items-end text-right">
                          <p className="text-xs font-black text-gray-900 leading-tight">
                            {marketValue !== null ? `₱${marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '...'}
                          </p>
                          <p className="text-[9px] font-bold text-gray-400 mt-1 leading-none">
                            {netUnits.toLocaleString()} <span className="opacity-50 text-[8px] font-black uppercase tracking-tighter">Units</span>
                          </p>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-indigo-50/20 border-t border-indigo-100/30 p-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-indigo-50">
                              <p className="text-[8px] font-black text-indigo-300 uppercase mb-1">Break-even Avg</p>
                              <p className="text-xs font-black text-gray-900 leading-none">
                                ₱{(netUnits > 0 ? totalInvested / netUnits : 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-indigo-50">
                              <p className="text-[8px] font-black text-indigo-300 uppercase mb-1">Mkt Status</p>
                              <p className="text-[9px] font-bold text-gray-500 leading-none">
                                {currentPrice ? `Synced @ ${new Date(prices[asset.ticker].retrieved_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` : 'Syncing...'}
                              </p>
                            </div>
                            <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-indigo-50 col-span-2 flex justify-between items-center">
                              <div className="flex flex-col">
                                <p className="text-[8px] font-black text-indigo-300 uppercase mb-1">Asset ID</p>
                                <p className="text-[10px] font-black text-gray-900 leading-none">{asset.id}</p>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); deleteAsset(asset.id); }} className="bg-red-50 text-red-500 p-2 px-4 rounded-xl text-[9px] font-black uppercase hover:bg-red-100 transition-colors">
                                Delete Asset
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">
                              {asset.platform === 'COL Financial' ? 'Position Entry' : 'Log History'}
                            </h4>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                              {asset.transactions.sort((a,b) => b.date.localeCompare(a.date)).map((t) => (
                                <div key={t.id} className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-gray-900">{t.date}</span>
                                    <div className="text-right">
                                      <span className="text-[10px] font-black text-indigo-600">{(t.units - (t.feeIsUnit ? t.fee : 0)).toLocaleString()} Net Units</span>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                                    <div className="flex flex-col">
                                       <span className="text-[8px] text-gray-400 font-bold uppercase">{asset.platform === 'COL Financial' ? 'Avg Entry' : 'Price'}</span>
                                       <span className="text-[10px] font-bold text-gray-700">₱{t.price.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {asset.platform !== 'COL Financial' && (
                                        <div className="text-right">
                                          <span className="text-[8px] text-gray-400 font-bold uppercase">Fee</span>
                                          <p className="text-[10px] font-black text-gray-900">{t.fee.toLocaleString()} {t.feeIsUnit ? asset.ticker : 'PHP'}</p>
                                        </div>
                                      )}
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
                })}
              </React.Fragment>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Portfolio;