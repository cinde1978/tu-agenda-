import {
  Appointment,
  BranchId,
  StaffBranchScope,
  StaffBreak,
  StaffBranchShift,
  StaffDaySchedule,
  StaffMember,
  StaffTimeRange,
} from '../types';

export const BRANCH_NAMES: Record<BranchId, string> = {
  sucursal_1: 'Soham Montevideo',
  sucursal_2: 'Soham Rioja',
};

export const BRANCH_SHORT_NAMES: Record<BranchId, string> = {
  sucursal_1: 'Montevideo',
  sucursal_2: 'Rioja',
};

export const SCOPE_NAMES: Record<StaffBranchScope, string> = {
  sucursal_1: 'Soham Montevideo',
  sucursal_2: 'Soham Rioja',
  ambas: 'Ambas Sucursales',
};

export const SCOPE_SHORT_NAMES: Record<StaffBranchScope, string> = {
  sucursal_1: 'Montevideo',
  sucursal_2: 'Rioja',
  ambas: 'Ambas Sucursales',
};

export const ALL_WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0] as const;

export const DAY_LABELS = [
  { day: 1, name: 'Lunes', short: 'Lun' },
  { day: 2, name: 'Martes', short: 'Mar' },
  { day: 3, name: 'Miércoles', short: 'Mié' },
  { day: 4, name: 'Jueves', short: 'Jue' },
  { day: 5, name: 'Viernes', short: 'Vie' },
  { day: 6, name: 'Sábado', short: 'Sáb' },
  { day: 0, name: 'Domingo', short: 'Dom' },
];

export function isValidTimeString(timeStr?: string | null): boolean {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const trimmed = timeStr.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return false;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return Number.isInteger(h) && Number.isInteger(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

export function timeToMinutes(timeStr: string): number {
  if (!isValidTimeString(timeStr)) return 0;
  const [h, m] = timeStr.trim().split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseDateDayOfWeek(dateStr: string): number {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date().getDay();
  }
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return new Date().getDay();
  }
  const [y, m, d] = parts;
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return Number.isNaN(dt.getTime()) ? new Date().getDay() : dt.getDay();
}

export function createEmptyBranchShift(): StaffBranchShift {
  return {
    active: false,
    start: '',
    end: '',
    ranges: [],
    breaks: [],
  };
}

export function createEmptyDaySchedule(
  day: number,
  branchScope: StaffBranchScope = 'ambas'
): StaffDaySchedule {
  return {
    day,
    active: false,
    start: '',
    end: '',
    breaks: [],
    branchId: branchScope,
    branchShifts: {
      sucursal_1: createEmptyBranchShift(),
      sucursal_2: createEmptyBranchShift(),
    },
  };
}

export function createEmptyWeeklySchedules(
  branchScope: StaffBranchScope = 'ambas'
): StaffDaySchedule[] {
  return ALL_WEEK_DAYS.map((d) => createEmptyDaySchedule(d, branchScope));
}

/**
 * Legacy helper kept without imposing predetermined schedules or breaks.
 */
export function getDefaultDaySchedule(
  day: number,
  _defaultStart = '',
  _defaultEnd = '',
  defaultBranch: StaffBranchScope = 'ambas'
): StaffDaySchedule {
  return createEmptyDaySchedule(day, defaultBranch);
}

export function getDefaultWeeklySchedules(
  _defaultStart = '',
  _defaultEnd = '',
  defaultBranch: StaffBranchScope = 'ambas'
): StaffDaySchedule[] {
  return createEmptyWeeklySchedules(defaultBranch);
}

/**
 * Extracts normalized time ranges for a branch shift.
 * When preserveIncomplete is true (inside the schedule editor), incomplete ranges are preserved so inputs remain editable.
 */
export function getShiftRanges(
  shift?: StaffBranchShift | null,
  preserveIncomplete = false
): StaffTimeRange[] {
  if (!shift) return [];
  if (!preserveIncomplete && !shift.active) return [];

  if (Array.isArray(shift.ranges) && shift.ranges.length > 0) {
    if (preserveIncomplete) {
      return shift.ranges.map((r, idx) => ({
        id: r.id || `rng_${idx}`,
        start: r.start || '',
        end: r.end || '',
      }));
    }

    return shift.ranges
      .filter(
        (r) =>
          isValidTimeString(r.start) &&
          isValidTimeString(r.end) &&
          timeToMinutes(r.end) > timeToMinutes(r.start)
      )
      .map((r, idx) => ({
        id: r.id || `rng_${idx}`,
        start: r.start.trim(),
        end: r.end.trim(),
      }))
      .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  }

  // Fallback for single-range shift stored via start & end
  if (isValidTimeString(shift.start) && isValidTimeString(shift.end)) {
    if (preserveIncomplete || timeToMinutes(shift.end) > timeToMinutes(shift.start)) {
      return [
        {
          id: 'rng_0',
          start: shift.start.trim(),
          end: shift.end.trim(),
        },
      ];
    }
  }

  if (preserveIncomplete && shift.active) {
    return [
      {
        id: 'rng_0',
        start: shift.start || '',
        end: shift.end || '',
      },
    ];
  }

  return [];
}

export function getValidBreaks(breaks?: StaffBreak[] | null): StaffBreak[] {
  if (!Array.isArray(breaks)) return [];
  return breaks
    .filter(
      (b) =>
        isValidTimeString(b.start) &&
        isValidTimeString(b.end) &&
        timeToMinutes(b.end) > timeToMinutes(b.start)
    )
    .map((b, idx) => ({
      id: b.id || `brk_${idx}`,
      start: b.start.trim(),
      end: b.end.trim(),
      description: b.description || '',
    }))
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
}

export function formatShiftRanges(ranges: StaffTimeRange[]): string {
  const valid = ranges.filter(
    (r) =>
      isValidTimeString(r.start) &&
      isValidTimeString(r.end) &&
      timeToMinutes(r.end) > timeToMinutes(r.start)
  );
  if (valid.length === 0) return 'Sin horario';
  return valid.map((r) => `${r.start} - ${r.end}`).join(', ');
}

export function checkInternalRangesOverlap(
  ranges: StaffTimeRange[]
): { overlaps: boolean; rangeA?: StaffTimeRange; rangeB?: StaffTimeRange } {
  const valid = ranges.filter(
    (r) =>
      isValidTimeString(r.start) &&
      isValidTimeString(r.end) &&
      timeToMinutes(r.end) > timeToMinutes(r.start)
  );
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const a = valid[i];
      const b = valid[j];
      if (Math.max(timeToMinutes(a.start), timeToMinutes(b.start)) < Math.min(timeToMinutes(a.end), timeToMinutes(b.end))) {
        return { overlaps: true, rangeA: a, rangeB: b };
      }
    }
  }
  return { overlaps: false };
}

export function checkRangesOverlap(
  ranges1: StaffTimeRange[],
  ranges2: StaffTimeRange[]
): { overlaps: boolean; rangeA?: StaffTimeRange; rangeB?: StaffTimeRange } {
  const v1 = ranges1.filter(
    (r) =>
      isValidTimeString(r.start) &&
      isValidTimeString(r.end) &&
      timeToMinutes(r.end) > timeToMinutes(r.start)
  );
  const v2 = ranges2.filter(
    (r) =>
      isValidTimeString(r.start) &&
      isValidTimeString(r.end) &&
      timeToMinutes(r.end) > timeToMinutes(r.start)
  );

  for (const a of v1) {
    for (const b of v2) {
      if (Math.max(timeToMinutes(a.start), timeToMinutes(b.start)) < Math.min(timeToMinutes(a.end), timeToMinutes(b.end))) {
        return { overlaps: true, rangeA: a, rangeB: b };
      }
    }
  }
  return { overlaps: false };
}

export function checkBranchShiftsOverlap(
  shift1?: StaffBranchShift | null,
  shift2?: StaffBranchShift | null
): boolean {
  if (!shift1?.active || !shift2?.active) return false;
  const r1 = getShiftRanges(shift1);
  const r2 = getShiftRanges(shift2);
  if (r1.length === 0 || r2.length === 0) return false;
  return checkRangesOverlap(r1, r2).overlaps;
}

/**
 * Recovers and normalizes a daily schedule for a staff member without imposing predetermined hours or breaks.
 */
export function getStaffDaySchedule(
  member: StaffMember,
  dayOfWeek: number
): StaffDaySchedule {
  const defaultScope: StaffBranchScope = member.branchId || 'ambas';

  if (Array.isArray(member.daySchedules) && member.daySchedules.length > 0) {
    const found = member.daySchedules.find((s) => s.day === dayOfWeek);
    if (!found) {
      return createEmptyDaySchedule(dayOfWeek, defaultScope);
    }

    const isMasterActive = found.active === true;
    const existingS1 = found.branchShifts?.sucursal_1;
    const existingS2 = found.branchShifts?.sucursal_2;
    const hasExplicitBranchShifts = existingS1 !== undefined || existingS2 !== undefined;

    let s1RequestedActive = false;
    let s2RequestedActive = false;

    if (isMasterActive) {
      if (hasExplicitBranchShifts) {
        s1RequestedActive = Boolean(existingS1?.active);
        s2RequestedActive = Boolean(existingS2?.active);
      } else {
        const legacyScope = found.branchId || defaultScope;
        s1RequestedActive = legacyScope === 'sucursal_1' || legacyScope === 'ambas';
        s2RequestedActive = legacyScope === 'sucursal_2' || legacyScope === 'ambas';
      }
    }

    const rawS1: StaffBranchShift = {
      active: s1RequestedActive,
      start: existingS1?.start ?? (s1RequestedActive && !hasExplicitBranchShifts ? found.start || '' : ''),
      end: existingS1?.end ?? (s1RequestedActive && !hasExplicitBranchShifts ? found.end || '' : ''),
      ranges: existingS1?.ranges,
      breaks: Array.isArray(existingS1?.breaks)
        ? existingS1!.breaks
        : !hasExplicitBranchShifts && s1RequestedActive
        ? found.breaks || []
        : [],
    };

    const rawS2: StaffBranchShift = {
      active: s2RequestedActive,
      start: existingS2?.start ?? (s2RequestedActive && !hasExplicitBranchShifts ? found.start || '' : ''),
      end: existingS2?.end ?? (s2RequestedActive && !hasExplicitBranchShifts ? found.end || '' : ''),
      ranges: existingS2?.ranges,
      breaks: Array.isArray(existingS2?.breaks)
        ? existingS2!.breaks
        : !hasExplicitBranchShifts && s2RequestedActive && !s1RequestedActive
        ? found.breaks || []
        : [],
    };

    const s1Ranges = getShiftRanges(rawS1);
    const s2Ranges = getShiftRanges(rawS2);

    const s1Active = isMasterActive && s1RequestedActive && s1Ranges.length > 0;
    const s2Active = isMasterActive && s2RequestedActive && s2Ranges.length > 0;

    // Also preserve stored inactive ranges metadata so re-enabling a day in editor doesn't wipe typed values if any
    const preservedS1Ranges = s1Active
      ? s1Ranges
      : getShiftRanges({ ...rawS1, active: true }).map((r) => ({ ...r }));
    const preservedS2Ranges = s2Active
      ? s2Ranges
      : getShiftRanges({ ...rawS2, active: true }).map((r) => ({ ...r }));

    const s1Shift: StaffBranchShift = {
      active: s1Active,
      start: s1Active ? s1Ranges[0].start : preservedS1Ranges[0]?.start || '',
      end: s1Active ? s1Ranges[s1Ranges.length - 1].end : preservedS1Ranges[preservedS1Ranges.length - 1]?.end || '',
      ranges: s1Active ? s1Ranges : preservedS1Ranges,
      breaks: getValidBreaks(rawS1.breaks),
    };

    const s2Shift: StaffBranchShift = {
      active: s2Active,
      start: s2Active ? s2Ranges[0].start : preservedS2Ranges[0]?.start || '',
      end: s2Active ? s2Ranges[s2Ranges.length - 1].end : preservedS2Ranges[preservedS2Ranges.length - 1]?.end || '',
      ranges: s2Active ? s2Ranges : preservedS2Ranges,
      breaks: getValidBreaks(rawS2.breaks),
    };

    const dayIsActive = isMasterActive && (s1Active || s2Active);

    let targetBranch: StaffBranchScope = found.branchId || defaultScope;
    if (s1Active && s2Active) targetBranch = 'ambas';
    else if (s1Active) targetBranch = 'sucursal_1';
    else if (s2Active) targetBranch = 'sucursal_2';

    const allActiveRanges = [...(s1Active ? s1Ranges : []), ...(s2Active ? s2Ranges : [])];
    const overallStart =
      allActiveRanges.length > 0
        ? [...allActiveRanges].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))[0].start
        : '';
    const overallEnd =
      allActiveRanges.length > 0
        ? [...allActiveRanges].sort((a, b) => timeToMinutes(b.end) - timeToMinutes(a.end))[0].end
        : '';

    return {
      day: dayOfWeek,
      active: dayIsActive,
      branchId: targetBranch,
      start: overallStart,
      end: overallEnd,
      breaks: getValidBreaks(found.breaks),
      branchShifts: {
        sucursal_1: s1Shift,
        sucursal_2: s2Shift,
      },
    };
  }

  // Fallback ONLY if legacy workingDays AND valid workingHoursStart/End were explicitly saved
  const hasLegacyHours =
    isValidTimeString(member.workingHoursStart) &&
    isValidTimeString(member.workingHoursEnd) &&
    timeToMinutes(member.workingHoursEnd) > timeToMinutes(member.workingHoursStart);

  const isWorking =
    hasLegacyHours &&
    Array.isArray(member.workingDays) &&
    member.workingDays.includes(dayOfWeek);

  if (!isWorking) {
    return createEmptyDaySchedule(dayOfWeek, defaultScope);
  }

  const start = member.workingHoursStart.trim();
  const end = member.workingHoursEnd.trim();
  const s1Active = defaultScope === 'sucursal_1' || defaultScope === 'ambas';
  const s2Active = defaultScope === 'sucursal_2';

  const singleRange: StaffTimeRange = { id: 'rng_0', start, end };

  return {
    day: dayOfWeek,
    active: s1Active || s2Active,
    start,
    end,
    breaks: [],
    branchId: s1Active && s2Active ? 'ambas' : s1Active ? 'sucursal_1' : 'sucursal_2',
    branchShifts: {
      sucursal_1: s1Active
        ? { active: true, start, end, ranges: [{ ...singleRange }], breaks: [] }
        : createEmptyBranchShift(),
      sucursal_2: s2Active
        ? { active: true, start, end, ranges: [{ ...singleRange }], breaks: [] }
        : createEmptyBranchShift(),
    },
  };
}

/**
 * Normalizes a StaffMember record so all 7 days (Lunes a Domingo), workingDays, and branchId remain 100% consistent.
 */
export function normalizeStaffMember(member: StaffMember): StaffMember {
  const normalizedSchedules = ALL_WEEK_DAYS.map((d) => getStaffDaySchedule(member, d));
  const activeWorkingDays = normalizedSchedules.filter((s) => s.active).map((s) => s.day);

  const worksInMvd = normalizedSchedules.some((s) => s.active && s.branchShifts?.sucursal_1?.active);
  const worksInRioja = normalizedSchedules.some((s) => s.active && s.branchShifts?.sucursal_2?.active);

  let resolvedBranchScope: StaffBranchScope = member.branchId || 'ambas';
  if (worksInMvd && worksInRioja) {
    resolvedBranchScope = 'ambas';
  } else if (worksInMvd && !worksInRioja) {
    resolvedBranchScope = 'sucursal_1';
  } else if (worksInRioja && !worksInMvd) {
    resolvedBranchScope = 'sucursal_2';
  }

  const firstActive = normalizedSchedules.find((s) => s.active);

  return {
    ...member,
    branchId: resolvedBranchScope,
    workingDays: activeWorkingDays,
    workingHoursStart: firstActive ? firstActive.start : '',
    workingHoursEnd: firstActive ? firstActive.end : '',
    blockedDates: Array.isArray(member.blockedDates) ? member.blockedDates : [],
    active: member.active !== false,
    daySchedules: normalizedSchedules,
  };
}

export interface EffectiveStaffShift {
  active: boolean;
  start: string;
  end: string;
  ranges: StaffTimeRange[];
  breaks: StaffBreak[];
  branchName: string;
}

/**
 * Returns the effective working ranges, breaks, and active status
 * of a staff member for a specific branch on a given day schedule.
 */
export function getStaffEffectiveShift(
  schedule: StaffDaySchedule,
  branchId: BranchId
): EffectiveStaffShift {
  const branchName = BRANCH_NAMES[branchId];
  if (!schedule || !schedule.active) {
    return {
      active: false,
      start: '',
      end: '',
      ranges: [],
      breaks: [],
      branchName,
    };
  }

  const shift = schedule.branchShifts?.[branchId];
  if (shift) {
    const ranges = getShiftRanges(shift);
    const isActive = Boolean(shift.active) && ranges.length > 0;
    return {
      active: isActive,
      start: isActive ? ranges[0].start : '',
      end: isActive ? ranges[ranges.length - 1].end : '',
      ranges: isActive ? ranges : [],
      breaks: isActive ? getValidBreaks(shift.breaks) : [],
      branchName,
    };
  }

  const assignedScope = schedule.branchId || 'ambas';
  if (assignedScope !== 'ambas' && assignedScope !== branchId) {
    return {
      active: false,
      start: '',
      end: '',
      ranges: [],
      breaks: [],
      branchName,
    };
  }

  if (
    isValidTimeString(schedule.start) &&
    isValidTimeString(schedule.end) &&
    timeToMinutes(schedule.end) > timeToMinutes(schedule.start)
  ) {
    const fallbackRange: StaffTimeRange = {
      id: 'rng_0',
      start: schedule.start,
      end: schedule.end,
    };
    return {
      active: true,
      start: schedule.start,
      end: schedule.end,
      ranges: [fallbackRange],
      breaks: getValidBreaks(schedule.breaks),
      branchName,
    };
  }

  return {
    active: false,
    start: '',
    end: '',
    ranges: [],
    breaks: [],
    branchName,
  };
}

/**
 * Resolves the real branch membership of a staff member based on their active shifts
 * and assigned branch scope, ensuring clean counters (e.g. Todas: 1, Montevideo: 1, Rioja: 0).
 */
export function getStaffBranchMembership(member: StaffMember): {
  belongsToS1: boolean;
  belongsToS2: boolean;
  scope: StaffBranchScope;
  label: string;
} {
  if (!member || member.active === false) {
    return {
      belongsToS1: false,
      belongsToS2: false,
      scope: 'ambas',
      label: 'Inactivo',
    };
  }

  const hasShiftsS1 = ALL_WEEK_DAYS.some((d) => {
    const sched = getStaffDaySchedule(member, d);
    return getStaffEffectiveShift(sched, 'sucursal_1').active;
  });

  const hasShiftsS2 = ALL_WEEK_DAYS.some((d) => {
    const sched = getStaffDaySchedule(member, d);
    return getStaffEffectiveShift(sched, 'sucursal_2').active;
  });

  // If active shifts exist in one or both branches, shifts define the real roster
  if (hasShiftsS1 && hasShiftsS2) {
    return {
      belongsToS1: true,
      belongsToS2: true,
      scope: 'ambas',
      label: 'Ambas sucursales (Montevideo / Rioja)',
    };
  }

  if (hasShiftsS1 && !hasShiftsS2) {
    return {
      belongsToS1: true,
      belongsToS2: false,
      scope: 'sucursal_1',
      label: 'Soham Montevideo',
    };
  }

  if (!hasShiftsS1 && hasShiftsS2) {
    return {
      belongsToS1: false,
      belongsToS2: true,
      scope: 'sucursal_2',
      label: 'Soham Rioja',
    };
  }

  // If no shifts are currently active, use declared branchId
  if (member.branchId === 'sucursal_2') {
    return {
      belongsToS1: false,
      belongsToS2: true,
      scope: 'sucursal_2',
      label: 'Soham Rioja',
    };
  }

  if (member.branchId === 'ambas') {
    return {
      belongsToS1: true,
      belongsToS2: true,
      scope: 'ambas',
      label: 'Ambas sucursales (Montevideo / Rioja)',
    };
  }

  // Default to Montevideo (sucursal_1)
  return {
    belongsToS1: true,
    belongsToS2: false,
    scope: 'sucursal_1',
    label: 'Soham Montevideo',
  };
}

/**
 * Determines whether an active staff member is part of a branch's roster (even on days off like Monday).
 */
export function staffBelongsToBranch(
  member: StaffMember,
  branchFilter: BranchId | 'ambas'
): boolean {
  if (!member || member.active === false) return false;
  if (branchFilter === 'ambas') return true;

  const membership = getStaffBranchMembership(member);
  return branchFilter === 'sucursal_1' ? membership.belongsToS1 : membership.belongsToS2;
}

/**
 * Formats a human-readable summary of a day schedule for a given branch filter.
 */
export function formatDayScheduleSummary(
  schedule: StaffDaySchedule,
  branchFilter: BranchId | 'ambas' = 'ambas'
): string {
  if (!schedule || !schedule.active) return 'No trabaja';

  if (branchFilter !== 'ambas') {
    const eff = getStaffEffectiveShift(schedule, branchFilter);
    if (!eff.active) return `No atiende en ${BRANCH_SHORT_NAMES[branchFilter]}`;
    return formatShiftRanges(eff.ranges);
  }

  const s1 = getStaffEffectiveShift(schedule, 'sucursal_1');
  const s2 = getStaffEffectiveShift(schedule, 'sucursal_2');
  const parts: string[] = [];
  if (s1.active) parts.push(`Montevideo: ${formatShiftRanges(s1.ranges)}`);
  if (s2.active) parts.push(`Rioja: ${formatShiftRanges(s2.ranges)}`);
  return parts.length > 0 ? parts.join(' · ') : 'No trabaja';
}

/**
 * Calculates net working minutes inside an effective shift (sum of ranges minus breaks).
 */
export function getShiftNetMinutes(shift: EffectiveStaffShift): number {
  if (!shift || !shift.active || shift.ranges.length === 0) return 0;

  let total = 0;
  for (const rng of shift.ranges) {
    const rStart = timeToMinutes(rng.start);
    const rEnd = timeToMinutes(rng.end);
    if (rEnd <= rStart) continue;
    let rangeNet = rEnd - rStart;
    for (const brk of shift.breaks) {
      const bStart = timeToMinutes(brk.start);
      const bEnd = timeToMinutes(brk.end);
      const overlap = Math.max(0, Math.min(rEnd, bEnd) - Math.max(rStart, bStart));
      rangeNet -= overlap;
    }
    total += Math.max(0, rangeNet);
  }
  return total;
}

export type SlotAvailabilityStatus =
  | 'available'
  | 'occupied'
  | 'occupied_other_branch'
  | 'in_break'
  | 'outside_hours'
  | 'day_off'
  | 'wrong_branch'
  | 'blocked'
  | 'inactive';

export interface SlotAvailabilityResult {
  available: boolean;
  status: SlotAvailabilityStatus;
  label: string;
  activeBranchId?: BranchId;
  appointment?: Appointment;
  breakItem?: StaffBreak;
}

/**
 * Evaluates a timeline slot [slotStartMin, slotEndMin] for a professional on a date and branch filter.
 * Used identically across Staff Day View and General Day View.
 */
export function getSlotAvailabilityForStaff(
  member: StaffMember,
  dateStr: string,
  slotStartMin: number,
  slotEndMin: number,
  branchFilter: BranchId | 'ambas',
  existingAppointments?: Appointment[]
): SlotAvailabilityResult {
  if (!member || !member.active) {
    return { available: false, status: 'inactive', label: 'Inactivo' };
  }

  if (member.blockedDates?.includes(dateStr)) {
    return { available: false, status: 'blocked', label: 'Fecha bloqueada' };
  }

  const dayOfWeek = parseDateDayOfWeek(dateStr);
  const daySchedule = getStaffDaySchedule(member, dayOfWeek);

  if (!daySchedule.active) {
    return { available: false, status: 'day_off', label: 'No trabaja' };
  }

  // Check overlapping non-cancelled appointments for this professional across ALL branches
  if (Array.isArray(existingAppointments) && existingAppointments.length > 0) {
    const overlapping = existingAppointments.find((apt) => {
      if (apt.date !== dateStr || apt.staffId !== member.id || apt.status === 'cancelado') {
        return false;
      }
      const aStart = timeToMinutes(apt.time);
      const aEnd = aStart + (apt.durationMinutes || 30);
      return Math.max(slotStartMin, aStart) < Math.min(slotEndMin, aEnd);
    });

    if (overlapping) {
      const aptBranch: BranchId = overlapping.branchId || 'sucursal_1';
      if (branchFilter === 'ambas' || aptBranch === branchFilter) {
        return {
          available: false,
          status: 'occupied',
          label: 'Ocupado',
          activeBranchId: aptBranch,
          appointment: overlapping,
        };
      }
      return {
        available: false,
        status: 'occupied_other_branch',
        label: `Ocupado en ${BRANCH_SHORT_NAMES[aptBranch]}`,
        activeBranchId: aptBranch,
        appointment: overlapping,
      };
    }
  }

  const candidateBranches: BranchId[] =
    branchFilter === 'ambas' ? ['sucursal_1', 'sucursal_2'] : [branchFilter];

  const activeShifts = candidateBranches
    .map((bId) => ({ branchId: bId, shift: getStaffEffectiveShift(daySchedule, bId) }))
    .filter((entry) => entry.shift.active);

  if (activeShifts.length === 0) {
    return {
      available: false,
      status: 'wrong_branch',
      label:
        branchFilter === 'ambas'
          ? 'No trabaja'
          : `No atiende en ${BRANCH_SHORT_NAMES[branchFilter]}`,
    };
  }

  let matchedBreak: StaffBreak | undefined;

  for (const { branchId, shift } of activeShifts) {
    const hitBreak = shift.breaks.find((brk) => {
      const bStart = timeToMinutes(brk.start);
      const bEnd = timeToMinutes(brk.end);
      return Math.max(slotStartMin, bStart) < Math.min(slotEndMin, bEnd);
    });

    const fitsInRange = shift.ranges.some((rng) => {
      const rStart = timeToMinutes(rng.start);
      const rEnd = timeToMinutes(rng.end);
      return slotStartMin >= rStart && slotEndMin <= rEnd;
    });

    if (hitBreak && fitsInRange) {
      matchedBreak = hitBreak;
      continue;
    }

    if (fitsInRange && !hitBreak) {
      return {
        available: true,
        status: 'available',
        label:
          branchFilter === 'ambas'
            ? `+ Agendar (${BRANCH_SHORT_NAMES[branchId]})`
            : '+ Agendar',
        activeBranchId: branchId,
      };
    }

    if (hitBreak) {
      matchedBreak = hitBreak;
    }
  }

  if (matchedBreak) {
    return {
      available: false,
      status: 'in_break',
      label: matchedBreak.description ? `Pausa (${matchedBreak.description})` : 'Pausa / Descanso',
      breakItem: matchedBreak,
    };
  }

  return {
    available: false,
    status: 'outside_hours',
    label: 'Fuera de horario',
  };
}

export interface StaffAvailabilityCheck {
  available: boolean;
  reason?:
    | 'day_off'
    | 'outside_hours'
    | 'in_break'
    | 'date_blocked'
    | 'wrong_branch'
    | 'overlap'
    | 'inactive';
  message?: string;
  scheduleDetails?: StaffDaySchedule;
  effectiveShift?: EffectiveStaffShift;
  conflictingAppointment?: Appointment;
}

/**
 * Validates if a professional is available on a specific date, start time, real service duration, and branch,
 * including multi-range containment, pauses, and cross-branch overlapping appointments.
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
  if (!member || !member.active) {
    return {
      available: false,
      reason: 'inactive',
      message: 'El profesional seleccionado se encuentra inactivo.',
    };
  }

  if (!dateStr || !isValidTimeString(startTime)) {
    return {
      available: false,
      reason: 'outside_hours',
      message: 'Debes indicar una fecha y un horario válido (HH:mm).',
    };
  }

  const duration = Math.max(5, Number(durationMinutes) || 30);

  // 1. Check blocked dates (vacaciones, francos extraordinarios)
  if (member.blockedDates && member.blockedDates.includes(dateStr)) {
    return {
      available: false,
      reason: 'date_blocked',
      message: `${member.name} tiene la fecha ${dateStr} marcada como bloqueada (no disponible).`,
    };
  }

  // 2. Resolve day of week
  const dayOfWeek = parseDateDayOfWeek(dateStr);
  const schedule = getStaffDaySchedule(member, dayOfWeek);
  const dayName = DAY_LABELS.find((l) => l.day === dayOfWeek)?.name || 'este día';

  // 3. Check if working day or non-working day
  if (!schedule.active) {
    return {
      available: false,
      reason: 'day_off',
      message: `${member.name} no trabaja los días ${dayName} (marcado como No trabaja).`,
      scheduleDetails: schedule,
    };
  }

  const slotStartMin = timeToMinutes(startTime);
  const slotEndMin = slotStartMin + duration;
  const endStr = minutesToTime(slotEndMin);

  // 4. Check existing appointments for the SAME professional across ALL branches
  if (existingAppointments && existingAppointments.length > 0) {
    const conflictingApt = existingAppointments.find((apt) => {
      if (excludeAppointmentId && apt.id === excludeAppointmentId) return false;
      if (apt.date !== dateStr) return false;
      if (apt.staffId !== member.id) return false;
      if (apt.status === 'cancelado') return false;

      const aptStart = timeToMinutes(apt.time);
      const aptEnd = aptStart + (apt.durationMinutes || 30);
      return Math.max(slotStartMin, aptStart) < Math.min(slotEndMin, aptEnd);
    });

    if (conflictingApt) {
      const conflictBranchName =
        conflictingApt.branchId === 'sucursal_2' ? 'Soham Rioja' : 'Soham Montevideo';
      const conflictEnd = minutesToTime(
        timeToMinutes(conflictingApt.time) + (conflictingApt.durationMinutes || 30)
      );
      return {
        available: false,
        reason: 'overlap',
        message: `${member.name} ya tiene un turno ocupado de ${conflictingApt.time} a ${conflictEnd} hs en ${conflictBranchName} con ${conflictingApt.clientName}. No se permiten turnos superpuestos.`,
        scheduleDetails: schedule,
        conflictingAppointment: conflictingApt,
      };
    }
  }

  // Helper to validate against a single branch shift
  const validateBranchShift = (targetBranch: BranchId): StaffAvailabilityCheck => {
    const shift = getStaffEffectiveShift(schedule, targetBranch);
    const branchLabel = BRANCH_NAMES[targetBranch];

    if (!shift.active || shift.ranges.length === 0) {
      const otherBranch: BranchId = targetBranch === 'sucursal_1' ? 'sucursal_2' : 'sucursal_1';
      const otherShift = getStaffEffectiveShift(schedule, otherBranch);
      const otherHint = otherShift.active
        ? ` Ese día atiende en ${BRANCH_NAMES[otherBranch]} (${formatShiftRanges(otherShift.ranges)} hs).`
        : '';
      return {
        available: false,
        reason: 'wrong_branch',
        message: `${member.name} no atiende en ${branchLabel} los días ${dayName}.${otherHint}`,
        scheduleDetails: schedule,
        effectiveShift: shift,
      };
    }

    // Check breaks first so pause collisions report exact pause details
    if (shift.breaks && shift.breaks.length > 0) {
      for (const brk of shift.breaks) {
        const brkStartMin = timeToMinutes(brk.start);
        const brkEndMin = timeToMinutes(brk.end);
        if (Math.max(slotStartMin, brkStartMin) < Math.min(slotEndMin, brkEndMin)) {
          const desc = brk.description ? ` (${brk.description})` : '';
          return {
            available: false,
            reason: 'in_break',
            message: `${member.name} tiene una pausa configurada en ${branchLabel} de ${brk.start} a ${brk.end} hs${desc}. El turno (${startTime} - ${endStr} hs) se superpone con su pausa.`,
            scheduleDetails: schedule,
            effectiveShift: shift,
          };
        }
      }
    }

    // Must fit completely inside a SINGLE active range (respecting real service duration)
    const fitsInSingleRange = shift.ranges.some((rng) => {
      const rStart = timeToMinutes(rng.start);
      const rEnd = timeToMinutes(rng.end);
      return slotStartMin >= rStart && slotEndMin <= rEnd;
    });

    if (!fitsInSingleRange) {
      return {
        available: false,
        reason: 'outside_hours',
        message: `${member.name} atiende en ${branchLabel} en el horario ${formatShiftRanges(shift.ranges)} hs los ${dayName}. El turno de ${duration} min (${startTime} - ${endStr} hs) queda fuera o excede su franja horaria laboral.`,
        scheduleDetails: schedule,
        effectiveShift: shift,
      };
    }

    return {
      available: true,
      scheduleDetails: schedule,
      effectiveShift: shift,
    };
  };

  if (appointmentBranchId) {
    return validateBranchShift(appointmentBranchId);
  }

  // If no branch specified, check if valid in either Montevideo or Rioja
  const checkS1 = validateBranchShift('sucursal_1');
  if (checkS1.available) return checkS1;
  const checkS2 = validateBranchShift('sucursal_2');
  if (checkS2.available) return checkS2;

  return checkS1.reason !== 'wrong_branch' ? checkS1 : checkS2;
}

export interface BookingSlotCandidate {
  time: string;
  endTime: string;
  available: boolean;
  status: 'available' | 'occupied' | 'in_break' | 'insufficient_time';
  reasonLabel: string;
  rangeLabel: string;
  conflictingAppointment?: Appointment;
}

/**
 * Generates all candidate intervals inside a professional's active ranges for a given date, branch, and service duration,
 * returning BOTH available slots and occupied/unavailable intervals so the UI clearly shows occupied vs free spaces.
 */
export function getStaffDaySlotsForBooking(
  member: StaffMember,
  dateStr: string,
  durationMinutes: number,
  branchId: BranchId,
  existingAppointments?: Appointment[],
  excludeAppointmentId?: string
): BookingSlotCandidate[] {
  if (!member || !member.active || !dateStr) return [];
  if (member.blockedDates?.includes(dateStr)) return [];

  const dayOfWeek = parseDateDayOfWeek(dateStr);
  const schedule = getStaffDaySchedule(member, dayOfWeek);
  if (!schedule.active) return [];

  const shift = getStaffEffectiveShift(schedule, branchId);
  if (!shift.active || shift.ranges.length === 0) return [];

  const duration = Math.max(5, Number(durationMinutes) || 30);

  // Determine clean step interval (15 or 30 min) based on range boundaries, breaks, appointments, and duration
  const hasQuarterHourAlignment =
    duration % 30 !== 0 ||
    shift.ranges.some((r) => timeToMinutes(r.start) % 30 !== 0 || timeToMinutes(r.end) % 30 !== 0) ||
    shift.breaks.some((b) => timeToMinutes(b.start) % 30 !== 0 || timeToMinutes(b.end) % 30 !== 0) ||
    (existingAppointments || []).some(
      (a) =>
        a.date === dateStr &&
        a.staffId === member.id &&
        a.status !== 'cancelado' &&
        (timeToMinutes(a.time) % 30 !== 0 || (a.durationMinutes || 30) % 30 !== 0)
    );

  const step = hasQuarterHourAlignment ? 15 : 30;
  const candidates: BookingSlotCandidate[] = [];

  for (const rng of shift.ranges) {
    const rStart = timeToMinutes(rng.start);
    const rEnd = timeToMinutes(rng.end);
    const rangeLabel = `${rng.start} - ${rng.end}`;

    for (let m = rStart; m < rEnd; m += step) {
      const slotTime = minutesToTime(m);
      const slotEndMin = m + duration;
      const endTime = minutesToTime(slotEndMin);

      // 1. Check if this slot overlaps an existing appointment (across any branch for this staff)
      const overlappingApt = (existingAppointments || []).find((apt) => {
        if (excludeAppointmentId && apt.id === excludeAppointmentId) return false;
        if (apt.date !== dateStr || apt.staffId !== member.id || apt.status === 'cancelado') {
          return false;
        }
        const aStart = timeToMinutes(apt.time);
        const aEnd = aStart + (apt.durationMinutes || 30);
        // Check if either the slot start itself is occupied OR [m, m + duration] collides with an appointment
        return Math.max(m, aStart) < Math.min(slotEndMin, aEnd);
      });

      if (overlappingApt) {
        const aStart = timeToMinutes(overlappingApt.time);
        const aEnd = aStart + (overlappingApt.durationMinutes || 30);
        const directlyInsideApt = m >= aStart && m < aEnd;
        const otherBranchSuffix =
          (overlappingApt.branchId || 'sucursal_1') !== branchId
            ? ` (${BRANCH_SHORT_NAMES[overlappingApt.branchId || 'sucursal_1']})`
            : '';

        candidates.push({
          time: slotTime,
          endTime,
          available: false,
          status: directlyInsideApt ? 'occupied' : 'insufficient_time',
          reasonLabel: directlyInsideApt
            ? `Ocupado · ${overlappingApt.clientName}${otherBranchSuffix}`
            : `Choca con turno ${overlappingApt.time} hs`,
          rangeLabel,
          conflictingAppointment: overlappingApt,
        });
        continue;
      }

      // 2. Check if slot collides with a configured pause
      const overlappingBreak = shift.breaks.find((brk) => {
        const bStart = timeToMinutes(brk.start);
        const bEnd = timeToMinutes(brk.end);
        return Math.max(m, bStart) < Math.min(slotEndMin, bEnd);
      });

      if (overlappingBreak) {
        const bStart = timeToMinutes(overlappingBreak.start);
        const bEnd = timeToMinutes(overlappingBreak.end);
        const directlyInBreak = m >= bStart && m < bEnd;
        candidates.push({
          time: slotTime,
          endTime,
          available: false,
          status: directlyInBreak ? 'in_break' : 'insufficient_time',
          reasonLabel: directlyInBreak
            ? `Pausa (${overlappingBreak.start}-${overlappingBreak.end})`
            : `Excede pausa ${overlappingBreak.start}`,
          rangeLabel,
        });
        continue;
      }

      // 3. Check if real service duration fits before the end of this working range
      if (slotEndMin > rEnd) {
        candidates.push({
          time: slotTime,
          endTime,
          available: false,
          status: 'insufficient_time',
          reasonLabel: `Excede salida (${rng.end})`,
          rangeLabel,
        });
        continue;
      }

      candidates.push({
        time: slotTime,
        endTime,
        available: true,
        status: 'available',
        reasonLabel: 'Disponible',
        rangeLabel,
      });
    }
  }

  return candidates;
}

export interface ScheduleConflict {
  appointment: Appointment;
  reason: string;
}

/**
 * When modifying a staff member's schedule or blocked dates,
 * finds any already scheduled appointments that conflict with the new setup.
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

  const tempMember: StaffMember = {
    id: memberId,
    businessId: '',
    name: 'El profesional',
    role: '',
    phone: '',
    color: '',
    workingDays: newDaySchedules.filter((s) => s.active).map((s) => s.day),
    workingHoursStart: '',
    workingHoursEnd: '',
    daySchedules: newDaySchedules,
    blockedDates: newBlockedDates,
    active: true,
    createdAt: '',
  };

  for (const apt of staffAppointments) {
    const aptBranch: BranchId = apt.branchId || 'sucursal_1';
    const check = checkStaffAvailability(
      tempMember,
      apt.date,
      apt.time,
      apt.durationMinutes || 30,
      aptBranch,
      [],
      apt.id
    );

    if (!check.available) {
      conflicts.push({
        appointment: apt,
        reason: check.message || 'Queda fuera del nuevo horario configurado.',
      });
    }
  }

  return conflicts;
}
