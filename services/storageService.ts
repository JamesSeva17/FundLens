
import { AppData } from "../types";

const LOCAL_STORAGE_KEY = 'fundlens_app_data';

export async function saveToCloud(data: AppData): Promise<boolean> {
  if (!data.cloudSyncEnabled || !data.jsonBinKey || !data.jsonBinId) return false;

  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${data.jsonBinId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': data.jsonBinKey
      },
      body: JSON.stringify(data)
    });
    return response.ok;
  } catch (error) {
    console.error("Cloud sync failed:", error);
    return false;
  }
}

export async function loadFromCloud(key: string, binId: string): Promise<AppData | null> {
  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      method: 'GET',
      headers: {
        'X-Master-Key': key
      }
    });
    if (response.ok) {
      const result = await response.json();
      return result.record;
    }
    return null;
  } catch (error) {
    console.error("Cloud load failed:", error);
    return null;
  }
}

export function saveToLocal(data: AppData) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  if (data.cloudSyncEnabled) {
    saveToCloud(data);
  }
}

export function loadLocal(): AppData {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (stored) {
    const data = JSON.parse(stored);
    return {
      ...data,
      platformIcons: data.platformIcons || {}
    };
  }
  return {
    assets: [],
    snapshots: [],
    platformIcons: {},
    cloudSyncEnabled: false
  };
}
