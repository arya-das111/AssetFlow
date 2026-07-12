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
      const resAssets = await fetch('/api/assets?bookable=false', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resAssets.ok) setAssets(await resAssets.json());

      // Fetch employees
      const resEmployees = await fetch('/api/organization/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resEmployees.ok) setEmployees(await resEmployees.json());

      // Fetch allocations list
      const resAllocations = await fetch('/api/allocations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resAllocations.ok) setAllocations(await resAllocations.json());

      // Fetch departments
      const resDepts = await fetch('/api/organization/departments', {
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

  useEffect(() => {
    if (selectedAssetId) {
      const asset = assets.find(a => a.id === selectedAssetId);
      setSelectedAsset(asset || null);
    } else {
      setSelectedAsset(null);
    }
  }, [selectedAssetId, assets]);

  const handleEmployeeChange = (empId: number) => {
    setAllocEmpId(empId);
    // Auto-select department
    const emp = employees.find(e => e.id === empId);
    if (emp && emp.departmentId) {
      setAllocDeptId(emp.departmentId);
    } else {
      setAllocDeptId('');
    }
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedAssetId || !allocEmpId || !allocDeptId || !allocReturnDate) {
      setErrorMsg('All fields are required.');
      return;
    }

    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch('/api/allocations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assetId: Number(selectedAssetId),
          employeeId: Number(allocEmpId),
          departmentId: Number(allocDeptId),
          expectedReturnDate: new Date(allocReturnDate).toISOString()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Successfully allocated asset! Handover reference #${data.id}`);
        setSelectedAssetId('');
        setAllocEmpId('');
        setAllocDeptId('');
        setAllocReturnDate('');
        fetchData();
      } else {
        setErrorMsg(data.error || 'Allocation check failed.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error requesting allocation.');
    }
  };

  const handleRequestTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedAssetId || !transToEmpId) {
      setErrorMsg('Recipient employee is required.');
      return;
    }

    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch('/api/allocations/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assetId: Number(selectedAssetId),
          toEmployeeId: Number(transToEmpId),
          reason: transReason || null
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Asset transfer request submitted! Request reference #${data.id}`);
        setSelectedAssetId('');
        setTransToEmpId('');
        setTransReason('');
        fetchData();
      } else {
        setErrorMsg(data.error || 'Failed to submit transfer request.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error submitting transfer request.');
    }
  };

  const handleReturnAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReturnModal) return;

    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch(`/api/allocations/${showReturnModal}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          returnCondition
        })
      });

      if (res.ok) {
        setSuccessMsg('Asset returned and ledger updated successfully.');
        setShowReturnModal(null);
        setReturnCondition('Good');
        setSelectedAssetId('');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Return check failed.');
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
      <div className="card-surface p-6">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Allocation & Transfer Desk</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Perform dedicated asset handovers to corporate staff. Direct handovers are blocked for occupied assets.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-success text-sm flex items-center gap-2.5">
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2.5">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Control Panel */}
        <div className="lg:col-span-2 card-surface p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground tracking-tight uppercase mb-4">Asset Selection Check</h3>

            {/* Asset Picker Dropdown */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Select Asset for Allocation</label>
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-muted/40 text-foreground pl-4 pr-4 py-3 rounded-xl border border-border focus:border-primary/50 outline-none text-sm cursor-pointer appearance-none"
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
              <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive animate-in fade-in slide-in-from-top duration-200">
                <h5 className="text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={18} />
                  <span>Double Allocation Blocked (Conflict)</span>
                </h5>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Already Allocated to <span className="text-foreground font-semibold">{activeAlloc.employee.name}</span> ({activeAlloc.department.name}). Expected return date: {new Date(activeAlloc.expectedReturnDate).toLocaleDateString()}.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ Direct re-allocation is locked. Complete asset return or request employee-to-employee transfer below.
                </p>
              </div>
            )}

            {/* Maintenance Banner Block */}
            {selectedAsset && selectedAsset.status === 'UnderMaintenance' && (
              <div className="mb-6 p-4 rounded-xl bg-warning/10 border border-warning/25 text-warning animate-in fade-in duration-200">
                <h5 className="text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={18} />
                  <span>Under Maintenance Lockout</span>
                </h5>
                <p className="text-xs text-muted-foreground mt-2">
                  This hardware asset is currently undergoing maintenance. Allocation and transfers are suspended until resolved.
                </p>
              </div>
            )}

            {/* Standard Allocation Form (Only shows if asset is Available) */}
            {selectedAsset && selectedAsset.status === 'Available' && (
              <form onSubmit={handleAllocate} className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 rounded-xl bg-success/5 border border-success/10 text-success text-xs font-semibold mb-2">
                  ✓ Asset is Available. Ready to configure staff allocation handover.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Employee picker */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Select Employee</label>
                    <select
                      required
                      value={allocEmpId}
                      onChange={(e) => handleEmployeeChange(Number(e.target.value))}
                      className="w-full bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border outline-none"
                    >
                      <option value="">Choose Employee...</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Department picker (auto-filled on employee change) */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cost Center Department</label>
                    <select
                      required
                      value={allocDeptId}
                      onChange={(e) => setAllocDeptId(Number(e.target.value))}
                      className="w-full bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border outline-none cursor-pointer"
                    >
                      <option value="">Select Department...</option>
                      {departments.filter(d => d.status === 'Active' || d.id === allocDeptId).map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Expected return Date</label>
                  <input
                    type="date"
                    required
                    value={allocReturnDate}
                    onChange={(e) => setAllocReturnDate(e.target.value)}
                    className="w-full bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border outline-none focus:border-primary/50"
                  />
                </div>

                {['Admin', 'AssetManager'].includes(user?.role || '') ? (
                  <button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground font-bold py-3.5 px-4 rounded-xl cursor-pointer hover:bg-primary/90 transition-all text-xs shadow-sm"
                  >
                    Confirm Allocation Handover
                  </button>
                ) : (
                  <div className="text-[10px] text-muted-foreground italic p-3 text-center border border-dashed border-border rounded-xl">
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
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Current Holder (Sender)</label>
                    <input
                      type="text"
                      disabled
                      value={activeAlloc.employee.name}
                      className="w-full bg-muted/40 text-muted-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border/50 cursor-not-allowed font-medium"
                    />
                  </div>

                  {/* To Employee dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recipient (Target Employee)</label>
                    <select
                      required
                      value={transToEmpId}
                      onChange={(e) => setTransToEmpId(Number(e.target.value))}
                      className="w-full bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border outline-none cursor-pointer"
                    >
                      <option value="">Choose recipient...</option>
                      {employees.filter(e => e.id !== activeAlloc.employee.id).map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Transfer rationale / reason</label>
                  <textarea
                    placeholder="e.g. Device transition, department swap..."
                    value={transReason}
                    onChange={(e) => setTransReason(e.target.value)}
                    rows={3}
                    className="w-full bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border outline-none resize-none focus:border-primary/50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-info text-white font-bold py-3.5 px-4 rounded-xl cursor-pointer hover:bg-info/90 shadow transition-all text-xs"
                >
                  Submit Transfer Authorization request
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Sidebar Help Notes Card */}
        <div className="card-surface p-6 text-muted-foreground flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <HelpCircle size={16} className="text-primary" />
              <span>Allocation Guide</span>
            </h4>
            <ul className="space-y-3.5 text-xs">
              <li className="flex gap-2">
                <span className="text-primary font-bold shrink-0">1.</span>
                <span>An asset can have only **one** active allocation in the system database.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold shrink-0">2.</span>
                <span>Select an asset to test real-time double allocation checks.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold shrink-0">3.</span>
                <span>If the asset is occupied, you must route through a **Transfer Request** with Manager approval.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold shrink-0">4.</span>
                <span>Return assets by clicking "Return" in the ledger table below.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Corporate Allocation Ledger Feed */}
      <div className="card-surface p-6">
        <h3 className="text-base font-bold text-foreground tracking-tight uppercase mb-6">Allocation Ledger & Returns</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground font-semibold text-xs tracking-wider uppercase">
                <th className="pb-3 pr-4">Asset Tag</th>
                <th className="pb-3 px-4">Employee Holder</th>
                <th className="pb-3 px-4">Cost Center Dept</th>
                <th className="pb-3 px-4">Handover Date</th>
                <th className="pb-3 px-4">Expected Return</th>
                <th className="pb-3 px-4">Status</th>
                <th className="pb-3 pl-4 text-right">Return action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {allocations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">No allocation records registered in ledger.</td>
                </tr>
              ) : (
                allocations.map(alloc => (
                  <tr key={alloc.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-4 pr-4 font-semibold text-foreground">{alloc.asset.assetCode}</td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-foreground">{alloc.employee.name}</div>
                      <div className="text-[10px] text-muted-foreground font-medium">{alloc.employee.email}</div>
                    </td>
                    <td className="py-4 px-4 font-semibold text-muted-foreground">{alloc.department.name}</td>
                    <td className="py-4 px-4 text-xs">{new Date(alloc.allocatedDate).toLocaleDateString()}</td>
                    <td className="py-4 px-4 text-xs font-medium">
                      {alloc.status === 'active' && new Date(alloc.expectedReturnDate) < new Date() ? (
                        <span className="text-destructive font-bold animate-pulse">
                          {new Date(alloc.expectedReturnDate).toLocaleDateString()} (OVERDUE)
                        </span>
                      ) : (
                        <span>{new Date(alloc.expectedReturnDate).toLocaleDateString()}</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-full ${
                        alloc.status === 'active' ? 'border-info/30 bg-info/10 text-info' : 'border-border bg-muted/40 text-muted-foreground'
                      }`}>
                        {alloc.status}
                      </span>
                    </td>
                    <td className="py-4 pl-4 text-right">
                      {alloc.status === 'active' && ['Admin', 'AssetManager'].includes(user?.role || '') ? (
                        <button
                          onClick={() => setShowReturnModal(alloc.id)}
                          className="text-xs text-success border border-success/20 hover:border-success/45 bg-success/5 hover:bg-success/10 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Undo2 size={12} />
                          <span>Return Asset</span>
                        </button>
                      ) : alloc.status === 'returned' ? (
                        <span className="text-xs text-muted-foreground italic">Returned ({new Date(alloc.actualReturnDate!).toLocaleDateString()})</span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No access</span>
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
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl flex flex-col justify-between max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-2">Process Asset Return Handover</h3>
              <p className="text-xs text-muted-foreground mb-4">Complete return check list logs below.</p>
              <form onSubmit={handleReturnAsset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Return Condition Note</label>
                  <textarea 
                    required
                    placeholder="e.g. Good condition, laptop wiped, chargers included." 
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value)}
                    rows={3}
                    className="w-full bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border outline-none focus:border-primary/50 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button 
                    type="button" 
                    onClick={() => setShowReturnModal(null)}
                    className="bg-secondary text-muted-foreground border border-border px-4 py-2 rounded-xl text-xs font-bold hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/95 shadow cursor-pointer"
                  >
                    Confirm Asset Return
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
