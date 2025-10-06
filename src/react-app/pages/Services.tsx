import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSupabaseAuth } from '@/react-app/auth/SupabaseAuthProvider';
import { useAppStore } from '@/shared/store';
import Layout from '@/react-app/components/Layout';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';
import ConfirmationModal from '@/react-app/components/ConfirmationModal';
import { useToastHelpers } from '@/react-app/contexts/ToastContext';
import { Scissors, Plus, Edit, Trash2, Clock, X, Search, DollarSign, Link as LinkIcon } from 'lucide-react';
import type { ServiceType } from '@/shared/types';
import { CreateServiceSchema } from '@/shared/types';
import { formatCurrency } from '@/react-app/utils';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';


// --- Definição de Tipos ---
interface ServiceFormData {
  name: string;
  description?: string;
  price: number | null;
  duration: number | null;
  image_url?: string;
}

// Valores padrão para o formulário
const defaultFormValues: ServiceFormData = {
  name: '',
  description: '',
  price: null,
  duration: null,
  image_url: '',
};

/**
 * Página para gerir os serviços oferecidos.
 */
export default function Services() {
  const { user } = useSupabaseAuth();
  const {
    services,
    loading,
    fetchServices,
    addService,
    updateService,
    deleteService
  } = useAppStore();
  const { showSuccess, showError } = useToastHelpers();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(CreateServiceSchema) as any,
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (user) {
      fetchServices(user.id);
    }
  }, [user, fetchServices]);

  const filteredServices = useMemo(() => {
    if (!searchTerm) {
      return services;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return services.filter((service: ServiceType) =>
      service.name.toLowerCase().includes(lowercasedTerm) ||
      service.description?.toLowerCase().includes(lowercasedTerm)
    );
  }, [services, searchTerm]);

  const onSubmit = async (formData: ServiceFormData) => {
    if (!user) return;
    
    const serviceData = {
      ...formData,
      price: Math.round(Number(formData.price) * 100),
      duration: Number(formData.duration),
    };

    try {
      if (editingService) {
        await updateService({ ...editingService, ...serviceData });
        showSuccess('Serviço atualizado!', 'As alterações foram salvas com sucesso.');
      } else {
        await addService(serviceData, user.id);
        showSuccess('Serviço adicionado!', 'O novo serviço foi adicionado ao seu catálogo.');
      }
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar serviço:', (error as Error).message);
      showError('Erro ao salvar serviço', 'Tente novamente ou contacte o suporte se o problema persistir.');
    }
  };

  const handleDeleteClick = (service: ServiceType) => {
    setServiceToDelete(service);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!user || !serviceToDelete) return;

    setIsDeleting(true);
    try {
      await deleteService(serviceToDelete.id!);
      showSuccess('Serviço removido!', 'O serviço foi removido do seu catálogo.');
      setIsDeleteModalOpen(false);
      setServiceToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir serviço:', (error as Error).message);
      showError('Erro ao remover serviço', 'Tente novamente ou contacte o suporte se o problema persistir.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setServiceToDelete(null);
  };

  const handleEditService = (service: ServiceType) => {
    setEditingService(service);
    reset({
      name: service.name,
      description: service.description || '',
      price: service.price / 100,
      duration: service.duration,
      image_url: service.image_url || '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
    reset(defaultFormValues);
  };

  if (loading.services) {
    return <Layout><LoadingSpinner /></Layout>;
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 pb-24 lg:pb-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-3xl font-bold text-gray-900">Serviços</h1>
            <p className="mt-2 text-gray-600">Gerencie seu catálogo de serviços</p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="hidden sm:inline-flex items-center justify-center rounded-md border border-transparent bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-pink-600 hover:to-violet-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Serviço
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
              placeholder="Buscar por nome ou descrição..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500"
            />
          </div>
        </div>


        <div className="mt-8">
          {filteredServices.length === 0 ? (
            <div className="text-center py-12">
              <Scissors className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm
                  ? 'Tente ajustar os termos de busca.'
                  : 'Comece adicionando serviços ao seu catálogo.'
                }
              </p>
              {!searchTerm && (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Serviço
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* --- VISÃO DESKTOP (GRID) --- */}
              <div className="hidden lg:grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                {filteredServices.map((service: ServiceType) => (
                  <div
                    key={service.id}
                    className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow flex flex-col"
                  >
                    <div className="h-48 w-full overflow-hidden bg-gray-200">
                      {service.image_url ? (
                        <img
                          src={service.image_url}
                          alt={service.name}
                          className="h-full w-full object-cover"
                          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Scissors className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    <div className="px-6 py-4 flex-grow">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                        {service.description && (
                          <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(service.price)}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                           <Clock className="w-4 h-4 mr-1.5 text-gray-400"/>
                           {service.duration} min
                        </div>
                      </div>
                    </div>

                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between space-x-3">
                      <button
                        onClick={() => handleEditService(service)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </button>

                      <button
                        onClick={() => handleDeleteClick(service)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* --- VISÃO MOBILE (LISTA DE CARDS) --- */}
              <div className="lg:hidden space-y-4">
                {filteredServices.map((service) => (
                  <div key={service.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="h-32 w-full overflow-hidden rounded-md mb-4 bg-gray-200">
                        {service.image_url ? (
                            <img 
                                src={service.image_url} 
                                alt={service.name} 
                                className="h-full w-full object-cover"
                                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { e.currentTarget.style.display = 'none'; }}
                            />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center">
                                <Scissors className="w-12 h-12 text-gray-400" />
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 break-words">{service.name}</h3>
                        {service.description && (
                          <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-lg text-green-600">{formatCurrency(service.price)}</p>
                        <div className={`text-sm mt-1 flex items-center justify-end text-gray-600`}>
                          <Clock className="w-4 h-4 mr-1 text-gray-400" />
                          {service.duration || 0} min
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditService(service)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Edit className="w-4 h-4 mr-1.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteClick(service)}
                        className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseModal}></div>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={handleSubmit(onSubmit as any)}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                      </h3>
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                          Nome *
                        </label>
                        <Controller
                            name="name"
                            control={control}
                            render={({ field, fieldState }) => (
                                <span className="p-input-icon-left w-full">
                                    <Scissors className="h-5 w-5 text-gray-400" />
                                    <InputText
                                        id={field.name}
                                        {...field}
                                        placeholder="Ex: Corte de Cabelo"
                                        className={`w-full pl-10 ${fieldState.error ? 'p-invalid' : ''}`}
                                    />
                                </span>
                            )}
                        />
                        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                      </div>

                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                          Descrição
                        </label>
                        <Controller
                            name="description"
                            control={control}
                            render={({ field, fieldState }) => (
                                <InputTextarea
                                    id={field.name}
                                    {...field}
                                    value={field.value ?? ''}
                                    rows={3}
                                    placeholder="Corte moderno com tesoura e máquina."
                                    className={`w-full ${fieldState.error ? 'p-invalid' : ''}`}
                                />
                            )}
                        />
                        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                            Preço (R$) *
                          </label>
                          <Controller
                            name="price"
                            control={control}
                            render={({ field, fieldState }) => (
                                <span className="p-input-icon-left w-full">
                                    <DollarSign className="h-5 w-5 text-gray-400" />
                                    <InputNumber
                                        id={field.name}
                                        ref={field.ref}
                                        value={field.value}
                                        onBlur={field.onBlur}
                                        onValueChange={(e) => field.onChange(e.value)}
                                        mode="currency"
                                        currency="BRL"
                                        locale="pt-BR"
                                        placeholder="R$ 50,00"
                                        className={`w-full ${fieldState.error ? 'p-invalid' : ''}`}
                                        inputClassName="w-full pl-10"
                                    />
                                </span>
                            )}
                          />
                          {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>}
                        </div>

                        <div>
                          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                            Duração (min) *
                          </label>
                          <Controller
                            name="duration"
                            control={control}
                            render={({ field, fieldState }) => (
                                <span className="p-input-icon-left w-full">
                                    <Clock className="h-5 w-5 text-gray-400" />
                                    <InputNumber
                                        id={field.name}
                                        ref={field.ref}
                                        value={field.value}
                                        onBlur={field.onBlur}
                                        onValueChange={(e) => field.onChange(e.value)}
                                        min={0}
                                        placeholder="45"
                                        suffix=" min"
                                        className={`w-full ${fieldState.error ? 'p-invalid' : ''}`}
                                        inputClassName="w-full pl-10"
                                    />
                                </span>
                            )}
                          />
                          {errors.duration && <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>}
                        </div>
                      </div>

                      <div>
                        <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 mb-1">
                          URL da Imagem
                        </label>
                        <Controller
                            name="image_url"
                            control={control}
                            render={({ field, fieldState }) => (
                                <span className="p-input-icon-left w-full">
                                    <LinkIcon className="h-5 w-5 text-gray-400" />
                                    <InputText
                                        id={field.name}
                                        {...field}
                                        value={field.value ?? ''}
                                        className={`w-full pl-10 ${fieldState.error ? 'p-invalid' : ''}`}
                                        placeholder="https://exemplo.com/imagem.jpg"
                                    />
                                </span>
                            )}
                        />
                        {errors.image_url && <p className="mt-1 text-sm text-red-600">{errors.image_url.message}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-pink-500 to-violet-500 text-base font-medium text-white hover:from-pink-600 hover:to-violet-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    >
                      {isSubmitting ? 'Salvando...' : (editingService ? 'Atualizar' : 'Criar')}
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Excluir Serviço"
          message={`Tem certeza que deseja excluir o serviço "${serviceToDelete?.name}"? Esta ação não pode ser desfeita.`}
          confirmText="Excluir"
          cancelText="Cancelar"
          variant="danger"
          isLoading={isDeleting}
        />
        
        <div className="lg:hidden fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-full p-4 shadow-lg hover:scale-110 active:scale-100 transition-transform duration-200"
            aria-label="Novo Serviço"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    </Layout>
  );
}
