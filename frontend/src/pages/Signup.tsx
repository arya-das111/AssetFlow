import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, User, Mail, KeyRound, Building2 } from 'lucide-react';

interface DeptItem {
  id: number;
  name: string;
  code: string;
  status?: string;
}

export const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [departments, setDepartments] = useState<DeptItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await fetch('/api/organization/departments');
        if (res.ok) {
          const data = await res.json();
          setDepartments(data);
        } else {
          setDepartments([
            { id: 1, name: 'Information Technology', code: 'IT' },
            { id: 2, name: 'Engineering', code: 'ENG' },
            { id: 3, name: 'Human Resources', code: 'HR' },
            { id: 4, name: 'Operations', code: 'OPS' }
          ]);
        }
      } catch (err) {
        setDepartments([
          { id: 1, name: 'Information Technology', code: 'IT' },
          { id: 2, name: 'Engineering', code: 'ENG' },
          { id: 3, name: 'Human Resources', code: 'HR' },
          { id: 4, name: 'Operations', code: 'OPS' }
        ]);
      }
    };
    fetchDepts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          departmentId: departmentId ? Number(departmentId) : null
        })
      });

      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        navigate('/');
      } else {
        setError(data.error || 'Failed to create account.');
      }
    } catch (err) {
      setError('Connection refused. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md card-surface p-8 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary flex items-center justify-center text-3xl font-extrabold text-primary shadow-[0_0_20px_rgba(var(--primary),0.15)] mb-3">
            AF
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Register Employee</h2>
          <p className="text-xs text-muted-foreground font-medium mt-1">AssetFlow Enterprise Directory</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Full Name
            </label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-3.5 text-muted-foreground/60" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-muted/40 text-foreground pl-11 pr-4 py-3 rounded-xl border border-border focus:border-primary/50 outline-none text-sm transition-all placeholder-muted-foreground/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Corporate Email Address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-3.5 text-muted-foreground/60" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-muted/40 text-foreground pl-11 pr-4 py-3 rounded-xl border border-border focus:border-primary/50 outline-none text-sm transition-all placeholder-muted-foreground/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Select Department
            </label>
            <div className="relative">
              <Building2 size={16} className="absolute left-4 top-3.5 text-muted-foreground/60" />
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-muted/40 text-foreground pl-11 pr-4 py-3 rounded-xl border border-border focus:border-primary/50 outline-none text-sm transition-all appearance-none cursor-pointer"
              >
                <option value="">No Department Assigned</option>
                {departments.filter(d => d.status !== 'Inactive').map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Create Password
            </label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-4 top-3.5 text-muted-foreground/60" />
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-muted/40 text-foreground pl-11 pr-4 py-3 rounded-xl border border-border focus:border-primary/50 outline-none text-sm transition-all placeholder-muted-foreground/50"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-dashed border-border bg-muted/10 text-[11px] text-muted-foreground leading-relaxed">
            <span className="text-foreground font-bold block mb-1">Registration Policy</span>
            All signups create an <span className="text-foreground font-semibold">Employee</span> account. Role promotions must be authorized by an Admin.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-bold py-3.5 px-4 rounded-xl cursor-pointer hover:bg-primary/90 transition-all text-sm disabled:opacity-50"
          >
            {loading ? 'Creating Account Profile...' : 'Complete Registration'}
          </button>
        </form>

        <div className="my-6 border-t border-border"></div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-semibold">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
