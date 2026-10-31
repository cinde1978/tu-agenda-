import React, { useState } from 'react';
import {
  X,
  Gift,
  DollarSign,
  Sparkles,
  User,
  Phone,
  MessageSquare,
  Building2,
  Calendar,
  CheckCircle2,
  Wallet,
} from 'lucide-react';
import { GiftCard, GiftCardType, PaymentMethod, StaffBranchScope } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';

interface GiftCardModalProps {
  onClose: () => void;
  onSuccess?: (giftCardId: string) => void;
}

export function GiftCardModal({ onClose, onSuccess }: GiftCardModalProps) {
  const { services, business, selectedBranch, createGiftCard } = useApp();

  const [type, setType] = useState<GiftCardType>('monto');
  const [amount, setAmount] = useState<number>(15000);
  const [serviceId, setServiceId] = useState<string>(services[0]?.id || '');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [message, setMessage] = useState('');
  const [branchScope, setBranchScope] = useState<StaffBranchScope>(selectedBranch);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mercadopago');
  const [registerInCash, setRegisterInCash] = useState(true);

  // Expiry date (default 6 months from now)
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedService = services.find((s) => s.id === serviceId);

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
    if (type === 'monto' && (!amount || amount <= 0)) {
      setErrorMsg('Por favor ingresá un monto válido mayor a $0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const randomCode = `SOHAM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const effectiveAmount = type === 'monto' ? amount : selectedService?.price || 0;

      const createdId = await createGiftCard(
        {
          code: randomCode,
          type,
          amount: effectiveAmount,
          serviceId: type === 'tratamiento' ? serviceId : undefined,
          serviceName: type === 'tratamiento' ? selectedService?.name : undefined,
          buyerName: buyerName.trim(),
          buyerPhone: buyerPhone.trim() || undefined,
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim() || undefined,
          message: message.trim() || undefined,
          branchId: branchScope,
          status: 'activa',
          paymentMethod,
          issueDate: new Date().toISOString().split('T')[0],
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
                Soham Belleza & Bienestar
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-[#0F172A]">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs font-bold">
              {errorMsg}
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
                onClick={() => setType('monto')}
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
                onClick={() => setType('tratamiento')}
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
                  Monto a regalar ($ ARS) *
                </label>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border-2 border-slate-300 bg-white font-black text-sm text-[#0F172A] focus:border-[#1E3A8A] outline-none"
                  placeholder="Ej. 15000"
                />
              </div>
            ) : (
              <div className="pt-2">
                <label className="text-xs font-bold text-[#0F172A] block mb-1">
                  Seleccionar Servicio / Tratamiento *
                </label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-2 border-slate-300 bg-white font-bold text-xs sm:text-sm text-[#0F172A] focus:border-[#1E3A8A] outline-none cursor-pointer"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({formatCurrency(s.price, business?.currency)})
                    </option>
                  ))}
                </select>
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
                  placeholder="Ej. Paula Santillán"
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
                  placeholder="+54 9 341 ..."
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
                  placeholder="Ej. Martín Díaz"
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
                  placeholder="+54 9 341 ..."
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
                placeholder="Ej. ¡Feliz cumple! Que disfrutes mucho esta tarde de relax en Soham..."
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
                  <option value="ambas">Ambas Sucursales</option>
                  <option value="sucursal_1">Soham Montevideo</option>
                  <option value="sucursal_2">Soham Rioja</option>
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
                  <option value="mercadopago">Mercado Pago</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta Débito/Crédito</option>
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
              className="px-4 py-2.5 rounded-xl border-2 border-slate-300 text-xs font-black text-[#0F172A] hover:bg-slate-100 transition-colors cursor-pointer"
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
