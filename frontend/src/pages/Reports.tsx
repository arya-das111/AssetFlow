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
    // Generate CSV content
    let csvContent = "AssetFlow Enterprise Analytics Report\n";
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;

    csvContent += "--- DEPARTMENT WISE ASSETS ALLOCATION ---\n";
    csvContent += "Department Code,Asset Handover Count\n";
    deptWiseAssets.forEach(item => {
      csvContent += `"${item.code}",${item.count}\n`;
    });
    csvContent += "\n";

    csvContent += "--- MAINTENANCE BY CATEGORY ---\n";
    csvContent += "Category,Ticket Count\n";
    maintCounts.forEach(item => {
      csvContent += `"${item.category}",${item.count}\n`;
    });
    csvContent += "\n";

    csvContent += "--- MOST UTILIZED ASSETS (TOP 5) ---\n";
    csvContent += "Asset Code,Asset Name,Handover Frequency\n";
    mostUsedAssets.forEach(item => {
      csvContent += `"${item.tag}","${item.name.replace(/"/g, '""')}",${item.count}\n`;
    });
    csvContent += "\n";

    csvContent += "--- IDLE HARDWARE IN STORAGE ---\n";
    csvContent += "Asset Code,Asset Name,Storage Location,Days Idle\n";
    idleAssets.forEach(item => {
      csvContent += `"${item.tag}","${item.name.replace(/"/g, '""')}","${(item.location || 'HQ Storage').replace(/"/g, '""')}",${item.daysIdle}\n`;
    });

    // Create a blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `AssetFlow_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setMockExportMsg(`Report downloaded successfully as AssetFlow_Report_${new Date().toISOString().split('T')[0]}.csv`);
    setTimeout(() => setMockExportMsg(''), 5000);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center card-surface p-6 gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Corporate Reports Desk</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Browse corporate allocation metrics, equipment utilization rates, and idle device tracking logs.
          </p>
        </div>

        <button 
          onClick={handleExport}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-xs font-bold shadow hover:bg-primary/90 transition-all cursor-pointer w-fit"
        >
          <Download size={14} />
          <span>Export Analytics</span>
        </button>
      </div>

      {mockExportMsg && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-success text-sm flex items-center gap-2.5">
          <CheckCircle size={18} />
          <span>{mockExportMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-xs text-muted-foreground">Analyzing corporate ledgers...</p>
        </div>
      ) : (
        <>
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Utilization by Department */}
            <div className="card-surface p-6 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground tracking-tight uppercase flex items-center gap-2 mb-1">
                  <Building size={16} className="text-primary" />
                  <span>Asset Handover Count by Department</span>
                </h4>
                <p className="text-muted-foreground text-xs">Total dedicated physical assets allocated per department cost center</p>
              </div>

              <div className="h-64 mt-6 w-full flex items-center justify-center">
                {deptWiseAssets.length === 0 ? (
                  <div className="text-muted-foreground text-xs italic">No active handovers to display</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptWiseAssets}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="code" stroke="var(--color-muted-foreground)" fontSize={11} fontWeight="bold" />
                      <YAxis stroke="var(--color-muted-foreground)" fontSize={11} fontWeight="bold" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                        labelStyle={{ color: 'var(--color-foreground)' }}
                      />
                      <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Maintenance Frequency */}
            <div className="card-surface p-6 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground tracking-tight uppercase flex items-center gap-2 mb-1">
                  <TrendingUp size={16} className="text-primary" />
                  <span>Maintenance count by category</span>
                </h4>
                <p className="text-muted-foreground text-xs">Accumulated historical repair diagnostics tickets per classification tag</p>
              </div>

              <div className="space-y-4 mt-6 flex-1 flex flex-col justify-center">
                {maintCounts.length === 0 ? (
                  <div className="text-muted-foreground text-xs italic text-center">No maintenance logs registered</div>
                ) : (
                  maintCounts.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-foreground">
                        <span>{item.category}</span>
                        <span className="text-muted-foreground">{item.count} tickets</span>
                      </div>
                      <div className="w-full bg-muted/45 rounded-full h-2 overflow-hidden border border-border">
                        <div 
                          className="bg-warning h-full rounded-full"
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
            <div className="card-surface p-6">
              <h4 className="text-sm font-bold text-foreground tracking-tight uppercase flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-primary" />
                <span>Most Utilized Assets (Top 5)</span>
              </h4>
              
              <div className="divide-y divide-border">
                {mostUsedAssets.length === 0 ? (
                  <p className="text-muted-foreground text-xs italic py-6 text-center">No asset log statistics available.</p>
                ) : (
                  mostUsedAssets.map((asset, idx) => (
                    <div key={idx} className="py-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-primary font-mono">{asset.tag}</span>
                        <h5 className="text-xs font-semibold text-foreground mt-0.5">{asset.name}</h5>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground bg-muted/20 border border-border px-2.5 py-1 rounded-lg">
                        {asset.count} usages
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Idle Assets */}
            <div className="card-surface p-6">
              <h4 className="text-sm font-bold text-foreground tracking-tight uppercase flex items-center gap-2 mb-4">
                <Clock size={16} className="text-primary" />
                <span>Idle Hardware Assets (Warehouse check)</span>
              </h4>

              <div className="divide-y divide-border">
                {idleAssets.length === 0 ? (
                  <p className="text-muted-foreground text-xs italic py-6 text-center">No idle assets in database.</p>
                ) : (
                  idleAssets.map((asset, idx) => (
                    <div key={idx} className="py-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-muted-foreground font-mono">{asset.tag}</span>
                        <h5 className="text-xs font-semibold text-foreground mt-0.5">{asset.name}</h5>
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wide block mt-0.5">location: {asset.location}</span>
                      </div>
                      <span className="text-[10px] font-bold text-warning bg-warning/10 border border-warning/25 px-2.5 py-1 rounded-lg">
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
