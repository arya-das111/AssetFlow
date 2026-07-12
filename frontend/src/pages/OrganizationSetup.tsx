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

  // Edit forms states
  const [showEditDeptModal, setShowEditDeptModal] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<number | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptCode, setEditDeptCode] = useState('');
  const [editDeptParentId, setEditDeptParentId] = useState<number | ''>('');
  const [editDeptHeadUserId, setEditDeptHeadUserId] = useState<number | ''>('');
  const [editDeptStatus, setEditDeptStatus] = useState<'Active' | 'Inactive'>('Active');

  const [showEditCatModal, setShowEditCatModal] = useState(false);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');

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
        const res = await fetch('/api/organization/departments', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setDepartments(await res.json());
      } else if (activeTab === 'categories') {
        const res = await fetch('/api/assets/categories', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setCategories(await res.json());
      } else if (activeTab === 'employees') {
        const res = await fetch('/api/organization/employees', {
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
      const res = await fetch('/api/organization/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: deptName,
          code: deptCode.toUpperCase(),
          parentDepartmentId: deptParentId ? Number(deptParentId) : null
        })
      });

      if (res.ok) {
        setDeptName('');
        setDeptCode('');
        setDeptParentId('');
        setShowDeptModal(false);
        fetchData();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to create department.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Server error. Please try again.');
    }
  };

  const handleCreateCat = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch('/api/assets/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: catName,
          description: catDesc || null
        })
      });

      if (res.ok) {
        setCatName('');
        setCatDesc('');
        setShowCatModal(false);
        fetchData();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to create category.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Server error. Please try again.');
    }
  };

  const handleOpenEditDept = (dept: Department) => {
    setEditingDeptId(dept.id);
    setEditDeptName(dept.name);
    setEditDeptCode(dept.code);
    setEditDeptParentId(dept.parentDepartmentId || '');
    setEditDeptHeadUserId(dept.headUserId || '');
    setEditDeptStatus(dept.status as 'Active' | 'Inactive');
    setShowEditDeptModal(true);
  };

  const handleUpdateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch(`/api/organization/departments/${editingDeptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editDeptName,
          code: editDeptCode.toUpperCase(),
          parentDepartmentId: editDeptParentId ? Number(editDeptParentId) : null,
          headUserId: editDeptHeadUserId ? Number(editDeptHeadUserId) : null,
          status: editDeptStatus
        })
      });

      if (res.ok) {
        setShowEditDeptModal(false);
        setEditingDeptId(null);
        fetchData();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to update department.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Server error. Please try again.');
    }
  };

  const handleOpenEditCat = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatDesc(cat.description || '');
    setShowEditCatModal(true);
  };

  const handleUpdateCat = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch(`/api/assets/categories/${editingCatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editCatName,
          description: editCatDesc || null
        })
      });

      if (res.ok) {
        setShowEditCatModal(false);
        setEditingCatId(null);
        fetchData();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to update category.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Server error. Please try again.');
    }
  };

  const handlePromoteRole = async (empId: number) => {
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch(`/api/organization/employees/${empId}/role`, {
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
        alert(data.error || 'Failed to update employee role.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center card-surface p-6 gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Organization Setup</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Configure system directory details, category classification lists, and employee profiles.
          </p>
        </div>
        
        {/* Tab Selector buttons */}
        <div className="flex border border-border rounded-xl p-1 bg-muted/40 max-w-sm">
          <button 
            onClick={() => setActiveTab('departments')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'departments' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Building2 size={13} />
            <span>Departments</span>
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'categories' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Settings2 size={13} />
            <span>Categories</span>
          </button>
          <button 
            onClick={() => setActiveTab('employees')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'employees' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Users size={13} />
            <span>Employees</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="card-surface p-6 min-h-[400px]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-foreground tracking-tight uppercase">
            {activeTab === 'departments' && 'Corporate Department Registry'}
            {activeTab === 'categories' && 'Asset Classification Tags'}
            {activeTab === 'employees' && 'Enterprise Personnel Directory'}
          </h3>
          
          {/* Action buttons */}
          {activeTab === 'departments' && (
            <button 
              onClick={() => setShowDeptModal(true)}
              className="flex items-center gap-1 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold shadow hover:bg-primary/90 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Department</span>
            </button>
          )}

          {activeTab === 'categories' && (
            <button 
              onClick={() => setShowCatModal(true)}
              className="flex items-center gap-1 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold shadow hover:bg-primary/90 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Category</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-xs text-muted-foreground">Drawing grid records...</p>
          </div>
        ) : (
          <>
            {/* Departments Tab */}
            {activeTab === 'departments' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-semibold text-xs tracking-wider uppercase">
                      <th className="pb-3 pr-4">Code</th>
                      <th className="pb-3 px-4">Department Name</th>
                      <th className="pb-3 px-4">Director / Head</th>
                      <th className="pb-3 px-4">Parent Scope</th>
                      <th className="pb-3 px-4">Staff Count</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {departments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-muted-foreground">No departments configured in registry.</td>
                      </tr>
                    ) : (
                      departments.map(dept => (
                        <tr key={dept.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-4 pr-4 font-semibold text-foreground">{dept.code}</td>
                          <td className="py-4 px-4 font-medium text-foreground">{dept.name}</td>
                          <td className="py-4 px-4">
                            {dept.head ? (
                              <span className="text-info font-semibold">{dept.head.name}</span>
                            ) : (
                              <span className="text-muted-foreground italic text-xs">Unassigned</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {dept.parent ? (
                              <span className="text-xs bg-muted border border-border px-2 py-0.5 rounded text-muted-foreground">
                                {dept.parent.name} ({dept.parent.code})
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60 text-xs">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4 font-semibold text-muted-foreground">{dept.employeeCount} employees</td>
                          <td className="py-4 px-4">
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-full ${
                              dept.status === 'Inactive' 
                                ? 'border-destructive/30 bg-destructive/5 text-destructive' 
                                : 'border-success/30 bg-success/5 text-success'
                            }`}>
                              {dept.status || 'Active'}
                            </span>
                          </td>
                          <td className="py-4 pl-4 text-right">
                             <button
                               onClick={() => handleOpenEditDept(dept)}
                               className="text-xs text-primary font-bold hover:underline cursor-pointer"
                             >
                               Edit
                             </button>
                           </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <p className="mt-6 text-xs text-muted-foreground leading-relaxed max-w-lg border-t border-border pt-4">
                  💡 <b>Integration Tip:</b> Edits saved in this department registry feed dropdown selection lists across both the Register Asset views and Allocation requests tables.
                </p>
              </div>
            )}

            {/* Categories Tab */}
            {activeTab === 'categories' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {categories.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-muted-foreground">No classifications tags defined.</div>
                ) : (
                  categories.map(cat => (
                    <div key={cat.id} className="p-5 rounded-2xl bg-muted/10 border border-border hover:border-primary/20 transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div className="w-8 h-8 rounded bg-muted/50 border border-border flex items-center justify-center text-primary text-sm font-bold">
                            #
                          </div>
                          <button
                            onClick={() => handleOpenEditCat(cat)}
                            className="text-xs text-primary font-bold hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                        <h4 className="text-sm font-bold text-foreground">{cat.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cat.description || 'No description summary available.'}</p>
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
                    <tr className="border-b border-border text-muted-foreground font-semibold text-xs tracking-wider uppercase">
                      <th className="pb-3 pr-4">Employee</th>
                      <th className="pb-3 px-4">Department</th>
                      <th className="pb-3 px-4">Account Role</th>
                      <th className="pb-3 px-4">Allocated Tags</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-muted-foreground">No employees logged in registry.</td>
                      </tr>
                    ) : (
                      employees.map(emp => (
                        <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-4 pr-4">
                            <div className="font-semibold text-foreground">{emp.name}</div>
                            <div className="text-xs text-muted-foreground font-medium">{emp.email}</div>
                          </td>
                          <td className="py-4 px-4 font-semibold text-muted-foreground">
                            {emp.department ? `${emp.department.name} (${emp.department.code})` : 'Unassigned'}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 border rounded-full ${
                              emp.role === 'Admin' ? 'border-destructive/30 bg-destructive/10 text-destructive' :
                              emp.role === 'AssetManager' ? 'border-warning/30 bg-warning/10 text-warning' :
                              emp.role === 'DepartmentHead' ? 'border-info/30 bg-info/10 text-info' :
                              'border-border bg-muted/40 text-muted-foreground'
                            }`}>
                              {emp.role}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {emp.allocations.length === 0 ? (
                              <span className="text-muted-foreground/60 text-xs italic">No active assets</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {emp.allocations.map(a => (
                                  <span key={a.id} className="text-[10px] font-bold bg-muted border border-border px-2 py-0.5 rounded text-muted-foreground">
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
                                  className="bg-muted border border-border text-foreground rounded text-xs px-2 py-1 outline-none cursor-pointer"
                                >
                                  <option value="Employee">Employee</option>
                                  <option value="DepartmentHead">Dept Head</option>
                                  <option value="AssetManager">Asset Manager</option>
                                  <option value="Admin">Admin</option>
                                </select>
                                <button 
                                  onClick={() => handlePromoteRole(emp.id)}
                                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-2.5 py-1 rounded text-xs cursor-pointer"
                                >
                                  Save
                                </button>
                                <button 
                                  onClick={() => setPromotingEmployeeId(null)}
                                  className="bg-secondary text-muted-foreground px-2.5 py-1 rounded text-xs border border-border hover:text-foreground cursor-pointer"
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
                                  className="text-xs text-primary border border-primary/20 hover:border-primary/45 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ml-auto"
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
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl flex flex-col justify-between max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-4">Register New Department</h3>
              {errorMsg && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  {errorMsg}
                </div>
              )}
              <form onSubmit={handleCreateDept} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Department Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Field Operations" 
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    className="w-full bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Unique Code</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. OPS" 
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value)}
                    className="w-full bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border outline-none focus:border-primary/50 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Parent Department (Optional)</label>
                  <select 
                    value={deptParentId}
                    onChange={(e) => setDeptParentId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border outline-none cursor-pointer"
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
                    className="bg-secondary text-muted-foreground border border-border px-4 py-2 rounded-xl text-xs font-bold hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/95 shadow cursor-pointer"
                  >
                    Confirm Registry
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CATEGORY MODAL */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl flex flex-col justify-between max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-4">Add Classification Category</h3>
              {errorMsg && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  {errorMsg}
                </div>
              )}
              <form onSubmit={handleCreateCat} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Category Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Graphic Tablets" 
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    className="w-full bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Brief Description</label>
                  <textarea 
                    placeholder="e.g. Digital drawing input monitors for creative teams" 
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    rows={3}
                    className="w-full bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border outline-none focus:border-primary/50 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button 
                    type="button" 
                    onClick={() => { setShowCatModal(false); setErrorMsg(''); }}
                    className="bg-secondary text-muted-foreground border border-border px-4 py-2 rounded-xl text-xs font-bold hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/95 shadow cursor-pointer"
                  >
                    Save Tag Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT DEPARTMENT MODAL */}
      {showEditDeptModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl flex flex-col justify-between max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-4">Edit Department Details</h3>
              {errorMsg && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  {errorMsg}
                </div>
              )}
              <form onSubmit={handleUpdateDept} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Department Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Field Operations" 
                    value={editDeptName}
                    onChange={(e) => setEditDeptName(e.target.value)}
                    className="w-full bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Unique Code</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. OPS" 
                    value={editDeptCode}
                    onChange={(e) => setEditDeptCode(e.target.value)}
                    className="w-full bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border outline-none focus:border-primary/50 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Parent Department (Optional)</label>
                  <select 
                    value={editDeptParentId}
                    onChange={(e) => setEditDeptParentId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border outline-none cursor-pointer"
                  >
                    <option value="">No Parent - Root Department</option>
                    {departments.filter(d => d.id !== editingDeptId).map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Department Head (Optional)</label>
                  <select 
                    value={editDeptHeadUserId}
                    onChange={(e) => setEditDeptHeadUserId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border outline-none cursor-pointer"
                  >
                    <option value="">No Head Assigned</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Status</label>
                  <select 
                    value={editDeptStatus}
                    onChange={(e) => setEditDeptStatus(e.target.value as 'Active' | 'Inactive')}
                    className="w-full bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border outline-none cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button 
                    type="button" 
                    onClick={() => { setShowEditDeptModal(false); setErrorMsg(''); }}
                    className="bg-secondary text-muted-foreground border border-border px-4 py-2 rounded-xl text-xs font-bold hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/95 shadow cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CATEGORY MODAL */}
      {showEditCatModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl flex flex-col justify-between max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-4">Edit Tag Category</h3>
              {errorMsg && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  {errorMsg}
                </div>
              )}
              <form onSubmit={handleUpdateCat} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Category Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Graphic Tablets" 
                    value={editCatName}
                    onChange={(e) => setEditCatName(e.target.value)}
                    className="w-full bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Brief Description</label>
                  <textarea 
                    placeholder="e.g. Digital drawing input monitors for creative teams" 
                    value={editCatDesc}
                    onChange={(e) => setEditCatDesc(e.target.value)}
                    rows={3}
                    className="w-full bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border outline-none focus:border-primary/50 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button 
                    type="button" 
                    onClick={() => { setShowEditCatModal(false); setErrorMsg(''); }}
                    className="bg-secondary text-muted-foreground border border-border px-4 py-2 rounded-xl text-xs font-bold hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/95 shadow cursor-pointer"
                  >
                    Save Changes
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
