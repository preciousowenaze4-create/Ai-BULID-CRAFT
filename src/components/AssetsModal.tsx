import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Copy,
  Check,
  Trash2,
  FileCode,
  FolderOpen,
  Sparkles,
} from 'lucide-react';

interface AssetFile {
  id: string;
  name: string;
  type: string;
  size: string;
  url: string;
  timestamp: number;
}

interface AssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertAsset?: (assetTag: string) => void;
}

const DEFAULT_ASSETS: AssetFile[] = [
  {
    id: 'asset-logo',
    name: 'brand-logo.png',
    type: 'image/png',
    size: '187 KB',
    url: '/brand-logo.png',
    timestamp: Date.now() - 3600000,
  },
  {
    id: 'asset-banner',
    name: 'hero-banner.png',
    type: 'image/png',
    size: '48.5 KB',
    url: '/assets/banner.png',
    timestamp: Date.now() - 7200000,
  },
  {
    id: 'asset-mockup',
    name: 'mobile-frame.png',
    type: 'image/png',
    size: '32.1 KB',
    url: '/assets/mockup.png',
    timestamp: Date.now() - 14400000,
  },
];

export const AssetsModal: React.FC<AssetsModalProps> = ({
  isOpen,
  onClose,
  onInsertAsset,
}) => {
  const [assets, setAssets] = useState<AssetFile[]>(() => {
    try {
      const saved = localStorage.getItem('ai_buildcraft_assets');
      return saved ? JSON.parse(saved) : DEFAULT_ASSETS;
    } catch {
      return DEFAULT_ASSETS;
    }
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAssets: AssetFile[] = [];

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        const newAsset: AssetFile = {
          id: 'asset-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: `${(file.size / 1024).toFixed(1)} KB`,
          url,
          timestamp: Date.now(),
        };
        setAssets((prev) => {
          const updated = [newAsset, ...prev];
          try {
            localStorage.setItem('ai_buildcraft_assets', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      };
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    setAssets((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      try {
        localStorage.setItem('ai_buildcraft_assets', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 text-base">Project Assets</h3>
              <p className="text-xs text-neutral-500">
                Media, icons, and assets for your application
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Action Area */}
        <div className="p-6 border-b border-neutral-100 bg-neutral-50/50">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept="image/*,.svg,.json,.css"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 border-2 border-dashed border-neutral-300 hover:border-neutral-900 rounded-2xl flex flex-col items-center justify-center gap-2 bg-white hover:bg-neutral-50 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white text-neutral-600 flex items-center justify-center transition-colors">
              <Upload className="w-5 h-5" />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-neutral-800">
                Tap to upload images, icons, or SVGs
              </p>
              <p className="text-[11px] text-neutral-400">
                PNG, JPG, SVG, WebP up to 10MB
              </p>
            </div>
          </button>
        </div>

        {/* Asset List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
            Uploaded Assets ({assets.length})
          </h4>

          {assets.length === 0 ? (
            <div className="text-center py-10 text-neutral-400 text-xs">
              <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No assets uploaded yet
            </div>
          ) : (
            assets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between p-3 rounded-2xl border border-neutral-200 hover:border-neutral-300 bg-white transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200/60 overflow-hidden flex items-center justify-center shrink-0">
                    {asset.type.startsWith('image/') && asset.url ? (
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as any).style.display = 'none';
                        }}
                      />
                    ) : (
                      <FileCode className="w-5 h-5 text-neutral-500" />
                    )}
                  </div>
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-neutral-900 truncate">
                      {asset.name}
                    </p>
                    <p className="text-[11px] text-neutral-400 font-mono">
                      {asset.size} • {asset.type.split('/')[1] || 'file'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {onInsertAsset && (
                    <button
                      onClick={() => {
                        onInsertAsset(`Use asset "${asset.name}" in the app`);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-medium transition-colors"
                      title="Insert into chat"
                    >
                      Use
                    </button>
                  )}
                  <button
                    onClick={() => handleCopy(asset.id, asset.url)}
                    className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
                    title="Copy Asset URL"
                  >
                    {copiedId === asset.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(asset.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-neutral-300 hover:text-rose-600 transition-colors"
                    title="Delete Asset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
          <span className="text-[11px] text-neutral-400">
            Assets persist in your workspace
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
