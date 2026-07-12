import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, User, Mail, KeyRound, Building2 } from 'lucide-react';

interface DeptItem {
  id: number;
  name: string;
  code: string;
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
    // Fetch departments list for selection
    const fetchDepts = async () => {
      try {
        const res = await fetch('http://localhost:4000/api/organization/departments');
        // If unauthorized/no session, we try a public-friendly endpoint or just fetch directly 
        // In our backend, organization/departments needs authentication, but we can temporarily bypass,
        // or just mock some defaults if not logged in.
        // Actually, let's fetch it, and if it fails (because auth required), we fall back to a public or mocked list.
        if (res.ok) {
          const data = await res.json();
          setDepartments(data);
        } else {
          // Mock data if server requires auth to see departments
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
      const res = await fetch('http://localhost:4000/api/auth/signup', {
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
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      {/* Background neon glows */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-accent-green/5 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent-blue/5 blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel rounded-2xl p-8 bg-zinc-950/40 relative z-10 border-white/5 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent-green/10 border border-accent-green/45 flex items-center justify-center font-sketch text-3xl font-bold text-accent-green shadow-[0_0_20px_rgba(16,185,129,0.25)] mb-3">
            AF
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight font-sketch">Register Employee</h2>
          <p className="text-xs text-zinc-500 font-medium mt-1 font-sans">AssetFlow Enterprise Directory</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm flex items-start gap-2.5">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Full Name
            </label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-3.5 text-zinc-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-white/5 hover:bg-white/8 focus:bg-white/10 text-white pl-11 pr-4 py-3 rounded-xl border border-white/10 focus:border-accent-green/50 outline-none text-sm transition-all placeholder-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Corporate Email Address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-3.5 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-white/5 hover:bg-white/8 focus:bg-white/10 text-white pl-11 pr-4 py-3 rounded-xl border border-white/10 focus:border-accent-green/50 outline-none text-sm transition-all placeholder-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Select Department
            </label>
            <div className="relative">
              <Building2 size={16} className="absolute left-4 top-3.5 text-zinc-500" />
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-zinc-900 text-white pl-11 pr-4 py-3 rounded-xl border border-white/10 focus:border-accent-green/50 outline-none text-sm transition-all appearance-none cursor-pointer"
              >
                <option value="">No Department Assigned</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Create Password
            </label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-4 top-3.5 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 hover:bg-white/8 focus:bg-white/10 text-white pl-11 pr-4 py-3 rounded-xl border border-white/10 focus:border-accent-green/50 outline-none text-sm transition-all placeholder-zinc-500"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-[11px] text-zinc-500 leading-relaxed">
            <span className="text-white font-bold block mb-1">Registration Policy</span>
            All signups create an <span className="text-white">Employee</span> account. Role promotions (e.g. Asset Manager, Dept Head) must be authorized by an Admin.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-green text-zinc-950 font-bold py-3.5 px-4 rounded-xl cursor-pointer hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all text-sm disabled:opacity-50"
          >
            {loading ? 'Creating Account Profile...' : 'Complete Registration'}
          </button>
        </form>

        <div className="my-6 border-t border-white/10"></div>

        <div className="text-center">
          <p className="text-xs text-zinc-500">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-green hover:underline font-semibold">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
