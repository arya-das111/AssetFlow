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
      const res = await fetch('/api/notifications', {
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
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch('/api/notifications/read-all', {
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
      case 'alert': return <AlertTriangle className="text-destructive shrink-0" size={16} />;
      case 'booking': return <CalendarDays className="text-info shrink-0" size={16} />;
      case 'maintenance': return <Wrench className="text-warning shrink-0" size={16} />;
      case 'transfer': return <Shuffle className="text-info shrink-0" size={16} />;
      default: return <Info className="text-primary shrink-0" size={16} />;
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center card-surface p-6 gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">In-App Notification Center</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Browse system alerts, allocation approvals, resource reservations, and technician logs.
          </p>
        </div>

        <button 
          onClick={handleMarkAllRead}
          disabled={notifications.filter(n => !n.isRead).length === 0}
          className="flex items-center gap-1.5 bg-secondary disabled:opacity-40 hover:bg-muted border border-border text-foreground px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer w-fit"
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
                ? 'bg-primary/10 border-primary text-primary' 
                : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:border-primary/20'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Notifications feed list */}
      <div className="card-surface p-6 min-h-[350px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-xs text-muted-foreground">Reading alerts index...</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredNotifications.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">
                No notifications logged under this category list.
              </div>
            ) : (
              filteredNotifications.map(n => (
                <div 
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                  className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all cursor-pointer ${
                    n.isRead 
                      ? 'bg-muted/10 border-border/40 opacity-65 hover:opacity-85' 
                      : 'bg-muted/20 border-border hover:border-primary/25'
                  }`}
                >
                  <div className="flex items-center gap-3.5 overflow-hidden">
                    {/* Unread indicator */}
                    <div className="shrink-0 flex items-center justify-center w-6">
                      {!n.isRead ? (
                        <div className={`w-2.5 h-2.5 rounded-full ${n.type === 'alert' ? 'bg-destructive animate-pulse' : 'bg-primary'}`}></div>
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"></div>
                      )}
                    </div>

                    {/* Icon */}
                    <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center border border-border">
                      {getNotificationIcon(n.type)}
                    </div>

                    {/* Content */}
                    <div>
                      <p className="text-xs text-foreground font-medium leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                      <span className="text-[9px] text-muted-foreground mt-1 block">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {!n.isRead && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                      className="text-[10px] text-primary hover:underline shrink-0 flex items-center gap-1 font-bold border border-primary/20 bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-lg cursor-pointer"
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
