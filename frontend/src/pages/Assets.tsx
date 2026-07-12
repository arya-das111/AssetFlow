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
      let url = `/api/assets?`;
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
      const res = await fetch('/api/assets/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setCategories(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAssetHistory = async (assetId: number) => {
    setHistoryLoading(true);
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch(`/api/assets/${assetId}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAssetHistory(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchCategories();
  }, [search, selectedCat, selectedStatus, selectedBookable]);

  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    fetchAssetHistory(asset.id);
  };

  const handleRegisterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regName || !regCatId) {
      setRegError('Name and Category are required.');
      return;
    }

    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch('/api/assets', {
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
        setRegName('');
        setRegCatId('');
        setRegLocation('');
        setRegBookable(false);
        setShowRegModal(false);
        fetchAssets();
      } else {
        const data = await res.json();
        setRegError(data.error || 'Failed to register asset.');
      }
    } catch (err) {
      console.error(err);
      setRegError('Network error registering asset.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Available': return <CheckCircle size={10} />;
      case 'Allocated': return <Boxes size={10} />;
      case 'UnderMaintenance': return <Wrench size={10} />;
      case 'Retired': return <Ban size={10} />;
      default: return null;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'Available':
        return 'border-success/30 bg-success/5 text-success';
      case 'Allocated':
        return 'border-info/30 bg-info/5 text-info';
      case 'UnderMaintenance':
        return 'border-warning/30 bg-warning/5 text-warning';
      case 'Retired':
        return 'border-destructive/30 bg-destructive/5 text-destructive';
      default:
        return 'border-border text-muted-foreground bg-muted/20';
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Controls */}
      <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 card-surface p-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Assets & Resources Directory</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Register and query corporate physical inventories and bookable resources.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <Search size={14} className="absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-muted/40 text-foreground text-xs pl-9 pr-4 py-2.5 rounded-xl border border-border focus:border-primary/50 outline-none w-full sm:w-60"
            />
          </div>

          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border focus:border-primary/50 outline-none cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border focus:border-primary/50 outline-none cursor-pointer"
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
            className="bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border focus:border-primary/50 outline-none cursor-pointer"
          >
            <option value="">Any Type</option>
            <option value="false">Physical Asset</option>
            <option value="true">Bookable Resource</option>
          </select>

          {['Admin', 'AssetManager'].includes(user?.role || '') && (
            <button
              onClick={() => setShowRegModal(true)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-xs font-bold shadow hover:bg-primary/90 transition-all cursor-pointer xl:ml-3"
            >
              <Plus size={14} />
              <span>Register Asset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Asset Directory Table */}
      <div className="card-surface p-6">
        <h3 className="text-lg font-bold text-foreground tracking-tight uppercase mb-6">Corporate Asset Inventory</h3>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-xs text-muted-foreground">Scanning inventory logs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold text-xs tracking-wider uppercase">
                  <th className="pb-3 pr-4">Asset Code</th>
                  <th className="pb-3 px-4">Asset / Resource Name</th>
                  <th className="pb-3 px-4">Category</th>
                  <th className="pb-3 px-4">Location</th>
                  <th className="pb-3 px-4">Type</th>
                  <th className="pb-3 pl-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">No assets matching the criteria were found.</td>
                  </tr>
                ) : (
                  assets.map(asset => (
                    <tr 
                      key={asset.id} 
                      onClick={() => handleSelectAsset(asset)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group animate-in fade-in"
                    >
                      <td className="py-4 pr-4 font-semibold text-foreground group-hover:text-primary transition-all">{asset.assetCode}</td>
                      <td className="py-4 px-4 font-medium text-foreground">{asset.name}</td>
                      <td className="py-4 px-4 font-semibold text-muted-foreground">{asset.category.name}</td>
                      <td className="py-4 px-4 flex items-center gap-1.5 text-muted-foreground">
                        <MapPin size={12} className="text-muted-foreground/60" />
                        <span>{asset.location || 'HQ Storage'}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${
                          asset.bookable 
                            ? 'border-info/30 bg-info/5 text-info' 
                            : 'border-border bg-muted/20 text-muted-foreground'
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

      {/* Register Asset Modal */}
      {showRegModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border w-full max-w-md p-6 rounded-2xl shadow-xl flex flex-col justify-between max-h-[90vh] overflow-y-auto">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-foreground uppercase">Register Corporate Asset</h3>
                <button 
                  onClick={() => setShowRegModal(false)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {regError && (
                <div className="p-3.5 mb-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs">
                  {regError}
                </div>
              )}

              <form onSubmit={handleRegisterAsset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Asset Name</label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. MacBook Pro M3 or Conference Room B1"
                    className="w-full bg-muted/40 text-foreground text-xs px-4 py-3 rounded-xl border border-border outline-none focus:border-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Category</label>
                  <select
                    required
                    value={regCatId}
                    onChange={(e) => setRegCatId(Number(e.target.value))}
                    className="w-full bg-muted/40 text-foreground text-xs px-4 py-3 rounded-xl border border-border outline-none focus:border-primary/50 cursor-pointer"
                  >
                    <option value="">Select Category...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Default Storage / Room Location</label>
                  <input
                    type="text"
                    value={regLocation}
                    onChange={(e) => setRegLocation(e.target.value)}
                    placeholder="e.g. 4th Floor, Block B"
                    className="w-full bg-muted/40 text-foreground text-xs px-4 py-3 rounded-xl border border-border outline-none focus:border-primary/50"
                  />
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/20 border border-border rounded-xl">
                  <input
                    type="checkbox"
                    id="regBookable"
                    checked={regBookable}
                    onChange={(e) => setRegBookable(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-border bg-muted cursor-pointer"
                  />
                  <label htmlFor="regBookable" className="text-xs font-bold text-foreground cursor-pointer select-none">
                    Configure as Shared Bookable Resource
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground font-bold py-3.5 px-4 rounded-xl cursor-pointer hover:bg-primary/90 transition-all text-xs"
                >
                  Write to Corporate Ledger
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Asset Details Drawer */}
      {selectedAsset && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border z-40 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
          <div className="flex flex-col h-full justify-between p-6">
            <div className="overflow-y-auto flex-1 pr-1">
              {/* Drawer Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <span className="text-[9px] font-mono tracking-widest text-muted-foreground font-bold bg-muted/40 border border-border px-2 py-0.5 rounded">
                    {selectedAsset.assetCode}
                  </span>
                  <h4 className="text-base font-bold text-foreground mt-2 uppercase">{selectedAsset.name}</h4>
                </div>
                <button 
                  onClick={() => setSelectedAsset(null)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Asset Meta Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-muted/20 border border-border p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Status</span>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-full mt-1.5 flex items-center gap-1 w-fit ${getStatusBadgeClass(selectedAsset.status)}`}>
                      {getStatusIcon(selectedAsset.status)}
                      <span>{selectedAsset.status}</span>
                    </span>
                  </div>
                </div>

                {/* QR Code generator */}
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-muted/10 border border-border shadow-inner">
                  <QRCodeSVG 
                    value={selectedAsset.assetCode} 
                    size={80} 
                    bgColor={"transparent"} 
                    fgColor={"var(--color-primary)"} 
                    level={"L"} 
                    includeMargin={false} 
                  />
                  <span className="text-[9px] font-mono tracking-widest text-primary font-bold mt-2">
                    {selectedAsset.assetCode}
                  </span>
                </div>
              </div>

              {/* Active allocation holder info (if allocated) */}
              {selectedAsset.status === 'Allocated' && selectedAsset.allocations?.filter(a => a.status === 'active').map(alloc => (
                <div key={alloc.id} className="p-4 rounded-xl border border-info/20 bg-info/10 text-info mb-6">
                  <h5 className="text-xs font-bold flex items-center gap-1.5 mb-1.5">
                    <CheckCircle size={14} />
                    <span>Active Staff Allocation</span>
                  </h5>
                  <p className="text-xs text-foreground/95">
                    Currently held by <span className="text-foreground font-semibold">{alloc.employee.name}</span> ({alloc.department?.name}).
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Expected return date: <span className="text-foreground font-medium">{new Date(alloc.expectedReturnDate).toLocaleDateString()}</span>
                  </p>
                </div>
              ))}

              {/* Audit history logs */}
              <div className="border-t border-border pt-6">
                <h5 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 mb-4">
                  <History size={14} className="text-primary" />
                  <span>Asset Ledger History logs</span>
                </h5>

                {historyLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                    {assetHistory.length === 0 ? (
                      <p className="text-muted-foreground text-xs italic">No ledger history logs recorded yet.</p>
                    ) : (
                      assetHistory.map((item, idx) => (
                        <div key={idx} className="flex gap-3 animate-in fade-in">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">{item.title}</span>
                              <span className="text-[9px] text-muted-foreground bg-muted/20 border border-border px-1 py-0.5 rounded">
                                {new Date(item.date).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{item.description}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer buttons */}
            <div className="border-t border-border pt-4 flex gap-3">
              <button 
                onClick={() => setSelectedAsset(null)}
                className="flex-1 bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground border border-border py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
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
