import React, { useState } from 'react';
import { X, Sparkles, Clock, DollarSign, Tag, Check } from 'lucide-react';
import { Service } from '../../types';
import { useApp } from '../../context/AppContext';

interface ServiceModalProps {
  serviceToEdit?: Service | null;
  onClose: () => void;
  onSaved: (serviceId: string) => void;
}

const CATEGORIES = [
  'Estética Facial',
  'Estética Corporal',
  'Cosmetología',
  'Masajes',
  'Manicuría & Pestañas',
  'Otro',
];

const COLORS = [
  '#2563eb', // royal blue
  '#0284c7', // sky blue
  '#06b6d4', // cyan
  '#0d9488', // teal
  '#10b981', // emerald
  '#6366f1', // indigo
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
];

export function ServiceModal({ serviceToEdit, onClose, onSaved }: ServiceModalProps) {
  const { createService, updateService, business } = useApp();
  const [name, setName] = useState(serviceToEdit?.name || '');
  const [category, setCategory] = useState(serviceToEdit?.category || CATEGORIES[0]);
  const [durationMinutes, setDurationMinutes] = useState(serviceToEdit?.durationMinutes || 45);
  const [price, setPrice] = useState(serviceToEdit?.price || 5000);
  const [description, setDescription] = useState(serviceToEdit?.description || '');
  const [color, setColor] = useState(serviceToEdit?.color || COLORS[0]);
  const [active, setActive] = useState(serviceToEdit?.active ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      if (serviceToEdit) {
        await updateService({
          ...serviceToEdit,
          name: name.trim(),
          category,
          durationMinutes: Number(durationMinutes),
          price: Number(price),
          description: description.trim(),
          color,
          active,
        });
        onSaved(serviceToEdit.id);
      } else {
        const newId = await createService({
          name: name.trim(),
          category,
          durationMinutes: Number(durationMinutes),
          price: Number(price),
          description: description.trim(),
          color,
          active,
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-gradient-to-r from-blue-700 to-sky-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                {serviceToEdit ? 'Editar Servicio' : 'Nuevo Servicio'}
              </h3>
              <p className="text-blue-100 text-xs">
                Configura duración, precio y categoría
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
            <label className="text-xs font-semibold text-slate-700 block mb-1">Nombre del Servicio *</label>
            <input
              type="text"
              required
              placeholder="Ej. Limpieza Facial Profunda"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-600 outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Duración (minutos) *</label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="number"
                  step="5"
                  min="5"
                  required
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Precio ({business?.currency || '$'}) *</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="number"
                  step="100"
                  min="0"
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Descripción / Detalles</label>
            <textarea
              rows={2}
              placeholder="Detalle de qué incluye el servicio para informar al cliente..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:border-blue-600 outline-none resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Color identificador en agenda</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    color === c ? 'scale-110 border-slate-800 shadow-xs' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>Servicio activo y disponible para turnos</span>
            </label>
          </div>

          <div className="sticky bottom-0 bg-white p-4 border-t z-10 flex items-center justify-end gap-3 -mx-6 -mb-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-400 hover:border-black bg-white hover:bg-slate-100 text-[#000000] font-black text-sm shadow-2xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#1E3A8A] hover:bg-[#172554] active:scale-98 text-white font-black text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? 'Guardando...' : serviceToEdit ? 'Guardar Cambios' : 'Crear Servicio'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
