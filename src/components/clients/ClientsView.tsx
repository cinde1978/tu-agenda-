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
  DollarSign,
  Edit2,
  Trash2,
  Building2,
  Users,
} from 'lucide-react';
import { Client, Appointment } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, cleanPhoneForWhatsApp } from '../../utils/formatters';
import { ClientModal } from './ClientModal';
import { ClientDetailDrawer } from './ClientDetailDrawer';

interface ClientsViewProps {
  onSelectAppointment: (appointment: Appointment) => void;
  onNewAppointmentForClient?: (clientId: string) => void;
}

export function ClientsView({ onSelectAppointment, onNewAppointmentForClient }: ClientsViewProps) {
  const { clients, deleteClient, business } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [selectedClientForDrawer, setSelectedClientForDrawer] = useState<Client | null>(null);

  const filteredClients = clients.filter((c) => {
    const term = searchTerm.toLowerCase();
    const phoneWa = `${c.phone || ''} ${c.whatsapp || ''}`.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      phoneWa.includes(term) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.notes && c.notes.toLowerCase().includes(term))
    );
  });

  const handleDeleteClient = async (client: Client) => {
    if (confirm(`¿Estás seguro de eliminar al cliente "${client.name}"? Los turnos existentes se mantendrán registrados.`)) {
      await deleteClient(client.id);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto text-[#0F172A]">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border-2 border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-black text-[#0F172A] tracking-tight">Directorio de Clientes</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-[#1E3A8A]">
              {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 flex items-center gap-1 border border-slate-200">
              <Building2 className="w-3 h-3 text-[#1E3A8A]" />
              <span>Base compartida: Soham Montevideo & Rioja</span>
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Gestión independiente de clientes: agrega, edita, consulta y busca clientes sin necesidad de agendar un turno
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-300 focus:border-[#1E3A8A] outline-none bg-slate-50 font-bold placeholder-slate-400 text-[#0F172A]"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setClientToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#1E3A8A] hover:bg-blue-900 active:scale-98 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Clients Cards Grid */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="font-black text-[#0F172A] text-base">
            {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
          </h3>
          <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto font-medium">
            {searchTerm
              ? 'No hay clientes que coincidan con la búsqueda. Intenta con otro nombre o teléfono.'
              : 'Agrega tu primer cliente al directorio para que esté disponible al agendar turnos.'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => {
                setClientToEdit(null);
                setIsModalOpen(true);
              }}
              className="mt-4 px-4 py-2.5 bg-[#1E3A8A] hover:bg-blue-900 text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Registrar primer cliente</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const rawWa = client.whatsapp || client.phone || '';
            const cleanWa = cleanPhoneForWhatsApp(rawWa);

            return (
              <div
                key={client.id}
                className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-2xs hover:shadow-md hover:border-[#1E3A8A] transition-all flex flex-col justify-between group text-[#0F172A]"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-blue-100 text-[#1E3A8A] flex items-center justify-center font-black text-base shadow-2xs group-hover:bg-[#1E3A8A] group-hover:text-white transition-colors">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-black text-[#0F172A] text-base leading-tight">
                          {client.name}
                        </h4>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          {client.phone && (
                            <span className="text-xs text-slate-600 flex items-center gap-1 font-bold">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{client.phone}</span>
                            </span>
                          )}
                          {cleanWa && (
                            <a
                              href={`https://wa.me/${cleanWa}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-black text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 hover:underline"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setClientToEdit(client);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-[#1E3A8A] transition-colors cursor-pointer"
                        title="Editar cliente"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClient(client)}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Eliminar cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Contact info: Email */}
                  {client.email && (
                    <p className="text-xs text-slate-600 flex items-center gap-1.5 mb-2 font-medium">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </p>
                  )}

                  {/* Notes / Observaciones preview */}
                  {client.notes ? (
                    <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 mb-3 italic font-medium line-clamp-2">
                      "{client.notes}"
                    </div>
                  ) : (
                    <div className="h-2" />
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs mb-3">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-slate-500 block text-[10px] font-bold uppercase">Visitas</span>
                      <span className="font-black text-[#0F172A] text-sm">
                        {client.totalVisits || 0} turnos
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-slate-500 block text-[10px] font-bold uppercase">Facturado</span>
                      <span className="font-black text-[#1E3A8A] text-sm">
                        {formatCurrency(client.totalSpent || 0, business?.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedClientForDrawer(client)}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-blue-200"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ver Ficha</span>
                  </button>
                  {onNewAppointmentForClient && (
                    <button
                      type="button"
                      onClick={() => onNewAppointmentForClient(client.id)}
                      className="py-2 px-3 rounded-xl bg-[#1E3A8A] hover:bg-blue-900 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
                      title="Agendar turno para este cliente"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>+ Agendar</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
          onNewAppointmentForClient={onNewAppointmentForClient}
        />
      )}
    </div>
  );
}
