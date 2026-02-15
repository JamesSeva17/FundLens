import React, { useState, useMemo, useEffect } from 'react';
import { AppData, MonthlySnapshot, SnapshotPlatform } from '../types';

interface SnapshotsProps {
  data: AppData;
  updateData: (partial: Partial<AppData>) => void;
}

const Snapshots: React.FC<SnapshotsProps> = ({ data, updateData }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [expandedInstitution, setExpandedInstitution] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'balance' | 'mom' | 'name'>('balance');
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [formData, setFormData] = useState({
    platforms: [] as SnapshotPlatform[]
  });
  const [newPlatform, setNewPlatform] = useState({ name: '', balance: '' });

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const years = useMemo(() => {
    const startYear = 2020;
    const endYear = currentYear + 1;
    const list = [];
    for (let i = endYear; i >= startYear; i--) list.push(i);
    return list;
  }, [currentYear]);

  const targetDateKey = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}`;

  // SYNC: Pre-populate the form with existing data for the selected month/year
  useEffect(() => {
    if (showAdd) {
      const existing = data.snapshots.find(s => s.date === targetDateKey);
      setFormData({
        platforms: existing ? [...existing.platforms] : []
      });
    }
  }, [targetDateKey, showAdd, data.snapshots]);

  const getBgColor = (name: string) => {
    const colors = [
      'bg-blue-600', 'bg-indigo-600', 'bg-slate-700', 'bg-teal-600',
      'bg-emerald-600', 'bg-rose-600', 'bg-amber-600', 'bg-violet-600',
      'bg-cyan-700', 'bg-orange-600'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const formatCurrency = (val: string) => {
    let numeric = val.replace(/[^0-9.]/g, '');
    const split = numeric.split('.');
    if (split.length > 2) numeric = split[0] + '.' + split[1];
    const [integer, decimal] = numeric.split('.');
    const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decimal !== undefined ? `${formattedInteger}.${decimal}` : formattedInteger;
  };

  const addSnapshot = () => {
    const existingIndex = data.snapshots.findIndex(s => s.date === targetDateKey);
    
    let updatedSnapshots: MonthlySnapshot[];
    if (existingIndex >= 0) {
      updatedSnapshots = [...data.snapshots];
      updatedSnapshots[existingIndex] = {
        ...updatedSnapshots[existingIndex],
        platforms: formData.platforms
      };
    } else {
      const newSnap: MonthlySnapshot = {
        id: Math.random().toString(36).substr(2, 9),
        date: targetDateKey,
        platforms: formData.platforms
      };
      updatedSnapshots = [...data.snapshots, newSnap];
    }

    updateData({ snapshots: updatedSnapshots });
    setFormData({ platforms: [] });
    setShowAdd(false);
  };

  const addPlatformToSnap = () => {
    const cleanName = newPlatform.name.toUpperCase().trim();
    if (!cleanName || !newPlatform.balance) return;
    
    const numericBalance = parseFloat(newPlatform.balance.replace(/,/g, ''));
    
    const existingIndex = formData.platforms.findIndex(p => p.name === cleanName);
    
    if (existingIndex >= 0) {
      const updatedPlatforms = [...formData.platforms];
      updatedPlatforms[existingIndex] = { ...updatedPlatforms[existingIndex], balance: numericBalance };
      setFormData({ ...formData, platforms: updatedPlatforms });
    } else {
      setFormData({
        ...formData,
        platforms: [...formData.platforms, { name: cleanName, balance: numericBalance }]
      });
    }
    setNewPlatform({ name: '', balance: '' });
  };

  const existingInstitutions = useMemo(() => {
    const names = data.snapshots.flatMap(s => s.platforms.map(p => p.name));
    return Array.from(new Set(names)).sort();
  }, [data.snapshots]);

  const itemSummaries = useMemo(() => {
    const sortedSnapshots = [...data.snapshots].sort((a, b) => a.date.localeCompare(b.date));
    const uniqueItems: string[] = Array.from(new Set(data.snapshots.flatMap(s => s.platforms.map(p => p.name))));

    const summaries = uniqueItems.map(name => {
      const history = sortedSnapshots
        .map(s => ({ date: s.date, balance: s.platforms.find(p => p.name === name)?.balance }))
        .filter(h => h.balance !== undefined) as { date: string, balance: number }[];

      if (history.length === 0) return null;

      const current = history[history.length - 1];
      const previous = history.length > 1 ? history[history.length - 2] : null;
      const capital = history[0];

      const diffPrev = previous ? current.balance - previous.balance : 0;
      const pctPrev = previous ? (diffPrev / previous.balance) * 100 : 0;

      const diffCapital = current.balance - capital.balance;
      const pctCapital = capital.balance !== 0 ? (diffCapital / capital.balance) * 100 : 0;

      return {
        name,
        current: current.balance,
        diffPrev,
        pctPrev,
        diffCapital,
        pctCapital,
        capitalDate: capital.date,
        lastUpdate: current.date,
        history: [...history].reverse(),
        iconUrl: data.platformIcons?.[name]
      };
    }).filter(Boolean) as any[];

    // APPLY SORTING
    return summaries.sort((a, b) => {
      if (sortBy === 'balance') return b.current - a.current;
      if (sortBy === 'mom') return b.pctPrev - a.pctPrev;
      return a.name.localeCompare(b.name);
    });
  }, [data.snapshots, data.platformIcons, sortBy]);

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
        <div className="flex flex-col">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'balance', label: 'Balance' },
              { id: 'mom', label: 'MoM' },
              { id: 'name', label: 'A-Z' }
            ].map((opt) => (
              <button 
                key={opt.id}
                onClick={() => setSortBy(opt.id as any)}
                className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border transition-all ${
                  sortBy === opt.id 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                    : 'bg-white border-gray-200 text-gray-400 hover:border-indigo-200'
                }`}
              >
                Sort by {opt.label}
              </button>
            ))}
          </div>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-black text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 w-full md:w-auto"
        >
          {showAdd ? 'Cancel' : <><i className="fas fa-plus mr-1"></i> Update Log</>}
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-5 rounded-3xl border border-indigo-50 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="mb-6">
            <label className="block text-[9px] font-black text-indigo-300 uppercase mb-2 tracking-widest">Target Period</label>
            <div className="flex gap-2 max-w-md">
              <select 
                value={selectedMonth}
                onChange={e => setSelectedMonth(parseInt(e.target.value))}
                className="flex-1 bg-gray-50 border-b-2 border-transparent focus:border-indigo-500 p-2.5 rounded-xl font-black text-xs outline-none transition-all appearance-none cursor-pointer"
              >
                {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select 
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="w-24 bg-gray-50 border-b-2 border-transparent focus:border-indigo-500 p-2.5 rounded-xl font-black text-xs outline-none transition-all appearance-none cursor-pointer"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                {formData.platforms.length > 0 ? `Logged for ${months[selectedMonth]} ${selectedYear}` : 'No records for this period'}
              </h4>
              {formData.platforms.length > 0 && <span className="text-[9px] font-black text-indigo-400">{formData.platforms.length} items</span>}
            </div>
            
            <div className="space-y-2">
              {formData.platforms.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100 group">
                  <span className="text-xs font-black text-gray-700 tracking-tight">{p.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-indigo-600">₱{p.balance.toLocaleString()}</span>
                    <button 
                      onClick={() => setFormData({...formData, platforms: formData.platforms.filter((_, i) => i !== idx)})}
                      className="text-gray-200 hover:text-red-500 transition-colors"
                    >
                      <i className="fas fa-times-circle"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 p-4 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  placeholder="WALLET NAME" 
                  list="institution-suggestions"
                  value={newPlatform.name}
                  onChange={e => setNewPlatform({...newPlatform, name: e.target.value.toUpperCase()})}
                  className="w-full bg-transparent text-black border-b border-gray-200 p-2 text-sm font-black focus:border-indigo-500 outline-none transition-all placeholder:text-gray-300 uppercase"
                />
                <datalist id="institution-suggestions">
                  {existingInstitutions.map(inst => <option key={inst} value={inst} />)}
                </datalist>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" placeholder="BALANCE"
                  value={newPlatform.balance}
                  onChange={e => setNewPlatform({...newPlatform, balance: formatCurrency(e.target.value)})}
                  className="w-full md:w-32 bg-transparent text-black border-b border-gray-100 p-2 text-sm font-black focus:border-indigo-500 outline-none transition-all placeholder:text-gray-300"
                />
                <button 
                  onClick={addPlatformToSnap}
                  className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase shadow-md active:scale-95 transition-transform"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-400 font-bold text-xs uppercase tracking-widest">Cancel</button>
            <button 
              onClick={addSnapshot}
              className="bg-indigo-900 text-white px-8 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-800 transition-colors active:scale-[0.98]"
            >
              Commit Snapshot
            </button>
          </div>
        </div>
      )}

      {/* Main List */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-3 bg-gray-50/40 border-b border-gray-100 px-4 py-4 md:px-8">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Wallet Name</div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">MoM Perf</div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Balance</div>
        </div>

        <div className="divide-y divide-gray-50">
          {itemSummaries.length === 0 ? (
            <div className="px-6 py-20 text-center text-gray-300 font-black text-xs uppercase tracking-widest flex flex-col items-center gap-4">
              <i className="fas fa-receipt text-4xl opacity-20"></i>
              No wallet data logged yet.
            </div>
          ) : (
            itemSummaries.map(item => {
              const isExpanded = expandedInstitution === item.name;

              return (
                <div key={item.name} className="flex flex-col">
                  <div 
                    className={`hover:bg-indigo-50/30 transition-all cursor-pointer grid grid-cols-3 items-center px-4 py-4 md:px-8 ${isExpanded ? 'bg-indigo-50/50' : ''}`}
                    onClick={() => setExpandedInstitution(isExpanded ? null : item.name)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 shrink-0 relative rounded-full flex items-center justify-center overflow-hidden shadow-sm border border-gray-100 ${getBgColor(item.name)}`}>
                        {item.iconUrl ? (
                          <img src={item.iconUrl} className="absolute inset-0 w-full h-full object-contain p-1.5 bg-white" alt={item.name} />
                        ) : (
                          <span className="font-black text-white uppercase text-[10px] tracking-tighter">
                            {item.name.substring(0, 3)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-gray-900 leading-tight text-sm truncate">{item.name}</p>
                        <p className="text-[8px] text-indigo-300 font-black uppercase tracking-tight leading-none mt-1">LOG: {item.lastUpdate}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center text-center">
                      <div className={`flex items-center gap-1 font-black leading-none ${item.diffPrev >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        <span className="text-[10px]">{item.diffPrev >= 0 ? '▲' : '▼'} {Math.abs(item.pctPrev).toFixed(1)}%</span>
                        <span className="text-[9px] opacity-60">
                          ({item.diffPrev >= 0 ? '+' : ''}₱{Math.abs(Math.round(item.diffPrev)).toLocaleString()})
                        </span>
                      </div>
                      <p className="text-[8px] text-gray-300 font-black uppercase mt-1 tracking-widest">Monthly Δ</p>
                    </div>

                    <div className="flex flex-col items-end text-right">
                      <p className="text-xs font-black text-gray-900 leading-tight">
                        ₱{item.current.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-[8px] font-black text-gray-400 mt-1 uppercase tracking-tighter">Current Balance</p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-indigo-50/20 border-t border-indigo-100/30 p-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-indigo-50">
                          <p className="text-[8px] font-black text-indigo-300 uppercase mb-1">Inception Balance</p>
                          <p className="text-xs font-black text-gray-900 leading-none">₱{item.history[item.history.length-1].balance.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-indigo-50">
                          <p className="text-[8px] font-black text-indigo-300 uppercase mb-1">Lifetime Accrued</p>
                          <p className={`text-xs font-black leading-none ${item.diffCapital >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.diffCapital >= 0 ? '+' : '-'}₱{Math.abs(Math.round(item.diffCapital)).toLocaleString()} ({item.pctCapital.toFixed(1)}%)
                          </p>
                        </div>
                        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-indigo-50 col-span-2 flex justify-between items-center">
                          <div className="flex flex-col">
                            <p className="text-[8px] font-black text-indigo-300 uppercase mb-1">Wallet Lifetime</p>
                            <p className="text-[10px] font-bold text-gray-500 leading-none">
                              First logged in {item.capitalDate}
                            </p>
                          </div>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (window.confirm(`Delete ALL records for "${item.name}"?`)) {
                                const updated = data.snapshots.map(s => ({
                                  ...s,
                                  platforms: s.platforms.filter(p => p.name !== item.name)
                                })).filter(s => s.platforms.length > 0);
                                updateData({ snapshots: updated });
                              }
                            }} 
                            className="bg-red-50 text-red-500 p-2 px-4 rounded-xl text-[9px] font-black uppercase hover:bg-red-100 transition-colors"
                          >
                            Purge History
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Log History</h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {item.history.map((entry: any, idx: number, arr: any[]) => {
                            const prevEntry = arr[idx + 1];
                            const growth = prevEntry ? entry.balance - prevEntry.balance : 0;
                            return (
                              <div key={entry.date} className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-black text-gray-900">{entry.date}</span>
                                  <span className="text-[10px] font-black text-indigo-600">₱{entry.balance.toLocaleString()}</span>
                                </div>
                                <div className="pt-2 border-t border-gray-50 flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-black ${growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                      {growth >= 0 ? '+' : ''}₱{Math.abs(growth).toLocaleString()}
                                    </span>
                                    <span className="text-[8px] font-bold text-gray-300 uppercase">Growth</span>
                                  </div>
                                  <button 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      const updated = data.snapshots.map(s => {
                                        if (s.date === entry.date) {
                                          return { ...s, platforms: s.platforms.filter(p => p.name !== item.name) };
                                        }
                                        return s;
                                      }).filter(s => s.platforms.length > 0);
                                      updateData({ snapshots: updated });
                                    }} 
                                    className="text-gray-200 hover:text-red-500 transition-colors"
                                  >
                                    <i className="fas fa-trash-alt text-[9px]"></i>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
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

      {data.snapshots.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-100">
           <div className="flex items-center justify-between mb-4 px-1">
             <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Global Snapshot Logs</h4>
             <span className="text-[9px] font-black text-indigo-300 italic uppercase tracking-widest">{data.snapshots.length} Points</span>
           </div>
           <div className="flex flex-wrap gap-2">
             {data.snapshots.sort((a,b) => b.date.localeCompare(a.date)).map(s => (
               <div key={s.id} className="bg-white px-3 py-1.5 rounded-xl border border-gray-100 text-[9px] font-black text-gray-600 flex items-center gap-2.5 shadow-sm hover:border-indigo-200 transition-all">
                 <span className="tracking-tighter">{s.date}</span>
                 <button 
                  onClick={() => {
                    if (window.confirm(`Delete the entire snapshot for ${s.date}?`)) {
                      updateData({ snapshots: data.snapshots.filter(snap => snap.id !== s.id) });
                    }
                  }}
                  className="text-gray-200 hover:text-red-500 transition-colors"
                 >
                   <i className="fas fa-times-circle"></i>
                 </button>
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default Snapshots;