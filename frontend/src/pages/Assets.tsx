import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Search, 
  Plus, 
  X, 
  MapPin, 
  History, 
  CheckCircle, 
  Boxes, 
  Wrench, 
  Ban
} from 'lucide-react';

interface Category {
  id: number;
  name: string;
}

interface Allocation {
  id: number;
  status: string;
  expectedReturnDate: string;
  employee: { id: number; name: string; email: string };
  department: { id: number; name: string };
}

interface Asset {
  id: number;
  assetCode: string;
  name: string;
  categoryId: number;
  category: Category;
  location: string | null;
  status: 'Available' | 'Allocated' | 'UnderMaintenance' | 'Retired';
  bookable: boolean;
  allocations: Allocation[];
  createdAt: string;
}

interface HistoryItem {
  date: string;
  type: 'Allocation' | 'Transfer' | 'Maintenance';
  title: string;
  description: string;
}

export const Assets: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedBookable, setSelectedBookable] = useState<string>('');

  // Register Asset states
  const [showRegModal, setShowRegModal] = useState(false);
  const [regName, setRegName] = useState('');
  const [regCatId, setRegCatId] = useState<number | ''>('');
  const [regLocation, setRegLocation] = useState('');
  const [regBookable, setRegBookable] = useState(false);
  const [regError, setRegError] = useState('');

  // Asset Details & History state
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assetHistory, setAssetHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchAssets = async () => {
    setLoading(true);
    const token = localStorage.getItem('assetflow_token');
    try {
      let url = `http://localhost:4000/api/assets?`;
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (selectedCat) url += `categoryId=${selectedCat}&`;
      if (selectedStatus) url += `status=${selectedStatus}&`;
      if (selectedBookable) url += `bookable=${selectedBookable}&`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAssets(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch('http://localhost:4000/api/assets/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setCategories(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [search, selectedCat, selectedStatus, selectedBookable]);

  const handleRegisterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!regName || !regCatId) {
      setRegError('Asset Name and Category are required.');
      return;
    }

    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch('http://localhost:4000/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: regName,
          categoryId: Number(regCatId),
          location: regLocation || null,
          bookable: regBookable
        })
      });

      if (res.ok) {
        setShowRegModal(false);
        setRegName('');
        setRegCatId('');
        setRegLocation('');
        setRegBookable(false);
        fetchAssets();
      } else {
        const data = await res.json();
        setRegError(data.error || 'Failed to register asset.');
      }
    } catch (err) {
      setRegError('Connection failed.');
    }
  };

  const handleSelectAsset = async (asset: Asset) => {
    setSelectedAsset(asset);
    setHistoryLoading(true);
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch(`http://localhost:4000/api/assets/${asset.id}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAssetHistory(await res.json());
      }
    } catch (err) {
      console.error('History fetch failed:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Available': return 'border-accent-green bg-accent-green/10 text-accent-green';
      case 'Allocated': return 'border-accent-blue bg-accent-blue/10 text-accent-blue';
      case 'UnderMaintenance': return 'border-accent-amber bg-accent-amber/10 text-accent-amber';
      case 'Retired': return 'border-accent-red bg-accent-red/10 text-accent-red';
      default: return 'border-zinc-700 bg-zinc-800 text-zinc-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Available': return <CheckCircle size={12} />;
      case 'Allocated': return <Boxes size={12} />;
      case 'UnderMaintenance': return <Wrench size={12} />;
      case 'Retired': return <Ban size={12} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Search & Action Bar */}
      <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-md">
        {/* Search */}
        <div className="relative flex-1 max-w-lg">
          <Search size={16} className="absolute left-4 top-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by asset tag, name, location or serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 hover:bg-white/8 focus:bg-white/10 text-white pl-11 pr-4 py-3 rounded-xl border border-white/10 focus:border-accent-green/50 outline-none text-sm transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="bg-zinc-800 text-zinc-300 text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:border-accent-green/50 outline-none cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-zinc-800 text-zinc-300 text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:border-accent-green/50 outline-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Allocated">Allocated</option>
            <option value="UnderMaintenance">Under Maintenance</option>
            <option value="Retired">Retired</option>
          </select>

          <select
            value={selectedBookable}
            onChange={(e) => setSelectedBookable(e.target.value)}
            className="bg-zinc-800 text-zinc-300 text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:border-accent-green/50 outline-none cursor-pointer"
          >
            <option value="">Any Type</option>
            <option value="false">Physical Asset</option>
            <option value="true">Bookable Resource</option>
          </select>

          {['Admin', 'AssetManager'].includes(user?.role || '') && (
            <button
              onClick={() => setShowRegModal(true)}
              className="flex items-center gap-1.5 bg-accent-green text-zinc-950 px-4 py-2.5 rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:bg-emerald-400 transition-all cursor-pointer xl:ml-3"
            >
              <Plus size={14} />
              <span>Register Asset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Asset Directory Table */}
      <div className="glass-panel p-6 rounded-2xl">
        <h3 className="text-lg font-bold text-white tracking-tight uppercase mb-6 font-sketch">Corporate Asset Inventory</h3>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-accent-green border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 font-sketch text-xs text-muted">Scanning inventory logs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-zinc-500 font-semibold text-xs tracking-wider uppercase">
                  <th className="pb-3 pr-4">Asset Code</th>
                  <th className="pb-3 px-4">Asset / Resource Name</th>
                  <th className="pb-3 px-4">Category</th>
                  <th className="pb-3 px-4">Location</th>
                  <th className="pb-3 px-4">Type</th>
                  <th className="pb-3 pl-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center font-sketch text-zinc-500">No assets matching the criteria were found.</td>
                  </tr>
                ) : (
                  assets.map(asset => (
                    <tr 
                      key={asset.id} 
                      onClick={() => handleSelectAsset(asset)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      <td className="py-4 pr-4 font-semibold text-white group-hover:text-accent-green transition-all">{asset.assetCode}</td>
                      <td className="py-4 px-4 font-medium text-zinc-100">{asset.name}</td>
                      <td className="py-4 px-4 font-semibold text-zinc-400">{asset.category.name}</td>
                      <td className="py-4 px-4 flex items-center gap-1.5 text-zinc-400">
                        <MapPin size={12} className="text-zinc-600" />
                        <span>{asset.location || 'HQ Storage'}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${
                          asset.bookable 
                            ? 'border-accent-blue/30 bg-accent-blue/5 text-accent-blue' 
                            : 'border-zinc-700 bg-zinc-800 text-zinc-400'
                        }`}>
                          {asset.bookable ? 'Bookable' : 'Physical'}
                        </span>
                      </td>
                      <td className="py-4 pl-4">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-full flex items-center gap-1 w-fit ${getStatusBadgeClass(asset.status)}`}>
                          {getStatusIcon(asset.status)}
                          <span>{asset.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REGISTRATION MODAL */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl p-6 bg-zinc-950 relative border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-white font-sketch mb-4">Register New Asset</h3>
            {regError && (
              <div className="mb-4 p-3 rounded-lg bg-accent-red/10 border border-accent-red/20 text-accent-red text-xs">
                {regError}
              </div>
            )}
            <form onSubmit={handleRegisterAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1.5">Asset Label/Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Lenovo ThinkPad T14" 
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-white/5 text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/10 outline-none focus:border-accent-green/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1.5">Classification Category</label>
                <select 
                  required
                  value={regCatId}
                  onChange={(e) => setRegCatId(Number(e.target.value))}
                  className="w-full bg-zinc-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/10 outline-none cursor-pointer"
                >
                  <option value="">Select Category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1.5">Initial Location</label>
                <input 
                  type="text" 
                  placeholder="e.g. Floor 2 Server Room" 
                  value={regLocation}
                  onChange={(e) => setRegLocation(e.target.value)}
                  className="w-full bg-white/5 text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/10 outline-none focus:border-accent-green/50"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <h5 className="text-xs font-bold text-white">Bookable Resource?</h5>
                  <p className="text-[10px] text-zinc-500">Enable shared bookings timeline (rooms, projectors)</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={regBookable}
                  onChange={(e) => setRegBookable(e.target.checked)}
                  className="w-4 h-4 text-accent-green bg-zinc-900 border-zinc-700 rounded focus:ring-accent-green focus:ring-offset-zinc-950 focus:ring-2"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => { setShowRegModal(false); setRegError(''); }}
                  className="bg-zinc-800 text-zinc-400 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold hover:text-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-accent-green text-zinc-950 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                >
                  Confirm Registry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSET DETAILS DRAWERS / OVERLAY */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-end">
          <div className="w-full max-w-lg h-screen bg-zinc-950 border-l border-white/10 p-6 overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-200">
            
            {/* Header detail */}
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="font-sketch font-bold text-lg text-accent-green bg-accent-green/10 border border-accent-green/30 px-3 py-1 rounded-xl">
                    {selectedAsset.assetCode}
                  </span>
                  <h4 className="text-lg font-bold text-white tracking-tight">{selectedAsset.name}</h4>
                </div>
                <button 
                  onClick={() => setSelectedAsset(null)}
                  className="p-1 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Grid content and QR */}
              <div className="grid grid-cols-3 gap-6 mb-6">
                {/* Info */}
                <div className="col-span-2 space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Category</label>
                    <span className="text-sm font-semibold text-white">{selectedAsset.category.name}</span>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Location / Storage</label>
                    <span className="text-sm text-zinc-300 flex items-center gap-1.5">
                      <MapPin size={12} className="text-accent-green" />
                      <span>{selectedAsset.location || 'HQ Main Storage Cabinet'}</span>
                    </span>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Usage Type</label>
                    <span className="text-sm text-zinc-300">
                      {selectedAsset.bookable ? 'Corporate Bookable Shared Resource' : 'Dedicated Staff Hardware Allocation'}
                    </span>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Lifecycle Status</label>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-full flex items-center gap-1 w-fit mt-1 ${getStatusBadgeClass(selectedAsset.status)}`}>
                      {getStatusIcon(selectedAsset.status)}
                      <span>{selectedAsset.status}</span>
                    </span>
                  </div>
                </div>

                {/* QR Code generator */}
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-900 border border-white/5 shadow-inner">
                  <QRCodeSVG 
                    value={selectedAsset.assetCode} 
                    size={80} 
                    bgColor={"#18181b"} 
                    fgColor={"#10b981"} 
                    level={"L"} 
                    includeMargin={false} 
                  />
                  <span className="text-[9px] font-mono tracking-widest text-accent-green font-bold mt-2">
                    {selectedAsset.assetCode}
                  </span>
                </div>
              </div>

              {/* Active allocation holder info (if allocated) */}
              {selectedAsset.status === 'Allocated' && selectedAsset.allocations?.filter(a => a.status === 'active').map(alloc => (
                <div key={alloc.id} className="p-4 rounded-xl border border-accent-blue/20 bg-accent-blue/10 text-accent-blue mb-6">
                  <h5 className="text-xs font-bold flex items-center gap-1.5 mb-1.5">
                    <CheckCircle size={14} />
                    <span>Active Staff Allocation</span>
                  </h5>
                  <p className="text-xs text-zinc-300">
                    Currently held by <span className="text-white font-semibold">{alloc.employee.name}</span> ({alloc.department?.name}).
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Expected return date: <span className="text-white font-medium">{new Date(alloc.expectedReturnDate).toLocaleDateString()}</span>
                  </p>
                </div>
              ))}

              {/* Audit history logs */}
              <div className="border-t border-white/10 pt-6">
                <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 mb-4">
                  <History size={14} className="text-accent-green" />
                  <span>Asset Ledger History logs</span>
                </h5>

                {historyLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-5 h-5 border-2 border-accent-green border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                    {assetHistory.length === 0 ? (
                      <p className="text-zinc-600 text-xs italic font-sketch">No ledger history logs recorded yet.</p>
                    ) : (
                      assetHistory.map((item, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent-green mt-1.5 shrink-0"></div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{item.title}</span>
                              <span className="text-[9px] text-zinc-500 bg-white/5 border border-white/10 px-1 py-0.5 rounded">
                                {new Date(item.date).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{item.description}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer buttons */}
            <div className="border-t border-white/10 pt-4 flex gap-3">
              <button 
                onClick={() => setSelectedAsset(null)}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
