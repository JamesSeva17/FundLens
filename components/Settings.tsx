
import React from 'react';
import { AppData } from '../types';

interface SettingsProps {
  data: AppData;
  updateData: (partial: Partial<AppData>) => void;
}

const Settings: React.FC<SettingsProps> = ({ data, updateData }) => {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
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
          <p className="text-xs text-gray-400">
            Note: These keys are stored in your browser's local storage. We recommend using a private bin.
          </p>
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
        <p className="text-sm text-gray-400 font-medium tracking-tight">FundLens v1.1.0 — Crafted for Philippine Wealth Builders</p>
      </div>
    </div>
  );
};

export default Settings;
