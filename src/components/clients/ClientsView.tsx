import React, { useState } from 'react';
import {
  Search,
  Plus,
  User,
  Phone,
  Mail,
  Calendar,
  MessageCircle,
  Eye,
  FileText,
  DollarSign
} from 'lucide-react';
import { Client, Appointment } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { ClientModal } from './ClientModal';
import { ClientDetailDrawer } from './ClientDetailDrawer';

interface ClientsViewProps {
  onSelectAppointment: (appointment: Appointment) => void;
}

export function ClientsView({ onSelectAppointment }: ClientsViewProps) {
  const { clients, business } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [selectedClientForDrawer, setSelectedClientForDrawer] = useState<Client | null>(null);

  const filteredClients = clients.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.phone && c.phone.includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Directorio de Clientes</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Fichas con datos de contacto, historial de visitas y notas técnicas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 outline-none bg-gray-50/50"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setClientToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Clients Cards Grid */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 p-8">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800 text-base">No se encontraron clientes</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {searchTerm
              ? 'No hay clientes que coincidan con la búsqueda. Intenta con otro término.'
              : 'Empieza agregando tu primer cliente o agenda un turno para registrarlo automáticamente.'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => {
                setClientToEdit(null);
                setIsModalOpen(true);
              }}
              className="mt-4 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar primer cliente</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs hover:shadow-md hover:border-purple-200 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-base group-hover:bg-purple-700 group-hover:text-white transition-colors shadow-xs">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-base leading-tight">
                        {client.name}
                      </h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {client.phone || 'Sin teléfono'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedClientForDrawer(client)}
                    className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-purple-700 transition-colors"
                    title="Ver ficha completa"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>

                {/* Notes preview if exists */}
                {client.notes ? (
                  <p className="text-xs text-gray-600 line-clamp-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100 mb-3 italic">
                    "{client.notes}"
                  </p>
                ) : (
                  <div className="h-4" />
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs mb-4">
                  <div className="bg-gray-50/70 p-2 rounded-xl">
                    <span className="text-gray-400 block text-[10px] font-semibold uppercase">Visitas</span>
                    <span className="font-bold text-gray-800 text-sm">
                      {client.totalVisits || 0} turnos
                    </span>
                  </div>
                  <div className="bg-gray-50/70 p-2 rounded-xl">
                    <span className="text-gray-400 block text-[10px] font-semibold uppercase">Facturado</span>
                    <span className="font-bold text-purple-700 text-sm">
                      {formatCurrency(client.totalSpent || 0, business?.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom action */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedClientForDrawer(client)}
                  className="flex-1 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Ver Ficha e Historial</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for creating/editing */}
      {isModalOpen && (
        <ClientModal
          clientToEdit={clientToEdit}
          onClose={() => {
            setIsModalOpen(false);
            setClientToEdit(null);
          }}
          onSaved={() => {
            setIsModalOpen(false);
            setClientToEdit(null);
          }}
        />
      )}

      {/* Client Detail Drawer */}
      {selectedClientForDrawer && (
        <ClientDetailDrawer
          client={selectedClientForDrawer}
          onClose={() => setSelectedClientForDrawer(null)}
          onEditClient={(client) => {
            setSelectedClientForDrawer(null);
            setClientToEdit(client);
            setIsModalOpen(true);
          }}
          onSelectAppointment={(apt) => {
            setSelectedClientForDrawer(null);
            onSelectAppointment(apt);
          }}
        />
      )}
    </div>
  );
}
