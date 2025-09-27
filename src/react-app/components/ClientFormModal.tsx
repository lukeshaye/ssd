// src/react-app/components/ClientFormModal.tsx

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { useAppStore } from '../../shared/store';
import { useToastHelpers } from '../contexts/ToastContext';
import { X } from 'lucide-react';
import type { ClientType } from '../../shared/types';
import { CreateClientSchema } from '../../shared/types';

// --- Definição de Tipos ---
interface ClientFormData {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated: (client: ClientType) => void; // Callback para o pai
  editingClient: ClientType | null;
}

const defaultFormValues: ClientFormData = {
    name: '',
    phone: '',
    email: '',
    notes: '',
};

export default function ClientFormModal({ isOpen, onClose, onClientCreated, editingClient }: ClientFormModalProps) {
  const { user } = useSupabaseAuth();
  const { addClient, updateClient } = useAppStore();
  const { showSuccess, showError } = useToastHelpers();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(CreateClientSchema),
    defaultValues: editingClient 
      ? { name: editingClient.name, phone: editingClient.phone || '', email: editingClient.email || '', notes: editingClient.notes || '' } 
      : defaultFormValues
  });

  const onSubmit = async (formData: ClientFormData) => {
    if (!user) return;
    try {
      if (editingClient) {
        // A lógica de edição permanece para reutilização, mas não será usada no atalho.
        await updateClient({ ...editingClient, ...formData });
        showSuccess('Cliente atualizado!');
      } else {
        // Foco na criação de um novo cliente
        const newClient = await addClient(formData, user.id);
        showSuccess('Cliente adicionado!');
        onClientCreated(newClient); // Executa o callback com o novo cliente
      }
      onClose();
    } catch (error) {
      showError('Erro ao salvar cliente');
    }
  };
  
  // Reseta o formulário ao fechar
  useEffect(() => {
    if (!isOpen) {
      reset(defaultFormValues);
    }
  }, [isOpen, reset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4 text-center">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} aria-hidden="true"></div>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              {/* Conteúdo do formulário (copiado de Clients.tsx) */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome *</label>
                  <input type="text" {...register('name')} placeholder="Ex: Maria Silva" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Telefone</label>
                  <input type="tel" {...register('phone')} placeholder="Ex: (11) 99999-9999" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                  {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" {...register('email')} placeholder="Ex: maria@email.com" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
                </div>
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notas</label>
                  <textarea {...register('notes')} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" placeholder="Preferências, observações..."/>
                  {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>}
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button type="submit" disabled={isSubmitting} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-pink-500 to-violet-500 text-base font-medium text-white hover:from-pink-600 hover:to-violet-600 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                {isSubmitting ? 'Salvando...' : 'Salvar Cliente'}
              </button>
              <button type="button" onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}