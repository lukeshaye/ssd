// src/react-app/components/ProfessionalFormModal.tsx

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { useAppStore } from '../../shared/store';
import { useToastHelpers } from '../contexts/ToastContext';
import { X, User, Palette, DollarSign, Percent } from 'lucide-react';
import type { ProfessionalType } from '../../shared/types';
import { CreateProfessionalSchema } from '../../shared/types';

// --- PrimeReact Imports ---
import { InputText } from 'primereact/inputtext';
import { ColorPicker } from 'primereact/colorpicker';
import { InputNumber } from 'primereact/inputnumber';

// --- Definição de Tipos ---
interface ProfessionalFormData {
  name: string;
  color?: string | null;
  salary?: number | null;
  commission_rate?: number | null;
}

interface ProfessionalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProfessional: ProfessionalType | null;
}

const defaultFormValues: ProfessionalFormData = {
    name: '',
    color: '#a855f7', // Cor padrão
    salary: null,
    commission_rate: null,
};

export default function ProfessionalFormModal({ isOpen, onClose, editingProfessional }: ProfessionalFormModalProps) {
  const { user } = useSupabaseAuth();
  const { addProfessional, updateProfessional } = useAppStore();
  const { showSuccess, showError } = useToastHelpers();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfessionalFormData>({
    resolver: zodResolver(CreateProfessionalSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange',
  });

  const onSubmit = async (formData: ProfessionalFormData) => {
    if (!user) return;
    
    // Converte os valores para o formato correto antes de enviar
    const professionalData = {
        ...formData,
        salary: formData.salary ? Math.round(formData.salary * 100) : undefined, // Salva em centavos
        commission_rate: formData.commission_rate ? formData.commission_rate / 100 : undefined, // Salva como decimal (ex: 0.10)
        color: formData.color ? `#${formData.color}`: null
    };

    try {
      if (editingProfessional) {
        await updateProfessional({ ...editingProfessional, ...professionalData });
        showSuccess('Profissional atualizado!');
      } else {
        await addProfessional(professionalData, user.id);
        showSuccess('Profissional adicionado!');
      }
      onClose();
    } catch (error) {
      console.error("Erro ao salvar profissional:", (error as Error).message);
      showError('Erro ao salvar profissional', 'Verifique os dados e tente novamente.');
    }
  };
  
  useEffect(() => {
    if (isOpen) {
      if (editingProfessional) {
        reset({
            name: editingProfessional.name,
            color: editingProfessional.color?.substring(1) || 'a855f7', // Remove o '#' para o ColorPicker
            salary: editingProfessional.salary ? editingProfessional.salary / 100 : null, // Converte de centavos para Reais
            commission_rate: editingProfessional.commission_rate ? editingProfessional.commission_rate * 100 : null, // Converte de decimal para %
        });
      } else {
        reset(defaultFormValues);
      }
    }
  }, [isOpen, editingProfessional, reset]);

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
                  {editingProfessional ? 'Editar Profissional' : 'Novo Profissional'}
                </h3>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field, fieldState }) => (
                      <span className="p-input-icon-left w-full">
                        <User className="h-4 w-4 text-gray-400" />
                        <InputText 
                          id={field.name} 
                          {...field} 
                          placeholder="Ex: João da Silva"
                          className={`w-full pl-10 ${fieldState.error ? 'p-invalid' : ''}`} 
                        />
                      </span>
                    )}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                </div>

                <div>
                    <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">Cor de Identificação</label>
                    <Controller
                        name="color"
                        control={control}
                        render={({ field }) => (
                            <div className="flex items-center gap-2">
                                <ColorPicker 
                                    id={field.name}
                                    value={field.value as string} 
                                    onChange={(e) => field.onChange(e.value as string)}
                                    className="p-colorpicker-trigger"
                                />
                                <span className="p-input-icon-left w-full">
                                    <Palette className="h-4 w-4 text-gray-400" />
                                    <InputText
                                        value={field.value ? `#${field.value}` : ''}
                                        onChange={(e) => {
                                            const color = e.target.value.startsWith('#') ? e.target.value.substring(1) : e.target.value;
                                            field.onChange(color);
                                        }}
                                        placeholder="#a855f7"
                                        className="w-full pl-10"
                                    />
                                </span>
                            </div>
                        )}
                    />
                    {errors.color && <p className="mt-1 text-sm text-red-600">{errors.color.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-1">Salário Base (R$)</label>
                    <Controller
                        name="salary"
                        control={control}
                        render={({ field, fieldState }) => (
                            <span className="p-input-icon-left w-full">
                                <DollarSign className="h-4 w-4 text-gray-400" />
                                <InputNumber
                                    id={field.name}
                                    ref={field.ref}
                                    value={field.value}
                                    onBlur={field.onBlur}
                                    onValueChange={(e) => field.onChange(e.value)}
                                    mode="currency"
                                    currency="BRL"
                                    locale="pt-BR"
                                    placeholder="R$ 1.500,00"
                                    className={`w-full ${fieldState.error ? 'p-invalid' : ''}`}
                                    inputClassName="pl-10"
                                />
                            </span>
                        )}
                    />
                     {errors.salary && <p className="mt-1 text-sm text-red-600">{errors.salary.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="commission_rate" className="block text-sm font-medium text-gray-700 mb-1">Comissão (%)</label>
                    <Controller
                        name="commission_rate"
                        control={control}
                        render={({ field, fieldState }) => (
                            <span className="p-input-icon-left w-full">
                                <Percent className="h-4 w-4 text-gray-400" />
                                <InputNumber
                                    id={field.name}
                                    ref={field.ref}
                                    value={field.value}
                                    onBlur={field.onBlur}
                                    onValueChange={(e) => field.onChange(e.value)}
                                    min={0}
                                    max={100}
                                    placeholder="10"
                                    suffix=" %"
                                    className={`w-full ${fieldState.error ? 'p-invalid' : ''}`}
                                    inputClassName="pl-10"
                                />
                            </span>
                        )}
                    />
                    {errors.commission_rate && <p className="mt-1 text-sm text-red-600">{errors.commission_rate.message}</p>}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button type="submit" disabled={isSubmitting} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-pink-500 to-violet-500 text-base font-medium text-white hover:from-pink-600 hover:to-violet-600 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                {isSubmitting ? 'Salvando...' : 'Salvar Profissional'}
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
