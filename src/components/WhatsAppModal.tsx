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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-300 w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header - Fixed Top */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
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
            className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-[#0F172A]">
          {/* Template pills */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-[#0F172A] mb-2 block">
              Elegir plantilla rápida:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleTemplateChange('reminder')}
                className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  templateType === 'reminder'
                    ? 'border-emerald-700 bg-emerald-100 text-emerald-950 font-black shadow-xs'
                    : 'border-slate-300 hover:border-slate-500 text-[#0F172A] bg-white font-bold'
                }`}
              >
                🔔 Recordatorio de turno
              </button>
              <button
                type="button"
                onClick={() => handleTemplateChange('confirm')}
                className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  templateType === 'confirm'
                    ? 'border-emerald-700 bg-emerald-100 text-emerald-950 font-black shadow-xs'
                    : 'border-slate-300 hover:border-slate-500 text-[#0F172A] bg-white font-bold'
                }`}
              >
                ✨ Confirmación inmediata
              </button>
              <button
                type="button"
                onClick={() => handleTemplateChange('deposit')}
                className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  templateType === 'deposit'
                    ? 'border-emerald-700 bg-emerald-100 text-emerald-950 font-black shadow-xs'
                    : 'border-slate-300 hover:border-slate-500 text-[#0F172A] bg-white font-bold'
                }`}
              >
                💳 Solicitud de seña
              </button>
              <button
                type="button"
                onClick={() => handleTemplateChange('reschedule')}
                className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  templateType === 'reschedule'
                    ? 'border-emerald-700 bg-emerald-100 text-emerald-950 font-black shadow-xs'
                    : 'border-slate-300 hover:border-slate-500 text-[#0F172A] bg-white font-bold'
                }`}
              >
                🗓️ Reprogramar turno
              </button>
            </div>
          </div>

          {/* Editable Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-[#0F172A]">
                Mensaje a enviar:
              </label>
              <span className="text-xs text-slate-600 font-bold">Puedes editar el texto libremente</span>
            </div>
            <textarea
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full text-sm p-3.5 rounded-xl border-2 border-slate-300 focus:border-emerald-600 outline-none text-[#0F172A] font-semibold bg-white resize-none font-sans leading-relaxed shadow-2xs"
            />
          </div>

          {!cleanPhone && (
            <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-950 font-bold text-xs flex items-center gap-2">
              ⚠️ Este cliente no tiene número de teléfono guardado. Puedes copiar el texto manualmente.
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-between pt-2 gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2.5 rounded-xl border-2 border-slate-300 hover:bg-slate-100 text-[#0F172A] font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
                  <span className="text-emerald-800 font-black">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-700" />
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
