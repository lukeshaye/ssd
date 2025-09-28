// src/react-app/pages/Clients.tsx

import { useState, useEffect } from 'react';
// O useForm e o Zod não são mais necessários aqui, pois o modal cuidará disso.
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { useAppStore } from '../../shared/store';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { useToastHelpers } from '../contexts/ToastContext';
import { Users, Plus, Edit, Trash2, Phone, Mail, MessageCircle } from 'lucide-react';
import type { ClientType } from '../../shared/types';
// Importamos o nosso novo modal
import ClientFormModal from '../components/ClientFormModal';

/**
 * Página para gerir os clientes (Criar, Ler, Atualizar, Apagar).
 */
export default function Clients() {
  const { user } = useSupabaseAuth();
  const { 
    clients, 
    loading, 
    fetchClients, 
    deleteClient // A lógica de add/update agora está no modal
  } = useAppStore();
  const { showSuccess, showError } = useToastHelpers();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // A lógica do formulário (useForm, onSubmit) foi movida para o ClientFormModal.

  useEffect(() => {
    if (user) {
      fetchClients(user.id);
    }
  }, [user, fetchClients]);


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
  
  // Simplificamos a função de editar: agora ela apenas define o cliente e abre o modal.
  const handleEditClient = (client: ClientType) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };
  
  // Simplificamos a função de novo cliente.
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

  if (loading.clients) {
    return <Layout><LoadingSpinner /></Layout>;
  }

  return (
    <Layout>
       <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
            <p className="mt-2 text-gray-600">Gerencie a sua base de clientes</p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              type="button"
              onClick={handleNewClient}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-pink-600 hover:to-violet-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </button>
          </div>
        </div>

        <div className="mt-8">
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum cliente</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comece adicionando o seu primeiro cliente.
              </p>
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
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="px-6 py-4 flex-grow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-100 rounded-full p-2">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                        </div>
                      </div>
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
                      
                      {client.notes && (
                        <div className="text-sm text-gray-600 mt-2">
                          <p className="italic">"{client.notes}"</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleEditClient(client)}
                        className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                      >
                        <Edit className="w-4 h-4 mr-1.5" />
                        Editar
                      </button>
                      
                      <button
                        onClick={() => handleDeleteClick(client)}
                        className="inline-flex items-center justify-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        Excluir
                      </button>
                    </div>
                    
                    {client.phone && (
                      <button
                        onClick={() => sendWhatsAppMessage(client)}
                        title="Enviar mensagem no WhatsApp"
                        className="inline-flex items-center justify-center p-2 border border-green-300 shadow-sm rounded-full text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SUBSTITUIÇÃO DO MODAL ANTIGO PELO NOVO COMPONENTE */}
        <ClientFormModal 
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          editingClient={editingClient}
          // A função de callback não precisa fazer nada aqui, pois o store já atualiza a lista
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
      </div>
    </Layout>
  );
}