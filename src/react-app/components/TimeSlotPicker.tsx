// src/react-app/components/TimeSlotPicker.tsx (Nova Estratégia)

import { useMemo } from 'react';
import { SelectButton } from 'primereact/selectbutton';
import moment from 'moment';
import type { AppointmentType, ProfessionalType } from '../../shared/types';

interface TimeSlotPickerProps {
  selectedDate: Date;
  appointments: AppointmentType[];
  professional: ProfessionalType | null;
  serviceDuration: number;
  value: Date | null;
  onChange: (date: Date) => void;
}

export function TimeSlotPicker({ selectedDate, appointments, professional, serviceDuration, value, onChange }: TimeSlotPickerProps) {

  const timeSlots = useMemo(() => {
    if (!professional || !professional.work_start_time || !professional.work_end_time) {
      return [];
    }

    const allPossibleSlots = [];
    const {
      work_start_time,
      work_end_time,
      lunch_start_time,
      lunch_end_time
    } = professional;

    const [startHour, startMinute] = work_start_time.split(':').map(Number);
    const [endHour, endMinute] = work_end_time.split(':').map(Number);

    const workDayStart = moment(selectedDate).startOf('day').hour(startHour).minute(startMinute);
    const workDayEnd = moment(selectedDate).startOf('day').hour(endHour).minute(endMinute);

    const lunchStart = lunch_start_time ? moment(selectedDate).startOf('day').hour(parseInt(lunch_start_time.split(':')[0])).minute(parseInt(lunch_start_time.split(':')[1])) : null;
    const lunchEnd = lunch_end_time ? moment(selectedDate).startOf('day').hour(parseInt(lunch_end_time.split(':')[0])).minute(parseInt(lunch_end_time.split(':')[1])) : null;

    const slotInterval = 30;

    // 1. Gerar todos os slots possíveis do dia
    let tempTime = workDayStart.clone();
    while (tempTime.isBefore(workDayEnd)) {
      allPossibleSlots.push(tempTime.clone());
      tempTime.add(slotInterval, 'minutes');
    }

    const professionalAppointments = appointments.filter(
      app => app.professional_id === professional.id && moment(app.appointment_date).isSame(selectedDate, 'day')
    );
    
    const now = moment();

    // 2. Filtrar os slots, removendo os inválidos
    const availableSlots = allPossibleSlots.filter(slotStartTime => {
      const slotEndTime = slotStartTime.clone().add(serviceDuration, 'minutes');

      // Filtro 1: O slot já passou (para o dia de hoje)
      if (moment(selectedDate).isSame(now, 'day') && slotStartTime.isBefore(now)) {
        return false;
      }
      
      // Filtro 2: O serviço termina DEPOIS do fim do expediente
      if (slotEndTime.isAfter(workDayEnd)) {
        return false;
      }

      // Filtro 3: O slot está ocupado por outro agendamento
      const isOccupied = professionalAppointments.some(app => {
        const existingStart = moment(app.appointment_date);
        const existingEnd = moment(app.end_date);
        return slotStartTime.isBefore(existingEnd) && slotEndTime.isAfter(existingStart);
      });
      if (isOccupied) {
        return false;
      }

      // Filtro 4: O slot está durante o horário de almoço
      const isDuringLunch = lunchStart && lunchEnd ?
        (slotStartTime.isBetween(lunchStart, lunchEnd, undefined, '[)') || slotEndTime.isAfter(lunchStart) && slotStartTime.isBefore(lunchStart))
        : false;
      if (isDuringLunch) {
        return false;
      }

      // Se passou por todos os filtros, o slot está disponível
      return true;
    });

    // 3. Formatar os slots disponíveis para o componente
    return availableSlots.map(slot => ({
      label: slot.format('HH:mm'),
      value: slot.toDate(),
    }));

  }, [selectedDate, appointments, professional, serviceDuration]);

  const selectedTimeValue = value ? moment(value).toDate() : null;

  const handleSelect = (e: { value: Date | null }) => {
      if (e.value) {
          onChange(e.value);
      }
  }

  if (!professional) {
      return <div className="text-center p-4 bg-gray-100 rounded-md text-sm text-gray-600">Selecione um profissional para ver os horários.</div>
  }

  if (!professional.work_start_time || !professional.work_end_time) {
      return <div className="text-center p-4 bg-gray-100 rounded-md text-sm text-gray-600">Este profissional não tem um horário de trabalho definido.</div>
  }

  if (timeSlots.length === 0) {
      return <div className="text-center p-4 bg-gray-100 rounded-md text-sm text-gray-600">Nenhum horário disponível para este profissional no dia selecionado.</div>
  }

  return (
    <SelectButton
      value={selectedTimeValue}
      options={timeSlots}
      onChange={handleSelect}
      optionLabel="label"
      optionValue="value"
      itemTemplate={(option) => <span>{option.label}</span>}
      className="time-slot-selector"
      allowEmpty={false}
    />
  );
}