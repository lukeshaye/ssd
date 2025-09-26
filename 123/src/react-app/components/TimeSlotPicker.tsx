// src/react-app/components/TimeSlotPicker.tsx (VERSÃO FINAL CORRIGIDA)

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

    const slots = [];
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

    const professionalAppointments = appointments.filter(
      app => app.professional_id === professional.id && moment(app.appointment_date).isSame(selectedDate, 'day')
    );

    const now = moment();
    let currentTime = moment(selectedDate).isSame(now, 'day') && now.isAfter(workDayStart)
        ? now.clone().minutes(Math.ceil(now.minutes() / slotInterval) * slotInterval).seconds(0)
        : workDayStart.clone();

    // --- CORREÇÃO DEFINITIVA APLICADA AQUI ---
    while (true) {
      const slotEnd = currentTime.clone().add(serviceDuration, 'minutes');

      // Se o fim do serviço ultrapassa o fim do expediente, paramos de gerar horários.
      if (slotEnd.isAfter(workDayEnd)) {
        break;
      }
      
      const isOccupied = professionalAppointments.some(app => {
        const existingStart = moment(app.appointment_date);
        const existingEnd = moment(app.end_date);
        return currentTime.isBefore(existingEnd) && slotEnd.isAfter(existingStart);
      });

      const isDuringLunch = lunchStart && lunchEnd ? 
        (currentTime.isBetween(lunchStart, lunchEnd, undefined, '[)') || slotEnd.isAfter(lunchStart) && currentTime.isBefore(lunchStart))
        : false;
      
      if (!isOccupied && !isDuringLunch) {
        slots.push({
          label: currentTime.format('HH:mm'),
          value: currentTime.toDate(),
        });
      }
      
      currentTime.add(slotInterval, 'minutes');
    }

    return slots;
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