import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Gift,
  DollarSign,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  ENABLED_PAYMENT_METHOD_OPTIONS,
  GiftCardType,
  PaymentMethod,
  StaffBranchScope,
} from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { getBranchBusinessConfig, getTodayDateString } from '../../utils/initialData';

interface GiftCardModalProps {
  onClose: () => void;
  onSuccess?: (giftCardId: string) => void;
}

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  mercadopago: 'Mercado Pago',
  tarjeta: 'Tarjeta Débito/Crédito',
};

export function GiftCardModal({ onClose, onSuccess }: GiftCardModalProps) {
  const { services, business, selectedBranch, createGiftCard } = useApp();

  // Only show active, non-deleted configured services
  const activeServices = useMemo(() => services.filter((s) => s.active), [services]);

  const [type, setType] = useState<GiftCardType>('monto');
  const [amountInput, setAmountInput] = useState<string>('');
  const [serviceId, setServiceId] = useState<string>(activeServices[0]?.id || '');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [message, setMessage] = useState('');
  const [branchScope, setBranchScope] = useState<StaffBranchScope>(selectedBranch);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [registerInCash, setRegisterInCash] = useState(true);

  // Expiry date (default 6 months from now)
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (activeServices.length === 0) {
      if (serviceId !== '') setServiceId('');
    } else if (!activeServices.some((s) => s.id === serviceId)) {
      setServiceId(activeServices[0].id);
    }
  }, [activeServices, serviceId]);

  const availablePaymentMethods = useMemo(() => {
    if (branchScope === 'sucursal_1' || branchScope === 'sucursal_2') {
      return getBranchBusinessConfig(business, branchScope).enabledPaymentMethods;
    }
    return ENABLED_PAYMENT_METHOD_OPTIONS;
  }, [business, branchScope]);

  useEffect(() => {
    if (availablePaymentMethods.length > 0 && !availablePaymentMethods.includes(paymentMethod)) {
      setPaymentMethod(availablePaymentMethods[0]);
    }
  }, [availablePaymentMethods, paymentMethod]);

  const selectedService = activeServices.find((s) => s.id === serviceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!recipientName.trim()) {
      setErrorMsg('Por favor indicá el nombre de la persona agasajada (destinatario).');
      return;
    }
    if (!buyerName.trim()) {
      setErrorMsg('Por favor indicá el nombre de la persona que compra el voucher.');
      return;
    }

    const numericAmount = Number(amountInput);
    if (type === 'monto' && (!Number.isFinite(numericAmount) || numericAmount <= 0)) {
      setErrorMsg('Por favor ingresá un monto válido mayor a $0.');
      return;
    }
    if (type === 'tratamiento' && (!serviceId || !selectedService)) {
      setErrorMsg('Primero debés crear y activar al menos un servicio en Servicios o Ajustes.');
      return;
    }

    setIsSubmitting(true);
    try {
      const randomCode = `SOHAM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const effectiveAmount = type === 'monto' ? numericAmount : selectedService?.price || 0;

      const createdId = await createGiftCard(
        {
          code: randomCode,
          type,
          amount: effectiveAmount,
          serviceId: type === 'tratamiento' ? selectedService?.id : undefined,
          serviceName: type === 'tratamiento' ? selectedService?.name : undefined,
          buyerName: buyerName.trim(),
          buyerPhone: buyerPhone.trim() || undefined,
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim() || undefined,
          message: message.trim() || undefined,
          branchId: branchScope,
          status: 'activa',
          paymentMethod,
          issueDate: getTodayDateString(),
          expiryDate: expiryDate || undefined,
        },
        registerInCash
      );

      if (onSuccess) onSuccess(createdId);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al emitir el voucher');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border-2 border-slate-300 max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#1E3A8A] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <Gift className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight text-white">
                Emitir Nueva Gift Card / Voucher
              </h3>
              <p className="text-xs text-blue-100 font-medium">
                Soham Montevideo & Soham Rioja
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Body */}
        <form noValidate onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-[#0F172A]">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs font-black flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Tipo de Voucher */}
          <div className="bg-slate-50 p-3.5 rounded-xl border-2 border-slate-300 space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-[#0F172A] block">
              1. Modalidad del Voucher
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setType('monto');
                }}
                className={`p-3 rounded-xl border-2 text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  type === 'monto'
                    ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                    : 'bg-white text-[#0F172A] border-slate-300 hover:border-slate-400'
                }`}
              >
                <DollarSign className="w-4 h-4 stroke-[2.5]" />
                <span>Por Monto ($)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setType('tratamiento');
                }}
                className={`p-3 rounded-xl border-2 text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  type === 'tratamiento'
                    ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                    : 'bg-white text-[#0F172A] border-slate-300 hover:border-slate-400'
                }`}
              >
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                <span>Por Tratamiento</span>
              </button>
            </div>

            {type === 'monto' ? (
              <div className="pt-2">
                <label className="text-xs font-bold text-[#0F172A] block mb-1">
                  Monto a regalar ({business?.currency || '$'}) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={amountInput}
                  onChange={(e) => {
                    setErrorMsg(null);
                    setAmountInput(e.target.value);
                  }}
                  className="w-full p-2.5 rounded-xl border-2 border-slate-300 bg-white font-black text-sm text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                  placeholder="Ingresá libremente el importe en pesos"
                />
              </div>
            ) : (
              <div className="pt-2 space-y-2">
                <label className="text-xs font-bold text-[#0F172A] block">
                  Seleccionar Servicio / Tratamiento Activo *
                </label>
                <select
                  value={serviceId}
                  onChange={(e) => {
                    setErrorMsg(null);
                    setServiceId(e.target.value);
                  }}
                  className="w-full p-2.5 rounded-xl border-2 border-slate-300 bg-white font-bold text-xs sm:text-sm text-[#0F172A] focus:border-[#1E3A8A] outline-none cursor-pointer"
                >
                  {activeServices.length === 0 ? (
                    <option value="">-- Sin servicios activos configurados --</option>
                  ) : (
                    activeServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({formatCurrency(s.price, business?.currency)})
                      </option>
                    ))
                  )}
                </select>
                {selectedService && (
                  <div className="px-3 py-2 rounded-xl bg-white border border-blue-200 text-xs font-bold text-[#0F172A] flex items-center justify-between">
                    <span>Precio vigente del tratamiento:</span>
                    <span className="font-black text-[#1E3A8A]">
                      {formatCurrency(selectedService.price, business?.currency)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Datos de los protagonistas */}
          <div className="bg-slate-50 p-3.5 rounded-xl border-2 border-slate-300 space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-[#0F172A] block">
              2. Destinatario y Comprador
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">
                  Para (Destinatario / Agasajado) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nombre del destinatario"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-2 border-slate-300 bg-white font-bold text-xs sm:text-sm text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">
                  Teléfono / WhatsApp Agasajado
                </label>
                <input
                  type="tel"
                  placeholder="Teléfono o WhatsApp (opcional)"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-2 border-slate-300 bg-white font-bold text-xs sm:text-sm text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">
                  De parte de (Comprador) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nombre de quien regala"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-2 border-slate-300 bg-white font-bold text-xs sm:text-sm text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">
                  WhatsApp Comprador
                </label>
                <input
                  type="tel"
                  placeholder="Teléfono o WhatsApp (opcional)"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-2 border-slate-300 bg-white font-bold text-xs sm:text-sm text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="text-xs font-bold text-[#0F172A] block mb-1">
                Dedicatoria o Mensaje Especial
              </label>
              <textarea
                rows={2}
                placeholder="Mensaje o dedicatoria (opcional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-2.5 rounded-xl border-2 border-slate-300 bg-white font-medium text-xs sm:text-sm text-[#0F172A] focus:border-[#1E3A8A] outline-none"
              />
            </div>
          </div>

          {/* Sucursal, Pago y Vencimiento */}
          <div className="bg-slate-50 p-3.5 rounded-xl border-2 border-slate-300 space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-[#0F172A] block">
              3. Sucursal de Validez & Pago
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">
                  Validez de Sucursal
                </label>
                <select
                  value={branchScope}
                  onChange={(e) => setBranchScope(e.target.value as StaffBranchScope)}
                  className="w-full p-2.5 rounded-xl border-2 border-slate-300 bg-white font-bold text-xs sm:text-sm text-[#0F172A] focus:border-[#1E3A8A] outline-none cursor-pointer"
                >
                  <option value="sucursal_1">Soham Montevideo</option>
                  <option value="sucursal_2">Soham Rioja</option>
                  <option value="ambas">Ambas Sucursales</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">
                  Medio de Pago Cobrado
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full p-2.5 rounded-xl border-2 border-slate-300 bg-white font-bold text-xs sm:text-sm text-[#0F172A] focus:border-[#1E3A8A] outline-none cursor-pointer"
                >
                  {availablePaymentMethods.map((m) => (
                    <option key={m} value={m}>
                      {PAYMENT_LABELS[m] || m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-2 border-slate-300 bg-white font-bold text-xs sm:text-sm text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                />
              </div>
            </div>

            {/* Checkbox Caja Diaria */}
            <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={registerInCash}
                onChange={(e) => setRegisterInCash(e.target.checked)}
                className="w-4 h-4 rounded text-[#1E3A8A] focus:ring-[#1E3A8A] cursor-pointer"
              />
              <span className="text-xs font-black text-[#0F172A]">
                Registrar ingreso de venta automáticamente en la Caja Diaria
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white border-2 border-slate-300 text-xs font-black text-[#0F172A] hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#1E3A8A] hover:bg-blue-900 active:scale-98 text-white text-xs font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Gift className="w-4 h-4 stroke-[2.5]" />
              <span>{isSubmitting ? 'Generando...' : 'Generar Gift Card'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
