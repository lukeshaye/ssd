// src/react-app/pages/Professionals.tsx

import { useState, useEffect } from 'react';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { useAppStore } from '../../shared/store';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import ProfessionalFormModal from '../components/ProfessionalFormModal'; // Importado
import { useToastHelpers } from '../contexts/ToastContext';
import { Plus, Briefcase, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ProfessionalType } from '../../shared/types';

export default function Professionals() {
  const { user } = useSupabaseAuth();
  const { professionals, loading, fetchProfessionals, deleteProfessional } = useAppStore();
  const { showSuccess, showError } = useToastHelpers();

  // --- Estados para gerenciar os modais ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<ProfessionalType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [professionalToDelete, setProfessionalToDelete] = useState<ProfessionalType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfessionals(user.id);
    }
  }, [user, fetchProfessionals]);

  // --- Funções para manipular os modais ---
  const handleNewProfessional = () => {
    setEditingProfessional(null);
    setIsModalOpen(true);
  };

  const handleEditProfessional = (professional: ProfessionalType) => {
    setEditingProfessional(professional);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProfessional(null);
  };

  const handleDeleteClick = (professional: ProfessionalType) => {
    setProfessionalToDelete(professional);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!user || !professionalToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteProfessional(professionalToDelete.id!);
      showSuccess('Profissional removido!', 'O profissional foi removido da sua equipe.');
      setIsDeleteModalOpen(false);
      setProfessionalToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir profissional:', (error as Error).message);
      showError('Erro ao remover profissional.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading.professionals) {
    return <Layout><LoadingSpinner /></Layout>;
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 pb-24 lg:pb-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-3xl font-bold text-gray-900">Profissionais</h1>
            <p className="mt-2 text-gray-600">Gerencie sua equipe</p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            {/* Botão para abrir o modal de novo profissional */}
            <button
              type="button"
              onClick={handleNewProfessional}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-pink-600 hover:to-violet-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Profissional
            </button>
          </div>
        </div>

        <div className="mt-8">
          {professionals.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum profissional</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comece adicionando um profissional à sua equipe.
              </p>
            </div>
          ) : (
            // --- Grid de Cards para os profissionais ---
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {professionals.map((professional: ProfessionalType) => (
                <div key={professional.id} className="col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
                  <div className="flex-1 p-6">
                    <Link to={`/professionals/${professional.id}`} className="block hover:opacity-80">
                      <div className="flex items-center space-x-4">
                        <div className="w-3 h-10 rounded-full" style={{ backgroundColor: professional.color || '#cccccc' }} />
                        <div>
                          <h3 className="text-gray-900 text-lg font-semibold truncate">{professional.name}</h3>
                          {/* Futuramente podemos adicionar um subtitulo aqui, como a comissão */}
                          <p className="text-sm text-gray-500">Ver detalhes e métricas</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                  <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center gap-2">
                      <button
                        onClick={() => handleEditProfessional(professional)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Edit className="w-4 h-4 mr-1.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteClick(professional)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        Excluir
                      </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Modais sendo renderizados */}
      <ProfessionalFormModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editingProfessional={editingProfessional}
      />
      
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Profissional"
        message={`Tem certeza que deseja excluir "${professionalToDelete?.name}"? Esta ação removerá o profissional da sua equipe, mas não afetará os agendamentos passados.`}
        confirmText="Excluir"
        variant="danger"
        isLoading={isDeleting}
      />
    </Layout>
  );
}
