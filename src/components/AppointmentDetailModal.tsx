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

  const statusInfo = getStatusBadge(appointment.status);

  const handleCompleteTurn = async () => {
    await markAppointmentCompleted(appointment, Number(collectedAmount), completePaymentMethod);
    setShowCompletePrompt(false);
    onClose();
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${statusInfo.bg}`}>
                <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                {statusInfo.label}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Ref #{appointment.id.slice(-6)}
              </span>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-[#0F172A] border border-slate-300 shadow-2xs">
                {appointment.branchId === 'sucursal_2' ? 'Sucursal 2' : 'Sucursal 1'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
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
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-xs text-slate-400 font-medium flex items-center gap-1 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Servicio
                </div>
                <div className="font-bold text-slate-800">{appointment.serviceName}</div>
                <div className="text-xs text-slate-500 mt-0.5">{appointment.durationMinutes} minutos</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-xs text-slate-400 font-medium flex items-center gap-1 mb-1">
                  <User className="w-3.5 h-3.5 text-sky-600" />
                  Profesional
                </div>
                <div className="font-bold text-slate-800">{appointment.staffName}</div>
                <div className="text-xs text-slate-500 mt-0.5">Especialista</div>
              </div>
            </div>

            {/* Date, Time & Branch */}
            <div className="flex flex-wrap items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-sm gap-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-semibold capitalize">{formatDateSpanishLong(appointment.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                  (appointment.branchId || 'sucursal_1') === 'sucursal_2'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {(appointment.branchId || 'sucursal_1') === 'sucursal_2' ? 'Sucursal 2' : 'Sucursal 1'}
                </span>
                <div className="flex items-center gap-1.5 font-bold text-blue-700 bg-blue-100/60 px-2.5 py-1 rounded-lg text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{appointment.time} hs</span>
                </div>
              </div>
            </div>

            {/* Financial summary */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Precio Total</span>
                <span className="font-bold text-slate-900 text-sm">
                  {formatCurrency(appointment.price, business?.currency)}
                </span>
              </div>
              {appointment.depositAmount > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-700">
                  <span>Seña Abonada</span>
                  <span className="font-bold">
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
                    <label className="block text-slate-600 font-medium mb-1">Medio de pago</label>
                    <select
                      value={completePaymentMethod}
                      onChange={(e) => setCompletePaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full p-2 border border-blue-200 rounded-lg bg-white text-slate-800 outline-none"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="mercadopago">Mercado Pago</option>
                      <option value="tarjeta">Tarjeta</option>
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
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar / Reprogramar</span>
                </button>

                {appointment.status !== 'cancelado' && (
                  <button
                    type="button"
                    onClick={handleCancelTurn}
                    className="p-2.5 border border-rose-200 hover:bg-rose-50 text-rose-700 font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancelar Turno</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDeleteTurn}
                  disabled={isDeleting}
                  className="p-2.5 border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-rose-600 font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
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
