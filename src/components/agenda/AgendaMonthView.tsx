import React, { useMemo } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { Appointment } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { getTodayDateString } from '../../utils/initialData';

interface AgendaMonthViewProps {
  currentDate: string;
  selectedStaffId: string;
  onSelectDay: (date: string) => void;
  onSelectAppointment: (appointment: Appointment) => void;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function AgendaMonthView({
  currentDate,
  selectedStaffId,
  onSelectDay,
  onSelectAppointment,
}: AgendaMonthViewProps) {
  const { appointments, business } = useApp();
  const todayStr = getTodayDateString();

  const [year, month] = currentDate.split('-').map(Number);

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);

    let startDayOfWeek = firstDayOfMonth.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const days = [];

    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevMonth = month - 1 === 0 ? 12 : month - 1;
      const prevYear = month - 1 === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ dateStr, dayNum, isCurrentMonth: false });
    }

    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    return days;
  }, [year, month]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
      {/* Month Days Header */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-slate-50 text-center text-xs font-black text-[#0F172A] py-3">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      {/* Grid of days */}
      <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 min-h-[500px]">
        {calendarDays.map((day) => {
          const isToday = day.dateStr === todayStr;

          const dayAppointments = appointments.filter((a) => {
            if (a.date !== day.dateStr) return false;
            if (selectedStaffId !== 'todos' && a.staffId !== selectedStaffId) return false;
            return true;
          });

          const dayRevenue = dayAppointments
            .filter((a) => a.status !== 'cancelado')
            .reduce((sum, a) => sum + (a.price || 0), 0);

          return (
            <div
              key={day.dateStr}
              onClick={() => onSelectDay(day.dateStr)}
              className={`min-h-[95px] sm:min-h-[110px] p-2 flex flex-col justify-between hover:bg-blue-50/40 cursor-pointer transition-colors relative group ${
                day.isCurrentMonth ? 'bg-white' : 'bg-gray-50/50 opacity-40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                    isToday ? 'bg-[#1E3A8A] text-white shadow-xs' : 'text-[#0F172A]'
                  }`}
                >
                  {day.dayNum}
                </span>

                {dayAppointments.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-[#1E3A8A] border border-blue-200">
                    {dayAppointments.length}
                  </span>
                )}
              </div>

              {/* Day content preview */}
              <div className="space-y-1 my-1">
                {dayAppointments.slice(0, 2).map((apt) => (
                  <div
                    key={apt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAppointment(apt);
                    }}
                    className="text-[10px] truncate px-1.5 py-0.5 rounded bg-slate-100 hover:bg-blue-100 text-[#0F172A] font-bold transition-colors"
                  >
                    {apt.time} - {apt.clientName.split(' ')[0]}
                  </div>
                ))}
                {dayAppointments.length > 2 && (
                  <div className="text-[9px] text-slate-500 font-bold pl-1">
                    +{dayAppointments.length - 2} más
                  </div>
                )}
              </div>

              {/* Day scheduled total */}
              {dayRevenue > 0 && (
                <div className="text-[10px] font-black text-emerald-800 text-right mt-auto">
                  {formatCurrency(dayRevenue, business?.currency)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
