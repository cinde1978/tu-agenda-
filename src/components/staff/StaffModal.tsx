import React, { useState } from 'react';
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
} from '../../utils/staffSchedule';
import { formatDateSpanish } from '../../utils/formatters';

export interface StaffModalProps {
  staffToEdit?: StaffMember | null;
  initialBranchId?: BranchId | 'ambas';
  onClose: () => void;
  onSaved?: (staffId: string) => void;
}

const COLORS = [
  '#2563eb', // royal blue
  '#0284c7', // sky blue
  '#0d9488', // teal
  '#6366f1', // indigo
  '#7c3aed', // violet
  '#db2777', // pink
  '#ea580c', // orange
];

export function StaffModal({ staffToEdit, initialBranchId, onClose, onSaved }: StaffModalProps) {
  const { createStaff, updateStaff, appointments } = useApp();
  const [name, setName] = useState(staffToEdit?.name || '');
  const [role, setRole] = useState(staffToEdit?.role || 'Estilista / Especialista');
  const [phone, setPhone] = useState(staffToEdit?.phone || '');
  const [color, setColor] = useState(staffToEdit?.color || COLORS[0]);
  const [branchId, setBranchId] = useState<StaffBranchScope>(
    staffToEdit?.branchId || initialBranchId || 'ambas'
  );

  // Initialize weekly day schedules (independent per staff member, guarantees all 7 days)
  const [daySchedules, setDaySchedules] = useState<StaffDaySchedule[]>(() => {
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

  const [selectedDayTab, setSelectedDayTab] = useState<number>(1); // 1 = Lunes
  const [blockedDates, setBlockedDates] = useState<string[]>(staffToEdit?.blockedDates || []);
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [active, setActive] = useState(staffToEdit?.active ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Conflict warning dialog states
  const [detectedConflicts, setDetectedConflicts] = useState<ScheduleConflict[]>([]);
  const [showConflictWarning, setShowConflictWarning] = useState(false);

  // Current day schedule being edited (guaranteed to find the day)
  const currentDaySchedule: StaffDaySchedule =
    daySchedules.find((s) => s.day === selectedDayTab) ||
    getStaffDaySchedule(
      staffToEdit || {
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
      },
      selectedDayTab
    );

  const updateCurrentDaySchedule = (patch: Partial<StaffDaySchedule>) => {
    setDaySchedules((prev) => {
      const exists = prev.some((s) => s.day === selectedDayTab);
      if (exists) {
        return prev.map((s) => (s.day === selectedDayTab ? { ...s, ...patch } : s));
      }
      const base = getStaffDaySchedule(
        staffToEdit || ({ workingDays: [1, 2, 3, 4, 5, 6] } as any),
        selectedDayTab
      );
      return [...prev, { ...base, ...patch }];
    });
  };

  const handleDayBranchChange = (newBranch: StaffBranchScope) => {
    const curStart = currentDaySchedule.start || '09:00';
    const curEnd = currentDaySchedule.end || '20:00';
    const curBreaks = currentDaySchedule.breaks || [];

    const updatedShifts = {
      sucursal_1: {
        active: newBranch === 'sucursal_1' || newBranch === 'ambas',
        start: newBranch === 'ambas' ? (currentDaySchedule.branchShifts?.sucursal_1?.start || '09:00') : curStart,
        end: newBranch === 'ambas' ? (currentDaySchedule.branchShifts?.sucursal_1?.end || '14:00') : curEnd,
        breaks: newBranch === 'sucursal_1' ? curBreaks : (currentDaySchedule.branchShifts?.sucursal_1?.breaks || []),
      },
      sucursal_2: {
        active: newBranch === 'sucursal_2' || newBranch === 'ambas',
        start: newBranch === 'ambas' ? (currentDaySchedule.branchShifts?.sucursal_2?.start || '15:00') : curStart,
        end: newBranch === 'ambas' ? (currentDaySchedule.branchShifts?.sucursal_2?.end || '20:00') : curEnd,
        breaks: newBranch === 'sucursal_2' ? curBreaks : (currentDaySchedule.branchShifts?.sucursal_2?.breaks || []),
      },
    };

    updateCurrentDaySchedule({
      branchId: newBranch,
      branchShifts: updatedShifts,
    });
  };

  const handleSingleBranchTimeChange = (field: 'start' | 'end', val: string) => {
    const curBranch = currentDaySchedule.branchId === 'sucursal_2' ? 'sucursal_2' : 'sucursal_1';
    const existingShift = currentDaySchedule.branchShifts?.[curBranch] || {
      active: true,
      start: currentDaySchedule.start || '09:00',
      end: currentDaySchedule.end || '20:00',
      breaks: currentDaySchedule.breaks || [],
    };
    updateCurrentDaySchedule({
      [field]: val,
      branchShifts: {
        ...currentDaySchedule.branchShifts,
        [curBranch]: {
          ...existingShift,
          [field]: val,
          active: true,
        },
      },
    });
  };

  const updateBranchShift = (branch: 'sucursal_1' | 'sucursal_2', patch: Partial<StaffBranchShift>) => {
    const existing = currentDaySchedule.branchShifts?.[branch] || {
      active: true,
      start: branch === 'sucursal_1' ? '09:00' : '15:00',
      end: branch === 'sucursal_1' ? '14:00' : '20:00',
      breaks: [],
    };
    const updatedShift: StaffBranchShift = { ...existing, ...patch };
    updateCurrentDaySchedule({
      branchShifts: {
        ...currentDaySchedule.branchShifts,
        [branch]: updatedShift,
      },
    });
  };

  const handleToggleActiveDay = () => {
    updateCurrentDaySchedule({ active: !currentDaySchedule.active });
  };

  // Generic breaks management
  const handleAddBreak = () => {
    const newBreak: StaffBreak = {
      id: 'brk_' + Date.now(),
      start: '13:00',
      end: '14:00',
      description: 'Almuerzo / Descanso',
    };
    updateCurrentDaySchedule({
      breaks: [...(currentDaySchedule.breaks || []), newBreak],
    });
  };

  const handleRemoveBreak = (breakId: string) => {
    updateCurrentDaySchedule({
      breaks: (currentDaySchedule.breaks || []).filter((b) => b.id !== breakId),
    });
  };

  const handleUpdateBreak = (breakId: string, patch: Partial<StaffBreak>) => {
    updateCurrentDaySchedule({
      breaks: (currentDaySchedule.breaks || []).map((b) =>
        b.id === breakId ? { ...b, ...patch } : b
      ),
    });
  };

  // Branch-specific breaks management for independent shifts
  const handleAddBranchBreak = (branch: 'sucursal_1' | 'sucursal_2') => {
    const newBreak: StaffBreak = {
      id: `brk_${branch}_${Date.now()}`,
      start: branch === 'sucursal_1' ? '12:00' : '17:00',
      end: branch === 'sucursal_1' ? '13:00' : '18:00',
      description: 'Descanso',
    };
    const existingShift = currentDaySchedule.branchShifts?.[branch] || {
      active: true,
      start: '09:00',
      end: '20:00',
      breaks: [],
    };
    updateBranchShift(branch, {
      breaks: [...(existingShift.breaks || []), newBreak],
    });
  };

  const handleRemoveBranchBreak = (branch: 'sucursal_1' | 'sucursal_2', breakId: string) => {
    const existingShift = currentDaySchedule.branchShifts?.[branch];
    if (!existingShift) return;
    updateBranchShift(branch, {
      breaks: (existingShift.breaks || []).filter((b) => b.id !== breakId),
    });
  };

  const handleUpdateBranchBreak = (
    branch: 'sucursal_1' | 'sucursal_2',
    breakId: string,
    patch: Partial<StaffBreak>
  ) => {
    const existingShift = currentDaySchedule.branchShifts?.[branch];
    if (!existingShift) return;
    updateBranchShift(branch, {
      breaks: (existingShift.breaks || []).map((b) =>
        b.id === breakId ? { ...b, ...patch } : b
      ),
    });
  };

  const handleCopyScheduleToAllWorkingDays = () => {
    setDaySchedules((prev) =>
      prev.map((s) => {
        if (s.day === 0) return s; // leave Sunday untouched by default unless configured
        return {
          ...s,
          active: true,
          start: currentDaySchedule.start,
          end: currentDaySchedule.end,
          breaks: currentDaySchedule.breaks ? JSON.parse(JSON.stringify(currentDaySchedule.breaks)) : [],
          branchId: currentDaySchedule.branchId,
          branchShifts: currentDaySchedule.branchShifts
            ? JSON.parse(JSON.stringify(currentDaySchedule.branchShifts))
            : undefined,
        };
      })
    );
  };

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

  const executeSave = async () => {
    setIsSubmitting(true);
    const safeRole = role.trim() || 'Especialista';

    // Synchronize legacy fields with daySchedules for full backwards compatibility
    const activeWorkingDays = daySchedules.filter((s) => s.active).map((s) => s.day);
    const firstActive = daySchedules.find((s) => s.active) || daySchedules[0];
    const safeStart = firstActive?.start || '09:00';
    // Calculate overall branch scope from active day schedules
    const worksInS1 = daySchedules.some(
      (s) => s.active && (s.branchId === 'sucursal_1' || s.branchId === 'ambas' || s.branchShifts?.sucursal_1?.active)
    );
    const worksInS2 = daySchedules.some(
      (s) => s.active && (s.branchId === 'sucursal_2' || s.branchId === 'ambas' || s.branchShifts?.sucursal_2?.active)
    );
    const effectiveOverallBranch: StaffBranchScope =
      worksInS1 && worksInS2 ? 'ambas' : worksInS1 ? 'sucursal_1' : worksInS2 ? 'sucursal_2' : branchId;

    // Sanitize cleanDaySchedules ensuring no undefined fields
    const cleanDaySchedules: StaffDaySchedule[] = daySchedules.map((s) => {
      const bScope = s.branchId || 'ambas';
      const s1Active = bScope === 'sucursal_1' || (bScope === 'ambas' && s.branchShifts?.sucursal_1?.active !== false);
      const s2Active = bScope === 'sucursal_2' || (bScope === 'ambas' && s.branchShifts?.sucursal_2?.active !== false);

      return {
        day: s.day,
        active: Boolean(s.active),
        start: s.start || '09:00',
        end: s.end || '20:00',
        breaks: Array.isArray(s.breaks) ? s.breaks.map((b) => ({
          id: b.id || `brk_${Date.now()}`,
          start: b.start || '13:00',
          end: b.end || '14:00',
          description: b.description || '',
        })) : [],
        branchId: bScope,
        branchShifts: {
          sucursal_1: {
            active: s1Active,
            start: s.branchShifts?.sucursal_1?.start || (bScope === 'ambas' ? '09:00' : s.start || '09:00'),
            end: s.branchShifts?.sucursal_1?.end || (bScope === 'ambas' ? '14:00' : s.end || '20:00'),
            breaks: Array.isArray(s.branchShifts?.sucursal_1?.breaks)
              ? s.branchShifts.sucursal_1.breaks.map((b) => ({ id: b.id || `b_${Date.now()}`, start: b.start || '13:00', end: b.end || '14:00', description: b.description || '' }))
              : (bScope === 'sucursal_1' ? (s.breaks || []) : []),
          },
          sucursal_2: {
            active: s2Active,
            start: s.branchShifts?.sucursal_2?.start || (bScope === 'ambas' ? '15:00' : s.start || '09:00'),
            end: s.branchShifts?.sucursal_2?.end || (bScope === 'ambas' ? '20:00' : s.end || '20:00'),
            breaks: Array.isArray(s.branchShifts?.sucursal_2?.breaks)
              ? s.branchShifts.sucursal_2.breaks.map((b) => ({ id: b.id || `b_${Date.now()}`, start: b.start || '13:00', end: b.end || '14:00', description: b.description || '' }))
              : (bScope === 'sucursal_2' ? (s.breaks || []) : []),
          },
        },
      };
    });

    try {
      if (staffToEdit) {
        await updateStaff({
          ...staffToEdit,
          name: name.trim(),
          role: safeRole,
          phone: phone.trim(),
          color,
          branchId: effectiveOverallBranch,
          workingDays: activeWorkingDays,
          workingHoursStart: safeStart,
          workingHoursEnd: safeEnd,
          daySchedules: cleanDaySchedules,
          blockedDates,
          active,
        });
        if (onSaved) onSaved(staffToEdit.id);
      } else {
        const newId = await createStaff({
          name: name.trim(),
          role: safeRole,
          phone: phone.trim(),
          color,
          branchId: effectiveOverallBranch,
          workingDays: activeWorkingDays,
          workingHoursStart: safeStart,
          workingHoursEnd: safeEnd,
          daySchedules: cleanDaySchedules,
          blockedDates,
          active,
        });
        if (onSaved) onSaved(newId);
      }
      onClose();
    } catch (err) {
      console.error('Error al guardar profesional:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // If editing existing staff, inspect if schedule changes conflict with existing appointments
    if (staffToEdit) {
      const conflicts = findScheduleConflicts(
        staffToEdit.id,
        daySchedules,
        blockedDates,
        appointments
      );

      if (conflicts.length > 0) {
        setDetectedConflicts(conflicts);
        setShowConflictWarning(true);
        return;
      }
    }

    await executeSave();
  };

  const dayScope = currentDaySchedule.branchId || branchId || 'ambas';
  const s1Shift = currentDaySchedule.branchShifts?.sucursal_1 || {
    active: true,
    start: '09:00',
    end: '14:00',
    breaks: [],
  };
  const s2Shift = currentDaySchedule.branchShifts?.sucursal_2 || {
    active: true,
    start: '15:00',
    end: '20:00',
    breaks: [],
  };

  const shiftsOverlap =
    dayScope === 'ambas' &&
    s1Shift.active &&
    s2Shift.active &&
    checkBranchShiftsOverlap(s1Shift, s2Shift);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-300 w-full max-w-2xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-[#1E3A8A] px-4 py-3 sm:px-5 sm:py-3.5 text-white flex items-center justify-between shrink-0 border-b border-blue-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg leading-tight text-white">
                {staffToEdit ? 'Configuración de Profesional' : 'Nuevo Profesional'}
              </h3>
              <p className="text-blue-100 text-[11px] sm:text-xs font-medium">
                Soham Montevideo & Soham Rioja · Horarios independientes por día
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col text-[#0F172A]">
          <div className="p-4 sm:p-5 space-y-4 bg-white">
            {/* General Info: Name, Role, Phone, Color */}
            <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-300 space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-[#0F172A] block">
                1. Datos del Especialista
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Camila Rossi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A] outline-none font-bold text-[#0F172A] placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">Especialidad / Rol *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Colorista & Peinadora"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A] outline-none font-bold text-[#0F172A] placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">WhatsApp / Contacto</label>
                  <input
                    type="tel"
                    placeholder="+54 9 11 1234-5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A] outline-none font-bold text-[#0F172A] placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">Color distintivo</label>
                  <div className="flex items-center gap-2 pt-1">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
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

            {/* General Branch Assignment */}
            <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-300">
              <label className="text-xs font-black text-[#0F172A] flex items-center gap-1.5 mb-2">
                <Building2 className="w-4 h-4 text-[#1E3A8A]" />
                <span>2. Asignación General de Sucursales</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setBranchId('sucursal_1')}
                  className={`py-2 px-2 rounded-xl border-2 text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    branchId === 'sucursal_1'
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                      : 'bg-white border-slate-300 text-[#0F172A] hover:bg-slate-100 hover:border-slate-400'
                  }`}
                >
                  <span>Soham Montevideo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBranchId('sucursal_2')}
                  className={`py-2 px-2 rounded-xl border-2 text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    branchId === 'sucursal_2'
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                      : 'bg-white border-slate-300 text-[#0F172A] hover:bg-slate-100 hover:border-slate-400'
                  }`}
                >
                  <span>Soham Rioja</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBranchId('ambas')}
                  className={`py-2 px-2 rounded-xl border-2 text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    branchId === 'ambas'
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                      : 'bg-white border-slate-300 text-[#0F172A] hover:bg-slate-100 hover:border-slate-400'
                  }`}
                >
                  <span>Ambas Sucursales</span>
                </button>
              </div>
            </div>

            {/* Independent Working Hours by Day */}
            <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-300 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-[#0F172A] block">
                    3. Horarios y Disponibilidad por Día (Lunes a Domingo)
                  </span>
                  <p className="text-[11px] text-slate-600 font-bold">
                    Configura la sucursal y el horario de trabajo independiente para cada día.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyScheduleToAllWorkingDays}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border-2 border-slate-300 text-[#0F172A] rounded-lg text-[11px] font-black flex items-center gap-1 shadow-2xs cursor-pointer transition-colors shrink-0"
                  title="Copiar las horas, sucursales y descansos de este día a Lunes-Sábado"
                >
                  <Copy className="w-3 h-3 text-[#1E3A8A]" />
                  <span>Copiar este horario a la semana</span>
                </button>
              </div>

              {/* Day Selector Tabs (Lunes a Domingo) */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {DAY_LABELS.map((d) => {
                  const s = daySchedules.find((item) => item.day === d.day);
                  const isCurrent = selectedDayTab === d.day;
                  const isActiveDay = s ? s.active : d.day !== 0;

                  return (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => setSelectedDayTab(d.day)}
                      className={`py-2 px-1 rounded-xl text-xs font-black border-2 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                        isCurrent
                          ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs scale-102'
                          : isActiveDay
                          ? 'bg-white text-[#0F172A] border-slate-300 hover:bg-slate-100'
                          : 'bg-slate-100 text-slate-400 border-dashed border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <span>{d.short}</span>
                      <span
                        className={`text-[9px] font-bold px-1 rounded ${
                          isCurrent
                            ? 'bg-white/20 text-white'
                            : isActiveDay
                            ? 'text-emerald-700 bg-emerald-50'
                            : 'text-slate-500 bg-slate-200'
                        }`}
                      >
                        {isActiveDay ? 'Atiende' : 'Franco'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Configuration Card */}
              <div className="p-3.5 bg-white rounded-xl border-2 border-slate-300 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#1E3A8A]" />
                    <span className="text-xs font-black text-[#0F172A]">
                      Día {DAY_LABELS.find((l) => l.day === selectedDayTab)?.name}
                    </span>
                  </div>

                  {/* Toggle Working Day vs Rest Day */}
                  <button
                    type="button"
                    onClick={handleToggleActiveDay}
                    className={`px-3 py-1 rounded-lg text-xs font-black border-2 transition-all cursor-pointer ${
                      currentDaySchedule.active
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                    }`}
                  >
                    {currentDaySchedule.active ? '✓ Día Laboral' : '⏸ Día de Descanso / Franco'}
                  </button>
                </div>

                {currentDaySchedule.active ? (
                  <div className="space-y-3.5">
                    {/* Branch Assignment for this Day */}
                    <div>
                      <label className="text-[11px] font-black text-[#0F172A] block mb-1">
                        Sucursal asignada para este día
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => handleDayBranchChange('sucursal_1')}
                          className={`py-1.5 px-2 rounded-lg border-2 text-[11px] font-black transition-all cursor-pointer ${
                            dayScope === 'sucursal_1'
                              ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                              : 'bg-white text-[#0F172A] border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          Soham Montevideo
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDayBranchChange('sucursal_2')}
                          className={`py-1.5 px-2 rounded-lg border-2 text-[11px] font-black transition-all cursor-pointer ${
                            dayScope === 'sucursal_2'
                              ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                              : 'bg-white text-[#0F172A] border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          Soham Rioja
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDayBranchChange('ambas')}
                          className={`py-1.5 px-2 rounded-lg border-2 text-[11px] font-black transition-all cursor-pointer ${
                            dayScope === 'ambas'
                              ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                              : 'bg-white text-[#0F172A] border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          Ambas sucursales (el mismo día)
                        </button>
                      </div>
                    </div>

                    {/* CASE A: Single Branch on this day (Soham Montevideo or Soham Rioja) */}
                    {dayScope !== 'ambas' && (
                      <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-1.5 text-xs font-black text-[#1E3A8A]">
                          <Building2 className="w-4 h-4" />
                          <span>
                            Horario en {dayScope === 'sucursal_1' ? 'Soham Montevideo' : 'Soham Rioja'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-black text-[#0F172A] block mb-1">
                              Hora de Inicio / Entrada
                            </label>
                            <input
                              type="time"
                              value={currentDaySchedule.start}
                              onChange={(e) => handleSingleBranchTimeChange('start', e.target.value)}
                              className="w-full text-xs sm:text-sm p-2 rounded-lg border-2 border-slate-300 bg-white text-[#0F172A] font-bold outline-none focus:border-[#1E3A8A]"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-black text-[#0F172A] block mb-1">
                              Hora de Cierre / Salida
                            </label>
                            <input
                              type="time"
                              value={currentDaySchedule.end}
                              onChange={(e) => handleSingleBranchTimeChange('end', e.target.value)}
                              className="w-full text-xs sm:text-sm p-2 rounded-lg border-2 border-slate-300 bg-white text-[#0F172A] font-bold outline-none focus:border-[#1E3A8A]"
                            />
                          </div>
                        </div>

                        {/* Breaks */}
                        <div className="pt-2 border-t border-slate-200">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-[11px] font-black text-[#0F172A] flex items-center gap-1">
                              <Coffee className="w-3.5 h-3.5 text-amber-700" />
                              <span>Descansos / Almuerzo</span>
                            </label>
                            <button
                              type="button"
                              onClick={handleAddBreak}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Plus className="w-3 h-3 stroke-[3]" />
                              <span>+ Agregar descanso</span>
                            </button>
                          </div>

                          {(!currentDaySchedule.breaks || currentDaySchedule.breaks.length === 0) ? (
                            <p className="text-[11px] text-slate-500 italic">
                              Sin descansos (jornada continua de {currentDaySchedule.start} a {currentDaySchedule.end} hs).
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {currentDaySchedule.breaks.map((brk, index) => (
                                <div
                                  key={brk.id || index}
                                  className="flex items-center gap-2 p-2 bg-amber-50/70 border border-amber-200 rounded-xl"
                                >
                                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-950">
                                    <span>De</span>
                                    <input
                                      type="time"
                                      value={brk.start}
                                      onChange={(e) => handleUpdateBreak(brk.id, { start: e.target.value })}
                                      className="p-1 rounded border border-amber-300 bg-white text-xs font-black text-[#0F172A]"
                                    />
                                    <span>a</span>
                                    <input
                                      type="time"
                                      value={brk.end}
                                      onChange={(e) => handleUpdateBreak(brk.id, { end: e.target.value })}
                                      className="p-1 rounded border border-amber-300 bg-white text-xs font-black text-[#0F172A]"
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Motivo (ej. Almuerzo)"
                                    value={brk.description || ''}
                                    onChange={(e) =>
                                      handleUpdateBreak(brk.id, { description: e.target.value })
                                    }
                                    className="flex-1 p-1 rounded border border-amber-300 bg-white text-[11px] font-bold text-[#0F172A]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBreak(brk.id)}
                                    className="p-1 text-rose-700 hover:bg-rose-100 rounded-lg cursor-pointer"
                                    title="Eliminar descanso"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* CASE B: Both Branches on this day with Independent Schedules */}
                    {dayScope === 'ambas' && (
                      <div className="space-y-3">
                        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 text-xs font-semibold flex items-start gap-2">
                          <Info className="w-4 h-4 text-[#1E3A8A] shrink-0 mt-0.5" />
                          <span>
                            Define el turno de trabajo independiente para cada local. Por ejemplo: mañana en Soham Montevideo y tarde en Soham Rioja.
                          </span>
                        </div>

                        {/* Overlap Status Banner */}
                        {shiftsOverlap ? (
                          <div className="p-3 bg-amber-50 border-2 border-amber-400 rounded-xl text-amber-950 text-xs font-bold flex items-start gap-2 shadow-2xs">
                            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-black text-amber-900 block mb-0.5">
                                ⚠️ Advertencia de solapamiento de horarios entre sucursales:
                              </span>
                              <span>
                                Soham Montevideo ({s1Shift.start} a {s1Shift.end}) y Soham Rioja ({s2Shift.start} a {s2Shift.end}) se cruzan en este día. Te recomendamos asignar franjas sin solapamiento para evitar conflictos de disponibilidad.
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-bold flex items-center gap-2 shadow-2xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span>
                              ✓ Horarios coordinados: Soham Montevideo ({s1Shift.start} - {s1Shift.end} hs) y Soham Rioja ({s2Shift.start} - {s2Shift.end} hs) sin superposición.
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* SOHAM MONTEVIDEO SHIFT */}
                          <div className="p-3 bg-slate-50 rounded-xl border-2 border-slate-300 space-y-2.5">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                              <span className="text-xs font-black text-[#1E3A8A] flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-[#1E3A8A]" />
                                Soham Montevideo
                              </span>
                              <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={s1Shift.active}
                                  onChange={(e) => updateBranchShift('sucursal_1', { active: e.target.checked })}
                                  className="w-3.5 h-3.5 rounded text-[#1E3A8A]"
                                />
                                <span>Activo</span>
                              </label>
                            </div>

                            {s1Shift.active ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] font-black text-slate-700 block mb-0.5">Entrada</label>
                                    <input
                                      type="time"
                                      value={s1Shift.start}
                                      onChange={(e) => updateBranchShift('sucursal_1', { start: e.target.value })}
                                      className="w-full text-xs p-1.5 rounded-lg border-2 border-slate-300 bg-white text-[#0F172A] font-bold outline-none focus:border-[#1E3A8A]"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-black text-slate-700 block mb-0.5">Salida</label>
                                    <input
                                      type="time"
                                      value={s1Shift.end}
                                      onChange={(e) => updateBranchShift('sucursal_1', { end: e.target.value })}
                                      className="w-full text-xs p-1.5 rounded-lg border-2 border-slate-300 bg-white text-[#0F172A] font-bold outline-none focus:border-[#1E3A8A]"
                                    />
                                  </div>
                                </div>

                                {/* Montevideo Breaks */}
                                <div className="pt-1.5 border-t border-slate-200">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-black text-slate-700">Descansos</span>
                                    <button
                                      type="button"
                                      onClick={() => handleAddBranchBreak('sucursal_1')}
                                      className="text-[10px] font-black text-blue-700 hover:text-blue-900 cursor-pointer"
                                    >
                                      + Descanso
                                    </button>
                                  </div>
                                  {s1Shift.breaks && s1Shift.breaks.length > 0 ? (
                                    <div className="space-y-1">
                                      {s1Shift.breaks.map((b) => (
                                        <div key={b.id} className="flex items-center gap-1 text-[10px] bg-white p-1 rounded border border-slate-200">
                                          <input
                                            type="time"
                                            value={b.start}
                                            onChange={(e) => handleUpdateBranchBreak('sucursal_1', b.id, { start: e.target.value })}
                                            className="p-0.5 border rounded text-[10px]"
                                          />
                                          <span>-</span>
                                          <input
                                            type="time"
                                            value={b.end}
                                            onChange={(e) => handleUpdateBranchBreak('sucursal_1', b.id, { end: e.target.value })}
                                            className="p-0.5 border rounded text-[10px]"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveBranchBreak('sucursal_1', b.id)}
                                            className="text-rose-600 hover:text-rose-800 ml-auto p-0.5 cursor-pointer"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic block">Jornada continua</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 italic py-2 text-center">
                                No atiende en Soham Montevideo este día
                              </p>
                            )}
                          </div>

                          {/* SOHAM RIOJA SHIFT */}
                          <div className="p-3 bg-slate-50 rounded-xl border-2 border-slate-300 space-y-2.5">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                              <span className="text-xs font-black text-[#1E3A8A] flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-[#1E3A8A]" />
                                Soham Rioja
                              </span>
                              <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={s2Shift.active}
                                  onChange={(e) => updateBranchShift('sucursal_2', { active: e.target.checked })}
                                  className="w-3.5 h-3.5 rounded text-[#1E3A8A]"
                                />
                                <span>Activo</span>
                              </label>
                            </div>

                            {s2Shift.active ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] font-black text-slate-700 block mb-0.5">Entrada</label>
                                    <input
                                      type="time"
                                      value={s2Shift.start}
                                      onChange={(e) => updateBranchShift('sucursal_2', { start: e.target.value })}
                                      className="w-full text-xs p-1.5 rounded-lg border-2 border-slate-300 bg-white text-[#0F172A] font-bold outline-none focus:border-[#1E3A8A]"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-black text-slate-700 block mb-0.5">Salida</label>
                                    <input
                                      type="time"
                                      value={s2Shift.end}
                                      onChange={(e) => updateBranchShift('sucursal_2', { end: e.target.value })}
                                      className="w-full text-xs p-1.5 rounded-lg border-2 border-slate-300 bg-white text-[#0F172A] font-bold outline-none focus:border-[#1E3A8A]"
                                    />
                                  </div>
                                </div>

                                {/* Rioja Breaks */}
                                <div className="pt-1.5 border-t border-slate-200">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-black text-slate-700">Descansos</span>
                                    <button
                                      type="button"
                                      onClick={() => handleAddBranchBreak('sucursal_2')}
                                      className="text-[10px] font-black text-blue-700 hover:text-blue-900 cursor-pointer"
                                    >
                                      + Descanso
                                    </button>
                                  </div>
                                  {s2Shift.breaks && s2Shift.breaks.length > 0 ? (
                                    <div className="space-y-1">
                                      {s2Shift.breaks.map((b) => (
                                        <div key={b.id} className="flex items-center gap-1 text-[10px] bg-white p-1 rounded border border-slate-200">
                                          <input
                                            type="time"
                                            value={b.start}
                                            onChange={(e) => handleUpdateBranchBreak('sucursal_2', b.id, { start: e.target.value })}
                                            className="p-0.5 border rounded text-[10px]"
                                          />
                                          <span>-</span>
                                          <input
                                            type="time"
                                            value={b.end}
                                            onChange={(e) => handleUpdateBranchBreak('sucursal_2', b.id, { end: e.target.value })}
                                            className="p-0.5 border rounded text-[10px]"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveBranchBreak('sucursal_2', b.id)}
                                            className="text-rose-600 hover:text-rose-800 ml-auto p-0.5 cursor-pointer"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic block">Jornada continua</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 italic py-2 text-center">
                                No atiende en Soham Rioja este día
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                    <p className="text-xs font-black text-amber-900">
                      {name || 'Este profesional'} no atiende los días {DAY_LABELS.find((l) => l.day === selectedDayTab)?.name}.
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Los turnos en este día quedarán restringidos en la agenda a menos que la secretaria active una autorización especial.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Blocked Dates / Vacations */}
            <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-300">
              <label className="text-xs font-black uppercase tracking-wider text-[#0F172A] block mb-1.5">
                4. Días no disponibles / Vacaciones / Francos extraordinarios
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="date"
                  value={newBlockedDate}
                  onChange={(e) => setNewBlockedDate(e.target.value)}
                  className="flex-1 text-xs p-2 rounded-lg border-2 border-slate-300 bg-white text-[#0F172A] font-bold outline-none focus:border-[#1E3A8A]"
                />
                <button
                  type="button"
                  onClick={handleAddBlockedDate}
                  className="px-3.5 py-2 bg-[#1E3A8A] hover:bg-blue-900 text-white rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Bloquear</span>
                </button>
              </div>
              {blockedDates.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-white rounded-lg border-2 border-slate-200">
                  {blockedDates.map((d) => (
                    <span
                      key={d}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-100 border border-rose-300 text-rose-900 text-xs font-black"
                    >
                      <span>{d}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBlockedDate(d)}
                        className="hover:text-rose-700 cursor-pointer p-0.5"
                        title="Eliminar bloqueo"
                      >
                        <X className="w-3 h-3 stroke-[3]" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Active Toggle */}
            <div className="pt-1 flex items-center gap-2">
              <input
                type="checkbox"
                id="staffActiveToggle"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 rounded border-2 border-slate-300 text-[#1E3A8A] focus:ring-[#1E3A8A] cursor-pointer"
              />
              <label htmlFor="staffActiveToggle" className="text-xs font-black text-[#0F172A] cursor-pointer">
                Profesional Activo (disponible para agendar turnos en el sistema)
              </label>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 sm:p-5 bg-slate-100 border-t-2 border-slate-300 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-black text-[#0F172A] hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border-2 border-slate-300 bg-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2.5 bg-[#1E3A8A] hover:bg-blue-900 active:scale-98 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? 'Guardando...' : staffToEdit ? 'Guardar Cambios' : 'Crear Profesional'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Conflict Warning Modal: Warns without deleting or moving existing appointments */}
      {showConflictWarning && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border-2 border-amber-300 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-900 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="font-black text-base text-[#0F172A]">
                  Advertencia de Turnos Reservados
                </h4>
                <p className="text-xs text-slate-700 font-bold mt-0.5">
                  Se detectaron {detectedConflicts.length} turno(s) existentes de {name} que quedan fuera del nuevo esquema horario o en días de descanso.
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 font-semibold space-y-1">
              <p className="font-black text-amber-900">
                🛡️ Política de Seguridad de Tu Agenda Lista:
              </p>
              <p>
                Ningún turno será eliminado ni movido automáticamente. Seguirán visibles en la agenda para que la secretaria los gestione o reubique según convenga.
              </p>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {detectedConflicts.map((c, i) => (
                <div
                  key={i}
                  className="p-2.5 bg-white border border-slate-300 rounded-xl text-xs space-y-0.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between font-black text-[#0F172A]">
                    <span>
                      {formatDateSpanish(c.appointment.date)} · {c.appointment.time} hs ({c.appointment.durationMinutes} min)
                    </span>
                    <span className="text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                      {c.appointment.clientName}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] font-medium">{c.reason}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowConflictWarning(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-[#0F172A] hover:bg-slate-100 cursor-pointer"
              >
                Volver a Revisar Horarios
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowConflictWarning(false);
                  await executeSave();
                }}
                className="px-5 py-2 rounded-xl bg-[#1E3A8A] hover:bg-blue-900 text-white text-xs font-black shadow-xs cursor-pointer"
              >
                Entendido, Guardar Manteniendo Turnos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
