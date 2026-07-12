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
      <div className="card-surface p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Corporate Audit Desk</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Conduct physical inventory audits. Track discrepancies and report asset status changes.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-muted/40 border border-border px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground">
          <ClipboardCheck size={14} className="text-primary" />
          <span>Active Audit Cycle: Q3 Engineering</span>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-success text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
          <button 
            onClick={resetAudit}
            className="text-xs bg-success/10 hover:bg-success/20 border border-success/20 px-3 py-1 rounded-lg text-success font-bold cursor-pointer"
          >
            Restart Audit
          </button>
        </div>
      )}

      {/* Scoped cycle details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-surface p-6 flex flex-col justify-between gap-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-border pb-4 gap-2">
            <div>
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Q3 audit: Engineering dept</h4>
              <p className="text-[11px] text-muted-foreground font-bold uppercase mt-0.5">Auditors:Sarah Iqbal, Aditya Rao · Schedule: 1–15 Jul</p>
            </div>
            <div className="text-[10px] text-muted-foreground font-mono bg-muted/40 px-2.5 py-1 rounded border border-border w-fit">
              Progress: {verifiedCount + missingCount + damagedCount} / {items.length} checks completed
            </div>
          </div>

          {/* ⭐ AUTOMATIC DISCREPANCY NOTIFICATION STRIP */}
          {totalDiscrepancies > 0 && (
            <div className="p-4 rounded-xl bg-warning/10 border border-warning/25 text-warning animate-in fade-in duration-200">
              <h5 className="text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>Discrepancy Report Triggered Automatically</span>
              </h5>
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                Found <span className="text-warning font-bold">{totalDiscrepancies} discrepant item(s)</span> ({missingCount} missing, {damagedCount} damaged). Summary logs will register in system activity logs upon closing the audit cycle.
              </p>
            </div>
          )}

          {/* Audit checklist table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold text-xs tracking-wider uppercase">
                  <th className="pb-3 pr-4">Asset Tag</th>
                  <th className="pb-3 px-4">Asset Label Name</th>
                  <th className="pb-3 px-4">Expected Storage Location</th>
                  <th className="pb-3 pl-4 text-right">Physical Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-4 pr-4 font-semibold text-foreground">{item.tag}</td>
                    <td className="py-4 px-4 font-medium text-foreground">{item.name}</td>
                    <td className="py-4 px-4 text-muted-foreground">{item.expectedLoc}</td>
                    <td className="py-4 pl-4 text-right">
                      {auditClosed ? (
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-full ${
                          item.status === 'Verified' ? 'border-success bg-success/10 text-success' :
                          item.status === 'Missing' ? 'border-destructive bg-destructive/10 text-destructive' :
                          'border-warning bg-warning/10 text-warning'
                        }`}>
                          {item.status}
                        </span>
                      ) : (
                        <div className="inline-flex border border-border rounded-xl p-1 bg-muted/40 max-w-sm">
                          <button 
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'Verified')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer ${item.status === 'Verified' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
                          >
                            Verified
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'Missing')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer ${item.status === 'Missing' ? 'bg-destructive text-destructive-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
                          >
                            Missing
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'Damaged')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer ${item.status === 'Damaged' ? 'bg-warning text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
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
              className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-xl cursor-pointer hover:bg-primary/95 transition-all text-xs"
            >
              Close Department Audit Cycle
            </button>
          )}
        </div>

        {/* Side Audit rules panel */}
        <div className="card-surface p-6 text-muted-foreground flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <HelpCircle size={16} className="text-primary" />
              <span>Audit Guidelines</span>
            </h4>
            <ul className="space-y-4 text-xs">
              <li className="flex gap-2">
                <span className="text-primary font-bold shrink-0">1.</span>
                <span>Auditors check physical inventory on-site and reconcile tags.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold shrink-0">2.</span>
                <span>Select <b>Verified</b>, <b>Missing</b> or <b>Damaged</b> for each listed asset tag.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold shrink-0">3.</span>
                <span>If any items are flagged Missing or Damaged, discrepancy reports trigger immediately.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold shrink-0">4.</span>
                <span>Closing the audit cycle locks the records.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
