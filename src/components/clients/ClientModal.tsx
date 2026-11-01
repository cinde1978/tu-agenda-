import React, { useState, useMemo } from 'react';
import { X, User, Phone, Mail, Calendar, FileText, Check, AlertTriangle, MessageCircle, Copy } from 'lucide-react';
import { Client } from '../../types';
import { useApp } from '../../context/AppContext';

interface ClientModalProps {
  clientToEdit?: Client | null;
  onClose: () => void;
  onSaved: (clientId: string) => void;
}

export function ClientModal({ clientToEdit, onClose, onSaved }: ClientModalProps) {
  const { clients, createClient, updateClient } = useApp();
  const [name, setName] = useState(clientToEdit?.name || '');
  const [phone, setPhone] = useState(clientToEdit?.phone || '');
  const [whatsapp, setWhatsapp] = useState(clientToEdit?.whatsapp || clientToEdit?.phone || '');
  const [email, setEmail] = useState(clientToEdit?.email || '');
  const [birthday, setBirthday] = useState(clientToEdit?.birthday || '');
  const [notes, setNotes] = useState(clientToEdit?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Check for potential duplicate clients
  const duplicateClient = useMemo(() => {
    const trimmedName = name.trim().toLowerCase();
    const phoneDigits = phone.replace(/\D/g, '');
    const waDigits = whatsapp.replace(/\D/g, '');

    if (!trimmedName && !phoneDigits && !waDigits) return null;

    return clients.find((c) => {
      // Exclude self if editing
      if (clientToEdit && c.id === clientToEdit.id) return false;

      // Match name
      if (trimmedName && c.name.trim().toLowerCase() === trimmedName) {
        return true;
      }

      // Match phone or whatsapp digits if at least 6 digits
      const cPhoneDigits = (c.phone || '').replace(/\D/g, '');
      const cWaDigits = (c.whatsapp || '').replace(/\D/g, '');

      if (phoneDigits && phoneDigits.length >= 6) {
        if (cPhoneDigits === phoneDigits || cWaDigits === phoneDigits) return true;
      }
      if (waDigits && waDigits.length >= 6) {
        if (cPhoneDigits === waDigits || cWaDigits === waDigits) return true;
      }

      return false;
    });
  }, [name, phone, whatsapp, clients, clientToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = name.trim();
    if (!cleanName) {
      setFormError('Por favor ingresa el nombre y apellido del cliente.');
      return;
    }

    if (duplicateClient) {
      setFormError(
        `Ya existe un cliente con este nombre o teléfono: "${duplicateClient.name}" (${duplicateClient.phone || duplicateClient.whatsapp || 'Sin teléfono'}). El sistema no permite duplicados.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (clientToEdit) {
        await updateClient({
          ...clientToEdit,
          name: cleanName,
          phone: phone.trim(),
          whatsapp: whatsapp.trim() || phone.trim(),
          email: email.trim(),
          birthday,
          notes: notes.trim(),
        });
        onSaved(clientToEdit.id);
      } else {
        const newId = await createClient({
          name: cleanName,
          phone: phone.trim(),
          whatsapp: whatsapp.trim() || phone.trim(),
          email: email.trim(),
          birthday,
          notes: notes.trim(),
        });
        onSaved(newId);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Error al guardar el cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPhoneToWhatsApp = () => {
    if (phone) {
      setWhatsapp(phone);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-300 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto text-[#0F172A]">
        {/* Modal Header */}
        <div className="bg-[#1E3A8A] px-5 py-4 text-white flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg">
                {clientToEdit ? 'Editar Ficha de Cliente' : 'Nuevo Cliente'}
              </h3>
              <p className="text-blue-100 text-xs font-medium">
                Base compartida entre Soham Montevideo y Soham Rioja
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {formError && (
            <div className="p-3 bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs rounded-xl flex items-start gap-2 font-bold shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {duplicateClient && (
            <div className="p-3.5 bg-amber-50 border-2 border-amber-400 text-amber-950 text-xs rounded-xl flex items-start gap-2 shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-black text-amber-900 block mb-0.5">
                  ⚠️ Posible cliente duplicado detectado:
                </span>
                <span>
                  Ya existe un cliente con este nombre o teléfono:{' '}
                  <strong>{duplicateClient.name}</strong>{' '}
                  ({duplicateClient.phone || duplicateClient.whatsapp || 'Sin teléfono'}).
                  La aplicación impide duplicar registros para mantener la base de datos limpia.
                </span>
              </div>
            </div>
          )}

          {/* Nombre y Apellido */}
          <div>
            <label className="text-xs font-black text-[#0F172A] block mb-1">
              Nombre y Apellido *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="text"
                required
                placeholder="Nombre y apellido del cliente"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm font-bold pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] placeholder-slate-400 focus:border-[#1E3A8A] outline-none shadow-2xs"
              />
            </div>
          </div>

          {/* Teléfono y WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-[#0F172A] block mb-1">
                Teléfono de Contacto
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="tel"
                  placeholder="Teléfono (opcional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-sm font-bold pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] placeholder-slate-400 focus:border-[#1E3A8A] outline-none shadow-2xs"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-[#0F172A] flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </label>
                {phone && (
                  <button
                    type="button"
                    onClick={handleCopyPhoneToWhatsApp}
                    className="text-[10px] font-black text-[#1E3A8A] hover:underline flex items-center gap-0.5 cursor-pointer"
                    title="Copiar número del teléfono"
                  >
                    <Copy className="w-2.5 h-2.5" />
                    <span>Mismo teléfono</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <MessageCircle className="w-4 h-4 text-emerald-600 absolute left-3 top-3.5" />
                <input
                  type="tel"
                  placeholder="WhatsApp (opcional)"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full text-sm font-bold pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] placeholder-slate-400 focus:border-[#1E3A8A] outline-none shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Email y Cumpleaños */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-[#0F172A] block mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="email"
                  placeholder="Correo electrónico (opcional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm font-bold pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] placeholder-slate-400 focus:border-[#1E3A8A] outline-none shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-[#0F172A] block mb-1">
                Fecha de Cumpleaños (Opcional)
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full text-sm font-bold pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] placeholder-slate-400 focus:border-[#1E3A8A] outline-none shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Observaciones / Notas Técnicas */}
          <div>
            <label className="text-xs font-black text-[#0F172A] block mb-1">
              Observaciones / Preferencias / Ficha Técnica
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <textarea
                rows={3}
                placeholder="Preferencias de servicio, alergias, tipo de piel o cabello, fórmulas, notas de la secretaria..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-sm font-bold pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-[#0F172A] placeholder-slate-400 focus:border-[#1E3A8A] outline-none resize-none shadow-2xs"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border-2 border-slate-300 hover:bg-slate-100 text-[#0F172A] text-xs font-black cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Boolean(duplicateClient) || !name.trim()}
              className={`px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all ${
                isSubmitting || Boolean(duplicateClient) || !name.trim()
                  ? 'bg-slate-200 text-slate-700 border-2 border-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-[#1E3A8A] hover:bg-[#172554] active:scale-98 text-white cursor-pointer shadow-md'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>
                {isSubmitting
                  ? 'Guardando...'
                  : clientToEdit
                  ? 'Guardar Cambios'
                  : 'Registrar Cliente'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
