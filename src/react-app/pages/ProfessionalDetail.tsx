// src/react-app/pages/ProfessionalDetail.tsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { useAppStore } from '../../shared/store';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { supabase } from '../supabaseClient';
import { BarChart, Calendar, XCircle, DollarSign, ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import type { ProfessionalType } from '../../shared/types';
import { useToastHelpers } from '../contexts/ToastContext';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { formatCurrency } from '../utils';
import moment from 'moment';

// --- Tipos para os dados do componente ---
interface ProfessionalStats {
  totalServices: number;
  monthlyServices: number;
  weeklyServices: number;
  topService: { service: string; count: number } | null;
  topClient: { client_name: string; count: number } | null;
}

interface ProfessionalAbsence {
  id: number;
  date: string;
  reason: string | null;
}

interface ProfessionalException {
    id: number;
    start_date: string;
    end_date: string;
    description: string;
}

interface AbsenceFormData {
    date: string;
    reason: string;
}

interface ExceptionFormData {
    start_date: string;
    end_date: string;
    description: string;
}

interface ScheduleFormData {
  schedules: {
    day_of_week: number;
    start_time: string | null;
    end_time: string | null;
    lunch_start_time: string | null;
    lunch_end_time: string | null;
  }[];
}

interface FinancialSummary {
    commissionEarnings: number;
    totalAppointments: number;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Segunda-feira' }, { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' }, { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' }, { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

export default function ProfessionalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { professionals, fetchProfessionals } = useAppStore();
  const { showSuccess, showError } = useToastHelpers();

  // --- Estados do Componente ---
  const [professional, setProfessional] = useState<ProfessionalType | null>(null);
  const [stats, setStats] = useState<ProfessionalStats | null>(null);
  const [absences, setAbsences] = useState<ProfessionalAbsence[]>([]);
  const [exceptions, setExceptions] = useState<ProfessionalException[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [isDeleteAbsenceModalOpen, setIsDeleteAbsenceModalOpen] = useState(false);
  const [absenceToDelete, setAbsenceToDelete] = useState<ProfessionalAbsence | null>(null);
  const [isDeleteExceptionModalOpen, setIsDeleteExceptionModalOpen] = useState(false);
  const [exceptionToDelete, setExceptionToDelete] = useState<ProfessionalException | null>(null);

  // --- Formulários ---
  const absenceForm = useForm<AbsenceFormData>({ defaultValues: { date: new Date().toISOString().split('T')[0], reason: '' } });
  const exceptionForm = useForm<ExceptionFormData>({ defaultValues: { start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], description: '' }});
  const scheduleForm = useForm<ScheduleFormData>({ defaultValues: { schedules: DAYS_OF_WEEK.map(day => ({ day_of_week: day.value, start_time: null, end_time: null, lunch_start_time: null, lunch_end_time: null }))}});
  const { fields } = useFieldArray({ control: scheduleForm.control, name: "schedules" });

  // --- Carregamento de Dados ---
  useEffect(() => {
    const professionalId = Number(id);
    if (!user || !id || isNaN(professionalId)) {
      navigate('/professionals');
      return;
    }

    const loadProfessionalData = async () => {
      setLoading(true);
      try {
        let foundProfessional = professionals.find(p => p.id === professionalId);
        if (!foundProfessional) {
          await fetchProfessionals(user.id);
          foundProfessional = useAppStore.getState().professionals.find(p => p.id === professionalId);
        }
        if (!foundProfessional) throw new Error("Profissional não encontrado");
        setProfessional(foundProfessional);

        const startOfMonth = moment().startOf('month').toISOString();
        const endOfMonth = moment().endOf('month').toISOString();

        const [statsRes, absencesRes, financialRes, exceptionsRes, schedulesRes] = await Promise.all([
          supabase.rpc('get_professional_stats', { professional_id_param: professionalId }),
          supabase.from('professional_absences').select('*').eq('professional_id', professionalId).order('date', { ascending: false }),
          supabase.from('appointments').select('price').eq('professional_id', professionalId).eq('attended', true).gte('appointment_date', startOfMonth).lte('appointment_date', endOfMonth),
          supabase.from('professional_exceptions').select('*').eq('professional_id', professionalId).order('start_date', { ascending: false }),
          supabase.from('professional_schedules').select('*').eq('professional_id', professionalId),
        ]);

        if (statsRes.error) throw statsRes.error;
        if (absencesRes.error) throw absencesRes.error;
        if (financialRes.error) throw financialRes.error;
        if (exceptionsRes.error) throw exceptionsRes.error;
        if (schedulesRes.error) throw schedulesRes.error;

        // Processamento Financeiro
        const commissionableValue = financialRes.data?.reduce((sum, app) => sum + app.price, 0) || 0;
        const commissionEarnings = commissionableValue * (foundProfessional.commission_rate || 0);
        setFinancialSummary({ commissionEarnings, totalAppointments: financialRes.data?.length || 0 });

        // Processamento de Horários
        const scheduleData = DAYS_OF_WEEK.map(day => {
            const existing = schedulesRes.data?.find(s => s.day_of_week === day.value);
            return existing || { day_of_week: day.value, start_time: null, end_time: null, lunch_start_time: null, lunch_end_time: null };
        });
        scheduleForm.reset({ schedules: scheduleData });

        setStats(statsRes.data);
        setAbsences(absencesRes.data || []);
        setExceptions(exceptionsRes.data || []);

      } catch (error) {
        showError('Erro ao carregar detalhes', (error as Error).message);
        navigate('/professionals');
      } finally {
        setLoading(false);
      }
    };

    loadProfessionalData();
  }, [id, user, professionals, navigate, showError, fetchProfessionals, scheduleForm]);

  // --- Manipuladores de Eventos (Handlers) ---

  const onAddAbsence = async (formData: AbsenceFormData) => {
    if (!user || !professional) return;
    try {
        const { data, error } = await supabase.from('professional_absences').insert({ professional_id: professional.id, user_id: user.id, date: formData.date, reason: formData.reason }).select();
        if (error) throw error;
        if (data) setAbsences(prev => [data[0], ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        showSuccess("Falta registrada!");
        absenceForm.reset({ date: new Date().toISOString().split('T')[0], reason: '' });
    } catch (error) { showError("Erro ao registrar falta", (error as Error).message); }
  };

  const handleDeleteAbsenceConfirm = async () => {
    if (!user || !absenceToDelete) return;
    try {
        const { error } = await supabase.from('professional_absences').delete().eq('id', absenceToDelete.id);
        if (error) throw error;
        setAbsences(prev => prev.filter(a => a.id !== absenceToDelete.id));
        showSuccess("Falta removida!");
    } catch (error) { showError("Erro ao remover falta", (error as Error).message);
    } finally {
        setIsDeleteAbsenceModalOpen(false);
        setAbsenceToDelete(null);
    }
  };

  const onAddException = async (formData: ExceptionFormData) => {
    if (!user || !professional) return;
    try {
        const { data, error } = await supabase.from('professional_exceptions').insert({ professional_id: professional.id, user_id: user.id, ...formData }).select();
        if (error) throw error;
        if (data) setExceptions(prev => [data[0], ...prev].sort((a,b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()));
        showSuccess("Exceção registrada!");
        exceptionForm.reset({ start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], description: '' });
    } catch (error) { showError("Erro ao registrar exceção", (error as Error).message); }
  };
  
  const handleDeleteExceptionConfirm = async () => {
    if (!user || !exceptionToDelete) return;
    try {
        const { error } = await supabase.from('professional_exceptions').delete().eq('id', exceptionToDelete.id);
        if (error) throw error;
        setExceptions(prev => prev.filter(e => e.id !== exceptionToDelete.id));
        showSuccess("Exceção removida!");
    } catch (error) { showError("Erro ao remover exceção", (error as Error).message);
    } finally {
        setIsDeleteExceptionModalOpen(false);
        setExceptionToDelete(null);
    }
  };

  const onSaveSchedule = async (formData: ScheduleFormData) => {
    if (!user || !professional) return;
    try {
        const schedulesToUpsert = formData.schedules.map(s => ({
            professional_id: professional.id,
            user_id: user.id,
            day_of_week: s.day_of_week,
            start_time: s.start_time || null,
            end_time: s.end_time || null,
            lunch_start_time: s.lunch_start_time || null,
            lunch_end_time: s.lunch_end_time || null,
        }));

        const { error } = await supabase.from('professional_schedules').upsert(schedulesToUpsert, { onConflict: 'professional_id, day_of_week' });
        if (error) throw error;
        showSuccess("Horários salvos com sucesso!");
    } catch (error) {
        showError("Erro ao salvar horários", (error as Error).message);
    }
  };


  // --- Renderização ---
  if (loading) return <Layout><LoadingSpinner /></Layout>;
  if (!professional) return <Layout><p className="text-center py-10">Profissional não encontrado.</p></Layout>;

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart }, { id: 'absences', label: 'Faltas', icon: XCircle },
    { id: 'financial', label: 'Financeiro', icon: DollarSign }, { id: 'schedule', label: 'Horários', icon: Calendar },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> <StatCard title="Total de Atendimentos" value={stats?.totalServices} /> <StatCard title="Atendimentos no Mês" value={stats?.monthlyServices} /> <StatCard title="Atendimentos na Semana" value={stats?.weeklyServices} /> <StatCard title="Serviço Mais Realizado" value={stats?.topService?.service || 'N/A'} isText /> <StatCard title="Cliente Mais Atendido" value={stats?.topClient?.client_name || 'N/A'} isText /> </div>;
      case 'absences': return <div className="grid grid-cols-1 md:grid-cols-3 gap-8"> <div className="md:col-span-1"> <h4 className="text-lg font-medium text-gray-800 mb-4">Registrar Nova Falta</h4> <form onSubmit={absenceForm.handleSubmit(onAddAbsence)} className="space-y-4 bg-gray-50 p-4 rounded-lg border"> <div> <label htmlFor="date" className="block text-sm font-medium text-gray-700">Data *</label> <Controller name="date" control={absenceForm.control} render={({ field }) => (<input type="date" {...field} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500"/>)}/> </div> <div> <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Motivo (opcional)</label> <Controller name="reason" control={absenceForm.control} render={({ field }) => (<textarea {...field} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500" placeholder="Ex: Consulta médica"/>)}/> </div> <button type="submit" disabled={absenceForm.formState.isSubmitting} className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 disabled:opacity-50"> <Plus className="w-4 h-4 mr-2"/> {absenceForm.formState.isSubmitting ? 'Registrando...' : 'Registrar'} </button> </form> </div> <div className="md:col-span-2"> <h4 className="text-lg font-medium text-gray-800 mb-4">Histórico de Faltas ({absences.length})</h4> {absences.length === 0 ? (<p className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">Nenhuma falta registrada.</p>) : (<ul className="space-y-3 max-h-96 overflow-y-auto pr-2"> {absences.map(absence => (<li key={absence.id} className="bg-white p-3 rounded-md border flex justify-between items-center"> <div> <p className="font-medium">{new Date(absence.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p> <p className="text-sm text-gray-600 italic">{absence.reason || 'Sem motivo especificado'}</p> </div> <button onClick={() => { setAbsenceToDelete(absence); setIsDeleteAbsenceModalOpen(true); }} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"> <Trash2 className="w-4 h-4"/> </button> </li>))} </ul>)} </div> </div>;
      case 'financial': const salary = professional.salary || 0; const commission = financialSummary?.commissionEarnings || 0; const totalEarnings = salary + commission; return <div className="max-w-2xl mx-auto"> <h4 className="text-lg font-medium text-gray-800 mb-4"> Resumo Financeiro - {moment().format('MMMM [de] YYYY')} </h4> <div className="bg-white border rounded-lg shadow-sm divide-y"> <div className="p-4 flex justify-between items-center"> <p className="text-gray-600">Salário Base</p> <p className="font-semibold text-gray-900">{formatCurrency(salary)}</p> </div> <div className="p-4 flex justify-between items-center"> <p className="text-gray-600">Taxa de Comissão</p> <p className="font-semibold text-gray-900">{(professional.commission_rate || 0) * 100}%</p> </div> <div className="p-4 flex justify-between items-center bg-gray-50"> <p className="text-gray-600"> Ganhos com Comissão ({financialSummary?.totalAppointments} atendimentos) </p> <p className="font-semibold text-green-600">{formatCurrency(commission)}</p> </div> <div className="p-4 flex justify-between items-center text-lg"> <p className="font-bold text-gray-800">Ganhos Totais no Mês</p> <p className="font-bold text-blue-600">{formatCurrency(totalEarnings)}</p> </div> </div> </div>;
      case 'schedule': return <div className="space-y-8"> <form onSubmit={scheduleForm.handleSubmit(onSaveSchedule)}> <div className="bg-white p-6 rounded-lg shadow-sm border"> <h4 className="text-lg font-medium text-gray-800 mb-6">Horário Padrão de Trabalho</h4> <div className="space-y-4"> {fields.map((field, index) => (<div key={field.id} className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center"> <label className="text-sm font-medium text-gray-700 md:col-span-1">{DAYS_OF_WEEK.find(d => d.value === field.day_of_week)?.label}</label> <div className="col-span-2 md:col-span-2 flex items-center gap-2"> <input type="time" {...scheduleForm.register(`schedules.${index}.start_time`)} className="input-time"/> <span className="text-gray-500">-</span> <input type="time" {...scheduleForm.register(`schedules.${index}.end_time`)} className="input-time"/> </div> <div className="col-span-2 md:col-span-2 flex items-center gap-2"> <input type="time" {...scheduleForm.register(`schedules.${index}.lunch_start_time`)} className="input-time" placeholder="Almoço Início"/> <span className="text-gray-500">-</span> <input type="time" {...scheduleForm.register(`schedules.${index}.lunch_end_time`)} className="input-time" placeholder="Almoço Fim"/> </div> </div>))} </div> <div className="mt-6 flex justify-end"> <button type="submit" disabled={scheduleForm.formState.isSubmitting} className="btn-primary"> <Save className="w-4 h-4 mr-2"/> {scheduleForm.formState.isSubmitting ? 'Salvando...' : 'Salvar Horários'} </button> </div> </div> </form> <div className="grid grid-cols-1 md:grid-cols-3 gap-8"> <div className="md:col-span-1"> <h4 className="text-lg font-medium text-gray-800 mb-4">Registrar Férias/Folga</h4> <form onSubmit={exceptionForm.handleSubmit(onAddException)} className="space-y-4 bg-gray-50 p-4 rounded-lg border"> <div> <label className="label">Descrição *</label> <Controller name="description" control={exceptionForm.control} render={({ field }) => (<input type="text" {...field} className="input" placeholder="Ex: Férias de Verão"/>)}/> </div> <div className="grid grid-cols-2 gap-4"> <div> <label className="label">Data Início *</label> <Controller name="start_date" control={exceptionForm.control} render={({ field }) => (<input type="date" {...field} className="input"/>)}/> </div> <div> <label className="label">Data Fim *</label> <Controller name="end_date" control={exceptionForm.control} render={({ field }) => (<input type="date" {...field} className="input"/>)}/> </div> </div> <button type="submit" disabled={exceptionForm.formState.isSubmitting} className="w-full btn-primary"> <Plus className="w-4 h-4 mr-2"/> {exceptionForm.formState.isSubmitting ? 'Registrando...' : 'Registrar Exceção'} </button> </form> </div> <div className="md:col-span-2"> <h4 className="text-lg font-medium text-gray-800 mb-4">Histórico de Exceções ({exceptions.length})</h4> {exceptions.length === 0 ? (<p className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">Nenhuma exceção registrada.</p>) : (<ul className="space-y-3 max-h-72 overflow-y-auto pr-2"> {exceptions.map(exception => (<li key={exception.id} className="bg-white p-3 rounded-md border flex justify-between items-center"> <div> <p className="font-medium">{exception.description}</p> <p className="text-sm text-gray-600">{moment(exception.start_date).format('DD/MM/YY')} - {moment(exception.end_date).format('DD/MM/YY')}</p> </div> <button onClick={() => { setExceptionToDelete(exception); setIsDeleteExceptionModalOpen(true); }} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"> <Trash2 className="w-4 h-4"/> </button> </li>))} </ul>)} </div> </div> </div>;
      default: return null;
    }
  };

  return (
    <Layout>
        <style>{` .input { width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; } .input-time { width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.25rem 0.5rem; } .label { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; } .btn-primary { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; border: 1px solid transparent; font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; color: white; background-image: linear-gradient(to right, #ec4899, #8b5cf6); } .btn-primary:hover { background-image: linear-gradient(to right, #db2777, #7c3aed); } .btn-primary:disabled { opacity: 0.5; } `}</style>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
            <Link to="/professionals" className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"> <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para todos os profissionais </Link>
            <h1 className="text-3xl font-bold text-gray-900">{professional.name}</h1>
            <p className="text-gray-600">Detalhes e gestão do profissional</p>
        </div>
        <div>
          <div className="sm:hidden"> <select id="tabs" name="tabs" className="block w-full rounded-md border-gray-300 focus:border-pink-500 focus:ring-pink-500" onChange={(e) => setActiveTab(e.target.value)} value={activeTab}> {tabs.map((tab) => (<option key={tab.id} value={tab.id}>{tab.label}</option>))} </select> </div>
          <div className="hidden sm:block"> <div className="border-b border-gray-200"> <nav className="-mb-px flex space-x-8" aria-label="Tabs"> {tabs.map((tab) => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap flex items-center py-4 px-1 border-b-2 font-medium text-sm ${ activeTab === tab.id ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300' }`}> <tab.icon className="mr-2 h-5 w-5" /> {tab.label} </button>))} </nav> </div> </div>
        </div>
        <div className="mt-8">{renderContent()}</div>
      </div>
      <ConfirmationModal isOpen={isDeleteAbsenceModalOpen} onClose={() => setIsDeleteAbsenceModalOpen(false)} onConfirm={handleDeleteAbsenceConfirm} title="Excluir Registro de Falta" message={`Tem certeza que deseja remover o registro de falta do dia ${absenceToDelete ? new Date(absenceToDelete.date + 'T00:00:00').toLocaleDateString('pt-BR') : ''}?`} confirmText="Excluir" variant="danger" />
      <ConfirmationModal isOpen={isDeleteExceptionModalOpen} onClose={() => setIsDeleteExceptionModalOpen(false)} onConfirm={handleDeleteExceptionConfirm} title="Excluir Exceção" message={`Tem certeza que deseja remover o registro de "${exceptionToDelete?.description}"?`} confirmText="Excluir" variant="danger" />
    </Layout>
  );
}

const StatCard = ({ title, value, isText = false }: { title: string, value?: string | number, isText?: boolean }) => ( <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-200"> <h4 className="text-sm font-medium text-gray-500">{title}</h4> <p className={`mt-1 font-semibold text-gray-900 ${isText ? 'text-xl' : 'text-3xl'}`}> {value ?? '...'} </p> </div> );
