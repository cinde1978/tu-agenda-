import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  ShieldCheck,
  DollarSign,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { Appointment, BranchId, Business } from '../../types';
import {
  formatCurrency,
  formatDateSpanish,
  cleanPhoneForWhatsApp,
  openExternalUrlSafely,
} from '../../utils/formatters';
import { getBranchBusinessConfig } from '../../utils/initialData';
import { MercadoPagoIcon, WhatsAppIcon } from '../icons';

export interface MercadoPagoModalProps {
  appointment: Partial<Appointment>;
  business: Business;
  branchId?: BranchId;
  onClose: () => void;
  onConfirmDepositPaid?: (amountPaid: number, method: 'mercadopago') => void;
  defaultAmount?: number;
}

export function MercadoPagoModal({
  appointment,
  business,
  branchId,
  onClose,
  onConfirmDepositPaid,
  defaultAmount,
}: MercadoPagoModalProps) {
  const effectiveBranch: BranchId = branchId || appointment.branchId || 'sucursal_1';
  const branchCfg = getBranchBusinessConfig(business, effectiveBranch);

  const basePrice = appointment.price || 0;
  const suggestedDeposit =
    defaultAmount ??
    (appointment.depositAmount && appointment.depositAmount > 0
      ? appointment.depositAmount
      : Math.max(0, Math.round((basePrice * (business.defaultDepositPercentage || 30)) / 100)));

  const [depositAmount, setDepositAmount] = useState<number>(suggestedDeposit);
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [copiedCvu, setCopiedCvu] = useState(false);
  const [copiedCbu, setCopiedCbu] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const mpAlias = branchCfg.mercadoPagoAlias.trim();
  const mpCvu = branchCfg.mercadoPagoCvu.trim();
  const bankAlias = branchCfg.cbuAlias.trim();
  const hasConfiguredData = Boolean(mpAlias || mpCvu || bankAlias);

  const handleCopyText = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setter(true);
    setTimeout(() => setter(false), 2200);
  };

  const handleSendWhatsAppPayment = () => {
    setFeedbackError(null);
    const rawPhone = appointment.clientPhone || '';
    const phone = cleanPhoneForWhatsApp(rawPhone, business.phoneCountryPrefix || '+54');

    if (!phone) {
      setFeedbackError(
        'El cliente no tiene un número telefónico asignado. Cargá su teléfono en la ficha o copiá los datos manualmente.'
      );
      return;
    }

    const formattedDate = appointment.date
      ? formatDateSpanish(appointment.date)
      : 'la fecha seleccionada';
    const clientName = appointment.clientName || 'Estimado/a cliente';
    const serviceName = appointment.serviceName || 'tu turno';
    const amountStr = formatCurrency(depositAmount, business.currency);

    const transferLines = [
      mpAlias ? `• *Alias Mercado Pago:* ${mpAlias}` : '',
      mpCvu ? `• *CVU Mercado Pago:* ${mpCvu}` : '',
      bankAlias && bankAlias !== mpAlias ? `• *CBU / Alias Bancario:* ${bankAlias}` : '',
      `• *Sucursal:* ${branchCfg.name} (${branchCfg.address})`,
    ]
      .filter(Boolean)
      .join('\n');

    const message =
      `✨ *¡Hola ${clientName}!* Te compartimos los datos para abonar la seña de tu turno de *${serviceName}* en *${branchCfg.name}* el día *${formattedDate}${
        appointment.time ? ` a las ${appointment.time} hs` : ''
      }*:\n\n` +
      `💳 *Monto de Seña:* ${amountStr}\n\n` +
      (hasConfiguredData
        ? `🏦 *Datos de pago configurados:*\n${transferLines}\n\n`
        : `📍 *Sucursal:* ${branchCfg.name} (${branchCfg.address})\n\n`) +
      `Una vez realizado el pago, por favor envianos el comprobante por este medio para registrarlo en tu turno. ¡Muchas gracias!`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    openExternalUrlSafely(url);
  };

  const handleMarkAsPaid = () => {
    if (depositAmount <= 0) {
      setFeedbackError('Ingresá un monto de seña mayor a $0 para registrarlo como pagado.');
      return;
    }
    if (onConfirmDepositPaid) {
      onConfirmDepositPaid(depositAmount, 'mercadopago');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-300 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] text-[#0F172A]">
        {/* Header */}
        <div className="bg-[#1E3A8A] px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <MercadoPagoIcon size={38} variant="badge" className="shadow-sm ring-2 ring-white/25" />
            <div>
              <h3 className="font-black text-base sm:text-lg leading-tight text-white">
                Cobro de Seña — Mercado Pago / Transferencia
              </h3>
              <p className="text-blue-100 text-xs mt-0.5 font-semibold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>{branchCfg.name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {feedbackError && (
            <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <span>{feedbackError}</span>
            </div>
          )}

          {/* Appointment Context Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-600 font-bold block">Servicio & Cliente</span>
              <span className="font-black text-[#0F172A] text-sm">
                {appointment.serviceName || 'Turno'}
              </span>
              <span className="text-slate-700 font-semibold block mt-0.5">
                {appointment.clientName || 'Cliente'}
                {appointment.date ? ` • ${appointment.date}` : ''}
                {appointment.time ? ` (${appointment.time} hs)` : ''}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-slate-600 font-bold block">Precio Total</span>
              <span className="font-black text-[#0F172A] text-sm">
                {formatCurrency(basePrice, business.currency)}
              </span>
            </div>
          </div>

          {/* Amount of Seña to Charge */}
          <div className="bg-blue-50/60 border-2 border-blue-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-black text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#1E3A8A]" />
                Monto de Seña a Registrar
              </label>
              <div className="flex items-center gap-1.5 text-xs font-black">
                <button
                  type="button"
                  onClick={() => setDepositAmount(Math.round(basePrice * 0.3))}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-100 text-[#0F172A] border border-blue-300 cursor-pointer"
                >
                  30%
                </button>
                <button
                  type="button"
                  onClick={() => setDepositAmount(Math.round(basePrice * 0.5))}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-100 text-[#0F172A] border border-blue-300 cursor-pointer"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => setDepositAmount(basePrice)}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-100 text-[#0F172A] border border-blue-300 cursor-pointer"
                >
                  100%
                </button>
              </div>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-3 text-sm font-black text-[#0F172A]">
                {business.currency || '$'}
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={depositAmount}
                onChange={(e) => {
                  setFeedbackError(null);
                  setDepositAmount(Number(e.target.value));
                }}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white font-black text-lg text-[#0F172A] focus:outline-none focus:border-[#1E3A8A]"
              />
            </div>
            <p className="text-xs font-bold text-slate-700">
              Saldo restante en el salón:{' '}
              <strong className="text-[#0F172A]">
                {formatCurrency(Math.max(0, basePrice - depositAmount), business.currency)}
              </strong>
            </p>
          </div>

          {/* Configured Payment Details for Selected Branch */}
          <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-xl space-y-3">
            <div className="text-xs font-black uppercase tracking-wider text-[#0F172A]">
              Datos de Cobro Configurados — {branchCfg.name}
            </div>

            {!hasConfiguredData ? (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 font-semibold space-y-1">
                <p className="font-black">Sin alias ni CVU cargados en {branchCfg.name}</p>
                <p>
                  Los campos de cobro están vacíos hasta que cargues los datos reales de esta
                  sucursal en <strong>Ajustes del negocio → Configuración por Sucursal</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {mpAlias && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black text-slate-500 uppercase block">
                        Alias de Mercado Pago
                      </span>
                      <span className="font-mono font-black text-sm text-[#0F172A]">
                        {mpAlias}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(mpAlias, setCopiedAlias)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0F172A] border border-slate-300 text-xs font-black flex items-center gap-1 cursor-pointer"
                    >
                      {copiedAlias ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedAlias ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                )}

                {mpCvu && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black text-slate-500 uppercase block">
                        CVU de Mercado Pago
                      </span>
                      <span className="font-mono font-bold text-xs text-[#0F172A]">{mpCvu}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(mpCvu, setCopiedCvu)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0F172A] border border-slate-300 text-xs font-black flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCvu ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedCvu ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                )}

                {bankAlias && bankAlias !== mpAlias && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black text-slate-500 uppercase block">
                        CBU / Alias Bancario
                      </span>
                      <span className="font-mono font-bold text-xs text-[#0F172A]">
                        {bankAlias}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(bankAlias, setCopiedCbu)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0F172A] border border-slate-300 text-xs font-black flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCbu ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedCbu ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* WhatsApp Action Button */}
          <button
            type="button"
            onClick={handleSendWhatsAppPayment}
            className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <WhatsAppIcon size={18} variant="monochrome" />
            <span>Enviar Solicitud de Seña por WhatsApp</span>
          </button>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-white border-t-2 border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white border-2 border-slate-300 hover:bg-slate-100 text-[#0F172A] text-xs font-black transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          {onConfirmDepositPaid && (
            <button
              type="button"
              onClick={handleMarkAsPaid}
              className="px-5 py-2.5 rounded-xl bg-[#1E3A8A] hover:bg-blue-900 text-white text-xs font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                Registrar Seña Abonada ({formatCurrency(depositAmount, business.currency)})
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
