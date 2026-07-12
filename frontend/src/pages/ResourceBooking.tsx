import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Resource {
  id: number;
  assetCode: string;
  name: string;
  status: string;
}

interface Booking {
  id: number;
  resourceId: number;
  resource: Resource;
  bookedBy: { id: number; name: string; email: string };
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'cancelled';
}

export const ResourceBooking: React.FC = () => {
  const { user } = useAuth();
  
  // Lists
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Selection states
  const [selectedResourceId, setSelectedResourceId] = useState<number | ''>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]); // Date browsing (week selector)
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0]); // Date form selection

  // Month calendar state
  const [calMonth, setCalMonth] = useState<number>(new Date().getMonth());
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    const d = new Date(bookingDate);
    setCalMonth(d.getMonth());
    setCalYear(d.getFullYear());
  }, [bookingDate]);

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonthMondayOffset = (month: number, year: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(prev => prev - 1);
    } else {
      setCalMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(prev => prev + 1);
    } else {
      setCalMonth(prev => prev + 1);
    }
  };

  // Candidate Slot selection
  const [candStart, setCandStart] = useState<string>('09:00'); // HH:MM
  const [candEnd, setCandEnd] = useState<string>('10:00'); // HH:MM

  // Status/Error states
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch bookable assets
  const fetchResources = async () => {
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch('http://localhost:4000/api/assets?bookable=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setResources(data);
        if (data.length > 0 && !selectedResourceId) {
          setSelectedResourceId(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch all confirmed bookings for selected resource
  const fetchBookings = async () => {
    if (!selectedResourceId) return;
    setLoading(true);
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch(`http://localhost:4000/api/bookings?resourceId=${selectedResourceId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setBookings(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    fetchBookings();
    setSuccessMsg('');
    setErrorMsg('');
  }, [selectedResourceId]);

  // Handle Date changes
  const handleBookingDateChange = (dateVal: string) => {
    setBookingDate(dateVal);
    setSelectedDate(dateVal); // Automatically slide calendar to the week of this date
  };

  const handlePrevWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    const dateStr = d.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    setBookingDate(dateStr);
  };

  const handleNextWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    const dateStr = d.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    setBookingDate(dateStr);
  };

  const handleToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setSelectedDate(todayStr);
    setBookingDate(todayStr);
  };

  // Weekdays calculation based on selectedDate (Monday to Friday)
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const getWeekDays = () => {
    const startOfWeek = getMonday(new Date(selectedDate));
    return Array.from({ length: 7 }).map((_, idx) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + idx);
      return day;
    });
  };

  const weekDays = getWeekDays();
  const startOfWeekStr = weekDays[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endOfWeekStr = weekDays[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  // Candidate time calculations
  const getCandidateStartDateTime = () => new Date(`${bookingDate}T${candStart}:00`);
  const getCandidateEndDateTime = () => new Date(`${bookingDate}T${candEnd}:00`);

  // Overlap verification helper for UI preview
  const checkCandOverlap = () => {
    if (candStart >= candEnd) return { isOverlap: true, error: 'Start time must be before end time.' };

    const candS = getCandidateStartDateTime();
    const candE = getCandidateEndDateTime();

    for (const b of bookings.filter(x => x.resourceId === Number(selectedResourceId))) {
      const bS = new Date(b.startTime);
      const bE = new Date(b.endTime);

      if (candS < bE && candE > bS) {
        const formatTime = (d: Date) => {
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        };
        return { 
          isOverlap: true, 
          error: `Overlaps with confirmed booking by ${b.bookedBy.name} (${formatTime(bS)} - ${formatTime(bE)}).` 
        };
      }
    }

    return { isOverlap: false, error: '' };
  };

  const candConflict = checkCandOverlap();

  const handleBookSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (candConflict.isOverlap) {
      setErrorMsg(candConflict.error || 'Cannot book overlapping slots.');
      return;
    }

    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch('http://localhost:4000/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          resourceId: Number(selectedResourceId),
          startTime: getCandidateStartDateTime().toISOString(),
          endTime: getCandidateEndDateTime().toISOString()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('Booking confirmed successfully!');
        fetchBookings();
      } else {
        setErrorMsg(data.error || 'Failed to complete booking.');
      }
    } catch (err) {
      setErrorMsg('Server connection failed.');
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch(`http://localhost:4000/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg('Booking cancelled successfully.');
        fetchBookings();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Generate hourly slots from 08:00 to 18:00
  const timeSlots = [];
  for (let i = 8; i <= 18; i++) {
    timeSlots.push(`${String(i).padStart(2, '0')}:00`);
  }

  // Calculate top & height percentage for bookings in a 08:00-18:00 (10 hour) window
  const getSlotPosition = (start: string, end: string) => {
    const sTime = new Date(start);
    const eTime = new Date(end);

    const sHour = sTime.getHours() + sTime.getMinutes() / 60;
    const eHour = eTime.getHours() + eTime.getMinutes() / 60;

    // Start of timeline is 08:00, span is 10 hours
    const top = ((sHour - 8) / 10) * 100;
    const height = ((eHour - sHour) / 10) * 100;

    return {
      top: `${Math.max(0, top)}%`,
      height: `${Math.min(100, height)}%`
    };
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-md">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-sketch font-bold">Resource Booking Desk</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Book corporate rooms, vehicles, and projectors. Overlap checks block conflicting requests in real-time.
          </p>
        </div>

        {/* Date and Resource selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Calendar size={14} className="absolute left-3.5 top-3 text-zinc-500" />
            <select
              value={selectedResourceId}
              onChange={(e) => setSelectedResourceId(Number(e.target.value))}
              className="bg-zinc-800 text-zinc-300 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-white/10 focus:border-accent-green/50 outline-none cursor-pointer"
            >
              {resources.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.assetCode})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-zinc-800 border border-white/10 rounded-xl p-1">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Previous Week"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-[10px] font-bold bg-zinc-900 text-zinc-200 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Next Week"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-sm flex items-center gap-2.5">
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm flex items-center gap-2.5">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* ⭐ INTERACTIVE WEEK SCHEDULER VIEW */}
        <div className="xl:col-span-3 glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white tracking-tight uppercase font-sketch">
                Weekly Scheduler
              </h3>
              <span className="text-xs font-mono font-bold text-accent-green bg-accent-green/5 border border-accent-green/10 px-3 py-1 rounded-lg">
                {startOfWeekStr} – {endOfWeekStr}
              </span>
            </div>

            {/* Weekdays columns headers row */}
            <div className="flex gap-4 mb-2 text-center">
              {/* Hour spacer */}
              <div className="w-14 pr-2"></div>
              
              {/* Day Headers Grid */}
              <div className="flex-1 grid grid-cols-7">
                {weekDays.map((dayDate, idx) => {
                  const isSelectedDay = dayDate.toDateString() === new Date(bookingDate).toDateString();
                  return (
                    <div key={idx} className="py-1">
                      <span className={`block text-[11px] font-bold uppercase ${isSelectedDay ? 'text-accent-green' : 'text-zinc-400'}`}>
                        {dayDate.toLocaleDateString(undefined, { weekday: 'short' })}
                      </span>
                      <span className={`block text-[9px] mt-0.5 font-mono ${isSelectedDay ? 'text-accent-green font-bold' : 'text-zinc-500'}`}>
                        {dayDate.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grid container with hours and day columns */}
            <div className="relative border border-white/10 rounded-2xl bg-zinc-950/40 p-4 h-[500px] flex gap-4 select-none">
              
              {/* Hours Grid Labels */}
              <div className="w-14 flex flex-col justify-between text-[10px] font-bold text-zinc-500 font-mono pr-2 border-r border-white/5 py-1">
                {timeSlots.map(time => (
                  <div key={time} className="h-6 flex items-center">{time}</div>
                ))}
              </div>

              {/* 7 Column Grid Area */}
              <div className="flex-1 grid grid-cols-7 relative py-4">
                {/* Horizontal grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-1">
                  {timeSlots.map(time => (
                    <div key={`line-${time}`} className="border-b border-white/5 w-full h-0"></div>
                  ))}
                </div>

                {/* Day Columns */}
                {weekDays.map((dayDate, dayIdx) => {
                  const dayStr = dayDate.toDateString();
                  const isBookingDay = new Date(bookingDate).toDateString() === dayStr;

                  // filter bookings for this day
                  const dayBookings = bookings.filter(b => {
                    return b.resourceId === Number(selectedResourceId) && new Date(b.startTime).toDateString() === dayStr;
                  });

                  return (
                    <div key={dayIdx} className="relative h-full border-r border-white/5 last:border-r-0">
                      {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/5 pointer-events-none">
                          <div className="w-4 h-4 border-2 border-accent-green border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
                        <>
                          {/* Render confirmed day bookings */}
                          {dayBookings.map(b => {
                            const pos = getSlotPosition(b.startTime, b.endTime);
                            return (
                              <div
                                key={b.id}
                                style={{ top: pos.top, height: pos.height }}
                                className="absolute left-1 right-1 rounded-xl bg-accent-blue/80 border border-blue-500/35 p-2 flex flex-col justify-between text-white shadow-lg overflow-hidden hover:z-10 transition-all hover:bg-blue-600/95 duration-200"
                              >
                                <div className="overflow-hidden">
                                  <span className="text-[8px] font-bold tracking-wide uppercase bg-blue-600/30 px-1.5 py-0.5 rounded border border-blue-400/25">
                                    Booked
                                  </span>
                                  <h5 className="text-[9px] font-bold mt-1 truncate leading-tight">{b.bookedBy.name}</h5>
                                </div>
                                <div className="flex justify-between items-center text-[8px] text-blue-200 font-mono mt-1">
                                  <span>
                                    {(() => {
                                      const s = new Date(b.startTime);
                                      const e = new Date(b.endTime);
                                      const pad = (n: number) => String(n).padStart(2, '0');
                                      return `${pad(s.getHours())}:${pad(s.getMinutes())} – ${pad(e.getHours())}:${pad(e.getMinutes())}`;
                                    })()}
                                  </span>
                                  {(b.bookedBy.id === user?.id || user?.role === 'Admin') && (
                                    <button 
                                      onClick={() => handleCancelBooking(b.id)}
                                      className="text-zinc-300 hover:text-accent-red p-0.5 rounded bg-zinc-950/30 hover:bg-zinc-950/50 cursor-pointer"
                                    >
                                      <Trash2 size={10} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* Render candidate preview block if this column is the selected bookingDate */}
                          {isBookingDay && (
                            !candConflict.isOverlap ? (
                              (() => {
                                const candS = getCandidateStartDateTime().toISOString();
                                const candE = getCandidateEndDateTime().toISOString();
                                const pos = getSlotPosition(candS, candE);
                                return (
                                  <div
                                    style={{ top: pos.top, height: pos.height }}
                                    className="absolute left-1 right-1 rounded-xl border-2 border-dashed border-accent-green/60 bg-accent-green/5 p-2 flex flex-col justify-between text-accent-green pointer-events-none z-10 animate-in fade-in"
                                  >
                                    <span className="text-[8px] font-bold uppercase tracking-wider bg-accent-green/10 border border-accent-green/20 px-1.5 py-0.5 rounded w-fit">
                                      Request
                                    </span>
                                    <span className="text-[8px] font-bold font-mono">
                                      {candStart} - {candEnd}
                                    </span>
                                  </div>
                                );
                              })()
                            ) : (
                              candStart < candEnd && (() => {
                                const candS = getCandidateStartDateTime().toISOString();
                                const candE = getCandidateEndDateTime().toISOString();
                                const pos = getSlotPosition(candS, candE);
                                return (
                                  <div
                                    style={{ top: pos.top, height: pos.height }}
                                    className="absolute left-1 right-1 rounded-xl border-2 border-dashed border-accent-red/60 bg-accent-red/5 p-2 flex flex-col justify-between text-accent-red pointer-events-none z-10 animate-in fade-in"
                                  >
                                    <span className="text-[8px] font-bold uppercase tracking-wider bg-accent-red/10 border border-accent-red/20 px-1.5 py-0.5 rounded w-fit">
                                      Conflict
                                    </span>
                                    <span className="text-[8px] font-bold font-mono text-accent-red">
                                      {candStart} - {candEnd}
                                    </span>
                                  </div>
                                );
                              })()
                            )
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* BOOKING CONTROLS CARD */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight uppercase mb-4 font-sketch">Book Time Slot</h3>
            
            <form onSubmit={handleBookSlot} className="space-y-4">
              {/* Custom Monthly Calendar Date Picker */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Select Date</label>
                <div className="bg-zinc-900/60 p-4 rounded-xl border border-white/10">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-zinc-300">
                      {new Date(calYear, calMonth).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Day Labels */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-zinc-500 mb-1.5">
                    <span>Mo</span>
                    <span>Tu</span>
                    <span>We</span>
                    <span>Th</span>
                    <span>Fr</span>
                    <span>Sa</span>
                    <span>Su</span>
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
                    {Array.from({ length: getFirstDayOfMonthMondayOffset(calMonth, calYear) }).map((_, idx) => (
                      <div key={`empty-${idx}`} />
                    ))}
                    {Array.from({ length: getDaysInMonth(calMonth, calYear) }).map((_, idx) => {
                      const dayNum = idx + 1;
                      const cellDateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                      const isSelected = cellDateStr === bookingDate;

                      return (
                        <button
                          key={dayNum}
                          type="button"
                          onClick={() => handleBookingDateChange(cellDateStr)}
                          className={`py-1 rounded font-bold font-mono transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-accent-green text-zinc-950 shadow shadow-accent-green/20' 
                              : 'hover:bg-zinc-800 text-zinc-300 hover:text-white'
                          }`}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Start hour dropdown */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Start Time</label>
                <div className="relative">
                  <Clock size={14} className="absolute left-3 top-3.5 text-zinc-500" />
                  <select
                    value={candStart}
                    onChange={(e) => setCandStart(e.target.value)}
                    className="w-full bg-zinc-900 text-white text-xs pl-9 pr-4 py-3 rounded-xl border border-white/10 outline-none cursor-pointer"
                  >
                    {timeSlots.slice(0, -1).map(time => (
                      <option key={`start-${time}`} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* End hour dropdown */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">End Time</label>
                <div className="relative">
                  <Clock size={14} className="absolute left-3 top-3.5 text-zinc-500" />
                  <select
                    value={candEnd}
                    onChange={(e) => setCandEnd(e.target.value)}
                    className="w-full bg-zinc-900 text-white text-xs pl-9 pr-4 py-3 rounded-xl border border-white/10 outline-none cursor-pointer"
                  >
                    {timeSlots.filter(t => t > candStart).map(time => (
                      <option key={`end-${time}`} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              {candConflict.isOverlap && (
                <div className="p-3.5 rounded-xl border border-accent-red/20 bg-accent-red/10 text-accent-red text-xs leading-relaxed">
                  ⚠️ <b>Overlap Conflict:</b> {candConflict.error}
                </div>
              )}

              <button
                type="submit"
                disabled={candConflict.isOverlap}
                className="w-full bg-accent-green disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-bold py-3.5 px-4 rounded-xl cursor-pointer hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all text-xs"
              >
                Confirm Resource Booking
              </button>
            </form>
          </div>

          <div className="mt-6 border-t border-white/5 pt-4 text-[10px] text-zinc-500 leading-relaxed">
            <span className="text-white font-bold block mb-1">Duration Rules</span>
            All bookings must start and resolve within same workday (08:00 - 18:00). Validations execute atomically on database write.
          </div>
        </div>
      </div>
    </div>
  );
};
