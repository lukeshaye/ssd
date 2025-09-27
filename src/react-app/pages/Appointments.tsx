import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { useAppStore } from '../../shared/store';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { TimeSlotPicker } from '../components/TimeSlotPicker';
import { useToastHelpers } from '../contexts/ToastContext';
import { Plus, X, User, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Scissors, PlusCircle } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/pt-br';
import type { AppointmentType, ProfessionalType, ClientType, ServiceType } from '../../shared/types';
import { AppointmentFormSchema } from '../../shared/types';
import ClientFormModal from '../components/ClientFormModal'; // 1. Importado o novo modal

// --- PrimeReact Imports ---
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import 'primereact/resources/themes/tailwind-light/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import './primereact-calendar-styles.css';

// --- Definição de Tipos ---
interface AppointmentFormData {
  client_id: number;
  professional_id: number;
  service_id: number;
  price: number;
  appointment_date: Date;
  end_date: Date;
  attended?: boolean;
}

const defaultFormValues: Partial<AppointmentFormData> = {
  client_id: undefined,
  professional_id: undefined,
  service_id: undefined,
  price: undefined,
  appointment_date: new Date(),
  end_date: new Date(),
  attended: false,
};

// --- Componente Principal ---
export default function Appointments() {
  const { user } = useSupabaseAuth();
  const { showSuccess, showError } = useToastHelpers();

  const {
    appointments, clients, professionals, services, loading,
    fetchAppointments, fetchClients, fetchProfessionals, fetchServices,
    addAppointment, updateAppointment, deleteAppointment
  } = useAppStore();

  const [selectedDate, setSelectedDate] = useState<Date | Date[] | undefined>(new Date());
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<AppointmentType | null>(null);
  
  // 2. Adicionado estado para controlar o modal de cliente
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  const {
    handleSubmit, reset, setValue, watch, control,
    formState: { errors }
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(AppointmentFormSchema),
    defaultValues: defaultFormValues,
  });

  const watchedServiceId = watch('service_id');
  const watchedStartDate = watch('appointment_date');
  const watchedClientId = watch('client_id');
  const watchedProfessionalId = watch('professional_id');

  const selectedService = useMemo(() => {
    return services.find(s => s.id === Number(watchedServiceId));
  }, [watchedServiceId, services]);
  const serviceDuration = selectedService?.duration || 30;

  const selectedProfessional = useMemo(() => {
    return professionals.find(p => p.id === watchedProfessionalId) || null;
  }, [watchedProfessionalId, professionals]);

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchClients(user.id),
        fetchProfessionals(user.id),
        fetchServices(user.id),
        fetchAppointments(user.id),
      ]);
    }
  }, [user, fetchClients, fetchProfessionals, fetchServices, fetchAppointments]);
  
  useEffect(() => {
    if (selectedService) {
      setValue('price', selectedService.price / 100);
      if (watchedStartDate) {
        const newEndDate = moment(watchedStartDate).add(selectedService.duration, 'minutes').toDate();
        setValue('end_date', newEndDate, { shouldValidate: true });
      }
    }
  }, [watchedServiceId, watchedStartDate, services, setValue, selectedService]);
  
  // 3. Função de callback para quando um cliente é criado
  const handleClientCreated = (newClient: ClientType) => {
    if (newClient && newClient.id) {
      setIsClientModalOpen(false); // Fecha o modal de cliente
      setValue('client_id', newClient.id, { shouldValidate: true }); // Define o novo cliente no formulário
      showSuccess(`Cliente "${newClient.name}" selecionado!`);
    }
  };

  const professionalOptions = useMemo(() => {
    const allOption = { id: null, name: 'Todos os Profissionais', user_id: '' };
    return [allOption, ...professionals];
  }, [professionals]);

  const currentDate = Array.isArray(selectedDate) ? selectedDate[0] : selectedDate;

  const formatHeaderDate = (date: Date | undefined) => {
    if (!date) return 'Selecione uma data';
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date);
  };


  const filteredAppointments = useMemo(() => {
    if (!currentDate) return [];
    
    return appointments
      .filter(app => {
        const isSameDay = moment(app.appointment_date).isSame(currentDate, 'day');
        const professionalMatch = selectedProfessionalId === null || app.professional_id === selectedProfessionalId;
        return isSameDay && professionalMatch;
      })
      .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
  }, [appointments, currentDate, selectedProfessionalId]);

  const groupedAppointments = useMemo(() => {
    return filteredAppointments.reduce((acc, app) => {
      const time = moment(app.appointment_date).format('HH:mm');
      if (!acc[time]) acc[time] = [];
      acc[time].push(app);
      return acc;
    }, {} as Record<string, AppointmentType[]>);
  }, [filteredAppointments]);
  
  const handleDayNavigation = (direction: 'prev' | 'next') => {
      const newDate = moment(currentDate || new Date()).add(direction === 'prev' ? -1 : 1, 'day').toDate();
      setSelectedDate(newDate);
  }

  const handleOpenModal = (appointment?: AppointmentType, slotDate?: Date) => {
    if (appointment) {
      setEditingAppointment(appointment);
      reset({
        client_id: appointment.client_id,
        professional_id: appointment.professional_id,
        service_id: appointment.service_id,
        price: appointment.price / 100,
        appointment_date: new Date(appointment.appointment_date),
        end_date: new Date(appointment.end_date),
        attended: appointment.attended,
      });
    } else {
      setEditingAppointment(null);
      
      const initialDate = slotDate || (currentDate && moment(currentDate).isAfter(moment()) ? currentDate : new Date());
      
      reset({
          client_id: undefined,
          professional_id: selectedProfessionalId ?? undefined,
          service_id: undefined,
          price: undefined,
          attended: false,
          appointment_date: moment(initialDate).hour(9).minute(0).second(0).toDate(),
          end_date: moment(initialDate).hour(9).minute(30).second(0).toDate(),
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAppointment(null);
    reset(defaultFormValues);
  };
  
  const onSubmit = async (data: AppointmentFormData) => {
     if (!user) return;
     const newStart = moment(data.appointment_date);
     const newEnd = moment(data.end_date);
     const professionalId = Number(data.professional_id);
     const conflictingAppointment = appointments.find(app => {
         if (editingAppointment && app.id === editingAppointment.id) return false;
         if (app.professional_id !== professionalId) return false;
         const existingStart = moment(app.appointment_date);
         const existingEnd = moment(app.end_date);
         return newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart);
     });
     if (conflictingAppointment) {
         showError("Conflito de Horário", "O profissional já tem um agendamento neste horário.");
         return;
     }
     const client = clients.find(c => c.id === Number(data.client_id));
     const professional = professionals.find(p => p.id === Number(data.professional_id));
     const service = services.find(s => s.id === Number(data.service_id));
     if (!client || !professional || !service) {
         showError("Dados inválidos.", "Cliente, profissional ou serviço não encontrado.");
         return;
     }
     const appointmentData = {
       ...data,
       appointment_date: newStart.format("YYYY-MM-DD HH:mm:ss"),
       end_date: newEnd.format("YYYY-MM-DD HH:mm:ss"),
       price: Math.round(Number(data.price) * 100),
       client_id: Number(data.client_id),
       professional_id: professionalId,
       service_id: Number(data.service_id),
       client_name: client.name,
       professional: professional.name,
       service: service.name,
       attended: data.attended ?? false,
     };
     try {
       if (editingAppointment) {
         await updateAppointment({ ...editingAppointment, ...appointmentData });
         showSuccess("Agendamento atualizado!");
       } else {
         await addAppointment(appointmentData, user.id);
         showSuccess("Agendamento criado!");
       }
       handleCloseModal();
     } catch (error) {
       showError("Não foi possível salvar", "Verifique os dados e tente novamente.");
     }
  };

  const handleDeleteClick = (appointment: AppointmentType) => {
    setAppointmentToDelete(appointment);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!user || !appointmentToDelete) return;
    try {
      await deleteAppointment(appointmentToDelete.id!);
      showSuccess("Agendamento removido!");
      setIsDeleteModalOpen(false);
      setAppointmentToDelete(null);
    } catch (err: any) {
      showError("Falha ao remover agendamento.");
    }
  };

  // --- Templates para Dropdowns ---
  const professionalOptionTemplate = (option: ProfessionalType | { id: null, name: string }) => {
    const isAllProfessionals = option.id === null;
    
    const circleStyle = isAllProfessionals
      ? { backgroundImage: 'linear-gradient(to right, #ec4899, #8b5cf6)' }
      : { backgroundColor: (option as ProfessionalType).color || '#cccccc' };

    return (
        <div className="flex items-center">
            <div 
                className="w-4 h-4 rounded-full mr-2 flex-shrink-0" 
                style={circleStyle} 
            />
            <span>{option.name}</span>
        </div>
    );
  };
  
  const selectedProfessionalTemplate = (option: ProfessionalType | null, props: any) => {
      if (!option || option.id === null) return <span>{props.placeholder}</span>;
      return professionalOptionTemplate(option);
  };
  
  const clientOptionTemplate = (option: ClientType) => (
    <div className="flex items-center">
        <User className="w-4 h-4 mr-2 text-gray-400" />
        <span>{option.name}</span>
    </div>
  );

  const serviceOptionTemplate = (option: ServiceType) => (
    <div className="flex items-center">
        <Scissors className="w-4 h-4 mr-2 text-gray-400" />
        <span>{option.name}</span>
    </div>
  );

  if (loading.clients || loading.professionals || loading.services || loading.appointments) {
    return <Layout><LoadingSpinner /></Layout>;
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 pb-24 lg:pb-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agenda</h1>
            <p className="mt-2 text-gray-600">Visualize e gerencie os seus agendamentos</p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
             <Dropdown
                value={professionalOptions.find(p => p.id === selectedProfessionalId) || professionalOptions[0]}
                options={professionalOptions} 
                onChange={(e) => setSelectedProfessionalId(e.value ? e.value.id : null)}
                optionLabel="name"
                placeholder="Todos os Profissionais"
                valueTemplate={selectedProfessionalTemplate}
                itemTemplate={professionalOptionTemplate}
                className="w-full md:w-56"
             />
             
             <Calendar
                value={currentDate}
                onChange={(e) => setSelectedDate(e.value as Date)}
                touchUI
                locale="pt-BR"
                dateFormat="dd/mm/yy"
                showIcon
                icon={<CalendarIcon className="w-5 h-5 text-gray-500" />}
                inputClassName="hidden" 
             />

            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="hidden sm:inline-flex items-center justify-center rounded-md border border-transparent bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-pink-600 hover:to-violet-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agendar
            </button>
          </div>
        </div>
        
        <div className="mt-8">
          <div className="lg:col-span-12">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[60vh]">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                 <button onClick={() => handleDayNavigation('prev')} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ChevronLeft className="w-5 h-5"/>
                 </button>
                 <div className="text-center">
                    <h2 className="text-lg font-semibold text-gray-800 capitalize">
                      {formatHeaderDate(currentDate)}
		                </h2>
                    <button onClick={() => setSelectedDate(new Date())} className="text-sm text-pink-600 hover:underline">Hoje</button>
                 </div>
                 <button onClick={() => handleDayNavigation('next')} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><ChevronRight className="w-5 h-5"/></button>
              </div>

              <div className="p-4 sm:p-6">
                {Object.keys(groupedAppointments).length === 0 ? (
                  <div className="text-center py-20">
                    <CalendarIcon className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum agendamento</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Não há nada na agenda para este dia.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedAppointments).map(([time, apps]) => (
                      <div key={time} className="relative flex gap-x-3">
                        <div className="flex-shrink-0 flex flex-col items-center">
                          <p className="text-xs text-gray-500 font-medium mb-1">{time}</p>
                          <div className="relative flex h-full w-6 justify-center items-center">
                            <div className="h-full w-0.5 bg-gray-200"></div>
                            <div className="absolute top-0 w-4 h-4 rounded-full bg-pink-500 border-2 border-white"></div>
                          </div>
                        </div>
                        <div className="flex-grow pb-6">
                          <div className="space-y-3">
                            {apps.map(app => {
                                const professional = professionals.find(p => p.id === app.professional_id);
                                const service = services.find(s => s.id === app.service_id);
                                const client = clients.find(c => c.id === app.client_id);
                                return (
                                <div 
                                    key={app.id} 
                                    className="bg-gray-50 p-3 rounded-lg border-l-4 cursor-pointer hover:bg-gray-100 transition-colors"
                                    style={{ borderLeftColor: professional?.color || '#a855f7' }}
                                    onClick={() => handleOpenModal(app)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                          <p className="font-semibold text-gray-800">{service?.name || 'Serviço não encontrado'}</p>
                                          <p className="text-sm text-gray-600">{client?.name || 'Cliente não encontrado'}</p>
                                          <p className="text-xs text-gray-500 mt-1">com {professional?.name || 'Profissional não encontrado'}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-4">
                                          <p className="text-sm font-medium text-gray-800">{moment(app.end_date).diff(moment(app.appointment_date), 'minutes')} min</p>
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {isModalOpen && (
           <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseModal}></div>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={handleSubmit(onSubmit)}>
                   <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                     <div className="flex items-center justify-between mb-4">
                       <h3 className="text-lg font-medium text-gray-900">{editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
                       <button type="button" onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                     </div>
                     <div className="space-y-4">
                        {/* 4. Campo de cliente modificado */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                          <div className="flex items-center gap-2">
                            <Dropdown value={clients.find(c => c.id === watchedClientId) || null} options={clients} onChange={(e) => setValue('client_id', e.value?.id)} optionLabel="name" placeholder="Selecione um cliente" itemTemplate={clientOptionTemplate} className="w-full" filter />
                            <button
                              type="button"
                              onClick={() => setIsClientModalOpen(true)}
                              className="p-2 text-gray-500 hover:text-pink-600 transition-colors"
                              title="Adicionar Novo Cliente"
                            >
                              <PlusCircle className="w-5 h-5" />
                            </button>
                          </div>
                          {errors.client_id && <p className="mt-1 text-sm text-red-600">{errors.client_id.message}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Profissional *</label>
                          <Dropdown value={professionals.find(p => p.id === watchedProfessionalId) || null} options={professionals} onChange={(e) => setValue('professional_id', e.value?.id)} optionLabel="name" placeholder="Selecione um profissional" valueTemplate={selectedProfessionalTemplate} itemTemplate={professionalOptionTemplate} className="w-full" />
                          {errors.professional_id && <p className="mt-1 text-sm text-red-600">{errors.professional_id.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Serviço *</label>
                          <Dropdown value={services.find(s => s.id === watchedServiceId) || null} options={services} onChange={(e) => setValue('service_id', e.value?.id)} optionLabel="name" placeholder="Selecione um serviço" itemTemplate={serviceOptionTemplate} className="w-full" filter />
                           {errors.service_id && <p className="mt-1 text-sm text-red-600">{errors.service_id.message}</p>}
                        </div>
                       
                        <div>
                          <label htmlFor="price" className="block text-sm font-medium text-gray-700">Preço (R$) *</label>
                          <Controller
                              name="price"
                              control={control}
                              rules={{ required: 'O preço é obrigatório.' }}
                              render={({ field, fieldState }) => (
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
                                  />
                              )}
                          />
                          {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>}
                        </div>
                       
                       <div>
                          <label htmlFor="appointment_date_date" className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                          <Controller
                              name="appointment_date"
                              control={control}
                              render={({ field }) => (
                                  <Calendar
                                      id="appointment_date_date"
                                      value={field.value}
                                      onChange={(e) => {
                                          const newDate = moment(e.value as Date);
                                          const currentDate = moment(field.value);
                                          currentDate.year(newDate.year()).month(newDate.month()).date(newDate.date());
                                          field.onChange(currentDate.toDate());
                                      }}
                                      minDate={!editingAppointment ? new Date() : undefined}
                                      dateFormat="dd/mm/yy"
                                      className="w-full"
                                      placeholder="DD/MM/AAAA"
                                      locale="pt-BR"
                                  />
                              )}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Horário *</label>
                          <Controller
                              name="appointment_date"
                              control={control}
                              render={({ field }) => (
                                  <TimeSlotPicker
                                      selectedDate={field.value}
                                      appointments={appointments}
                                      professional={selectedProfessional}
                                      serviceDuration={serviceDuration}
                                      value={field.value}
                                      onChange={(newTimeValue: Date) => {
                                        field.onChange(newTimeValue);
                                      }}
                                  />
                              )}
                          />
                          {errors.appointment_date && <p className="mt-1 text-sm text-red-600">{errors.appointment_date.message}</p>}
                        </div>
                     </div>
                   </div>
                   <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse items-center">
                      <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-pink-500 to-violet-500 text-base font-medium text-white hover:from-pink-600 hover:to-violet-600 sm:ml-3 sm:w-auto sm:text-sm">
                       {editingAppointment ? 'Atualizar' : 'Criar'}
                     </button>
                     <button type="button" onClick={handleCloseModal} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm">
                       Cancelar
                     </button>
                      {editingAppointment && (
                         <button
                         type="button"
                         onClick={() => handleDeleteClick(editingAppointment)}
                         className="mt-3 sm:mt-0 mr-auto w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:w-auto sm:text-sm"
                         >
                         Excluir
                         </button>
                     )}
                   </div>
                </form>
              </div>
            </div>
           </div>
        )}

        {/* 5. Renderização do novo modal de cliente */}
        <ClientFormModal
          isOpen={isClientModalOpen}
          onClose={() => setIsClientModalOpen(false)}
          onClientCreated={handleClientCreated}
          editingClient={null} 
        />

        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="Excluir Agendamento"
          message={`Tem certeza que deseja excluir o agendamento para "${appointmentToDelete?.client_name}"?`}
          confirmText="Excluir"
          cancelText="Cancelar"
          variant="danger"
        />

        <div className="lg:hidden fixed bottom-6 right-6 z-40">
          <button
            onClick={() => handleOpenModal()}
            className="bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-full p-4 shadow-lg hover:scale-110 active:scale-100 transition-transform duration-200"
            aria-label="Novo Agendamento"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    </Layout>
  );
}