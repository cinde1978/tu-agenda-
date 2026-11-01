import React, { useMemo } from 'react';
import { Calendar, Building2, Plus, Users } from 'lucide-react';
import { Appointment } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { getTodayDateString } from '../../utils/initialData';
import {
  SCOPE_NAMES,
  SCOPE_SHORT_NAMES,
  parseDateDayOfWeek,
  getStaffDaySchedule,
  getStaffEffectiveShift,
  formatShiftRanges,
} from '../../utils/staffSchedule';

interface AgendaMonthViewProps {
  currentDate: string;
  selectedStaffId: string;
  onSelectDay: (date: string) => void;
  onSelectAppointment: (appointment: Appointment) => void;
  onNewAppointment?: (date?: string) => void;
  onGoToStaff?: () => void;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function AgendaMonthView({
  currentDate,
  selectedStaffId,
  onSelectDay,
  onSelectAppointment,
  onNewAppointment,
  onGoToStaff,
}: AgendaMonthViewProps) {
  const { appointments, staff, selectedBranch, business } = useApp();
  const todayStr = getTodayDateString();

  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(currentDate)
    ? currentDate
    : getTodayDateString();
  const [year, month] = safeDate.split('-').map(Number);

  const monthTitle = useMemo(() => {
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  }, [year, month]);

  const activeStaffList = useMemo(() => staff.filter((s) => s.active), [staff]);

  const focusedStaff = useMemo(() => {
    if (selectedStaffId === 'todos') return null;
    return staff.find((s) => s.id === selectedStaffId) || null;
  }, [selectedStaffId, staff]);

  const monthPrefix = `${year}-${String(month).padStart(2, '0')}-`;
  const monthAppointments = useMemo(() => {
    return appointments.filter(
      (a) =>
        a.date.startsWith(monthPrefix) &&
        a.status !== 'cancelado' &&
        (selectedStaffId === 'todos' || a.staffId === selectedStaffId)
    );
  }, [appointments, monthPrefix, selectedStaffId]);

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
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-xs overflow-hidden">
      {/* Month Overview Header & Empty State Notice */}
      <div className="p-4 bg-slate-100 border-b-2 border-slate-200 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#1E3A8A] text-white font-black text-xs">
              <Building2 className="w-3.5 h-3.5" />
              <span>{SCOPE_NAMES[selectedBranch]}</span>
            </span>
            <h3 className="font-black text-sm sm:text-base text-[#0F172A] capitalize flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#1E3A8A]" />
              <span>{monthTitle}</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-300 text-xs font-black text-[#0F172A]">
              {monthAppointments.length} turno(s) en el mes
            </span>
          </div>

          <span className="text-xs font-bold text-slate-600">
            Seleccioná cualquier día del calendario para abrir su detalle horario
          </span>
        </div>

        {monthAppointments.length === 0 && (
          <div className="p-3 rounded-xl bg-blue-50 border-2 border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="font-bold text-slate-800">
              <strong className="font-black text-[#0F172A]">
                Agenda mensual vacía ({monthTitle}):
              </strong>{' '}
              {activeStaffList.length === 0
                ? `Aún no hay profesionales ni turnos cargados en ${SCOPE_NAMES[selectedBranch]}.`
                : `Todavía no hay turnos registrados para este mes en ${SCOPE_NAMES[selectedBranch]}.`}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {activeStaffList.length === 0 && onGoToStaff && (
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
                  onClick={() => onNewAppointment(safeDate)}
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

      {/* Month Days Header */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-black text-[#0F172A] py-3">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      {/* Grid of days */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 min-h-[520px]">
        {calendarDays.map((day) => {
          const isToday = day.dateStr === todayStr;
          const dow = parseDateDayOfWeek(day.dateStr);

          const dayAppointments = appointments.filter((a) => {
            if (a.date !== day.dateStr) return false;
            if (selectedStaffId !== 'todos' && a.staffId !== selectedStaffId) return false;
            return true;
          });

          const activeDayAppointments = dayAppointments.filter((a) => a.status !== 'cancelado');

          const dayRevenue = activeDayAppointments.reduce(
            (sum, a) => sum + (a.price || 0),
            0
          );

          // Availability badge for focused staff or all staff in selectedBranch
          let availabilityBadge: { text: string; active: boolean } | null = null;
          if (focusedStaff) {
            if (focusedStaff.blockedDates?.includes(day.dateStr)) {
              availabilityBadge = { text: 'Bloqueado', active: false };
            } else {
              const sched = getStaffDaySchedule(focusedStaff, dow);
              if (!sched.active) {
                availabilityBadge = { text: 'No trabaja', active: false };
              } else if (selectedBranch === 'ambas') {
                const effS1 = getStaffEffectiveShift(sched, 'sucursal_1');
                const effS2 = getStaffEffectiveShift(sched, 'sucursal_2');
                if (!effS1.active && !effS2.active) {
                  availabilityBadge = { text: 'No trabaja', active: false };
                } else {
                  availabilityBadge = {
                    text: [
                      effS1.active ? `Mvd ${formatShiftRanges(effS1.ranges)}` : null,
                      effS2.active ? `Rioja ${formatShiftRanges(effS2.ranges)}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · '),
                    active: true,
                  };
                }
              } else {
                const eff = getStaffEffectiveShift(sched, selectedBranch);
                if (!eff.active) {
                  availabilityBadge = {
                    text: `Sin ${SCOPE_SHORT_NAMES[selectedBranch]}`,
                    active: false,
                  };
                } else {
                  availabilityBadge = {
                    text: formatShiftRanges(eff.ranges),
                    active: true,
                  };
                }
              }
            }
          } else if (activeStaffList.length > 0) {
            const workingHere = activeStaffList.filter((st) => {
              if (st.blockedDates?.includes(day.dateStr)) return false;
              const sched = getStaffDaySchedule(st, dow);
              if (!sched.active) return false;
              if (selectedBranch === 'ambas') {
                return (
                  getStaffEffectiveShift(sched, 'sucursal_1').active ||
                  getStaffEffectiveShift(sched, 'sucursal_2').active
                );
              }
              return getStaffEffectiveShift(sched, selectedBranch).active;
            });

            if (workingHere.length === 0) {
              availabilityBadge = { text: 'No trabaja', active: false };
            } else if (workingHere.length === 1 && selectedBranch !== 'ambas') {
              const eff = getStaffEffectiveShift(
                getStaffDaySchedule(workingHere[0], dow),
                selectedBranch
              );
              availabilityBadge = {
                text: formatShiftRanges(eff.ranges),
                active: true,
              };
            } else {
              availabilityBadge = {
                text: `${workingHere.length} prof. disp.`,
                active: true,
              };
            }
          } else if (day.isCurrentMonth) {
            availabilityBadge = {
              text: 'Agenda vacía',
              active: false,
            };
          }

          return (
            <div
              key={day.dateStr}
              onClick={() => onSelectDay(day.dateStr)}
              className={`min-h-[105px] sm:min-h-[120px] p-2 flex flex-col justify-between hover:bg-blue-50/40 cursor-pointer transition-colors relative group ${
                !day.isCurrentMonth
                  ? 'bg-slate-50/50 opacity-40'
                  : availabilityBadge && !availabilityBadge.active
                  ? 'bg-slate-50/80'
                  : 'bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    isToday ? 'bg-[#1E3A8A] text-white shadow-xs' : 'text-[#0F172A]'
                  }`}
                >
                  {day.dayNum}
                </span>

                {activeDayAppointments.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-[#1E3A8A] border border-blue-200">
                    {activeDayAppointments.length}t
                  </span>
                )}
              </div>

              {/* Schedule Availability Pill */}
              {availabilityBadge && (
                <div
                  className={`mt-1 px-1.5 py-0.5 rounded text-[9.5px] font-black truncate ${
                    availabilityBadge.active
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                  title={availabilityBadge.text}
                >
                  {availabilityBadge.text}
                </div>
              )}

              {/* Day occupied appointments preview */}
              <div className="space-y-1 my-1">
                {activeDayAppointments.slice(0, 2).map((apt) => (
                  <div
                    key={apt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAppointment(apt);
                    }}
                    className="text-[10px] truncate px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-[#0F172A] border border-blue-200 font-bold transition-colors"
                  >
                    {apt.time} · {(apt.clientName || 'Cliente').split(' ')[0]}
                  </div>
                ))}
                {activeDayAppointments.length > 2 && (
                  <div className="text-[9px] text-slate-500 font-bold pl-1">
                    +{activeDayAppointments.length - 2} más
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
