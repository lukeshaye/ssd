// src/react-app/pages/Professionals.tsx

import { useState, useEffect } from 'react';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { useAppStore } from '../../shared/store';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { Plus, Briefcase, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ProfessionalType } from '../../shared/types';

export default function Professionals() {
  const { user } = useSupabaseAuth();
  const { professionals, loading, fetchProfessionals } = useAppStore();

  useEffect(() => {
    if (user) {
      fetchProfessionals(user.id);
    }
  }, [user, fetchProfessionals]);

  if (loading.professionals) {
    return <Layout><LoadingSpinner /></Layout>;
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-3xl font-bold text-gray-900">Profissionais</h1>
            <p className="mt-2 text-gray-600">Gerencie sua equipe</p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link
              to="/professionals/new"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-pink-600 hover:to-violet-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Profissional
            </Link>
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
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {professionals.map((professional: ProfessionalType) => (
                <li key={professional.id} className="col-span-1 bg-white rounded-lg shadow divide-y divide-gray-200">
                  <Link to={`/professionals/${professional.id}`} className="block hover:bg-gray-50">
                    <div className="w-full flex items-center justify-between p-6 space-x-6">
                      <div className="flex-1 truncate">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: professional.color || '#cccccc' }} />
                          <h3 className="text-gray-900 text-sm font-medium truncate">{professional.name}</h3>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}
