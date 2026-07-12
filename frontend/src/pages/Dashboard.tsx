import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Boxes, 
  CheckCircle2, 
  AlertOctagon, 
  CalendarCheck2, 
  ArrowRightLeft, 
  Clock, 
  PlusCircle, 
  CalendarDays, 
  AlertTriangle,
  History,
  Activity,
  Wrench
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardMetrics {
  totalAssets: number;
  availableAssets: number;
  allocatedAssets: number;
  maintenanceTickets: number;
  pendingTransfers: number;
  activeBookings: number;
  overdueCount: number;
}

interface ActivityEvent {
  id: number;
  actor: string;
  action: string;
  detail: string;
  timestamp: string;
}

interface ChartItem {
  name: string;
  value: number;
  color: string;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('assetflow_token');
      const res = await fetch('http://localhost:4000/api/reports/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setChartData(data.chartData.filter((item: any) => item.value > 0)); // Only show non-zero values
        setActivityFeed(data.activityFeed);
      }
    } catch (err) {
      console.error('Error fetching dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  if (loading || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-white">
        <div className="w-10 h-10 border-4 border-accent-green border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-sketch text-muted">Reading dashboard data...</p>
      </div>
    );
  }

  // Quick Action click handlers
  const handleQuickAction = (action: string) => {
    if (action === 'register') navigate('/assets');
    if (action === 'book') navigate('/bookings');
    if (action === 'raise') navigate('/maintenance');
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Welcome Bar */}
      <div className="flex justify-between items-center bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-md">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-sketch">Today's Overview</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Welcome back, <span className="text-white font-semibold">{user?.name}</span>. Here is what's happening in the system today.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-zinc-800/40 border border-white/10 px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300">
          <Clock size={14} className="text-accent-green" />
          <span>System active · Live Sync</span>
        </div>
      </div>

      {/* Flagship Overdue Return Warning Banner */}
      {metrics.overdueCount > 0 && (
        <div 
          onClick={() => navigate('/allocations?status=active')}
          className="p-4 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red flex items-center justify-between cursor-pointer hover:bg-accent-red/15 transition-all shadow-[0_0_15px_rgba(239,68,68,0.05)]"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-red/10 flex items-center justify-center text-accent-red animate-pulse">
              <AlertOctagon size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold">Overdue Return Warning</h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                There are <span className="text-accent-red font-bold">{metrics.overdueCount} assets</span> overdue for expected return. Click to review allocation list.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-zinc-400 hover:text-white transition-all flex items-center gap-1">
            Resolve list &rarr;
          </span>
        </div>
      )}

      {/* Metric Cards Grid (2 rows x 3 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Assets */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total Assets Registered</p>
              <h3 className="text-3xl font-bold text-white mt-2 tracking-tight">{metrics.totalAssets}</h3>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 group-hover:text-white transition-all">
              <Boxes size={20} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        </div>

        {/* Available Assets */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Available Assets</p>
              <h3 className="text-3xl font-bold text-accent-green mt-2 tracking-tight">{metrics.availableAssets}</h3>
            </div>
            <div className="p-3 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent-green/20 to-transparent"></div>
        </div>

        {/* Allocated Assets */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Allocated Assets</p>
              <h3 className="text-3xl font-bold text-accent-blue mt-2 tracking-tight">{metrics.allocatedAssets}</h3>
            </div>
            <div className="p-3 rounded-xl bg-accent-blue/10 border border-accent-blue/20 text-accent-blue">
              <Boxes size={20} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent-blue/20 to-transparent"></div>
        </div>

        {/* Active Bookings */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Bookings Today</p>
              <h3 className="text-3xl font-bold text-white mt-2 tracking-tight">{metrics.activeBookings}</h3>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 group-hover:text-white transition-all">
              <CalendarCheck2 size={20} />
            </div>
          </div>
        </div>

        {/* Pending Transfers */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Pending Transfers</p>
              <h3 className="text-3xl font-bold text-accent-amber mt-2 tracking-tight">{metrics.pendingTransfers}</h3>
            </div>
            <div className="p-3 rounded-xl bg-accent-amber/10 border border-accent-amber/20 text-accent-amber">
              <ArrowRightLeft size={20} />
            </div>
          </div>
        </div>

        {/* Under Maintenance */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Open Maintenance</p>
              <h3 className="text-3xl font-bold text-accent-red mt-2 tracking-tight">{metrics.maintenanceTickets}</h3>
            </div>
            <div className="p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red">
              <Wrench size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Row */}
      <div className="p-5 rounded-2xl bg-zinc-900/20 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-white">System Actions Quick-Access</h4>
          <p className="text-xs text-zinc-500">Jump directly to task modules.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {['Admin', 'AssetManager'].includes(user?.role || '') && (
            <button 
              onClick={() => handleQuickAction('register')}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent-green text-zinc-950 text-xs font-bold rounded-xl cursor-pointer hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] active:scale-95 transition-all"
            >
              <PlusCircle size={14} />
              <span>Register Asset</span>
            </button>
          )}
          <button 
            onClick={() => handleQuickAction('book')}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 text-zinc-200 hover:text-white text-xs font-bold rounded-xl border border-white/10 hover:border-white/20 cursor-pointer active:scale-95 transition-all"
          >
            <CalendarDays size={14} />
            <span>Book Resource</span>
          </button>
          <button 
            onClick={() => handleQuickAction('raise')}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 text-zinc-200 hover:text-white text-xs font-bold rounded-xl border border-white/10 hover:border-white/20 cursor-pointer active:scale-95 transition-all"
          >
            <AlertTriangle size={14} />
            <span>Raise Request</span>
          </button>
        </div>
      </div>

      {/* Charts & Activity Feed Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Donut Chart */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Activity size={18} className="text-accent-green" />
              <span>Asset Status Distribution</span>
            </h4>
            <p className="text-zinc-500 text-xs mt-0.5">Real-time inventory classification breakdown</p>
          </div>

          <div className="h-64 mt-4 w-full flex items-center justify-center">
            {chartData.length === 0 ? (
              <div className="text-zinc-500 text-xs font-sketch">No assets registered in database</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-white/5 pt-4 mt-2">
            {[
              { name: 'Available', color: 'bg-[#10B981]', count: metrics.availableAssets },
              { name: 'Allocated', color: 'bg-[#3B82F6]', count: metrics.allocatedAssets },
              { name: 'Maintenance', color: 'bg-[#F59E0B]', count: metrics.maintenanceTickets },
              { name: 'Total', color: 'bg-zinc-600', count: metrics.totalAssets }
            ].map(item => (
              <div key={item.name} className="text-center p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-center gap-1.5 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                  <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                  <span>{item.name}</span>
                </div>
                <div className="text-base font-bold text-white mt-0.5">{item.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Log */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <History size={18} className="text-accent-green" />
              <span>Recent Activity Feed</span>
            </h4>
            <p className="text-zinc-500 text-xs mt-0.5">Last 10 corporate registry updates</p>
          </div>

          <div className="space-y-3 mt-5 flex-1 overflow-y-auto max-h-72 pr-1">
            {activityFeed.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-500 text-xs font-sketch py-10">
                No activity logs recorded yet.
              </div>
            ) : (
              activityFeed.map((event) => (
                <div 
                  key={event.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all"
                >
                  <div>
                    <p className="text-xs text-zinc-200 font-medium leading-relaxed">
                      {event.detail}
                    </p>
                    <span className="text-[10px] text-zinc-500 font-semibold block mt-1 uppercase tracking-wider">
                      actor: {event.actor}
                    </span>
                  </div>
                  <span className="text-[9px] text-zinc-500 shrink-0 font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                    {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
