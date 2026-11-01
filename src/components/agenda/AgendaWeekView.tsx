import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Building2,
  User,
  Sparkles,
  Plus,
  Coffee,
  Users,
} from 'lucide-react';
import { Appointment } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, getStatusBadge } from '../../utils/formatters';
import { getTodayDateString } from '../../utils/initialData';
import {
  SCOPE_NAMES,
  SCOPE_SHORT_NAMES,
  parseDateDayOfWeek,
  getStaffDaySchedule,
  getStaffEffectiveShift,
  formatShiftRanges,
  getShiftNetMinutes,
} from '../../utils/staffSchedule';

interface AgendaWeekViewProps {
  currentDate: string;
  selectedStaffId: string;
  onSelectAppointment: (appointment: Appointment) => void;
  onDayClick: (date: string) => void;
  onNewAppointment?: (date?: string) => void;
  onGoToStaff?: () => void;
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
  onNewAppointment,
  onGoToStaff,
}: AgendaWeekViewProps) {
  const { appointments, staff, selectedBranch, business } = useApp();
  const todayStr = getTodayDateString();

  const [mobileActiveDayIndex, setMobileActiveDayIndex] = useState<number>(() => {
    const dow = parseDateDayOfWeek(currentDate);
    return Number.isFinite(dow) ? dow : 1;
  });

  // Keep mobile active day synced whenever currentDate changes via navigation
  useEffect(() => {
    const dow = parseDateDayOfWeek(currentDate);
    setMobileActiveDayIndex(Number.isFinite(dow) ? dow : 1);
  }, [currentDate]);

  // Calculate 7 days of the current week (starting Monday)
  const weekDays = useMemo(() => {
    const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(currentDate)
      ? currentDate
      : getTodayDateString();
    const [y, m, d] = safeDate.split('-').map(Number);
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

  const effectiveMobileDayIndex = useMemo(() => {
    if (weekDays.some((d) => d.dayOfWeek === mobileActiveDayIndex)) {
      return mobileActiveDayIndex;
    }
    return weekDays[0]?.dayOfWeek ?? 1;
  }, [weekDays, mobileActiveDayIndex]);

  const weekRangeTitle = useMemo(() => {
    if (weekDays.length < 7) return 'Semana actual';
    const first = new Date(weekDays[0].dateStr + 'T12:00:00');
    const last = new Date(weekDays[6].dateStr + 'T12:00:00');
    const firstMonth = first.toLocaleDateString('es-AR', { month: 'long' });
    const lastMonth = last.toLocaleDateString('es-AR', { month: 'long' });
    const firstYear = first.getFullYear();
    const lastYear = last.getFullYear();

    if (firstMonth === lastMonth && firstYear === lastYear) {
      return `Semana del ${weekDays[0].dayNumber} al ${weekDays[6].dayNumber} de ${firstMonth} de ${firstYear}`;
    }
    if (firstYear === lastYear) {
      return `Semana del ${weekDays[0].dayNumber} de ${firstMonth} al ${weekDays[6].dayNumber} de ${lastMonth} de ${firstYear}`;
    }
    return `Semana del ${weekDays[0].dayNumber} de ${firstMonth} ${firstYear} al ${weekDays[6].dayNumber} de ${lastMonth} ${lastYear}`;
  }, [weekDays]);

  const activeStaffMember = useMemo(() => {
    if (selectedStaffId === 'todos') return null;
    return staff.find((s) => s.id === selectedStaffId) || null;
  }, [selectedStaffId, staff]);

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

  const activeStaffCount = useMemo(() => staff.filter((s) => s.active).length, [staff]);

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
                  {weekRangeTitle}
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
                Sucursal activa: <strong>{SCOPE_NAMES[selectedBranch]}</strong> · Horarios y
                turnos reales por día
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 border-2 border-[#1E3A8A]/30 text-[#1E3A8A] text-xs font-black">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1E3A8A]" />
              <span>Soham Montevideo</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border-2 border-[#D4AF37] text-[#0F172A] text-xs font-black">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />
              <span>Soham Rioja</span>
            </div>
          </div>
        </div>

        {/* Weekly Stats Pills */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-600 block">
              Turnos en {SCOPE_SHORT_NAMES[selectedBranch]}
            </span>
            <span className="text-sm sm:text-base font-black text-[#0F172A]">
              {weekStats.totalAppointments}
            </span>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-600 block">
              Horas de servicio
            </span>
            <span className="text-sm sm:text-base font-black text-[#1E3A8A]">
              {weekStats.totalHours} hs
            </span>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-600 block">
              Facturación prevista
            </span>
            <span className="text-sm sm:text-base font-black text-emerald-800">
              {formatCurrency(weekStats.totalRevenue, business?.currency)}
            </span>
          </div>
        </div>

        {/* Clear Empty Week Notice when 0 turns exist */}
        {weekStats.totalAppointments === 0 && (
          <div className="p-3 rounded-xl bg-blue-50 border-2 border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="font-bold text-slate-800">
              <strong className="font-black text-[#0F172A]">
                Agenda semanal vacía en {SCOPE_NAMES[selectedBranch]}:
              </strong>{' '}
              {activeStaffCount === 0
                ? 'Todavía no hay profesionales ni turnos cargados. La grilla de lunes a domingo ya está lista.'
                : 'No hay turnos agendados en esta semana. Seleccioná un día disponible para agendar.'}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {activeStaffCount === 0 && onGoToStaff && (
                <button
                  type="button"
                  onClick={onGoToStaff}
                  className="px-3 py-1.5 rounded-xl bg-[#1E3A8A] hover:bg-blue-900 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Cargar Profesionales</span>
                </button>
              )}
              {onNewAppointment && (
                <button
                  type="button"
                  onClick={() => onNewAppointment(currentDate)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-[#0F172A] border border-slate-300 text-xs font-black flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Turno</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MOBILE DAY SELECTOR TABS */}
      <div className="lg:hidden flex overflow-x-auto gap-1 pb-1 scrollbar-none">
        {weekDays.map((day) => {
          const isSelected = effectiveMobileDayIndex === day.dayOfWeek;
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

      {/* WEEKLY GRID CONTAINER */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-xs overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-7 divide-y lg:divide-y-0 lg:divide-x-2 divide-slate-200 min-h-[540px]">
          {weekDays.map((day) => {
            const isToday = day.dateStr === todayStr;
            const isMobileVisible = effectiveMobileDayIndex === day.dayOfWeek;

            const dayAppointments = appointments
              .filter((a) => {
                if (a.date !== day.dateStr) return false;
                if (selectedStaffId !== 'todos' && a.staffId !== selectedStaffId) return false;
                return true;
              })
              .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

            const isSingleBlocked = Boolean(activeStaffMember?.blockedDates?.includes(day.dateStr));
            const singleStaffSchedule = activeStaffMember
              ? getStaffDaySchedule(activeStaffMember, day.dayOfWeek)
              : null;

            const effS1 = singleStaffSchedule
              ? getStaffEffectiveShift(singleStaffSchedule, 'sucursal_1')
              : null;
            const effS2 = singleStaffSchedule
              ? getStaffEffectiveShift(singleStaffSchedule, 'sucursal_2')
              : null;
            const effSelected =
              singleStaffSchedule && selectedBranch !== 'ambas'
                ? getStaffEffectiveShift(singleStaffSchedule, selectedBranch)
                : null;

            const singleWorksInScope = Boolean(
              singleStaffSchedule?.active &&
                (selectedBranch === 'ambas'
                  ? effS1?.active || effS2?.active
                  : effSelected?.active)
            );

            let staffCapacityHours = 0;
            let bookedMinutes = 0;
            if (singleWorksInScope && !isSingleBlocked) {
              const netMin =
                selectedBranch === 'ambas'
                  ? (effS1?.active ? getShiftNetMinutes(effS1) : 0) +
                    (effS2?.active ? getShiftNetMinutes(effS2) : 0)
                  : effSelected
                  ? getShiftNetMinutes(effSelected)
                  : 0;
              staffCapacityHours = Number((netMin / 60).toFixed(1));
              bookedMinutes = dayAppointments
                .filter((a) => a.status !== 'cancelado')
                .reduce((acc, a) => acc + (a.durationMinutes || 30), 0);
            }

            const bookedHours = (bookedMinutes / 60).toFixed(1);
            const occupancyPct =
              staffCapacityHours > 0
                ? Math.min(100, Math.round((bookedMinutes / (staffCapacityHours * 60)) * 100))
                : 0;

            // Active staff on this day in the selected branch when viewing "todos"
            const activeStaffInBranchToday =
              selectedStaffId === 'todos'
                ? staff.filter((s) => {
                    if (!s.active || s.blockedDates?.includes(day.dateStr)) return false;
                    const sched = getStaffDaySchedule(s, day.dayOfWeek);
                    if (!sched.active) return false;
                    if (selectedBranch === 'ambas') {
                      return (
                        getStaffEffectiveShift(sched, 'sucursal_1').active ||
                        getStaffEffectiveShift(sched, 'sucursal_2').active
                      );
                    }
                    return getStaffEffectiveShift(sched, selectedBranch).active;
                  })
                : [];

            const isDayAvailableInBranch = activeStaffMember
              ? !isSingleBlocked && singleWorksInScope
              : activeStaffInBranchToday.length > 0;

            return (
              <div
                key={day.dateStr}
                className={`flex flex-col transition-all ${
                  isMobileVisible ? 'flex' : 'hidden lg:flex'
                } ${isDayAvailableInBranch ? 'bg-white' : 'bg-slate-50/70'}`}
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
                      · {dayAppointments.filter((a) => a.status !== 'cancelado').length} turnos
                    </span>
                  </div>
                </div>

                {/* SCHEDULE / SHIFTS HEADER BOX FOR THIS DAY */}
                <div className="p-2 border-b border-slate-200 bg-slate-50/80 space-y-1.5 text-[11px]">
                  {activeStaffMember && singleStaffSchedule ? (
                    isSingleBlocked ? (
                      <div className="py-1.5 px-2 bg-rose-50 border border-rose-200 rounded-lg text-center text-rose-800 font-black text-[10px]">
                        Fecha bloqueada · No disponible
                      </div>
                    ) : !singleStaffSchedule.active ? (
                      <div className="py-1.5 px-2 bg-slate-200/70 rounded-lg text-center text-slate-600 font-black text-[10px]">
                        No trabaja · No disponible
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {effS1?.active && (
                          <div
                            className={`px-1.5 py-1 rounded-lg border text-[10px] font-bold ${
                              selectedBranch === 'sucursal_1'
                                ? 'bg-blue-50 border-blue-300 text-blue-950'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            <span className="font-black text-[#1E3A8A] block">Montevideo:</span>
                            <span>{formatShiftRanges(effS1.ranges)}</span>
                          </div>
                        )}

                        {effS2?.active && (
                          <div
                            className={`px-1.5 py-1 rounded-lg border text-[10px] font-bold ${
                              selectedBranch === 'sucursal_2' || selectedBranch === 'ambas'
                                ? 'bg-amber-50 border-[#D4AF37] text-[#0F172A]'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            <span className="font-black text-[#0F172A] block">Rioja:</span>
                            <span>{formatShiftRanges(effS2.ranges)}</span>
                          </div>
                        )}

                        {selectedBranch !== 'ambas' && !effSelected?.active && (
                          <div className="text-[9.5px] font-black text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-center">
                            No atiende en {SCOPE_SHORT_NAMES[selectedBranch]}
                          </div>
                        )}

                        {effSelected && effSelected.breaks.length > 0 && (
                          <div className="text-[9px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Coffee className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                            <span className="truncate">
                              Pausa:{' '}
                              {effSelected.breaks
                                .map((b) => `${b.start}-${b.end}`)
                                .join(', ')}
                            </span>
                          </div>
                        )}

                        {staffCapacityHours > 0 && (
                          <div className="pt-0.5 space-y-0.5">
                            <div className="flex items-center justify-between text-[9px] font-bold text-slate-600">
                              <span>
                                Ocupado: {bookedHours}h / {staffCapacityHours}h
                              </span>
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
                    )
                  ) : (
                    /* All Staff View: show professionals attending in selectedBranch */
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-black text-slate-700 mb-1">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-[#1E3A8A]" />
                          <span>En {SCOPE_SHORT_NAMES[selectedBranch]}:</span>
                        </span>
                        <span className="bg-blue-100 text-blue-900 px-1 rounded text-[9px]">
                          {activeStaffInBranchToday.length}
                        </span>
                      </div>
                      {activeStaffCount === 0 ? (
                        <div className="text-[9.5px] font-bold text-slate-600 py-1 px-1.5 text-center bg-slate-200/60 rounded">
                          Base 08:00 - 20:30 hs · Sin prof.
                        </div>
                      ) : activeStaffInBranchToday.length === 0 ? (
                        <div className="text-[9.5px] font-bold text-slate-500 py-1 text-center bg-slate-200/60 rounded">
                          Sin profesionales disponibles
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {activeStaffInBranchToday.map((st) => {
                            const sched = getStaffDaySchedule(st, day.dayOfWeek);
                            const hoursLabel =
                              selectedBranch === 'ambas'
                                ? [
                                    getStaffEffectiveShift(sched, 'sucursal_1').active
                                      ? `Mvd ${formatShiftRanges(getStaffEffectiveShift(sched, 'sucursal_1').ranges)}`
                                      : null,
                                    getStaffEffectiveShift(sched, 'sucursal_2').active
                                      ? `Rioja ${formatShiftRanges(getStaffEffectiveShift(sched, 'sucursal_2').ranges)}`
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' / ')
                                : formatShiftRanges(getStaffEffectiveShift(sched, selectedBranch).ranges);
                            return (
                              <div
                                key={st.id}
                                className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-white border border-slate-300 text-[#0F172A] truncate"
                                title={`${st.name}: ${hoursLabel}`}
                              >
                                <span
                                  className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                                  style={{ backgroundColor: st.color || '#1E3A8A' }}
                                />
                                {st.name.split(' ')[0]}: {hoursLabel}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* APPOINTMENTS CARDS LIST */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[500px] bg-slate-50/20">
                  {dayAppointments.length === 0 ? (
                    isDayAvailableInBranch ? (
                      <div
                        onClick={() => onDayClick(day.dateStr)}
                        className="h-32 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#1E3A8A] hover:bg-blue-50/40 cursor-pointer flex flex-col items-center justify-center text-slate-500 hover:text-[#1E3A8A] transition-all text-xs group p-2 text-center"
                      >
                        <Plus className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform stroke-[2.5]" />
                        <span className="font-bold text-[#0F172A]">Espacios disponibles</span>
                        <span className="text-[10px] text-slate-500 font-semibold group-hover:text-[#1E3A8A]">
                          Toca para ver horarios del día
                        </span>
                      </div>
                    ) : activeStaffCount === 0 ? (
                      <div
                        onClick={() => onDayClick(day.dateStr)}
                        className="h-32 rounded-xl border border-dashed border-slate-300 bg-slate-100/80 hover:border-[#1E3A8A] cursor-pointer flex flex-col items-center justify-center text-slate-600 text-xs p-2 text-center"
                      >
                        <span className="font-black text-slate-700">Agenda vacía</span>
                        <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                          Sin turnos ni profesionales cargados
                        </span>
                      </div>
                    ) : (
                      <div className="h-32 rounded-xl border border-dashed border-slate-300 bg-slate-100/70 flex flex-col items-center justify-center text-slate-400 text-xs p-2 text-center select-none">
                        <span className="font-black text-slate-500">No disponible</span>
                        <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Día sin atención en {SCOPE_SHORT_NAMES[selectedBranch]}
                        </span>
                      </div>
                    )
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
                          <div
                            className="absolute left-0 top-0 bottom-0 w-1.5"
                            style={{ backgroundColor: cardColor }}
                          />

                          <div className="pl-1.5 space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold gap-1">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black truncate flex items-center gap-1 ${
                                  isMontevideo
                                    ? 'bg-[#1E3A8A] text-white'
                                    : 'bg-amber-100 text-[#0F172A] border border-[#D4AF37]'
                                }`}
                              >
                                <Building2 className="w-2.5 h-2.5" />
                                <span>{isMontevideo ? 'Montevideo' : 'Rioja'}</span>
                              </span>

                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold border shrink-0 ${status.bg}`}
                              >
                                {status.label}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black text-[#1E3A8A] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                {apt.time} hs ({apt.durationMinutes || 30}m)
                              </span>
                              <span className="font-extrabold text-xs text-[#0F172A]">
                                {formatCurrency(apt.price, business?.currency)}
                              </span>
                            </div>

                            <div className="font-black text-xs text-[#0F172A] group-hover:text-[#1E3A8A] truncate flex items-center gap-1">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: cardColor }}
                              />
                              <span className="truncate">{apt.clientName}</span>
                            </div>

                            <div className="text-[11px] text-slate-700 font-bold truncate flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-blue-700 shrink-0" />
                              <span className="truncate">{apt.serviceName}</span>
                            </div>

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
                    <span>Ver día</span>
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
