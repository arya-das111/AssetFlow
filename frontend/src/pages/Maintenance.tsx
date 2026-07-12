import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  UserPlus, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

interface Asset {
  id: number;
  assetCode: string;
  name: string;
  status: string;
}

interface Ticket {
  id: number;
  assetId: number;
  asset: Asset;
  raisedBy: { id: number; name: string };
  issueDescription: string;
  status: 'Pending' | 'Approved' | 'TechnicianAssigned' | 'InProgress' | 'Resolved' | 'Rejected';
  technicianAssigned: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export const Maintenance: React.FC = () => {
  const { user } = useAuth();
  
  // Lists
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  // Raise Modal state
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<number | ''>('');
  const [issueDesc, setIssueDesc] = useState('');
  const [raiseError, setRaiseError] = useState('');

  // Assign Tech state
  const [assigningTicketId, setAssigningTicketId] = useState<number | null>(null);
  const [techName, setTechName] = useState('');

  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem('assetflow_token');
    try {
      const resTickets = await fetch('/api/maintenance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resTickets.ok) setTickets(await resTickets.json());

      const resAssets = await fetch('/api/assets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resAssets.ok) setAssets(await resAssets.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleRaiseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setRaiseError('');
    if (!selectedAssetId || !issueDesc) {
      setRaiseError('Asset and issue description are required.');
      return;
    }

    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assetId: Number(selectedAssetId),
          issueDescription: issueDesc
        })
      });

      if (res.ok) {
        setShowRaiseModal(false);
        setSelectedAssetId('');
        setIssueDesc('');
        fetchData();
      } else {
        const data = await res.json();
        setRaiseError(data.error || 'Failed to raise ticket.');
      }
    } catch (err) {
      console.error(err);
      setRaiseError('Network error raising diagnostic request.');
    }
  };

  const handleApprove = async (ticketId: number) => {
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch(`/api/maintenance/${ticketId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (ticketId: number) => {
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch(`/api/maintenance/${ticketId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignTech = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTicketId || !techName) return;

    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch(`/api/maintenance/${assigningTicketId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ technicianName: techName })
      });

      if (res.ok) {
        setAssigningTicketId(null);
        setTechName('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartWork = async (ticketId: number) => {
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch(`/api/maintenance/${ticketId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async (ticketId: number) => {
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch(`/api/maintenance/${ticketId}/resolve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter tickets into columns
  const getColTickets = (status: string) => {
    return tickets.filter(t => t.status === status);
  };

  const columns = [
    { title: 'Pending', status: 'Pending', color: 'border-border bg-muted/20' },
    { title: 'Approved', status: 'Approved', color: 'border-info/20 bg-info/5' },
    { title: 'Technician Assigned', status: 'TechnicianAssigned', color: 'border-warning/20 bg-warning/5' },
    { title: 'In Progress', status: 'InProgress', color: 'border-warning/35 bg-warning/10' },
    { title: 'Resolved', status: 'Resolved', color: 'border-success/30 bg-success/5' }
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center card-surface p-6 gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Maintenance Board</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Track hardware diagnostic requests. Column updates automatically sync asset catalog availability tags.
          </p>
        </div>
        
        <button
          onClick={() => setShowRaiseModal(true)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-xs font-bold shadow hover:bg-primary/90 transition-all cursor-pointer w-fit"
        >
          <Plus size={14} />
          <span>Raise Ticket</span>
        </button>
      </div>

      {/* Dynamic Kanban Board */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-xs text-muted-foreground">Loading maintenance board...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 overflow-x-auto min-h-[500px] pb-4">
          {columns.map(col => {
            const colTickets = getColTickets(col.status);
            return (
              <div 
                key={col.status} 
                className={`rounded-2xl border p-4 flex flex-col gap-4 min-w-[220px] ${col.color}`}
              >
                {/* Column header */}
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    <span>{col.title}</span>
                  </h4>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">
                    {colTickets.length}
                  </span>
                </div>

                {/* Column cards container */}
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[450px]">
                  {colTickets.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground/60 text-[10px] italic py-10">
                      No tickets
                    </div>
                  ) : (
                    colTickets.map(ticket => (
                      <div 
                        key={ticket.id} 
                        className={`p-4 rounded-xl border border-border bg-card flex flex-col justify-between gap-3 shadow transition-all hover:border-primary/20 ${
                          ticket.status === 'Resolved' ? 'bg-success/5 border-success/20' : ''
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[10px] font-bold font-mono text-primary">
                              {ticket.asset.assetCode}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              #{ticket.id}
                            </span>
                          </div>
                          
                          <h5 className="text-xs font-semibold text-foreground mt-1.5 line-clamp-1">{ticket.asset.name}</h5>
                          <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-3 leading-relaxed">
                            "{ticket.issueDescription}"
                          </p>
                        </div>

                        {/* Metadata details */}
                        <div className="border-t border-border pt-2 text-[10px] text-muted-foreground flex flex-col gap-1">
                          <div>By: <span className="text-foreground font-semibold">{ticket.raisedBy.name}</span></div>
                          {ticket.technicianAssigned && (
                            <div>Tech: <span className="text-info font-semibold">{ticket.technicianAssigned}</span></div>
                          )}
                          {ticket.status === 'Resolved' && ticket.resolvedAt && (
                            <div>Done: <span className="text-success font-semibold">{new Date(ticket.resolvedAt).toLocaleDateString()}</span></div>
                          )}
                        </div>

                        {/* Kanban transition actions (Admin/Manager only) */}
                        {['Admin', 'AssetManager'].includes(user?.role || '') && (
                          <div className="flex justify-end gap-1.5 mt-1 pt-2 border-t border-border">
                            {ticket.status === 'Pending' && (
                              <>
                                <button 
                                  onClick={() => handleReject(ticket.id)}
                                  className="text-[10px] text-muted-foreground hover:text-destructive font-bold px-2 py-1.5 rounded hover:bg-destructive/10 cursor-pointer"
                                >
                                  Reject
                                </button>
                                <button 
                                  onClick={() => handleApprove(ticket.id)}
                                  className="text-[10px] text-success font-bold px-2.5 py-1.5 rounded bg-success/10 hover:bg-success/20 border border-success/20 cursor-pointer flex items-center gap-1"
                                >
                                  <span>Approve</span>
                                  <ArrowRight size={10} />
                                </button>
                              </>
                            )}

                            {ticket.status === 'Approved' && (
                              <button 
                                onClick={() => setAssigningTicketId(ticket.id)}
                                className="text-[10px] text-info font-bold px-2.5 py-1.5 rounded bg-info/10 hover:bg-info/20 border border-info/20 cursor-pointer flex items-center gap-1"
                              >
                                <UserPlus size={10} />
                                <span>Assign Tech</span>
                              </button>
                            )}

                            {ticket.status === 'TechnicianAssigned' && (
                              <button 
                                onClick={() => handleStartWork(ticket.id)}
                                className="text-[10px] text-warning font-bold px-2.5 py-1.5 rounded bg-warning/10 hover:bg-warning/20 border border-warning/20 cursor-pointer flex items-center gap-1"
                              >
                                <span>Start Work</span>
                                <ArrowRight size={10} />
                              </button>
                            )}

                            {ticket.status === 'InProgress' && (
                              <button 
                                onClick={() => handleResolve(ticket.id)}
                                className="text-[10px] text-success font-bold px-2.5 py-1.5 rounded bg-success/10 hover:bg-success/20 border border-success/20 cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle2 size={10} />
                                <span>Complete</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RAISE MAINTENANCE TICKET MODAL */}
      {showRaiseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl flex flex-col justify-between max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-2">Raise Maintenance Diagnostic Request</h3>
              <p className="text-xs text-muted-foreground mb-4">Flag damaged or faulty equipment details below.</p>
              {raiseError && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  {raiseError}
                </div>
              )}
              <form onSubmit={handleRaiseTicket} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Select Damaged Equipment</label>
                  <select 
                    required
                    value={selectedAssetId}
                    onChange={(e) => setSelectedAssetId(Number(e.target.value))}
                    className="w-full bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border outline-none cursor-pointer"
                  >
                    <option value="">Choose Asset tag...</option>
                    {assets.filter(a => a.status !== 'Retired').map(a => (
                      <option key={a.id} value={a.id}>{a.assetCode} - {a.name} ({a.status})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Issue Description</label>
                  <textarea 
                    required
                    placeholder="e.g. Device does not power on, display screen cracked..." 
                    value={issueDesc}
                    onChange={(e) => setIssueDesc(e.target.value)}
                    rows={4}
                    className="w-full bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border outline-none focus:border-primary/50 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button 
                    type="button" 
                    onClick={() => { setShowRaiseModal(false); setRaiseError(''); }}
                    className="bg-secondary text-muted-foreground border border-border px-4 py-2 rounded-xl text-xs font-bold hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/95 shadow cursor-pointer"
                  >
                    Confirm Diagnostic Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN TECHNICIAN MODAL */}
      {assigningTicketId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl flex flex-col justify-between max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-2">Assign Service Technician</h3>
              <p className="text-xs text-muted-foreground mb-4">Reference repair team contact details below.</p>
              <form onSubmit={handleAssignTech} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Technician / Vendor Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Rohan Varma (IT Tech) or local Tesla Service" 
                    value={techName}
                    onChange={(e) => setTechName(e.target.value)}
                    className="w-full bg-muted/40 text-foreground text-xs px-3.5 py-2.5 rounded-xl border border-border outline-none focus:border-primary/50"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button 
                    type="button" 
                    onClick={() => setAssigningTicketId(null)}
                    className="bg-secondary text-muted-foreground border border-border px-4 py-2 rounded-xl text-xs font-bold hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/95 shadow cursor-pointer"
                  >
                    Assign Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
