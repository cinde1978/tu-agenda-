import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Users,
  Calendar,
  Sparkles,
  Coffee,
  Edit2,
  CalendarRange,
  CalendarDays,
  LayoutGrid,
} from 'lucide-react';
import { Appointment, BranchId, StaffMember, StaffSubMode } from '../../types';
import { useApp } from '../../context/AppContext';
import { StaffModal } from '../staff/StaffModal';
import { formatCurrency, formatDateSpanishLong, getStatusBadge } from '../../utils/formatters';
import { getTodayDateString } from '../../utils/initialData';
import {
  BRANCH_NAMES,
  BRANCH_SHORT_NAMES,
  DAY_LABELS,
  parseDateDayOfWeek,
  getStaffDaySchedule,
  getStaffEffectiveShift,
  staffBelongsToBranch,
  formatShiftRanges,
  getSlotAvailabilityForStaff,
  timeToMinutes,
  minutesToTime,
} from '../../utils/staffSchedule';

export interface AgendaStaffViewProps {
  currentDate?: string;
  staffSubMode?: StaffSubMode;
  onStaffSubModeChange?: (subMode: StaffSubMode) => void;
  onDateChange?: (date: string) => void;
  onSelectAppointment?: (appointment: Appointment) => void;
  onSelectSlot?: (
    staffId: string,
    time: string,
    dateStr?: string,
    branchId?: BranchId
  ) => void;
  onNewAppointment?: () => void;
}

const DEFAULT_START_HOUR = 8; // 08:00
const DEFAULT_END_HOUR = 21; // 21:00
const HOUR_HEIGHT = 72; // 72px per 60 minutes
const SLOT_HEIGHT = 36; // 36px per 30 minutes

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const total = timeToMinutes(startTime) + (durationMinutes || 30);
  return minutesToTime(total);
}

interface StaffAppointmentLayoutItem {
  appointment: Appointment;
  top: number;
  height: number;
  leftPercent: number;
  widthPercent: number;
}

function layoutStaffAppointments(
  appointments: Appointment[],
  dayStartMinutes: number,
  hourHeight: number
): StaffAppointmentLayoutItem[] {
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

  const result: StaffAppointmentLayoutItem[] = [];

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
    for (const { apt, col } of positions) {
      const start = timeToMinutes(apt.time);
      const duration = apt.durationMinutes || 30;

      const top = ((start - dayStartMinutes) / 60) * hourHeight;
      const height = Math.max((duration / 60) * hourHeight - 2, 30);
      const widthPercent = 100 / totalCols;
      const leftPercent = col * widthPercent;

      result.push({
        appointment: apt,
        top,
        height,
        leftPercent,
        widthPercent,
      });
    }
  }

  return result;
}

export function AgendaStaffView({
  currentDate,
  staffSubMode = 'dia',
  onStaffSubModeChange,
  onDateChange,
  onSelectAppointment,
  onSelectSlot,
  onNewAppointment,
}: AgendaStaffViewProps = {}) {
  const {
    staff,
    appointments,
    allAppointments,
    selectedBranch,
    setSelectedBranch,
    business,
  } = useApp();

  const [localSubMode, setLocalSubMode] = useState<StaffSubMode>(staffSubMode);
  const effectiveSubMode = onStaffSubModeChange ? staffSubMode : localSubMode;

  const handleSubModeChange = (mode: StaffSubMode) => {
    setLocalSubMode(mode);
    onStaffSubModeChange?.(mode);
  };

  const [activeBranch, setActiveBranch] = useState<BranchId | 'ambas'>(
    selectedBranch || 'sucursal_1'
  );
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffToEditInModal, setStaffToEditInModal] = useState<StaffMember | null>(null);
  const [monthSelectedStaffId, setMonthSelectedStaffId] = useState<string>('todos');

  useEffect(() => {
    if (selectedBranch && selectedBranch !== activeBranch) {
      setActiveBranch(selectedBranch);
    }
  }, [selectedBranch]);

  const dateStr = currentDate || getTodayDateString();
  const todayStr = getTodayDateString();
  const currentDayOfWeek = useMemo(() => parseDateDayOfWeek(dateStr), [dateStr]);

  // Roster of active staff assigned to the selected branch (keeps staff visible on days off as «No disponible / No trabaja»)
  const rosterStaff = useMemo(() => {
    return staff.filter((s) => staffBelongsToBranch(s, activeBranch));
  }, [staff, activeBranch]);

  useEffect(() => {
    if (
      monthSelectedStaffId !== 'todos' &&
      !rosterStaff.some((s) => s.id === monthSelectedStaffId)
    ) {
      setMonthSelectedStaffId('todos');
    }
  }, [rosterStaff, monthSelectedStaffId]);

  // Always use allAppointments so cross-branch occupancy is respected
  const sourceAppointments = useMemo(() => {
    return Array.isArray(allAppointments) ? allAppointments : appointments;
  }, [allAppointments, appointments]);

  // Filter appointments for day view according to activeBranch
  const dayAppointments = useMemo(() => {
    return sourceAppointments.filter((apt) => {
      if (apt.date !== dateStr) return false;
      if (apt.status === 'cancelado') return false;
      if (activeBranch === 'ambas') return true;
      const aptBranch: BranchId = apt.branchId || 'sucursal_1';
      return aptBranch === activeBranch;
    });
  }, [sourceAppointments, dateStr, activeBranch]);

  // Week days (Lunes a Domingo) for Staff Semana view
  const weekDays = useMemo(() => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const curDay = dateObj.getDay();
    const distanceToMonday = curDay === 0 ? -6 : 1 - curDay;
    const monday = new Date(dateObj);
    monday.setDate(dateObj.getDate() + distanceToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      const yr = dayDate.getFullYear();
      const mo = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dy = String(dayDate.getDate()).padStart(2, '0');
      const dStr = `${yr}-${mo}-${dy}`;
      const dow = dayDate.getDay();
      const label = DAY_LABELS.find((l) => l.day === dow) || DAY_LABELS[i];
      days.push({
        dateStr: dStr,
        dayNumber: dayDate.getDate(),
        dayOfWeek: dow,
        dayName: label.name,
        shortName: label.short,
      });
    }
    return days;
  }, [dateStr]);

  // Month calendar cells (Lunes a Domingo) for Staff Mes view
  const monthCalendarDays = useMemo(() => {
    const [year, month] = dateStr.split('-').map(Number);
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);

    let startDayOfWeek = firstDayOfMonth.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const days: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevMonth = month - 1 === 0 ? 12 : month - 1;
      const prevYear = month - 1 === 0 ? year - 1 : year;
      const dStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ dateStr: dStr, dayNum, isCurrentMonth: false });
    }

    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr: dStr, dayNum: d, isCurrentMonth: true });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const dStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr: dStr, dayNum: d, isCurrentMonth: false });
    }

    return days;
  }, [dateStr]);

  const handleBranchChange = (branch: BranchId | 'ambas') => {
    setActiveBranch(branch);
    setSelectedBranch(branch);
  };

  const { slots, dayStartMinutes } = useMemo(() => {
    let minHour = DEFAULT_START_HOUR;
    let maxHour = DEFAULT_END_HOUR;

    for (const member of rosterStaff) {
      const sched = getStaffDaySchedule(member, currentDayOfWeek);
      const shiftsToCheck =
        activeBranch === 'ambas'
          ? [getStaffEffectiveShift(sched, 'sucursal_1'), getStaffEffectiveShift(sched, 'sucursal_2')]
          : [getStaffEffectiveShift(sched, activeBranch)];
      for (const eff of shiftsToCheck) {
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
  }, [rosterStaff, currentDayOfWeek, activeBranch, dayAppointments]);

  // Helper to find the first open 30-min slot for quick booking from Weekly Staff View
  const findFirstOpenSlotOnDay = (
    member: StaffMember,
    targetDate: string
  ): { time: string; branchId: BranchId } | null => {
    for (const slot of slots) {
      const startMin = timeToMinutes(slot);
      const res = getSlotAvailabilityForStaff(
        member,
        targetDate,
        startMin,
        startMin + 30,
        activeBranch,
        sourceAppointments
      );
      if (res.available && res.activeBranchId) {
        return { time: slot, branchId: res.activeBranchId };
      }
    }
    return null;
  };

  const periodDisplayLabel = useMemo(() => {
    const safeD = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : getTodayDateString();
    if (effectiveSubMode === 'dia') {
      return formatDateSpanishLong(safeD) || safeD;
    }
    if (effectiveSubMode === 'semana' && weekDays.length === 7) {
      const f = new Date(weekDays[0].dateStr + 'T12:00:00');
      const l = new Date(weekDays[6].dateStr + 'T12:00:00');
      const fM = f.toLocaleDateString('es-AR', { month: 'short' });
      const lM = l.toLocaleDateString('es-AR', { month: 'short' });
      return fM === lM
        ? `Semana del ${weekDays[0].dayNumber} al ${weekDays[6].dayNumber} de ${fM} ${l.getFullYear()}`
        : `Semana del ${weekDays[0].dayNumber} ${fM} al ${weekDays[6].dayNumber} ${lM} ${l.getFullYear()}`;
    }
    const [yr, mo] = safeD.split('-').map(Number);
    return new Date(yr, mo - 1, 1).toLocaleDateString('es-AR', {
      month: 'long',
      year: 'numeric',
    });
  }, [effectiveSubMode, dateStr, weekDays]);

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-xs overflow-hidden">
      {/* Top Controls Bar: Staff Sub-Mode (Día / Semana / Mes), Branch Toggle & Add Staff */}
      <div className="p-4 sm:p-5 bg-slate-100 border-b-2 border-slate-300 flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-base sm:text-lg text-[#0F172A] leading-tight">
                Vista Staff — Disponibilidad y Horarios por Sucursal
              </h3>
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#1E3A8A] bg-white px-2.5 py-0.5 rounded-lg border border-slate-300 capitalize">
                <Calendar className="w-3.5 h-3.5" />
                <span>{periodDisplayLabel}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Horarios reales por profesional
              </span>
            </div>
            <p className="text-xs text-slate-700 font-bold mt-0.5">
              Refleja exactamente los días laborables, francos, pausas y franjas horarias de Soham
              Montevideo y Soham Rioja.
            </p>
          </div>

          {/* Sub-mode Switcher: Staff Día | Staff Semana | Staff Mes */}
          <div className="flex items-center bg-white p-1 rounded-xl border-2 border-slate-300 shadow-2xs gap-1 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => handleSubModeChange('dia')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                effectiveSubMode === 'dia'
                  ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                  : 'bg-white text-[#0F172A] border-transparent hover:bg-slate-100'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Staff Día</span>
            </button>
            <button
              type="button"
              onClick={() => handleSubModeChange('semana')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                effectiveSubMode === 'semana'
                  ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                  : 'bg-white text-[#0F172A] border-transparent hover:bg-slate-100'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Staff Semana</span>
            </button>
            <button
              type="button"
              onClick={() => handleSubModeChange('mes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                effectiveSubMode === 'mes'
                  ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                  : 'bg-white text-[#0F172A] border-transparent hover:bg-slate-100'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Staff Mes</span>
            </button>
          </div>
        </div>

        {/* Second Row: Branch Filter & + Configurar Staff */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border-2 border-slate-300 shadow-2xs">
            <button
              type="button"
              onClick={() => handleBranchChange('sucursal_1')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                activeBranch === 'sucursal_1'
                  ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                  : 'bg-white text-[#0F172A] border-transparent hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Soham Montevideo</span>
            </button>

            <button
              type="button"
              onClick={() => handleBranchChange('sucursal_2')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                activeBranch === 'sucursal_2'
                  ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                  : 'bg-white text-[#0F172A] border-transparent hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Soham Rioja</span>
            </button>

            <button
              type="button"
              onClick={() => handleBranchChange('ambas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                activeBranch === 'ambas'
                  ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                  : 'bg-white text-[#0F172A] border-transparent hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Ambas Sucursales</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setStaffToEditInModal(null);
              setIsStaffModalOpen(true);
            }}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Nuevo Profesional</span>
          </button>
        </div>
      </div>

      {/* Empty Roster Banner (keeps grids visible below so screen is NEVER blank) */}
      {rosterStaff.length === 0 && (
        <div className="p-4 bg-blue-50 border-b-2 border-blue-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-blue-200 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-[#1E3A8A]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-[#0F172A]">
                {staff.length === 0
                  ? 'Agenda Staff vacía — Aún no hay profesionales registrados'
                  : `Sin profesionales asignados a ${
                      activeBranch === 'sucursal_1'
                        ? 'Soham Montevideo'
                        : activeBranch === 'sucursal_2'
                        ? 'Soham Rioja'
                        : 'esta vista'
                    }`}
              </h4>
              <p className="text-xs text-slate-700 font-semibold">
                La grilla de {effectiveSubMode === 'dia' ? 'horarios del día' : effectiveSubMode === 'semana' ? 'la semana' : 'el mes'} se muestra debajo lista para usar. Agregá un profesional para habilitar sus turnos.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setStaffToEditInModal(null);
                setIsStaffModalOpen(true);
              }}
              className="px-3.5 py-2 bg-[#1E3A8A] hover:bg-blue-900 text-white rounded-xl text-xs font-black shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Agregar Profesional</span>
            </button>
            {onNewAppointment && (
              <button
                type="button"
                onClick={onNewAppointment}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-[#0F172A] border border-slate-300 rounded-xl text-xs font-black inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Turno</span>
              </button>
            )}
          </div>
        </div>
      )}

      {effectiveSubMode === 'dia' ? (
        /* ============================================================== */
        /* 1. VISTA STAFF DEL DÍA                                         */
        /* ============================================================== */
        <div className="overflow-x-auto max-h-[700px] overflow-y-auto bg-white border-t border-slate-300">
          <div
            className="grid min-w-[680px] divide-x-2 divide-slate-300"
            style={{
              gridTemplateColumns: `80px repeat(${Math.max(1, rosterStaff.length)}, minmax(210px, 1fr))`,
            }}
          >
            {/* Header: Hour Column */}
            <div className="sticky top-0 z-30 bg-slate-200 p-3 text-center text-xs font-black text-[#0F172A] border-b-2 border-slate-300 shadow-2xs flex items-center justify-center">
              Hora
            </div>

            {rosterStaff.length === 0 ? (
              <div className="sticky top-0 z-30 p-2.5 text-center border-b-2 border-slate-300 bg-slate-100 flex flex-col items-center justify-center gap-0.5">
                <span className="text-xs font-black text-[#0F172A]">
                  Sin profesionales cargados ({activeBranch === 'sucursal_2' ? 'Soham Rioja' : activeBranch === 'sucursal_1' ? 'Soham Montevideo' : 'Ambas Sucursales'})
                </span>
                <span className="text-[10px] font-bold text-slate-600">
                  Grilla horaria base 08:00 a 20:30 hs · Agregá un profesional para habilitar reservas
                </span>
              </div>
            ) : null}

            {/* Header: Staff Member Columns */}
            {rosterStaff.map((member) => {
              const isBlockedDay = member.blockedDates?.includes(dateStr);
              const daySchedule = getStaffDaySchedule(member, currentDayOfWeek);
              const effS1 = getStaffEffectiveShift(daySchedule, 'sucursal_1');
              const effS2 = getStaffEffectiveShift(daySchedule, 'sucursal_2');
              const effActiveBranch =
                activeBranch !== 'ambas' ? getStaffEffectiveShift(daySchedule, activeBranch) : null;

              const isAvailableTodayHere =
                !isBlockedDay &&
                daySchedule.active &&
                (activeBranch === 'ambas'
                  ? effS1.active || effS2.active
                  : Boolean(effActiveBranch?.active));

              return (
                <div
                  key={member.id}
                  className={`sticky top-0 z-30 p-2.5 text-center border-b-2 border-slate-300 flex flex-col items-center justify-between gap-1 shadow-2xs ${
                    isAvailableTodayHere ? 'bg-slate-100' : 'bg-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5 max-w-full">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 shadow-2xs ring-2 ring-white"
                      style={{ backgroundColor: member.color || '#1E3A8A' }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-black text-[#0F172A] truncate">
                      {member.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setStaffToEditInModal(member);
                        setIsStaffModalOpen(true);
                      }}
                      className="p-1 rounded hover:bg-slate-300/60 text-slate-600 hover:text-[#1E3A8A] cursor-pointer shrink-0"
                      title={`Editar horarios de ${member.name}`}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex flex-col items-center gap-0.5 w-full">
                    <span className="text-[10px] text-slate-700 font-bold truncate max-w-full">
                      {member.role}
                    </span>

                    {isBlockedDay ? (
                      <span className="text-[9px] font-black bg-rose-100 text-rose-900 px-2 py-0.5 rounded border border-rose-300">
                        No disponible · Fecha bloqueada
                      </span>
                    ) : !daySchedule.active ? (
                      <span className="text-[9px] font-black bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-400">
                        No disponible · No trabaja
                      </span>
                    ) : activeBranch !== 'ambas' ? (
                      effActiveBranch?.active ? (
                        <div className="flex flex-col items-center gap-0.5 text-[9px] font-extrabold">
                          <span
                            className={`px-1.5 py-0.5 rounded border ${
                              activeBranch === 'sucursal_1'
                                ? 'text-blue-950 bg-blue-50 border-blue-200'
                                : 'text-[#0F172A] bg-amber-50 border-[#D4AF37]'
                            }`}
                          >
                            {formatShiftRanges(effActiveBranch.ranges)} hs
                          </span>
                          {effActiveBranch.breaks.length > 0 && (
                            <span className="text-amber-900 bg-amber-50 px-1.5 rounded border border-amber-200 text-[8.5px]">
                              Pausa:{' '}
                              {effActiveBranch.breaks
                                .map((b) => `${b.start}-${b.end}`)
                                .join(', ')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-0.5 text-[9px] font-black">
                          <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300">
                            No disponible en {BRANCH_SHORT_NAMES[activeBranch]}
                          </span>
                          {(activeBranch === 'sucursal_1' ? effS2.active : effS1.active) && (
                            <span className="text-[8.5px] text-slate-600 font-bold">
                              Atiende en{' '}
                              {activeBranch === 'sucursal_1'
                                ? `Rioja (${formatShiftRanges(effS2.ranges)})`
                                : `Montevideo (${formatShiftRanges(effS1.ranges)})`}
                            </span>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col items-center gap-0.5 text-[8.5px] font-extrabold">
                        {effS1.active && (
                          <span className="text-blue-950 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            Montevideo: {formatShiftRanges(effS1.ranges)}
                          </span>
                        )}
                        {effS2.active && (
                          <span className="text-[#0F172A] bg-amber-50 px-1.5 py-0.5 rounded border border-[#D4AF37]">
                            Rioja: {formatShiftRanges(effS2.ranges)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Time Column Rows */}
            <div className="relative border-r-2 border-slate-300 bg-slate-50 flex flex-col">
              {slots.map((slot) => {
                const isHour = slot.endsWith(':00');
                return (
                  <div
                    key={slot}
                    style={{ height: `${SLOT_HEIGHT}px` }}
                    className={`flex items-center justify-center border-b select-none ${
                      isHour
                        ? 'border-slate-300 font-black text-xs text-[#0F172A] bg-slate-100'
                        : 'border-slate-200 text-[10px] font-bold text-slate-500'
                    }`}
                  >
                    {slot}
                  </div>
                );
              })}
            </div>

            {/* Placeholder Timeline Column when 0 professionals exist */}
            {rosterStaff.length === 0 && (
              <div className="relative border-r-2 border-slate-300 flex flex-col bg-slate-50/50">
                {slots.map((slot) => {
                  const isHour = slot.endsWith(':00');
                  return (
                    <div
                      key={slot}
                      style={{ height: `${SLOT_HEIGHT}px` }}
                      className={`border-b px-3 flex items-center justify-between text-[11px] font-bold text-slate-500 ${
                        isHour ? 'border-slate-300 bg-slate-100/60' : 'border-slate-200/80'
                      }`}
                    >
                      <span>Agenda vacía · Sin profesionales cargados</span>
                      <span className="text-[10px] text-slate-400">{slot} hs</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Staff Timeline Columns */}
            {rosterStaff.map((member) => {
              const memberAppointments = dayAppointments.filter((a) => a.staffId === member.id);
              const layoutedAppointments = layoutStaffAppointments(
                memberAppointments,
                dayStartMinutes,
                HOUR_HEIGHT
              );

              return (
                <div
                  key={member.id}
                  className="relative border-r-2 border-slate-300"
                >
                  {/* Background 30-min Availability Slots in normal flow */}
                  <div className="relative flex flex-col">
                    {slots.map((slot) => {
                      const slotStartMin = timeToMinutes(slot);
                      const slotEndMin = slotStartMin + 30;
                      const isHour = slot.endsWith(':00');

                      const slotAvail = getSlotAvailabilityForStaff(
                        member,
                        dateStr,
                        slotStartMin,
                        slotEndMin,
                        activeBranch,
                        sourceAppointments
                      );

                      let cellBg = 'bg-white hover:bg-emerald-50/80 cursor-pointer';
                      if (!slotAvail.available) {
                        if (slotAvail.status === 'blocked') {
                          cellBg = 'bg-rose-50/70 cursor-not-allowed';
                        } else if (slotAvail.status === 'day_off') {
                          cellBg = 'bg-slate-100/90 cursor-not-allowed';
                        } else if (slotAvail.status === 'wrong_branch') {
                          cellBg = 'bg-amber-50/60 cursor-not-allowed';
                        } else if (slotAvail.status === 'in_break') {
                          cellBg = 'bg-amber-50/90 cursor-not-allowed';
                        } else if (slotAvail.status === 'occupied_other_branch') {
                          cellBg = 'bg-indigo-50/70 cursor-not-allowed';
                        } else if (slotAvail.status === 'occupied') {
                          cellBg = 'bg-slate-50 cursor-default';
                        } else {
                          cellBg = 'bg-slate-100/80 cursor-not-allowed';
                        }
                      }

                      return (
                        <div
                          key={slot}
                          style={{ height: `${SLOT_HEIGHT}px` }}
                          className={`border-b transition-colors group flex items-center justify-center px-1.5 ${
                            isHour ? 'border-slate-300' : 'border-slate-200/80'
                          } ${cellBg}`}
                          onClick={() => {
                            if (!slotAvail.available) return;
                            onSelectSlot?.(
                              member.id,
                              slot,
                              dateStr,
                              slotAvail.activeBranchId
                            );
                          }}
                        >
                          {slotAvail.available ? (
                            <div className="w-full flex items-center justify-between text-[10px]">
                              <span className="font-bold text-emerald-800/80 group-hover:text-emerald-950">
                                Disponible
                                {activeBranch === 'ambas' && slotAvail.activeBranchId
                                  ? ` · ${BRANCH_SHORT_NAMES[slotAvail.activeBranchId]}`
                                  : ''}
                              </span>
                              <span className="font-black text-[#1E3A8A] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                <Plus className="w-3 h-3 stroke-[3]" />
                                <span>Agendar</span>
                              </span>
                            </div>
                          ) : slotAvail.status !== 'occupied' ? (
                            <span
                              className={`text-[9px] font-bold select-none truncate ${
                                slotAvail.status === 'in_break'
                                  ? 'text-amber-800'
                                  : slotAvail.status === 'occupied_other_branch'
                                  ? 'text-indigo-800'
                                  : 'text-slate-400'
                              }`}
                            >
                              {slotAvail.label}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {/* Foreground: Real Duration Occupied Appointments Layer */}
                  <div className="absolute inset-0 pointer-events-none p-1">
                    {layoutedAppointments.map((item) => {
                      const apt = item.appointment;
                      const endTime = calculateEndTime(apt.time, apt.durationMinutes || 30);
                      const status = getStatusBadge(apt.status);
                      const cardColor = apt.color || member.color || '#2563eb';
                      const branchTag =
                        apt.branchId === 'sucursal_2' ? 'Rioja' : 'Montevideo';

                      return (
                        <div
                          key={apt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAppointment?.(apt);
                          }}
                          style={{
                            position: 'absolute',
                            top: `${item.top}px`,
                            height: `${item.height}px`,
                            left: `calc(${item.leftPercent}% + 3px)`,
                            width: `calc(${item.widthPercent}% - 6px)`,
                          }}
                          className="pointer-events-auto rounded-xl border-2 border-slate-300 bg-white hover:border-blue-600 hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col justify-between group shadow-xs"
                          title={`Ocupado: ${apt.clientName} - ${apt.serviceName} (${apt.time} a ${endTime} hs) [${branchTag}]`}
                        >
                          <div
                            className="absolute left-0 top-0 bottom-0 w-2"
                            style={{ backgroundColor: cardColor }}
                          />

                          <div className="pl-3.5 pr-2 py-1 flex flex-col justify-between h-full min-w-0">
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-black text-xs text-[#0F172A] group-hover:text-blue-700 truncate leading-tight">
                                  {apt.clientName}
                                </span>
                                <span
                                  className={`px-1 py-0.2 rounded text-[8px] font-black border ${status.bg} shrink-0`}
                                >
                                  {status.label}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-700 truncate mt-0.5">
                                <Sparkles className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                                <span className="truncate">{apt.serviceName}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-black text-slate-900 border-t border-slate-100 pt-0.5 mt-0.5">
                              <span className="text-blue-900 bg-blue-100 px-1 py-0.2 rounded text-[9px] font-bold">
                                {apt.time} - {endTime}
                              </span>
                              <span className="text-[9px] font-black text-slate-600 bg-slate-100 px-1 rounded">
                                {branchTag}
                              </span>
                              <span>{formatCurrency(apt.price, business?.currency)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : effectiveSubMode === 'semana' ? (
        /* ============================================================== */
        /* 2. VISTA STAFF DE LA SEMANA                                    */
        /* ============================================================== */
        <div className="overflow-x-auto bg-white border-t border-slate-300">
          <div className="min-w-[920px] divide-y-2 divide-slate-200">
            {/* Week Header Row */}
            <div className="grid grid-cols-8 divide-x-2 divide-slate-200 bg-slate-100">
              <div className="p-3 text-xs font-black text-[#0F172A] flex items-center">
                Profesional
              </div>
              {weekDays.map((day) => {
                const isToday = day.dateStr === todayStr;
                return (
                  <div
                    key={day.dateStr}
                    onClick={() => {
                      onDateChange?.(day.dateStr);
                      handleSubModeChange('dia');
                    }}
                    className={`p-2.5 text-center cursor-pointer hover:bg-blue-50/70 transition-colors ${
                      isToday ? 'bg-blue-100/70' : ''
                    }`}
                    title={`Abrir Staff del Día (${day.dayName} ${day.dayNumber})`}
                  >
                    <span className="text-[11px] font-black uppercase text-[#0F172A] block">
                      {day.shortName}
                    </span>
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black mt-0.5 ${
                        isToday ? 'bg-[#1E3A8A] text-white' : 'text-slate-800'
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Empty Row in Staff Semana when 0 professionals exist */}
            {rosterStaff.length === 0 && (
              <div className="grid grid-cols-8 divide-x-2 divide-slate-200 bg-white">
                <div className="p-3 bg-slate-50 flex flex-col justify-between gap-2">
                  <div className="text-xs font-black text-[#0F172A]">
                    Sin profesionales
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStaffToEditInModal(null);
                      setIsStaffModalOpen(true);
                    }}
                    className="text-[10px] font-black text-[#1E3A8A] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Agregar profesional</span>
                  </button>
                </div>
                {weekDays.map((day) => (
                  <div
                    key={day.dateStr}
                    className="p-2 flex flex-col items-center justify-center min-h-[120px] bg-slate-50/70 text-center"
                  >
                    <span className="text-[10px] font-black text-slate-600 block">
                      Agenda vacía
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                      Sin profesionales
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Staff Rows */}
            {rosterStaff.map((member) => (
              <div
                key={member.id}
                className="grid grid-cols-8 divide-x-2 divide-slate-200 bg-white"
              >
                {/* Staff Identity Cell */}
                <div className="p-3 bg-slate-50/70 flex flex-col justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <div
                      className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-black text-xs shrink-0"
                      style={{ backgroundColor: member.color || '#1E3A8A' }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-xs text-[#0F172A] truncate">
                        {member.name}
                      </div>
                      <div className="text-[10px] font-bold text-[#1E3A8A] truncate">
                        {member.role}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStaffToEditInModal(member);
                      setIsStaffModalOpen(true);
                    }}
                    className="text-[10px] font-black text-[#1E3A8A] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Configurar horarios</span>
                  </button>
                </div>

                {/* 7 Day Cells (Lunes a Domingo) */}
                {weekDays.map((day) => {
                  const isBlocked = member.blockedDates?.includes(day.dateStr);
                  const sched = getStaffDaySchedule(member, day.dayOfWeek);
                  const effS1 = getStaffEffectiveShift(sched, 'sucursal_1');
                  const effS2 = getStaffEffectiveShift(sched, 'sucursal_2');

                  const visibleS1 =
                    (activeBranch === 'ambas' || activeBranch === 'sucursal_1') && effS1.active;
                  const visibleS2 =
                    (activeBranch === 'ambas' || activeBranch === 'sucursal_2') && effS2.active;
                  const worksInView = !isBlocked && sched.active && (visibleS1 || visibleS2);

                  const cellAppointments = sourceAppointments
                    .filter((apt) => {
                      if (
                        apt.date !== day.dateStr ||
                        apt.staffId !== member.id ||
                        apt.status === 'cancelado'
                      ) {
                        return false;
                      }
                      if (activeBranch === 'ambas') return true;
                      return (apt.branchId || 'sucursal_1') === activeBranch;
                    })
                    .sort((a, b) => a.time.localeCompare(b.time));

                  const openSlot = worksInView
                    ? findFirstOpenSlotOnDay(member, day.dateStr)
                    : null;

                  return (
                    <div
                      key={day.dateStr}
                      className={`p-2 flex flex-col justify-between gap-2 min-h-[135px] ${
                        worksInView ? 'bg-white' : 'bg-slate-50/90'
                      }`}
                    >
                      {isBlocked ? (
                        <div className="my-auto text-center p-2 rounded-lg bg-rose-50 border border-rose-200">
                          <span className="text-[10px] font-black text-rose-800 block">
                            No disponible
                          </span>
                          <span className="text-[9px] font-bold text-rose-600 block">
                            Fecha bloqueada
                          </span>
                        </div>
                      ) : !sched.active ? (
                        <div className="my-auto text-center p-2 rounded-lg border border-dashed border-slate-300 bg-slate-100/70">
                          <span className="text-[10px] font-black text-slate-600 block">
                            No trabaja
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 block">
                            No disponible
                          </span>
                        </div>
                      ) : !worksInView ? (
                        <div className="my-auto text-center p-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/60">
                          <span className="text-[10px] font-black text-amber-900 block">
                            No disponible en{' '}
                            {activeBranch === 'sucursal_1' ? 'Montevideo' : 'Rioja'}
                          </span>
                          {(effS1.active || effS2.active) && (
                            <span className="text-[9px] font-bold text-amber-800 block mt-0.5">
                              Atiende en {effS1.active ? 'Montevideo' : 'Rioja'} (
                              {formatShiftRanges(effS1.active ? effS1.ranges : effS2.ranges)})
                            </span>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1">
                            {visibleS1 && (
                              <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-200 text-[10px]">
                                <span className="font-black text-[#1E3A8A] block uppercase text-[9px]">
                                  Montevideo
                                </span>
                                <span className="font-black text-blue-950 block">
                                  {formatShiftRanges(effS1.ranges)}
                                </span>
                                {effS1.breaks.length > 0 && (
                                  <span className="text-[9px] font-bold text-amber-800 flex items-center gap-0.5">
                                    <Coffee className="w-2.5 h-2.5 shrink-0" />
                                    {effS1.breaks
                                      .map((b) => `${b.start}-${b.end}`)
                                      .join(', ')}
                                  </span>
                                )}
                              </div>
                            )}

                            {visibleS2 && (
                              <div className="p-1.5 rounded-lg bg-amber-50 border border-[#D4AF37] text-[10px]">
                                <span className="font-black text-[#0F172A] block uppercase text-[9px]">
                                  Rioja
                                </span>
                                <span className="font-black text-[#0F172A] block">
                                  {formatShiftRanges(effS2.ranges)}
                                </span>
                                {effS2.breaks.length > 0 && (
                                  <span className="text-[9px] font-bold text-amber-800 flex items-center gap-0.5">
                                    <Coffee className="w-2.5 h-2.5 shrink-0" />
                                    {effS2.breaks
                                      .map((b) => `${b.start}-${b.end}`)
                                      .join(', ')}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Occupied Appointments */}
                            {cellAppointments.length > 0 && (
                              <div className="space-y-1 pt-1">
                                {cellAppointments.map((apt) => (
                                  <button
                                    key={apt.id}
                                    type="button"
                                    onClick={() => onSelectAppointment?.(apt)}
                                    className="w-full text-left px-1.5 py-1 rounded bg-slate-100 hover:bg-blue-100 border border-slate-300 text-[10px] font-bold text-[#0F172A] truncate cursor-pointer"
                                    title={`Ocupado: ${apt.time} - ${apt.clientName} (${apt.serviceName})`}
                                  >
                                    {apt.time} · {apt.clientName.split(' ')[0]}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Availability Footer */}
                          <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-1">
                            {openSlot ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onSelectSlot?.(
                                    member.id,
                                    openSlot.time,
                                    day.dateStr,
                                    openSlot.branchId
                                  )
                                }
                                className="w-full py-1 px-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-950 text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              >
                                <Plus className="w-3 h-3 stroke-[3]" />
                                <span>Disponible ({openSlot.time})</span>
                              </button>
                            ) : (
                              <span className="w-full text-center py-1 rounded-lg bg-slate-100 text-slate-600 text-[9px] font-black">
                                Agenda completa
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* 3. VISTA STAFF DEL MES                                         */
        /* ============================================================== */
        <div className="bg-white border-t border-slate-300">
          {/* Professional filter pill bar for Staff Month View */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-slate-700">Filtrar profesional en el mes:</span>
            <button
              type="button"
              onClick={() => setMonthSelectedStaffId('todos')}
              className={`px-3 py-1 rounded-xl text-xs font-black border cursor-pointer transition-all ${
                monthSelectedStaffId === 'todos'
                  ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              Todo el equipo ({rosterStaff.length})
            </button>
            {rosterStaff.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setMonthSelectedStaffId(st.id)}
                className={`px-3 py-1 rounded-xl text-xs font-black border cursor-pointer transition-all flex items-center gap-1.5 ${
                  monthSelectedStaffId === st.id
                    ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: st.color || '#1E3A8A' }}
                />
                <span>{st.name}</span>
              </button>
            ))}
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100 text-center text-xs font-black text-[#0F172A] py-2.5">
            {DAY_LABELS.map((d) => (
              <div key={d.day}>{d.short}</div>
            ))}
          </div>

          {/* Month Calendar Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 min-h-[520px]">
            {monthCalendarDays.map((day) => {
              const isToday = day.dateStr === todayStr;
              const dow = parseDateDayOfWeek(day.dateStr);
              const staffToShow =
                monthSelectedStaffId === 'todos'
                  ? rosterStaff
                  : rosterStaff.filter((s) => s.id === monthSelectedStaffId);

              return (
                <div
                  key={day.dateStr}
                  onClick={() => {
                    onDateChange?.(day.dateStr);
                    handleSubModeChange('dia');
                  }}
                  className={`min-h-[115px] p-2 flex flex-col justify-between hover:bg-blue-50/40 cursor-pointer transition-colors ${
                    day.isCurrentMonth ? 'bg-white' : 'bg-slate-50/60 opacity-45'
                  }`}
                  title={`Ver detalle de Staff del Día (${day.dateStr})`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                        isToday ? 'bg-[#1E3A8A] text-white shadow-xs' : 'text-[#0F172A]'
                      }`}
                    >
                      {day.dayNum}
                    </span>
                  </div>

                  <div className="space-y-1 flex-1">
                    {staffToShow.length === 0 && day.isCurrentMonth && (
                      <div className="text-[9.5px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold truncate">
                        Agenda vacía · Sin prof.
                      </div>
                    )}
                    {staffToShow.map((st) => {
                      const isBlocked = st.blockedDates?.includes(day.dateStr);
                      const sched = getStaffDaySchedule(st, dow);
                      const effS1 = getStaffEffectiveShift(sched, 'sucursal_1');
                      const effS2 = getStaffEffectiveShift(sched, 'sucursal_2');
                      const visS1 =
                        (activeBranch === 'ambas' || activeBranch === 'sucursal_1') &&
                        effS1.active;
                      const visS2 =
                        (activeBranch === 'ambas' || activeBranch === 'sucursal_2') &&
                        effS2.active;
                      const works = !isBlocked && sched.active && (visS1 || visS2);

                      const aptCount = sourceAppointments.filter(
                        (a) =>
                          a.date === day.dateStr &&
                          a.staffId === st.id &&
                          a.status !== 'cancelado' &&
                          (activeBranch === 'ambas' ||
                            (a.branchId || 'sucursal_1') === activeBranch)
                      ).length;

                      const shortLabel =
                        monthSelectedStaffId === 'todos' ? `${st.name.split(' ')[0]}: ` : '';

                      if (!works) {
                        return (
                          <div
                            key={st.id}
                            className="text-[9.5px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold truncate"
                          >
                            {shortLabel}
                            {isBlocked
                              ? 'Bloqueado'
                              : !sched.active
                              ? 'No trabaja'
                              : `Sin ${activeBranch === 'sucursal_1' ? 'Mvd' : 'Rioja'}`}
                          </div>
                        );
                      }

                      const hoursText = [
                        visS1
                          ? `${activeBranch === 'ambas' ? 'Mvd ' : ''}${formatShiftRanges(
                              effS1.ranges
                            )}`
                          : null,
                        visS2
                          ? `${activeBranch === 'ambas' ? 'Rioja ' : ''}${formatShiftRanges(
                              effS2.ranges
                            )}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ');

                      return (
                        <div
                          key={st.id}
                          className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-950 font-black truncate"
                          title={`${st.name}: ${hoursText}${
                            aptCount > 0 ? ` (${aptCount} turnos)` : ''
                          }`}
                        >
                          {shortLabel}
                          {hoursText}
                          {aptCount > 0 ? ` (${aptCount}t)` : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {isStaffModalOpen && (
        <StaffModal
          staffToEdit={staffToEditInModal}
          initialBranchId={activeBranch}
          onClose={() => {
            setIsStaffModalOpen(false);
            setStaffToEditInModal(null);
          }}
          onSaved={() => {
            setIsStaffModalOpen(false);
            setStaffToEditInModal(null);
          }}
        />
      )}
    </div>
  );
}
