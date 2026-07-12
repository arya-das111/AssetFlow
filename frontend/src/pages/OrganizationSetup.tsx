import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  Settings2, 
  Users, 
  Plus, 
  ArrowUpCircle
} from 'lucide-react';

interface Department {
  id: number;
  name: string;
  code: string;
  headUserId: number | null;
  head?: { id: number; name: string } | null;
  parentDepartmentId: number | null;
  parent?: { id: number; name: string; code: string } | null;
  status: string;
  employeeCount: number;
}

interface Category {
  id: number;
  name: string;
  description: string | null;
}

interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  department?: { id: number; name: string; code: string } | null;
  allocations: Array<{ id: number; asset: { assetCode: string; name: string } }>;
}

export const OrganizationSetup: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'departments' | 'categories' | 'employees'>('departments');
  const [loading, setLoading] = useState(true);
  
  // Data lists
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Dialog forms toggles
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);

  // Form states
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptParentId, setDeptParentId] = useState<number | ''>('');
  
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Promote States
  const [promotingEmployeeId, setPromotingEmployeeId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('Employee');

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem('assetflow_token');
    try {
      if (activeTab === 'departments') {
        const res = await fetch('http://localhost:4000/api/organization/departments', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setDepartments(await res.json());
      } else if (activeTab === 'categories') {
        const res = await fetch('http://localhost:4000/api/assets/categories', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setCategories(await res.json());
      } else if (activeTab === 'employees') {
        const res = await fetch('http://localhost:4000/api/organization/employees', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setEmployees(await res.json());
      }
    } catch (err) {
      console.error('Error fetching organization setup lists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch('http://localhost:4000/api/organization/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: deptName,
          code: deptCode,
          parentDepartmentId: deptParentId ? Number(deptParentId) : null
        })
      });

      if (res.ok) {
        setShowDeptModal(false);
        setDeptName('');
        setDeptCode('');
        setDeptParentId('');
        fetchData();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to create department.');
      }
    } catch (err) {
      setErrorMsg('Server connection failed.');
    }
  };

  const handleCreateCat = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch('http://localhost:4000/api/assets/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: catName,
          description: catDesc
        })
      });

      if (res.ok) {
        setShowCatModal(false);
        setCatName('');
        setCatDesc('');
        fetchData();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to create category.');
      }
    } catch (err) {
      setErrorMsg('Server connection failed.');
    }
  };

  const handlePromoteRole = async (employeeId: number) => {
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch(`http://localhost:4000/api/organization/employees/${employeeId}/promote`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: selectedRole })
      });
      if (res.ok) {
        setPromotingEmployeeId(null);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to promote user.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-md gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-sketch">Organization Setup</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Configure system directory details, category classification lists, and employee profiles.
          </p>
        </div>
        
        {/* Tab Selector buttons */}
        <div className="flex border border-white/10 rounded-xl p-1 bg-zinc-900/60 max-w-sm">
          <button 
            onClick={() => setActiveTab('departments')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'departments' ? 'bg-accent-green text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'}`}
          >
            <Building2 size={13} />
            <span>Departments</span>
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'categories' ? 'bg-accent-green text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'}`}
          >
            <Settings2 size={13} />
            <span>Categories</span>
          </button>
          <button 
            onClick={() => setActiveTab('employees')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'employees' ? 'bg-accent-green text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'}`}
          >
            <Users size={13} />
            <span>Employees</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="glass-panel p-6 rounded-2xl min-h-[400px]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white tracking-tight uppercase font-sketch">
            {activeTab === 'departments' && 'Corporate Department Registry'}
            {activeTab === 'categories' && 'Asset Classification Tags'}
            {activeTab === 'employees' && 'Enterprise Personnel Directory'}
          </h3>
          
          {/* Action buttons */}
          {activeTab === 'departments' && (
            <button 
              onClick={() => setShowDeptModal(true)}
              className="flex items-center gap-1 bg-accent-green text-zinc-950 px-4 py-2 rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:bg-emerald-400 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Department</span>
            </button>
          )}

          {activeTab === 'categories' && (
            <button 
              onClick={() => setShowCatModal(true)}
              className="flex items-center gap-1 bg-accent-green text-zinc-950 px-4 py-2 rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:bg-emerald-400 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Category</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-accent-green border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 font-sketch text-xs text-muted">Drawing grid records...</p>
          </div>
        ) : (
          <>
            {/* Departments Tab */}
            {activeTab === 'departments' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-500 font-semibold text-xs tracking-wider uppercase">
                      <th className="pb-3 pr-4">Code</th>
                      <th className="pb-3 px-4">Department Name</th>
                      <th className="pb-3 px-4">Director / Head</th>
                      <th className="pb-3 px-4">Parent Scope</th>
                      <th className="pb-3 px-4">Staff Count</th>
                      <th className="pb-3 pl-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {departments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center font-sketch text-zinc-500">No departments configured in registry.</td>
                      </tr>
                    ) : (
                      departments.map(dept => (
                        <tr key={dept.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 pr-4 font-semibold text-white">{dept.code}</td>
                          <td className="py-4 px-4 font-medium text-zinc-100">{dept.name}</td>
                          <td className="py-4 px-4">
                            {dept.head ? (
                              <span className="text-accent-blue font-semibold">{dept.head.name}</span>
                            ) : (
                              <span className="text-zinc-500 italic text-xs">Unassigned</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {dept.parent ? (
                              <span className="text-xs bg-white/5 px-2 py-0.5 border border-white/10 rounded text-zinc-400">
                                {dept.parent.name} ({dept.parent.code})
                              </span>
                            ) : (
                              <span className="text-zinc-600 text-xs">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4 font-semibold text-zinc-400">{dept.employeeCount} employees</td>
                          <td className="py-4 pl-4">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-full border-accent-green/30 bg-accent-green/10 text-accent-green">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <p className="mt-6 text-xs text-zinc-500 leading-relaxed max-w-lg border-t border-white/5 pt-4">
                  💡 <b>Integration Tip:</b> Edits saved in this department registry feed dropdown selection lists across both the Register Asset views and Allocation requests tables.
                </p>
              </div>
            )}

            {/* Categories Tab */}
            {activeTab === 'categories' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {categories.length === 0 ? (
                  <div className="col-span-full text-center py-10 font-sketch text-zinc-500">No classifications tags defined.</div>
                ) : (
                  categories.map(cat => (
                    <div key={cat.id} className="p-5 rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between">
                      <div>
                        <div className="w-8 h-8 rounded bg-zinc-800 border border-white/10 flex items-center justify-center text-accent-green font-sketch text-lg font-bold mb-3">
                          #
                        </div>
                        <h4 className="text-sm font-bold text-white">{cat.name}</h4>
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{cat.description || 'No description summary available.'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Employees Directory Tab */}
            {activeTab === 'employees' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-500 font-semibold text-xs tracking-wider uppercase">
                      <th className="pb-3 pr-4">Employee</th>
                      <th className="pb-3 px-4">Department</th>
                      <th className="pb-3 px-4">Account Role</th>
                      <th className="pb-3 px-4">Allocated Tags</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center font-sketch text-zinc-500">No employees logged in registry.</td>
                      </tr>
                    ) : (
                      employees.map(emp => (
                        <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 pr-4">
                            <div className="font-semibold text-white">{emp.name}</div>
                            <div className="text-xs text-zinc-500 font-medium">{emp.email}</div>
                          </td>
                          <td className="py-4 px-4 font-semibold text-zinc-400">
                            {emp.department ? `${emp.department.name} (${emp.department.code})` : 'Unassigned'}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 border rounded-full ${
                              emp.role === 'Admin' ? 'border-accent-red/30 bg-accent-red/10 text-accent-red' :
                              emp.role === 'AssetManager' ? 'border-accent-amber/30 bg-accent-amber/10 text-accent-amber' :
                              emp.role === 'DepartmentHead' ? 'border-accent-blue/30 bg-accent-blue/10 text-accent-blue' :
                              'border-zinc-700 bg-zinc-800/40 text-zinc-400'
                            }`}>
                              {emp.role}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {emp.allocations.length === 0 ? (
                              <span className="text-zinc-600 text-xs italic">No active assets</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {emp.allocations.map(a => (
                                  <span key={a.id} className="text-[10px] font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded text-zinc-300">
                                    {a.asset.assetCode}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-4 pl-4 text-right">
                            {promotingEmployeeId === emp.id ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <select 
                                  value={selectedRole}
                                  onChange={(e) => setSelectedRole(e.target.value)}
                                  className="bg-zinc-800 border border-white/10 text-white rounded text-xs px-2 py-1 outline-none"
                                >
                                  <option value="Employee">Employee</option>
                                  <option value="DepartmentHead">Dept Head</option>
                                  <option value="AssetManager">Asset Manager</option>
                                  <option value="Admin">Admin</option>
                                </select>
                                <button 
                                  onClick={() => handlePromoteRole(emp.id)}
                                  className="bg-accent-green hover:bg-emerald-400 text-zinc-950 font-bold px-2.5 py-1 rounded text-xs cursor-pointer"
                                >
                                  Save
                                </button>
                                <button 
                                  onClick={() => setPromotingEmployeeId(null)}
                                  className="bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded text-xs border border-white/10 hover:text-white"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              emp.id !== user?.id && (
                                <button 
                                  onClick={() => {
                                    setPromotingEmployeeId(emp.id);
                                    setSelectedRole(emp.role);
                                  }}
                                  className="text-xs text-accent-green border border-accent-green/20 hover:border-accent-green/45 bg-accent-green/5 hover:bg-accent-green/10 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ml-auto"
                                >
                                  <ArrowUpCircle size={12} />
                                  <span>Promote Role</span>
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* CREATE DEPARTMENT MODAL */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl p-6 bg-zinc-950 relative border-white/10 shadow-2xl">
            <h3 className="text-lg font-bold text-white font-sketch mb-4">Register New Department</h3>
            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-accent-red/10 border border-accent-red/20 text-accent-red text-xs">
                {errorMsg}
              </div>
            )}
            <form onSubmit={handleCreateDept} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1.5">Department Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Field Operations" 
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full bg-white/5 text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/10 outline-none focus:border-accent-green/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1.5">Unique Code</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. OPS" 
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  className="w-full bg-white/5 text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/10 outline-none focus:border-accent-green/50 uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1.5">Parent Department (Optional)</label>
                <select 
                  value={deptParentId}
                  onChange={(e) => setDeptParentId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-zinc-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/10 outline-none cursor-pointer"
                >
                  <option value="">No Parent - Root Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => { setShowDeptModal(false); setErrorMsg(''); }}
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

      {/* CREATE CATEGORY MODAL */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl p-6 bg-zinc-950 relative border-white/10 shadow-2xl">
            <h3 className="text-lg font-bold text-white font-sketch mb-4">Add Classification Category</h3>
            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-accent-red/10 border border-accent-red/20 text-accent-red text-xs">
                {errorMsg}
              </div>
            )}
            <form onSubmit={handleCreateCat} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1.5">Category Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Graphic Tablets" 
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full bg-white/5 text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/10 outline-none focus:border-accent-green/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1.5">Brief Description</label>
                <textarea 
                  placeholder="e.g. Digital drawing input monitors for creative teams" 
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/10 outline-none focus:border-accent-green/50 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => { setShowCatModal(false); setErrorMsg(''); }}
                  className="bg-zinc-800 text-zinc-400 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold hover:text-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-accent-green text-zinc-950 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                >
                  Save Tag Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
