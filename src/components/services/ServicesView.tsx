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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Catálogo de Servicios</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Configura tus tratamientos, tiempos de atención y lista de precios
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setServiceToEdit(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <Plus className="w-4 h-4" />
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
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all capitalize border-2 cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                : 'bg-white border-slate-300 text-[#0F172A] hover:bg-slate-50'
            }`}
          >
            {cat === 'todos' ? 'Todos los Servicios' : cat}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 p-8">
          <Sparkles className="w-12 h-12 text-purple-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800 text-base">No hay servicios en esta categoría</h3>
          <p className="text-xs text-gray-500 mt-1">
            Agrega nuevos servicios para que aparezcan disponibles al agendar turnos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group ${
                service.active ? 'border-gray-200/80 hover:border-purple-200' : 'border-gray-200 bg-gray-50/50 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${service.color || '#6D28D9'}15`,
                      color: service.color || '#6D28D9',
                    }}
                  >
                    {service.category}
                  </span>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => {
                        setServiceToEdit(service);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-purple-700 transition-colors"
                      title="Editar servicio"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(service.id, service.name)}
                      className="p-1.5 hover:bg-rose-50 rounded-lg text-gray-400 hover:text-rose-600 transition-colors"
                      title="Eliminar servicio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="font-bold text-gray-900 text-base mb-1.5 flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: service.color || '#6D28D9' }}
                  />
                  <span>{service.name}</span>
                </h4>

                {service.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                    {service.description}
                  </p>
                )}

                <div className="flex items-center gap-4 py-2 border-t border-gray-100 text-xs text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-semibold">{service.durationMinutes} minutos</span>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-gray-900 text-sm ml-auto">
                    <span>{formatCurrency(service.price, business?.currency)}</span>
                  </div>
                </div>
              </div>

              {/* Bottom toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-[11px] text-gray-500 font-medium">
                  {service.active ? 'Disponible para turnos' : 'Inactivo temporalmente'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleActive(service)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                    service.active
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
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
