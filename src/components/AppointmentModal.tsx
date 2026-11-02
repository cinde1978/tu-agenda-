import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Sparkles,
  DollarSign,
  AlertCircle,
  Check,
  Palette,
  Building2,
  ShieldAlert,
  CheckCircle2,
  Layers,
  Gift,
  Search,
  Phone,
  Mail,
  UserCheck,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';
import {
  Appointment,
  AppointmentStatus,
  PaymentMethod,
  APPOINTMENT_COLORS,
  BranchId,
  Client,
} from '../types';
import { useApp } from '../context/AppContext';
import { getTodayDateString, getBranchBusinessConfig } from '../utils/initialData';
import { MercadoPagoModal } from './mercadopago/MercadoPagoModal';
import { MercadoPagoIcon } from './icons/MercadoPagoIcon';
import {
  checkStaffAvailability,
  getStaffDaySchedule,
  getStaffEffectiveShift,
  getStaffDaySlotsForBooking,
  formatShiftRanges,
  parseDateDayOfWeek,
  timeToMinutes,
  minutesToTime,
  BRANCH_NAMES,
  BRANCH_SHORT_NAMES,
  DAY_LABELS,
} from '../utils/staffSchedule';

interface AppointmentModalProps {
  initialDate?: string;
  initialTime?: string;
  initialStaffId?: string;
  initialClientId?: string;
  initialBranchId?: BranchId;
  appointmentToEdit?: Appointment | null;
  onClose: () => void;
  onSaved: (appointment: Appointment) => void;
}

export function AppointmentModal({
  initialDate,
  initialTime,
  initialStaffId,
  initialClientId,
  initialBranchId,
  appointmentToEdit,
  onClose,
  onSaved,
}: AppointmentModalProps) {
  const {
    business,
    clients,
    services,
    staff,
    appointments,
    allAppointments,
    resources,
    allGiftCards,
    selectedBranch,
    activeSingleBranch,
    branches,
    createAppointment,
    updateAppointment,
    createClient,
    createCashMovement,
  } = useApp();

  const sourceAppointments = useMemo(() => {
    return Array.isArray(allAppointments) ? allAppointments : appointments;
  }, [allAppointments, appointments]);

  const selectableServices = useMemo(() => {
    return services.filter((s) => s.active || s.id === appointmentToEdit?.serviceId);
  }, [services, appointmentToEdit?.serviceId]);

  // Form states
  const [branchId, setBranchId] = useState<BranchId>(
    appointmentToEdit?.branchId || initialBranchId || activeSingleBranch
  );
  const [resourceId, setResourceId] = useState<string>(appointmentToEdit?.resourceId || '');
  const [giftCardCode, setGiftCardCode] = useState<string>(appointmentToEdit?.giftCardCode || '');
  const [giftCardFeedback, setGiftCardFeedback] = useState<string | null>(null);

  // Client Selection State
  const [clientId, setClientId] = useState<string>(
    appointmentToEdit?.clientId || initialClientId || ''
  );
  const [clientName, setClientName] = useState<string>(appointmentToEdit?.clientName || '');
  const [clientPhone, setClientPhone] = useState<string>(appointmentToEdit?.clientPhone || '');
  const [clientSearchTerm, setClientSearchTerm] = useState<string>('');
  const [isNewClientMode, setIsNewClientMode] = useState<boolean>(
    () => !appointmentToEdit && !initialClientId && clients.length === 0
  );

  // Quick new client registration state
  const [newClientName, setNewClientName] = useState<string>('');
  const [newClientPhone, setNewClientPhone] = useState<string>('');
  const [newClientWhatsApp, setNewClientWhatsApp] = useState<string>('');
  const [newClientEmail, setNewClientEmail] = useState<string>('');
  const [newClientNotes, setNewClientNotes] = useState<string>('');

  const [serviceId, setServiceId] = useState<string>(() => {
    if (
      appointmentToEdit?.serviceId &&
      services.some((s) => s.id === appointmentToEdit.serviceId)
    ) {
      return appointmentToEdit.serviceId;
    }
    if (appointmentToEdit) {
      return '__custom__';
    }
    const activeList = services.filter((s) => s.active);
    return activeList[0]?.id || (activeList.length === 0 ? '__custom__' : '');
  });
  const [customServiceName, setCustomServiceName] = useState<string>(() => {
    if (appointmentToEdit && !services.some((s) => s.id === appointmentToEdit.serviceId)) {
      return appointmentToEdit.serviceName || '';
    }
    return '';
  });
  const [staffId, setStaffId] = useState(
    appointmentToEdit?.staffId || initialStaffId || ''
  );

  const [date, setDate] = useState(
    appointmentToEdit?.date || initialDate || getTodayDateString()
  );
  const [time, setTime] = useState(appointmentToEdit?.time || initialTime || '');
  const [durationMinutes, setDurationMinutes] = useState(
    appointmentToEdit?.durationMinutes ||
      services.find((s) => s.active)?.durationMinutes ||
      45
  );

  const [price, setPrice] = useState(appointmentToEdit?.price || 0);
  const [depositAmount, setDepositAmount] = useState(appointmentToEdit?.depositAmount || 0);
  const [color, setColor] = useState(appointmentToEdit?.color || APPOINTMENT_COLORS[0].hex);
  const [status, setStatus] = useState<AppointmentStatus>(
    appointmentToEdit?.status || 'confirmado'
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    appointmentToEdit?.paymentMethod || 'pendiente'
  );
  const [registerDepositInCash, setRegisterDepositInCash] = useState(true);
  const [notes, setNotes] = useState(appointmentToEdit?.notes || '');
  const [showMercadoPagoModal, setShowMercadoPagoModal] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomTimeInput, setShowCustomTimeInput] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Prepopulate client data when clientId is provided
  useEffect(() => {
    if (clientId) {
      const found = clients.find((c) => c.id === clientId);
      if (found) {
        setClientName(found.name);
        setClientPhone(found.phone || found.whatsapp || '');
      }
    }
  }, [clientId, clients]);

  const branchConfig = useMemo(
    () => getBranchBusinessConfig(business, branchId),
    [business, branchId]
  );

  const enabledPaymentMethods = useMemo(() => {
    const allowed = new Set<PaymentMethod>(['pendiente', ...branchConfig.enabledPaymentMethods]);
    if (appointmentToEdit?.paymentMethod) {
      allowed.add(appointmentToEdit.paymentMethod);
    }
    return (
      ['pendiente', 'efectivo', 'transferencia', 'mercadopago', 'tarjeta'] as PaymentMethod[]
    ).filter((m) => allowed.has(m));
  }, [branchConfig.enabledPaymentMethods, appointmentToEdit?.paymentMethod]);

  useEffect(() => {
    if (!enabledPaymentMethods.includes(paymentMethod)) {
      setPaymentMethod('pendiente');
    }
  }, [enabledPaymentMethods, paymentMethod]);

  // Set initial price and duration from first active service when creating if catalog loads
  useEffect(() => {
    if (selectableServices.length > 0 && serviceId !== '__custom__') {
      if (!serviceId || !selectableServices.some((s) => s.id === serviceId)) {
        const firstSrv = selectableServices[0];
        setServiceId(firstSrv.id);
        if (!appointmentToEdit) {
          setPrice(firstSrv.price);
          setDurationMinutes(firstSrv.durationMinutes);
          if (firstSrv.color) setColor(firstSrv.color);
        }
      } else if (!appointmentToEdit && price === 0) {
        const currentSrv = selectableServices.find((s) => s.id === serviceId);
        if (currentSrv) {
          setPrice(currentSrv.price);
          setDurationMinutes(currentSrv.durationMinutes);
          if (currentSrv.color) setColor(currentSrv.color);
        }
      }
    } else if (
      selectableServices.length > 0 &&
      serviceId === '__custom__' &&
      !customServiceName.trim() &&
      !appointmentToEdit
    ) {
      const firstSrv = selectableServices[0];
      setServiceId(firstSrv.id);
      setPrice(firstSrv.price);
      setDurationMinutes(firstSrv.durationMinutes);
      if (firstSrv.color) setColor(firstSrv.color);
    }
  }, [selectableServices, serviceId, customServiceName, appointmentToEdit, price]);

  const handleServiceChange = (id: string) => {
    setErrorMsg('');
    setServiceId(id);
    if (id === '__custom__' || id === '') return;
    const srv = services.find((s) => s.id === id);
    if (srv) {
      setPrice(srv.price);
      setDurationMinutes(srv.durationMinutes);
      if (srv.color) setColor(srv.color);
    }
  };

  // Evaluate each active professional's availability on (date, branchId)
  const dayOfWeek = useMemo(() => (date ? parseDateDayOfWeek(date) : 1), [date]);
  const dayName = DAY_LABELS.find((l) => l.day === dayOfWeek)?.name || 'este día';

  const staffOptionsWithAvailability = useMemo(() => {
    const otherBranch: BranchId = branchId === 'sucursal_1' ? 'sucursal_2' : 'sucursal_1';
    return staff
      .filter((s) => s.active || s.id === appointmentToEdit?.staffId)
      .map((st) => {
        const isBlocked = Boolean(date && st.blockedDates?.includes(date));
        const sched = getStaffDaySchedule(st, dayOfWeek);
        const effCurrent = getStaffEffectiveShift(sched, branchId);
        const effOther = getStaffEffectiveShift(sched, otherBranch);
        const canAttendHere = Boolean(st.active) && !isBlocked && sched.active && effCurrent.active;

        let label = `${st.name} (${st.role})`;
        if (canAttendHere) {
          label = `${st.name} (${st.role}) — ${BRANCH_SHORT_NAMES[branchId]}: ${formatShiftRanges(effCurrent.ranges)}`;
        } else if (isBlocked) {
          label = `${st.name} — No disponible (Fecha bloqueada)`;
        } else if (!sched.active) {
          label = `${st.name} — No disponible (No trabaja los ${dayName})`;
        } else if (effOther.active) {
          label = `${st.name} — No disponible en ${BRANCH_SHORT_NAMES[branchId]} (Atiende en ${BRANCH_SHORT_NAMES[otherBranch]}: ${formatShiftRanges(effOther.ranges)})`;
        } else {
          label = `${st.name} — No disponible`;
        }

        return {
          member: st,
          canAttendHere,
          effCurrent,
          effOther,
          sched,
          isBlocked,
          label,
        };
      });
  }, [staff, date, dayOfWeek, dayName, branchId, appointmentToEdit?.staffId]);

  // Auto-sync branch when an initialStaffId or explicit staff selection only works in the other branch on that date
  const syncBranchWithStaffSchedule = (
    targetStaffId: string,
    targetDate: string,
    targetTime?: string
  ) => {
    if (appointmentToEdit) return;
    const chosenStaff = staff.find((s) => s.id === targetStaffId);
    if (!chosenStaff || !targetDate) return;

    const dow = parseDateDayOfWeek(targetDate);
    const sched = getStaffDaySchedule(chosenStaff, dow);
    if (!sched.active) return;

    const effS1 = getStaffEffectiveShift(sched, 'sucursal_1');
    const effS2 = getStaffEffectiveShift(sched, 'sucursal_2');

    if (effS1.active && effS2.active) {
      const checkT = targetTime || time;
      if (checkT) {
        const curMin = timeToMinutes(checkT);
        if (
          effS1.ranges.some(
            (r) => curMin >= timeToMinutes(r.start) && curMin < timeToMinutes(r.end)
          )
        ) {
          setBranchId('sucursal_1');
        } else if (
          effS2.ranges.some(
            (r) => curMin >= timeToMinutes(r.start) && curMin < timeToMinutes(r.end)
          )
        ) {
          setBranchId('sucursal_2');
        }
      }
    } else if (effS1.active && !effS2.active && !initialBranchId) {
      setBranchId('sucursal_1');
    } else if (!effS1.active && effS2.active && !initialBranchId) {
      setBranchId('sucursal_2');
    }
  };

  // Auto-select first professional on initial open without ever wiping user's chosen professional on non-working days
  useEffect(() => {
    if (appointmentToEdit) return;
    if (staffId && staff.some((s) => s.id === staffId)) {
      return;
    }

    if (initialStaffId && staff.some((s) => s.id === initialStaffId)) {
      setStaffId(initialStaffId);
      syncBranchWithStaffSchedule(initialStaffId, date, initialTime);
      return;
    }

    const firstAvailable = staffOptionsWithAvailability.find((o) => o.canAttendHere);
    if (firstAvailable) {
      setStaffId(firstAvailable.member.id);
    } else if (staffOptionsWithAvailability.length > 0) {
      setStaffId(staffOptionsWithAvailability[0].member.id);
    }
  }, [staffOptionsWithAvailability, appointmentToEdit, initialStaffId, staff, staffId]);

  const handleStaffChange = (newStaffId: string) => {
    setErrorMsg('');
    setStaffId(newStaffId);
    syncBranchWithStaffSchedule(newStaffId, date, time);
  };

  const handleDateChange = (newDate: string) => {
    setErrorMsg('');
    setDate(newDate);
    if (staffId) {
      syncBranchWithStaffSchedule(staffId, newDate, time);
    }
  };

  const handleBranchButtonClick = (nextBranch: BranchId) => {
    setErrorMsg('');
    setBranchId(nextBranch);
  };

  const handleClientSelect = (client: Client) => {
    setClientId(client.id);
    setClientName(client.name);
    setClientPhone(client.phone || client.whatsapp || '');
    setClientSearchTerm('');
    setIsNewClientMode(false);
  };

  const handleClearSelectedClient = () => {
    setClientId('');
    setClientName('');
    setClientPhone('');
    setClientSearchTerm('');
  };

  const remainingBalance = Math.max(0, price - depositAmount);

  const availableResources = useMemo(() => {
    return resources.filter(
      (r) => r.active && (r.branchId === 'ambas' || r.branchId === branchId)
    );
  }, [resources, branchId]);

  const handleApplyGiftCard = () => {
    if (!giftCardCode.trim()) {
      setGiftCardFeedback('Ingresá un código de voucher.');
      return;
    }
    const clean = giftCardCode.trim().toUpperCase();
    const found = allGiftCards.find((c) => c.code.trim().toUpperCase() === clean);

    if (!found) {
      setGiftCardFeedback(`No se encontró el voucher "${clean}".`);
      return;
    }

    if (found.status === 'canjeada') {
      setGiftCardFeedback(`¡Voucher ya canjeado el ${found.redeemedDate}!`);
      return;
    }

    if (found.type === 'tratamiento') {
      if (found.serviceId) {
        setServiceId(found.serviceId);
        const srv = services.find((s) => s.id === found.serviceId);
        if (srv) {
          setPrice(srv.price);
          setDurationMinutes(srv.durationMinutes);
          setDepositAmount(srv.price);
        }
      }
      setGiftCardFeedback(`✓ Voucher válido por: ${found.serviceName || 'Tratamiento'} (Cubierto)`);
    } else {
      const discount = found.amount || 0;
      setDepositAmount(Math.min(price, discount));
      setGiftCardFeedback(`✓ Voucher válido por $${discount} aplicado.`);
    }
  };

  const selectedStaff = staff.find((s) => s.id === staffId) || null;
  const selectedStaffSchedule = useMemo(() => {
    if (!selectedStaff || !date) return null;
    return getStaffDaySchedule(selectedStaff, dayOfWeek);
  }, [selectedStaff, date, dayOfWeek]);

  const effectiveStaffShift = useMemo(() => {
    if (!selectedStaffSchedule) return null;
    return getStaffEffectiveShift(selectedStaffSchedule, branchId);
  }, [selectedStaffSchedule, branchId]);

  // Generate BOTH occupied and available slot candidates inside all active ranges of this professional
  const bookingSlotCandidates = useMemo(() => {
    if (!selectedStaff || !date) return [];
    return getStaffDaySlotsForBooking(
      selectedStaff,
      date,
      Number(durationMinutes || 30),
      branchId,
      sourceAppointments,
      appointmentToEdit?.id
    );
  }, [
    selectedStaff,
    date,
    durationMinutes,
    branchId,
    sourceAppointments,
    appointmentToEdit?.id,
  ]);

  const availableSlotCandidates = useMemo(
    () => bookingSlotCandidates.filter((c) => c.available),
    [bookingSlotCandidates]
  );

  // Group candidates by rangeLabel so multiple ranges on the same day (e.g. Thursday 09:00-12:00 & 15:00-19:00) display clearly
  const groupedCandidatesByRange = useMemo(() => {
    const map = new Map<string, typeof bookingSlotCandidates>();
    for (const c of bookingSlotCandidates) {
      const list = map.get(c.rangeLabel) || [];
      list.push(c);
      map.set(c.rangeLabel, list);
    }
    return Array.from(map.entries());
  }, [bookingSlotCandidates]);

  // Check strict availability of currently chosen time + real service duration
  const staffAvailability = useMemo(() => {
    if (!selectedStaff) {
      return {
        available: false,
        reason: 'day_off' as const,
        message: 'Debes seleccionar un profesional disponible para esta fecha y sucursal.',
      };
    }
    if (!date || !time) {
      return {
        available: false,
        reason: 'outside_hours' as const,
        message: 'Selecciona un horario disponible.',
      };
    }
    return checkStaffAvailability(
      selectedStaff,
      date,
      time,
      Number(durationMinutes || 30),
      branchId,
      sourceAppointments,
      appointmentToEdit?.id
    );
  }, [
    selectedStaff,
    date,
    time,
    durationMinutes,
    branchId,
    sourceAppointments,
    appointmentToEdit?.id,
  ]);

  // Snap time to first available slot when creating a new turn if current time is empty or invalid
  useEffect(() => {
    if (appointmentToEdit) return;
    if (showCustomTimeInput) return;
    if (time && staffAvailability.available) return;
    if (availableSlotCandidates.length > 0) {
      setTime(availableSlotCandidates[0].time);
    } else if (!initialTime || date !== initialDate) {
      setTime('');
    }
  }, [
    availableSlotCandidates,
    appointmentToEdit,
    showCustomTimeInput,
    staffAvailability.available,
    time,
    initialTime,
    initialDate,
    date,
  ]);

  // Find next working day & branch for selectedStaff when current date has no shift
  const nextWorkingOption = useMemo(() => {
    if (!selectedStaff) return null;
    const baseStr = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : getTodayDateString();
    const [by, bm, bd] = baseStr.split('-').map(Number);
    for (let offset = 1; offset <= 14; offset++) {
      const candidate = new Date(by, bm - 1, bd + offset);
      const cy = candidate.getFullYear();
      const cm = String(candidate.getMonth() + 1).padStart(2, '0');
      const cd = String(candidate.getDate()).padStart(2, '0');
      const candStr = `${cy}-${cm}-${cd}`;
      if (selectedStaff.blockedDates?.includes(candStr)) continue;
      const candDow = candidate.getDay();
      const candSched = getStaffDaySchedule(selectedStaff, candDow);
      if (!candSched.active) continue;
      const effPreferred = getStaffEffectiveShift(candSched, branchId);
      const otherBr: BranchId = branchId === 'sucursal_1' ? 'sucursal_2' : 'sucursal_1';
      const effAlt = getStaffEffectiveShift(candSched, otherBr);
      const targetBr = effPreferred.active ? branchId : effAlt.active ? otherBr : null;
      const targetEff = effPreferred.active ? effPreferred : effAlt;
      if (targetBr && targetEff.active) {
        const dName = DAY_LABELS.find((l) => l.day === candDow)?.name || candStr;
        return {
          dateStr: candStr,
          branchId: targetBr,
          label: `${dName} ${cd}/${cm} en ${BRANCH_NAMES[targetBr]} (${formatShiftRanges(targetEff.ranges)} hs)`,
        };
      }
    }
    return null;
  }, [selectedStaff, date, branchId]);

  // Cross-branch same-staff overlap check
  const curStart = time ? timeToMinutes(time) : 0;
  const curEnd = curStart + Number(durationMinutes || 30);

  const overlappingAppointmentsSameStaff = useMemo(() => {
    if (!staffId || !date || !time) return [];
    return sourceAppointments.filter((apt) => {
      if (appointmentToEdit && apt.id === appointmentToEdit.id) return false;
      if (apt.date !== date || apt.staffId !== staffId || apt.status === 'cancelado') {
        return false;
      }
      const aptStart = timeToMinutes(apt.time);
      const aptEnd = aptStart + (apt.durationMinutes || 30);
      return Math.max(aptStart, curStart) < Math.min(aptEnd, curEnd);
    });
  }, [sourceAppointments, appointmentToEdit, date, staffId, time, curStart, curEnd]);

  const hasConflictSameStaff = overlappingAppointmentsSameStaff.length > 0;

  // Resource / cabin collision check
  const overlappingResourceApt = useMemo(() => {
    if (!resourceId || !date || !time) return null;
    return (
      sourceAppointments.find((a) => {
        if (a.id === appointmentToEdit?.id) return false;
        if (a.status === 'cancelado') return false;
        if (a.date !== date) return false;
        if (a.resourceId !== resourceId) return false;

        const aStart = timeToMinutes(a.time);
        const aEnd = aStart + (a.durationMinutes || 30);
        return Math.max(aStart, curStart) < Math.min(aEnd, curEnd);
      }) || null
    );
  }, [resourceId, date, time, sourceAppointments, appointmentToEdit?.id, curStart, curEnd]);

  // Filter clients for search
  const filteredClients = useMemo(() => {
    if (!clientSearchTerm.trim()) {
      return clients.slice(0, 8);
    }
    const term = clientSearchTerm.toLowerCase().trim();
    return clients
      .filter((c) => {
        const phoneWa = `${c.phone || ''} ${c.whatsapp || ''}`.toLowerCase();
        return (
          c.name.toLowerCase().includes(term) ||
          phoneWa.includes(term) ||
          (c.email && c.email.toLowerCase().includes(term))
        );
      })
      .slice(0, 10);
  }, [clients, clientSearchTerm]);

  const duplicateMatch = useMemo(() => {
    if (!isNewClientMode) return null;
    const nameTrim = newClientName.trim().toLowerCase();
    const phoneDigits = newClientPhone.replace(/\D/g, '');
    const waDigits = newClientWhatsApp.replace(/\D/g, '');

    if (!nameTrim && !phoneDigits && !waDigits) return null;

    return clients.find((c) => {
      if (nameTrim && c.name.trim().toLowerCase() === nameTrim) return true;
      if (phoneDigits && phoneDigits.length >= 6) {
        const cPhone = (c.phone || '').replace(/\D/g, '');
        const cWa = (c.whatsapp || '').replace(/\D/g, '');
        if (cPhone === phoneDigits || cWa === phoneDigits) return true;
      }
      if (waDigits && waDigits.length >= 6) {
        const cPhone = (c.phone || '').replace(/\D/g, '');
        const cWa = (c.whatsapp || '').replace(/\D/g, '');
        if (cPhone === waDigits || cWa === waDigits) return true;
      }
      return false;
    });
  }, [isNewClientMode, newClientName, newClientPhone, newClientWhatsApp, clients]);

  const hasValidClient = isNewClientMode
    ? Boolean(newClientName.trim())
    : Boolean(clientId || clientName.trim());

  const resolvedServiceName = useMemo(() => {
    if (serviceId && serviceId !== '__custom__') {
      const found = services.find((s) => s.id === serviceId);
      return found?.name || '';
    }
    return customServiceName.trim();
  }, [serviceId, services, customServiceName]);

  const hasValidService = Boolean(resolvedServiceName);

  const missingMandatoryFields = useMemo(() => {
    const missing: string[] = [];
    if (!hasValidClient) missing.push('Cliente');
    if (!branchId) missing.push('Sucursal');
    if (!selectedStaff) missing.push('Profesional');
    if (!hasValidService) missing.push('Servicio');
    if (!date) missing.push('Fecha');
    if (!time) missing.push('Horario');
    return missing;
  }, [hasValidClient, branchId, selectedStaff, hasValidService, date, time]);

  const scheduleConflictSummary = useMemo(() => {
    if (status === 'cancelado') return null;
    if (missingMandatoryFields.length > 0) return null;
    if (!staffAvailability.available) {
      return (
        staffAvailability.message ||
        'El horario elegido está fuera de la jornada laboral o en pausa.'
      );
    }
    if (hasConflictSameStaff) {
      const conflict = overlappingAppointmentsSameStaff[0];
      const conflictBranchName =
        conflict?.branchId === 'sucursal_2' ? 'Soham Rioja' : 'Soham Montevideo';
      return `Superposición de turnos: ${selectedStaff?.name} ya tiene ocupado el horario de ${conflict?.time} hs en ${conflictBranchName} con ${conflict?.clientName}.`;
    }
    if (overlappingResourceApt) {
      const selectedResource = resources.find((r) => r.id === resourceId);
      return `Conflicto de cabina/equipo: "${selectedResource?.name || 'El espacio'}" ya está reservado a las ${overlappingResourceApt.time} hs.`;
    }
    return null;
  }, [
    status,
    missingMandatoryFields.length,
    staffAvailability,
    hasConflictSameStaff,
    overlappingAppointmentsSameStaff,
    selectedStaff,
    overlappingResourceApt,
    resources,
    resourceId,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (missingMandatoryFields.length > 0) {
      const extraHint =
        !selectedStaff && staff.length === 0
          ? ' (Primero debés cargar al menos un profesional con sus horarios en la sección Profesionales).'
          : '';
      setErrorMsg(
        `Faltan completar datos obligatorios: ${missingMandatoryFields.join(', ')}.${extraHint}`
      );
      return;
    }

    let finalClientId = clientId;
    let finalClientName = clientName.trim();
    let finalClientPhone = clientPhone.trim();

    // Strict availability, real duration, non-working day, branch, pause, and overlap enforcement BEFORE creating client
    if (status !== 'cancelado') {
      if (!selectedStaff) {
        setErrorMsg('Debes seleccionar un profesional válido.');
        return;
      }

      if (!staffAvailability.available) {
        setErrorMsg(
          staffAvailability.message ||
            'No se permite reservar fuera del horario laboral o en un día marcado como No trabaja.'
        );
        return;
      }

      if (hasConflictSameStaff) {
        const conflict = overlappingAppointmentsSameStaff[0];
        const conflictBranchName =
          conflict?.branchId === 'sucursal_2' ? 'Soham Rioja' : 'Soham Montevideo';
        setErrorMsg(
          `Superposición de turnos: ${selectedStaff.name} ya tiene reservado el horario de ${conflict?.time} hs en ${conflictBranchName} con ${conflict?.clientName}.`
        );
        return;
      }

      if (overlappingResourceApt) {
        const selectedResource = resources.find((r) => r.id === resourceId);
        setErrorMsg(
          `Conflicto de cabina/equipo: "${selectedResource?.name || 'El espacio'}" ya está ocupado a las ${overlappingResourceApt.time} hs con ${overlappingResourceApt.clientName}.`
        );
        return;
      }
    }

    if (!selectedStaff) {
      setErrorMsg('Debes seleccionar un profesional.');
      return;
    }

    if (isNewClientMode) {
      if (!newClientName.trim()) {
        setErrorMsg('Falta completar dato obligatorio: Cliente (Nombre y Apellido).');
        return;
      }
      try {
        finalClientId = await createClient({
          name: newClientName.trim(),
          phone: newClientPhone.trim(),
          whatsapp: newClientWhatsApp.trim() || newClientPhone.trim(),
          email: newClientEmail.trim(),
          notes: newClientNotes.trim(),
        });
        finalClientName = newClientName.trim();
        finalClientPhone = newClientPhone.trim() || newClientWhatsApp.trim();
      } catch (err: any) {
        setErrorMsg(err.message || 'Error al registrar el cliente');
        return;
      }
    }

    if (!finalClientName) {
      setErrorMsg('Falta completar dato obligatorio: Cliente.');
      return;
    }

    setIsSubmitting(true);
    try {
      const srvObj =
        serviceId && serviceId !== '__custom__'
          ? services.find((s) => s.id === serviceId)
          : undefined;
      const finalServiceId = srvObj ? srvObj.id : 'personalizado';
      const finalServiceName = srvObj ? srvObj.name : resolvedServiceName || 'Servicio general';
      const resObj = resources.find((r) => r.id === resourceId);

      if (appointmentToEdit) {
        const updated: Appointment = {
          ...appointmentToEdit,
          clientId: finalClientId,
          clientName: finalClientName,
          clientPhone: finalClientPhone,
          serviceId: finalServiceId,
          serviceName: finalServiceName,
          staffId: selectedStaff.id,
          staffName: selectedStaff.name,
          branchId,
          resourceId: resourceId || undefined,
          resourceName: resObj ? resObj.name : undefined,
          giftCardCode: giftCardCode.trim() || undefined,
          date,
          time,
          durationMinutes: Number(durationMinutes),
          price: Number(price),
          depositAmount: Number(depositAmount),
          remainingBalance,
          color,
          status,
          paymentMethod,
          notes,
          updatedAt: getTodayDateString(),
        };
        await updateAppointment(updated);
        setSuccessMessage('✓ Turno actualizado con éxito');
        setTimeout(() => {
          onSaved(updated);
          onClose();
        }, 250);
      } else {
        const newId = await createAppointment({
          clientId: finalClientId,
          clientName: finalClientName,
          clientPhone: finalClientPhone,
          serviceId: finalServiceId,
          serviceName: finalServiceName,
          staffId: selectedStaff.id,
          staffName: selectedStaff.name,
          branchId,
          resourceId: resourceId || undefined,
          resourceName: resObj ? resObj.name : undefined,
          giftCardCode: giftCardCode.trim() || undefined,
          date,
          time,
          durationMinutes: Number(durationMinutes),
          price: Number(price),
          depositAmount: Number(depositAmount),
          remainingBalance,
          color,
          status,
          paymentMethod,
          notes,
        });

        if (registerDepositInCash && depositAmount > 0) {
          await createCashMovement({
            date,
            branchId,
            type: 'ingreso',
            category: 'seña',
            amount: Number(depositAmount),
            paymentMethod: paymentMethod === 'pendiente' ? 'efectivo' : paymentMethod,
            description: `[${
              branchId === 'sucursal_2' ? 'Soham Rioja' : 'Soham Montevideo'
            }] Seña para turno de ${finalClientName} (${finalServiceName})`,
            appointmentId: newId,
          });
        }

        const createdApt: Appointment = {
          id: newId,
          businessId: '',
          clientId: finalClientId,
          clientName: finalClientName,
          clientPhone: finalClientPhone,
          serviceId: finalServiceId,
          serviceName: finalServiceName,
          staffId: selectedStaff.id,
          staffName: selectedStaff.name,
          branchId,
          resourceId: resourceId || undefined,
          resourceName: resObj ? resObj.name : undefined,
          giftCardCode: giftCardCode.trim() || undefined,
          date,
          time,
          durationMinutes: Number(durationMinutes),
          price: Number(price),
          depositAmount: Number(depositAmount),
          remainingBalance,
          color,
          status,
          paymentMethod,
          notes,
          createdAt: getTodayDateString(),
          updatedAt: getTodayDateString(),
        };

        setSuccessMessage('✓ Turno guardado con éxito');
        setTimeout(() => {
          onSaved(createdApt);
          onClose();
        }, 250);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al guardar el turno');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedClient = clients.find((c) => c.id === clientId);
  const s1ShiftForSelected = selectedStaffSchedule
    ? getStaffEffectiveShift(selectedStaffSchedule, 'sucursal_1')
    : null;
  const s2ShiftForSelected = selectedStaffSchedule
    ? getStaffEffectiveShift(selectedStaffSchedule, 'sucursal_2')
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-300 w-full max-w-xl max-h-[92vh] overflow-y-auto flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#1E3A8A] p-4 sm:p-5 text-white flex items-center justify-between shrink-0 border-b border-blue-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg">
                {appointmentToEdit ? 'Editar Turno' : 'Agendar Turno'}
              </h3>
              <p className="text-blue-100 text-xs font-medium">
                Disponibilidad real por día, sucursal y duración del servicio
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          id="appointment-form"
          noValidate
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-[#0F172A]"
        >
          {successMessage && (
            <div className="p-3 bg-emerald-50 border-2 border-emerald-400 text-emerald-950 text-xs rounded-xl flex items-center gap-2 font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
              <span>{successMessage}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border-2 border-rose-400 text-rose-900 text-xs rounded-xl flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* PASO 1: SELECCIÓN DE CLIENTE                              */}
          {/* ========================================================= */}
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-300 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#1E3A8A]" />
                <span>Paso 1: Cliente</span>
              </label>
              {!isNewClientMode && (
                <button
                  type="button"
                  onClick={() => {
                    setIsNewClientMode(true);
                    setNewClientName(clientSearchTerm);
                    setNewClientPhone('');
                    setNewClientWhatsApp('');
                    setNewClientEmail('');
                    setNewClientNotes('');
                  }}
                  className="text-xs font-black text-[#1E3A8A] hover:text-blue-900 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ O registrar cliente nuevo</span>
                </button>
              )}
            </div>

            {!isNewClientMode && (clientId || (clientName && appointmentToEdit)) ? (
              <div className="bg-white p-3.5 rounded-xl border-2 border-blue-400 shadow-2xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center font-black text-sm shrink-0">
                    {(clientName || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm truncate">
                        {clientName}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-[#1E3A8A] shrink-0">
                        ✓ Seleccionado
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600 mt-0.5 flex-wrap">
                      {(clientPhone || selectedClient?.phone) && (
                        <span className="flex items-center gap-1 font-bold">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{clientPhone || selectedClient?.phone}</span>
                        </span>
                      )}
                      {selectedClient?.email && (
                        <span className="flex items-center gap-1 text-slate-500 truncate">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{selectedClient.email}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClearSelectedClient}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-black shrink-0 transition-colors cursor-pointer"
                >
                  Cambiar
                </button>
              </div>
            ) : !isNewClientMode ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Buscar cliente por nombre, teléfono o WhatsApp..."
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                    className="w-full text-xs font-bold pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none text-[#0F172A] placeholder-slate-400"
                    autoFocus={!appointmentToEdit}
                  />
                  {clientSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setClientSearchTerm('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="max-h-44 overflow-y-auto rounded-xl border-2 border-slate-200 bg-white divide-y divide-slate-100">
                  {filteredClients.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-xs text-slate-600 font-bold">
                        {clients.length === 0
                          ? 'Aún no hay clientes registrados.'
                          : `No se encontró ningún cliente con "${clientSearchTerm}".`}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewClientMode(true);
                          setNewClientName(clientSearchTerm);
                          setNewClientPhone('');
                          setNewClientWhatsApp('');
                          setNewClientEmail('');
                          setNewClientNotes('');
                        }}
                        className="mt-2 text-xs font-black text-[#1E3A8A] hover:underline cursor-pointer inline-flex items-center gap-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Registrar cliente nuevo</span>
                      </button>
                    </div>
                  ) : (
                    filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleClientSelect(c)}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50/70 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#1E3A8A] flex items-center justify-center font-black text-xs shrink-0 group-hover:bg-[#1E3A8A] group-hover:text-white transition-colors">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-[#0F172A] truncate group-hover:text-[#1E3A8A]">
                              {c.name}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium truncate">
                              {c.phone || c.whatsapp || 'Sin teléfono'}{' '}
                              {c.email ? `· ${c.email}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] font-black text-[#1E3A8A] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          Seleccionar →
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white p-3.5 rounded-xl border-2 border-blue-400 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-black text-[#1E3A8A] flex items-center gap-1">
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Alta de cliente nuevo para este turno</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsNewClientMode(false)}
                    className="text-xs font-black text-slate-600 hover:text-slate-900 cursor-pointer hover:underline"
                  >
                    Volver a seleccionar existente
                  </button>
                </div>

                {duplicateMatch && (
                  <div className="p-2.5 bg-amber-50 border-2 border-amber-400 rounded-xl text-amber-950 text-xs font-bold flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span>
                        Ya existe registrado: <strong>{duplicateMatch.name}</strong> (
                        {duplicateMatch.phone || duplicateMatch.whatsapp}).
                      </span>
                      <button
                        type="button"
                        onClick={() => handleClientSelect(duplicateMatch)}
                        className="block mt-1 font-black text-[#1E3A8A] hover:underline cursor-pointer"
                      >
                        Seleccionar {duplicateMatch.name} existente →
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-800 block mb-0.5">
                      Nombre y Apellido *
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Valentina Morán"
                      value={newClientName}
                      onChange={(e) => {
                        setErrorMsg('');
                        setNewClientName(e.target.value);
                      }}
                      className="w-full text-xs font-bold p-2 rounded-lg border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-800 block mb-0.5">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      placeholder="Teléfono de contacto (opcional)"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      className="w-full text-xs font-bold p-2 rounded-lg border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none text-[#0F172A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[11px] font-bold text-slate-800">WhatsApp</label>
                      {newClientPhone && (
                        <button
                          type="button"
                          onClick={() => setNewClientWhatsApp(newClientPhone)}
                          className="text-[10px] font-bold text-[#1E3A8A] hover:underline cursor-pointer"
                        >
                          Copiar de teléfono
                        </button>
                      )}
                    </div>
                    <input
                      type="tel"
                      placeholder="WhatsApp (opcional)"
                      value={newClientWhatsApp}
                      onChange={(e) => setNewClientWhatsApp(e.target.value)}
                      className="w-full text-xs font-bold p-2 rounded-lg border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-800 block mb-0.5">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      placeholder="Correo electrónico (opcional)"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      className="w-full text-xs font-bold p-2 rounded-lg border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none text-[#0F172A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-800 block mb-0.5">
                    Observaciones
                  </label>
                  <input
                    type="text"
                    placeholder="Preferencias o alergias..."
                    value={newClientNotes}
                    onChange={(e) => setNewClientNotes(e.target.value)}
                    className="w-full text-xs font-bold p-2 rounded-lg border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none text-[#0F172A]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* PASO 2: SUCURSAL Y FECHA                                  */}
          {/* ========================================================= */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label className="text-xs font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#1E3A8A]" />
                  <span>Paso 2: Sucursal asignada</span>
                </label>
                {selectedStaff && selectedStaffSchedule && (
                  <span className="text-[10px] font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {dayName}: Montevideo (
                    {s1ShiftForSelected?.active
                      ? formatShiftRanges(s1ShiftForSelected.ranges)
                      : 'No atiende'}
                    ) · Rioja (
                    {s2ShiftForSelected?.active
                      ? formatShiftRanges(s2ShiftForSelected.ranges)
                      : 'No atiende'}
                    )
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {branches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleBranchButtonClick(b.id)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all border-2 text-center cursor-pointer ${
                      branchId === b.id
                        ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white shadow-xs scale-[1.01]'
                        : 'bg-white border-slate-300 text-[#0F172A] hover:bg-slate-100 hover:border-slate-500'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* PASO 3 & 4: PROFESIONAL Y SERVICIO                        */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5 mb-1">
                <UserCheck className="w-4 h-4 text-[#1E3A8A]" />
                <span>Paso 3: Profesional *</span>
              </label>
              <select
                value={staffId}
                onChange={(e) => handleStaffChange(e.target.value)}
                className="w-full text-xs font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none text-[#0F172A]"
              >
                {staffOptionsWithAvailability.length === 0 ? (
                  <option value="">-- Sin profesionales cargados aún --</option>
                ) : (
                  <>
                    <option value="">-- Seleccionar profesional --</option>
                    {staffOptionsWithAvailability.map((opt) => (
                      <option
                        key={opt.member.id}
                        value={opt.member.id}
                      >
                        {opt.label}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5 mb-1">
                <Sparkles className="w-4 h-4 text-[#1E3A8A]" />
                <span>Paso 4: Servicio *</span>
              </label>
              <select
                value={serviceId}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full text-xs font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none text-[#0F172A]"
              >
                {selectableServices.length > 0 && (
                  <option value="">-- Seleccionar servicio --</option>
                )}
                {selectableServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationMinutes} min - {business?.currency || '$'} {s.price})
                  </option>
                ))}
                <option value="__custom__">
                  {selectableServices.length === 0
                    ? 'Ingresar servicio manualmente'
                    : '+ Otro servicio / Personalizado'}
                </option>
              </select>

              {(selectableServices.length === 0 || serviceId === '__custom__') && (
                <input
                  type="text"
                  placeholder="Nombre del servicio (Ej. Masaje relajante, Limpieza facial)..."
                  value={customServiceName}
                  onChange={(e) => {
                    setErrorMsg('');
                    setCustomServiceName(e.target.value);
                  }}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none text-[#0F172A]"
                />
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* PASO 5: FECHA, DURACIÓN REAL, OCUPADOS Y DISPONIBLES      */}
          {/* ========================================================= */}
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-300 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#1E3A8A]" />
                <span>Paso 5: Fecha, Duración y Disponibilidad</span>
              </label>
              <button
                type="button"
                onClick={() => setShowCustomTimeInput(!showCustomTimeInput)}
                className="text-[11px] font-black text-[#1E3A8A] hover:underline cursor-pointer"
              >
                {showCustomTimeInput
                  ? 'Ver grilla de turnos ocupados y libres'
                  : 'Elegir minuto exacto dentro del horario'}
              </button>
            </div>

            {/* Date and Real Service Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-800 block mb-1">
                  Fecha del Turno ({dayName})
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-800 block mb-1">
                  Duración real del servicio (min)
                </label>
                <input
                  type="number"
                  step="5"
                  min="5"
                  max="480"
                  required
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                />
              </div>
            </div>

            {/* Slot Grid: Clearly displays Occupied Appointments AND Available Spaces */}
            {!selectedStaff ? (
              <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl text-xs text-amber-950 font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black block">
                    {staff.length === 0
                      ? 'Todavía no hay profesionales cargados en el sistema.'
                      : 'Seleccioná un profesional en el Paso 3 para ver sus horarios disponibles.'}
                  </span>
                  <span className="text-[11px] text-amber-900">
                    {staff.length === 0
                      ? 'Cargá primero al profesional y sus horarios en la sección Profesionales para reservar turnos.'
                      : 'Podés elegir cualquier profesional activo y ajustar la fecha o sucursal.'}
                  </span>
                </div>
              </div>
            ) : selectedStaff.blockedDates?.includes(date) || (effectiveStaffShift && !effectiveStaffShift.active) ? (
              <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-950 font-bold space-y-1.5">
                    <p>
                      {selectedStaff.blockedDates?.includes(date)
                        ? `${selectedStaff.name} tiene la fecha ${date} bloqueada.`
                        : !selectedStaffSchedule?.active
                        ? `${selectedStaff.name} no trabaja los días ${dayName} (marcado como No trabaja). No se permiten turnos este día.`
                        : `${selectedStaff.name} no atiende en ${BRANCH_NAMES[branchId]} los días ${dayName}.`}
                    </p>
                    {branchId === 'sucursal_1' && s2ShiftForSelected?.active && (
                      <button
                        type="button"
                        onClick={() => handleBranchButtonClick('sucursal_2')}
                        className="font-black text-[#1E3A8A] hover:underline cursor-pointer block"
                      >
                        → Cambiar a Soham Rioja (atiende {formatShiftRanges(s2ShiftForSelected.ranges)}{' '}
                        hs)
                      </button>
                    )}
                    {branchId === 'sucursal_2' && s1ShiftForSelected?.active && (
                      <button
                        type="button"
                        onClick={() => handleBranchButtonClick('sucursal_1')}
                        className="font-black text-[#1E3A8A] hover:underline cursor-pointer block"
                      >
                        → Cambiar a Soham Montevideo (atiende{' '}
                        {formatShiftRanges(s1ShiftForSelected.ranges)} hs)
                      </button>
                    )}
                    {nextWorkingOption && (
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg('');
                          setBranchId(nextWorkingOption.branchId);
                          setDate(nextWorkingOption.dateStr);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#1E3A8A] text-white text-[11px] font-black cursor-pointer hover:bg-blue-900 inline-block"
                      >
                        → Ir al próximo día disponible: {nextWorkingOption.label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : !showCustomTimeInput ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] font-black text-slate-700">
                    Espacios de {durationMinutes} min para {selectedStaff.name} en{' '}
                    {BRANCH_NAMES[branchId]}:
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] font-black">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {availableSlotCandidates.length} libres
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300">
                      {
                        bookingSlotCandidates.filter((c) => c.status === 'occupied').length
                      }{' '}
                      ocupados
                    </span>
                  </div>
                </div>

                {groupedCandidatesByRange.map(([rangeLabel, candidates]) => (
                  <div key={rangeLabel} className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#1E3A8A] block">
                      Franja horaria: {rangeLabel} hs
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {candidates.map((cand) => {
                        const isSelected = cand.available && time === cand.time;

                        if (cand.available) {
                          return (
                            <button
                              key={`${rangeLabel}_${cand.time}`}
                              type="button"
                              onClick={() => setTime(cand.time)}
                              title={`Espacio disponible: ${cand.time} a ${cand.endTime} hs`}
                              className={`py-2 px-2 text-xs rounded-xl font-black text-center transition-all border-2 cursor-pointer flex flex-col items-center ${
                                isSelected
                                  ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white shadow-md ring-2 ring-blue-300'
                                  : 'bg-white border-emerald-400 text-slate-900 hover:border-[#1E3A8A] hover:bg-emerald-50/60'
                              }`}
                            >
                              <span>{cand.time}</span>
                              <span
                                className={`text-[9px] font-bold ${
                                  isSelected ? 'text-blue-100' : 'text-emerald-700'
                                }`}
                              >
                                Libre ({cand.endTime})
                              </span>
                            </button>
                          );
                        }

                        const unavailableStyle =
                          cand.status === 'occupied'
                            ? 'bg-rose-50 border-rose-300 text-rose-900'
                            : cand.status === 'in_break'
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : 'bg-slate-100 border-slate-200 text-slate-400';

                        return (
                          <div
                            key={`${rangeLabel}_${cand.time}`}
                            title={cand.reasonLabel}
                            className={`py-2 px-1.5 text-xs rounded-xl font-bold text-center border cursor-not-allowed flex flex-col items-center select-none ${unavailableStyle}`}
                          >
                            <span className="line-through">{cand.time}</span>
                            <span className="text-[8.5px] truncate max-w-full">
                              {cand.status === 'occupied'
                                ? 'Ocupado'
                                : cand.status === 'in_break'
                                ? 'Pausa'
                                : 'No cabe'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Custom minute input strictly validated against working hours */
              <div className="p-3 bg-white rounded-xl border-2 border-blue-400 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Hora exacta (dentro de{' '}
                    {effectiveStaffShift ? formatShiftRanges(effectiveStaffShift.ranges) : ''}{' '}
                    hs)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCustomTimeInput(false)}
                    className="text-[11px] font-bold text-[#1E3A8A] hover:underline cursor-pointer"
                  >
                    Ver grilla
                  </button>
                </div>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full text-sm font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                />
              </div>
            )}

            {/* Strict Availability & Overlap Validation Alerts */}
            {selectedStaff && time && !staffAvailability.available && (
              <div className="p-3 bg-rose-50 border-2 border-rose-400 rounded-xl text-rose-950 text-xs font-bold flex items-start gap-2 shadow-2xs">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-700 mt-0.5" />
                <div>
                  <span className="font-black text-rose-900 block mb-0.5">
                    Reserva bloqueada por horario / disponibilidad:
                  </span>
                  <span>{staffAvailability.message}</span>
                </div>
              </div>
            )}

            {hasConflictSameStaff && (
              <div className="p-3 bg-rose-50 border-2 border-rose-400 rounded-xl text-rose-950 text-xs font-bold flex items-start gap-2 shadow-2xs">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-700 mt-0.5" />
                <div>
                  <span className="font-black text-rose-900 block mb-0.5">
                    Superposición no permitida para {selectedStaff?.name}:
                  </span>
                  <span>
                    Ya tiene ocupado el horario de {overlappingAppointmentsSameStaff[0]?.time} hs
                    en{' '}
                    {overlappingAppointmentsSameStaff[0]?.branchId === 'sucursal_2'
                      ? 'Soham Rioja'
                      : 'Soham Montevideo'}{' '}
                    con {overlappingAppointmentsSameStaff[0]?.clientName}.
                  </span>
                </div>
              </div>
            )}

            {overlappingResourceApt && (
              <div className="p-3 bg-rose-50 border-2 border-rose-400 rounded-xl text-rose-950 text-xs font-bold flex items-start gap-2 shadow-2xs">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-700 mt-0.5" />
                <div>
                  <span className="font-black text-rose-900 block mb-0.5">
                    Cabina / equipo ocupado:
                  </span>
                  <span>
                    Ya está reservado a las {overlappingResourceApt.time} hs con{' '}
                    {overlappingResourceApt.clientName}.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* PASO 6: PRECIOS, SEÑA Y SALDO                             */}
          {/* ========================================================= */}
          <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-300 space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#1E3A8A]" />
              <span>Paso 6: Precios y Seña</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">
                  Precio Total ({business?.currency || '$'})
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full text-sm font-black p-2 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">
                  Seña Abonada ({business?.currency || '$'})
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full text-sm font-black p-2 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-[#0F172A] font-black block mb-1">
                  Saldo Restante
                </label>
                <div
                  className={`p-2 rounded-xl border-2 text-sm font-black ${
                    remainingBalance > 0
                      ? 'bg-slate-100 border-slate-300 text-[#0F172A]'
                      : 'bg-emerald-50 border-emerald-400 text-emerald-950'
                  }`}
                >
                  {business?.currency || '$'} {remainingBalance}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowMercadoPagoModal(true)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-[#009EE3] to-[#007BBB] hover:from-[#0089C7] hover:to-[#006EA8] text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <MercadoPagoIcon size={18} variant="badge" />
                <span>Pagar Seña con Mercado Pago (Link / QR)</span>
              </button>
              <span className="text-[11px] font-bold text-slate-700">
                Genera enlace directo o código QR interactivo
              </span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* PASO 7: DETALLES ADICIONALES (CABINA, ESTADO, NOTAS)      */}
          {/* ========================================================= */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-black text-[#0F172A] flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#1E3A8A]" />
                  <span>Cabina / Box de Atención (Opcional)</span>
                </span>
                <span className="text-[10px] text-slate-500 font-bold">
                  {availableResources.length} disponibles en{' '}
                  {branchId === 'sucursal_2' ? 'Rioja' : 'Montevideo'}
                </span>
              </label>
              <select
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                className="w-full text-xs sm:text-sm font-bold p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none cursor-pointer"
              >
                <option value="">-- Sin cabina específica (Cualquier puesto libre) --</option>
                {availableResources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (
                    {r.type === 'cabina'
                      ? 'Cabina'
                      : r.type === 'equipo'
                      ? 'Equipo'
                      : 'Espacio'}
                    )
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 border-2 border-blue-200 space-y-1.5">
              <label className="text-xs font-black text-[#1E3A8A] flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5" />
                <span>Aplicar Gift Card o Voucher (Opcional)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ej. SOHAM-884912"
                  value={giftCardCode}
                  onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                  className="flex-1 p-2 rounded-xl border-2 border-slate-300 bg-white font-mono font-black text-xs text-[#0F172A] uppercase placeholder-slate-400 focus:border-[#1E3A8A] outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyGiftCard}
                  className="px-3.5 py-2 bg-[#1E3A8A] hover:bg-blue-900 text-white rounded-xl text-xs font-black shrink-0 transition-colors cursor-pointer"
                >
                  Aplicar
                </button>
              </div>
              {giftCardFeedback && (
                <p className="text-[11px] font-black text-[#1E3A8A] pt-0.5">
                  {giftCardFeedback}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-[#0F172A] block mb-1">
                  Estado del Turno
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                  className="w-full text-xs font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                >
                  <option value="confirmado">Confirmado</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_espera">En espera de seña</option>
                  <option value="completado">Completado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-[#0F172A] block mb-1">
                  Medio de Pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full text-xs font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                >
                  {enabledPaymentMethods.map((m) => (
                    <option key={m} value={m} className="text-[#0F172A] bg-white font-bold">
                      {m === 'pendiente'
                        ? 'Pendiente'
                        : m === 'efectivo'
                        ? 'Efectivo'
                        : m === 'transferencia'
                        ? 'Transferencia'
                        : m === 'mercadopago'
                        ? 'Mercado Pago'
                        : 'Tarjeta'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5 mb-1.5">
                <Palette className="w-3.5 h-3.5 text-[#1E3A8A]" />
                Color distintivo del turno
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {APPOINTMENT_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    title={c.label}
                    className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                      color === c.hex
                        ? 'scale-110 border-black shadow-md ring-2 ring-blue-500'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {color === c.hex && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-[#0F172A] block mb-1">
                Notas del Turno
              </label>
              <input
                type="text"
                placeholder="Detalles específicos para la atención..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs font-bold p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
              />
            </div>
          </div>
        </form>

        {/* Bottom Action Footer with Live Mandatory Field / Availability Status */}
        <div className="sticky bottom-0 bg-white p-4 border-t-2 border-slate-200 z-10 shrink-0 space-y-2.5">
          {errorMsg ? (
            <div className="p-2.5 rounded-xl bg-rose-50 border-2 border-rose-400 text-rose-900 text-xs font-black flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : missingMandatoryFields.length > 0 ? (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Faltan datos obligatorios:{' '}
                <strong className="font-black">{missingMandatoryFields.join(', ')}</strong>
              </span>
            </div>
          ) : scheduleConflictSummary ? (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0" />
              <span>{scheduleConflictSummary}</span>
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Listo para guardar: {isNewClientMode ? newClientName.trim() : clientName} ·{' '}
                {resolvedServiceName} · {time} hs ({BRANCH_SHORT_NAMES[branchId]})
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border-2 border-[#1E3A8A] bg-white hover:bg-slate-50 text-[#1E3A8A] font-black text-sm shadow-2xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="appointment-form"
              disabled={isSubmitting}
              className="px-7 py-2.5 rounded-xl bg-[#1E3A8A] hover:bg-blue-900 active:scale-98 text-white font-black text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer border-2 border-[#1E3A8A] disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>
                {isSubmitting
                  ? 'Guardando...'
                  : appointmentToEdit
                  ? 'Guardar Cambios'
                  : 'Confirmar y Guardar Turno'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {showMercadoPagoModal && business && (
        <MercadoPagoModal
          appointment={{
            id: appointmentToEdit?.id,
            branchId,
            clientName: (isNewClientMode ? newClientName.trim() : clientName) || 'Cliente',
            clientPhone: (isNewClientMode ? newClientPhone.trim() : clientPhone) || '',
            serviceName: resolvedServiceName || 'Servicio',
            price,
            depositAmount,
            date,
            time,
          }}
          business={business}
          onClose={() => setShowMercadoPagoModal(false)}
          onConfirmDepositPaid={(amountPaid) => {
            setDepositAmount(amountPaid);
            setPaymentMethod('mercadopago');
            if (status === 'pendiente' || status === 'en_espera') {
              setStatus('confirmado');
            }
          }}
        />
      )}
    </div>
  );
}
