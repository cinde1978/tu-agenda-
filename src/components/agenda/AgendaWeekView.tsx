import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Building2,
  User,
  Sparkles,
  Plus,
  Coffee,
  CheckCircle2,
  Users,
  AlertCircle,
  Briefcase,
} from 'lucide-react';
import { Appointment, BranchId, StaffMember } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, getStatusBadge } from '../../utils/formatters';
import { getTodayDateString } from '../../utils/initialData';
import {
  getStaffDaySchedule,
  getStaffEffectiveShift,
  timeToMinutes,
  minutesToTime,
  BRANCH_NAMES,
} from '../../utils/staffSchedule';

interface AgendaWeekViewProps {
  currentDate: string;
  selectedStaffId: string;
  onSelectAppointment: (appointment: Appointment) => void;
  onDayClick: (date: string) => void;
}

const WEEKDAYS = [
  { dayIndex: 1, name: 'Lunes', short: 'Lun' },
  { dayIndex: 2, name: 'Martes', short: 'Mar' },
  { dayIndex: 3, name: 'Miércoles', short: 'Mié' },
  { dayIndex: 4, name: 'Jueves', short: 'Jue' },
  { dayIndex: 5, name: 'Viernes', short: 'Vie' },
  { dayIndex: 6, name: 'Sábado', short: 'Sáb' },
  { dayIndex: 0, name: 'Domingo', short: 'Dom' },
];

export function AgendaWeekView({
  currentDate,
  selectedStaffId,
  onSelectAppointment,
  onDayClick,
}: AgendaWeekViewProps) {
  const { appointments, staff, business } = useApp();
  const todayStr = getTodayDateString();

  // Mobile selected day tab (defaults to current day of week)
  const [mobileActiveDayIndex, setMobileActiveDayIndex] = useState<number>(() => {
    const [y, m, d] = currentDate.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
  });

  // Calculate 7 days of the current week (starting Monday)
  const weekDays = useMemo(() => {
    const [y, m, d] = currentDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const currentDay = dateObj.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(dateObj);
    monday.setDate(dateObj.getDate() + distanceToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      const year = dayDate.getFullYear();
      const month = String(dayDate.getMonth() + 1).padStart(2, '0');
      const day = String(dayDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayOfWeek = dayDate.getDay();

      const weekdayInfo = WEEKDAYS.find((w) => w.dayIndex === dayOfWeek) || WEEKDAYS[i];

      days.push({
        dateStr,
        dayNumber: dayDate.getDate(),
        dayOfWeek,
        dayName: weekdayInfo.name,
        shortName: weekdayInfo.short,
      });
    }
    return days;
  }, [currentDate]);

  // Selected staff member object if filtering
  const activeStaffMember = useMemo(() => {
    if (selectedStaffId === 'todos') return null;
    return staff.find((s) => s.id === selectedStaffId) || null;
  }, [selectedStaffId, staff]);

  // Summary stats for the whole week
  const weekStats = useMemo(() => {
    const datesInWeek = weekDays.map((d) => d.dateStr);
    const weekApts = appointments.filter(
      (a) =>
        datesInWeek.includes(a.date) &&
        a.status !== 'cancelado' &&
        (selectedStaffId === 'todos' || a.staffId === selectedStaffId)
    );

    const totalRevenue = weekApts.reduce((sum, a) => sum + (a.price || 0), 0);
    const totalMinutes = weekApts.reduce((sum, a) => sum + (a.durationMinutes || 30), 0);

    return {
      totalAppointments: weekApts.length,
      totalRevenue,
      totalHours: (totalMinutes / 60).toFixed(1),
    };
  }, [weekDays, appointments, selectedStaffId]);

  return (
    <div className="space-y-3">
      {/* Week Top Control Bar */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#1E3A8A] text-white rounded-xl shadow-xs">
              <Calendar className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm sm:text-base text-[#0F172A]">
                  Semana del {weekDays[0]?.dayNumber} al {weekDays[6]?.dayNumber}{' '}
                  de {new Date(weekDays[0]?.dateStr + 'T12:00:00').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                </h3>
                {activeStaffMember ? (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-black text-white"
                    style={{ backgroundColor: activeStaffMember.color || '#1E3A8A' }}
                  >
                    {activeStaffMember.name} ({activeStaffMember.role})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-900">
                    Todos los profesionales
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 font-bold mt-0.5">
                Cuadrícula semanal de turnos, horarios y descansos por sucursal
              </p>
            </div>
          </div>

          {/* Branch Badges & Legend */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 border-2 border-[#1E3A8A]/30 text-[#1E3A8A] text-xs font-black">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1E3A8A]" />
              <span>Soham Montevideo</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 border-2 border-indigo-700/30 text-indigo-900 text-xs font-black">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-700" />
              <span>Soham Rioja</span>
            </div>
          </div>
        </div>

        {/* Weekly Stats Pills */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-600 block">Turnos agendados</span>
            <span className="text-sm sm:text-base font-black text-[#0F172A]">
              {weekStats.totalAppointments}
            </span>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-600 block">Horas de servicio</span>
            <span className="text-sm sm:text-base font-black text-[#1E3A8A]">
              {weekStats.totalHours} hs
            </span>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-600 block">Facturación prevista</span>
            <span className="text-sm sm:text-base font-black text-emerald-800">
              {formatCurrency(weekStats.totalRevenue, business?.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* MOBILE DAY SELECTOR TABS (Visible only on mobile/tablet screens) */}
      <div className="lg:hidden flex overflow-x-auto gap-1 pb-1 scrollbar-none">
        {weekDays.map((day) => {
          const isSelected = mobileActiveDayIndex === day.dayOfWeek;
          const isToday = day.dateStr === todayStr;
          const dayAptsCount = appointments.filter(
            (a) =>
              a.date === day.dateStr &&
              a.status !== 'cancelado' &&
              (selectedStaffId === 'todos' || a.staffId === selectedStaffId)
          ).length;

          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => setMobileActiveDayIndex(day.dayOfWeek)}
              className={`flex-1 min-w-[70px] py-2 px-1.5 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                isSelected
                  ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                  : isToday
                  ? 'bg-blue-50 text-[#1E3A8A] border-blue-400 font-black'
                  : 'bg-white text-[#0F172A] border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="text-[10px] uppercase font-black">{day.shortName}</span>
              <span
                className={`text-sm font-black w-6 h-6 rounded-full flex items-center justify-center ${
                  isSelected ? 'bg-white/20 text-white' : isToday ? 'bg-[#1E3A8A] text-white' : ''
                }`}
              >
                {day.dayNumber}
              </span>
              <span className="text-[9px] font-bold opacity-80">{dayAptsCount} turnos</span>
            </button>
          );
        })}
      </div>

      {/* WEEKLY GRID CONTAINER (Responsive: 7 cols on lg, single day view on mobile) */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-xs overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-7 divide-y lg:divide-y-0 lg:divide-x-2 divide-slate-200 min-h-[580px]">
          {weekDays.map((day) => {
            const isToday = day.dateStr === todayStr;
            const isMobileVisible = mobileActiveDayIndex === day.dayOfWeek;

            // Day's appointments filtered
            const dayAppointments = appointments
              .filter((a) => {
                if (a.date !== day.dateStr) return false;
                if (selectedStaffId !== 'todos' && a.staffId !== selectedStaffId) return false;
                return true;
              })
              .sort((a, b) => a.time.localeCompare(b.time));

            // Compute staff schedule info for this day
            const singleStaffSchedule = activeStaffMember
              ? getStaffDaySchedule(activeStaffMember, day.dayOfWeek)
              : null;

            // Compute working hours capacity for the single staff member
            let staffCapacityHours = 0;
            let bookedMinutes = 0;
            if (singleStaffSchedule && singleStaffSchedule.active) {
              const s1 = singleStaffSchedule.branchShifts?.sucursal_1;
              const s2 = singleStaffSchedule.branchShifts?.sucursal_2;
              let totalMins = 0;
              if (s1?.active) {
                totalMins += Math.max(0, timeToMinutes(s1.end) - timeToMinutes(s1.start));
              }
              if (s2?.active) {
                totalMins += Math.max(0, timeToMinutes(s2.end) - timeToMinutes(s2.start));
              }
              staffCapacityHours = totalMins / 60;

              bookedMinutes = dayAppointments
                .filter((a) => a.status !== 'cancelado')
                .reduce((acc, a) => acc + (a.durationMinutes || 30), 0);
            }

            const bookedHours = (bookedMinutes / 60).toFixed(1);
            const occupancyPct =
              staffCapacityHours > 0
                ? Math.min(100, Math.round((bookedMinutes / (staffCapacityHours * 60)) * 100))
                : 0;

            // Compute list of active staff on this day when viewing "todos"
            const activeStaffOnThisDay =
              selectedStaffId === 'todos'
                ? staff.filter((s) => {
                    const sched = getStaffDaySchedule(s, day.dayOfWeek);
                    return sched.active;
                  })
                : [];

            return (
              <div
                key={day.dateStr}
                className={`flex flex-col bg-white transition-all ${
                  isMobileVisible ? 'flex' : 'hidden lg:flex'
                }`}
              >
                {/* Day Header */}
                <div
                  className={`p-2.5 sm:p-3 text-center border-b-2 border-slate-200 transition-colors ${
                    isToday ? 'bg-blue-100/70' : 'bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between lg:justify-center gap-1.5">
                    <span className="text-[11px] font-black text-[#0F172A] uppercase tracking-wider block">
                      {day.dayName}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-[#1E3A8A] text-white rounded-md">
                        Hoy
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mt-0.5">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-black ${
                        isToday ? 'bg-[#1E3A8A] text-white shadow-xs' : 'text-[#0F172A]'
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                    <span className="text-[11px] text-slate-700 font-bold">
                      · {dayAppointments.length} turnos
                    </span>
                  </div>
                </div>

                {/* SCHEDULE / SHIFTS HEADER BOX FOR THIS DAY */}
                <div className="p-2 border-b border-slate-200 bg-slate-50/80 space-y-1.5 text-[11px]">
                  {activeStaffMember && singleStaffSchedule ? (
                    singleStaffSchedule.active ? (
                      <div className="space-y-1">
                        {/* Shifts Badges */}
                        <div className="space-y-1">
                          {singleStaffSchedule.branchShifts?.sucursal_1?.active && (
                            <div className="px-1.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-950 font-bold flex items-center justify-between text-[10px]">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A8A]" />
                                <span className="font-black text-[#1E3A8A]">Montevideo:</span>
                              </span>
                              <span>
                                {singleStaffSchedule.branchShifts.sucursal_1.start} - {singleStaffSchedule.branchShifts.sucursal_1.end}
                              </span>
                            </div>
                          )}

                          {singleStaffSchedule.branchShifts?.sucursal_2?.active && (
                            <div className="px-1.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-950 font-bold flex items-center justify-between text-[10px]">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-700" />
                                <span className="font-black text-indigo-800">Rioja:</span>
                              </span>
                              <span>
                                {singleStaffSchedule.branchShifts.sucursal_2.start} - {singleStaffSchedule.branchShifts.sucursal_2.end}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Breaks Indicator */}
                        {(() => {
                          const allBreaks = [
                            ...(singleStaffSchedule.branchShifts?.sucursal_1?.breaks || []),
                            ...(singleStaffSchedule.branchShifts?.sucursal_2?.breaks || []),
                            ...(singleStaffSchedule.breaks || []),
                          ];
                          if (allBreaks.length === 0) return null;
                          return (
                            <div className="text-[9px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Coffee className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                              <span className="truncate">
                                Pausas: {allBreaks.map((b) => `${b.start}-${b.end}`).join(', ')}
                              </span>
                            </div>
                          );
                        })()}

                        {/* Capacity Progress Bar */}
                        {staffCapacityHours > 0 && (
                          <div className="pt-0.5 space-y-0.5">
                            <div className="flex items-center justify-between text-[9px] font-bold text-slate-600">
                              <span>Capacidad: {bookedHours}h / {staffCapacityHours}h</span>
                              <span className="font-black text-[#1E3A8A]">{occupancyPct}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all rounded-full ${
                                  occupancyPct > 90
                                    ? 'bg-rose-500'
                                    : occupancyPct > 60
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${occupancyPct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-1 px-1.5 bg-slate-200/60 rounded-lg text-center text-slate-500 font-bold text-[10px]">
                        ⏸ Franco / Día de Descanso
                      </div>
                    )
                  ) : (
                    /* All Staff View: show summary of professionals working */
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-black text-slate-700 mb-1">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-[#1E3A8A]" />
                          <span>Staff disponible:</span>
                        </span>
                        <span className="bg-blue-100 text-blue-900 px-1 rounded text-[9px]">
                          {activeStaffOnThisDay.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {activeStaffOnThisDay.slice(0, 4).map((st) => {
                          const sched = getStaffDaySchedule(st, day.dayOfWeek);
                          const hasS1 = sched.branchShifts?.sucursal_1?.active;
                          const hasS2 = sched.branchShifts?.sucursal_2?.active;
                          const branchTag = hasS1 && hasS2 ? 'M+R' : hasS1 ? 'M' : 'R';
                          return (
                            <span
                              key={st.id}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-white border border-slate-300 text-[#0F172A]"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: st.color || '#1E3A8A' }}
                              />
                              <span className="truncate max-w-[65px]">{st.name.split(' ')[0]}</span>
                              <span className="text-[8px] px-1 rounded bg-slate-100 text-slate-700">
                                {branchTag}
                              </span>
                            </span>
                          );
                        })}
                        {activeStaffOnThisDay.length > 4 && (
                          <span className="text-[9px] text-slate-500 font-bold self-center">
                            +{activeStaffOnThisDay.length - 4} más
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* APPOINTMENTS CARDS LIST */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[500px] bg-slate-50/20">
                  {dayAppointments.length === 0 ? (
                    <div
                      onClick={() => onDayClick(day.dateStr)}
                      className="h-32 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#1E3A8A] hover:bg-blue-50/40 cursor-pointer flex flex-col items-center justify-center text-slate-500 hover:text-[#1E3A8A] transition-all text-xs group p-2 text-center"
                    >
                      <Plus className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform stroke-[2.5]" />
                      <span className="font-bold text-[#0F172A]">Sin turnos agendados</span>
                      <span className="text-[10px] text-slate-500 font-semibold group-hover:text-[#1E3A8A]">
                        Toca para abrir agenda
                      </span>
                    </div>
                  ) : (
                    dayAppointments.map((apt) => {
                      const status = getStatusBadge(apt.status);
                      const staffMember = staff.find((s) => s.id === apt.staffId);
                      const cardColor = apt.color || staffMember?.color || '#1E3A8A';
                      const isMontevideo = apt.branchId !== 'sucursal_2';

                      return (
                        <div
                          key={apt.id}
                          onClick={() => onSelectAppointment(apt)}
                          className={`p-2.5 rounded-xl border-2 bg-white hover:border-[#1E3A8A] hover:shadow-md cursor-pointer transition-all relative overflow-hidden group space-y-1.5 ${
                            isMontevideo
                              ? 'border-blue-200/90 hover:border-[#1E3A8A]'
                              : 'border-indigo-200/90 hover:border-indigo-700'
                          } ${apt.status === 'cancelado' ? 'opacity-50 line-through' : ''}`}
                        >
                          {/* Left colored staff accent bar */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-1.5"
                            style={{ backgroundColor: cardColor }}
                          />

                          <div className="pl-1.5 space-y-1">
                            {/* Branch and Status Header */}
                            <div className="flex items-center justify-between text-xs font-bold gap-1">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black truncate flex items-center gap-1 ${
                                  isMontevideo
                                    ? 'bg-[#1E3A8A] text-white'
                                    : 'bg-indigo-700 text-white'
                                }`}
                              >
                                <Building2 className="w-2.5 h-2.5" />
                                <span>{isMontevideo ? 'Montevideo' : 'Rioja'}</span>
                              </span>

                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border shrink-0 ${status.bg}`}>
                                {status.label}
                              </span>
                            </div>

                            {/* Time & Duration */}
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black text-[#1E3A8A] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                {apt.time} hs ({apt.durationMinutes || 30}m)
                              </span>
                              <span className="font-extrabold text-xs text-[#0F172A]">
                                {formatCurrency(apt.price, business?.currency)}
                              </span>
                            </div>

                            {/* Client Name */}
                            <div className="font-black text-xs text-[#0F172A] group-hover:text-[#1E3A8A] truncate flex items-center gap-1">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: cardColor }}
                              />
                              <span className="truncate">{apt.clientName}</span>
                            </div>

                            {/* Service Name */}
                            <div className="text-[11px] text-slate-700 font-bold truncate flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-blue-700 shrink-0" />
                              <span className="truncate">{apt.serviceName}</span>
                            </div>

                            {/* Staff Name (if viewing all staff) */}
                            {selectedStaffId === 'todos' && (
                              <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-700 font-bold">
                                <span className="truncate flex items-center gap-1">
                                  <User className="w-2.5 h-2.5 text-slate-500" />
                                  <span>{apt.staffName}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Day Footer Action Button */}
                <div className="p-2 border-t-2 border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => onDayClick(day.dateStr)}
                    className="w-full py-1.5 bg-slate-50 hover:bg-blue-50 text-[#0F172A] hover:text-[#1E3A8A] border border-slate-300 hover:border-blue-300 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Abrir día</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
