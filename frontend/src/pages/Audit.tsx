import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle
} from 'lucide-react';

interface AuditItem {
  id: number;
  tag: string;
  name: string;
  expectedLoc: string;
  status: 'Verified' | 'Missing' | 'Damaged' | 'Pending';
}

export const Audit: React.FC = () => {
  // Setup demo audit checklist items
  const [items, setItems] = useState<AuditItem[]>([
    { id: 1, tag: 'AF-0001', name: 'Dell XPS 15 (i7, 32GB RAM)', expectedLoc: 'HQ Floor 2', status: 'Pending' },
    { id: 2, tag: 'AF-0002', name: 'MacBook Pro 16" (M3 Max, 64GB RAM)', expectedLoc: 'HQ Floor 3', status: 'Pending' },
    { id: 3, tag: 'AF-0003', name: 'Herman Miller Aeron Ergonomic Chair', expectedLoc: 'HQ Floor 2 (Engineering Dept)', status: 'Pending' },
    { id: 4, tag: 'AF-0004', name: 'Tesla Model 3 (Company Vehicle)', expectedLoc: 'Basement Parking Slot B4', status: 'Pending' }
  ]);

  const [auditClosed, setAuditClosed] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleStatusChange = (id: number, newStatus: 'Verified' | 'Missing' | 'Damaged') => {
    if (auditClosed) return;
    setItems(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
  };

  const handleCloseCycle = () => {
    const pendingCount = items.filter(i => i.status === 'Pending').length;
    if (pendingCount > 0) {
      alert(`Please verify all items first. ${pendingCount} checks still pending.`);
      return;
    }

    setAuditClosed(true);
    setSuccessMsg('Q3 Department Audit Cycle closed successfully. Discrepancy report archived.');
  };

  const resetAudit = () => {
    setItems(prev => prev.map(item => ({ ...item, status: 'Pending' })));
    setAuditClosed(false);
    setSuccessMsg('');
  };

  // Compute stats
  const missingCount = items.filter(i => i.status === 'Missing').length;
  const damagedCount = items.filter(i => i.status === 'Damaged').length;
  const verifiedCount = items.filter(i => i.status === 'Verified').length;
  const totalDiscrepancies = missingCount + damagedCount;

  return (
    <div className="space-y-6 pb-10">
      {/* Header Info Banner */}
      <div className="bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-md flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-sketch">Corporate Audit Desk</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Conduct physical inventory audits. Track discrepancies and report asset status changes.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-zinc-800/40 border border-white/10 px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300">
          <ClipboardCheck size={14} className="text-accent-green" />
          <span>Active Audit Cycle: Q3 Engineering</span>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
          <button 
            onClick={resetAudit}
            className="text-xs bg-accent-green/10 hover:bg-accent-green/20 border border-accent-green/20 px-3 py-1 rounded-lg text-accent-green font-bold cursor-pointer"
          >
            Restart Audit
          </button>
        </div>
      )}

      {/* Scoped cycle details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col justify-between gap-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-white/5 pb-4 gap-2">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider font-sketch">Q3 audit: Engineering dept</h4>
              <p className="text-[11px] text-zinc-500 font-bold uppercase mt-0.5">Auditors:Sarah Iqbal, Aditya Rao · Schedule: 1–15 Jul</p>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono bg-white/5 px-2.5 py-1 rounded border border-white/10 w-fit">
              Progress: {verifiedCount + missingCount + damagedCount} / {items.length} checks completed
            </div>
          </div>

          {/* ⭐ AUTOMATIC DISCREPANCY NOTIFICATION STRIP */}
          {totalDiscrepancies > 0 && (
            <div className="p-4 rounded-xl bg-accent-amber/10 border border-accent-amber/25 text-accent-amber animate-in fade-in duration-200">
              <h5 className="text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>Discrepancy Report Triggered Automatically</span>
              </h5>
              <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">
                Found <span className="text-accent-amber font-bold">{totalDiscrepancies} discrepant item(s)</span> ({missingCount} missing, {damagedCount} damaged). Summary logs will register in system activity logs upon closing the audit cycle.
              </p>
            </div>
          )}

          {/* Audit checklist table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-zinc-500 font-semibold text-xs tracking-wider uppercase">
                  <th className="pb-3 pr-4">Asset Tag</th>
                  <th className="pb-3 px-4">Asset Label Name</th>
                  <th className="pb-3 px-4">Expected Storage Location</th>
                  <th className="pb-3 pl-4 text-right">Physical Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 pr-4 font-semibold text-white">{item.tag}</td>
                    <td className="py-4 px-4 font-medium text-zinc-200">{item.name}</td>
                    <td className="py-4 px-4 text-zinc-400">{item.expectedLoc}</td>
                    <td className="py-4 pl-4 text-right">
                      {auditClosed ? (
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-full ${
                          item.status === 'Verified' ? 'border-accent-green bg-accent-green/10 text-accent-green' :
                          item.status === 'Missing' ? 'border-accent-red bg-accent-red/10 text-accent-red' :
                          'border-accent-amber bg-accent-amber/10 text-accent-amber'
                        }`}>
                          {item.status}
                        </span>
                      ) : (
                        <div className="inline-flex border border-white/10 rounded-xl p-1 bg-zinc-900/60 max-w-sm">
                          <button 
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'Verified')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer ${item.status === 'Verified' ? 'bg-accent-green text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'}`}
                          >
                            Verified
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'Missing')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer ${item.status === 'Missing' ? 'bg-accent-red text-white shadow shadow-accent-red/20' : 'text-zinc-400 hover:text-white'}`}
                          >
                            Missing
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'Damaged')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer ${item.status === 'Damaged' ? 'bg-accent-amber text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'}`}
                          >
                            Damaged
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Close Audit Button */}
          {!auditClosed && (
            <button
              onClick={handleCloseCycle}
              className="w-full bg-accent-green text-zinc-950 font-bold py-3 px-4 rounded-xl cursor-pointer hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all text-xs"
            >
              Close Department Audit Cycle
            </button>
          )}
        </div>

        {/* Side Audit rules panel */}
        <div className="glass-panel p-6 rounded-2xl bg-zinc-950/40 border-white/5 text-zinc-400 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <HelpCircle size={16} className="text-accent-green" />
              <span>Audit Guidelines</span>
            </h4>
            <ul className="space-y-4 text-xs">
              <li className="flex gap-2">
                <span className="text-accent-green font-bold shrink-0">1.</span>
                <span>Auditors check physical inventory on-site and reconcile tags.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-accent-green font-bold shrink-0">2.</span>
                <span>Select <b>Verified</b>, <b>Missing</b> or <b>Damaged</b> for each listed asset tag.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-accent-green font-bold shrink-0">3.</span>
                <span>If any items are flagged Missing or Damaged, discrepancy reports trigger immediately.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-accent-green font-bold shrink-0">4.</span>
                <span>Closing the audit cycle locks the records.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
