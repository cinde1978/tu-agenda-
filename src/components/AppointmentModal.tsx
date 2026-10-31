import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Sparkles,
  DollarSign,
  AlertCircle,
  Plus,
  Check,
  Palette,
  CreditCard,
  QrCode,
  Building2,
  Users,
  ShieldAlert,
  CheckCircle2,
  Layers,
  Gift,
  Search,
  Phone,
  Mail,
  ArrowRight,
  MessageCircle,
  UserCheck,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';
import { Appointment, AppointmentStatus, PaymentMethod, APPOINTMENT_COLORS, BranchId, Client } from '../types';
import { useApp } from '../context/AppContext';
import { getTodayDateString } from '../utils/initialData';
import { MercadoPagoModal } from './mercadopago/MercadoPagoModal';
import { MercadoPagoIcon } from './icons/MercadoPagoIcon';
import {
  checkStaffAvailability,
  getStaffDaySchedule,
  getStaffEffectiveShift,
  timeToMinutes,
  minutesToTime,
  BRANCH_NAMES,
  DAY_LABELS,
} from '../utils/staffSchedule';

interface AppointmentModalProps {
  initialDate?: string;
  initialTime?: string;
  initialStaffId?: string;
  initialClientId?: string;
  appointmentToEdit?: Appointment | null;
  onClose: () => void;
  onSaved: (appointment: Appointment) => void;
}

export function AppointmentModal({
  initialDate,
  initialTime,
  initialStaffId,
  initialClientId,
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
    branches,
    createAppointment,
    updateAppointment,
    createClient,
    createCashMovement,
  } = useApp();

  const sourceAppointments = allAppointments && allAppointments.length > 0 ? allAppointments : appointments;

  // Form states
  const [branchId, setBranchId] = useState<BranchId>(appointmentToEdit?.branchId || selectedBranch);
  const [resourceId, setResourceId] = useState<string>(appointmentToEdit?.resourceId || '');
  const [giftCardCode, setGiftCardCode] = useState<string>(appointmentToEdit?.giftCardCode || '');
  const [giftCardFeedback, setGiftCardFeedback] = useState<string | null>(null);

  // Client Selection State (Decoupled from Agenda)
  const [clientId, setClientId] = useState<string>(appointmentToEdit?.clientId || initialClientId || '');
  const [clientName, setClientName] = useState<string>(appointmentToEdit?.clientName || '');
  const [clientPhone, setClientPhone] = useState<string>(appointmentToEdit?.clientPhone || '');
  const [clientSearchTerm, setClientSearchTerm] = useState<string>('');
  const [isNewClientMode, setIsNewClientMode] = useState<boolean>(false);

  // Quick new client secondary registration state
  const [newClientName, setNewClientName] = useState<string>('');
  const [newClientPhone, setNewClientPhone] = useState<string>('');
  const [newClientWhatsApp, setNewClientWhatsApp] = useState<string>('');
  const [newClientEmail, setNewClientEmail] = useState<string>('');
  const [newClientNotes, setNewClientNotes] = useState<string>('');

  const [serviceId, setServiceId] = useState(appointmentToEdit?.serviceId || (services[0]?.id || ''));
  const [staffId, setStaffId] = useState(appointmentToEdit?.staffId || initialStaffId || (staff[0]?.id || ''));

  const [date, setDate] = useState(appointmentToEdit?.date || initialDate || getTodayDateString());
  const [time, setTime] = useState(appointmentToEdit?.time || initialTime || '10:00');
  const [durationMinutes, setDurationMinutes] = useState(appointmentToEdit?.durationMinutes || 45);

  const [price, setPrice] = useState(appointmentToEdit?.price || 0);
  const [depositAmount, setDepositAmount] = useState(appointmentToEdit?.depositAmount || 0);
  const [color, setColor] = useState(appointmentToEdit?.color || APPOINTMENT_COLORS[0].hex);
  const [status, setStatus] = useState<AppointmentStatus>(appointmentToEdit?.status || 'confirmado');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(appointmentToEdit?.paymentMethod || 'pendiente');
  const [registerDepositInCash, setRegisterDepositInCash] = useState(true);
  const [notes, setNotes] = useState(appointmentToEdit?.notes || '');
  const [showMercadoPagoModal, setShowMercadoPagoModal] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overrideScheduleValidation, setOverrideScheduleValidation] = useState(false);
  const [showManualTimeInput, setShowManualTimeInput] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Prepopulate client data when clientId or initialClientId is provided
  useEffect(() => {
    if (clientId) {
      const found = clients.find((c) => c.id === clientId);
      if (found) {
        setClientName(found.name);
        setClientPhone(found.phone || found.whatsapp || '');
      }
    }
  }, [clientId, clients]);

  // When selected service changes, automatically complete duration & price
  const handleServiceChange = (id: string) => {
    setServiceId(id);
    const srv = services.find((s) => s.id === id);
    if (srv) {
      setPrice(srv.price);
      setDurationMinutes(srv.durationMinutes);
      if (srv.color) setColor(srv.color);
    }
  };

  // Harmonize branch assignment if the professional has a specific single branch for this day
  const syncBranchWithStaffSchedule = (sId: string, dStr: string, tStr?: string) => {
    if (appointmentToEdit) return;
    const chosenStaff = staff.find((s) => s.id === sId);
    if (!chosenStaff || !dStr) return;

    const [y, m, d] = dStr.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    const daySchedule = getStaffDaySchedule(chosenStaff, dayOfWeek);

    if (daySchedule.active) {
      const s1 = daySchedule.branchShifts?.sucursal_1;
      const s2 = daySchedule.branchShifts?.sucursal_2;
      const s1Active = s1?.active !== false;
      const s2Active = s2?.active !== false;

      if (s1Active && s2Active) {
        const checkTime = tStr || time;
        if (checkTime && s1 && s2) {
          const curMin = timeToMinutes(checkTime);
          if (curMin >= timeToMinutes(s1.start) && curMin < timeToMinutes(s1.end)) {
            setBranchId('sucursal_1');
          } else if (curMin >= timeToMinutes(s2.start) && curMin < timeToMinutes(s2.end)) {
            setBranchId('sucursal_2');
          }
        }
      } else if (s1Active && !s2Active) {
        setBranchId('sucursal_1');
      } else if (!s1Active && s2Active) {
        setBranchId('sucursal_2');
      }
    }
  };

  const handleStaffChange = (newStaffId: string) => {
    setStaffId(newStaffId);
    syncBranchWithStaffSchedule(newStaffId, date, time);
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    syncBranchWithStaffSchedule(staffId, newDate, time);
  };

  // Sync staffId if currently selected staff is removed or empty
  useEffect(() => {
    if (staff.length > 0 && (!staffId || !staff.some((s) => s.id === staffId))) {
      const match = initialStaffId && staff.some((s) => s.id === initialStaffId) ? initialStaffId : staff[0].id;
      setStaffId(match);
      syncBranchWithStaffSchedule(match, date, time);
    }
  }, [staff, staffId, initialStaffId, appointmentToEdit, date, time]);

  // Set initial price and duration from first service if creating
  useEffect(() => {
    if (services.length > 0) {
      if (!serviceId || !services.some((s) => s.id === serviceId)) {
        const firstSrv = services[0];
        setServiceId(firstSrv.id);
        if (!appointmentToEdit) {
          setPrice(firstSrv.price);
          setDurationMinutes(firstSrv.durationMinutes);
          if (firstSrv.color) setColor(firstSrv.color);
        }
      } else if (!appointmentToEdit && price === 0) {
        const currentSrv = services.find((s) => s.id === serviceId);
        if (currentSrv) {
          setPrice(currentSrv.price);
          setDurationMinutes(currentSrv.durationMinutes);
          if (currentSrv.color) setColor(currentSrv.color);
        }
      }
    }
  }, [services, serviceId, appointmentToEdit, price]);

  // Handle existing client selection
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

  // Calculate remaining balance
  const remainingBalance = Math.max(0, price - depositAmount);

  const availableResources = useMemo(() => {
    return resources.filter((r) => r.active && (r.branchId === 'ambas' || r.branchId === branchId));
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

  // Check availability and working hours of chosen staff
  const selectedStaff = staff.find((s) => s.id === staffId);
  const selectedStaffSchedule = useMemo(() => {
    if (!selectedStaff || !date) return null;
    const [y, m, d] = date.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    return getStaffDaySchedule(selectedStaff, dayOfWeek);
  }, [selectedStaff, date]);

  // Effective shift of staff in THIS branch
  const effectiveStaffShift = useMemo(() => {
    if (!selectedStaffSchedule) return null;
    return getStaffEffectiveShift(selectedStaffSchedule, branchId);
  }, [selectedStaffSchedule, branchId]);

  // Calculate available time slots for the chosen staff at this branch on this date
  const availableTimeSlots = useMemo(() => {
    if (!selectedStaff || !date || !effectiveStaffShift || !effectiveStaffShift.active) {
      return [];
    }

    const startMin = timeToMinutes(effectiveStaffShift.start);
    const endMin = timeToMinutes(effectiveStaffShift.end);
    const duration = Number(durationMinutes || 30);

    if (endMin <= startMin || duration <= 0) return [];

    const slots: string[] = [];
    const step = (duration % 30 === 0 && startMin % 30 === 0) ? 30 : 15;

    for (let m = startMin; m + duration <= endMin; m += step) {
      const slotTime = minutesToTime(m);
      const avail = checkStaffAvailability(
        selectedStaff,
        date,
        slotTime,
        duration,
        branchId,
        sourceAppointments,
        appointmentToEdit?.id
      );
      if (avail.available) {
        slots.push(slotTime);
      }
    }

    return slots;
  }, [selectedStaff, date, effectiveStaffShift, durationMinutes, branchId, sourceAppointments, appointmentToEdit]);

  // Check availability of currently chosen time
  const staffAvailability = selectedStaff && date && time
    ? checkStaffAvailability(
        selectedStaff,
        date,
        time,
        Number(durationMinutes || 30),
        branchId,
        sourceAppointments,
        appointmentToEdit?.id
      )
    : { available: true };

  // Calculate start & end minutes of current slot
  const [curH, curM] = time.split(':').map(Number);
  const curStart = (curH || 0) * 60 + (curM || 0);
  const curEnd = curStart + Number(durationMinutes || 30);

  // Overlap strictly for the SAME professional across ALL branches (prevent cross-branch double bookings)
  const overlappingAppointmentsSameStaff = sourceAppointments.filter((apt) => {
    if (appointmentToEdit && apt.id === appointmentToEdit.id) return false;
    if (apt.date !== date || apt.staffId !== staffId || apt.status === 'cancelado') return false;
    const [aptH, aptM] = apt.time.split(':').map(Number);
    const aptStart = (aptH || 0) * 60 + (aptM || 0);
    const aptEnd = aptStart + (apt.durationMinutes || 30);
    return Math.max(aptStart, curStart) < Math.min(aptEnd, curEnd);
  });
  const hasConflictSameStaff = overlappingAppointmentsSameStaff.length > 0;

  // Filter clients for search
  const filteredClients = useMemo(() => {
    if (!clientSearchTerm.trim()) {
      return clients.slice(0, 8);
    }
    const term = clientSearchTerm.toLowerCase().trim();
    return clients.filter((c) => {
      const phoneWa = `${c.phone || ''} ${c.whatsapp || ''}`.toLowerCase();
      return (
        c.name.toLowerCase().includes(term) ||
        phoneWa.includes(term) ||
        (c.email && c.email.toLowerCase().includes(term))
      );
    }).slice(0, 10);
  }, [clients, clientSearchTerm]);

  // Duplicate detection for quick secondary new client registration
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    let finalClientId = clientId;
    let finalClientName = clientName.trim();
    let finalClientPhone = clientPhone.trim();

    // If in new client registration mode
    if (isNewClientMode) {
      if (!newClientName.trim()) {
        setErrorMsg('Por favor ingresa el nombre y apellido del nuevo cliente.');
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
        finalClientPhone = (newClientPhone.trim() || newClientWhatsApp.trim());
      } catch (err: any) {
        setErrorMsg(err.message || 'Error al registrar el cliente');
        return;
      }
    }

    if (!finalClientName) {
      setErrorMsg('Por favor selecciona un cliente existente o registra uno nuevo.');
      return;
    }

    if (!date || !time) {
      setErrorMsg('Por favor indica fecha y hora del turno.');
      return;
    }

    // Schedule restriction check: block outside hours, break intervals or same-staff double booking unless authorized
    if ((!staffAvailability.available || hasConflictSameStaff) && !overrideScheduleValidation) {
      if (!staffAvailability.available) {
        setErrorMsg(
          `${staffAvailability.message || 'Fuera de disponibilidad laboral del profesional.'} Puedes confirmarlo marcando la casilla de autorización abajo.`
        );
      } else {
        const conflict = overlappingAppointmentsSameStaff[0];
        const conflictBranchName = conflict?.branchId === 'sucursal_2' ? 'Soham Rioja' : 'Soham Montevideo';
        setErrorMsg(
          `Superposición de turnos para ${selectedStaff?.name || 'este profesional'} (${conflict?.time} hs en ${conflictBranchName} con ${conflict?.clientName}). Para agendar simultáneo al mismo profesional marca la casilla de autorización.`
        );
      }
      return;
    }

    // Resource collision check
    if (resourceId) {
      const selectedResource = resources.find((r) => r.id === resourceId);
      const overlappingResourceApt = sourceAppointments.find((a) => {
        if (a.id === appointmentToEdit?.id) return false;
        if (a.status === 'cancelado') return false;
        if (a.date !== date) return false;
        if (a.resourceId !== resourceId) return false;

        const [aH, aM] = a.time.split(':').map(Number);
        const aStart = aH * 60 + aM;
        const aEnd = aStart + (a.durationMinutes || 30);

        const [nH, nM] = time.split(':').map(Number);
        const nStart = nH * 60 + nM;
        const nEnd = nStart + Number(durationMinutes);

        return aStart < nEnd && nStart < aEnd;
      });

      if (overlappingResourceApt && !overrideScheduleValidation) {
        setErrorMsg(
          `Conflicto de espacio: "${selectedResource?.name || 'El recurso'}" ya se encuentra reservado a las ${overlappingResourceApt.time} hs con ${overlappingResourceApt.clientName}. Podés seleccionar otra cabina o autorizar la excepción con la casilla de abajo.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const srvObj = services.find((s) => s.id === serviceId);
      const stfObj = staff.find((s) => s.id === staffId);
      const resObj = resources.find((r) => r.id === resourceId);

      if (appointmentToEdit) {
        const updated: Appointment = {
          ...appointmentToEdit,
          clientId: finalClientId,
          clientName: finalClientName,
          clientPhone: finalClientPhone,
          serviceId,
          serviceName: srvObj ? srvObj.name : 'Servicio general',
          staffId,
          staffName: stfObj ? stfObj.name : 'Personal asignado',
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
        }, 300);
      } else {
        const newId = await createAppointment({
          clientId: finalClientId,
          clientName: finalClientName,
          clientPhone: finalClientPhone,
          serviceId,
          serviceName: srvObj ? srvObj.name : 'Servicio general',
          staffId,
          staffName: stfObj ? stfObj.name : 'Personal asignado',
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
            description: `[${branchId === 'sucursal_2' ? 'Soham Rioja' : 'Soham Montevideo'}] Seña para turno de ${finalClientName} (${srvObj?.name || 'Servicio'})`,
            appointmentId: newId,
          });
        }

        const createdApt: Appointment = {
          id: newId,
          businessId: '',
          clientId: finalClientId,
          clientName: finalClientName,
          clientPhone: finalClientPhone,
          serviceId,
          serviceName: srvObj ? srvObj.name : 'Servicio general',
          staffId,
          staffName: stfObj ? stfObj.name : 'Personal asignado',
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
        }, 300);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al guardar el turno');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedClient = clients.find((c) => c.id === clientId);

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
                {appointmentToEdit ? 'Modifica los datos del turno programado' : 'Selecciona cliente, sucursal, profesional y horario disponible'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form id="appointment-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-[#0F172A]">
          {successMessage && (
            <div className="p-3 bg-emerald-50 border-2 border-emerald-400 text-emerald-950 text-xs rounded-xl flex items-center gap-2 font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
              <span>{successMessage}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* PASO 1: SELECCIÓN DE CLIENTE (MÓDULO INDEPENDIENTE)        */}
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

            {/* CASE A: Client is already selected */}
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
                  title="Cambiar cliente"
                >
                  Cambiar
                </button>
              </div>
            ) : !isNewClientMode ? (
              /* CASE B: Search and select existing client */
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

                {/* Client list dropdown / suggestions */}
                <div className="max-h-44 overflow-y-auto rounded-xl border-2 border-slate-200 bg-white divide-y divide-slate-100">
                  {filteredClients.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-xs text-slate-600 font-bold">
                        No se encontró ningún cliente con "{clientSearchTerm}".
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
                        <span>Dar de alta "{clientSearchTerm}" como cliente nuevo</span>
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
                              {c.phone || c.whatsapp || 'Sin teléfono'} {c.email ? `· ${c.email}` : ''}
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
              /* CASE C: Secondary new client registration form */
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

                {/* Duplicate alert if client name or phone already exists */}
                {duplicateMatch && (
                  <div className="p-2.5 bg-amber-50 border-2 border-amber-400 rounded-xl text-amber-950 text-xs font-bold flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span>Ya existe registrado: <strong>{duplicateMatch.name}</strong> ({duplicateMatch.phone || duplicateMatch.whatsapp}).</span>
                      <button
                        type="button"
                        onClick={() => handleClientSelect(duplicateMatch)}
                        className="block mt-1 font-black text-[#1E3A8A] hover:underline cursor-pointer"
                      >
                        Seleccionar {duplicateMatch.name} existente para evitar duplicar →
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-800 block mb-0.5">Nombre y Apellido *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Valentina Morán"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="w-full text-xs font-bold p-2 rounded-lg border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-800 block mb-0.5">Teléfono</label>
                    <input
                      type="tel"
                      placeholder="Ej. 341 555-9988"
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
                      placeholder="Ej. 3415559988"
                      value={newClientWhatsApp}
                      onChange={(e) => setNewClientWhatsApp(e.target.value)}
                      className="w-full text-xs font-bold p-2 rounded-lg border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-800 block mb-0.5">Correo Electrónico</label>
                    <input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      className="w-full text-xs font-bold p-2 rounded-lg border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none text-[#0F172A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-800 block mb-0.5">Observaciones</label>
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
          {/* PASO 2: SUCURSAL ASIGNADA                                 */}
          {/* ========================================================= */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <label className="text-xs font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#1E3A8A]" />
                <span>Paso 2: Sucursal asignada</span>
              </label>
              {selectedStaffSchedule && selectedStaffSchedule.branchShifts && (
                <span className="text-[10px] font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Horarios hoy: Montevideo ({selectedStaffSchedule.branchShifts.sucursal_1?.active ? `${selectedStaffSchedule.branchShifts.sucursal_1.start}-${selectedStaffSchedule.branchShifts.sucursal_1.end}` : 'No atiende'}) · Rioja ({selectedStaffSchedule.branchShifts.sucursal_2?.active ? `${selectedStaffSchedule.branchShifts.sucursal_2.start}-${selectedStaffSchedule.branchShifts.sucursal_2.end}` : 'No atiende'})
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBranchId(b.id)}
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

          {/* ========================================================= */}
          {/* PASO 3 & 4: PROFESIONAL Y SERVICIO                        */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5 mb-1">
                <UserCheck className="w-4 h-4 text-[#1E3A8A]" />
                <span>Paso 3: Profesional</span>
              </label>
              <select
                value={staffId}
                onChange={(e) => handleStaffChange(e.target.value)}
                className="w-full text-xs font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none text-[#0F172A]"
              >
                {staff.length === 0 ? (
                  <option value="" className="text-[#0F172A] font-bold bg-white">
                    -- No hay profesionales --
                  </option>
                ) : (
                  staff.map((st) => (
                    <option key={st.id} value={st.id} className="text-[#0F172A] font-bold bg-white">
                      {st.name} ({st.role})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5 mb-1">
                <Sparkles className="w-4 h-4 text-[#1E3A8A]" />
                <span>Paso 4: Servicio</span>
              </label>
              <select
                value={serviceId}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full text-xs font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none text-[#0F172A]"
              >
                {services.length === 0 ? (
                  <option value="" className="text-[#0F172A] font-bold bg-white">
                    -- No hay servicios disponibles --
                  </option>
                ) : (
                  services.map((s) => (
                    <option key={s.id} value={s.id} className="text-[#0F172A] font-bold bg-white">
                      {s.name} ({s.durationMinutes} min - {business?.currency || '$'} {s.price})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* ========================================================= */}
          {/* PASO 5: FECHA Y HORARIOS DISPONIBLES EN ESTA SUCURSAL     */}
          {/* ========================================================= */}
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-300 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#1E3A8A]" />
                <span>Paso 5: Fecha y Horarios Disponibles</span>
              </label>
              <button
                type="button"
                onClick={() => setShowManualTimeInput(!showManualTimeInput)}
                className="text-[11px] font-black text-[#1E3A8A] hover:underline cursor-pointer"
              >
                {showManualTimeInput ? 'Ver horarios recomendados' : '⏱ Ingresar horario manual / sobreturno'}
              </button>
            </div>

            {/* Date and Duration Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-800 block mb-1">Fecha del Turno</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-800 block mb-1">Duración (minutos)</label>
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

            {/* Available Time Slots Grid */}
            {!showManualTimeInput ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-700">
                    Horarios libres para {selectedStaff?.name} en {BRANCH_NAMES[branchId]}:
                  </span>
                  {availableTimeSlots.length > 0 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {availableTimeSlots.length} horarios libres
                    </span>
                  )}
                </div>

                {/* If staff does NOT work on this branch on this day */}
                {effectiveStaffShift && !effectiveStaffShift.active ? (
                  <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-950 font-bold">
                        <p>
                          {selectedStaff?.name || 'El profesional'} no tiene turno de trabajo configurado en {BRANCH_NAMES[branchId]} para esta fecha.
                        </p>
                        {selectedStaffSchedule?.branchShifts && (
                          <div className="mt-1 text-[11px] text-amber-900">
                            {branchId === 'sucursal_1' && selectedStaffSchedule.branchShifts.sucursal_2?.active && (
                              <button
                                type="button"
                                onClick={() => setBranchId('sucursal_2')}
                                className="font-black text-[#1E3A8A] hover:underline cursor-pointer"
                              >
                                → Cambiar a Soham Rioja (atiende de {selectedStaffSchedule.branchShifts.sucursal_2.start} a {selectedStaffSchedule.branchShifts.sucursal_2.end} hs)
                              </button>
                            )}
                            {branchId === 'sucursal_2' && selectedStaffSchedule.branchShifts.sucursal_1?.active && (
                              <button
                                type="button"
                                onClick={() => setBranchId('sucursal_1')}
                                className="font-black text-[#1E3A8A] hover:underline cursor-pointer"
                              >
                                → Cambiar a Soham Montevideo (atiende de {selectedStaffSchedule.branchShifts.sucursal_1.start} a {selectedStaffSchedule.branchShifts.sucursal_1.end} hs)
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : availableTimeSlots.length === 0 ? (
                  <div className="p-3 bg-slate-100 border-2 border-slate-300 rounded-xl text-xs text-slate-700 font-bold text-center">
                    No hay horarios libres de {durationMinutes} min para este día en {BRANCH_NAMES[branchId]}.
                    <button
                      type="button"
                      onClick={() => setShowManualTimeInput(true)}
                      className="block mt-1 text-[#1E3A8A] font-black mx-auto hover:underline cursor-pointer"
                    >
                      Ingresar horario manual o autorizar sobreturno →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {availableTimeSlots.map((slot) => {
                      const isSelected = time === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setTime(slot)}
                          className={`py-2 px-1 text-xs rounded-xl font-black text-center transition-all border-2 cursor-pointer ${
                            isSelected
                              ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white shadow-md ring-2 ring-blue-400 scale-105'
                              : 'bg-white border-slate-300 text-slate-800 hover:border-[#1E3A8A] hover:bg-blue-50'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Manual Time Input for exceptions */
              <div className="p-3 bg-white rounded-xl border-2 border-blue-400 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Horario Exacto Personalizado</label>
                  <button
                    type="button"
                    onClick={() => setShowManualTimeInput(false)}
                    className="text-[11px] font-bold text-[#1E3A8A] hover:underline cursor-pointer"
                  >
                    Volver a lista de horarios disponibles
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

            {/* Warnings and Overlap Checks */}
            {!staffAvailability.available && (
              <div className="p-3 bg-amber-50 border-2 border-amber-400 rounded-xl text-amber-950 text-xs font-bold flex items-start gap-2 shadow-2xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                <div>
                  <span className="font-black text-amber-900 block mb-0.5">Disponibilidad del profesional:</span>
                  <span>{staffAvailability.message}</span>
                </div>
              </div>
            )}

            {hasConflictSameStaff && (
              <div className="p-3 bg-rose-50 border-2 border-rose-400 rounded-xl text-rose-950 text-xs font-bold flex items-start gap-2 shadow-2xs">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-700 mt-0.5" />
                <div>
                  <span className="font-black text-rose-900 block mb-0.5">Superposición detectada para {selectedStaff?.name}:</span>
                  <span>
                    Ya tiene reservado el turno de {overlappingAppointmentsSameStaff[0]?.time} hs en {overlappingAppointmentsSameStaff[0]?.branchId === 'sucursal_2' ? 'Soham Rioja' : 'Soham Montevideo'} con {overlappingAppointmentsSameStaff[0]?.clientName} ({overlappingAppointmentsSameStaff[0]?.serviceName}).
                  </span>
                </div>
              </div>
            )}

            {/* Authorization toggle if outside regular availability */}
            {(!staffAvailability.available || hasConflictSameStaff) && (
              <div className="p-3 bg-amber-50/90 border-2 border-amber-300 rounded-xl space-y-1">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="overrideScheduleValidation"
                    checked={overrideScheduleValidation}
                    onChange={(e) => setOverrideScheduleValidation(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-2 border-amber-400 text-[#1E3A8A] focus:ring-[#1E3A8A] cursor-pointer"
                  />
                  <label htmlFor="overrideScheduleValidation" className="text-xs font-black text-amber-950 cursor-pointer">
                    Autorizar turno fuera de horario o sobreturno especial para {selectedStaff?.name || 'el profesional'}
                  </label>
                </div>
                <p className="text-[11px] text-amber-800 font-semibold pl-6">
                  Marca esta casilla para confirmar la reserva por excepción de la secretaria.
                </p>
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
                <label className="text-xs font-bold text-[#0F172A] block mb-1">Precio Total ({business?.currency || '$'})</label>
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
                <label className="text-xs font-bold text-[#0F172A] block mb-1">Seña Abonada ({business?.currency || '$'})</label>
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
                <label className="text-xs text-[#0F172A] font-black block mb-1">Saldo Restante</label>
                <div className={`p-2 rounded-xl border-2 text-sm font-black ${
                  remainingBalance > 0
                    ? 'bg-slate-100 border-slate-300 text-[#0F172A]'
                    : 'bg-emerald-50 border-emerald-400 text-emerald-950'
                }`}>
                  {business?.currency || '$'} {remainingBalance}
                </div>
              </div>
            </div>

            {/* Mercado Pago Deposit Button */}
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
            {/* Cabina / Box / Equipo Asignado */}
            <div>
              <label className="text-xs font-black text-[#0F172A] flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#1E3A8A]" />
                  <span>Cabina / Box de Atención (Opcional)</span>
                </span>
                <span className="text-[10px] text-slate-500 font-bold">
                  {availableResources.length} disponibles en {branchId === 'sucursal_2' ? 'Rioja' : 'Montevideo'}
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
                    {r.name} ({r.type === 'cabina' ? 'Cabina' : r.type === 'equipo' ? 'Equipo' : 'Espacio'})
                  </option>
                ))}
              </select>
            </div>

            {/* Voucher / Gift Card Soham */}
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

            {/* Status & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-[#0F172A] block mb-1">Estado del Turno</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                  className="w-full text-xs font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                >
                  <option value="confirmado" className="text-[#0F172A] font-bold bg-white">Confirmado</option>
                  <option value="pendiente" className="text-[#0F172A] font-bold bg-white">Pendiente</option>
                  <option value="en_espera" className="text-[#0F172A] font-bold bg-white">En espera de seña</option>
                  <option value="completado" className="text-[#0F172A] font-bold bg-white">Completado</option>
                  <option value="cancelado" className="text-[#0F172A] font-bold bg-white">Cancelado</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-[#0F172A] block mb-1">Medio de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full text-xs font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                >
                  <option value="pendiente" className="text-[#0F172A] font-bold bg-white">Pendiente</option>
                  <option value="efectivo" className="text-[#0F172A] font-bold bg-white">Efectivo</option>
                  <option value="transferencia" className="text-[#0F172A] font-bold bg-white">Transferencia</option>
                  <option value="mercadopago" className="text-[#0F172A] font-bold bg-white">Mercado Pago</option>
                  <option value="tarjeta" className="text-[#0F172A] font-bold bg-white">Tarjeta</option>
                </select>
              </div>
            </div>

            {/* Distinctive Color */}
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
                      color === c.hex ? 'scale-110 border-black shadow-md ring-2 ring-blue-500' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {color === c.hex && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-black text-[#0F172A] block mb-1">Notas del Turno</label>
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

        {/* Bottom Action Footer - ALWAYS VISIBLE with Cancelar and Guardar Turno */}
        <div className="sticky bottom-0 bg-white p-4 border-t z-10 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-400 hover:border-slate-800 bg-white hover:bg-slate-100 text-[#0F172A] font-bold text-sm shadow-2xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="appointment-form"
            disabled={isSubmitting}
            className="px-7 py-2.5 rounded-xl bg-[#1E3A8A] hover:bg-[#172554] active:scale-98 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{isSubmitting ? 'Guardando...' : appointmentToEdit ? 'Guardar Cambios' : 'Confirmar y Guardar Turno'}</span>
          </button>
        </div>
      </div>

      {showMercadoPagoModal && business && (
        <MercadoPagoModal
          appointment={{
            id: appointmentToEdit?.id,
            clientName: clientName || 'Cliente',
            clientPhone: clientPhone || '',
            serviceName: services.find((s) => s.id === serviceId)?.name || 'Servicio',
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
