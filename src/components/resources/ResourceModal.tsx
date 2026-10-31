import React, { useState } from 'react';
import { X, Building2, Layers, Check } from 'lucide-react';
import { Resource, StaffBranchScope } from '../../types';
import { useApp } from '../../context/AppContext';

interface ResourceModalProps {
  resourceToEdit?: Resource | null;
  onClose: () => void;
  onSaved?: (resourceId: string) => void;
}

export function ResourceModal({ resourceToEdit, onClose, onSaved }: ResourceModalProps) {
  const { createResource, updateResource, selectedBranch } = useApp();

  const [name, setName] = useState(resourceToEdit?.name || '');
  const [type, setType] = useState<'cabina' | 'equipo' | 'espacio'>(
    resourceToEdit?.type || 'cabina'
  );
  const [branchId, setBranchId] = useState<StaffBranchScope>(
    resourceToEdit?.branchId || selectedBranch
  );
  const [description, setDescription] = useState(resourceToEdit?.description || '');
  const [active, setActive] = useState(resourceToEdit?.active ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      if (resourceToEdit) {
        await updateResource({
          ...resourceToEdit,
          name: name.trim(),
          type,
          branchId,
          description: description.trim() || undefined,
          active,
        });
        if (onSaved) onSaved(resourceToEdit.id);
      } else {
        const newId = await createResource({
          name: name.trim(),
          type,
          branchId,
          description: description.trim() || undefined,
          active,
        });
        if (onSaved) onSaved(newId);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border-2 border-slate-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-[#1E3A8A] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5" />
            <h3 className="font-black text-base text-white">
              {resourceToEdit ? 'Editar Recurso / Cabina' : 'Nueva Cabina o Equipo'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-[#0F172A]">
          <div>
            <label className="text-xs font-bold text-[#0F172A] block mb-1">
              Nombre de la Cabina o Equipo *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Cabina 1 - Facial & Masajes"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 rounded-xl border-2 border-slate-300 font-bold text-xs sm:text-sm text-[#0F172A] focus:border-[#1E3A8A] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1">
                Tipo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border-2 border-slate-300 font-bold text-xs sm:text-sm text-[#0F172A] focus:border-[#1E3A8A] outline-none cursor-pointer"
              >
                <option value="cabina">Cabina / Box</option>
                <option value="equipo">Aparato / Equipo</option>
                <option value="espacio">Espacio / Sillón</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1">
                Sucursal Asignada
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value as StaffBranchScope)}
                className="w-full p-2.5 rounded-xl border-2 border-slate-300 font-bold text-xs sm:text-sm text-[#0F172A] focus:border-[#1E3A8A] outline-none cursor-pointer"
              >
                <option value="sucursal_1">Soham Montevideo</option>
                <option value="sucursal_2">Soham Rioja</option>
                <option value="ambas">Ambas Sucursales</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#0F172A] block mb-1">
              Descripción / Equipamiento Incluido
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Camilla articulada eléctrica, lámpara LED, vaporizador..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 rounded-xl border-2 border-slate-300 font-medium text-xs sm:text-sm text-[#0F172A] focus:border-[#1E3A8A] outline-none"
            />
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 rounded text-[#1E3A8A] focus:ring-[#1E3A8A] cursor-pointer"
            />
            <span className="text-xs font-black text-[#0F172A]">
              Recurso disponible y habilitado para turnos
            </span>
          </label>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border-2 border-slate-300 text-xs font-black text-[#0F172A] hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#1E3A8A] hover:bg-blue-900 text-white text-xs font-black"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Recurso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
