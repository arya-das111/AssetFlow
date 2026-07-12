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
  User as UserIcon,
  Sun,
  Moon,
  X
} from 'lucide-react';

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('assetflow-theme') === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('assetflow-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('assetflow-theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const fetchUnreadNotifications = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('assetflow_token');
      const res = await fetch('/api/notifications', {
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
    { name: 'Resource Booking', path: '/bookings', iconComponent: CalendarDays, roles: ['Admin', 'AssetManager', 'DepartmentHead', 'Employee'] },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench, roles: ['Admin', 'AssetManager', 'DepartmentHead', 'Employee'] },
    { name: 'Audit Directory', path: '/audit', icon: ClipboardCheck, roles: ['Admin', 'AssetManager', 'DepartmentHead', 'Employee'] },
    { name: 'Reports & Analytics', path: '/reports', icon: BarChart3, roles: ['Admin', 'AssetManager', 'DepartmentHead'] },
    { name: 'Notifications', path: '/notifications', icon: Bell, badgeCount: true, roles: ['Admin', 'AssetManager', 'DepartmentHead', 'Employee'] },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden cursor-pointer animate-in fade-in"
        />
      )}

      <aside className={`
        w-80 max-w-[calc(100vw-2rem)] card-surface h-[calc(100vh-2rem)] fixed lg:sticky top-4 left-4 lg:left-0 z-40
        flex flex-col justify-between p-6 transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-[110%] lg:translate-x-0'}
      `}>
        <div className="overflow-y-auto flex-1 pr-1 scrollbar-thin mb-4">
          {/* Header Branding */}
          <div className="flex items-center justify-between pb-6 border-b border-border mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary flex items-center justify-center text-xl font-extrabold text-primary shadow-[0_0_15px_rgba(var(--primary),0.15)]">
                AF
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-1.5">
                  AssetFlow
                </h1>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  Internal Enterprise
                </span>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

        {/* User Card */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border mb-6">
          <div className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center text-primary font-bold">
            <UserIcon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground truncate">{user.name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
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
                onClick={onClose}
                className={({ isActive }) => `
                  flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(var(--primary),0.05)]' 
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30 hover:border-border'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <span>{item.name}</span>
                </div>
                {item.badgeCount && unreadCount > 0 && (
                  <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3.5">
        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          type="button"
          className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center gap-3 text-sm font-medium">
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-primary">Toggle</span>
        </button>

        {/* Logout Action */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 rounded-xl transition-all duration-200 cursor-pointer"
        >
          <LogOut size={18} />
          <span>Log Out Session</span>
        </button>
      </div>
    </aside>
    </>
  );
};
