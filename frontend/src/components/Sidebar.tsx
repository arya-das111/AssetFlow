import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Settings, 
  Package, 
  Shuffle, 
  CalendarDays, 
  Wrench, 
  BarChart3, 
  Bell, 
  ClipboardCheck,
  LogOut,
  User as UserIcon
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUnreadNotifications = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('assetflow_token');
      const res = await fetch('http://localhost:4000/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const notifications = await res.json();
        const unread = notifications.filter((n: any) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Error fetching sidebar notification count:', err);
    }
  };

  // Poll notifications every 10 seconds for real-time feel
  useEffect(() => {
    fetchUnreadNotifications();
    const interval = setInterval(fetchUnreadNotifications, 10000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['Admin', 'AssetManager', 'DepartmentHead', 'Employee'] },
    { name: 'Organization Setup', path: '/organization', icon: Settings, roles: ['Admin'] },
    { name: 'Assets Directory', path: '/assets', icon: Package, roles: ['Admin', 'AssetManager', 'DepartmentHead', 'Employee'] },
    { name: 'Allocation & Transfer', path: '/allocations', icon: Shuffle, roles: ['Admin', 'AssetManager', 'DepartmentHead', 'Employee'] },
    { name: 'Resource Booking', path: '/bookings', icon: ResourceBookingPath(), iconComponent: CalendarDays, roles: ['Admin', 'AssetManager', 'DepartmentHead', 'Employee'] },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench, roles: ['Admin', 'AssetManager', 'DepartmentHead', 'Employee'] },
    { name: 'Audit Directory', path: '/audit', icon: ClipboardCheck, roles: ['Admin', 'AssetManager', 'DepartmentHead', 'Employee'] },
    { name: 'Reports & Analytics', path: '/reports', icon: BarChart3, roles: ['Admin', 'AssetManager', 'DepartmentHead'] },
    { name: 'Notifications', path: '/notifications', icon: Bell, badgeCount: true, roles: ['Admin', 'AssetManager', 'DepartmentHead', 'Employee'] },
  ];

  // Quick helper to determine path for Resource Booking (defaults to /bookings)
  function ResourceBookingPath() {
    return '/bookings';
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <aside className="w-80 glass-panel h-[calc(100vh-2rem)] sticky top-4 left-4 rounded-2xl flex flex-col justify-between p-6 z-20 border-white/5 bg-zinc-950/60 backdrop-blur-md">
      <div>
        {/* Header Branding */}
        <div className="flex items-center gap-3 pb-6 border-b border-white/10 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent-green/10 border border-accent-green flex items-center justify-center font-sketch text-2xl font-bold text-accent-green shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            AF
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 font-sketch">
              AssetFlow
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-muted font-bold font-sans">
              Internal Enterprise
            </span>
          </div>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 mb-6">
          <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-accent-green font-bold">
            <UserIcon size={16} />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold text-white truncate">{user.name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-sketch font-bold bg-accent-green/15 text-accent-green border border-accent-green/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Feed */}
        <nav className="flex flex-col gap-1">
          {filteredItems.map(item => {
            const Icon = item.iconComponent || item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center justify-between px-4 py-3.5 rounded-xl border text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-accent-green/10 border-accent-green text-accent-green shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
                    : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/5 hover:border-white/5'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <span>{item.name}</span>
                </div>
                {item.badgeCount && unreadCount > 0 && (
                  <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-accent-red text-white rounded-full">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Logout Action */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-4 py-3.5 mt-6 w-full text-left text-sm font-medium text-zinc-400 hover:text-accent-red hover:bg-accent-red/10 border border-transparent hover:border-accent-red/20 rounded-xl transition-all duration-200"
      >
        <LogOut size={18} />
        <span>Log Out Session</span>
      </button>
    </aside>
  );
};
