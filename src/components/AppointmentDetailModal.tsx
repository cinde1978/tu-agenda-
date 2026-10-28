import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Sparkles,
  DollarSign,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  QrCode,
  Building2,
} from 'lucide-react';
import { Appointment, PaymentMethod } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDateSpanishLong, getStatusBadge, openWhatsAppTurno } from '../utils/formatters';
import { WhatsAppModal } from './WhatsAppModal';
import { MercadoPagoModal } from './mercadopago/MercadoPagoModal';
import { WhatsAppIcon, MercadoPagoIcon } from './icons';

interface AppointmentDetailModalProps {
  appointment: Appointment;
  onClose: () => void;
  onEdit: (apt: Appointment) => void;
}

export function AppointmentDetailModal({
  appointment,
  onClose,
  onEdit,
}: AppointmentDetailModalProps) {
  const { business, deleteAppointment, markAppointmentCompleted, updateAppointment } = useApp();
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showMercadoPagoModal, setShowMercadoPagoModal] = useState(false);
  const [showCompletePrompt, setShowCompletePrompt] = useState(false);
  const [collectedAmount, setCollectedAmount] = useState(appointment.remainingBalance);
  const [completePaymentMethod, setCompletePaymentMethod] = useState<PaymentMethod>('efectivo');
  const [isDeleting, setIsDeleting] = useState(false);
  const [completeSuccess, setCompleteSuccess] = useState('');

  const statusInfo = getStatusBadge(appointment.status);

  const handleCompleteTurn = async () => {
    await markAppointmentCompleted(appointment, Number(collectedAmount), completePaymentMethod);
    setCompleteSuccess('✓ Turno completado y cobro registrado en caja diaria con éxito');
    setTimeout(() => {
      setShowCompletePrompt(false);
      onClose();
    }, 700);
  };

  const handleCancelTurn = async () => {
    if (confirm('¿Estás seguro de cancelar este turno?')) {
      await updateAppointment({
        ...appointment,
        status: 'cancelado',
      });
      onClose();
    }
  };

  const handleDeleteTurn = async () => {
    if (confirm('¿Deseas eliminar permanentemente este turno de la agenda?')) {
      setIsDeleting(true);
      await deleteAppointment(appointment.id);
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-300 w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header - Fixed Top Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${statusInfo.bg}`}>
                <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                {statusInfo.label}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Ref #{appointment.id.slice(-6)}
              </span>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1E3A8A] border-2 border-blue-200 shadow-2xs flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#1E3A8A]" />
                <span>{appointment.branchId === 'sucursal_2' ? 'Soham Rioja' : 'Soham Montevideo'}</span>
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body - Fully Scrollable with vertical scroll for phones and desktops */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-[#0F172A]">
            {completeSuccess && (
              <div className="p-3 bg-emerald-50 border-2 border-emerald-400 text-emerald-950 text-xs rounded-xl flex items-center gap-2 font-bold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                <span>{completeSuccess}</span>
              </div>
            )}
            {/* Client card */}
            <div className="flex items-start justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                  {appointment.clientName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">{appointment.clientName}</h4>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    {appointment.clientPhone || 'Sin teléfono guardado'}
                  </p>
                </div>
              </div>

              {business && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      openWhatsAppTurno(appointment, business.phoneCountryPrefix || '+54');
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
                    title="Abrir WhatsApp directamente con confirmación"
                  >
                    <WhatsAppIcon size={16} variant="monochrome" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWhatsApp(true)}
                    className="p-2 hover:bg-emerald-100 rounded-xl text-emerald-800 transition-colors"
                    title="Editar mensaje o elegir plantilla"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Service & Staff Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-white rounded-xl border-2 border-slate-300 shadow-2xs">
                <div className="text-xs font-black text-slate-700 flex items-center gap-1 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Servicio
                </div>
                <div className="font-black text-[#0F172A]">{appointment.serviceName}</div>
                <div className="text-xs text-slate-700 font-bold mt-0.5">{appointment.durationMinutes} minutos</div>
              </div>
              <div className="p-3 bg-white rounded-xl border-2 border-slate-300 shadow-2xs">
                <div className="text-xs font-black text-slate-700 flex items-center gap-1 mb-1">
                  <User className="w-3.5 h-3.5 text-sky-600" />
                  Profesional
                </div>
                <div className="font-black text-[#0F172A]">{appointment.staffName}</div>
                <div className="text-xs text-slate-700 font-bold mt-0.5">Especialista</div>
              </div>
            </div>

            {/* Date and Time */}
            <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border-2 border-slate-300 text-sm shadow-2xs">
              <div className="flex items-center gap-2 text-slate-900">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-black capitalize">{formatDateSpanishLong(appointment.date)}</span>
              </div>
              <div className="flex items-center gap-1.5 font-black text-blue-900 bg-blue-100 px-2.5 py-1 rounded-lg text-xs border border-blue-300">
                <Clock className="w-3.5 h-3.5" />
                <span>{appointment.time} hs</span>
              </div>
            </div>

            {/* Financial summary */}
            <div className="p-4 bg-white rounded-xl border-2 border-slate-300 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-700 font-bold">
                <span>Precio Total</span>
                <span className="font-black text-[#0F172A] text-sm">
                  {formatCurrency(appointment.price, business?.currency)}
                </span>
              </div>
              {appointment.depositAmount > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-800 font-bold">
                  <span>Seña Abonada</span>
                  <span className="font-black">
                    - {formatCurrency(appointment.depositAmount, business?.currency)}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#0F172A]">Saldo Pendiente</span>
                <span className={`text-base font-black ${appointment.remainingBalance > 0 ? 'text-[#0F172A]' : 'text-emerald-700'}`}>
                  {formatCurrency(appointment.remainingBalance, business?.currency)}
                </span>
              </div>

              {/* Botón Pagar Seña con Mercado Pago */}
              {appointment.status !== 'completado' && business && (
                <div className="pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowMercadoPagoModal(true)}
                    className="w-full py-2.5 px-3 bg-[#0F172A] hover:bg-black text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <MercadoPagoIcon size={18} variant="badge" />
                    <span>Pagar Seña con Mercado Pago (Link / QR)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Notes if present */}
            {appointment.notes && (
              <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-[#0F172A]">
                <span className="font-black block mb-0.5">Notas del turno:</span>
                {appointment.notes}
              </div>
            )}

            {/* Complete turn prompt section */}
            {showCompletePrompt ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    Finalizar Turno & Cobrar Saldo
                  </h5>
                  <button
                    onClick={() => setShowCompletePrompt(false)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Volver
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Monto a cobrar ahora ({business?.currency || '$'})</label>
                    <input
                      type="number"
                      min="0"
                      value={collectedAmount}
                      onChange={(e) => setCollectedAmount(Number(e.target.value))}
                      className="w-full p-2 border border-blue-200 rounded-lg bg-white font-bold text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#0F172A] font-black mb-1">Medio de pago</label>
                    <select
                      value={completePaymentMethod}
                      onChange={(e) => setCompletePaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full p-2 border-2 border-slate-300 rounded-lg bg-white text-[#0F172A] font-black outline-none focus:border-[#1E3A8A]"
                    >
                      <option value="efectivo" className="text-[#0F172A] font-bold bg-white">Efectivo</option>
                      <option value="transferencia" className="text-[#0F172A] font-bold bg-white">Transferencia</option>
                      <option value="mercadopago" className="text-[#0F172A] font-bold bg-white">Mercado Pago</option>
                      <option value="tarjeta" className="text-[#0F172A] font-bold bg-white">Tarjeta</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCompleteTurn}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                >
                  Confirmar y Registrar en Caja Diaria
                </button>
              </div>
            ) : null}

            {/* Quick action buttons */}
            {!showCompletePrompt && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                {appointment.status !== 'completado' && (
                  <button
                    type="button"
                    onClick={() => {
                      setCollectedAmount(appointment.remainingBalance);
                      setShowCompletePrompt(true);
                    }}
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Completar y Cobrar</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(appointment);
                  }}
                  className="p-2.5 bg-white border-2 border-slate-300 hover:bg-slate-100 text-[#0F172A] font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Editar / Reprogramar</span>
                </button>

                {appointment.status !== 'cancelado' && (
                  <button
                    type="button"
                    onClick={handleCancelTurn}
                    className="p-2.5 bg-white border-2 border-rose-300 hover:bg-rose-50 text-rose-800 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Cancelar Turno</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDeleteTurn}
                  disabled={isDeleting}
                  className="p-2.5 bg-white border-2 border-slate-300 hover:bg-rose-50 hover:border-rose-400 text-slate-700 hover:text-rose-700 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Eliminar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showWhatsApp && business && (
        <WhatsAppModal
          appointment={appointment}
          business={business}
          onClose={() => setShowWhatsApp(false)}
        />
      )}

      {showMercadoPagoModal && business && (
        <MercadoPagoModal
          appointment={appointment}
          business={business}
          onClose={() => setShowMercadoPagoModal(false)}
          onConfirmDepositPaid={async (amountPaid) => {
            const newDeposit = (appointment.depositAmount || 0) + amountPaid;
            const newRemaining = Math.max(0, appointment.price - newDeposit);
            await updateAppointment({
              ...appointment,
              depositAmount: newDeposit,
              remainingBalance: newRemaining,
              paymentMethod: 'mercadopago',
              status: appointment.status === 'en_espera' || appointment.status === 'pendiente' ? 'confirmado' : appointment.status,
            });
            setShowMercadoPagoModal(false);
          }}
        />
      )}
    </>
  );
}
