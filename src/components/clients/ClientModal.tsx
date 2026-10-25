import React, { useState } from 'react';
import { X, User, Phone, Mail, Calendar, FileText, Check } from 'lucide-react';
import { Client } from '../../types';
import { useApp } from '../../context/AppContext';

interface ClientModalProps {
  clientToEdit?: Client | null;
  onClose: () => void;
  onSaved: (clientId: string) => void;
}

export function ClientModal({ clientToEdit, onClose, onSaved }: ClientModalProps) {
  const { createClient, updateClient } = useApp();
  const [name, setName] = useState(clientToEdit?.name || '');
  const [phone, setPhone] = useState(clientToEdit?.phone || '');
  const [email, setEmail] = useState(clientToEdit?.email || '');
  const [birthday, setBirthday] = useState(clientToEdit?.birthday || '');
  const [notes, setNotes] = useState(clientToEdit?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      if (clientToEdit) {
        await updateClient({
          ...clientToEdit,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          birthday,
          notes: notes.trim(),
        });
        onSaved(clientToEdit.id);
      } else {
        const newId = await createClient({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          birthday,
          notes: notes.trim(),
        });
        onSaved(newId);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-gradient-to-r from-blue-700 to-sky-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                {clientToEdit ? 'Editar Ficha de Cliente' : 'Nuevo Cliente'}
              </h3>
              <p className="text-blue-100 text-xs">
                {clientToEdit ? 'Actualiza los datos de contacto y ficha' : 'Registra un nuevo cliente'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Nombre Completo *</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="Ej. Camila Morales"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">WhatsApp / Teléfono</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="tel"
                placeholder="Ej. +54 9 11 1234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="cliente@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Cumpleaños</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Ficha Técnica / Preferencias / Alergias
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <textarea
                rows={3}
                placeholder="Fórmulas de tinte, tipo de piel, alergias a cosméticos, preferencias..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-sm pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : clientToEdit ? 'Guardar' : 'Crear Cliente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
