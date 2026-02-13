
import React, { useState, useEffect } from 'react';
import { AssetType } from '../types';

interface AssetIconProps {
  symbol: string;
  type: AssetType;
  customUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}

const AssetIcon: React.FC<AssetIconProps> = ({ symbol, type, customUrl, size = 'md' }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [src, setSrc] = useState<string | undefined>(customUrl);

  const dims = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';
  const fontSize = size === 'sm' ? 'text-[8px]' : size === 'lg' ? 'text-xs' : 'text-[10px]';

  // Generate a consistent color based on the ticker name
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

  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
    setSrc(customUrl);
    
    // If no customUrl is provided yet, try a quick local crypto fallback
    if (!customUrl && type === 'Crypto') {
      setSrc(`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${symbol.toLowerCase()}.png`);
    }
  }, [symbol, type, customUrl]);

  return (
    <div className={`${dims} shrink-0 relative rounded-full flex items-center justify-center overflow-hidden shadow-sm border border-gray-100 ${getBgColor(symbol)}`}>
      {/* Abbreviation Placeholder (Always present in background) */}
      <span className={`font-black text-white uppercase tracking-tighter ${fontSize}`}>
        {symbol.substring(0, 3)}
      </span>

      {/* Actual Icon Overlay */}
      {src && !imgError && (
        <img 
          src={src} 
          alt={symbol} 
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          className={`absolute inset-0 w-full h-full object-contain p-1.5 transition-opacity duration-500 bg-white ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
};

export default AssetIcon;
