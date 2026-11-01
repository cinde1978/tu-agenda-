import React, { useMemo } from 'react';
import { Plus, User, Sparkles, Building2, Coffee, AlertCircle, Calendar, Users } from 'lucide-react';
import { Appointment, BranchId } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDateSpanishLong, getStatusBadge, openWhatsAppTurno } from '../../utils/formatters';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';
import {
  BRANCH_NAMES,
  BRANCH_SHORT_NAMES,
  SCOPE_NAMES,
  DAY_LABELS,
  parseDateDayOfWeek,
  getStaffDaySchedule,
  getStaffEffectiveShift,
  formatShiftRanges,
  getSlotAvailabilityForStaff,
  timeToMinutes,
  minutesToTime,
} from '../../utils/staffSchedule';

interface AgendaDayViewProps {
  currentDate: string;
  selectedStaffId: string;
  onSelectAppointment: (appointment: Appointment) => void;
  onSlotClick: (time: string, staffId?: string, branchId?: BranchId) => void;
  onOpenWhatsApp: (appointment: Appointment) => void;
  onNewAppointment?: () => void;
  onGoToStaff?: () => void;
}

const DEFAULT_START_HOUR = 8; // 08:00
const DEFAULT_END_HOUR = 21; // 21:00
const HOUR_HEIGHT = 80; // 80px per 60 minutes
const SLOT_HEIGHT = 40; // 40px per 30 minutes

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const total = timeToMinutes(startTime) + (durationMinutes || 30);
  return minutesToTime(total);
}

interface LayoutItem {
  appointment: Appointment;
  top: number;
  height: number;
  leftPercent: number;
  widthPercent: number;
}

function computeAppointmentLayout(
  appointments: Appointment[],
  dayStartMinutes: number,
  hourHeight: number,
  leaveRoomForFreeSlots = false
): LayoutItem[] {
  if (appointments.length === 0) return [];

  const sorted = [...appointments].sort((a, b) => {
    const aStart = timeToMinutes(a.time);
    const bStart = timeToMinutes(b.time);
    if (aStart !== bStart) return aStart - bStart;
    return (b.durationMinutes || 30) - (a.durationMinutes || 30);
  });

  const clusters: Appointment[][] = [];
  let currentCluster: Appointment[] = [];
  let clusterEnd = -1;

  for (const apt of sorted) {
    const start = timeToMinutes(apt.time);
    const duration = apt.durationMinutes || 30;
    const end = start + duration;

    if (currentCluster.length === 0) {
      currentCluster.push(apt);
      clusterEnd = end;
    } else if (start < clusterEnd) {
      currentCluster.push(apt);
      clusterEnd = Math.max(clusterEnd, end);
    } else {
      clusters.push(currentCluster);
      currentCluster = [apt];
      clusterEnd = end;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const result: LayoutItem[] = [];

  for (const cluster of clusters) {
    const columnEnds: number[] = [];
    const positions: Array<{ apt: Appointment; col: number }> = [];

    for (const apt of cluster) {
      const start = timeToMinutes(apt.time);
      const duration = apt.durationMinutes || 30;
      const end = start + duration;

      let colIndex = columnEnds.findIndex((colEnd) => colEnd <= start);
      if (colIndex === -1) {
        colIndex = columnEnds.length;
        columnEnds.push(end);
      } else {
        columnEnds[colIndex] = end;
      }
      positions.push({ apt, col: colIndex });
    }

    const totalCols = columnEnds.length;
    const usableTotalWidth = leaveRoomForFreeSlots ? 76 : 100;
    for (const pos of positions) {
      const start = timeToMinutes(pos.apt.time);
      const duration = pos.apt.durationMinutes || 30;
      const top = ((start - dayStartMinutes) / 60) * hourHeight;
      const height = Math.max(38, (duration / 60) * hourHeight - 2);
      const widthPercent = usableTotalWidth / totalCols;
      const leftPercent = pos.col * widthPercent;

      result.push({
        appointment: pos.apt,
        top,
        height,
        leftPercent,
        widthPercent,
      });
    }
  }

  return result;
}

export function AgendaDayView({
  currentDate,
  selectedStaffId,
  onSelectAppointment,
  onSlotClick,
  onOpenWhatsApp,
  onNewAppointment,
  onGoToStaff,
}: AgendaDayViewProps) {
  const {
    appointments,
    allAppointments,
    staff,
    selectedBranch,
    activeSingleBranch,
    setSelectedBranch,
    business,
  } = useApp();

  const sourceAppointments = useMemo(() => {
    return Array.isArray(allAppointments) ? allAppointments : appointments;
  }, [allAppointments, appointments]);

  const dayOfWeek = useMemo(() => parseDateDayOfWeek(currentDate), [currentDate]);
  const dayName = DAY_LABELS.find((l) => l.day === dayOfWeek)?.name || 'este día';

  const activeStaffList = useMemo(() => staff.filter((s) => s.active), [staff]);
  const focusedStaff = useMemo(
    () =>
      selectedStaffId !== 'todos'
        ? activeStaffList.find((s) => s.id === selectedStaffId) || null
        : null,
    [activeStaffList, selectedStaffId]
  );

  const focusedSchedule = useMemo(
    () => (focusedStaff ? getStaffDaySchedule(focusedStaff, dayOfWeek) : null),
    [focusedStaff, dayOfWeek]
  );

  const focusedEffS1 = useMemo(
    () => (focusedSchedule ? getStaffEffectiveShift(focusedSchedule, 'sucursal_1') : null),
    [focusedSchedule]
  );
  const focusedEffS2 = useMemo(
    () => (focusedSchedule ? getStaffEffectiveShift(focusedSchedule, 'sucursal_2') : null),
    [focusedSchedule]
  );

  const focusedEffCurrent = useMemo(() => {
    if (!focusedSchedule || selectedBranch === 'ambas') return null;
    return getStaffEffectiveShift(focusedSchedule, selectedBranch);
  }, [focusedSchedule, selectedBranch]);

  const otherBranch: BranchId = selectedBranch === 'sucursal_1' ? 'sucursal_2' : 'sucursal_1';
  const focusedEffOther = useMemo(() => {
    if (!focusedSchedule || selectedBranch === 'ambas') return null;
    return getStaffEffectiveShift(focusedSchedule, otherBranch);
  }, [focusedSchedule, otherBranch, selectedBranch]);

  // Staff attending today in selectedBranch when viewing "todos"
  const workingStaffInBranchToday = useMemo(() => {
    return activeStaffList.filter((s) => {
      if (s.blockedDates?.includes(currentDate)) return false;
      const sched = getStaffDaySchedule(s, dayOfWeek);
      if (!sched.active) return false;
      if (selectedBranch === 'ambas') {
        return (
          getStaffEffectiveShift(sched, 'sucursal_1').active ||
          getStaffEffectiveShift(sched, 'sucursal_2').active
        );
      }
      return getStaffEffectiveShift(sched, selectedBranch).active;
    });
  }, [activeStaffList, currentDate, dayOfWeek, selectedBranch]);

  // Filter appointments for this date, branch, and selected staff
  const dayAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (apt.date !== currentDate) return false;
      if (selectedStaffId !== 'todos' && apt.staffId !== selectedStaffId) return false;
      return true;
    });
  }, [appointments, currentDate, selectedStaffId]);

  const activeDayAppointments = useMemo(
    () => dayAppointments.filter((a) => a.status !== 'cancelado'),
    [dayAppointments]
  );

  // Dynamically expand grid bounds if any shift or appointment falls outside 08:00-21:00
  const { slots, dayStartMinutes } = useMemo(() => {
    let minHour = DEFAULT_START_HOUR;
    let maxHour = DEFAULT_END_HOUR;

    for (const st of workingStaffInBranchToday) {
      const sched = getStaffDaySchedule(st, dayOfWeek);
      const shiftsToInspect =
        selectedBranch === 'ambas'
          ? [getStaffEffectiveShift(sched, 'sucursal_1'), getStaffEffectiveShift(sched, 'sucursal_2')]
          : [getStaffEffectiveShift(sched, selectedBranch)];
      for (const eff of shiftsToInspect) {
        if (!eff.active) continue;
        for (const r of eff.ranges) {
          const sH = Math.floor(timeToMinutes(r.start) / 60);
          const eH = Math.ceil(timeToMinutes(r.end) / 60);
          if (sH < minHour) minHour = Math.max(0, sH);
          if (eH > maxHour) maxHour = Math.min(24, eH);
        }
      }
    }

    for (const apt of dayAppointments) {
      const sH = Math.floor(timeToMinutes(apt.time) / 60);
      const eH = Math.ceil((timeToMinutes(apt.time) + (apt.durationMinutes || 30)) / 60);
      if (sH < minHour) minHour = Math.max(0, sH);
      if (eH > maxHour) maxHour = Math.min(24, eH);
    }

    const generated: string[] = [];
    for (let h = minHour; h < maxHour; h++) {
      const hStr = String(h).padStart(2, '0');
      generated.push(`${hStr}:00`);
      generated.push(`${hStr}:30`);
    }
    return { slots: generated, dayStartMinutes: minHour * 60 };
  }, [workingStaffInBranchToday, dayOfWeek, selectedBranch, dayAppointments]);

  const layoutItems = useMemo(() => {
    const leaveRoom = selectedStaffId === 'todos' && workingStaffInBranchToday.length > 1;
    return computeAppointmentLayout(dayAppointments, dayStartMinutes, HOUR_HEIGHT, leaveRoom);
  }, [dayAppointments, dayStartMinutes, selectedStaffId, workingStaffInBranchToday.length]);

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-xs overflow-hidden">
      {/* Top Day Overview & Real Schedule Status Banner */}
      <div className="p-4 bg-slate-50 border-b-2 border-slate-200 space-y-2.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#1E3A8A] text-white font-black text-xs">
              <Building2 className="w-3.5 h-3.5" />
              <span>{SCOPE_NAMES[selectedBranch]}</span>
            </span>
            <span className="font-black text-[#0F172A] text-sm capitalize">
              {formatDateSpanishLong(currentDate) || currentDate}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-300 font-black text-[#0F172A] text-xs">
              {activeDayAppointments.length === 0
                ? '0 turnos ocupados'
                : `${activeDayAppointments.length} turno(s) ocupado(s)`}
            </span>
          </div>

          <span className="text-slate-700 font-bold text-xs">
            Grilla horaria cada 30 min · Disponibilidad en tiempo real
          </span>
        </div>

        {/* Schedule & Availability Summary for Focused Staff or All Staff */}
        {focusedStaff ? (
          focusedStaff.blockedDates?.includes(currentDate) ? (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>{focusedStaff.name}:</strong> No disponible (Fecha bloqueada).
              </span>
            </div>
          ) : !focusedSchedule?.active ? (
            <div className="p-2.5 rounded-xl bg-slate-200/80 border border-slate-300 text-slate-800 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-slate-600 shrink-0" />
              <span>
                <strong>{focusedStaff.name}:</strong> No disponible — No trabaja los días{' '}
                {dayName}.
              </span>
            </div>
          ) : selectedBranch === 'ambas' ? (
            !focusedEffS1?.active && !focusedEffS2?.active ? (
              <div className="p-2.5 rounded-xl bg-slate-200/80 border border-slate-300 text-slate-800 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-slate-600 shrink-0" />
                <span>
                  <strong>{focusedStaff.name}:</strong> No tiene horarios activos los días {dayName}.
                </span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong>{focusedStaff.name}</strong> atiende:{' '}
                  {[
                    focusedEffS1?.active
                      ? `Montevideo (${formatShiftRanges(focusedEffS1.ranges)} hs)`
                      : null,
                    focusedEffS2?.active
                      ? `Rioja (${formatShiftRanges(focusedEffS2.ranges)} hs)`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            )
          ) : !focusedEffCurrent?.active ? (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 font-bold flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>{focusedStaff.name}:</strong> No disponible en{' '}
                  {BRANCH_NAMES[selectedBranch]} los días {dayName}.
                </span>
              </div>
              {focusedEffOther?.active && (
                <button
                  type="button"
                  onClick={() => setSelectedBranch(otherBranch)}
                  className="px-3 py-1 rounded-lg bg-[#1E3A8A] text-white text-[11px] font-black cursor-pointer hover:bg-blue-900"
                >
                  Ver su agenda en {BRANCH_NAMES[otherBranch]} (
                  {formatShiftRanges(focusedEffOther.ranges)} hs) →
                </button>
              )}
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>{focusedStaff.name}</strong> atiende en{' '}
                <strong>{BRANCH_NAMES[selectedBranch]}</strong>:{' '}
                {formatShiftRanges(focusedEffCurrent.ranges)} hs
              </span>
              {focusedEffCurrent.breaks.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                  <Coffee className="w-3 h-3" />
                  <span>
                    Pausa:{' '}
                    {focusedEffCurrent.breaks.map((b) => `${b.start}-${b.end}`).join(', ')}
                  </span>
                </span>
              )}
            </div>
          )
        ) : activeStaffList.length === 0 ? (
          <div className="p-3 rounded-xl bg-blue-50 border-2 border-blue-200 text-[#0F172A] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-[#1E3A8A] shrink-0" />
              <div>
                <p className="font-black text-xs text-[#0F172A]">
                  Agenda vacía — Todavía no hay profesionales ni turnos cargados en {SCOPE_NAMES[selectedBranch]}
                </p>
                <p className="text-[11px] font-semibold text-slate-700">
                  La grilla de horarios está lista. Cargá primero tus profesionales y horarios laborales para habilitar reservas.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onGoToStaff && (
                <button
                  type="button"
                  onClick={onGoToStaff}
                  className="px-3 py-1.5 rounded-xl bg-[#1E3A8A] hover:bg-blue-900 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Cargar Profesionales</span>
                </button>
              )}
              {onNewAppointment && (
                <button
                  type="button"
                  onClick={onNewAppointment}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-[#0F172A] border border-slate-300 text-xs font-black flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Turno</span>
                </button>
              )}
            </div>
          </div>
        ) : workingStaffInBranchToday.length === 0 ? (
          <div className="p-2.5 rounded-xl bg-slate-200/80 border border-slate-300 text-slate-800 font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-slate-600 shrink-0" />
            <span>
              Ningún profesional tiene horario laboral activo los días {dayName} en{' '}
              {SCOPE_NAMES[selectedBranch]}.
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-black text-slate-700">Disponibles hoy:</span>
              {workingStaffInBranchToday.map((st) => {
                const sched = getStaffDaySchedule(st, dayOfWeek);
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
                    : `${formatShiftRanges(getStaffEffectiveShift(sched, selectedBranch).ranges)} hs`;
                return (
                  <span
                    key={st.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white border border-slate-300 text-[#0F172A] font-black text-[11px]"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: st.color || '#1E3A8A' }}
                    />
                    <span>
                      {st.name}: {hoursLabel}
                    </span>
                  </span>
                );
              })}
            </div>
            {activeDayAppointments.length === 0 && (
              <span className="text-[11px] font-black text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                Agenda del día sin turnos — Seleccioná un horario disponible para agendar
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hourly Timeline in Normal Flow (never collapses or renders blank) */}
      <div className="relative overflow-x-auto">
        <div className="relative min-w-[650px]">
          {/* Background Grid: 30-min time slot rows */}
          <div className="relative flex flex-col">
            {slots.map((slot) => {
              const isHour = slot.endsWith(':00');
              const slotStartMin = timeToMinutes(slot);
              const slotEndMin = slotStartMin + 30;

              let isSlotBookable = false;
              let slotStatusLabel = 'No disponible';
              let slotBadgeClass = 'text-slate-500';
              let rowBgClass = isHour
                ? 'border-slate-300 bg-slate-100/80 cursor-not-allowed'
                : 'border-slate-200/80 bg-slate-50/70 cursor-not-allowed';
              let targetStaffIdForClick: string | undefined = undefined;
              let targetBranchForClick: BranchId = activeSingleBranch;

              if (focusedStaff) {
                const avail = getSlotAvailabilityForStaff(
                  focusedStaff,
                  currentDate,
                  slotStartMin,
                  slotEndMin,
                  selectedBranch,
                  sourceAppointments
                );

                if (avail.available) {
                  isSlotBookable = true;
                  targetStaffIdForClick = focusedStaff.id;
                  targetBranchForClick = avail.activeBranchId || activeSingleBranch;
                  const brSuffix =
                    selectedBranch === 'ambas' && avail.activeBranchId
                      ? ` (${BRANCH_SHORT_NAMES[avail.activeBranchId]})`
                      : '';
                  slotStatusLabel = `Espacio disponible · Agendar ${slot} hs con ${focusedStaff.name}${brSuffix}`;
                  slotBadgeClass = 'text-emerald-800 group-hover:text-[#1E3A8A]';
                  rowBgClass = isHour
                    ? 'border-slate-300 bg-white hover:bg-emerald-50/70 cursor-pointer'
                    : 'border-slate-200/80 bg-slate-50/30 hover:bg-emerald-50/70 cursor-pointer';
                } else if (avail.status === 'occupied') {
                  slotStatusLabel = 'Turno ocupado';
                  slotBadgeClass = 'text-blue-900';
                  rowBgClass = 'border-slate-200 bg-blue-50/20 cursor-default';
                } else if (avail.status === 'occupied_other_branch') {
                  slotStatusLabel = avail.label;
                  slotBadgeClass = 'text-indigo-800';
                  rowBgClass = 'border-slate-200 bg-indigo-50/50 cursor-not-allowed';
                } else if (avail.status === 'in_break') {
                  slotStatusLabel = avail.label;
                  slotBadgeClass = 'text-amber-800';
                  rowBgClass = 'border-slate-200 bg-amber-50/70 cursor-not-allowed';
                } else {
                  slotStatusLabel = avail.label;
                }
              } else if (activeStaffList.length === 0) {
                slotStatusLabel = 'Agenda vacía · Sin profesionales cargados aún';
                slotBadgeClass = 'text-slate-500';
              } else {
                const evaluations = activeStaffList.map((st) => ({
                  staff: st,
                  avail: getSlotAvailabilityForStaff(
                    st,
                    currentDate,
                    slotStartMin,
                    slotEndMin,
                    selectedBranch,
                    sourceAppointments
                  ),
                }));

                const freeEvaluations = evaluations.filter((e) => e.avail.available);

                if (freeEvaluations.length > 0) {
                  isSlotBookable = true;
                  targetStaffIdForClick = freeEvaluations[0].staff.id;
                  targetBranchForClick =
                    freeEvaluations[0].avail.activeBranchId || activeSingleBranch;
                  const names = freeEvaluations
                    .map((e) => {
                      const first = e.staff.name.split(' ')[0];
                      return selectedBranch === 'ambas' && e.avail.activeBranchId
                        ? `${first}·${BRANCH_SHORT_NAMES[e.avail.activeBranchId]}`
                        : first;
                    })
                    .join(', ');
                  slotStatusLabel = `Disponible (${names}) · Agendar ${slot} hs`;
                  slotBadgeClass = 'text-emerald-800 group-hover:text-[#1E3A8A]';
                  rowBgClass = isHour
                    ? 'border-slate-300 bg-white hover:bg-emerald-50/70 cursor-pointer'
                    : 'border-slate-200/80 bg-slate-50/30 hover:bg-emerald-50/70 cursor-pointer';
                } else if (evaluations.some((e) => e.avail.status === 'occupied')) {
                  slotStatusLabel = 'Horario ocupado';
                  slotBadgeClass = 'text-blue-900';
                  rowBgClass = 'border-slate-200 bg-blue-50/20 cursor-default';
                } else if (evaluations.some((e) => e.avail.status === 'in_break')) {
                  slotStatusLabel = 'Pausa / Descanso';
                  slotBadgeClass = 'text-amber-800';
                  rowBgClass = 'border-slate-200 bg-amber-50/70 cursor-not-allowed';
                } else if (workingStaffInBranchToday.length === 0) {
                  slotStatusLabel = 'No laborable / Sin atención';
                } else {
                  slotStatusLabel = 'Fuera de horario laboral';
                }
              }

              return (
                <div
                  key={slot}
                  style={{ height: `${SLOT_HEIGHT}px` }}
                  className={`flex items-center border-b transition-colors group ${rowBgClass}`}
                  onClick={() => {
                    if (!isSlotBookable) return;
                    onSlotClick(slot, targetStaffIdForClick, targetBranchForClick);
                  }}
                >
                  {/* Time label */}
                  <div
                    className={`w-20 px-3 text-right select-none shrink-0 border-r-2 border-slate-300 ${
                      isHour
                        ? 'font-black text-sm text-[#0F172A]'
                        : 'font-bold text-xs text-slate-500'
                    }`}
                  >
                    <span>{slot}</span>
                  </div>

                  {/* Slot availability status */}
                  <div className="flex-1 px-4 flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold transition-colors flex items-center gap-1 ${slotBadgeClass}`}
                    >
                      {isSlotBookable && <Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
                      <span>{slotStatusLabel}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Foreground Appointments Layer: Real Duration Occupied Blocks */}
          <div className="absolute top-0 bottom-0 right-0 left-20 pointer-events-none p-1">
            {layoutItems.map((item) => {
              const apt = item.appointment;
              const staffMember = staff.find((s) => s.id === apt.staffId);
              const cardColor = apt.color || staffMember?.color || '#2563eb';
              const status = getStatusBadge(apt.status);
              const endTime = calculateEndTime(apt.time, apt.durationMinutes || 30);
              const isCancelled = apt.status === 'cancelado';

              return (
                <div
                  key={apt.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAppointment(apt);
                  }}
                  style={{
                    position: 'absolute',
                    top: `${item.top}px`,
                    height: `${item.height}px`,
                    left: `calc(${item.leftPercent}% + 4px)`,
                    width: `calc(${item.widthPercent}% - 8px)`,
                  }}
                  className={`pointer-events-auto rounded-xl border-2 shadow-xs hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col justify-between group ${
                    isCancelled
                      ? 'bg-slate-100 border-slate-300 opacity-60 line-through'
                      : 'bg-white border-slate-300 hover:border-blue-600'
                  }`}
                  title={`${apt.clientName} - ${apt.serviceName} (${apt.time} a ${endTime} hs) [${
                    BRANCH_SHORT_NAMES[apt.branchId || 'sucursal_1']
                  }]`}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2.5"
                    style={{ backgroundColor: cardColor }}
                  />

                  <div className="pl-4 pr-2.5 py-1.5 flex flex-col justify-between h-full">
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cardColor }}
                        />
                        <span className="font-black text-xs sm:text-sm text-[#0F172A] group-hover:text-blue-700 truncate">
                          {apt.clientName}
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-black text-blue-900 bg-blue-100 px-1.5 py-0.2 rounded border border-blue-300 shrink-0">
                          {apt.time} - {endTime} ({apt.durationMinutes}m)
                        </span>
                        <span className="text-[10px] font-black text-[#0F172A] bg-slate-100 px-1.5 py-0.2 rounded border border-slate-300 shrink-0">
                          {BRANCH_SHORT_NAMES[apt.branchId || 'sucursal_1']}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black border ${status.bg}`}
                        >
                          {status.label}
                        </span>
                        {apt.clientPhone && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openWhatsAppTurno(apt, business?.phoneCountryPrefix || '+54');
                              onOpenWhatsApp(apt);
                            }}
                            className="p-1 hover:bg-emerald-600 rounded text-emerald-600 hover:text-white transition-all shadow-2xs"
                            title={`Enviar WhatsApp a ${apt.clientName}`}
                          >
                            <WhatsAppIcon size={13} variant="monochrome" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-bold text-slate-700 mt-0.5">
                      <span className="flex items-center gap-1 text-[#0F172A] font-extrabold truncate">
                        <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
                        <span className="truncate">{apt.serviceName}</span>
                      </span>

                      <span className="flex items-center gap-1 text-slate-700 truncate">
                        <User className="w-3 h-3 text-sky-700 shrink-0" />
                        <span className="truncate">{apt.staffName}</span>
                      </span>

                      <span className="ml-auto font-black text-[#0F172A] text-xs">
                        {formatCurrency(apt.price, business?.currency)}
                        {apt.remainingBalance > 0 && (
                          <span className="text-amber-700 text-[10px] font-black ml-1">
                            (Resta {formatCurrency(apt.remainingBalance, business?.currency)})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
