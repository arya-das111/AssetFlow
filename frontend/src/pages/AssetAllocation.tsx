import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  AlertCircle, 
  HelpCircle, 
  CheckCircle, 
  Undo2
} from 'lucide-react';

interface Employee {
  id: number;
  name: string;
  departmentId: number | null;
  department?: { id: number; name: string } | null;
}

interface Asset {
  id: number;
  assetCode: string;
  name: string;
  status: string;
  location: string | null;
  allocations?: Array<{
    id: number;
    status: string;
    expectedReturnDate: string;
    employee: { id: number; name: string };
    department: { id: number; name: string };
  }>;
}

interface Allocation {
  id: number;
  assetId: number;
  asset: { id: number; name: string; assetCode: string };
  employee: { id: number; name: string; email: string };
  department: { id: number; name: string };
  allocatedDate: string;
  expectedReturnDate: string;
  actualReturnDate: string | null;
  returnCondition: string | null;
  status: 'active' | 'returned';
}

export const AssetAllocation: React.FC = () => {
  const { user } = useAuth();
  
  // Lists
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Selection states
  const [selectedAssetId, setSelectedAssetId] = useState<number | ''>('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Standard allocation form
  const [allocEmpId, setAllocEmpId] = useState<number | ''>('');
  const [allocDeptId, setAllocDeptId] = useState<number | ''>('');
  const [allocReturnDate, setAllocReturnDate] = useState('');
  
  // Transfer request form
  const [transToEmpId, setTransToEmpId] = useState<number | ''>('');
  const [transReason, setTransReason] = useState('');

  // Status/Error states
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showReturnModal, setShowReturnModal] = useState<number | null>(null); // holds allocationId
  const [returnCondition, setReturnCondition] = useState('Good');

  const fetchData = async () => {
    const token = localStorage.getItem('assetflow_token');
    try {
      // Fetch physical (non-bookable) assets
      const resAssets = await fetch('http://localhost:4000/api/assets?bookable=false', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resAssets.ok) setAssets(await resAssets.json());

      // Fetch employees
      const resEmployees = await fetch('http://localhost:4000/api/organization/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resEmployees.ok) setEmployees(await resEmployees.json());

      // Fetch allocations list
      const resAllocations = await fetch('http://localhost:4000/api/allocations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resAllocations.ok) setAllocations(await resAllocations.json());

      // Fetch departments
      const resDepts = await fetch('http://localhost:4000/api/organization/departments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resDepts.ok) setDepartments(await resDepts.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Asset change handler
  useEffect(() => {
    if (selectedAssetId) {
      const asset = assets.find(a => a.id === Number(selectedAssetId));
      setSelectedAsset(asset || null);
      setErrorMsg('');
      setSuccessMsg('');
    } else {
      setSelectedAsset(null);
    }
  }, [selectedAssetId, assets]);

  // Handle employee selection to pre-fill department
  const handleEmployeeChange = (empId: number) => {
    setAllocEmpId(empId);
    const emp = employees.find(e => e.id === empId);
    if (emp && emp.departmentId) {
      setAllocDeptId(emp.departmentId);
    }
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedAssetId || !allocEmpId || !allocDeptId || !allocReturnDate) {
      setErrorMsg('Please complete all form fields.');
      return;
    }

    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch('http://localhost:4000/api/allocations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assetId: Number(selectedAssetId),
          employeeId: Number(allocEmpId),
          departmentId: Number(allocDeptId),
          allocatedDate: new Date().toISOString().split('T')[0],
          expectedReturnDate: allocReturnDate
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Asset successfully allocated to staff member.`);
        setSelectedAssetId('');
        setAllocEmpId('');
        setAllocDeptId('');
        setAllocReturnDate('');
        fetchData();
      } else {
        setErrorMsg(data.error || 'Failed to complete allocation.');
      }
    } catch (err) {
      setErrorMsg('Server connection failed.');
    }
  };

  const handleRequestTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedAsset || !transToEmpId) {
      setErrorMsg('Please select target employee for transfer.');
      return;
    }

    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch('http://localhost:4000/api/allocations/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assetId: selectedAsset.id,
          toEmployeeId: Number(transToEmpId),
          reason: transReason
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Transfer request submitted successfully. Awaiting Manager authorization.`);
        setSelectedAssetId('');
        setTransToEmpId('');
        setTransReason('');
        fetchData();
      } else {
        setErrorMsg(data.error || 'Failed to request transfer.');
      }
    } catch (err) {
      setErrorMsg('Server connection failed.');
    }
  };

  const handleReturnAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReturnModal) return;

    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch(`http://localhost:4000/api/allocations/${showReturnModal}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ condition: returnCondition })
      });

      if (res.ok) {
        setShowReturnModal(null);
        setReturnCondition('Good');
        setSuccessMsg('Asset return processed. Status returned to Available.');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Return failed.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Find active allocation details for selected asset
  const getActiveAllocDetails = () => {
    if (!selectedAsset || selectedAsset.status !== 'Allocated' || !selectedAsset.allocations) return null;
    return selectedAsset.allocations.find(a => a.status === 'active');
  };

  const activeAlloc = getActiveAllocDetails();

  return (
    <div className="space-y-6 pb-10">
      {/* Welcome header */}
      <div className="bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-md">
        <h2 className="text-2xl font-bold tracking-tight text-white font-sketch">Allocation & Transfer Desk</h2>
        <p className="text-zinc-500 text-sm mt-1">
          Perform dedicated asset handovers to corporate staff. Direct handovers are blocked for occupied assets.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-sm flex items-center gap-2.5">
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm flex items-center gap-2.5">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Control Panel */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight uppercase mb-4 font-sketch">Asset Selection Check</h3>

            {/* Asset Picker Dropdown */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Select Asset for Allocation</label>
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-zinc-900 text-white pl-4 pr-4 py-3 rounded-xl border border-white/10 focus:border-accent-green/50 outline-none text-sm cursor-pointer appearance-none"
              >
                <option value="">Choose Asset tag from catalog...</option>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.assetCode} - {a.name} ({a.status})
                  </option>
                ))}
              </select>
            </div>

            {/* ⭐ FLAGSHIP CONFLICT DETECTION BANNER */}
            {selectedAsset && selectedAsset.status === 'Allocated' && activeAlloc && (
              <div className="mb-6 p-4 rounded-xl bg-accent-red/10 border border-accent-red/25 text-accent-red animate-in fade-in slide-in-from-top duration-200">
                <h5 className="text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={18} />
                  <span>Double Allocation Blocked (Conflict)</span>
                </h5>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Already Allocated to <span className="text-white font-semibold">{activeAlloc.employee.name}</span> ({activeAlloc.department.name}). Expected return date: {new Date(activeAlloc.expectedReturnDate).toLocaleDateString()}.
                </p>
                <p className="text-xs text-zinc-400 mt-2">
                  ⚠️ Direct re-allocation is locked. Complete asset return or request employee-to-employee transfer below.
                </p>
              </div>
            )}

            {/* Maintenance Banner Block */}
            {selectedAsset && selectedAsset.status === 'UnderMaintenance' && (
              <div className="mb-6 p-4 rounded-xl bg-accent-amber/10 border border-accent-amber/25 text-accent-amber animate-in fade-in duration-200">
                <h5 className="text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={18} />
                  <span>Under Maintenance Lockout</span>
                </h5>
                <p className="text-xs text-zinc-400 mt-2">
                  This hardware asset is currently undergoing maintenance. Allocation and transfers are suspended until resolved.
                </p>
              </div>
            )}

            {/* Standard Allocation Form (Only shows if asset is Available) */}
            {selectedAsset && selectedAsset.status === 'Available' && (
              <form onSubmit={handleAllocate} className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 rounded-xl bg-accent-green/5 border border-accent-green/10 text-accent-green text-xs font-semibold mb-2">
                  ✓ Asset is Available. Ready to configure staff allocation handover.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Employee picker */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Select Employee</label>
                    <select
                      required
                      value={allocEmpId}
                      onChange={(e) => handleEmployeeChange(Number(e.target.value))}
                      className="w-full bg-zinc-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/10 outline-none"
                    >
                      <option value="">Choose Employee...</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Department picker (auto-filled on employee change) */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Cost Center Department</label>
                    <select
                      required
                      value={allocDeptId}
                      onChange={(e) => setAllocDeptId(Number(e.target.value))}
                      className="w-full bg-zinc-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/10 outline-none cursor-pointer"
                    >
                      <option value="">Select Department...</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Expected return Date</label>
                  <input
                    type="date"
                    required
                    value={allocReturnDate}
                    onChange={(e) => setAllocReturnDate(e.target.value)}
                    className="w-full bg-white/5 text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/10 outline-none focus:border-accent-green/50"
                  />
                </div>

                {['Admin', 'AssetManager'].includes(user?.role || '') ? (
                  <button
                    type="submit"
                    className="w-full bg-accent-green text-zinc-950 font-bold py-3.5 px-4 rounded-xl cursor-pointer hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all text-xs"
                  >
                    Confirm Allocation Handover
                  </button>
                ) : (
                  <div className="text-[10px] text-zinc-500 italic p-3 text-center border border-dashed border-white/10 rounded-xl">
                    Note: Your Employee account does not have access to allocate assets.
                  </div>
                )}
              </form>
            )}

            {/* Transfer Request Form (Only shows if asset is Allocated) */}
            {selectedAsset && selectedAsset.status === 'Allocated' && activeAlloc && (
              <form onSubmit={handleRequestTransfer} className="space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* From locked field */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Current Holder (Sender)</label>
                    <input
                      type="text"
                      disabled
                      value={activeAlloc.employee.name}
                      className="w-full bg-white/5 text-zinc-500 text-xs px-3.5 py-2.5 rounded-xl border border-white/5 cursor-not-allowed font-medium"
                    />
                  </div>

                  {/* To Employee dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Recipient (Target Employee)</label>
                    <select
                      required
                      value={transToEmpId}
                      onChange={(e) => setTransToEmpId(Number(e.target.value))}
                      className="w-full bg-zinc-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/10 outline-none cursor-pointer"
                    >
                      <option value="">Choose recipient...</option>
                      {employees.filter(e => e.id !== activeAlloc.employee.id).map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Transfer rationale / reason</label>
                  <textarea
                    placeholder="e.g. Device transition, department swap..."
                    value={transReason}
                    onChange={(e) => setTransReason(e.target.value)}
                    rows={3}
                    className="w-full bg-white/5 text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/10 outline-none resize-none focus:border-accent-green/50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-accent-blue text-white font-bold py-3.5 px-4 rounded-xl cursor-pointer hover:bg-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all text-xs"
                >
                  Submit Transfer Authorization request
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Sidebar Help Notes Card */}
        <div className="glass-panel p-6 rounded-2xl bg-zinc-950/40 border-white/5 text-zinc-400 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <HelpCircle size={16} className="text-accent-green" />
              <span>Allocation Guide</span>
            </h4>
            <ul className="space-y-3.5 text-xs">
              <li className="flex gap-2">
                <span className="text-accent-green font-bold shrink-0">1.</span>
                <span>An asset can have only **one** active allocation in the system database.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-accent-green font-bold shrink-0">2.</span>
                <span>Select an asset to test real-time double allocation checks.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-accent-green font-bold shrink-0">3.</span>
                <span>If the asset is occupied, you must route through a **Transfer Request** with Manager approval.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-accent-green font-bold shrink-0">4.</span>
                <span>Return assets by clicking "Return" in the ledger table below.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Corporate Allocation Ledger Feed */}
      <div className="glass-panel p-6 rounded-2xl">
        <h3 className="text-base font-bold text-white tracking-tight uppercase mb-6 font-sketch">Allocation Ledger & Returns</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-zinc-500 font-semibold text-xs tracking-wider uppercase">
                <th className="pb-3 pr-4">Asset Tag</th>
                <th className="pb-3 px-4">Employee Holder</th>
                <th className="pb-3 px-4">Cost Center Dept</th>
                <th className="pb-3 px-4">Handover Date</th>
                <th className="pb-3 px-4">Expected Return</th>
                <th className="pb-3 px-4">Status</th>
                <th className="pb-3 pl-4 text-right">Return action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {allocations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center font-sketch text-zinc-500">No allocation records registered in ledger.</td>
                </tr>
              ) : (
                allocations.map(alloc => (
                  <tr key={alloc.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 pr-4 font-semibold text-white">{alloc.asset.assetCode}</td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-zinc-200">{alloc.employee.name}</div>
                      <div className="text-[10px] text-zinc-500 font-medium">{alloc.employee.email}</div>
                    </td>
                    <td className="py-4 px-4 font-semibold text-zinc-400">{alloc.department.name}</td>
                    <td className="py-4 px-4 text-xs">{new Date(alloc.allocatedDate).toLocaleDateString()}</td>
                    <td className="py-4 px-4 text-xs font-medium">
                      {alloc.status === 'active' && new Date(alloc.expectedReturnDate) < new Date() ? (
                        <span className="text-accent-red font-bold animate-pulse">
                          {new Date(alloc.expectedReturnDate).toLocaleDateString()} (OVERDUE)
                        </span>
                      ) : (
                        <span>{new Date(alloc.expectedReturnDate).toLocaleDateString()}</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-full ${
                        alloc.status === 'active' ? 'border-accent-blue/30 bg-accent-blue/10 text-accent-blue' : 'border-zinc-700 bg-zinc-800 text-zinc-400'
                      }`}>
                        {alloc.status}
                      </span>
                    </td>
                    <td className="py-4 pl-4 text-right">
                      {alloc.status === 'active' && ['Admin', 'AssetManager'].includes(user?.role || '') ? (
                        <button
                          onClick={() => setShowReturnModal(alloc.id)}
                          className="text-xs text-accent-green border border-accent-green/20 hover:border-accent-green/45 bg-accent-green/5 hover:bg-accent-green/10 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Undo2 size={12} />
                          <span>Return Asset</span>
                        </button>
                      ) : alloc.status === 'returned' ? (
                        <span className="text-xs text-zinc-500 italic">Returned ({new Date(alloc.actualReturnDate!).toLocaleDateString()})</span>
                      ) : (
                        <span className="text-xs text-zinc-500 italic">No access</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RETURN ASSET DIALOG MODAL */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl p-6 bg-zinc-950 relative border-white/10 shadow-2xl">
            <h3 className="text-lg font-bold text-white font-sketch mb-2">Process Asset Return Handover</h3>
            <p className="text-xs text-zinc-500 mb-4">Complete return check list logs below.</p>
            <form onSubmit={handleReturnAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1.5">Return Condition Note</label>
                <textarea 
                  required
                  placeholder="e.g. Good condition, laptop wiped, chargers included." 
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/10 outline-none focus:border-accent-green/50 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowReturnModal(null)}
                  className="bg-zinc-800 text-zinc-400 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold hover:text-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-accent-green text-zinc-950 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                >
                  Confirm Asset Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
