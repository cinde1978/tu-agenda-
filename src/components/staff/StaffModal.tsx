import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Clock,
  Calendar,
  Check,
  Plus,
  Building2,
  Trash2,
  Coffee,
  Copy,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  Layers,
} from 'lucide-react';
import {
  StaffMember,
  BranchId,
  StaffBranchScope,
  StaffDaySchedule,
  StaffBreak,
  StaffBranchShift,
  StaffTimeRange,
} from '../../types';
import { useApp } from '../../context/AppContext';
import {
  ALL_WEEK_DAYS,
  DAY_LABELS,
  BRANCH_NAMES,
  createEmptyBranchShift,
  createEmptyDaySchedule,
  createEmptyWeeklySchedules,
  getStaffDaySchedule,
  getShiftRanges,
  getValidBreaks,
  formatShiftRanges,
  checkInternalRangesOverlap,
  checkRangesOverlap,
  findScheduleConflicts,
  ScheduleConflict,
  isValidTimeString,
  timeToMinutes,
} from '../../utils/staffSchedule';
import { formatDateSpanish } from '../../utils/formatters';

export interface StaffModalProps {
  staffToEdit?: StaffMember | null;
  initialBranchId?: BranchId | 'ambas';
  initialDay?: number;
  onClose: () => void;
  onSaved?: (staffId: string) => void;
}

const COLORS = [
  '#1E3A8A', // navy blue
  '#0284c7', // sky blue
  '#0d9488', // teal
  '#6366f1', // indigo
  '#7c3aed', // violet
  '#db2777', // pink
  '#ea580c', // orange
];

function cloneSchedulesForEditor(
  member: StaffMember | null | undefined,
  defaultScope: StaffBranchScope
): StaffDaySchedule[] {
  if (!member) {
    return createEmptyWeeklySchedules(defaultScope);
  }
  return ALL_WEEK_DAYS.map((d) => {
    const normalized = getStaffDaySchedule(member, d);
    const s1 = normalized.branchShifts?.sucursal_1 || createEmptyBranchShift();
    const s2 = normalized.branchShifts?.sucursal_2 || createEmptyBranchShift();
    return {
      ...normalized,
      breaks: JSON.parse(JSON.stringify(normalized.breaks || [])),
      branchShifts: {
        sucursal_1: {
          active: Boolean(s1.active),
          start: s1.start || '',
          end: s1.end || '',
          ranges: JSON.parse(JSON.stringify(getShiftRanges(s1, true))),
          breaks: JSON.parse(JSON.stringify(s1.breaks || [])),
        },
        sucursal_2: {
          active: Boolean(s2.active),
          start: s2.start || '',
          end: s2.end || '',
          ranges: JSON.parse(JSON.stringify(getShiftRanges(s2, true))),
          breaks: JSON.parse(JSON.stringify(s2.breaks || [])),
        },
      },
    };
  });
}

function resolveInitialScope(
  staffToEdit?: StaffMember | null,
  initialBranchId?: BranchId | 'ambas'
): StaffBranchScope {
  if (staffToEdit) {
    const schedules = ALL_WEEK_DAYS.map((d) => getStaffDaySchedule(staffToEdit, d));
    const inMvd = schedules.some((s) => s.active && s.branchShifts?.sucursal_1?.active);
    const inRioja = schedules.some((s) => s.active && s.branchShifts?.sucursal_2?.active);
    if (inMvd && inRioja) return 'ambas';
    if (staffToEdit.branchId) return staffToEdit.branchId;
    if (inMvd) return 'sucursal_1';
    if (inRioja) return 'sucursal_2';
    return 'ambas';
  }
  return initialBranchId || 'ambas';
}

export function StaffModal({
  staffToEdit,
  initialBranchId,
  initialDay,
  onClose,
  onSaved,
}: StaffModalProps) {
  const { createStaff, updateStaff, appointments, allAppointments } = useApp();
  const sourceAppointments =
    allAppointments && allAppointments.length > 0 ? allAppointments : appointments;

  const [name, setName] = useState(staffToEdit?.name || '');
  const [role, setRole] = useState(staffToEdit?.role || '');
  const [phone, setPhone] = useState(staffToEdit?.phone || '');
  const [color, setColor] = useState(staffToEdit?.color || COLORS[0]);
  const [commissionPercentage, setCommissionPercentage] = useState<number>(
    staffToEdit?.commissionPercentage ?? 40
  );
  const [active, setActive] = useState(staffToEdit?.active ?? true);

  // Assigned sucursal scope: 'sucursal_1' (Montevideo), 'sucursal_2' (Rioja), or 'ambas'
  const [staffBranchScope, setStaffBranchScope] = useState<StaffBranchScope>(() =>
    resolveInitialScope(staffToEdit, initialBranchId)
  );

  // View mode inside schedule editor: 'semana' by default so all 7 days (Lun-Dom) are visible at once, or 'dia' when opened on a specific day
  const [scheduleViewMode, setScheduleViewMode] = useState<'dia' | 'semana'>(
    initialDay !== undefined ? 'dia' : 'semana'
  );

  const [daySchedules, setDaySchedules] = useState<StaffDaySchedule[]>(() =>
    cloneSchedulesForEditor(staffToEdit, resolveInitialScope(staffToEdit, initialBranchId))
  );

  const [selectedDayTab, setSelectedDayTab] = useState<number>(initialDay ?? 1);
  const [blockedDates, setBlockedDates] = useState<string[]>(staffToEdit?.blockedDates || []);
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  // Conflict warning dialog states
  const [detectedConflicts, setDetectedConflicts] = useState<ScheduleConflict[]>([]);
  const [showConflictWarning, setShowConflictWarning] = useState(false);

  // Re-synchronize state whenever staffToEdit changes
  useEffect(() => {
    const scope = resolveInitialScope(staffToEdit, initialBranchId);
    setStaffBranchScope(scope);
    if (staffToEdit) {
      setName(staffToEdit.name || '');
      setRole(staffToEdit.role || '');
      setPhone(staffToEdit.phone || '');
      setColor(staffToEdit.color || COLORS[0]);
      setCommissionPercentage(staffToEdit.commissionPercentage ?? 40);
      setActive(staffToEdit.active ?? true);
      setBlockedDates(staffToEdit.blockedDates || []);
      setDaySchedules(cloneSchedulesForEditor(staffToEdit, scope));
    } else {
      setName('');
      setRole('');
      setPhone('');
      setColor(COLORS[0]);
      setCommissionPercentage(40);
      setActive(true);
      setBlockedDates([]);
      setDaySchedules(createEmptyWeeklySchedules(scope));
    }
  }, [staffToEdit, initialBranchId]);

  // Change assigned sucursal scope and deactivate any unassigned sucursal so hidden branches never stay active
  const handleBranchScopeChange = (nextScope: StaffBranchScope) => {
    setStaffBranchScope(nextScope);
    setDaySchedules((prev) =>
      prev.map((s) => {
        const s1 = s.branchShifts?.sucursal_1 || createEmptyBranchShift();
        const s2 = s.branchShifts?.sucursal_2 || createEmptyBranchShift();

        if (nextScope === 'sucursal_1') {
          const nextS1Ranges =
            s.active && (!s1.ranges || s1.ranges.length === 0)
              ? [{ id: `rng_s1_${s.day}_${Date.now()}`, start: '', end: '' }]
              : s1.ranges || [];
          return {
            ...s,
            branchId: 'sucursal_1',
            branchShifts: {
              sucursal_1: {
                ...s1,
                active: s.active ? true : false,
                ranges: nextS1Ranges,
              },
              sucursal_2: {
                ...s2,
                active: false,
              },
            },
          };
        }

        if (nextScope === 'sucursal_2') {
          const nextS2Ranges =
            s.active && (!s2.ranges || s2.ranges.length === 0)
              ? [{ id: `rng_s2_${s.day}_${Date.now()}`, start: '', end: '' }]
              : s2.ranges || [];
          return {
            ...s,
            branchId: 'sucursal_2',
            branchShifts: {
              sucursal_1: {
                ...s1,
                active: false,
              },
              sucursal_2: {
                ...s2,
                active: s.active ? true : false,
                ranges: nextS2Ranges,
              },
            },
          };
        }

        return {
          ...s,
          branchId: 'ambas',
        };
      })
    );
  };

  // Explicit «Trabaja» / «No trabaja» setter per day without imposing predetermined hours
  const setDayWorkingState = (dayNum: number, works: boolean) => {
    setValidationError('');
    setDaySchedules((prev) =>
      prev.map((s) => {
        if (s.day !== dayNum) return s;
        const currentS1 = s.branchShifts?.sucursal_1 || createEmptyBranchShift();
        const currentS2 = s.branchShifts?.sucursal_2 || createEmptyBranchShift();

        if (!works) {
          return {
            ...s,
            active: false,
            branchShifts: {
              sucursal_1: { ...currentS1, active: false },
              sucursal_2: { ...currentS2, active: false },
            },
          };
        }

        // Marking day as «Trabaja»
        if (staffBranchScope === 'sucursal_1') {
          const existingRanges = getShiftRanges(currentS1, true);
          const ranges =
            existingRanges.length > 0
              ? existingRanges
              : [{ id: `rng_s1_${dayNum}_${Date.now()}`, start: '', end: '' }];
          return {
            ...s,
            active: true,
            branchId: 'sucursal_1',
            branchShifts: {
              sucursal_1: {
                ...currentS1,
                active: true,
                ranges,
                breaks: currentS1.breaks || [],
              },
              sucursal_2: { ...currentS2, active: false },
            },
          };
        }

        if (staffBranchScope === 'sucursal_2') {
          const existingRanges = getShiftRanges(currentS2, true);
          const ranges =
            existingRanges.length > 0
              ? existingRanges
              : [{ id: `rng_s2_${dayNum}_${Date.now()}`, start: '', end: '' }];
          return {
            ...s,
            active: true,
            branchId: 'sucursal_2',
            branchShifts: {
              sucursal_1: { ...currentS1, active: false },
              sucursal_2: {
                ...currentS2,
                active: true,
                ranges,
                breaks: currentS2.breaks || [],
              },
            },
          };
        }

        // staffBranchScope === 'ambas': preserve any previously typed branch ranges or activate Montevideo by default so a branch is immediately selected
        const s1ExistingRanges = getShiftRanges(currentS1, true);
        const s2ExistingRanges = getShiftRanges(currentS2, true);
        const s1HasSavedRanges = getShiftRanges({ ...currentS1, active: true }, false).length > 0;
        const s2HasSavedRanges = getShiftRanges({ ...currentS2, active: true }, false).length > 0;

        const nextS1Active = s1HasSavedRanges
          ? true
          : Boolean(currentS1.active) || (!currentS2.active && !s2HasSavedRanges);
        const nextS2Active = s2HasSavedRanges ? true : Boolean(currentS2.active);

        const nextS1Ranges =
          nextS1Active && s1ExistingRanges.length === 0
            ? [{ id: `rng_s1_${dayNum}_${Date.now()}`, start: '', end: '' }]
            : s1ExistingRanges;
        const nextS2Ranges =
          nextS2Active && s2ExistingRanges.length === 0
            ? [{ id: `rng_s2_${dayNum}_${Date.now()}`, start: '', end: '' }]
            : s2ExistingRanges;

        const resolvedDayScope: StaffBranchScope =
          nextS1Active && nextS2Active
            ? 'ambas'
            : nextS1Active
            ? 'sucursal_1'
            : 'sucursal_2';

        return {
          ...s,
          active: true,
          branchId: resolvedDayScope,
          branchShifts: {
            sucursal_1: {
              ...currentS1,
              active: nextS1Active,
              ranges: nextS1Ranges,
              breaks: currentS1.breaks || [],
            },
            sucursal_2: {
              ...currentS2,
              active: nextS2Active,
              ranges: nextS2Ranges,
              breaks: currentS2.breaks || [],
            },
          },
        };
      })
    );
  };

  // Explicit per-day branch selector (Solo Montevideo | Solo Rioja | Ambas Sucursales) when staffBranchScope === 'ambas'
  const setDayBranchMode = (dayNum: number, mode: StaffBranchScope) => {
    setValidationError('');
    setDaySchedules((prev) =>
      prev.map((s) => {
        if (s.day !== dayNum) return s;
        const currentS1 = s.branchShifts?.sucursal_1 || createEmptyBranchShift();
        const currentS2 = s.branchShifts?.sucursal_2 || createEmptyBranchShift();

        const wantS1 = mode === 'sucursal_1' || mode === 'ambas';
        const wantS2 = mode === 'sucursal_2' || mode === 'ambas';

        const s1Existing = getShiftRanges(currentS1, true);
        const s2Existing = getShiftRanges(currentS2, true);

        const nextS1Ranges =
          wantS1 && s1Existing.length === 0
            ? [{ id: `rng_s1_${dayNum}_${Date.now()}`, start: '', end: '' }]
            : s1Existing;
        const nextS2Ranges =
          wantS2 && s2Existing.length === 0
            ? [{ id: `rng_s2_${dayNum}_${Date.now()}_2`, start: '', end: '' }]
            : s2Existing;

        return {
          ...s,
          active: true,
          branchId: mode,
          branchShifts: {
            sucursal_1: {
              ...currentS1,
              active: wantS1,
              ranges: nextS1Ranges,
              breaks: currentS1.breaks || [],
            },
            sucursal_2: {
              ...currentS2,
              active: wantS2,
              ranges: nextS2Ranges,
              breaks: currentS2.breaks || [],
            },
          },
        };
      })
    );
  };

  // Explicit branch active state on a specific day
  const setBranchActiveOnDay = (dayNum: number, branch: BranchId, branchWorks: boolean) => {
    setValidationError('');
    setDaySchedules((prev) =>
      prev.map((s) => {
        if (s.day !== dayNum) return s;
        const currentS1 = s.branchShifts?.sucursal_1 || createEmptyBranchShift();
        const currentS2 = s.branchShifts?.sucursal_2 || createEmptyBranchShift();

        const targetShift = branch === 'sucursal_1' ? currentS1 : currentS2;
        const existingRanges = getShiftRanges(targetShift, true);
        const nextRanges =
          branchWorks && existingRanges.length === 0
            ? [{ id: `rng_${branch}_${dayNum}_${Date.now()}`, start: '', end: '' }]
            : existingRanges;

        const updatedTarget: StaffBranchShift = {
          ...targetShift,
          active: branchWorks,
          ranges: nextRanges,
          breaks: targetShift.breaks || [],
        };

        const nextS1 = branch === 'sucursal_1' ? updatedTarget : currentS1;
        const nextS2 = branch === 'sucursal_2' ? updatedTarget : currentS2;

        const anyBranchActive = Boolean(nextS1.active) || Boolean(nextS2.active);
        const nextDayActive = branchWorks ? true : anyBranchActive;

        const scope: StaffBranchScope =
          nextS1.active && nextS2.active
            ? 'ambas'
            : nextS1.active
            ? 'sucursal_1'
            : nextS2.active
            ? 'sucursal_2'
            : staffBranchScope;

        return {
          ...s,
          active: nextDayActive,
          branchId: scope,
          branchShifts: {
            sucursal_1: nextS1,
            sucursal_2: nextS2,
          },
        };
      })
    );
  };

  // Add a new empty time range (franja horaria) to a branch on a day
  const addTimeRange = (dayNum: number, branch: BranchId) => {
    setValidationError('');
    setDaySchedules((prev) =>
      prev.map((s) => {
        if (s.day !== dayNum) return s;
        const currentS1 = s.branchShifts?.sucursal_1 || createEmptyBranchShift();
        const currentS2 = s.branchShifts?.sucursal_2 || createEmptyBranchShift();
        const target = branch === 'sucursal_1' ? currentS1 : currentS2;
        const existing = getShiftRanges(target, true);
        const newRange: StaffTimeRange = {
          id: `rng_${branch}_${dayNum}_${Date.now()}_${existing.length}`,
          start: '',
          end: '',
        };
        const updatedRanges = [...existing, newRange];
        const updatedShift: StaffBranchShift = {
          ...target,
          active: true,
          ranges: updatedRanges,
          start: updatedRanges[0]?.start || '',
          end: updatedRanges[updatedRanges.length - 1]?.end || '',
        };

        return {
          ...s,
          active: true,
          branchShifts: {
            sucursal_1: branch === 'sucursal_1' ? updatedShift : currentS1,
            sucursal_2: branch === 'sucursal_2' ? updatedShift : currentS2,
          },
        };
      })
    );
  };

  // Update a specific time range inside a branch shift
  const updateTimeRange = (
    dayNum: number,
    branch: BranchId,
    rangeId: string,
    field: 'start' | 'end',
    value: string
  ) => {
    setValidationError('');
    setDaySchedules((prev) =>
      prev.map((s) => {
        if (s.day !== dayNum) return s;
        const currentS1 = s.branchShifts?.sucursal_1 || createEmptyBranchShift();
        const currentS2 = s.branchShifts?.sucursal_2 || createEmptyBranchShift();
        const target = branch === 'sucursal_1' ? currentS1 : currentS2;
        const existing = getShiftRanges(target, true);
        const updatedRanges = existing.map((r) =>
          r.id === rangeId ? { ...r, [field]: value } : r
        );
        const updatedShift: StaffBranchShift = {
          ...target,
          active: true,
          ranges: updatedRanges,
          start: updatedRanges[0]?.start || '',
          end: updatedRanges[updatedRanges.length - 1]?.end || '',
        };

        return {
          ...s,
          branchShifts: {
            sucursal_1: branch === 'sucursal_1' ? updatedShift : currentS1,
            sucursal_2: branch === 'sucursal_2' ? updatedShift : currentS2,
          },
        };
      })
    );
  };

  // Remove a time range; if it was the only range in that branch, deactivate that branch on that day
  const removeTimeRange = (dayNum: number, branch: BranchId, rangeId: string) => {
    setValidationError('');
    setDaySchedules((prev) =>
      prev.map((s) => {
        if (s.day !== dayNum) return s;
        const currentS1 = s.branchShifts?.sucursal_1 || createEmptyBranchShift();
        const currentS2 = s.branchShifts?.sucursal_2 || createEmptyBranchShift();
        const target = branch === 'sucursal_1' ? currentS1 : currentS2;
        const existing = getShiftRanges(target, true);
        const remaining = existing.filter((r) => r.id !== rangeId);

        const nextTargetActive = remaining.length > 0 ? Boolean(target.active) : false;
        const updatedShift: StaffBranchShift = {
          ...target,
          active: nextTargetActive,
          ranges: remaining,
          start: remaining[0]?.start || '',
          end: remaining[remaining.length - 1]?.end || '',
        };

        const nextS1 = branch === 'sucursal_1' ? updatedShift : currentS1;
        const nextS2 = branch === 'sucursal_2' ? updatedShift : currentS2;
        const nextDayActive = Boolean(nextS1.active) || Boolean(nextS2.active);

        return {
          ...s,
          active: nextDayActive,
          branchShifts: {
            sucursal_1: nextS1,
            sucursal_2: nextS2,
          },
        };
      })
    );
  };

  // Configurable pauses without imposing predetermined times
  const addBreak = (dayNum: number, branch: BranchId) => {
    setValidationError('');
    setDaySchedules((prev) =>
      prev.map((s) => {
        if (s.day !== dayNum) return s;
        const currentS1 = s.branchShifts?.sucursal_1 || createEmptyBranchShift();
        const currentS2 = s.branchShifts?.sucursal_2 || createEmptyBranchShift();
        const target = branch === 'sucursal_1' ? currentS1 : currentS2;
        const newBreak: StaffBreak = {
          id: `brk_${branch}_${dayNum}_${Date.now()}_${(target.breaks || []).length}`,
          start: '',
          end: '',
          description: '',
        };
        const updatedBreaks = [...(target.breaks || []), newBreak];
        const updatedShift: StaffBranchShift = {
          ...target,
          breaks: updatedBreaks,
        };

        return {
          ...s,
          branchShifts: {
            sucursal_1: branch === 'sucursal_1' ? updatedShift : currentS1,
            sucursal_2: branch === 'sucursal_2' ? updatedShift : currentS2,
          },
        };
      })
    );
  };

  const removeBreak = (dayNum: number, branch: BranchId, breakId: string) => {
    setValidationError('');
    setDaySchedules((prev) =>
      prev.map((s) => {
        if (s.day !== dayNum) return s;
        const currentS1 = s.branchShifts?.sucursal_1 || createEmptyBranchShift();
        const currentS2 = s.branchShifts?.sucursal_2 || createEmptyBranchShift();
        const target = branch === 'sucursal_1' ? currentS1 : currentS2;
        const updatedBreaks = (target.breaks || []).filter((b) => b.id !== breakId);
        const updatedShift: StaffBranchShift = {
          ...target,
          breaks: updatedBreaks,
        };

        return {
          ...s,
          branchShifts: {
            sucursal_1: branch === 'sucursal_1' ? updatedShift : currentS1,
            sucursal_2: branch === 'sucursal_2' ? updatedShift : currentS2,
          },
        };
      })
    );
  };

  const updateBreak = (
    dayNum: number,
    branch: BranchId,
    breakId: string,
    patch: Partial<StaffBreak>
  ) => {
    setValidationError('');
    setDaySchedules((prev) =>
      prev.map((s) => {
        if (s.day !== dayNum) return s;
        const currentS1 = s.branchShifts?.sucursal_1 || createEmptyBranchShift();
        const currentS2 = s.branchShifts?.sucursal_2 || createEmptyBranchShift();
        const target = branch === 'sucursal_1' ? currentS1 : currentS2;
        const updatedBreaks = (target.breaks || []).map((b) =>
          b.id === breakId ? { ...b, ...patch } : b
        );
        const updatedShift: StaffBranchShift = {
          ...target,
          breaks: updatedBreaks,
        };

        return {
          ...s,
          branchShifts: {
            sucursal_1: branch === 'sucursal_1' ? updatedShift : currentS1,
            sucursal_2: branch === 'sucursal_2' ? updatedShift : currentS2,
          },
        };
      })
    );
  };

  // Copy a day's exact schedule to Lunes - Viernes (leaving Sábado/Domingo untouched unless copied individually)
  const copyDayToWorkweek = (sourceDayNum: number) => {
    const sourceSchedule = daySchedules.find((s) => s.day === sourceDayNum);
    if (!sourceSchedule) return;

    setDaySchedules((prev) =>
      prev.map((s) => {
        if (s.day === 0 || s.day === 6) return s;
        return {
          ...s,
          active: sourceSchedule.active,
          branchId: sourceSchedule.branchId,
          start: sourceSchedule.start,
          end: sourceSchedule.end,
          breaks: sourceSchedule.breaks ? JSON.parse(JSON.stringify(sourceSchedule.breaks)) : [],
          branchShifts: sourceSchedule.branchShifts
            ? JSON.parse(JSON.stringify(sourceSchedule.branchShifts))
            : undefined,
        };
      })
    );

    const sourceName = DAY_LABELS.find((l) => l.day === sourceDayNum)?.name || 'este día';
    setSaveSuccessMessage(`Configuración de ${sourceName} copiada a Lunes - Viernes.`);
    setTimeout(() => setSaveSuccessMessage(''), 3000);
  };

  // Blocked dates
  const handleAddBlockedDate = () => {
    if (!newBlockedDate) return;
    if (!blockedDates.includes(newBlockedDate)) {
      setBlockedDates([...blockedDates, newBlockedDate]);
    }
    setNewBlockedDate('');
  };

  const handleRemoveBlockedDate = (dateStr: string) => {
    setBlockedDates(blockedDates.filter((d) => d !== dateStr));
  };

  // Strict validation across all 7 days (Lunes a Domingo)
  const validateSchedules = (): { error: string; day?: number } | null => {
    for (const dNum of ALL_WEEK_DAYS) {
      const sched = daySchedules.find((s) => s.day === dNum);
      if (!sched || !sched.active) continue;

      const dayLabel = DAY_LABELS.find((l) => l.day === dNum)?.name || `Día ${dNum}`;
      const s1 = sched.branchShifts?.sucursal_1;
      const s2 = sched.branchShifts?.sucursal_2;

      const s1Active = staffBranchScope !== 'sucursal_2' && Boolean(s1?.active);
      const s2Active = staffBranchScope !== 'sucursal_1' && Boolean(s2?.active);

      if (!s1Active && !s2Active) {
        return {
          error: `En ${dayLabel} marcaste «Trabaja», pero no habilitaste ninguna sucursal. Habilita Soham Montevideo y/o Soham Rioja e ingresa el horario, o marca ${dayLabel} como «No trabaja».`,
          day: dNum,
        };
      }

      const branchesToCheck: Array<{ id: BranchId; shift?: StaffBranchShift }> = [];
      if (s1Active) branchesToCheck.push({ id: 'sucursal_1', shift: s1 });
      if (s2Active) branchesToCheck.push({ id: 'sucursal_2', shift: s2 });

      for (const { id: bId, shift } of branchesToCheck) {
        const bName = BRANCH_NAMES[bId];
        const rawRanges = getShiftRanges(shift, true);

        if (rawRanges.length === 0) {
          return {
            error: `En ${dayLabel} (${bName}), agrega al menos una franja horaria de inicio y fin.`,
            day: dNum,
          };
        }

        for (let idx = 0; idx < rawRanges.length; idx++) {
          const rng = rawRanges[idx];
          if (!isValidTimeString(rng.start) || !isValidTimeString(rng.end)) {
            return {
              error: `En ${dayLabel} (${bName}), debes completar la hora de inicio y finalización en la franja #${idx + 1}.`,
              day: dNum,
            };
          }
          if (timeToMinutes(rng.end) <= timeToMinutes(rng.start)) {
            return {
              error: `En ${dayLabel} (${bName}), la hora de finalización (${rng.end}) debe ser posterior a la hora de inicio (${rng.start}).`,
              day: dNum,
            };
          }
        }

        const internalOverlap = checkInternalRangesOverlap(rawRanges);
        if (internalOverlap.overlaps) {
          return {
            error: `En ${dayLabel} (${bName}), las franjas horarias ${internalOverlap.rangeA?.start}-${internalOverlap.rangeA?.end} y ${internalOverlap.rangeB?.start}-${internalOverlap.rangeB?.end} se superponen.`,
            day: dNum,
          };
        }

        for (const brk of shift?.breaks || []) {
          if (!isValidTimeString(brk.start) || !isValidTimeString(brk.end)) {
            return {
              error: `En ${dayLabel} (${bName}), completa la hora de inicio y fin de la pausa o elimínala.`,
              day: dNum,
            };
          }
          if (timeToMinutes(brk.end) <= timeToMinutes(brk.start)) {
            return {
              error: `En ${dayLabel} (${bName}), la hora de fin de la pausa (${brk.end}) debe ser posterior a su inicio (${brk.start}).`,
              day: dNum,
            };
          }
        }
      }

      if (s1Active && s2Active) {
        const validR1 = getShiftRanges(s1, false);
        const validR2 = getShiftRanges(s2, false);
        const crossOverlap = checkRangesOverlap(validR1, validR2);
        if (crossOverlap.overlaps) {
          return {
            error: `En ${dayLabel}, los horarios de Soham Montevideo (${crossOverlap.rangeA?.start}-${crossOverlap.rangeA?.end}) y Soham Rioja (${crossOverlap.rangeB?.start}-${crossOverlap.rangeB?.end}) se superponen.`,
            day: dNum,
          };
        }
      }
    }

    return null;
  };

  // Build normalized clean 7-day schedule array with zero imposed defaults
  const buildCleanDaySchedules = (): StaffDaySchedule[] => {
    return ALL_WEEK_DAYS.map((dNum) => {
      const found = daySchedules.find((s) => s.day === dNum);
      if (!found || !found.active) {
        return createEmptyDaySchedule(dNum, staffBranchScope);
      }

      const s1 = found.branchShifts?.sucursal_1;
      const s2 = found.branchShifts?.sucursal_2;

      const s1Allowed = staffBranchScope !== 'sucursal_2' && Boolean(s1?.active);
      const s2Allowed = staffBranchScope !== 'sucursal_1' && Boolean(s2?.active);

      const s1Ranges = s1Allowed ? getShiftRanges(s1, false) : [];
      const s2Ranges = s2Allowed ? getShiftRanges(s2, false) : [];

      const s1FinalActive = s1Allowed && s1Ranges.length > 0;
      const s2FinalActive = s2Allowed && s2Ranges.length > 0;
      const dayActive = s1FinalActive || s2FinalActive;

      if (!dayActive) {
        return createEmptyDaySchedule(dNum, staffBranchScope);
      }

      const s1Breaks = s1FinalActive ? getValidBreaks(s1?.breaks) : [];
      const s2Breaks = s2FinalActive ? getValidBreaks(s2?.breaks) : [];

      const scope: StaffBranchScope =
        s1FinalActive && s2FinalActive
          ? 'ambas'
          : s1FinalActive
          ? 'sucursal_1'
          : 'sucursal_2';

      const allActiveRanges = [...s1Ranges, ...s2Ranges];
      const overallStart =
        allActiveRanges.length > 0
          ? [...allActiveRanges].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))[0].start
          : '';
      const overallEnd =
        allActiveRanges.length > 0
          ? [...allActiveRanges].sort((a, b) => timeToMinutes(b.end) - timeToMinutes(a.end))[0].end
          : '';

      return {
        day: dNum,
        active: true,
        branchId: scope,
        start: overallStart,
        end: overallEnd,
        breaks: [],
        branchShifts: {
          sucursal_1: s1FinalActive
            ? {
                active: true,
                start: s1Ranges[0].start,
                end: s1Ranges[s1Ranges.length - 1].end,
                ranges: s1Ranges,
                breaks: s1Breaks,
              }
            : createEmptyBranchShift(),
          sucursal_2: s2FinalActive
            ? {
                active: true,
                start: s2Ranges[0].start,
                end: s2Ranges[s2Ranges.length - 1].end,
                ranges: s2Ranges,
                breaks: s2Breaks,
              }
            : createEmptyBranchShift(),
        },
      };
    });
  };

  const executeSave = async () => {
    setValidationError('');
    const validation = validateSchedules();
    if (validation) {
      setValidationError(validation.error);
      if (validation.day !== undefined) {
        setSelectedDayTab(validation.day);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const safeRole = role.trim() || 'Especialista';
      const cleanDaySchedules = buildCleanDaySchedules();
      const activeWorkingDays = cleanDaySchedules.filter((s) => s.active).map((s) => s.day);

      const worksInMvd = cleanDaySchedules.some((s) => s.branchShifts?.sucursal_1?.active);
      const worksInRioja = cleanDaySchedules.some((s) => s.branchShifts?.sucursal_2?.active);

      let overallBranchScope: StaffBranchScope = staffBranchScope;
      if (worksInMvd && worksInRioja) {
        overallBranchScope = 'ambas';
      }

      const firstActive = cleanDaySchedules.find((s) => s.active);

      if (staffToEdit) {
        const updatedStaff: StaffMember = {
          ...staffToEdit,
          name: name.trim(),
          role: safeRole,
          phone: phone.trim(),
          color,
          branchId: overallBranchScope,
          commissionPercentage: Number(commissionPercentage) || 0,
          workingDays: activeWorkingDays,
          workingHoursStart: firstActive?.start || '',
          workingHoursEnd: firstActive?.end || '',
          daySchedules: cleanDaySchedules,
          blockedDates,
          active,
        };

        await updateStaff(updatedStaff);
        onSaved?.(updatedStaff.id);
      } else {
        const newId = await createStaff({
          name: name.trim(),
          role: safeRole,
          phone: phone.trim(),
          color,
          branchId: overallBranchScope,
          commissionPercentage: Number(commissionPercentage) || 0,
          workingDays: activeWorkingDays,
          workingHoursStart: firstActive?.start || '',
          workingHoursEnd: firstActive?.end || '',
          daySchedules: cleanDaySchedules,
          blockedDates,
          active,
        });
        onSaved?.(newId);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setValidationError(err.message || 'Error al guardar el profesional.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!name.trim()) {
      setValidationError('Por favor ingresa el nombre del profesional.');
      return;
    }

    const validation = validateSchedules();
    if (validation) {
      setValidationError(validation.error);
      if (validation.day !== undefined) {
        setSelectedDayTab(validation.day);
      }
      return;
    }

    if (staffToEdit) {
      const cleanDaySchedules = buildCleanDaySchedules();
      const conflicts = findScheduleConflicts(
        staffToEdit.id,
        cleanDaySchedules,
        blockedDates,
        sourceAppointments
      );
      if (conflicts.length > 0) {
        setDetectedConflicts(conflicts);
        setShowConflictWarning(true);
        return;
      }
    }

    executeSave();
  };

  // Renders a single branch panel (Montevideo or Rioja) inside a day card
  const renderBranchShiftPanel = (
    dayNum: number,
    branch: BranchId,
    shift: StaffBranchShift
  ) => {
    const isMvd = branch === 'sucursal_1';
    const isActive = Boolean(shift.active);
    const ranges = getShiftRanges(shift, true);
    const internalOverlap = isActive ? checkInternalRangesOverlap(ranges) : { overlaps: false };

    return (
      <div
        className={`rounded-xl border-2 p-3.5 space-y-3 transition-all ${
          isActive
            ? isMvd
              ? 'bg-blue-50/30 border-[#1E3A8A]'
              : 'bg-amber-50/40 border-[#D4AF37]'
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg ${
                isMvd ? 'bg-blue-100 text-[#1E3A8A]' : 'bg-amber-100 text-[#0F172A]'
              }`}
            >
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h5
                className={`text-xs font-black ${
                  isMvd ? 'text-[#1E3A8A]' : 'text-[#0F172A]'
                }`}
              >
                {BRANCH_NAMES[branch]}
              </h5>
              <span className="text-[10px] text-slate-600 font-bold">
                {isMvd ? 'Montevideo 397' : 'Rioja 2954'}
              </span>
            </div>
          </div>

          {staffBranchScope === 'ambas' && (
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-300">
              <button
                type="button"
                onClick={() => setBranchActiveOnDay(dayNum, branch, true)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                  isActive
                    ? isMvd
                      ? 'bg-[#1E3A8A] text-white'
                      : 'bg-[#0F172A] text-[#D4AF37]'
                    : 'text-[#0F172A] hover:bg-slate-100'
                }`}
              >
                Trabaja
              </button>
              <button
                type="button"
                onClick={() => setBranchActiveOnDay(dayNum, branch, false)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                  !isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-[#0F172A] hover:bg-slate-100'
                }`}
              >
                No trabaja
              </button>
            </div>
          )}
        </div>

        {isActive ? (
          <div className="space-y-3">
            {/* Multiple Time Ranges */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-[#0F172A] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#1E3A8A]" />
                  <span>Franjas horarias de atención</span>
                </span>
                <button
                  type="button"
                  onClick={() => addTimeRange(dayNum, branch)}
                  className="text-[11px] font-black text-[#1E3A8A] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span>Agregar franja</span>
                </button>
              </div>

              {ranges.map((rng, idx) => {
                const hasBoth = isValidTimeString(rng.start) && isValidTimeString(rng.end);
                const isRangeInvalid =
                  hasBoth && timeToMinutes(rng.end) <= timeToMinutes(rng.start);

                return (
                  <div
                    key={rng.id}
                    className="bg-white p-2.5 rounded-xl border border-slate-300 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                        Franja #{idx + 1}
                      </span>
                      {ranges.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTimeRange(dayNum, branch, rng.id)}
                          className="text-[10px] font-black text-rose-600 hover:text-rose-800 flex items-center gap-0.5 cursor-pointer"
                          title="Eliminar esta franja horaria"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Quitar</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                          Hora de inicio
                        </label>
                        <input
                          type="time"
                          value={rng.start}
                          onChange={(e) =>
                            updateTimeRange(dayNum, branch, rng.id, 'start', e.target.value)
                          }
                          className="w-full text-xs font-black p-2 rounded-lg border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                          Hora de finalización
                        </label>
                        <input
                          type="time"
                          value={rng.end}
                          onChange={(e) =>
                            updateTimeRange(dayNum, branch, rng.id, 'end', e.target.value)
                          }
                          className="w-full text-xs font-black p-2 rounded-lg border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                        />
                      </div>
                    </div>

                    {isRangeInvalid && (
                      <p className="text-[10px] text-rose-600 font-bold">
                        La hora de finalización debe ser posterior a la de inicio.
                      </p>
                    )}
                  </div>
                );
              })}

              {internalOverlap.overlaps && (
                <p className="text-[11px] text-rose-700 font-bold bg-rose-50 p-2 rounded-lg border border-rose-200">
                  Las franjas {internalOverlap.rangeA?.start}-{internalOverlap.rangeA?.end} y{' '}
                  {internalOverlap.rangeB?.start}-{internalOverlap.rangeB?.end} se superponen.
                </p>
              )}
            </div>

            {/* Configurable Breaks / Pauses */}
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                  <Coffee className="w-3.5 h-3.5 text-amber-700" />
                  <span>Pausas configurables (opcional)</span>
                </span>
                <button
                  type="button"
                  onClick={() => addBreak(dayNum, branch)}
                  className="text-[10px] font-black text-[#1E3A8A] hover:underline cursor-pointer"
                >
                  + Agregar pausa
                </button>
              </div>

              {shift.breaks && shift.breaks.length > 0 ? (
                <div className="space-y-1.5">
                  {shift.breaks.map((b) => (
                    <div
                      key={b.id}
                      className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 text-xs bg-white p-1.5 rounded-lg border border-slate-300"
                    >
                      <input
                        type="time"
                        value={b.start}
                        onChange={(e) =>
                          updateBreak(dayNum, branch, b.id, { start: e.target.value })
                        }
                        className="p-1 border border-slate-300 rounded text-[11px] font-bold text-[#0F172A] bg-white"
                      />
                      <span className="text-slate-500 font-bold">a</span>
                      <input
                        type="time"
                        value={b.end}
                        onChange={(e) =>
                          updateBreak(dayNum, branch, b.id, { end: e.target.value })
                        }
                        className="p-1 border border-slate-300 rounded text-[11px] font-bold text-[#0F172A] bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Descripción (opcional)"
                        value={b.description || ''}
                        onChange={(e) =>
                          updateBreak(dayNum, branch, b.id, { description: e.target.value })
                        }
                        className="p-1 border border-slate-300 rounded text-[10px] flex-1 min-w-[90px] font-medium text-[#0F172A] bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeBreak(dayNum, branch, b.id)}
                        className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                        title="Eliminar pausa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-500">Sin pausas intermedias configuradas.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="py-3 text-center space-y-1.5">
            <p className="text-[11px] text-slate-600 font-bold">
              No trabaja en {BRANCH_NAMES[branch]} este día
            </p>
            <button
              type="button"
              onClick={() => setBranchActiveOnDay(dayNum, branch, true)}
              className="text-[11px] font-black text-[#1E3A8A] hover:underline cursor-pointer"
            >
              + Habilitar horario en {isMvd ? 'Montevideo' : 'Rioja'}
            </button>
          </div>
        )}
      </div>
    );
  };

  // Renders a single day card (Lunes a Domingo)
  const renderDayCard = (dayNum: number) => {
    const dayLabel = DAY_LABELS.find((l) => l.day === dayNum);
    const daySched =
      daySchedules.find((s) => s.day === dayNum) ||
      createEmptyDaySchedule(dayNum, staffBranchScope);

    const s1 = daySched.branchShifts?.sucursal_1 || createEmptyBranchShift();
    const s2 = daySched.branchShifts?.sucursal_2 || createEmptyBranchShift();

    const s1Active = staffBranchScope !== 'sucursal_2' && Boolean(s1.active);
    const s2Active = staffBranchScope !== 'sucursal_1' && Boolean(s2.active);
    const isDayMarkedWorking = Boolean(daySched.active);

    const crossOverlap =
      isDayMarkedWorking && s1Active && s2Active
        ? checkRangesOverlap(getShiftRanges(s1, false), getShiftRanges(s2, false))
        : { overlaps: false };

    const showMvd = staffBranchScope === 'sucursal_1' || staffBranchScope === 'ambas';
    const showRioja = staffBranchScope === 'sucursal_2' || staffBranchScope === 'ambas';

    const s1Summary = s1Active ? formatShiftRanges(getShiftRanges(s1, false)) : '';
    const s2Summary = s2Active ? formatShiftRanges(getShiftRanges(s2, false)) : '';

    return (
      <div
        key={dayNum}
        className={`bg-white rounded-2xl border-2 transition-all p-4 sm:p-5 space-y-4 shadow-2xs ${
          isDayMarkedWorking
            ? 'border-slate-300'
            : 'border-dashed border-slate-300 bg-slate-50/70'
        }`}
      >
        {/* Day Header with Explicit «Trabaja» / «No trabaja» Segmented Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl text-white font-black text-xs ${
                isDayMarkedWorking ? 'bg-[#1E3A8A]' : 'bg-slate-400'
              }`}
            >
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black text-[#0F172A]">{dayLabel?.name}</h4>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    isDayMarkedWorking
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {isDayMarkedWorking ? 'Trabaja' : 'No trabaja'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {!isDayMarkedWorking
                  ? 'Día desactivado · No aparecerá disponible para turnos'
                  : s1Active || s2Active
                  ? [
                      s1Active ? `Montevideo (${s1Summary})` : null,
                      s2Active ? `Rioja (${s2Summary})` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : 'Selecciona sucursal e ingresa horario de inicio y fin'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {isDayMarkedWorking && (
              <button
                type="button"
                onClick={() => copyDayToWorkweek(dayNum)}
                className="text-[11px] font-black text-[#1E3A8A] hover:bg-blue-50 px-2.5 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1 cursor-pointer transition-colors"
                title="Copiar este horario a Lunes - Viernes"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Lun-Vie</span>
              </button>
            )}

            {/* Explicit Segmented Buttons: Trabaja | No trabaja */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300">
              <button
                type="button"
                onClick={() => setDayWorkingState(dayNum, true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                  isDayMarkedWorking
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Trabaja</span>
              </button>
              <button
                type="button"
                onClick={() => setDayWorkingState(dayNum, false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                  !isDayMarkedWorking
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>No trabaja</span>
              </button>
            </div>
          </div>
        </div>

        {/* Cross-branch overlap alert */}
        {crossOverlap.overlaps && (
          <div className="p-3 bg-amber-50 border-2 border-amber-400 rounded-xl text-amber-950 text-xs font-bold flex items-start gap-2 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-black text-amber-900 block mb-0.5">
                Horarios superpuestos entre sucursales:
              </span>
              <span>
                Montevideo ({crossOverlap.rangeA?.start} - {crossOverlap.rangeA?.end}) y Rioja (
                {crossOverlap.rangeB?.start} - {crossOverlap.rangeB?.end}) coinciden en el mismo
                horario. Configura franjas que no se crucen.
              </span>
            </div>
          </div>
        )}

        {/* Branch Editors or Non-Working State */}
        {isDayMarkedWorking ? (
          <div className="space-y-3">
            {staffBranchScope === 'ambas' && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-300 space-y-2">
                <span className="text-[11px] font-black text-[#0F172A] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#1E3A8A]" />
                  <span>Sucursal donde atiende el {dayLabel?.name}:</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDayBranchMode(dayNum, 'sucursal_1')}
                    className={`py-2 px-3 rounded-lg text-xs font-black border-2 transition-all cursor-pointer ${
                      s1Active && !s2Active
                        ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white shadow-xs'
                        : 'bg-white border-slate-300 text-[#0F172A] hover:bg-slate-100'
                    }`}
                  >
                    Solo Soham Montevideo
                  </button>
                  <button
                    type="button"
                    onClick={() => setDayBranchMode(dayNum, 'sucursal_2')}
                    className={`py-2 px-3 rounded-lg text-xs font-black border-2 transition-all cursor-pointer ${
                      !s1Active && s2Active
                        ? 'bg-[#0F172A] border-[#D4AF37] text-[#D4AF37] shadow-xs'
                        : 'bg-white border-slate-300 text-[#0F172A] hover:bg-slate-100'
                    }`}
                  >
                    Solo Soham Rioja
                  </button>
                  <button
                    type="button"
                    onClick={() => setDayBranchMode(dayNum, 'ambas')}
                    className={`py-2 px-3 rounded-lg text-xs font-black border-2 transition-all cursor-pointer ${
                      s1Active && s2Active
                        ? 'bg-[#1E3A8A] border-[#D4AF37] text-white shadow-xs'
                        : 'bg-white border-slate-300 text-[#0F172A] hover:bg-slate-100'
                    }`}
                  >
                    Ambas Sucursales
                  </button>
                </div>
              </div>
            )}

            <div
              className={`grid grid-cols-1 ${
                showMvd && showRioja ? 'md:grid-cols-2' : ''
              } gap-4`}
            >
              {showMvd && renderBranchShiftPanel(dayNum, 'sucursal_1', s1)}
              {showRioja && renderBranchShiftPanel(dayNum, 'sucursal_2', s2)}
            </div>
          </div>
        ) : (
          <div className="py-3 px-4 bg-slate-100/80 rounded-xl border border-dashed border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-xs font-bold text-slate-700">
              {dayLabel?.name} marcado como <strong>No trabaja</strong>. No se permitirán reservas
              este día.
            </p>
            <button
              type="button"
              onClick={() => setDayWorkingState(dayNum, true)}
              className="text-xs font-black text-[#1E3A8A] hover:underline cursor-pointer shrink-0"
            >
              Cambiar a «Trabaja» →
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-300 w-full max-w-4xl max-h-[94vh] overflow-y-auto flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="bg-[#1E3A8A] p-4 sm:p-5 text-white flex items-center justify-between shrink-0 border-b border-blue-900">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-black text-lg">
                  {staffToEdit
                    ? `Ficha y Horarios — ${name || 'Profesional'}`
                    : 'Nuevo Profesional'}
                </h3>
                <p className="text-blue-100 text-xs font-medium">
                  Configuración individual de lunes a domingo, múltiples franjas horarias, pausas y
                  sucursales
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form
            id="staff-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-[#0F172A]"
          >
            {validationError && (
              <div className="p-3.5 bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs rounded-xl flex items-center gap-2 font-bold animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{validationError}</span>
              </div>
            )}

            {saveSuccessMessage && (
              <div className="p-3 bg-emerald-50 border-2 border-emerald-300 text-emerald-950 text-xs rounded-xl flex items-center gap-2 font-bold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{saveSuccessMessage}</span>
              </div>
            )}

            {/* SECCIÓN 1: DATOS PERSONALES Y SUCURSALES ASIGNADAS */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-300 shadow-2xs space-y-4">
              <span className="text-xs font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#1E3A8A]" />
                <span>1. Datos del Profesional y Sucursal Asignada</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Dra. Laura Méndez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none font-bold text-[#0F172A] placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">
                    Especialidad / Rol
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Cosmetóloga, Masajista, Esteticista..."
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none font-bold text-[#0F172A] placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">
                    WhatsApp / Contacto
                  </label>
                  <input
                    type="tel"
                    placeholder="Teléfono o WhatsApp (opcional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none font-bold text-[#0F172A] placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">
                    Comisión por Turno (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={commissionPercentage}
                      onChange={(e) => setCommissionPercentage(Number(e.target.value))}
                      className="w-full text-xs sm:text-sm p-2.5 pr-8 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none font-black text-[#0F172A]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500 pointer-events-none">
                      %
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">
                    Color Distintivo
                  </label>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                          color === c
                            ? 'scale-110 border-slate-900 ring-2 ring-[#1E3A8A] shadow-xs'
                            : 'border-slate-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Sucursal Assignment Selector */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <label className="text-xs font-black text-[#0F172A] flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#1E3A8A]" />
                  <span>Sucursal(es) asignadas a este profesional:</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleBranchScopeChange('sucursal_1')}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      staffBranchScope === 'sucursal_1'
                        ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white shadow-2xs'
                        : 'bg-white border-slate-300 text-[#0F172A] hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-black">Solo Soham Montevideo</div>
                    <div className="text-[10px] font-bold opacity-85">Montevideo 397</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBranchScopeChange('sucursal_2')}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      staffBranchScope === 'sucursal_2'
                        ? 'bg-[#0F172A] border-[#D4AF37] text-[#D4AF37] shadow-2xs'
                        : 'bg-white border-slate-300 text-[#0F172A] hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-black">Solo Soham Rioja</div>
                    <div className="text-[10px] font-bold opacity-85">Rioja 2954</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBranchScopeChange('ambas')}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      staffBranchScope === 'ambas'
                        ? 'bg-blue-50 border-[#1E3A8A] text-[#0F172A] shadow-2xs ring-1 ring-[#D4AF37]'
                        : 'bg-white border-slate-300 text-[#0F172A] hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-black">Ambas Sucursales</div>
                    <div className="text-[10px] font-bold opacity-85">
                      Montevideo 397 y Rioja 2954
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: HORARIOS Y DÍAS DE TRABAJO (LUNES A DOMINGO) */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-300 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#1E3A8A]" />
                    <span>2. Configuración de Días y Horarios (Lunes a Domingo)</span>
                  </span>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    Marca cada día como «Trabaja» o «No trabaja». Puedes agregar una o más franjas
                    horarias y pausas por sucursal sin horarios impuestos.
                  </p>
                </div>

                {/* Switcher Vista: Semana Completa vs Por Día */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setScheduleViewMode('semana')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      scheduleViewMode === 'semana'
                        ? 'bg-[#1E3A8A] text-white shadow-xs'
                        : 'text-slate-700 hover:text-black'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Semana Completa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleViewMode('dia')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      scheduleViewMode === 'dia'
                        ? 'bg-[#1E3A8A] text-white shadow-xs'
                        : 'text-slate-700 hover:text-black'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Por Día</span>
                  </button>
                </div>
              </div>

              {/* 7-Day Quick Summary Bar (Lunes a Domingo) */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {DAY_LABELS.map((d) => {
                  const s = daySchedules.find((item) => item.day === d.day);
                  const isCurrent = scheduleViewMode === 'dia' && selectedDayTab === d.day;
                  const s1Act =
                    staffBranchScope !== 'sucursal_2' &&
                    Boolean(s?.branchShifts?.sucursal_1?.active);
                  const s2Act =
                    staffBranchScope !== 'sucursal_1' &&
                    Boolean(s?.branchShifts?.sucursal_2?.active);
                  const isWorking = Boolean(s?.active);

                  let statusText = 'No trabaja';
                  let statusColor = 'text-slate-500 bg-slate-100';

                  if (isWorking) {
                    if (s1Act && s2Act) {
                      statusText = 'Ambas';
                      statusColor = 'text-[#1E3A8A] bg-blue-100 border border-[#D4AF37] font-black';
                    } else if (s1Act) {
                      statusText = 'Montevideo';
                      statusColor = 'text-[#1E3A8A] bg-blue-100 font-black';
                    } else if (s2Act) {
                      statusText = 'Rioja';
                      statusColor = 'text-[#0F172A] bg-amber-100 border border-[#D4AF37] font-black';
                    } else {
                      statusText = 'Sin sucursal';
                      statusColor = 'text-amber-900 bg-amber-100 font-black';
                    }
                  }

                  return (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => {
                        setSelectedDayTab(d.day);
                        setScheduleViewMode('dia');
                      }}
                      className={`p-2 rounded-xl text-xs font-black border-2 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        isCurrent
                          ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-md ring-2 ring-blue-300'
                          : isWorking
                          ? 'bg-white text-[#0F172A] border-emerald-400 hover:border-[#1E3A8A]'
                          : 'bg-slate-50 text-slate-600 border-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-xs font-black">{d.short}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded truncate max-w-full ${
                          isCurrent ? 'bg-white/20 text-white' : statusColor
                        }`}
                      >
                        {statusText}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Day Editors */}
              <div className="space-y-4 pt-1">
                {scheduleViewMode === 'dia' ? (
                  renderDayCard(selectedDayTab)
                ) : (
                  <div className="space-y-4">
                    {ALL_WEEK_DAYS.map((dNum) => renderDayCard(dNum))}
                  </div>
                )}
              </div>
            </div>

            {/* SECCIÓN 3: FECHAS BLOQUEADAS / VACACIONES */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-300 shadow-2xs space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#1E3A8A]" />
                <span>3. Fechas Específicas Bloqueadas / Vacaciones (Opcional)</span>
              </span>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={newBlockedDate}
                  onChange={(e) => setNewBlockedDate(e.target.value)}
                  className="p-2 text-xs font-bold rounded-xl border-2 border-slate-300 bg-white outline-none focus:border-[#1E3A8A]"
                />
                <button
                  type="button"
                  onClick={handleAddBlockedDate}
                  disabled={!newBlockedDate}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-black text-white text-xs font-black rounded-xl cursor-pointer disabled:opacity-40"
                >
                  Bloquear Fecha
                </button>
              </div>

              {blockedDates.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {blockedDates.map((dateStr) => (
                    <span
                      key={dateStr}
                      className="inline-flex items-center gap-1.5 text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300 px-2.5 py-1 rounded-xl"
                    >
                      <span>{formatDateSpanish(dateStr)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBlockedDate(dateStr)}
                        className="text-rose-500 hover:text-rose-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </form>

          {/* Sticky Bottom Footer */}
          <div className="sticky bottom-0 bg-white p-4 border-t border-slate-300 z-10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 shadow-lg">
            <div className="text-xs text-slate-600 font-bold hidden sm:block">
              {staffToEdit
                ? `Editando configuración de ${name || staffToEdit.name}`
                : 'Nuevo profesional sin horarios impuestos'}
            </div>

            <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border-2 border-slate-300 hover:border-slate-800 bg-white hover:bg-slate-100 text-[#0F172A] font-bold text-sm shadow-2xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="staff-form"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-7 py-2.5 rounded-xl bg-[#1E3A8A] hover:bg-[#172554] active:scale-98 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>
                  {isSubmitting
                    ? 'Guardando...'
                    : staffToEdit
                    ? 'Guardar Configuración'
                    : 'Crear Profesional'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conflict Warning Dialog */}
      {showConflictWarning && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-amber-300 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-900">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h4 className="font-black text-base">Atención: Turnos Preexistentes</h4>
                <p className="text-xs text-amber-800">
                  El nuevo horario entra en conflicto con turnos ya reservados
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              Hay <strong>{detectedConflicts.length}</strong> turno(s) activo(s) que quedan fuera de
              los nuevos horarios o días laborables configurados para {name}.
            </p>

            <div className="max-h-40 overflow-y-auto space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              {detectedConflicts.map((c, i) => (
                <div
                  key={i}
                  className="text-[11px] p-2 bg-white rounded-lg border border-slate-200 text-slate-800"
                >
                  <div className="font-black text-[#1E3A8A]">
                    {c.appointment.clientName} ({c.appointment.serviceName})
                  </div>
                  <div className="text-slate-600 font-bold">
                    {c.appointment.date} a las {c.appointment.time} hs
                  </div>
                  <div className="text-rose-600 text-[10px] font-bold">{c.reason}</div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-600 font-bold">
              ¿Deseas guardar los cambios de horario igualmente? Los turnos preexistentes quedarán
              visibles para reprogramarlos.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowConflictWarning(false)}
                className="px-4 py-2 rounded-xl text-xs font-black text-[#0F172A] bg-white border-2 border-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConflictWarning(false);
                  executeSave();
                }}
                className="px-5 py-2 bg-[#1E3A8A] hover:bg-blue-900 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer"
              >
                Confirmar y guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
