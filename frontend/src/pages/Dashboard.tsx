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
  upcomingCount: number;
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
      const res = await fetch('/api/reports/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        // Map backend chart colors to theme oklch chart palette variables
        const themedChartData = data.chartData
          .filter((item: any) => item.value > 0)
          .map((item: any) => {
            let color = 'var(--chart-1)';
            if (item.name === 'Available') color = 'var(--color-success)';
            else if (item.name === 'Allocated') color = 'var(--color-info)';
            else if (item.name === 'Maintenance') color = 'var(--color-warning)';
            return { ...item, color };
          });
        setChartData(themedChartData);
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
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-semibold text-muted-foreground">Reading dashboard data...</p>
      </div>
    );
  }

  const handleQuickAction = (action: string) => {
    if (action === 'register') navigate('/assets');
    if (action === 'book') navigate('/bookings');
    if (action === 'raise') navigate('/maintenance');
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Welcome Bar */}
      <div className="flex justify-between items-center card-surface p-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Today's Overview</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back, <span className="text-foreground font-semibold">{user?.name}</span>. Here is what's happening in the system today.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-muted/40 border border-border px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground">
          <Clock size={14} className="text-primary animate-pulse" />
          <span>System active · Live Sync</span>
        </div>
      </div>

      {/* Flagship Overdue Return Warning Banner */}
      {metrics.overdueCount > 0 && (
        <div 
          onClick={() => navigate('/allocations?status=active')}
          className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between cursor-pointer hover:bg-destructive/15 transition-all shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive animate-pulse">
              <AlertOctagon size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold">Overdue Return Warning</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                There are <span className="text-destructive font-bold">{metrics.overdueCount} assets</span> overdue for expected return. Click to review allocation list.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1">
            Resolve list &rarr;
          </span>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Available Assets */}
        <div className="card-surface p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assets Available</p>
              <h3 className="text-3xl font-extrabold text-success mt-2 tracking-tight">{metrics.availableAssets}</h3>
            </div>
            <div className="p-3 rounded-xl bg-success/10 border border-success/20 text-success">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>

        {/* Allocated Assets */}
        <div className="card-surface p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assets Allocated</p>
              <h3 className="text-3xl font-extrabold text-info mt-2 tracking-tight">{metrics.allocatedAssets}</h3>
            </div>
            <div className="p-3 rounded-xl bg-info/10 border border-info/20 text-info">
              <Boxes size={20} />
            </div>
          </div>
        </div>

        {/* Maintenance Today */}
        <div className="card-surface p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Maintenance Today</p>
              <h3 className="text-3xl font-extrabold text-destructive mt-2 tracking-tight">{metrics.maintenanceTickets}</h3>
            </div>
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
              <Wrench size={20} />
            </div>
          </div>
        </div>

        {/* Active Bookings */}
        <div className="card-surface p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Bookings</p>
              <h3 className="text-3xl font-extrabold text-foreground mt-2 tracking-tight">{metrics.activeBookings}</h3>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border text-muted-foreground group-hover:text-foreground transition-all">
              <CalendarCheck2 size={20} />
            </div>
          </div>
        </div>

        {/* Pending Transfers */}
        <div className="card-surface p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pending Transfers</p>
              <h3 className="text-3xl font-extrabold text-warning mt-2 tracking-tight">{metrics.pendingTransfers}</h3>
            </div>
            <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 text-warning">
              <ArrowRightLeft size={20} />
            </div>
          </div>
        </div>

        {/* Upcoming Returns */}
        <div className="card-surface p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Upcoming Returns</p>
              <h3 className="text-3xl font-extrabold text-foreground mt-2 tracking-tight">{metrics.upcomingCount}</h3>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border text-muted-foreground group-hover:text-foreground transition-all">
              <Clock size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Row */}
      <div className="p-5 rounded-2xl bg-muted/20 border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground">System Actions Quick-Access</h4>
          <p className="text-xs text-muted-foreground">Jump directly to task modules.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {['Admin', 'AssetManager'].includes(user?.role || '') && (
            <button 
              onClick={() => handleQuickAction('register')}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl cursor-pointer hover:bg-primary/90 shadow-sm active:scale-95 transition-all"
            >
              <PlusCircle size={14} />
              <span>Register Asset</span>
            </button>
          )}
          <button 
              onClick={() => handleQuickAction('book')}
              className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-muted text-xs font-bold rounded-xl border border-border cursor-pointer active:scale-95 transition-all"
          >
            <CalendarDays size={14} />
            <span>Book Resource</span>
          </button>
          <button 
              onClick={() => handleQuickAction('raise')}
              className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-muted text-xs font-bold rounded-xl border border-border cursor-pointer active:scale-95 transition-all"
          >
            <AlertTriangle size={14} />
            <span>Raise Request</span>
          </button>
        </div>
      </div>

      {/* Charts & Activity Feed Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Donut Chart */}
        <div className="card-surface p-6 flex flex-col justify-between">
          <div>
            <h4 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
              <Activity size={18} className="text-primary" />
              <span>Asset Status Distribution</span>
            </h4>
            <p className="text-muted-foreground text-xs mt-0.5">Real-time inventory classification breakdown</p>
          </div>

          <div className="h-64 mt-4 w-full flex items-center justify-center">
            {chartData.length === 0 ? (
              <div className="text-muted-foreground text-xs">No assets registered in database</div>
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
                    contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                    labelStyle={{ color: 'var(--color-foreground)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border pt-4 mt-2">
            {[
              { name: 'Available', color: 'bg-success', count: metrics.availableAssets },
              { name: 'Allocated', color: 'bg-info', count: metrics.allocatedAssets },
              { name: 'Maintenance', color: 'bg-warning', count: metrics.maintenanceTickets },
              { name: 'Total', color: 'bg-muted-foreground', count: metrics.totalAssets }
            ].map(item => (
              <div key={item.name} className="text-center p-2 rounded-xl bg-muted/10 border border-border">
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-[9px] uppercase font-bold tracking-wider">
                  <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                  <span>{item.name}</span>
                </div>
                <div className="text-base font-bold text-foreground mt-0.5">{item.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Log */}
        <div className="card-surface p-6 flex flex-col justify-between">
          <div>
            <h4 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
              <History size={18} className="text-primary" />
              <span>Recent Activity Feed</span>
            </h4>
            <p className="text-muted-foreground text-xs mt-0.5">Last 10 corporate registry updates</p>
          </div>

          <div className="space-y-3 mt-5 flex-1 overflow-y-auto max-h-72 pr-1">
            {activityFeed.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-xs py-10">
                No activity logs recorded yet.
              </div>
            ) : (
              activityFeed.map((event) => (
                <div 
                  key={event.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-xl bg-muted/10 border border-border hover:bg-muted/20 transition-all"
                >
                  <div>
                    <p className="text-xs text-foreground font-medium leading-relaxed">
                      {event.detail}
                    </p>
                    <span className="text-[10px] text-muted-foreground font-semibold block mt-1 uppercase tracking-wider">
                      actor: {event.actor}
                    </span>
                  </div>
                  <span className="text-[9px] text-muted-foreground shrink-0 font-bold bg-muted/20 border border-border px-2 py-0.5 rounded">
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
