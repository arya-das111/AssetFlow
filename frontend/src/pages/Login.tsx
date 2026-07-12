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
      const res = await fetch('/api/auth/login', {
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
      const res = await fetch('/api/auth/forgot-password', {
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
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md card-surface p-8 relative z-10">
        {/* Logo AF */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary flex items-center justify-center text-3xl font-extrabold text-primary shadow-[0_0_20px_rgba(var(--primary),0.15)] mb-3">
            AF
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">AssetFlow Authentication</h2>
          <p className="text-xs text-muted-foreground font-medium mt-1">Enterprise Resource Directory</p>
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
              Email Address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-3.5 text-muted-foreground/60" />
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-muted/40 text-foreground pl-11 pr-4 py-3 rounded-xl border border-border focus:border-primary/50 outline-none text-sm transition-all placeholder-muted-foreground/50"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Account Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgot(!showForgot)}
                className="text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                Forgot?
              </button>
            </div>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-bold py-3.5 px-4 rounded-xl cursor-pointer hover:bg-primary/90 transition-all text-sm disabled:opacity-50"
          >
            {loading ? 'Logging in session...' : 'Access Dashboard'}
          </button>
        </form>

        {showForgot && (
          <div className="mt-6 p-4 rounded-xl bg-muted/20 border border-border animate-in fade-in">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Demo Password Recovery</h4>
            <form onSubmit={handleForgotPassword} className="flex gap-2">
              <input
                type="email"
                placeholder="recovery@company.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="flex-1 bg-muted/40 text-foreground text-xs px-3 py-2 rounded-lg border border-border outline-none"
              />
              <button type="submit" className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-2 rounded-lg text-xs font-bold border border-primary/20 cursor-pointer">
                Mock Code
              </button>
            </form>
            {forgotMsg && (
              <p className="mt-3 text-[11px] text-primary leading-relaxed border-t border-border pt-2">
                {forgotMsg}
              </p>
            )}
          </div>
        )}

        <div className="my-6 border-t border-border"></div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            New to the portal?{' '}
            <Link to="/signup" className="text-primary hover:underline font-semibold">
              Create employee account
            </Link>
          </p>
          <div className="mt-4 p-3.5 rounded-xl border border-dashed border-border bg-muted/10 text-[11px] text-muted-foreground leading-relaxed text-left">
            <div className="flex items-center gap-1 text-foreground font-semibold mb-1">
              <Sparkles size={12} className="text-primary" />
              <span>Demo Login Accounts (Password: 2006)</span>
            </div>
            Admin: <span className="text-foreground">admin@assetflow.com</span><br />
            Asset Manager: <span className="text-foreground">manager@assetflow.com</span><br />
            Dept Head: <span className="text-foreground">head@assetflow.com</span><br />
            Employee: <span className="text-foreground">employee@assetflow.com</span>
          </div>
        </div>
      </div>
    </div>
  );
};
