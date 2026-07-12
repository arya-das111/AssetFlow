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
      const res = await fetch('/api/assets?bookable=true', {
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
      const res = await fetch(`/api/bookings?resourceId=${selectedResourceId}`, {
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

  // Build the 7-day week based on selectedDate
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const getWeekDays = () => {
    const monday = getMonday(new Date(selectedDate));
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(day);
    }
    return days;
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
      setErrorMsg(candConflict.error);
      return;
    }

    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch('/api/bookings', {
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
        setSuccessMsg(`Successfully booked! Reference ID: #${data.id}`);
        setErrorMsg('');
        
        // Auto-advance candidate slot to next hour to avoid immediate conflict on same slot
        const endHour = Number(candEnd.split(':')[0]);
        if (endHour < 18) {
          const nextStart = `${String(endHour).padStart(2, '0')}:00`;
          const nextEnd = `${String(endHour + 1).padStart(2, '0')}:00`;
          setCandStart(nextStart);
          setCandEnd(nextEnd);
        }
        
        fetchBookings();
      } else {
        setErrorMsg(data.error || 'Overlap checking failed.');
        setSuccessMsg('');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error requesting slot allocation.');
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    const token = localStorage.getItem('assetflow_token');
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
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
      <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 card-surface p-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Resource Booking Desk</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Book corporate rooms, vehicles, and projectors. Overlap checks block conflicting requests in real-time.
          </p>
        </div>

        {/* Date and Resource selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Calendar size={14} className="absolute left-3.5 top-3 text-muted-foreground" />
            <select
              value={selectedResourceId}
              onChange={(e) => {
                setSelectedResourceId(Number(e.target.value));
                setSuccessMsg('');
                setErrorMsg('');
              }}
              className="bg-muted/40 text-foreground text-xs pl-10 pr-4 py-2.5 rounded-xl border border-border focus:border-primary/50 outline-none cursor-pointer"
            >
              {resources.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.assetCode})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-muted/40 border border-border rounded-xl p-1">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 hover:bg-muted/60 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Previous Week"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-[10px] font-bold bg-background text-foreground hover:bg-muted/20 rounded-lg transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1.5 hover:bg-muted/60 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Next Week"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-success text-sm flex items-center gap-2.5">
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2.5">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Weekly Scheduler grid */}
        <div className="xl:col-span-3 card-surface p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground tracking-tight uppercase">
                Weekly Scheduler
              </h3>
              <span className="text-xs font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-lg">
                {startOfWeekStr} – {endOfWeekStr}
              </span>
            </div>

            {/* Weekdays columns headers row */}
            <div className="flex gap-4 mb-2 text-center">
              <div className="w-14 pr-2"></div>
              
              <div className="flex-1 grid grid-cols-7">
                {weekDays.map((dayDate, idx) => {
                  const isSelectedDay = dayDate.toDateString() === new Date(bookingDate).toDateString();
                  return (
                    <div key={idx} className="py-1">
                      <span className={`block text-[11px] font-bold uppercase ${isSelectedDay ? 'text-primary' : 'text-muted-foreground'}`}>
                        {dayDate.toLocaleDateString(undefined, { weekday: 'short' })}
                      </span>
                      <span className={`block text-[9px] mt-0.5 font-mono ${isSelectedDay ? 'text-primary font-bold' : 'text-muted-foreground/60'}`}>
                        {dayDate.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grid container */}
            <div className="relative border border-border rounded-2xl bg-muted/10 p-4 h-[500px] flex gap-4 select-none">
              
              {/* Hours Grid Labels */}
              <div className="w-14 flex flex-col justify-between text-[10px] font-bold text-muted-foreground/60 font-mono pr-2 border-r border-border py-1">
                {timeSlots.map(time => (
                  <div key={time} className="h-6 flex items-center">{time}</div>
                ))}
              </div>

              {/* 7 Column Grid Area */}
              <div className="flex-1 grid grid-cols-7 relative py-1">
                {/* Horizontal grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-1">
                  {timeSlots.map(time => (
                    <div key={`line-${time}`} className="border-b border-border/50 w-full h-0"></div>
                  ))}
                </div>

                {/* Day Columns */}
                {weekDays.map((dayDate, dayIdx) => {
                  const dayStr = dayDate.toDateString();
                  const isBookingDay = new Date(bookingDate).toDateString() === dayStr;

                  const dayBookings = bookings.filter(b => {
                    return b.resourceId === Number(selectedResourceId) && new Date(b.startTime).toDateString() === dayStr;
                  });

                  return (
                    <div key={dayIdx} className="relative h-full border-r border-border last:border-r-0">
                      {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/5 pointer-events-none">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
                        <>
                          {/* Render confirmed day bookings */}
                          {dayBookings.map(b => {
                            const pos = getSlotPosition(b.startTime, b.endTime);
                            const s = new Date(b.startTime);
                            const e = new Date(b.endTime);
                            const durationHours = (e.getTime() - s.getTime()) / (1000 * 60 * 60);
                            const showBadge = durationHours > 1;
                            return (
                              <div
                                key={b.id}
                                style={{ top: pos.top, height: pos.height, left: '4px', right: '4px' }}
                                className="absolute rounded-xl bg-info/80 border border-info p-1.5 flex flex-col justify-between text-white shadow-md overflow-hidden hover:z-10 transition-all hover:bg-info duration-200"
                              >
                                <div className="overflow-hidden">
                                  {showBadge && (
                                    <span className="inline-flex items-center justify-center text-[9px] font-bold tracking-wide uppercase bg-black/20 px-1.5 py-0.5 rounded border border-white/20 leading-none mb-1">
                                      Booked
                                    </span>
                                  )}
                                  <h5 className="text-[10px] font-bold truncate leading-tight">
                                    {b.bookedBy.name.split('(')[0].trim()}
                                  </h5>
                                </div>
                                <div className="flex justify-between items-center text-[9px] text-white/90 font-semibold font-mono mt-1">
                                  <span>
                                    {(() => {
                                      const pad = (n: number) => String(n).padStart(2, '0');
                                      return `${pad(s.getHours())}:${pad(s.getMinutes())} – ${pad(e.getHours())}:${pad(e.getMinutes())}`;
                                    })()}
                                  </span>
                                  {(b.bookedBy.id === user?.id || user?.role === 'Admin') && (
                                    <button 
                                      onClick={() => handleCancelBooking(b.id)}
                                      className="text-white/80 hover:text-white p-0.5 rounded bg-black/10 hover:bg-black/30 cursor-pointer"
                                    >
                                      <Trash2 size={10} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* Render candidate preview block */}
                          {isBookingDay && (
                            !candConflict.isOverlap ? (
                              (() => {
                                const candS = getCandidateStartDateTime().toISOString();
                                const candE = getCandidateEndDateTime().toISOString();
                                const pos = getSlotPosition(candS, candE);
                                return (
                                  <div
                                    style={{ top: pos.top, height: pos.height, left: '4px', right: '4px' }}
                                    className="absolute rounded-xl border-2 border-dashed border-primary bg-primary/10 p-1 flex flex-col justify-center items-center gap-0.5 text-primary pointer-events-none z-10 animate-in fade-in"
                                  >
                                    <span className="inline-flex items-center justify-center text-[9px] font-bold uppercase tracking-wider bg-primary/20 border border-primary/30 px-2 py-0.5 rounded leading-none">
                                      Request
                                    </span>
                                    <span className="text-[10px] font-semibold font-mono leading-none mt-0.5">
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
                                    style={{ top: pos.top, height: pos.height, left: '4px', right: '4px' }}
                                    className="absolute rounded-xl border-2 border-dashed border-destructive bg-destructive/10 pointer-events-none z-10 animate-in fade-in"
                                  />
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
        <div className="card-surface p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground tracking-tight uppercase mb-4">Book Time Slot</h3>
            
            <form onSubmit={handleBookSlot} className="space-y-4">
              {/* Custom Monthly Calendar Date Picker */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Select Date</label>
                <div className="bg-muted/20 p-4 rounded-xl border border-border">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-foreground">
                      {new Date(calYear, calMonth).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-1 hover:bg-muted/40 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-1 hover:bg-muted/40 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Day Labels */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-muted-foreground mb-1.5">
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
                              ? 'bg-primary text-primary-foreground shadow' 
                              : 'hover:bg-muted text-foreground hover:text-foreground'
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
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Start Time</label>
                <div className="relative">
                  <Clock size={14} className="absolute left-3 top-3.5 text-muted-foreground" />
                  <select
                    value={candStart}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setCandStart(newStart);
                      setSuccessMsg('');
                      setErrorMsg('');
                      
                      // Auto-update end time if it is now invalid (<= start time)
                      const startHour = Number(newStart.split(':')[0]);
                      const endHour = Number(candEnd.split(':')[0]);
                      if (endHour <= startHour) {
                        const nextEnd = `${String(startHour + 1).padStart(2, '0')}:00`;
                        setCandEnd(nextEnd);
                      }
                    }}
                    className="w-full bg-muted/40 text-foreground text-xs pl-9 pr-4 py-3 rounded-xl border border-border outline-none cursor-pointer"
                  >
                    {timeSlots.slice(0, -1).map(time => (
                      <option key={`start-${time}`} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* End hour dropdown */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">End Time</label>
                <div className="relative">
                  <Clock size={14} className="absolute left-3 top-3.5 text-muted-foreground" />
                  <select
                    value={candEnd}
                    onChange={(e) => {
                      setCandEnd(e.target.value);
                      setSuccessMsg('');
                      setErrorMsg('');
                    }}
                    className="w-full bg-muted/40 text-foreground text-xs pl-9 pr-4 py-3 rounded-xl border border-border outline-none cursor-pointer"
                  >
                    {timeSlots.filter(t => t > candStart).map(time => (
                      <option key={`end-${time}`} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              {candConflict.isOverlap && (
                <div className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs leading-relaxed">
                  ⚠️ <b>Overlap Conflict:</b> {candConflict.error}
                </div>
              )}

              <button
                type="submit"
                disabled={candConflict.isOverlap}
                className="w-full bg-primary disabled:opacity-30 disabled:cursor-not-allowed text-primary-foreground font-bold py-3.5 px-4 rounded-xl cursor-pointer hover:bg-primary/90 transition-all text-xs"
              >
                Confirm Resource Booking
              </button>
            </form>
          </div>

          <div className="mt-6 border-t border-border pt-4 text-[10px] text-muted-foreground leading-relaxed">
            <span className="text-foreground font-bold block mb-1">Duration Rules</span>
            All bookings must start and resolve within same workday (08:00 - 18:00). Validations execute atomically on database write.
          </div>
        </div>
      </div>
    </div>
  );
};
