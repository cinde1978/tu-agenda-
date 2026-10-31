import { Appointment, BranchId, StaffBranchScope, StaffBreak, StaffBranchShift, StaffDaySchedule, StaffMember } from '../types';

export const BRANCH_NAMES: Record<BranchId, string> = {
  sucursal_1: 'Soham Montevideo',
  sucursal_2: 'Soham Rioja',
};

export const DAY_LABELS = [
  { day: 1, name: 'Lunes', short: 'Lun' },
  { day: 2, name: 'Martes', short: 'Mar' },
  { day: 3, name: 'Miércoles', short: 'Mié' },
  { day: 4, name: 'Jueves', short: 'Jue' },
  { day: 5, name: 'Viernes', short: 'Vie' },
  { day: 6, name: 'Sábado', short: 'Sáb' },
  { day: 0, name: 'Domingo', short: 'Dom' },
];

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function checkBranchShiftsOverlap(
  shift1: { start: string; end: string; active?: boolean },
  shift2: { start: string; end: string; active?: boolean }
): boolean {
  if (shift1.active === false || shift2.active === false) return false;
  const s1Start = timeToMinutes(shift1.start);
  const s1End = timeToMinutes(shift1.end);
  const s2Start = timeToMinutes(shift2.start);
  const s2End = timeToMinutes(shift2.end);
  return Math.max(s1Start, s2Start) < Math.min(s1End, s2End);
}

export function getDefaultDaySchedule(
  day: number,
  defaultStart = '09:00',
  defaultEnd = '20:00',
  defaultBranch: 'sucursal_1' | 'sucursal_2' | 'ambas' = 'ambas'
): StaffDaySchedule {
  // Lunes a Sábado active by default, Domingo descanso
  const isActive = day !== 0;
  return {
    day,
    active: isActive,
    start: defaultStart,
    end: defaultEnd,
    breaks: [],
    branchId: defaultBranch,
    branchShifts: {
      sucursal_1: {
        active: defaultBranch === 'sucursal_1' || defaultBranch === 'ambas',
        start: defaultStart,
        end: defaultBranch === 'ambas' ? '13:00' : defaultEnd,
        breaks: [],
      },
      sucursal_2: {
        active: defaultBranch === 'sucursal_2' || defaultBranch === 'ambas',
        start: defaultBranch === 'ambas' ? '14:00' : defaultStart,
        end: defaultEnd,
        breaks: [],
      },
    },
  };
}

export function getDefaultWeeklySchedules(
  defaultStart = '09:00',
  defaultEnd = '20:00',
  defaultBranch: 'sucursal_1' | 'sucursal_2' | 'ambas' = 'ambas'
): StaffDaySchedule[] {
  return [1, 2, 3, 4, 5, 6, 0].map((d) =>
    getDefaultDaySchedule(d, defaultStart, defaultEnd, defaultBranch)
  );
}

/**
 * Recovers or builds a daily schedule for a staff member.
 * Backwards compatible with legacy workingDays, workingHoursStart and workingHoursEnd.
 */
export function getStaffDaySchedule(
  member: StaffMember,
  dayOfWeek: number
): StaffDaySchedule {
  if (member.daySchedules && member.daySchedules.length > 0) {
    const found = member.daySchedules.find((s) => s.day === dayOfWeek);
    if (found) {
      const safeStart = found.start || member.workingHoursStart || '09:00';
      const safeEnd = found.end || member.workingHoursEnd || '20:00';

      const existingS1 = found.branchShifts?.sucursal_1;
      const existingS2 = found.branchShifts?.sucursal_2;

      // If the day is explicitly inactive, both branch shifts are inactive
      const isMasterActive = found.active !== false;

      let s1Active = false;
      let s2Active = false;

      if (isMasterActive) {
        if (existingS1 !== undefined) {
          s1Active = Boolean(existingS1.active);
        } else {
          s1Active = found.branchId === 'sucursal_1' || found.branchId === 'ambas' || !found.branchId;
        }

        if (existingS2 !== undefined) {
          s2Active = Boolean(existingS2.active);
        } else {
          s2Active = found.branchId === 'sucursal_2' || found.branchId === 'ambas' || !found.branchId;
        }
      }

      const s1Start = existingS1?.start || safeStart;
      const s1End = existingS1?.end || safeEnd;
      const s1Breaks = Array.isArray(existingS1?.breaks)
        ? existingS1.breaks
        : (found.branchId === 'sucursal_1' ? (found.breaks || []) : []);

      const s2Start = existingS2?.start || safeStart;
      const s2End = existingS2?.end || safeEnd;
      const s2Breaks = Array.isArray(existingS2?.breaks)
        ? existingS2.breaks
        : (found.branchId === 'sucursal_2' ? (found.breaks || []) : []);

      const s1Shift: StaffBranchShift = {
        active: s1Active,
        start: s1Start,
        end: s1End,
        breaks: s1Breaks,
      };

      const s2Shift: StaffBranchShift = {
        active: s2Active,
        start: s2Start,
        end: s2End,
        breaks: s2Breaks,
      };

      // Determine scope
      let targetBranch: StaffBranchScope = 'ambas';
      if (s1Active && s2Active) {
        targetBranch = 'ambas';
      } else if (s1Active) {
        targetBranch = 'sucursal_1';
      } else if (s2Active) {
        targetBranch = 'sucursal_2';
      } else {
        targetBranch = found.branchId || 'ambas';
      }

      // Day is active only if master is active AND at least one branch is active
      const dayIsActive = isMasterActive && (s1Active || s2Active);

      // Determine overall start & end
      let calculatedStart = safeStart;
      let calculatedEnd = safeEnd;
      const activeStarts = [s1Active ? s1Start : null, s2Active ? s2Start : null].filter(Boolean) as string[];
      const activeEnds = [s1Active ? s1End : null, s2Active ? s2End : null].filter(Boolean) as string[];
      if (activeStarts.length > 0) calculatedStart = [...activeStarts].sort()[0];
      if (activeEnds.length > 0) calculatedEnd = [...activeEnds].sort().reverse()[0];

      return {
        ...found,
        active: dayIsActive,
        branchId: targetBranch,
        start: calculatedStart,
        end: calculatedEnd,
        breaks: Array.isArray(found.breaks) ? found.breaks : [],
        branchShifts: {
          sucursal_1: s1Shift,
          sucursal_2: s2Shift,
        },
      };
    }
  }

  // Fallback for unconfigured days: check member.workingDays
  const isWorking = Array.isArray(member.workingDays)
    ? member.workingDays.includes(dayOfWeek)
    : dayOfWeek !== 0;

  const targetBranch: StaffBranchScope = member.branchId || 'ambas';
  const start = member.workingHoursStart?.trim() || '09:00';
  const end = member.workingHoursEnd?.trim() || '20:00';

  const s1Active = isWorking && (targetBranch === 'sucursal_1' || targetBranch === 'ambas');
  const s2Active = isWorking && (targetBranch === 'sucursal_2' || targetBranch === 'ambas');

  return {
    day: dayOfWeek,
    active: isWorking && (s1Active || s2Active),
    isUnconfigured: true,
    start,
    end,
    breaks: [],
    branchId: targetBranch,
    branchShifts: {
      sucursal_1: {
        active: s1Active,
        start: targetBranch === 'ambas' ? '09:00' : start,
        end: targetBranch === 'ambas' ? '13:00' : end,
        breaks: [],
      },
      sucursal_2: {
        active: s2Active,
        start: targetBranch === 'ambas' ? '14:00' : start,
        end: end,
        breaks: [],
      },
    },
  };
}

export interface EffectiveStaffShift {
  active: boolean;
  start: string;
  end: string;
  breaks: StaffBreak[];
  branchName: string;
}

/**
 * Returns the effective working hours, breaks, and active status
 * of a staff member for a specific branch on a given day schedule.
 */
export function getStaffEffectiveShift(
  schedule: StaffDaySchedule,
  branchId: BranchId
): EffectiveStaffShift {
  const branchName = BRANCH_NAMES[branchId];
  if (!schedule.active) {
    return {
      active: false,
      start: schedule.start || '09:00',
      end: schedule.end || '20:00',
      breaks: [],
      branchName,
    };
  }

  // Priority 1: Check branchShifts directly
  if (schedule.branchShifts && schedule.branchShifts[branchId]) {
    const shift = schedule.branchShifts[branchId]!;
    return {
      active: Boolean(shift.active),
      start: shift.start || schedule.start || '09:00',
      end: shift.end || schedule.end || '18:00',
      breaks: Array.isArray(shift.breaks) ? shift.breaks : [],
      branchName,
    };
  }

  const assignedScope = schedule.branchId || 'ambas';

  // If assigned solely to the other branch, inactive in this branch
  if (assignedScope !== 'ambas' && assignedScope !== branchId) {
    return {
      active: false,
      start: schedule.start || '09:00',
      end: schedule.end || '20:00',
      breaks: [],
      branchName,
    };
  }

  // Fallback to schedule hours
  return {
    active: true,
    start: schedule.start || '09:00',
    end: schedule.end || '20:00',
    breaks: schedule.breaks || [],
    branchName,
  };
}

export interface StaffAvailabilityCheck {
  available: boolean;
  reason?: 'day_off' | 'outside_hours' | 'in_break' | 'date_blocked' | 'wrong_branch';
  message?: string;
  scheduleDetails?: StaffDaySchedule;
  effectiveShift?: EffectiveStaffShift;
}

/**
 * Validates if a professional is available on a specific date, start time, duration and branch,
 * including checking cross-branch overlapping appointments.
 */
export function checkStaffAvailability(
  member: StaffMember,
  dateStr: string,
  startTime: string,
  durationMinutes: number,
  appointmentBranchId?: BranchId,
  existingAppointments?: Appointment[],
  excludeAppointmentId?: string
): StaffAvailabilityCheck {
  // 1. Check blocked dates (vacaciones, francos extraordinarios)
  if (member.blockedDates && member.blockedDates.includes(dateStr)) {
    return {
      available: false,
      reason: 'date_blocked',
      message: `${member.name} tiene la fecha ${dateStr} marcada como bloqueada (franco o vacaciones).`,
    };
  }

  // 2. Resolve day of week
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = dateObj.getDay();

  const schedule = getStaffDaySchedule(member, dayOfWeek);
  const dayName = DAY_LABELS.find((l) => l.day === dayOfWeek)?.name || 'este día';

  // 3. Check if working day or rest day
  if (!schedule.active) {
    return {
      available: false,
      reason: 'day_off',
      message: `${member.name} no atiende los días ${dayName} (día de descanso semanal configurado).`,
      scheduleDetails: schedule,
    };
  }

  // 4. Check existing appointments for the SAME professional (cross-branch collision prevention)
  if (existingAppointments && existingAppointments.length > 0) {
    const slotStartMin = timeToMinutes(startTime);
    const slotEndMin = slotStartMin + (durationMinutes || 30);

    const conflictingApt = existingAppointments.find((apt) => {
      if (excludeAppointmentId && apt.id === excludeAppointmentId) return false;
      if (apt.date !== dateStr) return false;
      if (apt.staffId !== member.id) return false;
      if (apt.status === 'cancelado') return false;

      const aptStart = timeToMinutes(apt.time);
      const aptEnd = aptStart + (apt.durationMinutes || 30);
      // Strictly overlapping (consecutive slots do not overlap: e.g. 13:00 to 14:00 and 14:00 to 15:00)
      return Math.max(slotStartMin, aptStart) < Math.min(slotEndMin, aptEnd);
    });

    if (conflictingApt) {
      const conflictBranchName = conflictingApt.branchId === 'sucursal_2' ? 'Soham Rioja' : 'Soham Montevideo';
      return {
        available: false,
        reason: 'outside_hours',
        message: `${member.name} ya tiene un turno reservado de ${conflictingApt.time} a ${minutesToTime(timeToMinutes(conflictingApt.time) + (conflictingApt.durationMinutes || 30))} hs en ${conflictBranchName} con ${conflictingApt.clientName}. El sistema impide que un mismo profesional tenga turnos superpuestos.`,
        scheduleDetails: schedule,
      };
    }
  }

  // 5. Check branch match & specific branch shift
  if (appointmentBranchId) {
    const shift = getStaffEffectiveShift(schedule, appointmentBranchId);
    const branchLabel = BRANCH_NAMES[appointmentBranchId];

    if (!shift.active) {
      return {
        available: false,
        reason: 'wrong_branch',
        message: `${member.name} no atiende en ${branchLabel} los días ${dayName}.`,
        scheduleDetails: schedule,
        effectiveShift: shift,
      };
    }

    // Check working hours within this branch's shift
    const slotStartMin = timeToMinutes(startTime);
    const slotEndMin = slotStartMin + (durationMinutes || 30);
    const shiftStartMin = timeToMinutes(shift.start);
    const shiftEndMin = timeToMinutes(shift.end);

    if (slotStartMin < shiftStartMin || slotEndMin > shiftEndMin) {
      const endStr = minutesToTime(slotEndMin);
      return {
        available: false,
        reason: 'outside_hours',
        message: `${member.name} atiende en ${branchLabel} de ${shift.start} a ${shift.end} hs los ${dayName}. El turno (${startTime} - ${endStr} hs) queda fuera de su horario laboral en este local.`,
        scheduleDetails: schedule,
        effectiveShift: shift,
      };
    }

    // Check break intervals in this branch
    if (shift.breaks && shift.breaks.length > 0) {
      for (const brk of shift.breaks) {
        const brkStartMin = timeToMinutes(brk.start);
        const brkEndMin = timeToMinutes(brk.end);
        if (Math.max(slotStartMin, brkStartMin) < Math.min(slotEndMin, brkEndMin)) {
          const desc = brk.description ? ` (${brk.description})` : '';
          return {
            available: false,
            reason: 'in_break',
            message: `${member.name} tiene un descanso programado en ${branchLabel} de ${brk.start} a ${brk.end} hs${desc}.`,
            scheduleDetails: schedule,
            effectiveShift: shift,
          };
        }
      }
    }

    return {
      available: true,
      scheduleDetails: schedule,
      effectiveShift: shift,
    };
  }

  // If no branch was specified, check general hours
  const slotStartMin = timeToMinutes(startTime);
  const slotEndMin = slotStartMin + (durationMinutes || 30);
  const schedStartMin = timeToMinutes(schedule.start || '09:00');
  const schedEndMin = timeToMinutes(schedule.end || '20:00');

  if (slotStartMin < schedStartMin || slotEndMin > schedEndMin) {
    const endStr = minutesToTime(slotEndMin);
    return {
      available: false,
      reason: 'outside_hours',
      message: `${member.name} atiende de ${schedule.start} a ${schedule.end} los ${dayName}. El turno (${startTime} - ${endStr} hs) queda fuera de su horario laboral.`,
      scheduleDetails: schedule,
    };
  }

  return {
    available: true,
    scheduleDetails: schedule,
  };
}

export interface ScheduleConflict {
  appointment: Appointment;
  reason: string;
}

/**
 * When modifying a staff member's schedule or blocked dates,
 * finds any already scheduled appointments that now conflict with the new setup.
 * NOTE: These appointments are NOT deleted or moved; they are reported so the user can be warned.
 */
export function findScheduleConflicts(
  memberId: string,
  newDaySchedules: StaffDaySchedule[],
  newBlockedDates: string[],
  existingAppointments: Appointment[]
): ScheduleConflict[] {
  const staffAppointments = existingAppointments.filter(
    (apt) => apt.staffId === memberId && apt.status !== 'cancelado'
  );

  const conflicts: ScheduleConflict[] = [];

  for (const apt of staffAppointments) {
    // 1. Date blocked?
    if (newBlockedDates.includes(apt.date)) {
      conflicts.push({
        appointment: apt,
        reason: `La fecha ${apt.date} ahora está bloqueada para este profesional.`,
      });
      continue;
    }

    // 2. Day schedule
    const [y, m, d] = apt.date.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    const daySched = newDaySchedules.find((s) => s.day === dayOfWeek);

    if (!daySched || !daySched.active) {
      const dayName = DAY_LABELS.find((l) => l.day === dayOfWeek)?.name || 'ese día';
      conflicts.push({
        appointment: apt,
        reason: `El día ${dayName} (${apt.date}) ahora está marcado como descanso semanal.`,
      });
      continue;
    }

    // 3. Branch check
    const aptBranch: BranchId = apt.branchId || 'sucursal_1';
    const effectiveShift = getStaffEffectiveShift(daySched, aptBranch);

    if (!effectiveShift.active) {
      conflicts.push({
        appointment: apt,
        reason: `El profesional ya no atiende en ${effectiveShift.branchName} los días ${DAY_LABELS.find((l) => l.day === dayOfWeek)?.name || 'ese día'}.`,
      });
      continue;
    }

    // 4. Hours
    const aptStart = timeToMinutes(apt.time);
    const aptEnd = aptStart + (apt.durationMinutes || 30);
    const schedStart = timeToMinutes(effectiveShift.start);
    const schedEnd = timeToMinutes(effectiveShift.end);

    if (aptStart < schedStart || aptEnd > schedEnd) {
      conflicts.push({
        appointment: apt,
        reason: `Horario del turno (${apt.time} - ${minutesToTime(aptEnd)} hs) excede la jornada en ${effectiveShift.branchName} (${effectiveShift.start} a ${effectiveShift.end} hs).`,
      });
      continue;
    }

    // 5. Breaks
    if (effectiveShift.breaks && effectiveShift.breaks.length > 0) {
      for (const brk of effectiveShift.breaks) {
        const bStart = timeToMinutes(brk.start);
        const bEnd = timeToMinutes(brk.end);
        if (Math.max(aptStart, bStart) < Math.min(aptEnd, bEnd)) {
          conflicts.push({
            appointment: apt,
            reason: `Coincide con el descanso en ${effectiveShift.branchName} de ${brk.start} a ${brk.end} hs${brk.description ? ` (${brk.description})` : ''}.`,
          });
          break;
        }
      }
    }
  }

  return conflicts;
}
