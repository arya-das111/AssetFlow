import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  Clock, 
  Download, 
  Sparkles,
  Building,
  CheckCircle
} from 'lucide-react';

interface DeptAsset {
  department: string;
  code: string;
  count: number;
}

interface MostUsed {
  id: number;
  tag: string;
  name: string;
  count: number;
}

interface MaintenanceCount {
  category: string;
  count: number;
}

interface IdleAsset {
  tag: string;
  name: string;
  location: string;
  daysIdle: number;
}

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [deptWiseAssets, setDeptWiseAssets] = useState<DeptAsset[]>([]);
  const [mostUsedAssets, setMostUsedAssets] = useState<MostUsed[]>([]);
  const [maintCounts, setMaintCounts] = useState<MaintenanceCount[]>([]);
  const [idleAssets, setIdleAssets] = useState<IdleAsset[]>([]);
  
  const [mockExportMsg, setMockExportMsg] = useState('');

  const fetchReportData = async () => {
    setLoading(true);
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch('http://localhost:4000/api/reports/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDeptWiseAssets(data.deptWiseAssets);
        setMostUsedAssets(data.mostUsedAssets);
        setMaintCounts(data.maintenanceCounts);
        setIdleAssets(data.idleAssets);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [user]);

  const handleExport = () => {
    setMockExportMsg('DEMO ONLY: Report downloaded successfully as AssetFlow_Report_Q3.pdf (mocked)');
    setTimeout(() => setMockExportMsg(''), 5000);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-md gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-sketch">Corporate Reports Desk</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Browse corporate allocation metrics, equipment utilization rates, and idle device tracking logs.
          </p>
        </div>

        <button 
          onClick={handleExport}
          className="flex items-center gap-1.5 bg-accent-green text-zinc-950 px-4 py-2.5 rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:bg-emerald-400 transition-all cursor-pointer"
        >
          <Download size={14} />
          <span>Export Analytics</span>
        </button>
      </div>

      {mockExportMsg && (
        <div className="p-4 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-sm flex items-center gap-2.5">
          <CheckCircle size={18} />
          <span>{mockExportMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-accent-green border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 font-sketch text-xs text-muted">Analyzing corporate ledgers...</p>
        </div>
      ) : (
        <>
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Utilization by Department */}
            <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight uppercase flex items-center gap-2 mb-1">
                  <Building size={16} className="text-accent-green" />
                  <span>Asset Handover Count by Department</span>
                </h4>
                <p className="text-zinc-500 text-xs">Total dedicated physical assets allocated per department cost center</p>
              </div>

              <div className="h-64 mt-6 w-full flex items-center justify-center">
                {deptWiseAssets.length === 0 ? (
                  <div className="text-zinc-500 text-xs italic font-sketch">No active handovers to display</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptWiseAssets}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="code" stroke="#71717a" fontSize={11} fontWeight="bold" />
                      <YAxis stroke="#71717a" fontSize={11} fontWeight="bold" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Maintenance Frequency */}
            <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight uppercase flex items-center gap-2 mb-1">
                  <TrendingUp size={16} className="text-accent-green" />
                  <span>Maintenance count by category</span>
                </h4>
                <p className="text-zinc-500 text-xs">Accumulated historical repair diagnostics tickets per classification tag</p>
              </div>

              <div className="space-y-4 mt-6 flex-1 flex flex-col justify-center">
                {maintCounts.length === 0 ? (
                  <div className="text-zinc-500 text-xs italic font-sketch text-center">No maintenance logs registered</div>
                ) : (
                  maintCounts.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-zinc-300">
                        <span>{item.category}</span>
                        <span className="text-white">{item.count} tickets</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden border border-white/5">
                        <div 
                          className="bg-accent-amber h-full rounded-full"
                          style={{ width: `${Math.min(100, (item.count / 5) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ranked lists grids */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Used Assets */}
            <div className="glass-panel p-6 rounded-2xl">
              <h4 className="text-sm font-bold text-white tracking-tight uppercase flex items-center gap-2 mb-4 font-sketch">
                <Sparkles size={16} className="text-accent-green" />
                <span>Most Utilized Assets (Top 5)</span>
              </h4>
              
              <div className="divide-y divide-white/5">
                {mostUsedAssets.length === 0 ? (
                  <p className="text-zinc-500 text-xs italic font-sketch py-6 text-center">No asset log statistics available.</p>
                ) : (
                  mostUsedAssets.map((asset, idx) => (
                    <div key={idx} className="py-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-accent-green font-mono">{asset.tag}</span>
                        <h5 className="text-xs font-semibold text-white mt-0.5">{asset.name}</h5>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                        {asset.count} usages
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Idle Assets */}
            <div className="glass-panel p-6 rounded-2xl">
              <h4 className="text-sm font-bold text-white tracking-tight uppercase flex items-center gap-2 mb-4 font-sketch">
                <Clock size={16} className="text-accent-green" />
                <span>Idle Hardware Assets (Warehouse check)</span>
              </h4>

              <div className="divide-y divide-white/5">
                {idleAssets.length === 0 ? (
                  <p className="text-zinc-500 text-xs italic font-sketch py-6 text-center">No idle assets in database.</p>
                ) : (
                  idleAssets.map((asset, idx) => (
                    <div key={idx} className="py-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-zinc-500 font-mono">{asset.tag}</span>
                        <h5 className="text-xs font-semibold text-white mt-0.5">{asset.name}</h5>
                        <span className="text-[9px] text-zinc-500 uppercase tracking-wide block mt-0.5">location: {asset.location}</span>
                      </div>
                      <span className="text-[10px] font-bold text-accent-amber bg-accent-amber/10 border border-accent-amber/25 px-2.5 py-1 rounded-lg">
                        Idle {asset.daysIdle} days
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
