import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, QrCode, CreditCard, ShieldCheck, MessageCircle, DollarSign, Sparkles } from 'lucide-react';
import { Appointment, Business } from '../../types';
import { formatCurrency, formatDateSpanish, cleanPhoneForWhatsApp } from '../../utils/formatters';
import { MercadoPagoIcon, WhatsAppIcon } from '../icons';

export interface MercadoPagoModalProps {
  appointment: Partial<Appointment>;
  business: Business;
  onClose: () => void;
  onConfirmDepositPaid?: (amountPaid: number, method: 'mercadopago') => void;
  defaultAmount?: number;
}

export function MercadoPagoModal({
  appointment,
  business,
  onClose,
  onConfirmDepositPaid,
  defaultAmount,
}: MercadoPagoModalProps) {
  // Suggested deposit: either passed in defaultAmount, existing depositAmount, or 30% of price
  const basePrice = appointment.price || 0;
  const suggestedDeposit = defaultAmount ?? (
    appointment.depositAmount && appointment.depositAmount > 0
      ? appointment.depositAmount
      : Math.max(1000, Math.round((basePrice * (business.defaultDepositPercentage || 30)) / 100))
  );

  const [depositAmount, setDepositAmount] = useState<number>(suggestedDeposit);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [copiedCvu, setCopiedCvu] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'link' | 'transfer'>('qr');

  const mpAlias = business.mercadoPagoAlias || business.cbuAlias || 'agenda.turnos.mp';
  const mpCvu = business.mercadoPagoCvu || '0000003100085492109482';
  
  // Realistic Mercado Pago checkout link
  const checkoutId = (appointment.id || `apt_${Date.now()}`).slice(-6);
  const paymentLink = `https://mpago.la/pos/sena-${checkoutId}?amount=${depositAmount}&ref=${encodeURIComponent(appointment.clientName || 'cliente')}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(paymentLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleCopyAlias = () => {
    navigator.clipboard.writeText(mpAlias);
    setCopiedAlias(true);
    setTimeout(() => setCopiedAlias(false), 2200);
  };

  const handleCopyCvu = () => {
    navigator.clipboard.writeText(mpCvu);
    setCopiedCvu(true);
    setTimeout(() => setCopiedCvu(false), 2200);
  };

  const handleOpenCheckout = () => {
    window.open(paymentLink, '_blank', 'noopener,noreferrer');
  };

  const handleSendWhatsAppPayment = () => {
    const rawPhone = appointment.clientPhone || '';
    const phone = cleanPhoneForWhatsApp(rawPhone, business.phoneCountryPrefix || '+54');
    
    if (!phone) {
      alert('El cliente no tiene un número telefónico asignado.');
      return;
    }

    const formattedDate = appointment.date ? formatDateSpanish(appointment.date) : 'la fecha seleccionada';
    const clientName = appointment.clientName || 'Estimado/a cliente';
    const serviceName = appointment.serviceName || 'tu turno';
    const amountStr = formatCurrency(depositAmount, business.currency);

    const message = `✨ *¡Hola ${clientName}!* Te enviamos el enlace de cobro de seña para confirmar tu turno de *${serviceName}* en *${business.name}* el día *${formattedDate} a las ${appointment.time || '10:00'} hs*:\n\n` +
      `💳 *Monto de Seña:* ${amountStr}\n` +
      `🔗 *Link de Pago Mercado Pago:* ${paymentLink}\n\n` +
      `🏦 *O transferencia directa sin recargo:*\n` +
      `• *Alias Mercado Pago:* ${mpAlias}\n` +
      `• *CVU:* ${mpCvu}\n` +
      `• *Titular:* ${business.name}\n\n` +
      `Una vez abonado, te confirmamos el turno automáticamente. ¡Muchas gracias! 💕`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleMarkAsPaid = () => {
    if (onConfirmDepositPaid) {
      onConfirmDepositPaid(depositAmount, 'mercadopago');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Mercado Pago Header */}
        <div className="bg-gradient-to-r from-[#009EE3] to-[#0074B7] px-6 py-5 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <MercadoPagoIcon size={40} variant="badge" className="shadow-md ring-2 ring-white/30" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg leading-tight text-white tracking-tight">
                  Mercado Pago Cobros
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/20 text-white tracking-wider">
                  Oficial
                </span>
              </div>
              <p className="text-sky-100 text-xs mt-0.5 font-medium">
                Cobro de seña para {appointment.clientName || 'Cliente'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl text-white/90 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-slate-800">
          
          {/* Appointment Context Summary */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500 font-medium block">Servicio & Cliente</span>
              <span className="font-bold text-slate-900 text-sm">{appointment.serviceName || 'Turno'}</span>
              <span className="text-slate-600 block mt-0.5">
                {appointment.clientName || 'Cliente'} • {appointment.date || ''} {appointment.time ? `(${appointment.time} hs)` : ''}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-slate-500 font-medium block">Precio Total</span>
              <span className="font-extrabold text-slate-900 text-sm">
                {formatCurrency(basePrice, business.currency)}
              </span>
            </div>
          </div>

          {/* Amount of Seña to Charge */}
          <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-sky-950 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#009EE3]" />
                Monto de Seña a Cobrar
              </label>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-sky-800">
                <button
                  type="button"
                  onClick={() => setDepositAmount(Math.round(basePrice * 0.3))}
                  className="px-2 py-0.5 rounded-lg bg-sky-200/60 hover:bg-sky-200 transition-colors"
                >
                  30%
                </button>
                <button
                  type="button"
                  onClick={() => setDepositAmount(Math.round(basePrice * 0.5))}
                  className="px-2 py-0.5 rounded-lg bg-sky-200/60 hover:bg-sky-200 transition-colors"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => setDepositAmount(basePrice)}
                  className="px-2 py-0.5 rounded-lg bg-sky-200/60 hover:bg-sky-200 transition-colors"
                >
                  100%
                </button>
              </div>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-3 text-sm font-extrabold text-sky-900">
                {business.currency || '$'}
              </span>
              <input
                type="number"
                min="0"
                step="50"
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-sky-300 bg-white font-extrabold text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#009EE3]/30"
              />
            </div>
            <p className="text-[11px] text-sky-700">
              Saldo a abonar en el salón: <strong>{formatCurrency(Math.max(0, basePrice - depositAmount), business.currency)}</strong>
            </p>
          </div>

          {/* Selector Tabs: QR / Link / Transfer */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab('qr')}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'qr'
                  ? 'bg-white text-[#009EE3] shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Dinámico</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('link')}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'link'
                  ? 'bg-white text-[#009EE3] shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Link de Pago</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('transfer')}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'transfer'
                  ? 'bg-white text-[#009EE3] shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Alias / CVU</span>
            </button>
          </div>

          {/* TAB 1: QR CODE */}
          {activeTab === 'qr' && (
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
              {/* Authentic Mercado Pago Styled QR Box */}
              <div className="relative p-3 bg-white rounded-2xl border-2 border-[#009EE3] shadow-md flex flex-col items-center">
                <svg
                  width="180"
                  height="180"
                  viewBox="0 0 180 180"
                  className="w-44 h-44"
                >
                  {/* Outer QR Mock Matrix Pattern */}
                  <rect x="0" y="0" width="180" height="180" fill="#FFFFFF" rx="12" />
                  
                  {/* Top Left Marker */}
                  <rect x="14" y="14" width="40" height="40" rx="6" fill="#009EE3" />
                  <rect x="20" y="20" width="28" height="28" rx="4" fill="#FFFFFF" />
                  <rect x="26" y="26" width="16" height="16" rx="2" fill="#009EE3" />
                  
                  {/* Top Right Marker */}
                  <rect x="126" y="14" width="40" height="40" rx="6" fill="#009EE3" />
                  <rect x="132" y="20" width="28" height="28" rx="4" fill="#FFFFFF" />
                  <rect x="138" y="26" width="16" height="16" rx="2" fill="#009EE3" />

                  {/* Bottom Left Marker */}
                  <rect x="14" y="126" width="40" height="40" rx="6" fill="#009EE3" />
                  <rect x="20" y="132" width="28" height="28" rx="4" fill="#FFFFFF" />
                  <rect x="26" y="138" width="16" height="16" rx="2" fill="#009EE3" />

                  {/* Data Dots Pattern */}
                  <g fill="#1E293B">
                    <rect x="64" y="18" width="8" height="8" rx="2" />
                    <rect x="82" y="18" width="8" height="8" rx="2" />
                    <rect x="100" y="18" width="8" height="8" rx="2" />

                    <rect x="64" y="36" width="16" height="8" rx="2" />
                    <rect x="90" y="36" width="8" height="8" rx="2" />
                    <rect x="108" y="36" width="8" height="8" rx="2" />

                    <rect x="18" y="64" width="8" height="16" rx="2" />
                    <rect x="36" y="64" width="16" height="8" rx="2" />
                    <rect x="64" y="64" width="8" height="8" rx="2" />
                    <rect x="80" y="64" width="16" height="8" rx="2" />
                    <rect x="108" y="64" width="16" height="8" rx="2" />
                    <rect x="136" y="64" width="8" height="16" rx="2" />
                    <rect x="154" y="64" width="8" height="8" rx="2" />

                    <rect x="18" y="90" width="16" height="8" rx="2" />
                    <rect x="44" y="90" width="8" height="8" rx="2" />
                    <rect x="64" y="82" width="8" height="16" rx="2" />
                    <rect x="126" y="90" width="16" height="8" rx="2" />
                    <rect x="152" y="90" width="8" height="8" rx="2" />

                    <rect x="64" y="108" width="16" height="8" rx="2" />
                    <rect x="90" y="108" width="8" height="8" rx="2" />
                    <rect x="108" y="108" width="16" height="8" rx="2" />
                    <rect x="136" y="108" width="8" height="8" rx="2" />

                    <rect x="64" y="126" width="8" height="16" rx="2" />
                    <rect x="82" y="136" width="16" height="8" rx="2" />
                    <rect x="108" y="126" width="8" height="16" rx="2" />
                    <rect x="126" y="136" width="16" height="8" rx="2" />
                    <rect x="152" y="126" width="8" height="16" rx="2" />

                    <rect x="64" y="152" width="16" height="8" rx="2" />
                    <rect x="90" y="152" width="8" height="8" rx="2" />
                    <rect x="108" y="152" width="16" height="8" rx="2" />
                    <rect x="136" y="152" width="16" height="8" rx="2" />
                  </g>

                  {/* Central Mercado Pago Emblem */}
                  <rect x="70" y="70" width="40" height="40" rx="10" fill="#009EE3" stroke="#FFFFFF" strokeWidth="3" />
                  <text x="90" y="95" fill="#FFFFFF" fontSize="16" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                    MP
                  </text>
                </svg>

                <div className="mt-2 text-center">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Escaneá con Mercado Pago o cualquier billetera
                  </span>
                  <span className="text-xs font-black text-[#009EE3]">
                    {formatCurrency(depositAmount, business.currency)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LINK DE PAGO */}
          {activeTab === 'link' && (
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                Enlace Directo de Checkout Mercado Pago
              </label>
              
              <div className="flex items-center gap-2 bg-white border border-slate-200 p-2.5 rounded-xl">
                <input
                  type="text"
                  readOnly
                  value={paymentLink}
                  className="text-xs font-mono text-slate-600 bg-transparent flex-1 outline-none truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenCheckout}
                  className="flex-1 py-2.5 px-3 bg-[#009EE3] hover:bg-[#0089C7] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Checkout en nueva pestaña</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: TRANSFERENCIA ALIAS / CVU */}
          {activeTab === 'transfer' && (
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Alias de Mercado Pago
                  </span>
                  <span className="font-mono font-bold text-sm text-slate-900">{mpAlias}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyAlias}
                  className="px-3 py-1.5 rounded-lg bg-sky-50 text-[#009EE3] text-xs font-bold hover:bg-sky-100 transition-colors flex items-center gap-1"
                >
                  {copiedAlias ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAlias ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    CVU de Mercado Pago
                  </span>
                  <span className="font-mono text-xs text-slate-700">{mpCvu}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCvu}
                  className="px-3 py-1.5 rounded-lg bg-sky-50 text-[#009EE3] text-xs font-bold hover:bg-sky-100 transition-colors flex items-center gap-1"
                >
                  {copiedCvu ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCvu ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                Titular: <strong>{business.name}</strong> • Acreditación instantánea sin comisiones
              </p>
            </div>
          )}

          {/* WhatsApp Action Button */}
          <button
            type="button"
            onClick={handleSendWhatsAppPayment}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <WhatsAppIcon size={18} variant="monochrome" />
            <span>Enviar Link de Seña por WhatsApp al Cliente</span>
          </button>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-200/60 text-slate-700 text-xs font-bold transition-colors"
          >
            Cerrar
          </button>

          {onConfirmDepositPaid && (
            <button
              type="button"
              onClick={handleMarkAsPaid}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-98"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Marcar Seña como Pagada ({formatCurrency(depositAmount, business.currency)})</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
