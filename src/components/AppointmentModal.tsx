import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Clock, User, Sparkles, DollarSign, AlertCircle, Plus, Check, Palette, CreditCard, QrCode, Building2, Users, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Appointment, AppointmentStatus, PaymentMethod, APPOINTMENT_COLORS, BranchId } from '../types';
import { useApp } from '../context/AppContext';
import { getTodayDateString } from '../utils/initialData';
import { MercadoPagoModal } from './mercadopago/MercadoPagoModal';
import { MercadoPagoIcon } from './icons/MercadoPagoIcon';
import { checkStaffAvailability, getStaffDaySchedule } from '../utils/staffSchedule';

interface AppointmentModalProps {
  initialDate?: string;
  initialTime?: string;
  initialStaffId?: string;
  appointmentToEdit?: Appointment | null;
  onClose: () => void;
  onSaved: (appointment: Appointment) => void;
}

export function AppointmentModal({
  initialDate,
  initialTime,
  initialStaffId,
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
  const [clientId, setClientId] = useState(appointmentToEdit?.clientId || '');
  const [clientName, setClientName] = useState(appointmentToEdit?.clientName || '');
  const [clientPhone, setClientPhone] = useState(appointmentToEdit?.clientPhone || '');
  const [isNewClientMode, setIsNewClientMode] = useState(false);

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
  const [successMessage, setSuccessMessage] = useState('');

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
  const syncBranchWithStaffSchedule = (sId: string, dStr: string) => {
    if (appointmentToEdit) return;
    const chosenStaff = staff.find((s) => s.id === sId);
    if (!chosenStaff || !dStr) return;

    const [y, m, d] = dStr.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    const daySchedule = getStaffDaySchedule(chosenStaff, dayOfWeek);

    if (daySchedule.active) {
      if (daySchedule.branchId === 'sucursal_1' || daySchedule.branchId === 'sucursal_2') {
        setBranchId(daySchedule.branchId);
      }
    }
  };

  const handleStaffChange = (newStaffId: string) => {
    setStaffId(newStaffId);
    syncBranchWithStaffSchedule(newStaffId, date);
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    syncBranchWithStaffSchedule(staffId, newDate);
  };

  // Sync staffId if currently selected staff is removed or empty
  useEffect(() => {
    if (staff.length > 0 && (!staffId || !staff.some((s) => s.id === staffId))) {
      const match = initialStaffId && staff.some((s) => s.id === initialStaffId) ? initialStaffId : staff[0].id;
      setStaffId(match);
      syncBranchWithStaffSchedule(match, date);
    }
  }, [staff, staffId, initialStaffId, appointmentToEdit, date]);

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

  // Handle client selection
  const handleClientSelect = (id: string) => {
    setClientId(id);
    const cli = clients.find((c) => c.id === id);
    if (cli) {
      setClientName(cli.name);
      setClientPhone(cli.phone);
    }
  };

  // Calculate remaining balance
  const remainingBalance = Math.max(0, price - depositAmount);

  // Check availability and working hours of chosen staff
  const selectedStaff = staff.find((s) => s.id === staffId);
  const staffAvailability = selectedStaff && date && time
    ? checkStaffAvailability(selectedStaff, date, time, Number(durationMinutes || 30), branchId)
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

  // Simultaneous appointments with OTHER professionals at this exact same time (VALID!)
  const simultaneousAppointmentsOtherStaff = appointments.filter((apt) => {
    if (appointmentToEdit && apt.id === appointmentToEdit.id) return false;
    if (apt.date !== date || apt.staffId === staffId || apt.status === 'cancelado') return false;
    const [aptH, aptM] = apt.time.split(':').map(Number);
    const aptStart = (aptH || 0) * 60 + (aptM || 0);
    const aptEnd = aptStart + (apt.durationMinutes || 30);
    return Math.max(aptStart, curStart) < Math.min(aptEnd, curEnd);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    let finalClientName = clientName.trim();
    let finalClientId = clientId;

    if (!finalClientName) {
      setErrorMsg('Por favor indica el nombre del cliente.');
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

    setIsSubmitting(true);
    try {
      if ((isNewClientMode || !finalClientId) && finalClientName) {
        const existing = clients.find((c) => c.name.toLowerCase() === finalClientName.toLowerCase());
        if (existing) {
          finalClientId = existing.id;
        } else {
          finalClientId = await createClient({
            name: finalClientName,
            phone: clientPhone.trim(),
            email: '',
            notes: '',
          });
        }
      }

      const srvObj = services.find((s) => s.id === serviceId);
      const stfObj = staff.find((s) => s.id === staffId);

      if (appointmentToEdit) {
        const updated: Appointment = {
          ...appointmentToEdit,
          clientId: finalClientId,
          clientName: finalClientName,
          clientPhone: clientPhone.trim(),
          serviceId,
          serviceName: srvObj ? srvObj.name : 'Servicio general',
          staffId,
          staffName: stfObj ? stfObj.name : 'Personal asignado',
          branchId,
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
          clientPhone: clientPhone.trim(),
          serviceId,
          serviceName: srvObj ? srvObj.name : 'Servicio general',
          staffId,
          staffName: stfObj ? stfObj.name : 'Personal asignado',
          branchId,
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
          clientPhone: clientPhone.trim(),
          serviceId,
          serviceName: srvObj ? srvObj.name : 'Servicio general',
          staffId,
          staffName: stfObj ? stfObj.name : 'Personal asignado',
          branchId,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-300 w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#1E3A8A] p-4 sm:p-5 text-white flex items-center justify-between shrink-0 border-b border-blue-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg">
                {appointmentToEdit ? 'Editar Turno' : 'Nuevo Turno'}
              </h3>
              <p className="text-blue-100 text-xs font-medium">
                {appointmentToEdit ? 'Modifica los datos del turno programado' : 'Asigna un turno rápido en la agenda'}
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

        {/* Form Body - Scrollable with max-h-[85vh] overflow-y-auto */}
        <form id="appointment-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-[#0F172A]">
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

          {/* Client Selection */}
          <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-300 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-[#000000] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#1E3A8A]" />
                Cliente
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsNewClientMode(!isNewClientMode);
                  setClientId('');
                  if (!isNewClientMode) {
                    setClientName('');
                    setClientPhone('');
                  }
                }}
                className="text-xs font-black text-[#1E3A8A] hover:text-blue-900 flex items-center gap-1 hover:underline cursor-pointer"
              >
                {isNewClientMode ? 'Seleccionar existente' : '+ Crear nuevo cliente'}
              </button>
            </div>

            {!isNewClientMode && clients.length > 0 ? (
              <div>
                <select
                  value={clientId}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="w-full text-sm font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/20 outline-none text-[#000000]"
                >
                  <option value="" className="text-black bg-white">-- Seleccionar cliente de la lista --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id} className="text-[#000000] font-bold bg-white">
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {(isNewClientMode || clients.length === 0 || clientId) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-bold text-[#000000] block mb-1">Nombre y Apellido *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Sofía Martínez"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full text-sm font-bold p-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none text-[#000000]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#000000] block mb-1">WhatsApp / Teléfono</label>
                  <input
                    type="tel"
                    placeholder="Ej. 11 3344-5566"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full text-sm font-bold p-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none text-[#000000]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Service & Staff */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-[#000000] flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#1E3A8A]" />
                Servicio
              </label>
              <select
                value={serviceId}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full text-sm font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none text-[#000000]"
              >
                {services.length === 0 ? (
                  <option value="" className="text-[#000000] font-bold bg-white">
                    -- No hay servicios (crea uno en Ajustes) --
                  </option>
                ) : (
                  services.map((s) => (
                    <option key={s.id} value={s.id} className="text-[#000000] font-bold bg-white">
                      {s.name} ({s.durationMinutes} min - {business?.currency || '$'} {s.price})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-[#000000] flex items-center gap-1.5 mb-1">
                <User className="w-3.5 h-3.5 text-[#1E3A8A]" />
                Profesional
              </label>
              <select
                value={staffId}
                onChange={(e) => handleStaffChange(e.target.value)}
                className="w-full text-sm font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white focus:border-[#1E3A8A] outline-none text-[#000000]"
              >
                {staff.length === 0 ? (
                  <option value="" className="text-[#000000] font-bold bg-white">
                    -- No hay profesionales (crea uno en Ajustes) --
                  </option>
                ) : (
                  staff.map((st) => (
                    <option key={st.id} value={st.id} className="text-[#000000] font-bold bg-white">
                      {st.name} ({st.role})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Warnings & Availability Check */}
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

          {simultaneousAppointmentsOtherStaff.length > 0 && (
            <div className="p-3 bg-emerald-50 border-2 border-emerald-400 rounded-xl text-emerald-950 text-xs font-bold flex items-start gap-2 shadow-2xs">
              <Users className="w-4 h-4 shrink-0 text-emerald-700 mt-0.5" />
              <div>
                <span className="font-black text-emerald-900 block mb-0.5">✓ Turno simultáneo en salón permitido:</span>
                <span>
                  En este mismo horario atienden: {simultaneousAppointmentsOtherStaff.map((a) => `${a.staffName} (${a.clientName})`).join(', ')}. Al ser con diferentes profesionales, el sistema permite agendar sin conflictos.
                </span>
              </div>
            </div>
          )}

          {/* Explicit authorization toggle if outside hours or same-staff double booking */}
          {(!staffAvailability.available || hasConflictSameStaff) && (
            <div className="p-3.5 bg-amber-50/90 border-2 border-amber-300 rounded-xl space-y-1">
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

          {/* Sucursal / Local */}
          <div>
            <label className="text-xs font-black text-[#0F172A] flex items-center gap-1.5 mb-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#1E3A8A]" />
              <span>Sucursal asignada</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBranchId(b.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all border-2 text-center cursor-pointer ${
                    branchId === b.id
                      ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white shadow-xs'
                      : 'bg-white border-slate-300 text-[#0F172A] hover:bg-slate-100 hover:border-slate-500'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Date, Time & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-black text-[#000000] flex items-center gap-1 mb-1">
                <Calendar className="w-3.5 h-3.5 text-[#1E3A8A]" />
                Fecha
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full text-sm font-bold p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#000000] focus:border-[#1E3A8A] outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black text-[#000000] flex items-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5 text-[#1E3A8A]" />
                Hora
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full text-sm font-bold p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#000000] focus:border-[#1E3A8A] outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black text-[#000000] flex items-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5 text-[#1E3A8A]" />
                Duración (min)
              </label>
              <input
                type="number"
                step="5"
                min="5"
                max="480"
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full text-sm font-bold p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#000000] focus:border-[#1E3A8A] outline-none"
              />
            </div>
          </div>

          {/* Color Picker for appointment */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-[#000000] flex items-center gap-1.5 mb-1.5">
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

          {/* Price & Deposit */}
          <div className="p-3.5 rounded-xl bg-slate-50 border-2 border-slate-300 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-[#000000] block mb-1">Precio Total ({business?.currency || '$'})</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full text-sm font-black p-2 rounded-xl border-2 border-slate-300 bg-white text-[#000000] focus:border-[#1E3A8A] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#000000] block mb-1">Seña Abonada ({business?.currency || '$'})</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full text-sm font-black p-2 rounded-xl border-2 border-slate-300 bg-white text-[#000000] focus:border-[#1E3A8A] outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-[#000000] font-black block mb-1">Saldo Restante</label>
                <div className={`p-2 rounded-xl border-2 text-sm font-black ${
                  remainingBalance > 0
                    ? 'bg-slate-100 border-slate-300 text-[#000000]'
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
                Genera enlace de pago directo o código QR interactivo
              </span>
            </div>
          </div>

          {/* Status & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-[#000000] block mb-1">Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                className="w-full text-sm font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#000000] focus:border-[#1E3A8A] outline-none"
              >
                <option value="confirmado" className="text-[#000000] font-bold bg-white">Confirmado</option>
                <option value="pendiente" className="text-[#000000] font-bold bg-white">Pendiente</option>
                <option value="en_espera" className="text-[#000000] font-bold bg-white">En espera de seña</option>
                <option value="completado" className="text-[#000000] font-bold bg-white">Completado</option>
                <option value="cancelado" className="text-[#000000] font-bold bg-white">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-[#000000] block mb-1">Medio de Pago</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full text-sm font-black p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#000000] focus:border-[#1E3A8A] outline-none"
              >
                <option value="pendiente" className="text-[#000000] font-bold bg-white">Pendiente</option>
                <option value="efectivo" className="text-[#000000] font-bold bg-white">Efectivo</option>
                <option value="transferencia" className="text-[#000000] font-bold bg-white">Transferencia</option>
                <option value="mercadopago" className="text-[#000000] font-bold bg-white">Mercado Pago</option>
                <option value="tarjeta" className="text-[#000000] font-bold bg-white">Tarjeta</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-black text-[#000000] block mb-1">Notas del Turno</label>
            <input
              type="text"
              placeholder="Detalles específicos..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-sm font-bold p-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#000000] focus:border-[#1E3A8A] outline-none"
            />
          </div>
        </form>

        {/* Bottom Action Footer - ALWAYS VISIBLE with Cancelar and Guardar Turno */}
        <div className="sticky bottom-0 bg-white p-4 border-t z-10 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-400 hover:border-slate-800 bg-white hover:bg-slate-100 text-[#000000] font-bold text-sm shadow-2xs transition-colors cursor-pointer"
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
            <span>{isSubmitting ? 'Guardando...' : appointmentToEdit ? 'Guardar Cambios' : 'Guardar Turno'}</span>
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
