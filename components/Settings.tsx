
import React, { useState, useEffect } from 'react';
import { AppData } from '../types';

interface SettingsProps {
  data: AppData;
  updateData: (partial: Partial<AppData>) => void;
}

// Fixed: Removed local declare global for window.aistudio to avoid conflict with ambient types.
// We'll access it safely via type casting where needed since the environment already provides it.

const Settings: React.FC<SettingsProps> = ({ data, updateData }) => {
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    checkKey();
  }, []);

  const checkKey = async () => {
    // Accessing environment-provided window.aistudio safely
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
      try {
        const selected = await aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } catch (e) {
        console.error("Error checking API key status", e);
      }
    }
  };

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      try {
        await aistudio.openSelectKey();
        // GUIDELINE: Assume success immediately after opening the selector to mitigate race conditions
        setHasKey(true);
      } catch (e) {
        console.error("Error opening key selector", e);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* AI Configuration Section */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <i className="fas fa-key text-white text-sm"></i>
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">AI Fund Manager Config</h3>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">Provider: Google Gemini</p>
          </div>
        </div>

        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 space-y-4">
          <div className="flex items-start gap-4">
            <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${hasKey ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`}></div>
            <div>
              <p className="font-black text-indigo-900 text-sm">{hasKey ? 'Gemini Key Connected' : 'Gemini Key Required'}</p>
              <p className="text-xs text-indigo-700 opacity-80 mt-1 leading-relaxed">
                To use the Fund Manager AI, you must connect a valid Gemini API Key from your own Google Cloud project.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button 
              onClick={handleSelectKey}
              className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 ${
                hasKey 
                ? 'bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
              }`}
            >
              <i className={`fas ${hasKey ? 'fa-sync-alt' : 'fa-plug'} mr-2`}></i>
              {hasKey ? 'Switch API Key' : 'Connect Gemini Key'}
            </button>
          </div>
          
          <div className="pt-2">
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] text-indigo-500 hover:text-indigo-700 font-bold uppercase tracking-wider flex items-center gap-1 justify-center"
            >
              <i className="fas fa-external-link-alt text-[8px]"></i>
              Learn about Project Billing Requirements
            </a>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <i className="fas fa-cloud-upload-alt text-indigo-600 mr-3"></i>
          JSONBin Cloud Sync
        </h3>
        
        <div className="flex items-center justify-between mb-8 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
          <div>
            <p className="font-bold text-indigo-900">Enable Sync</p>
            <p className="text-sm text-indigo-700 opacity-80">Keep your data safe across multiple devices.</p>
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
              className="w-full bg-transparent text-black border-b-2 border-gray-200 p-3 focus:border-indigo-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">JSONBin Bin ID</label>
            <input 
              type="text"
              placeholder="Your Bin ID"
              value={data.jsonBinId || ''}
              onChange={e => updateData({ jsonBinId: e.target.value })}
              className="w-full bg-transparent text-black border-b-2 border-gray-200 p-3 focus:border-indigo-500 outline-none transition-colors"
            />
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
        <p className="text-sm text-gray-400 font-medium tracking-tight">FundLens v1.2.0 — Interactive Wealth Management</p>
      </div>
    </div>
  );
};

export default Settings;
