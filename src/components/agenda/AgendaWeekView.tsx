import React, { useMemo } from 'react';
import { Plus, Sparkles, User, Clock } from 'lucide-react';
import { Appointment } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, getStatusBadge } from '../../utils/formatters';
import { getTodayDateString } from '../../utils/initialData';

interface AgendaWeekViewProps {
  currentDate: string;
  selectedStaffId: string;
  onSelectAppointment: (appointment: Appointment) => void;
  onDayClick: (date: string) => void;
}

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function AgendaWeekView({
  currentDate,
  selectedStaffId,
  onSelectAppointment,
  onDayClick,
}: AgendaWeekViewProps) {
  const { appointments, staff, business } = useApp();
  const todayStr = getTodayDateString();

  const weekDays = useMemo(() => {
    const [y, m, d] = currentDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const currentDay = dateObj.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(dateObj);
    monday.setDate(dateObj.getDate() + distanceToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      days.push({
        dateStr: `${year}-${month}-${day}`,
        dayNumber: d.getDate(),
        dayName: WEEKDAYS[i],
      });
    }
    return days;
  }, [currentDate]);

  return (
    <div className="bg-[#f1f5f9] rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-300 min-h-[500px]">
        {weekDays.map((day) => {
          const isToday = day.dateStr === todayStr;

          const dayAppointments = appointments
            .filter((a) => {
              if (a.date !== day.dateStr) return false;
              if (selectedStaffId !== 'todos' && a.staffId !== selectedStaffId) return false;
              return true;
            })
            .sort((a, b) => a.time.localeCompare(b.time));

          return (
            <div key={day.dateStr} className="flex flex-col bg-[#f8fafc]">
              <div
                className={`p-3 text-center border-b-2 transition-colors ${
                  isToday ? 'bg-blue-100/90 border-blue-500' : 'bg-slate-200/80 border-slate-300'
                }`}
              >
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                  {day.dayName}
                </span>
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-black mt-0.5 ${
                    isToday ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-900'
                  }`}
                >
                  {day.dayNumber}
                </span>
                <span className="text-[10px] text-slate-600 font-bold block mt-0.5">
                  {dayAppointments.length} turnos
                </span>
              </div>

              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[600px] bg-slate-100/60">
                {dayAppointments.length === 0 ? (
                  <div
                    onClick={() => onDayClick(day.dateStr)}
                    className="h-28 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-600 hover:bg-blue-100/80 cursor-pointer flex flex-col items-center justify-center text-slate-500 hover:text-blue-950 transition-all text-xs group p-2 text-center"
                  >
                    <Plus className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="font-bold">Sin turnos</span>
                    <span className="text-[10px] text-slate-600 font-semibold group-hover:text-blue-900">Toca para agendar</span>
                  </div>
                ) : (
                  dayAppointments.map((apt) => {
                    const status = getStatusBadge(apt.status);
                    const staffMember = staff.find((s) => s.id === apt.staffId);
                    const cardColor = apt.color || staffMember?.color || '#2563eb';

                    return (
                      <div
                        key={apt.id}
                        onClick={() => onSelectAppointment(apt)}
                        className={`p-2.5 rounded-xl border-2 border-slate-300 bg-slate-50 hover:bg-blue-100 hover:border-blue-600 hover:shadow-md cursor-pointer transition-all relative overflow-hidden group ${
                          apt.status === 'cancelado' ? 'opacity-50 line-through' : ''
                        }`}
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2"
                          style={{ backgroundColor: cardColor }}
                        />

                        <div className="pl-2 space-y-1">
                          <div className="flex items-center justify-between text-xs font-black">
                            <span className="text-blue-900 bg-blue-100 px-1.5 py-0.5 rounded text-[10px] font-black border border-blue-200">
                              {apt.time} hs
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border ${status.bg}`}>
                              {status.label}
                            </span>
                          </div>

                          <div className="font-black text-xs text-slate-900 group-hover:text-blue-950 truncate flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                              style={{ backgroundColor: cardColor }}
                            />
                            <span className="truncate">{apt.clientName}</span>
                          </div>

                          <div className="text-[11px] text-slate-700 font-bold truncate flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
                            <span className="truncate">{apt.serviceName}</span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px] font-bold">
                            <span className="text-slate-600 truncate">{apt.staffName}</span>
                            <span className="font-black text-slate-900">
                              {formatCurrency(apt.price, business?.currency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-1.5 border-t border-slate-300 bg-slate-200/50">
                <button
                  type="button"
                  onClick={() => onDayClick(day.dateStr)}
                  className="w-full py-1.5 text-slate-700 hover:text-white hover:bg-blue-600 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 transition-colors border border-slate-300"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Agendar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
