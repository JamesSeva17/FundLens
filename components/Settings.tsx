import React, { useState, useEffect, useCallback } from 'react';
import { AppData } from '../types';
import { createBin } from '../services/storageService';

interface SettingsProps {
  data: AppData;
  updateData: (partial: Partial<AppData>) => void;
}

interface AvailableModel {
  name: string;
  id: string;
  description: string;
}

const Settings: React.FC<SettingsProps> = ({ data, updateData }) => {
  const [isAiReady, setIsAiReady] = useState(false);
  const [isGeneratingBin, setIsGeneratingBin] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = data.geminiApiKey || process.env.API_KEY;
    const isValid = !!apiKey && apiKey !== 'undefined' && apiKey.trim().length > 5;
    setIsAiReady(isValid);
  }, [data.geminiApiKey]);

  const fetchModels = useCallback(async () => {
    const apiKey = data.geminiApiKey || process.env.API_KEY;
    if (!apiKey || apiKey === 'undefined') {
      setFetchError("API Key is missing or invalid.");
      return;
    }

    setIsFetchingModels(true);
    setFetchError(null);
    
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `HTTP ${response.status}`);
      }

      const responseText = await response.text();
      let parsedData: any;
      
      try {
        parsedData = JSON.parse(responseText);
      } catch (e) {
        throw new Error("Received invalid JSON response from Google API.");
      }

      const rawModels = Array.isArray(parsedData.models) ? parsedData.models : [];
      
      if (rawModels.length === 0) {
        throw new Error("The API returned an empty list of models.");
      }

      const filtered = rawModels
        .filter((m: any) => {
          const methods = m.supportedGenerationMethods || m.supportedMethods || [];
          const supportsGen = methods.includes('generateContent');
          const name = (m.name || '').toLowerCase();
          return supportsGen && !name.includes('embedding') && !name.includes('aqa');
        })
        .map((m: any) => {
          const id = m.name.startsWith('models/') ? m.name.split('/').pop() : m.name;
          return {
            name: m.displayName || id || m.name,
            id: id || m.name,
            description: m.description || 'Generative AI Model'
          };
        })
        .sort((a, b) => {
          if (a.id.includes('gemini-3') && !b.id.includes('gemini-3')) return -1;
          if (b.id.includes('gemini-3') && !a.id.includes('gemini-3')) return 1;
          if (a.id.includes('gemini-2.5') && !b.id.includes('gemini-2.5')) return -1;
          if (b.id.includes('gemini-2.5') && !a.id.includes('gemini-2.5')) return 1;
          return a.id.localeCompare(b.id);
        });
      
      setAvailableModels(filtered);
    } catch (err: any) {
      console.error("Model discovery error:", err);
      setFetchError(err.message || "Discovery failed");
      setAvailableModels([
        { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Advanced reasoning and strategy.' },
        { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'High speed and efficiency.' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Stable balanced model.' }
      ]);
    } finally {
      setIsFetchingModels(false);
    }
  }, [data.geminiApiKey]);

  useEffect(() => {
    if (isAiReady) {
      fetchModels();
    }
  }, [isAiReady, fetchModels]);

  const handleGenerateBin = async () => {
    if (!data.jsonBinKey) {
      alert("Please enter a JSONBin Master Key first.");
      return;
    }
    setIsGeneratingBin(true);
    try {
      const binId = await createBin(data.jsonBinKey, data);
      if (binId) {
        updateData({ jsonBinId: binId, cloudSyncEnabled: true });
        alert("New Cloud Bin successfully created and linked!");
      } else {
        alert("Failed to create Bin. Check your Master Key.");
      }
    } catch (err) {
      alert("An error occurred during bin generation.");
    } finally {
      setIsGeneratingBin(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <i className="fas fa-brain text-white text-sm"></i>
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Intelligence Engine</h3>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">Configure Gemini AI</p>
            </div>
          </div>
          <button 
            onClick={fetchModels}
            disabled={isFetchingModels}
            className="text-indigo-600 hover:text-indigo-800 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
          >
            <i className={`fas fa-sync-alt ${isFetchingModels ? 'animate-spin' : ''}`}></i>
            Sync Models
          </button>
        </div>

        <div className={`p-6 rounded-2xl border transition-all duration-500 mb-6 ${
          isAiReady 
            ? 'bg-green-50/50 border-green-100' 
            : 'bg-amber-50 border-amber-100'
        }`}>
          <div className="flex items-start gap-4">
            <div className="relative flex h-3 w-3 mt-1.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isAiReady ? 'bg-green-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isAiReady ? 'bg-green-500' : 'bg-amber-500'}`}></span>
            </div>
            <div>
              <p className={`font-black text-sm uppercase tracking-tight ${isAiReady ? 'text-green-900' : 'text-amber-900'}`}>
                {isAiReady ? 'AI Layer Active' : 'AI Offline'}
              </p>
              <p className={`text-xs mt-1 leading-relaxed ${isAiReady ? 'text-green-700/80' : 'text-amber-700/80'}`}>
                {isAiReady 
                  ? "Configured and ready to analyze your portfolio."
                  : "Please enter your Gemini API Key to enable the Fund Manager."
                }
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Model Selection</label>
            {isFetchingModels ? (
              <div className="py-12 flex flex-col items-center gap-4 text-indigo-300">
                <i className="fas fa-circle-notch animate-spin text-3xl"></i>
                <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Scanning Cloud Models...</span>
              </div>
            ) : availableModels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[450px] overflow-y-auto pr-2 scrollbar-hide">
                {availableModels.map(model => (
                  <button
                    key={model.id}
                    onClick={() => updateData({ geminiModel: model.id })}
                    className={`flex flex-col text-left p-4 rounded-xl border-2 transition-all group ${
                      (data.geminiModel || 'gemini-3-pro-preview') === model.id 
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                        : 'border-gray-50 hover:border-indigo-200 bg-gray-50/30'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="font-bold text-[11px] text-gray-900 leading-tight mr-2">{model.name}</span>
                      {(data.geminiModel || 'gemini-3-pro-preview') === model.id && (
                        <i className="fas fa-check-circle text-indigo-600 text-[10px] mt-0.5"></i>
                      )}
                    </div>
                    <span className="text-[8px] font-black text-indigo-400/60 mt-1.5 uppercase tracking-tighter truncate w-full">{model.id}</span>
                    <span className="text-[9px] text-gray-500 mt-2 leading-tight line-clamp-2 italic">{model.description}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <i className="fas fa-key text-gray-200 text-3xl mb-3"></i>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest px-8">
                  {fetchError ? `Error: ${fetchError}` : 'Provide a valid API Key and hit Sync to discover models'}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Gemini API Key</label>
            <input 
              type="password"
              placeholder="Paste your API Key"
              value={data.geminiApiKey || ''}
              onChange={e => updateData({ geminiApiKey: e.target.value })}
              className="w-full bg-transparent text-black border-b-2 border-gray-200 p-3 focus:border-indigo-500 outline-none transition-colors font-mono text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <i className="fas fa-cloud-upload-alt text-white text-sm"></i>
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Cloud Infrastructure</h3>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">JSONBin Remote Storage</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-8 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
          <div>
            <p className="font-bold text-indigo-900">Enable Cloud Sync</p>
            <p className="text-sm text-indigo-700 opacity-80">Synchronize data across all your devices.</p>
          </div>
          <button 
            onClick={() => updateData({ cloudSyncEnabled: !data.cloudSyncEnabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${data.cloudSyncEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${data.cloudSyncEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">JSONBin Master Key</label>
            <input 
              type="password"
              placeholder="Your Master Key"
              value={data.jsonBinKey || ''}
              onChange={e => updateData({ jsonBinKey: e.target.value })}
              className="w-full bg-transparent text-black border-b-2 border-gray-200 p-3 focus:border-indigo-500 outline-none transition-colors font-mono text-sm"
            />
          </div>
          
          <div className="relative">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">JSONBin Bin ID</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Linked Bin ID"
                value={data.jsonBinId || ''}
                onChange={e => updateData({ jsonBinId: e.target.value })}
                className="flex-1 bg-transparent text-black border-b-2 border-gray-200 p-3 focus:border-indigo-500 outline-none transition-colors font-mono text-sm"
              />
              {data.jsonBinKey && !data.jsonBinId && (
                <button 
                  onClick={handleGenerateBin}
                  disabled={isGeneratingBin}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                  {isGeneratingBin ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-magic"></i>}
                  Auto-Gen
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <i className="fas fa-database text-indigo-600 mr-3"></i>
          Data Management
        </h3>
        <div className="space-y-4">
          <button 
            onClick={() => {
              const exportData = JSON.stringify(data, null, 2);
              const blob = new Blob([exportData], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `fundlens_export_${new Date().toISOString().split('T')[0]}.json`;
              a.click();
            }}
            className="w-full flex items-center justify-center gap-2 bg-gray-50 border border-gray-200 text-gray-700 p-3 rounded-xl font-bold hover:bg-gray-100 transition-colors"
          >
            <i className="fas fa-download text-indigo-600"></i>
            Export Backup (JSON)
          </button>
          
          <button 
            onClick={() => {
              if (window.confirm("Are you sure you want to clear ALL data? This cannot be undone.")) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="w-full flex items-center justify-center gap-2 bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl font-bold hover:bg-red-100 transition-colors"
          >
            <i className="fas fa-trash-alt"></i>
            Purge All Local Data
          </button>
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-sm text-gray-400 font-medium tracking-tight">FundLens v1.7.0 — Advanced Wealth Intelligence</p>
      </div>
    </div>
  );
};

export default Settings;