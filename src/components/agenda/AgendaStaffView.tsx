import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Plus, Clock, Users, User, Calendar, CheckCircle, Sparkles, AlertCircle } from 'lucide-react';
import { Appointment, BranchId, StaffMember } from '../../types';
import { useApp } from '../../context/AppContext';
import { StaffModal } from '../staff/StaffModal';
import { formatCurrency, getStatusBadge } from '../../utils/formatters';
import { getStaffDaySchedule, getStaffEffectiveShift, BRANCH_NAMES, timeToMinutes } from '../../utils/staffSchedule';

export interface AgendaStaffViewProps {
  currentDate?: string;
  onSelectAppointment?: (appointment: Appointment) => void;
  onSelectSlot?: (staffId: string, time: string) => void;
}

const START_HOUR = 8; // 08:00
const END_HOUR = 21; // 21:00
const DAY_START_MINUTES = START_HOUR * 60; // 480
const HOUR_HEIGHT = 72; // 72px per 60 minutes
const SLOT_HEIGHT = 36; // 36px per 30 minutes

// 30-minute interval slots
const SLOTS: string[] = [];
for (let h = START_HOUR; h < END_HOUR; h++) {
  const hStr = String(h).padStart(2, '0');
  SLOTS.push(`${hStr}:00`);
  SLOTS.push(`${hStr}:30`);
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const total = h * 60 + m + (durationMinutes || 30);
  const endH = Math.floor(total / 60);
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
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
    const [ah, am] = a.time.split(':').map(Number);
    const [bh, bm] = b.time.split(':').map(Number);
    const aStart = ah * 60 + am;
    const bStart = bh * 60 + bm;
    if (aStart !== bStart) return aStart - bStart;
    return (b.durationMinutes || 30) - (a.durationMinutes || 30);
  });

  const clusters: Appointment[][] = [];
  let currentCluster: Appointment[] = [];
  let clusterEnd = -1;

  for (const apt of sorted) {
    const [h, m] = apt.time.split(':').map(Number);
    const start = h * 60 + m;
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
      const [h, m] = apt.time.split(':').map(Number);
      const start = h * 60 + m;
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
      const [h, m] = apt.time.split(':').map(Number);
      const start = h * 60 + m;
      const duration = apt.durationMinutes || 30;

      const top = ((start - dayStartMinutes) / 60) * hourHeight;
      const height = Math.max((duration / 60) * hourHeight, 28);
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
  onSelectAppointment,
  onSelectSlot,
}: AgendaStaffViewProps = {}) {
  const { staff, appointments, allAppointments, selectedBranch, setSelectedBranch, business } = useApp();

  const [activeBranch, setActiveBranch] = useState<BranchId | 'ambas'>(selectedBranch || 'sucursal_1');
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  // Keep activeBranch in sync with context when globally changed
  useEffect(() => {
    if (selectedBranch && selectedBranch !== activeBranch && activeBranch !== 'ambas') {
      setActiveBranch(selectedBranch);
    }
  }, [selectedBranch]);

  const dateStr = currentDate || new Date().toISOString().split('T')[0];

  // Determine Day of Week (0: Sun, 1: Mon, ..., 6: Sat)
  const currentDayOfWeek = useMemo(() => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.getDay();
  }, [dateStr]);

  // Filter staff by the active sucursal and their schedule on this day
  const branchStaff = useMemo(() => {
    return staff.filter((s) => {
      if (!s.active) return false;
      if (activeBranch === 'ambas') return true;
      const daySchedule = getStaffDaySchedule(s, currentDayOfWeek);
      const shift = getStaffEffectiveShift(daySchedule, activeBranch);
      return shift.active;
    });
  }, [staff, activeBranch, currentDayOfWeek]);

  // Use allAppointments if available so we have full cross-branch visibility in Staff View
  const sourceAppointments = allAppointments && allAppointments.length > 0 ? allAppointments : appointments;

  // Filter appointments for this date and branch
  const dayAppointments = useMemo(() => {
    return sourceAppointments.filter((apt) => {
      if (apt.date !== dateStr) return false;
      if (apt.status === 'cancelado') return false;
      if (activeBranch === 'ambas') return true;
      
      const aptBranch: BranchId = apt.branchId || 'sucursal_1';
      return aptBranch === activeBranch;
    });
  }, [sourceAppointments, dateStr, activeBranch]);

  const handleBranchChange = (branch: BranchId | 'ambas') => {
    setActiveBranch(branch);
    if (branch === 'sucursal_1' || branch === 'sucursal_2') {
      setSelectedBranch(branch);
    }
  };

  const totalGridHeight = SLOTS.length * SLOT_HEIGHT;

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-xs overflow-hidden">
      {/* Top Controls Bar: Branch Toggle & Add Staff */}
      <div className="p-4 sm:p-5 bg-slate-100 border-b-2 border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-base sm:text-lg text-[#0F172A] leading-tight">
              Agenda por Profesional & Sucursales
            </h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Sincronizado en tiempo real
            </span>
          </div>
          <p className="text-xs text-slate-700 font-bold mt-0.5">
            Duración visual exacta y turnos por sucursal: Soham Montevideo (9:00 a 20:00) y Soham Rioja (9:00 a 20:00).
          </p>
        </div>

        {/* Branch Switch Buttons & Add Staff CTA */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white p-1 rounded-xl border-2 border-slate-300 shadow-2xs">
            <button
              type="button"
              onClick={() => handleBranchChange('sucursal_1')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border-2 ${
                activeBranch === 'sucursal_1'
                  ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                  : 'bg-white text-[#0F172A] border-slate-300 hover:bg-slate-100 hover:border-slate-400'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Soham Montevideo</span>
            </button>

            <button
              type="button"
              onClick={() => handleBranchChange('sucursal_2')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border-2 ${
                activeBranch === 'sucursal_2'
                  ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                  : 'bg-white text-[#0F172A] border-slate-300 hover:bg-slate-100 hover:border-slate-400'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Soham Rioja</span>
            </button>

            <button
              type="button"
              onClick={() => handleBranchChange('ambas')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border-2 ${
                activeBranch === 'ambas'
                  ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                  : 'bg-white text-[#0F172A] border-slate-300 hover:bg-slate-100 hover:border-slate-400'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Todas</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsStaffModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Agregar profesional al equipo"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Agregar Staff</span>
          </button>
        </div>
      </div>

      {/* Main Staff Schedule Matrix */}
      {branchStaff.length === 0 ? (
        <div className="p-12 text-center bg-white">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h4 className="text-sm font-black text-[#0F172A]">
            No hay profesionales asignados a {activeBranch === 'sucursal_1' ? 'Soham Montevideo' : activeBranch === 'sucursal_2' ? 'Soham Rioja' : 'este día'}
          </h4>
          <p className="text-xs text-slate-600 font-bold max-w-sm mx-auto mt-1 mb-4">
            Configura los horarios o sucursales de los profesionales para que atiendan en este local.
          </p>
          <button
            type="button"
            onClick={() => setIsStaffModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-black shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Agregar o Configurar Profesional</span>
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[700px] overflow-y-auto bg-white border-t border-slate-300">
          <div
            className="grid min-w-[750px] divide-x-2 divide-slate-300"
            style={{
              gridTemplateColumns: `80px repeat(${branchStaff.length}, minmax(195px, 1fr))`,
            }}
          >
            {/* Header: Hour Column Header */}
            <div className="sticky top-0 z-30 bg-slate-200 p-3 text-center text-xs font-black text-[#0F172A] border-b-2 border-slate-300 shadow-2xs">
              Hora
            </div>

            {/* Header: Staff Names Headers */}
            {branchStaff.map((member) => {
              const isBlockedDay = member.blockedDates?.includes(dateStr);
              const daySchedule = getStaffDaySchedule(member, currentDayOfWeek);
              const isWorkingDay = daySchedule.active;

              return (
                <div
                  key={member.id}
                  className="sticky top-0 z-30 bg-slate-100 p-2.5 text-center border-b-2 border-slate-300 flex flex-col items-center justify-center gap-1 shadow-2xs"
                >
                  <div className="flex items-center gap-2 max-w-full">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 shadow-2xs ring-2 ring-white"
                      style={{ backgroundColor: member.color || '#2563eb' }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-black text-[#0F172A] truncate">
                      {member.name}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] text-slate-700 font-bold truncate max-w-full">
                      {member.role}
                    </span>
                    {isBlockedDay ? (
                      <span className="text-[9px] font-black bg-rose-100 text-rose-900 px-1.5 py-0.2 rounded border border-rose-300">
                        Bloqueado / Vacaciones
                      </span>
                    ) : !isWorkingDay ? (
                      <span className="text-[9px] font-black bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded border border-amber-300">
                        Día de Descanso
                      </span>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5 text-[9px] font-extrabold">
                        {activeBranch !== 'ambas' ? (
                          <>
                            <span className="text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              {getStaffEffectiveShift(daySchedule, activeBranch).start} - {getStaffEffectiveShift(daySchedule, activeBranch).end}
                            </span>
                            {getStaffEffectiveShift(daySchedule, activeBranch).breaks?.length > 0 && (
                              <span className="text-amber-900 bg-amber-50 px-1 rounded border border-amber-200 text-[8.5px]">
                                Break: {getStaffEffectiveShift(daySchedule, activeBranch).breaks[0].start}-{getStaffEffectiveShift(daySchedule, activeBranch).breaks[0].end}
                              </span>
                            )}
                          </>
                        ) : daySchedule.branchId === 'ambas' && daySchedule.branchShifts ? (
                          <div className="flex flex-col gap-0.5 text-[8.5px]">
                            {daySchedule.branchShifts.sucursal_1?.active && (
                              <span className="text-blue-900 bg-blue-50 px-1 rounded border border-blue-200">
                                Montevideo: {daySchedule.branchShifts.sucursal_1.start}-{daySchedule.branchShifts.sucursal_1.end}
                              </span>
                            )}
                            {daySchedule.branchShifts.sucursal_2?.active && (
                              <span className="text-purple-900 bg-purple-50 px-1 rounded border border-purple-200">
                                Rioja: {daySchedule.branchShifts.sucursal_2.start}-{daySchedule.branchShifts.sucursal_2.end}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {daySchedule.start} - {daySchedule.end}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Time Column Rows */}
            <div
              className="relative border-r-2 border-slate-300 bg-slate-50"
              style={{ height: `${totalGridHeight}px` }}
            >
              {SLOTS.map((slot) => {
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

            {/* Staff Columns */}
            {branchStaff.map((member) => {
              const isBlockedDay = member.blockedDates?.includes(dateStr);
              const daySchedule = getStaffDaySchedule(member, currentDayOfWeek);
              const isWorkingDay = daySchedule.active;

              const effectiveShift = activeBranch !== 'ambas'
                ? getStaffEffectiveShift(daySchedule, activeBranch)
                : {
                    active: daySchedule.active,
                    start: daySchedule.start || '09:00',
                    end: daySchedule.end || '20:00',
                    breaks: daySchedule.breaks || [],
                    branchName: 'Ambas sucursales',
                  };

              const staffStartMinutes = timeToMinutes(effectiveShift.start);
              const staffEndMinutes = timeToMinutes(effectiveShift.end);

              const memberAppointments = dayAppointments.filter((a) => a.staffId === member.id);
              const layoutedAppointments = layoutStaffAppointments(
                memberAppointments,
                DAY_START_MINUTES,
                HOUR_HEIGHT
              );

              return (
                <div
                  key={member.id}
                  className="relative border-r-2 border-slate-300"
                  style={{ height: `${totalGridHeight}px` }}
                >
                  {/* Background 30-min slots */}
                  <div className="absolute inset-0 flex flex-col">
                    {SLOTS.map((slot) => {
                      const [slotH, slotM] = slot.split(':').map(Number);
                      const slotMinutes = slotH * 60 + slotM;
                      const isHour = slot.endsWith(':00');

                      // Check if slot falls in active appointment
                      const isOccupied = memberAppointments.some((apt) => {
                        const [aH, aM] = apt.time.split(':').map(Number);
                        const aptStart = aH * 60 + aM;
                        const aptEnd = aptStart + (apt.durationMinutes || 30);
                        return slotMinutes >= aptStart && slotMinutes < aptEnd;
                      });

                      const isOutOfHours = !effectiveShift.active || slotMinutes < staffStartMinutes || slotMinutes >= staffEndMinutes;

                      const isInBreak = effectiveShift.breaks && effectiveShift.breaks.some((brk) => {
                        const bStart = timeToMinutes(brk.start);
                        const bEnd = timeToMinutes(brk.end);
                        return slotMinutes >= bStart && slotMinutes < bEnd;
                      });

                      let cellBg = 'bg-white hover:bg-blue-50/80 cursor-pointer';
                      let cellText = '+ Agendar';

                      if (isBlockedDay) {
                        cellBg = 'bg-rose-50/70 cursor-not-allowed';
                        cellText = 'Día Bloqueado';
                      } else if (!isWorkingDay || !effectiveShift.active) {
                        cellBg = 'bg-amber-50/70 cursor-not-allowed';
                        cellText = !isWorkingDay ? 'Franco' : 'No atiende en este local';
                      } else if (isInBreak) {
                        cellBg = 'bg-amber-50/90 text-amber-900 cursor-not-allowed';
                        cellText = 'Descanso';
                      } else if (isOutOfHours) {
                        cellBg = 'bg-slate-100/90 cursor-not-allowed text-slate-400';
                        cellText = 'Fuera de horario';
                      } else if (isOccupied) {
                        cellBg = 'bg-slate-50 cursor-pointer';
                        cellText = 'Ocupado';
                      }

                      return (
                        <div
                          key={slot}
                          style={{ height: `${SLOT_HEIGHT}px` }}
                          className={`border-b transition-colors group flex items-center justify-center p-1 ${
                            isHour ? 'border-slate-300' : 'border-slate-200/80'
                          } ${cellBg}`}
                          onClick={() => {
                            if (!isBlockedDay && !isWorkingDay) return;
                            if (isBlockedDay) return;
                            if (onSelectSlot) onSelectSlot(member.id, slot);
                          }}
                        >
                          {!isOccupied && !isBlockedDay && isWorkingDay && !isOutOfHours && !isInBreak && (
                            <span className="text-[10px] font-bold text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                              <Plus className="w-3 h-3 stroke-[3]" />
                              <span>{cellText}</span>
                            </span>
                          )}
                          {(isBlockedDay || !isWorkingDay || isOutOfHours || isInBreak) && (
                            <span className="text-[9px] font-bold text-slate-400 select-none">
                              {cellText}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Foreground: Real Duration Appointments Layer */}
                  <div className="absolute inset-0 pointer-events-none p-1">
                    {layoutedAppointments.map((item) => {
                      const apt = item.appointment;
                      const endTime = calculateEndTime(apt.time, apt.durationMinutes || 30);
                      const status = getStatusBadge(apt.status);
                      const cardColor = apt.color || member.color || '#2563eb';
                      const branchTag = apt.branchId === 'sucursal_2' ? 'Rioja' : 'Montevideo';

                      return (
                        <div
                          key={apt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectAppointment) onSelectAppointment(apt);
                          }}
                          style={{
                            position: 'absolute',
                            top: `${item.top}px`,
                            height: `${item.height}px`,
                            left: `calc(${item.leftPercent}% + 3px)`,
                            width: `calc(${item.widthPercent}% - 6px)`,
                          }}
                          className="pointer-events-auto rounded-xl border-2 border-slate-300 bg-white hover:border-blue-600 hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col justify-between group shadow-xs"
                          title={`${apt.clientName} - ${apt.serviceName} (${apt.time} a ${endTime} hs) [${branchTag}]`}
                        >
                          {/* Left colored bar */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-2"
                            style={{ backgroundColor: cardColor }}
                          />

                          {/* Card Content with High-Contrast Typography */}
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
                              {activeBranch === 'ambas' && (
                                <span className="text-[9px] font-black text-slate-600 bg-slate-100 px-1 rounded">
                                  {branchTag}
                                </span>
                              )}
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
      )}

      {/* Staff Modal */}
      {isStaffModalOpen && (
        <StaffModal
          initialBranchId={activeBranch}
          onClose={() => setIsStaffModalOpen(false)}
        />
      )}
    </div>
  );
}
