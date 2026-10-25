import { useState } from 'react';
import { X, Send, Copy, Check, MessageCircle, Sparkles } from 'lucide-react';
import { Appointment, Business } from '../types';
import { cleanPhoneForWhatsApp, formatDateSpanishLong } from '../utils/formatters';
import { WhatsAppIcon } from './icons/WhatsAppIcon';

interface WhatsAppModalProps {
  appointment: Appointment;
  business: Business;
  onClose: () => void;
}

export function WhatsAppModal({ appointment, business, onClose }: WhatsAppModalProps) {
  const [copied, setCopied] = useState(false);
  const [templateType, setTemplateType] = useState<'confirm' | 'reminder' | 'deposit' | 'reschedule'>('confirm');

  const cleanPhone = cleanPhoneForWhatsApp(appointment.clientPhone, business.phoneCountryPrefix || '+54');
  const formattedDate = formatDateSpanishLong(appointment.date);

  const getTemplateText = (type: string) => {
    switch (type) {
      case 'confirm':
        return `Hola ${appointment.clientName}, te confirmamos tu turno para ${appointment.serviceName} el día ${formattedDate} a las ${appointment.time} hs.`;

      case 'reminder':
        return `🔔 *¡Hola ${appointment.clientName}!* Te recordamos tu turno programado en *${business.name}*:\n\n📅 *Fecha:* ${formattedDate}\n⏰ *Hora:* ${appointment.time} hs\n✂️ *Servicio:* ${appointment.serviceName}\n👤 *Atendido por:* ${appointment.staffName}\n📍 *Lugar:* ${business.address}\n\nPor favor, responde este mensaje para confirmar tu asistencia. ¡Muchas gracias! 💕`;

      case 'deposit':
        return `👋 *¡Hola ${appointment.clientName}!* Para asegurar y confirmar tu turno en *${business.name}* para el *${formattedDate} a las ${appointment.time} hs*, te solicitamos una seña de *${business.currency} ${appointment.depositAmount || Math.round(appointment.price * 0.3)}*.\n\n🏦 *Datos de transferencia:*\n*Alias:* ${business.mercadoPagoAlias || business.cbuAlias || 'agenda.turnos.mp'}\n*Titular:* ${business.name}\n\nUna vez realizado, por favor envíanos el comprobante por acá. ¡Muchas gracias! ✨`;

      case 'reschedule':
        return `👋 *¡Hola ${appointment.clientName}!* Nos comunicamos desde *${business.name}* respecto a tu turno del ${formattedDate}. Quisiéramos coordinar una reprogramación para un horario que te resulte cómodo. ¿En qué días y horarios te vendría bien? Quedamos a tu disposición. 💖`;

      default:
        return '';
    }
  };

  const [message, setMessage] = useState(getTemplateText('confirm'));

  const handleTemplateChange = (type: 'confirm' | 'reminder' | 'deposit' | 'reschedule') => {
    setTemplateType(type);
    setMessage(getTemplateText(type));
  };

  const handleSendWhatsApp = () => {
    if (!cleanPhone) {
      alert('El cliente no tiene un teléfono válido registrado.');
      return;
    }
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <WhatsAppIcon size={24} variant="monochrome" className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Enviar Mensaje de WhatsApp</h3>
              <p className="text-emerald-100 text-xs mt-0.5">
                Para: {appointment.clientName} ({appointment.clientPhone || 'Sin teléfono'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Template pills */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
              Elegir plantilla rápida:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleTemplateChange('reminder')}
                className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                  templateType === 'reminder'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                }`}
              >
                🔔 Recordatorio de turno
              </button>
              <button
                type="button"
                onClick={() => handleTemplateChange('confirm')}
                className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                  templateType === 'confirm'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                }`}
              >
                ✨ Confirmación inmediata
              </button>
              <button
                type="button"
                onClick={() => handleTemplateChange('deposit')}
                className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                  templateType === 'deposit'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                }`}
              >
                💳 Solicitud de seña
              </button>
              <button
                type="button"
                onClick={() => handleTemplateChange('reschedule')}
                className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                  templateType === 'reschedule'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                }`}
              >
                🗓️ Reprogramar turno
              </button>
            </div>
          </div>

          {/* Editable Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Mensaje a enviar:
              </label>
              <span className="text-xs text-slate-400">Puedes editar el texto libremente</span>
            </div>
            <textarea
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full text-sm p-3.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-slate-800 bg-slate-50/30 resize-none font-sans leading-relaxed"
            />
          </div>

          {!cleanPhone && (
            <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl text-[#0F172A] font-bold text-xs flex items-center gap-2">
              ⚠️ Este cliente no tiene número de teléfono guardado. Puedes copiar el texto manualmente.
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-between pt-2 gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-sm flex items-center gap-2 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copiar texto</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={!cleanPhone}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none text-white font-semibold text-sm flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <WhatsAppIcon size={16} variant="monochrome" />
              <span>Abrir en WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
