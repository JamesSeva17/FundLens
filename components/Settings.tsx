
import React, { useState, useEffect } from 'react';
import { AppData } from '../types';

interface SettingsProps {
  data: AppData;
  updateData: (partial: Partial<AppData>) => void;
}

const Settings: React.FC<SettingsProps> = ({ data, updateData }) => {
  const [isAiReady, setIsAiReady] = useState(false);

  useEffect(() => {
    // Check if the API key is available in either AppData or environment
    const apiKey = data.geminiApiKey || process.env.API_KEY;
    setIsAiReady(!!apiKey && apiKey !== 'undefined');
  }, [data.geminiApiKey]);

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      {/* AI Service Status Section */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <i className="fas fa-robot text-white text-sm"></i>
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">AI Fund Manager</h3>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">Intelligence Layer Status</p>
          </div>
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
                {isAiReady ? 'Service Operational' : 'Action Required'}
              </p>
              <p className={`text-xs mt-1 leading-relaxed ${isAiReady ? 'text-green-700/80' : 'text-amber-700/80'}`}>
                {isAiReady 
                  ? "The Gemini AI engine is ready. It will prioritize your manual key if provided, or use the system default."
                  : "No Gemini API Key detected. Please enter your key below to enable AI insights."
                }
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Gemini API Key</label>
            <input 
              type="password"
              placeholder="Paste your Gemini API Key here"
              value={data.geminiApiKey || ''}
              onChange={e => updateData({ geminiApiKey: e.target.value })}
              className="w-full bg-transparent text-black border-b-2 border-gray-200 p-3 focus:border-indigo-500 outline-none transition-colors font-mono text-sm"
            />
            <p className="text-[10px] text-gray-400 mt-2">
              Keys are stored securely in your browser's local storage and never sent to our servers.
            </p>
          </div>

          <div className="pt-4 border-t border-black/5 flex items-center justify-between">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Model: Gemini 3 Pro</span>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[9px] text-indigo-500 hover:text-indigo-700 font-bold uppercase tracking-wider flex items-center gap-1"
            >
              <i className="fas fa-external-link-alt text-[8px]"></i>
              Get your API Key
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
              className="w-full bg-transparent text-black border-b-2 border-gray-200 p-3 focus:border-indigo-500 outline-none transition-colors font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">JSONBin Bin ID</label>
            <input 
              type="text"
              placeholder="Your Bin ID"
              value={data.jsonBinId || ''}
              onChange={e => updateData({ jsonBinId: e.target.value })}
              className="w-full bg-transparent text-black border-b-2 border-gray-200 p-3 focus:border-indigo-500 outline-none transition-colors font-mono text-sm"
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
        <p className="text-sm text-gray-400 font-medium tracking-tight">FundLens v1.2.3 — Standard Edition</p>
      </div>
    </div>
  );
};

export default Settings;
