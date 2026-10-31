import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Clock,
  Calendar,
  Check,
  Plus,
  Building2,
  Trash2,
  Coffee,
  Copy,
  AlertTriangle,
  Info,
  CheckCircle2,
  AlertCircle,
  Percent,
  CalendarDays,
  Layers,
} from 'lucide-react';
import { StaffMember, BranchId, StaffBranchScope, StaffDaySchedule, StaffBreak, StaffBranchShift } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  DAY_LABELS,
  BRANCH_NAMES,
  getStaffDaySchedule,
  findScheduleConflicts,
  checkBranchShiftsOverlap,
  ScheduleConflict,
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

export function StaffModal({
  staffToEdit,
  initialBranchId,
  initialDay,
  onClose,
  onSaved,
}: StaffModalProps) {
  const { createStaff, updateStaff, appointments } = useApp();
  const [name, setName] = useState(staffToEdit?.name || '');
  const [role, setRole] = useState(staffToEdit?.role || 'Especialista / Profesional');
  const [phone, setPhone] = useState(staffToEdit?.phone || '');
  const [color, setColor] = useState(staffToEdit?.color || COLORS[0]);
  const [commissionPercentage, setCommissionPercentage] = useState<number>(
    staffToEdit?.commissionPercentage ?? 40
  );
  const [active, setActive] = useState(staffToEdit?.active ?? true);

  // View mode inside schedule editor: 'dia' (single day focused) or 'semana' (all days visible)
  const [scheduleViewMode, setScheduleViewMode] = useState<'dia' | 'semana'>('dia');

  // Branch focus filter: 'todas', 'sucursal_1', 'sucursal_2'
  const [branchFilter, setBranchFilter] = useState<'todas' | BranchId>(
    initialBranchId === 'sucursal_1' || initialBranchId === 'sucursal_2' ? initialBranchId : 'todas'
  );

  // Initialize weekly day schedules (deep clone existing schedules to preserve every custom hour)
  const [daySchedules, setDaySchedules] = useState<StaffDaySchedule[]>(() => {
    if (staffToEdit?.daySchedules && staffToEdit.daySchedules.length >= 7) {
      return JSON.parse(JSON.stringify(staffToEdit.daySchedules));
    }
    const dummy: StaffMember = staffToEdit || {
      id: '',
      businessId: '',
      name: '',
      role: '',
      phone: '',
      color: COLORS[0],
      workingDays: [1, 2, 3, 4, 5, 6],
      workingHoursStart: '09:00',
      workingHoursEnd: '20:00',
      blockedDates: [],
      active: true,
      createdAt: '',
    };
    return [1, 2, 3, 4, 5, 6, 0].map((d) => getStaffDaySchedule(dummy, d));
  });

  const [selectedDayTab, setSelectedDayTab] = useState<number>(initialDay ?? 1); // 1 = Lunes
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
    if (staffToEdit) {
      setName(staffToEdit.name || '');
      setRole(staffToEdit.role || 'Especialista / Profesional');
      setPhone(staffToEdit.phone || '');
      setColor(staffToEdit.color || COLORS[0]);
      setCommissionPercentage(staffToEdit.commissionPercentage ?? 40);
      setActive(staffToEdit.active ?? true);
      setBlockedDates(staffToEdit.blockedDates || []);
      if (staffToEdit.daySchedules && staffToEdit.daySchedules.length >= 7) {
        setDaySchedules(JSON.parse(JSON.stringify(staffToEdit.daySchedules)));
      } else {
        setDaySchedules([1, 2, 3, 4, 5, 6, 0].map((d) => getStaffDaySchedule(staffToEdit, d)));
      }
    } else {
      setName('');
      setRole('Especialista / Profesional');
      setPhone('');
      setColor(COLORS[0]);
      setCommissionPercentage(40);
      setActive(true);
      setBlockedDates([]);
      const dummy: StaffMember = {
        id: '',
        businessId: '',
        name: '',
        role: '',
        phone: '',
        color: COLORS[0],
        workingDays: [1, 2, 3, 4, 5, 6],
        workingHoursStart: '09:00',
        workingHoursEnd: '20:00',
        blockedDates: [],
        active: true,
        createdAt: '',
      };
      setDaySchedules([1, 2, 3, 4, 5, 6, 0].map((d) => getStaffDaySchedule(dummy, d)));
    }
  }, [staffToEdit]);

  // Helper to update schedule for a given day
  const updateDaySchedule = (dayNum: number, patch: Partial<StaffDaySchedule>) => {
    setDaySchedules((prev) => prev.map((s) => (s.day === dayNum ? { ...s, ...patch } : s)));
  };

  // Toggle master active state for a day (Trabaja / No trabaja)
  const toggleMasterDay = (dayNum: number) => {
    setDaySchedules((prev) =>
      prev.map((s) => {
        if (s.day !== dayNum) return s;
        const nextActive = !s.active;
        const currentS1 = s.branchShifts?.sucursal_1 || { active: false, start: '09:00', end: '18:00', breaks: [] };
        const currentS2 = s.branchShifts?.sucursal_2 || { active: false, start: '09:00', end: '18:00', breaks: [] };

        if (!nextActive) {
          // Deactivate both branch shifts
          return {
            ...s,
            active: false,
            branchShifts: {
              sucursal_1: { ...currentS1, active: false },
              sucursal_2: { ...currentS2, active: false },
            },
          };
        } else {
          // Activate master day, activating Montevideo by default if none was active
          const nextS1Active = currentS1.active || (!currentS1.active && !currentS2.active);
          const nextS2Active = currentS2.active;
          const scope: StaffBranchScope = nextS1Active && nextS2Active ? 'ambas' : nextS1Active ? 'sucursal_1' : 'sucursal_2';
          return {
            ...s,
            active: true,
            branchId: scope,
            branchShifts: {
              sucursal_1: { ...currentS1, active: nextS1Active },
              sucursal_2: { ...currentS2, active: nextS2Active },
            },
          };
        }
      })
    );
  };

  // Toggle active state for a specific branch on a day
  const toggleBranchActive = (dayNum: number, branch: 'sucursal_1' | 'sucursal_2') => {
    setDaySchedules((prev) =>
      prev.map((s) => {
        if (s.day !== dayNum) return s;
        const currentS1 = s.branchShifts?.sucursal_1 || { active: false, start: '09:00', end: '18:00', breaks: [] };
        const currentS2 = s.branchShifts?.sucursal_2 || { active: false, start: '09:00', end: '18:00', breaks: [] };

        const nextS1 = branch === 'sucursal_1' ? !currentS1.active : Boolean(currentS1.active);
        const nextS2 = branch === 'sucursal_2' ? !currentS2.active : Boolean(currentS2.active);
        const nextMaster = nextS1 || nextS2;
        const scope: StaffBranchScope = nextS1 && nextS2 ? 'ambas' : nextS1 ? 'sucursal_1' : nextS2 ? 'sucursal_2' : 'ambas';

        return {
          ...s,
          active: nextMaster,
          branchId: scope,
          branchShifts: {
            sucursal_1: { ...currentS1, active: nextS1 },
            sucursal_2: { ...currentS2, active: nextS2 },
          },
        };
      })
    );
  };

  // Update hours for a specific branch on a day
  const updateBranchHours = (
    dayNum: number,
    branch: 'sucursal_1' | 'sucursal_2',
    field: 'start' | 'end',
    val: string
  ) => {
    setDaySchedules((prev) =>
      prev.map((s) => {
        if (s.day !== dayNum) return s;
        const currentS1 = s.branchShifts?.sucursal_1 || { active: false, start: '09:00', end: '18:00', breaks: [] };
        const currentS2 = s.branchShifts?.sucursal_2 || { active: false, start: '09:00', end: '18:00', breaks: [] };

        const updatedS1 = branch === 'sucursal_1' ? { ...currentS1, [field]: val } : currentS1;
        const updatedS2 = branch === 'sucursal_2' ? { ...currentS2, [field]: val } : currentS2;

        const starts = [updatedS1.active ? updatedS1.start : null, updatedS2.active ? updatedS2.start : null].filter(Boolean) as string[];
        const ends = [updatedS1.active ? updatedS1.end : null, updatedS2.active ? updatedS2.end : null].filter(Boolean) as string[];
        const minStart = starts.length > 0 ? [...starts].sort()[0] : '09:00';
        const maxEnd = ends.length > 0 ? [...ends].sort().reverse()[0] : '20:00';

        return {
          ...s,
          start: minStart,
          end: maxEnd,
          branchShifts: {
            sucursal_1: updatedS1,
            sucursal_2: updatedS2,
          },
        };
      })
    );
  };

  // Breaks management
  const addBreak = (dayNum: number, branch: 'sucursal_1' | 'sucursal_2') => {
    setDaySchedules((prev) =>
      prev.map((s) => {
        if (s.day !== dayNum) return s;
        const currentS1: StaffBranchShift = s.branchShifts?.sucursal_1 || { active: false, start: '09:00', end: '18:00', breaks: [] };
        const currentS2: StaffBranchShift = s.branchShifts?.sucursal_2 || { active: false, start: '09:00', end: '18:00', breaks: [] };

        const targetBreaks = branch === 'sucursal_1' ? currentS1.breaks || [] : currentS2.breaks || [];
        const newBreak: StaffBreak = {
          id: `brk_${branch}_${Date.now()}`,
          start: branch === 'sucursal_1' ? '13:00' : '15:00',
          end: branch === 'sucursal_1' ? '14:00' : '16:00',
          description: 'Descanso / Pausa',
        };
        const updatedBreaks = [...targetBreaks, newBreak];

        const updatedS1: StaffBranchShift = branch === 'sucursal_1' ? { ...currentS1, breaks: updatedBreaks } : currentS1;
        const updatedS2: StaffBranchShift = branch === 'sucursal_2' ? { ...currentS2, breaks: updatedBreaks } : currentS2;

        return {
          ...s,
          branchShifts: {
            sucursal_1: updatedS1,
            sucursal_2: updatedS2,
          },
        };
      })
    );
  };

  const removeBreak = (dayNum: number, branch: 'sucursal_1' | 'sucursal_2', breakId: string) => {
    setDaySchedules((prev) =>
      prev.map((s) => {
        if (s.day !== dayNum) return s;
        const currentS1: StaffBranchShift = s.branchShifts?.sucursal_1 || { active: false, start: '09:00', end: '18:00', breaks: [] };
        const currentS2: StaffBranchShift = s.branchShifts?.sucursal_2 || { active: false, start: '09:00', end: '18:00', breaks: [] };

        const targetBreaks = branch === 'sucursal_1' ? currentS1.breaks || [] : currentS2.breaks || [];
        const updatedBreaks = targetBreaks.filter((b) => b.id !== breakId);

        const updatedS1: StaffBranchShift = branch === 'sucursal_1' ? { ...currentS1, breaks: updatedBreaks } : currentS1;
        const updatedS2: StaffBranchShift = branch === 'sucursal_2' ? { ...currentS2, breaks: updatedBreaks } : currentS2;

        return {
          ...s,
          branchShifts: {
            sucursal_1: updatedS1,
            sucursal_2: updatedS2,
          },
        };
      })
    );
  };

  const updateBreak = (
    dayNum: number,
    branch: 'sucursal_1' | 'sucursal_2',
    breakId: string,
    patch: Partial<StaffBreak>
  ) => {
    setDaySchedules((prev) =>
      prev.map((s) => {
        if (s.day !== dayNum) return s;
        const currentS1: StaffBranchShift = s.branchShifts?.sucursal_1 || { active: false, start: '09:00', end: '18:00', breaks: [] };
        const currentS2: StaffBranchShift = s.branchShifts?.sucursal_2 || { active: false, start: '09:00', end: '18:00', breaks: [] };

        const targetBreaks = branch === 'sucursal_1' ? currentS1.breaks || [] : currentS2.breaks || [];
        const updatedBreaks = targetBreaks.map((b) => (b.id === breakId ? { ...b, ...patch } : b));

        const updatedS1: StaffBranchShift = branch === 'sucursal_1' ? { ...currentS1, breaks: updatedBreaks } : currentS1;
        const updatedS2: StaffBranchShift = branch === 'sucursal_2' ? { ...currentS2, breaks: updatedBreaks } : currentS2;

        return {
          ...s,
          branchShifts: {
            sucursal_1: updatedS1,
            sucursal_2: updatedS2,
          },
        };
      })
    );
  };

  // Copy current day configuration to Lunes - Sábado
  const copyDayToWeek = (sourceDayNum: number) => {
    const sourceSchedule = daySchedules.find((s) => s.day === sourceDayNum);
    if (!sourceSchedule) return;

    setDaySchedules((prev) =>
      prev.map((s) => {
        if (s.day === 0) return s; // leave Sunday intact
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
    setSaveSuccessMessage(`Horarios de ${sourceName} copiados a Lunes - Sábado.`);
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

  // Global validation across all 7 days
  const validateSchedules = (): string | null => {
    for (const sched of daySchedules) {
      const dayLabel = DAY_LABELS.find((l) => l.day === sched.day)?.name || `Día ${sched.day}`;
      const s1 = sched.branchShifts?.sucursal_1;
      const s2 = sched.branchShifts?.sucursal_2;

      if (s1?.active && timeToMinutes(s1.end) <= timeToMinutes(s1.start)) {
        return `En ${dayLabel} (${BRANCH_NAMES.sucursal_1}), la hora de salida (${s1.end}) debe ser posterior a la de entrada (${s1.start}).`;
      }

      if (s2?.active && timeToMinutes(s2.end) <= timeToMinutes(s2.start)) {
        return `En ${dayLabel} (${BRANCH_NAMES.sucursal_2}), la hora de salida (${s2.end}) debe ser posterior a la de entrada (${s2.start}).`;
      }

      if (s1?.active && s2?.active && checkBranchShiftsOverlap(s1, s2)) {
        return `En ${dayLabel}, los horarios de Montevideo (${s1.start}-${s1.end}) y Rioja (${s2.start}-${s2.end}) se superponen. Ajusta los horarios para que sean consecutivos y no choquen.`;
      }
    }
    return null;
  };

  const executeSave = async () => {
    setValidationError('');

    const errorMsg = validateSchedules();
    if (errorMsg) {
      setValidationError(errorMsg);
      // If error occurred on a specific day, select it
      for (const sched of daySchedules) {
        const s1 = sched.branchShifts?.sucursal_1;
        const s2 = sched.branchShifts?.sucursal_2;
        if (
          (s1?.active && timeToMinutes(s1.end) <= timeToMinutes(s1.start)) ||
          (s2?.active && timeToMinutes(s2.end) <= timeToMinutes(s2.start)) ||
          (s1?.active && s2?.active && checkBranchShiftsOverlap(s1, s2))
        ) {
          setSelectedDayTab(sched.day);
          break;
        }
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const safeRole = role.trim() || 'Especialista';

      // Clean day schedules ensuring all 7 days are represented and properly tagged
      const cleanDaySchedules: StaffDaySchedule[] = [1, 2, 3, 4, 5, 6, 0].map((dNum) => {
        const found = daySchedules.find((s) => s.day === dNum);
        if (!found) {
          return {
            day: dNum,
            active: false,
            start: '09:00',
            end: '18:00',
            breaks: [],
            branchId: 'ambas',
            branchShifts: {
              sucursal_1: { active: false, start: '09:00', end: '18:00', breaks: [] },
              sucursal_2: { active: false, start: '09:00', end: '18:00', breaks: [] },
            },
          };
        }

        const s1 = found.branchShifts?.sucursal_1;
        const s2 = found.branchShifts?.sucursal_2;

        const isMaster = found.active !== false;
        const s1Active = isMaster && Boolean(s1?.active);
        const s2Active = isMaster && Boolean(s2?.active);
        const dayActive = s1Active || s2Active;

        let scope: StaffBranchScope = 'ambas';
        if (s1Active && s2Active) scope = 'ambas';
        else if (s1Active) scope = 'sucursal_1';
        else if (s2Active) scope = 'sucursal_2';
        else scope = found.branchId || 'ambas';

        const s1Start = s1?.start || '09:00';
        const s1End = s1?.end || '18:00';
        const s2Start = s2?.start || '09:00';
        const s2End = s2?.end || '18:00';

        const activeStarts = [s1Active ? s1Start : null, s2Active ? s2Start : null].filter(Boolean) as string[];
        const activeEnds = [s1Active ? s1End : null, s2Active ? s2End : null].filter(Boolean) as string[];
        const overallStart = activeStarts.length > 0 ? [...activeStarts].sort()[0] : '09:00';
        const overallEnd = activeEnds.length > 0 ? [...activeEnds].sort().reverse()[0] : '18:00';

        return {
          day: dNum,
          active: dayActive,
          branchId: scope,
          start: overallStart,
          end: overallEnd,
          breaks: Array.isArray(found.breaks) ? found.breaks : [],
          branchShifts: {
            sucursal_1: {
              active: s1Active,
              start: s1Start,
              end: s1End,
              breaks: Array.isArray(s1?.breaks) ? s1.breaks : [],
            },
            sucursal_2: {
              active: s2Active,
              start: s2Start,
              end: s2End,
              breaks: Array.isArray(s2?.breaks) ? s2.breaks : [],
            },
          },
        };
      });

      // Active working days numbers (e.g. [1, 2, 3, 4, 5, 6])
      const activeWorkingDays = cleanDaySchedules.filter((s) => s.active).map((s) => s.day);

      // Compute overall branch scope
      const worksInMvd = cleanDaySchedules.some((s) => s.branchShifts?.sucursal_1?.active);
      const worksInRioja = cleanDaySchedules.some((s) => s.branchShifts?.sucursal_2?.active);
      const overallBranchScope: StaffBranchScope =
        worksInMvd && worksInRioja ? 'ambas' : worksInMvd ? 'sucursal_1' : worksInRioja ? 'sucursal_2' : 'ambas';

      const firstActive = cleanDaySchedules.find((s) => s.active) || cleanDaySchedules[0];

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
          workingHoursStart: firstActive?.start || '09:00',
          workingHoursEnd: firstActive?.end || '18:00',
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
          workingHoursStart: firstActive?.start || '09:00',
          workingHoursEnd: firstActive?.end || '18:00',
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
    if (!name.trim()) {
      setValidationError('Por favor ingresa el nombre del profesional.');
      return;
    }

    // Check appointment conflicts if editing existing staff
    if (staffToEdit) {
      const conflicts = findScheduleConflicts(staffToEdit.id, daySchedules, blockedDates, appointments);
      if (conflicts.length > 0) {
        setDetectedConflicts(conflicts);
        setShowConflictWarning(true);
        return;
      }
    }

    executeSave();
  };

  // Sub-component to render a single day card editor
  const renderDayCard = (dayNum: number) => {
    const dayLabel = DAY_LABELS.find((l) => l.day === dayNum);
    const daySched = daySchedules.find((s) => s.day === dayNum) || getStaffDaySchedule(staffToEdit || {
      id: '',
      businessId: '',
      name: '',
      role: '',
      phone: '',
      color: '',
      workingDays: [1, 2, 3, 4, 5, 6],
      workingHoursStart: '09:00',
      workingHoursEnd: '20:00',
      blockedDates: [],
      active: true,
      createdAt: '',
    }, dayNum);

    const s1 = daySched.branchShifts?.sucursal_1 || { active: false, start: '09:00', end: '18:00', breaks: [] };
    const s2 = daySched.branchShifts?.sucursal_2 || { active: false, start: '09:00', end: '18:00', breaks: [] };

    const s1Active = Boolean(s1.active);
    const s2Active = Boolean(s2.active);
    const isDayWorking = daySched.active && (s1Active || s2Active);

    const isS1Invalid = s1Active && timeToMinutes(s1.end) <= timeToMinutes(s1.start);
    const isS2Invalid = s2Active && timeToMinutes(s2.end) <= timeToMinutes(s2.start);
    const hasOverlap = s1Active && s2Active && checkBranchShiftsOverlap(s1, s2);

    const showMvd = branchFilter === 'todas' || branchFilter === 'sucursal_1';
    const showRioja = branchFilter === 'todas' || branchFilter === 'sucursal_2';

    return (
      <div
        key={dayNum}
        className={`bg-white rounded-2xl border-2 transition-all p-4 sm:p-5 space-y-4 shadow-2xs ${
          isDayWorking ? 'border-slate-300' : 'border-dashed border-slate-300 bg-slate-50/70'
        }`}
      >
        {/* Day Header with Master Switch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl text-white font-black text-xs ${isDayWorking ? 'bg-[#1E3A8A]' : 'bg-slate-400'}`}>
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-[#0F172A]">{dayLabel?.name}</h4>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    isDayWorking ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {isDayWorking ? 'Trabaja este día' : 'Franco / No trabaja'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {isDayWorking
                  ? `${s1Active ? 'Montevideo' : ''}${s1Active && s2Active ? ' y ' : ''}${s2Active ? 'Rioja' : ''}`
                  : 'Día no laborable para este profesional'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => copyDayToWeek(dayNum)}
              className="text-[11px] font-black text-[#1E3A8A] hover:bg-blue-50 px-2.5 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1 cursor-pointer transition-colors"
              title="Copiar horario de este día a Lunes - Sábado"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar a la semana</span>
            </button>

            {/* Master Toggle Button */}
            <button
              type="button"
              onClick={() => toggleMasterDay(dayNum)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                isDayWorking
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              {isDayWorking ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Jornada Activa</span>
                </>
              ) : (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>No trabaja</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Overlap alert on this day */}
        {hasOverlap && (
          <div className="p-3 bg-amber-50 border-2 border-amber-400 rounded-xl text-amber-950 text-xs font-bold flex items-start gap-2 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-black text-amber-900 block mb-0.5">⚠️ Horarios superpuestos entre sucursales:</span>
              <span>
                Montevideo ({s1.start} a {s1.end}) y Rioja ({s2.start} a {s2.end}) se cruzan. Ajusta los horarios para que sean consecutivos sin superponerse (por ejemplo: 09:00 a 13:00 en Montevideo y 14:00 a 20:00 en Rioja).
              </span>
            </div>
          </div>
        )}

        {/* Branch Shift Editors */}
        {isDayWorking ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PANEL SOHAM MONTEVIDEO */}
            {showMvd && (
              <div
                className={`rounded-xl border-2 p-3.5 space-y-3 transition-all ${
                  s1Active ? 'bg-blue-50/30 border-[#1E3A8A]' : 'bg-slate-50 border-slate-200 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 text-[#1E3A8A] rounded-lg">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-[#1E3A8A]">Soham Montevideo</h5>
                      <span className="text-[10px] text-slate-500 font-bold">Local Montevideo 1420</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleBranchActive(dayNum, 'sucursal_1')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-black border-2 transition-all cursor-pointer ${
                      s1Active
                        ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {s1Active ? '✓ Atiende aquí' : 'No trabaja'}
                  </button>
                </div>

                {s1Active ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-black text-slate-700 block mb-1">
                          Hora Entrada
                        </label>
                        <input
                          type="time"
                          value={s1.start}
                          onChange={(e) => updateBranchHours(dayNum, 'sucursal_1', 'start', e.target.value)}
                          className="w-full text-xs font-black p-2 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-black text-slate-700 block mb-1">
                          Hora Salida
                        </label>
                        <input
                          type="time"
                          value={s1.end}
                          onChange={(e) => updateBranchHours(dayNum, 'sucursal_1', 'end', e.target.value)}
                          className="w-full text-xs font-black p-2 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                        />
                      </div>
                    </div>

                    {isS1Invalid && (
                      <p className="text-[11px] text-rose-600 font-bold">
                        ⚠️ La hora de salida debe ser posterior a la de entrada.
                      </p>
                    )}

                    {/* Pausas / Descansos */}
                    <div className="pt-2 border-t border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                          <Coffee className="w-3.5 h-3.5 text-amber-700" />
                          <span>Pausas y descansos</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => addBreak(dayNum, 'sucursal_1')}
                          className="text-[10px] font-black text-[#1E3A8A] hover:underline cursor-pointer"
                        >
                          + Agregar pausa
                        </button>
                      </div>

                      {s1.breaks && s1.breaks.length > 0 ? (
                        <div className="space-y-1.5">
                          {s1.breaks.map((b) => (
                            <div key={b.id} className="flex items-center gap-1.5 text-xs bg-white p-1.5 rounded-lg border border-slate-300">
                              <input
                                type="time"
                                value={b.start}
                                onChange={(e) => updateBreak(dayNum, 'sucursal_1', b.id, { start: e.target.value })}
                                className="p-1 border border-slate-300 rounded text-[11px] font-bold"
                              />
                              <span className="text-slate-400 font-bold">a</span>
                              <input
                                type="time"
                                value={b.end}
                                onChange={(e) => updateBreak(dayNum, 'sucursal_1', b.id, { end: e.target.value })}
                                className="p-1 border border-slate-300 rounded text-[11px] font-bold"
                              />
                              <input
                                type="text"
                                placeholder="Motivo"
                                value={b.description || ''}
                                onChange={(e) => updateBreak(dayNum, 'sucursal_1', b.id, { description: e.target.value })}
                                className="p-1 border border-slate-300 rounded text-[10px] flex-1 font-medium"
                              />
                              <button
                                type="button"
                                onClick={() => removeBreak(dayNum, 'sucursal_1', b.id)}
                                className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                                title="Eliminar pausa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 italic">Jornada continua (sin pausas).</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-3 text-center space-y-1">
                    <p className="text-[11px] text-slate-500 font-bold">No trabaja en Montevideo este día</p>
                    <button
                      type="button"
                      onClick={() => toggleBranchActive(dayNum, 'sucursal_1')}
                      className="text-[11px] font-black text-[#1E3A8A] hover:underline cursor-pointer"
                    >
                      + Habilitar Montevideo
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PANEL SOHAM RIOJA */}
            {showRioja && (
              <div
                className={`rounded-xl border-2 p-3.5 space-y-3 transition-all ${
                  s2Active ? 'bg-purple-50/30 border-purple-600' : 'bg-slate-50 border-slate-200 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-purple-900">Soham Rioja</h5>
                      <span className="text-[10px] text-slate-500 font-bold">Local Rioja 2954</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleBranchActive(dayNum, 'sucursal_2')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-black border-2 transition-all cursor-pointer ${
                      s2Active
                        ? 'bg-purple-700 text-white border-purple-800'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {s2Active ? '✓ Atiende aquí' : 'No trabaja'}
                  </button>
                </div>

                {s2Active ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-black text-slate-700 block mb-1">
                          Hora Entrada
                        </label>
                        <input
                          type="time"
                          value={s2.start}
                          onChange={(e) => updateBranchHours(dayNum, 'sucursal_2', 'start', e.target.value)}
                          className="w-full text-xs font-black p-2 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-purple-600 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-black text-slate-700 block mb-1">
                          Hora Salida
                        </label>
                        <input
                          type="time"
                          value={s2.end}
                          onChange={(e) => updateBranchHours(dayNum, 'sucursal_2', 'end', e.target.value)}
                          className="w-full text-xs font-black p-2 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-purple-600 outline-none"
                        />
                      </div>
                    </div>

                    {isS2Invalid && (
                      <p className="text-[11px] text-rose-600 font-bold">
                        ⚠️ La hora de salida debe ser posterior a la de entrada.
                      </p>
                    )}

                    {/* Pausas / Descansos */}
                    <div className="pt-2 border-t border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                          <Coffee className="w-3.5 h-3.5 text-amber-700" />
                          <span>Pausas y descansos</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => addBreak(dayNum, 'sucursal_2')}
                          className="text-[10px] font-black text-purple-700 hover:underline cursor-pointer"
                        >
                          + Agregar pausa
                        </button>
                      </div>

                      {s2.breaks && s2.breaks.length > 0 ? (
                        <div className="space-y-1.5">
                          {s2.breaks.map((b) => (
                            <div key={b.id} className="flex items-center gap-1.5 text-xs bg-white p-1.5 rounded-lg border border-slate-300">
                              <input
                                type="time"
                                value={b.start}
                                onChange={(e) => updateBreak(dayNum, 'sucursal_2', b.id, { start: e.target.value })}
                                className="p-1 border border-slate-300 rounded text-[11px] font-bold"
                              />
                              <span className="text-slate-400 font-bold">a</span>
                              <input
                                type="time"
                                value={b.end}
                                onChange={(e) => updateBreak(dayNum, 'sucursal_2', b.id, { end: e.target.value })}
                                className="p-1 border border-slate-300 rounded text-[11px] font-bold"
                              />
                              <input
                                type="text"
                                placeholder="Motivo"
                                value={b.description || ''}
                                onChange={(e) => updateBreak(dayNum, 'sucursal_2', b.id, { description: e.target.value })}
                                className="p-1 border border-slate-300 rounded text-[10px] flex-1 font-medium"
                              />
                              <button
                                type="button"
                                onClick={() => removeBreak(dayNum, 'sucursal_2', b.id)}
                                className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                                title="Eliminar pausa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 italic">Jornada continua (sin pausas).</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-3 text-center space-y-1">
                    <p className="text-[11px] text-slate-500 font-bold">No trabaja en Rioja este día</p>
                    <button
                      type="button"
                      onClick={() => toggleBranchActive(dayNum, 'sucursal_2')}
                      className="text-[11px] font-black text-purple-700 hover:underline cursor-pointer"
                    >
                      + Habilitar Rioja
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="py-4 text-center space-y-2 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <p className="text-xs font-black text-slate-700">Franco / No atiende en ninguna sucursal este día</p>
            <p className="text-[11px] text-slate-500">
              No se ofrecerán turnos para {name || 'el profesional'} los días {dayLabel?.name}.
            </p>
            <button
              type="button"
              onClick={() => toggleMasterDay(dayNum)}
              className="px-3.5 py-1.5 bg-[#1E3A8A] hover:bg-blue-900 text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Habilitar jornada para este día</span>
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
                  {staffToEdit ? `Ficha y Horarios — ${name || 'Profesional'}` : 'Nuevo Profesional'}
                </h3>
                <p className="text-blue-100 text-xs font-medium">
                  {staffToEdit
                    ? 'Edición directa de días de atención, horarios de entrada y salida, descansos y sucursales'
                    : 'Carga los datos y define los horarios independientes para Soham Montevideo y Soham Rioja'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form id="staff-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-[#0F172A]">
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

            {/* SECCIÓN 1: DATOS PERSONALES */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-300 shadow-2xs space-y-4">
              <span className="text-xs font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#1E3A8A]" />
                <span>1. Ficha del Profesional</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Nombre del profesional"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none font-bold text-[#0F172A] placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">Especialidad / Rol *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Especialista en Estética"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none font-bold text-[#0F172A] placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">WhatsApp / Contacto</label>
                  <input
                    type="tel"
                    placeholder="+54 9 341 555-0101"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none font-bold text-[#0F172A] placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">Comisión por Turno (%) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      required
                      placeholder="40"
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
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">Color Distintivo</label>
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
            </div>

            {/* SECCIÓN 2: HORARIOS Y DÍAS DE TRABAJO */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-300 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#1E3A8A]" />
                    <span>2. Horarios y Días de Trabajo por Sucursal</span>
                  </span>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    Configura de lunes a sábado los días, horas de entrada/salida y descansos para Montevideo y Rioja.
                  </p>
                </div>

                {/* Switcher Vista: Día a Día vs Semana Completa */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setScheduleViewMode('dia')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      scheduleViewMode === 'dia' ? 'bg-[#1E3A8A] text-white shadow-xs' : 'text-slate-700 hover:text-black'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Por Día</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleViewMode('semana')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      scheduleViewMode === 'semana' ? 'bg-[#1E3A8A] text-white shadow-xs' : 'text-slate-700 hover:text-black'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Semana Completa</span>
                  </button>
                </div>
              </div>

              {/* Filtro de Sucursal en Pantalla */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700">Ver sucursal:</span>
                <button
                  type="button"
                  onClick={() => setBranchFilter('todas')}
                  className={`px-3 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    branchFilter === 'todas'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Todas (Montevideo y Rioja)
                </button>
                <button
                  type="button"
                  onClick={() => setBranchFilter('sucursal_1')}
                  className={`px-3 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    branchFilter === 'sucursal_1'
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-2xs'
                      : 'bg-white text-[#1E3A8A] border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  Solo Soham Montevideo
                </button>
                <button
                  type="button"
                  onClick={() => setBranchFilter('sucursal_2')}
                  className={`px-3 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    branchFilter === 'sucursal_2'
                      ? 'bg-purple-700 text-white border-purple-800 shadow-2xs'
                      : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-50'
                  }`}
                >
                  Solo Soham Rioja
                </button>
              </div>

              {/* Botones de Días (siempre visibles para saltar rápidamente) */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {DAY_LABELS.map((d) => {
                  const s = daySchedules.find((item) => item.day === d.day);
                  const isCurrent = scheduleViewMode === 'dia' && selectedDayTab === d.day;
                  const s1Act = Boolean(s?.branchShifts?.sucursal_1?.active);
                  const s2Act = Boolean(s?.branchShifts?.sucursal_2?.active);
                  const isWorking = Boolean(s?.active) && (s1Act || s2Act);

                  let statusText = 'No trabaja';
                  let statusColor = 'text-slate-500 bg-slate-100';

                  if (isWorking) {
                    if (s1Act && s2Act) {
                      statusText = 'Ambas';
                      statusColor = 'text-indigo-900 bg-indigo-100 font-black';
                    } else if (s1Act) {
                      statusText = 'Montevideo';
                      statusColor = 'text-blue-900 bg-blue-100 font-black';
                    } else {
                      statusText = 'Rioja';
                      statusColor = 'text-purple-900 bg-purple-100 font-black';
                    }
                  }

                  return (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => {
                        setSelectedDayTab(d.day);
                        if (scheduleViewMode === 'semana') setScheduleViewMode('dia');
                      }}
                      className={`p-2 rounded-xl text-xs font-black border-2 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        isCurrent
                          ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-md scale-102 ring-2 ring-blue-300'
                          : 'bg-white text-[#0F172A] border-slate-300 hover:border-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-black">{d.short}</span>
                      <span className={`text-[9px] px-1 py-0.5 rounded truncate max-w-full ${isCurrent ? 'bg-white/20 text-white' : statusColor}`}>
                        {statusText}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Render de los Días: o el día seleccionado, o la semana completa */}
              <div className="space-y-4 pt-1">
                {scheduleViewMode === 'dia' ? (
                  renderDayCard(selectedDayTab)
                ) : (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5, 6, 0].map((dNum) => renderDayCard(dNum))}
                  </div>
                )}
              </div>
            </div>

            {/* SECCIÓN 3: FECHAS BLOQUEADAS / VACACIONES */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-300 shadow-2xs space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#1E3A8A]" />
                <span>3. Fechas Bloqueadas / Vacaciones (Opcional)</span>
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
              {staffToEdit ? `Modificando horarios de ${name}` : 'Creando nuevo profesional'}
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
                <span>{isSubmitting ? 'Guardando permanentemente...' : staffToEdit ? 'Guardar Cambios de Horario' : 'Crear Profesional'}</span>
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
                <p className="text-xs text-amber-800">El nuevo horario entra en conflicto con citas existentes</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              Hay <strong>{detectedConflicts.length}</strong> turno(s) confirmado(s) que quedan fuera de los nuevos horarios o días de atención configurados para {name}.
            </p>

            <div className="max-h-40 overflow-y-auto space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              {detectedConflicts.map((c, i) => (
                <div key={i} className="text-[11px] p-2 bg-white rounded-lg border border-slate-200 text-slate-800">
                  <div className="font-black text-[#1E3A8A]">{c.appointment.clientName} ({c.appointment.serviceName})</div>
                  <div className="text-slate-600 font-bold">{c.appointment.date} a las {c.appointment.time} hs</div>
                  <div className="text-rose-600 text-[10px] font-bold">{c.reason}</div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-600 font-bold">
              ¿Deseas aplicar los cambios de horario de todos modos? Los turnos existentes se mantendrán registrados para su reasignación o aviso.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowConflictWarning(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Volver y corregir
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConflictWarning(false);
                  executeSave();
                }}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer"
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
