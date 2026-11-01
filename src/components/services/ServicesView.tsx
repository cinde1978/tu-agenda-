import React, { useState } from 'react';
import { Plus, Sparkles, Clock, Edit2, Trash2 } from 'lucide-react';
import { Service, SERVICE_CATEGORY_PRESETS } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { ServiceModal } from './ServiceModal';

export function ServicesView() {
  const {
    services,
    deleteService,
    updateService,
    business,
    allAppointments,
    allCashMovements,
    allGiftCards,
  } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const categories = [
    'todos',
    ...Array.from(
      new Set([...SERVICE_CATEGORY_PRESETS, ...services.map((s) => s.category).filter(Boolean)])
    ),
  ];

  const filteredServices = services.filter((s) => {
    if (selectedCategory === 'todos') return true;
    return s.category === selectedCategory;
  });

  const getServiceLinks = (srv: Service) => {
    const turns = (allAppointments || []).filter(
      (a) => a.serviceId === srv.id || a.serviceName.trim().toLowerCase() === srv.name.trim().toLowerCase()
    ).length;
    const giftCards = (allGiftCards || []).filter(
      (g) => g.serviceId === srv.id || (g.serviceName && g.serviceName.trim().toLowerCase() === srv.name.trim().toLowerCase())
    ).length;
    const cash = (allCashMovements || []).filter(
      (m) => m.description && m.description.toLowerCase().includes(srv.name.trim().toLowerCase())
    ).length;
    return { turns, giftCards, cash, hasLinks: turns > 0 || giftCards > 0 || cash > 0 };
  };

  const handleToggleActive = async (service: Service) => {
    await updateService({
      ...service,
      active: !service.active,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-[#0F172A]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-[#0F172A] tracking-tight">Catálogo de Servicios</h2>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Consulta tus tratamientos, tiempos de atención y lista de precios
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setServiceToEdit(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-[#1E3A8A] hover:bg-blue-900 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
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
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border-2 cursor-pointer ${
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
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8">
          <Sparkles className="w-12 h-12 text-[#D4AF37] mx-auto mb-3" />
          <h3 className="font-black text-[#0F172A] text-base">No hay servicios en esta categoría</h3>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Agrega nuevos servicios para que aparezcan disponibles al agendar turnos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => {
            const links = getServiceLinks(service);
            const isConfirming = confirmDeleteId === service.id;

            return (
              <div
                key={service.id}
                className={`bg-white rounded-2xl border-2 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group ${
                  service.active ? 'border-slate-200 hover:border-[#1E3A8A]' : 'border-slate-200 bg-slate-50 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-blue-50 text-[#1E3A8A] border border-blue-200">
                      {service.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setServiceToEdit(service);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-600 hover:text-[#1E3A8A] transition-colors cursor-pointer"
                        title="Editar servicio"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(isConfirming ? null : service.id)}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-500 hover:text-rose-700 transition-colors cursor-pointer"
                        title="Eliminar servicio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isConfirming && (
                    <div className="mb-3 p-3 bg-rose-50 border-2 border-rose-400 rounded-xl space-y-2">
                      {links.hasLinks ? (
                        <>
                          <p className="text-xs font-black text-[#0F172A]">
                            "{service.name}" tiene datos vinculados ({links.turns} turno(s),{' '}
                            {links.giftCards} Gift Card(s), {links.cash} movimiento(s)).
                          </p>
                          <p className="text-[11px] font-bold text-rose-900">
                            Para no perder el historial, podés desactivarlo en lugar de borrarlo.
                          </p>
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1 rounded-lg bg-white border-2 border-slate-400 text-[#0F172A] text-xs font-black cursor-pointer hover:bg-slate-100"
                            >
                              Cancelar
                            </button>
                            {service.active && (
                              <button
                                type="button"
                                onClick={async () => {
                                  await updateService({ ...service, active: false });
                                  setConfirmDeleteId(null);
                                }}
                                className="px-3 py-1 rounded-lg bg-[#1E3A8A] hover:bg-blue-900 text-white text-xs font-black cursor-pointer"
                              >
                                Desactivar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteService(service.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-3 py-1 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-black cursor-pointer shadow-xs"
                            >
                              Eliminar de todos modos
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-black text-[#0F172A]">
                            ¿Confirmás eliminar el servicio "{service.name}"?
                          </p>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1 rounded-lg bg-white border-2 border-slate-400 text-[#0F172A] text-xs font-black cursor-pointer hover:bg-slate-100"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteService(service.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-3 py-1 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-black cursor-pointer shadow-xs"
                            >
                              Confirmar eliminación
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <h4 className="font-black text-[#0F172A] text-base mb-1.5 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: service.color || '#1E3A8A' }}
                    />
                    <span>{service.name}</span>
                  </h4>

                  {service.description && (
                    <p className="text-xs text-slate-600 font-medium line-clamp-2 mb-3">
                      {service.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 py-2 border-t border-slate-200 text-xs text-slate-700 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#1E3A8A]" />
                      <span className="font-bold">{service.durationMinutes} minutos</span>
                    </div>
                    <div className="flex items-center gap-1 font-black text-[#0F172A] text-sm ml-auto">
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
                    className={`text-xs font-black px-3 py-1 rounded-lg border transition-colors cursor-pointer ${
                      service.active
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                        : 'bg-slate-200 border-slate-400 text-[#0F172A] hover:bg-slate-300'
                    }`}
                  >
                    {service.active ? 'Activo' : 'Activar'}
                  </button>
                </div>
              </div>
            );
          })}
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
