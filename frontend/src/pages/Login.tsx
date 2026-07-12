import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, KeyRound, Mail, Sparkles } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        navigate('/');
      } else {
        setError(data.error || 'Invalid credentials.');
      }
    } catch (err) {
      setError('Connection refused. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      const res = await fetch('http://localhost:4000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setForgotMsg(`Code: ${data.resetToken}. ${data.info}`);
      } else {
        setForgotMsg(data.error || 'Failed to request reset.');
      }
    } catch (err) {
      setForgotMsg('Server communication error.');
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      {/* Background neon glows */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-accent-green/5 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent-blue/5 blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel rounded-2xl p-8 bg-zinc-950/40 relative z-10 border-white/5 shadow-2xl">
        {/* Logo AF */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent-green/10 border border-accent-green/45 flex items-center justify-center font-sketch text-3xl font-bold text-accent-green shadow-[0_0_20px_rgba(16,185,129,0.25)] mb-3">
            AF
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight font-sketch">AssetFlow Authentication</h2>
          <p className="text-xs text-zinc-500 font-medium mt-1 font-sans">Enterprise Resource Directory</p>
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
              Email Address
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
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Account Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgot(!showForgot)}
                className="text-xs font-medium text-accent-green hover:underline cursor-pointer"
              >
                Forgot?
              </button>
            </div>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-green text-zinc-950 font-bold py-3.5 px-4 rounded-xl cursor-pointer hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all text-sm disabled:opacity-50"
          >
            {loading ? 'Logging in session...' : 'Access Dashboard'}
          </button>
        </form>

        {showForgot && (
          <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Demo Password Recovery</h4>
            <form onSubmit={handleForgotPassword} className="flex gap-2">
              <input
                type="email"
                placeholder="recovery@company.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="flex-1 bg-white/5 text-white text-xs px-3 py-2 rounded-lg border border-white/10 outline-none"
              />
              <button type="submit" className="bg-accent-green/20 text-accent-green hover:bg-accent-green/30 px-3 py-2 rounded-lg text-xs font-bold border border-accent-green/30">
                Mock Code
              </button>
            </form>
            {forgotMsg && (
              <p className="mt-3 text-[11px] font-sketch text-accent-green leading-relaxed border-t border-white/5 pt-2">
                {forgotMsg}
              </p>
            )}
          </div>
        )}

        <div className="my-6 border-t border-white/10"></div>

        <div className="text-center">
          <p className="text-xs text-zinc-500">
            New to the portal?{' '}
            <Link to="/signup" className="text-accent-green hover:underline font-semibold">
              Create employee account
            </Link>
          </p>
          <div className="mt-4 p-3.5 rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-[11px] text-zinc-500 leading-relaxed text-left">
            <div className="flex items-center gap-1 text-white font-semibold mb-1">
              <Sparkles size={12} className="text-accent-green" />
              <span>Demo Login Accounts (Password: 2006)</span>
            </div>
            Admin: <span className="text-white">admin@assetflow.com</span><br />
            Asset Manager: <span className="text-white">manager@assetflow.com</span><br />
            Dept Head: <span className="text-white">head@assetflow.com</span><br />
            Employee: <span className="text-white">employee@assetflow.com</span>
          </div>
        </div>
      </div>
    </div>
  );
};
