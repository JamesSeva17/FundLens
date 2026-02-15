import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppData, Asset, PriceResponse } from './types';
import { loadLocal, saveToLocal, loadFromCloud } from './services/storageService';
import { getPriceForAsset } from './services/priceService';
import { getTradingViewLogo } from './services/logoService';
import { initAnalytics, trackPageView } from './services/analyticsService';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import Snapshots from './components/Snapshots';
import Settings from './components/Settings';

const PRICE_CACHE_KEY = 'fundlens_price_cache';
const SYNC_TIMESTAMP_KEY = 'fundlens_last_sync_time';
const CACHE_TTL_SEC = 60;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'portfolio' | 'savings' | 'settings'>('dashboard');
  const [data, setData] = useState<AppData>(loadLocal());
  const [prices, setPrices] = useState<Record<string, PriceResponse>>(() => {
    try {
      const cached = localStorage.getItem(PRICE_CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch (e) {
      return {};
    }
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastManualSync, setLastManualSync] = useState<number>(() => {
    const saved = localStorage.getItem(SYNC_TIMESTAMP_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [remainingCooldown, setRemainingCooldown] = useState(0);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // 1. Core Initialization
  useEffect(() => {
    initAnalytics();

    if (data.cloudSyncEnabled && data.jsonBinKey && data.jsonBinId) {
      loadFromCloud(data.jsonBinKey, data.jsonBinId).then(cloudData => {
        if (cloudData) {
          setData(cloudData);
        }
      });
    }
  }, []);

  // Sync prices to local storage whenever they change
  useEffect(() => {
    localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(prices));
  }, [prices]);

  // Handle Cooldown Timer
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const elapsed = (now - lastManualSync) / 1000;
      const remaining = Math.max(0, Math.ceil(CACHE_TTL_SEC - elapsed));
      setRemainingCooldown(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lastManualSync]);

  // Track page views on tab change
  useEffect(() => {
    trackPageView(activeTab);
  }, [activeTab]);

  const updateData = useCallback((partial: Partial<AppData>) => {
    setData(prev => {
      const newData = { ...prev, ...partial };
      saveToLocal(newData);
      return newData;
    });
  }, []);

  // 2. Refresh Logic (Prices + Logos)
  const refreshPrices = useCallback(async (assetList?: Asset[], isManual: boolean = false) => {
    const listToRefresh = assetList || data.assets;
    if (isRefreshing || listToRefresh.length === 0) return;
    
    setIsRefreshing(true);
    
    // If manual, immediately set the cooldown to prevent double-clicks
    if (isManual) {
      const now = Date.now();
      setLastManualSync(now);
      localStorage.setItem(SYNC_TIMESTAMP_KEY, now.toString());
    }
    
    try {
      // Map all assets to their price fetch promises
      const fetchPromises = listToRefresh.map(async (asset) => {
        try {
          const priceRes = await getPriceForAsset(asset);
          
          // Check if we need to discover the logo for this asset
          const currentIcons = data.assetIcons || {};
          if (asset.type === 'Stock' && !currentIcons[asset.ticker]) {
             const logoUrl = await getTradingViewLogo(asset.ticker);
             if (logoUrl) {
                updateData({ assetIcons: { ...currentIcons, [asset.ticker]: logoUrl } });
             }
          }

          return priceRes;
        } catch (e) {
          console.warn(`Failed to sync ${asset.ticker}`, e);
          return null;
        }
      });

      const results = await Promise.all(fetchPromises);
      
      setPrices(prev => {
        const next = { ...prev };
        results.forEach(res => {
          if (res) next[res.asset] = res;
        });
        return next;
      });

      if (isManual) {
        setSyncNotice("Prices refreshed from live sources.");
        setTimeout(() => setSyncNotice(null), 3000);
      }
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [data.assets, data.assetIcons, isRefreshing, updateData]);

  // 3. Trigger Price Refresh on Mount
  useEffect(() => {
    refreshPrices();
  }, []); 

  const currentNetWorth = useMemo(() => {
    const assetsValue = data.assets.reduce((sum, asset) => {
      const price = prices[asset.ticker]?.price_php || 0;
      // Use Net Units (Gross - Asset Fees)
      const netUnits = asset.transactions.reduce((tsum, t) => tsum + (t.units - (t.feeIsUnit ? t.fee : 0)), 0);
      return sum + (netUnits * price);
    }, 0);

    const latestSnapshot = [...data.snapshots].sort((a, b) => b.date.localeCompare(a.date))[0];
    const snapshotValue = latestSnapshot ? latestSnapshot.platforms.reduce((sum, p) => sum + p.balance, 0) : 0;

    return assetsValue + snapshotValue;
  }, [data.assets, data.snapshots, prices]);

  const lastUpdateLabel = useMemo(() => {
    const timestamps = Object.values(prices).map(p => new Date(p.retrieved_at).getTime());
    if (timestamps.length === 0) return null;
    const latest = new Date(Math.max(...timestamps));
    return latest.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, [prices]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Toast Notification */}
      {syncNotice && (
        <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-right-10 fade-in duration-300">
          <div className="bg-indigo-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-indigo-700 flex items-center gap-4">
            <div className="bg-indigo-500/20 p-2 rounded-lg">
              <i className="fas fa-check-circle text-green-400"></i>
            </div>
            <p className="text-xs font-black uppercase tracking-widest">{syncNotice}</p>
            <button onClick={() => setSyncNotice(null)} className="ml-2 text-indigo-400 hover:text-white">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      <div className="md:hidden bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-40 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-black text-indigo-900 leading-none tracking-tight">FundLens</h1>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-1">Wealth Tracker</p>
        </div>
        <div className="bg-indigo-50 p-2.5 rounded-xl">
          <i className="fas fa-chart-line text-indigo-600 text-sm"></i>
        </div>
      </div>

      <nav className="w-full md:w-64 bg-indigo-900 text-white flex md:flex-col fixed bottom-0 md:sticky md:top-0 md:h-screen z-50 shrink-0 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.3)] md:shadow-none border-t border-indigo-800 md:border-t-0">
        <div className="p-8 hidden md:block">
          <h1 className="text-2xl font-black tracking-tight text-white">FundLens</h1>
          <p className="text-indigo-300 text-[10px] uppercase font-black tracking-widest mt-1">Wealth Tracker</p>
        </div>
        
        <div className="flex-1 grid grid-cols-4 md:flex md:flex-col">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
            { id: 'portfolio', label: 'Portfolio', icon: 'fa-briefcase' },
            { id: 'savings', label: 'Savings', icon: 'fa-vault' },
            { id: 'settings', label: 'Settings', icon: 'fa-cog' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col md:flex-row items-center justify-center md:justify-start px-1 md:px-6 py-3 md:py-4 transition-all ${
                activeTab === item.id 
                  ? 'bg-indigo-800 text-white md:border-l-4 border-indigo-400 font-bold' 
                  : 'text-indigo-400 hover:text-white hover:bg-indigo-800/50'
              }`}
            >
              <i className={`fas ${item.icon} mb-1 md:mb-0 md:mr-3 w-5 text-center text-xl md:text-base`}></i>
              <span className="text-[9px] md:text-sm uppercase md:capitalize font-black md:font-medium tracking-tight md:tracking-normal">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-8 bg-gray-50 overflow-y-auto mb-20 md:mb-0">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
          <div className="px-1">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">
              {activeTab === 'savings' ? 'Savings Breakdown' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h2>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-col items-end gap-1.5">
              {activeTab !== 'savings' && (
                <>
                  <button 
                    onClick={() => refreshPrices(undefined, true)}
                    disabled={isRefreshing || remainingCooldown > 0}
                    className="bg-white border border-gray-200 text-gray-900 px-6 py-3 rounded-2xl shadow-sm hover:shadow-md disabled:opacity-50 transition-all text-xs font-black uppercase tracking-widest min-w-[170px]"
                  >
                    <i className={`fas fa-sync-alt mr-2 ${isRefreshing ? 'animate-spin' : ''}`}></i>
                    {isRefreshing ? 'Syncing...' : remainingCooldown > 0 ? `Sync in ${remainingCooldown}s` : 'Sync Prices'}
                  </button>
                  {lastUpdateLabel && (
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mr-2">
                      Last Update: {lastUpdateLabel}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard 
              data={data} 
              prices={prices} 
              total={currentNetWorth} 
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}
          {activeTab === 'portfolio' && <Portfolio data={data} prices={prices} updateData={updateData} setPrices={setPrices} />}
          {activeTab === 'savings' && <Snapshots data={data} updateData={updateData} />}
          {activeTab === 'settings' && <Settings data={data} updateData={updateData} />}
        </div>
      </main>
    </div>
  );
};

export default App;