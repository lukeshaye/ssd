// src/react-app/pages/Clients.tsx

import { useState, useEffect, useMemo } from 'react';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { useAppStore } from '../../shared/store';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { useToastHelpers } from '../contexts/ToastContext';
import { Users, Plus, Edit, Trash2, Phone, Mail, Search, Cake, UserSquare } from 'lucide-react'; // Ícones adicionados
import { FaWhatsapp } from 'react-icons/fa';
import type { ClientType } from '../../shared/types';
import ClientFormModal from '../components/ClientFormModal';
import { differenceInYears } from 'date-fns'; // Import para calcular a idade

/**
 * Página para gerir os clientes (Criar, Ler, Atualizar, Apagar).
 */
export default function Clients() {
  const { user } = useSupabaseAuth();
  const { 
    clients, 
    loading, 
    fetchClients, 
    deleteClient
  } = useAppStore();
  const { showSuccess, showError } = useToastHelpers();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchClients(user.id);
    }
  }, [user, fetchClients]);

  const filteredClients = useMemo(() => {
    if (!searchTerm) {
      return clients;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return clients.filter((client: ClientType) =>
      client.name.toLowerCase().includes(lowercasedTerm) ||
      client.email?.toLowerCase().includes(lowercasedTerm) ||
      client.phone?.toLowerCase().includes(lowercasedTerm)
    );
  }, [clients, searchTerm]);

  const handleDeleteClick = (client: ClientType) => {
    setClientToDelete(client);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!user || !clientToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteClient(clientToDelete.id!);
      showSuccess('Cliente removido!', 'O cliente foi removido da sua base de dados.');
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir cliente:', (error as Error).message);
      showError('Erro ao remover cliente', 'Tente novamente ou contacte o suporte se o problema persistir.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setClientToDelete(null);
  };
  
  const handleEditClient = (client: ClientType) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };
  
  const handleNewClient = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };
  
  const sendWhatsAppMessage = (client: ClientType) => {
    if (!client.phone) return;
    const message = `Olá, ${client.name}! Tudo bem?`;
    const phoneNumber = client.phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const calculateAge = (birthDate: string | null | undefined) => {
    if (!birthDate) return null;
    return differenceInYears(new Date(), new Date(birthDate));
  };

  if (loading.clients) {
    return <Layout><LoadingSpinner /></Layout>;
  }

  return (
    <Layout>
       <div className="px-4 sm:px-6 lg:px-8 pb-24 lg:pb-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
            <p className="mt-2 text-gray-600">Gerencie a sua base de clientes</p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              type="button"
              onClick={handleNewClient}
              className="hidden sm:inline-flex items-center justify-center rounded-md border border-transparent bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-pink-600 hover:to-violet-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500"
            />
          </div>
        </div>

        <div className="mt-8">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                    {searchTerm
                    ? 'Tente ajustar os termos de busca.'
                    : 'Comece adicionando o seu primeiro cliente.'
                    }
                </p>
                {!searchTerm && (
                    <div className="mt-6">
                    <button
                        type="button"
                        onClick={handleNewClient}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Cliente
                    </button>
                    </div>
                )}
            </div>
          ) : (
            <>
              {/* --- VISÃO DESKTOP (GRID) --- */}
              <div className="hidden lg:grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                {filteredClients.map((client) => {
                  const age = calculateAge(client.birth_date);
                  return (
                    <div
                      key={client.id}
                      className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow flex flex-col"
                    >
                      <div className="px-6 py-4 flex-grow">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="bg-blue-100 rounded-full p-2">
                              <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                          </div>
                          {client.phone && (
                              <button
                                  onClick={() => sendWhatsAppMessage(client)}
                                  title="Enviar mensagem no WhatsApp"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-green-300 text-xs font-medium rounded-md text-green-700 bg-white hover:bg-green-50 transition-colors"
                              >
                                  <FaWhatsapp className="w-4 h-4" />
                                  <span>Wpp</span>
                              </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {client.phone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="w-4 h-4 mr-2" />
                              {client.phone}
                            </div>
                          )}
                          {client.email && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="w-4 h-4 mr-2" />
                              {client.email}
                            </div>
                          )}
                          {age !== null && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Cake className="w-4 h-4 mr-2" />
                              {age} anos
                            </div>
                          )}
                          {client.gender && (
                            <div className="flex items-center text-sm text-gray-600 capitalize">
                              <UserSquare className="w-4 h-4 mr-2" />
                              {client.gender}
                            </div>
                          )}
                          {client.notes && (
                            <div className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100">
                              <p className="italic">"{client.notes}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center gap-3">
                        <button
                          onClick={() => handleEditClient(client)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                        >
                          <Edit className="w-4 h-4 mr-1.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteClick(client)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* --- VISÃO MOBILE (LISTA DE CARDS) --- */}
              <div className="lg:hidden space-y-4">
                {filteredClients.map((client) => {
                  const age = calculateAge(client.birth_date);
                  return (
                    <div key={client.id} className="bg-white overflow-hidden p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col">
                      <div className="flex-grow">
                        <div className="flex justify-between items-start">
                            <h3 className="font-semibold text-gray-800 break-words pr-2">{client.name}</h3>
                            {client.phone && (
                                <button
                                    onClick={() => sendWhatsAppMessage(client)}
                                    title="Enviar mensagem no WhatsApp"
                                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 border border-green-300 text-xs font-medium rounded-md text-green-700 bg-white hover:bg-green-50 transition-colors"
                                >
                                    <FaWhatsapp className="w-4 h-4" />
                                    <span>Wpp</span>
                                </button>
                            )}
                        </div>
                        {client.phone && (
                          <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                            <Phone className="w-3 h-3 flex-shrink-0"/> {client.phone}
                          </p>
                        )}
                        {client.email && (
                          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                            <Mail className="w-3 h-3 flex-shrink-0"/> {client.email}
                          </p>
                        )}
                        {age !== null && (
                          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                            <Cake className="w-3 h-3 flex-shrink-0"/> {age} anos
                          </p>
                        )}
                        {client.gender && (
                          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2 capitalize">
                            <UserSquare className="w-3 h-3 flex-shrink-0"/> {client.gender}
                          </p>
                        )}
                        {client.notes && (
                          <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100 italic">"{client.notes}"</p>
                        )}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                        <button
                          onClick={() => handleEditClient(client)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Edit className="w-4 h-4 mr-1.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteClick(client)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <ClientFormModal 
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          editingClient={editingClient}
          onClientCreated={() => {}} 
        />

        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Excluir Cliente"
          message={`Tem certeza que deseja excluir o cliente "${clientToDelete?.name}"? Esta ação não pode ser desfeita.`}
          confirmText="Excluir"
          cancelText="Cancelar"
          variant="danger"
          isLoading={isDeleting}
        />

        <div className="lg:hidden fixed bottom-6 right-6 z-40">
          <button
            onClick={handleNewClient}
            className="bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-full p-4 shadow-lg hover:scale-110 active:scale-100 transition-transform duration-200"
            aria-label="Novo Cliente"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    </Layout>
  );
}
