import React, { useState } from 'react';
import { Plus, Sparkles, Clock, DollarSign, Edit2, Trash2, Check } from 'lucide-react';
import { Service } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { ServiceModal } from './ServiceModal';

export function ServicesView() {
  const { services, deleteService, updateService, business } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);

  const categories = ['todos', ...Array.from(new Set(services.map((s) => s.category)))];

  const filteredServices = services.filter((s) => {
    if (selectedCategory === 'todos') return true;
    return s.category === selectedCategory;
  });

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de eliminar el servicio "${name}"?`)) {
      await deleteService(id);
    }
  };

  const handleToggleActive = async (service: Service) => {
    await updateService({
      ...service,
      active: !service.active,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#f1f5f9] p-6 rounded-2xl border-2 border-slate-300 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Catálogo de Servicios</h2>
          <p className="text-xs text-slate-700 font-bold mt-0.5">
            Configura tus tratamientos, tiempos de atención y lista de precios
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setServiceToEdit(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nuevo Servicio</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all capitalize cursor-pointer ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-200 border border-slate-300 text-slate-800 hover:bg-blue-200 hover:text-blue-950'
            }`}
          >
            {cat === 'todos' ? 'Todos los Servicios' : cat}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="text-center py-16 bg-[#f8fafc] rounded-2xl border-2 border-dashed border-slate-300 p-8">
          <Sparkles className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="font-black text-slate-900 text-base">No hay servicios en esta categoría</h3>
          <p className="text-xs text-slate-600 font-bold mt-1">
            Agrega nuevos servicios para que aparezcan disponibles al agendar turnos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className={`rounded-2xl border-2 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group ${
                service.active
                  ? 'border-slate-300 bg-[#f8fafc] hover:border-blue-600 hover:bg-blue-50/50'
                  : 'border-slate-300 bg-slate-200/60 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-black/10"
                    style={{
                      backgroundColor: `${service.color || '#2563eb'}20`,
                      color: service.color || '#1e3a8a',
                    }}
                  >
                    {service.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setServiceToEdit(service);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 bg-slate-200 hover:bg-blue-600 rounded-lg text-slate-700 hover:text-white transition-colors border border-slate-300"
                      title="Editar servicio"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(service.id, service.name)}
                      className="p-1.5 bg-slate-200 hover:bg-rose-600 rounded-lg text-slate-700 hover:text-white transition-colors border border-slate-300"
                      title="Eliminar servicio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="font-black text-slate-900 text-base mb-1.5 flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                    style={{ backgroundColor: service.color || '#2563eb' }}
                  />
                  <span>{service.name}</span>
                </h4>

                {service.description && (
                  <p className="text-xs text-slate-600 font-medium line-clamp-2 mb-3">
                    {service.description}
                  </p>
                )}

                <div className="flex items-center gap-4 py-2 border-t border-slate-200 text-xs text-slate-700 font-bold mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>{service.durationMinutes} minutos</span>
                  </div>
                  <div className="flex items-center gap-1 font-black text-slate-900 text-sm ml-auto">
                    <span>{formatCurrency(service.price, business?.currency)}</span>
                  </div>
                </div>
              </div>

              {/* Bottom toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-[11px] text-slate-600 font-bold">
                  {service.active ? 'Disponible para turnos' : 'Inactivo temporalmente'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleActive(service)}
                  className={`text-xs font-black px-2.5 py-1 rounded-lg transition-colors border ${
                    service.active
                      ? 'bg-emerald-100 text-emerald-950 border-emerald-300 hover:bg-emerald-600 hover:text-white'
                      : 'bg-slate-300 text-slate-800 border-slate-400 hover:bg-slate-400'
                  }`}
                >
                  {service.active ? 'Activo' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <ServiceModal
          serviceToEdit={serviceToEdit}
          onClose={() => {
            setIsModalOpen(false);
            setServiceToEdit(null);
          }}
          onSaved={() => {
            setIsModalOpen(false);
            setServiceToEdit(null);
          }}
        />
      )}
    </div>
  );
}
