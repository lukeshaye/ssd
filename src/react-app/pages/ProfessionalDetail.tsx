// src/react-app/pages/ProfessionalDetail.tsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { useAppStore } from '../../shared/store';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../supabaseClient'; // Importe o cliente Supabase!
import { BarChart, Calendar, XCircle, DollarSign, ArrowLeft } from 'lucide-react';
import type { ProfessionalType } from '../../shared/types';
import { useToastHelpers } from '../contexts/ToastContext';

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

export default function ProfessionalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { professionals, fetchProfessionals } = useAppStore();
  const { showError } = useToastHelpers();

  const [professional, setProfessional] = useState<ProfessionalType | null>(null);
  const [stats, setStats] = useState<ProfessionalStats | null>(null);
  const [absences, setAbsences] = useState<ProfessionalAbsence[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

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

        // **CORREÇÃO: Chamar o Supabase diretamente do frontend**
        const [statsResponse, absencesResponse] = await Promise.all([
          supabase.rpc('get_professional_stats', { professional_id_param: professionalId }),
          supabase.from('professional_absences').select('*').eq('professional_id', professionalId)
        ]);
        
        if (statsResponse.error) throw statsResponse.error;
        if (absencesResponse.error) throw absencesResponse.error;

        setStats(statsResponse.data);
        setAbsences(absencesResponse.data || []);

      } catch (error) {
        console.error("Erro ao carregar detalhes do profissional:", (error as Error).message);
        showError('Erro ao carregar detalhes', (error as Error).message);
        navigate('/professionals');
      } finally {
        setLoading(false);
      }
    };

    loadProfessionalData();
  }, [id, user, professionals, navigate, showError, fetchProfessionals]);


  if (loading) {
    return <Layout><LoadingSpinner /></Layout>;
  }

  if (!professional) {
    return (
      <Layout>
        <div className="text-center py-10">
          <p>Profissional não encontrado.</p>
          <Link to="/professionals" className="text-pink-600 hover:underline">Voltar para a lista</Link>
        </div>
      </Layout>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart },
    { id: 'schedule', label: 'Agenda', icon: Calendar },
    { id: 'absences', label: 'Faltas', icon: XCircle },
    { id: 'financial', label: 'Financeiro', icon: DollarSign },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard title="Total de Atendimentos" value={stats?.totalServices} />
            <StatCard title="Atendimentos no Mês" value={stats?.monthlyServices} />
            <StatCard title="Atendimentos na Semana" value={stats?.weeklyServices} />
            <StatCard title="Serviço Mais Realizado" value={stats?.topService?.service || 'N/A'} isText />
            <StatCard title="Cliente Mais Atendido" value={stats?.topClient?.client_name || 'N/A'} isText />
          </div>
        );
      case 'schedule':
        return <div className="text-center py-10 text-gray-500">Funcionalidade de agenda do profissional em desenvolvimento.</div>;
      case 'absences':
        return (
          <div>
            {absences.length === 0 ? (
              <p className="text-center py-10 text-gray-500">Nenhuma falta registrada.</p>
            ) : (
              <ul className="space-y-3">
                {absences.map(absence => (
                  <li key={absence.id} className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
                    <div>
                      <p className="font-medium">{new Date(absence.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                      <p className="text-sm text-gray-600">{absence.reason || 'Sem motivo especificado'}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      case 'financial':
        return <div className="text-center py-10 text-gray-500">Funcionalidade financeira do profissional em desenvolvimento.</div>;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
            <Link to="/professionals" className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para todos os profissionais
            </Link>
          <h1 className="text-3xl font-bold text-gray-900">{professional.name}</h1>
          <p className="text-gray-600">Detalhes e gestão do profissional</p>
        </div>

        <div>
          <div className="sm:hidden">
            <select
              id="tabs"
              name="tabs"
              className="block w-full rounded-md border-gray-300 focus:border-pink-500 focus:ring-pink-500"
              onChange={(e) => setActiveTab(e.target.value)}
              value={activeTab}
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>{tab.label}</option>
              ))}
            </select>
          </div>
          <div className="hidden sm:block">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-pink-500 text-pink-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="mr-2 h-5 w-5" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
        
        <div className="mt-8">
          {renderContent()}
        </div>
      </div>
    </Layout>
  );
}

// Componente auxiliar para os cartões de estatística
const StatCard = ({ title, value, isText = false }: { title: string, value?: string | number, isText?: boolean }) => (
    <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-200">
        <h4 className="text-sm font-medium text-gray-500">{title}</h4>
        <p className={`mt-1 font-semibold text-gray-900 ${isText ? 'text-xl' : 'text-3xl'}`}>
            {value ?? '...'}
        </p>
    </div>
);
