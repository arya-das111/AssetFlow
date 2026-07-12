import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CheckSquare, 
  AlertTriangle, 
  Shuffle, 
  CalendarDays, 
  Wrench, 
  Info,
  Eye
} from 'lucide-react';

interface Notification {
  id: number;
  type: string; // info, alert, booking, maintenance, transfer
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const Notifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'alert' | 'booking' | 'maintenance' | 'transfer'>('all');

  const fetchNotifications = async () => {
    setLoading(true);
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch('http://localhost:4000/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const handleMarkRead = async (id: number) => {
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch(`http://localhost:4000/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        // Optimistically update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch('http://localhost:4000/api/notifications/read-all', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="text-accent-red shrink-0" size={16} />;
      case 'booking': return <CalendarDays className="text-accent-blue shrink-0" size={16} />;
      case 'maintenance': return <Wrench className="text-accent-amber shrink-0" size={16} />;
      case 'transfer': return <Shuffle className="text-accent-blue shrink-0" size={16} />;
      default: return <Info className="text-accent-green shrink-0" size={16} />;
    }
  };

  // Filter list
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-md gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-sketch">In-App Notification Center</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Browse system alerts, allocation approvals, resource reservations, and technician logs.
          </p>
        </div>

        <button 
          onClick={handleMarkAllRead}
          disabled={notifications.filter(n => !n.isRead).length === 0}
          className="flex items-center gap-1.5 bg-zinc-800 disabled:opacity-40 hover:text-white border border-white/10 hover:border-white/20 text-zinc-300 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          <CheckSquare size={14} />
          <span>Mark All Read</span>
        </button>
      </div>

      {/* Filter tabs row */}
      <div className="flex flex-wrap gap-2">
        {[
          { name: 'All Notifications', value: 'all' },
          { name: 'System Alerts', value: 'alert' },
          { name: 'Resource Bookings', value: 'booking' },
          { name: 'Maintenance', value: 'maintenance' },
          { name: 'Transfers', value: 'transfer' }
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value as any)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              filter === tab.value 
                ? 'bg-accent-green/10 border-accent-green text-accent-green' 
                : 'bg-zinc-900/40 border-white/5 text-zinc-400 hover:text-white hover:border-white/10'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Notifications feed list */}
      <div className="glass-panel p-6 rounded-2xl min-h-[350px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-accent-green border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 font-sketch text-xs text-muted">Reading alerts index...</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredNotifications.length === 0 ? (
              <div className="py-20 text-center text-zinc-500 font-sketch">
                No notifications logged under this category list.
              </div>
            ) : (
              filteredNotifications.map(n => (
                <div 
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                  className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all cursor-pointer ${
                    n.isRead 
                      ? 'bg-zinc-900/20 border-white/5 opacity-60 hover:opacity-85' 
                      : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3.5 overflow-hidden">
                    {/* Unread indicator */}
                    <div className="shrink-0 flex items-center justify-center w-6">
                      {!n.isRead ? (
                        <div className={`w-2.5 h-2.5 rounded-full ${n.type === 'alert' ? 'bg-accent-red animate-pulse' : 'bg-accent-blue'}`}></div>
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-700"></div>
                      )}
                    </div>

                    {/* Icon */}
                    <div className="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center border border-white/5">
                      {getNotificationIcon(n.type)}
                    </div>

                    {/* Content */}
                    <div>
                      <p className="text-xs text-white font-medium leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                      <span className="text-[9px] text-zinc-500 font-semibold mt-1 block">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {!n.isRead && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                      className="text-[10px] text-accent-green hover:underline shrink-0 flex items-center gap-1 font-bold border border-accent-green/20 bg-accent-green/5 hover:bg-accent-green/10 px-2.5 py-1 rounded-lg"
                    >
                      <Eye size={12} />
                      <span>Mark Read</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
