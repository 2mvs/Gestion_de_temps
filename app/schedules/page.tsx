'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Plus, Edit2, Trash2, Calendar, Settings2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { isAuthenticated } from '@/lib/auth';
import { schedulesAPI } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import { scheduleSlotTypeOptions } from '@/lib/constants';

interface ScheduleApiSlot {
  id?: number;
  slotType: string;
  startTime: string;
  endTime: string;
  label?: string | null;
  multiplier?: number | null;
}

interface Schedule {
  id: number;
  label: string;
  abbreviation?: string;
  startTime: string;
  endTime: string;
  theoreticalDayHours?: number;
  theoreticalMorningHours?: number;
  theoreticalAfternoonHours?: number;
  slots: ScheduleApiSlot[];
}

interface ScheduleSlotForm {
  id?: number;
  slotType: string;
  startTime: string;
  endTime: string;
  label: string;
  multiplier: string;
}

interface FormData {
  label: string;
  abbreviation: string;
  startTime: string;
  endTime: string;
  theoreticalDayHours: string;
  theoreticalMorningHours: string;
  theoreticalAfternoonHours: string;
  slots: ScheduleSlotForm[];
}

const defaultSlotLabel = (type: string): string => {
  switch (type) {
    case 'ENTRY_GRACE':
      return 'Franchise d\'entrée';
    case 'BREAK':
      return 'Pause';
    case 'OVERTIME':
      return 'Heures supplémentaires';
    case 'SPECIAL':
      return 'Heures spéciales';
    default:
      return type;
  }
};

const defaultSlotMultiplier = (type: string): string => {
  switch (type) {
    case 'OVERTIME':
      return '1.25';
    case 'SPECIAL':
      return '1.50';
    default:
      return '1.00';
  }
};

const defaultFormData: FormData = {
  label: '',
  abbreviation: '',
  startTime: '08:00',
  endTime: '17:00',
  theoreticalDayHours: '',
  theoreticalMorningHours: '',
  theoreticalAfternoonHours: '',
  slots: [],
};

export default function SchedulesPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadSchedules();
  }, [router]);

  const loadSchedules = async () => {
    try {
      const response = await schedulesAPI.getAll();
      const schedulesList = Array.isArray(response?.data) ? response.data : response || [];
      setSchedules(schedulesList);
    } catch (error: any) {
      console.error('Erreur lors du chargement des horaires:', error);
      alert('Erreur: ' + (error?.response?.data?.message || error?.message || 'Impossible de charger les horaires'));
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingSchedule(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        label: formData.label,
        abbreviation: formData.abbreviation || null,
        startTime: formData.startTime,
        endTime: formData.endTime,
        theoreticalDayHours:
          formData.theoreticalDayHours !== ''
            ? parseFloat(formData.theoreticalDayHours)
            : null,
        theoreticalMorningHours:
          formData.theoreticalMorningHours !== ''
            ? parseFloat(formData.theoreticalMorningHours)
            : null,
        theoreticalAfternoonHours:
          formData.theoreticalAfternoonHours !== ''
            ? parseFloat(formData.theoreticalAfternoonHours)
            : null,
        slots: formData.slots.map((slot) => ({
          slotType: slot.slotType,
          startTime: slot.startTime,
          endTime: slot.endTime,
          label: slot.label?.trim() || null,
          multiplier: slot.multiplier !== '' ? parseFloat(slot.multiplier) : 1.0,
        })),
      };

      if (editingSchedule) {
        await schedulesAPI.update(editingSchedule.id, payload);
      } else {
        await schedulesAPI.create(payload);
      }

      await loadSchedules();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur: ' + (error?.response?.data?.message || error?.message || 'Erreur inconnue'));
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      label: schedule.label,
      abbreviation: schedule.abbreviation || '',
      startTime: schedule.startTime || '08:00',
      endTime: schedule.endTime || '17:00',
      theoreticalDayHours:
        schedule.theoreticalDayHours !== undefined && schedule.theoreticalDayHours !== null
          ? String(schedule.theoreticalDayHours)
          : '',
      theoreticalMorningHours:
        schedule.theoreticalMorningHours !== undefined && schedule.theoreticalMorningHours !== null
          ? String(schedule.theoreticalMorningHours)
          : '',
      theoreticalAfternoonHours:
        schedule.theoreticalAfternoonHours !== undefined && schedule.theoreticalAfternoonHours !== null
          ? String(schedule.theoreticalAfternoonHours)
          : '',
      slots: (schedule.slots || []).map((slot) => ({
        id: slot.id,
        slotType: slot.slotType,
        startTime: slot.startTime,
        endTime: slot.endTime,
        label: slot.label || defaultSlotLabel(slot.slotType),
        multiplier:
          slot.multiplier !== undefined && slot.multiplier !== null
            ? String(slot.multiplier)
            : defaultSlotMultiplier(slot.slotType),
      })),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet horaire ?')) return;
    try {
      await schedulesAPI.delete(id);
      await loadSchedules();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert('Erreur: ' + (error?.response?.data?.message || error?.message || 'Suppression impossible'));
    }
  };

  const addSlot = () => {
    setFormData((prev) => ({
      ...prev,
      slots: [
        ...prev.slots,
        {
          slotType: 'BREAK',
          startTime: prev.endTime || '12:00',
          endTime: prev.endTime || '13:00',
          label: defaultSlotLabel('BREAK'),
          multiplier: defaultSlotMultiplier('BREAK'),
        },
      ],
    }));
  };

  const updateSlot = (index: number, slot: Partial<ScheduleSlotForm>) => {
    setFormData((prev) => {
      const newSlots = [...prev.slots];
      newSlots[index] = { ...newSlots[index], ...slot };
      return { ...prev, slots: newSlots };
    });
  };

  const removeSlot = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      slots: prev.slots.filter((_, i) => i !== index),
    }));
  };

  const totalSlots = useMemo(
    () => schedules.reduce((sum, schedule) => sum + (schedule.slots?.length || 0), 0),
    [schedules]
  );

  const averageSlots = schedules.length > 0 ? (totalSlots / schedules.length).toFixed(1) : '0';

  const averageDayHours =
    schedules.length > 0
      ? (
          schedules.reduce(
            (sum, schedule) => sum + (schedule.theoreticalDayHours || 0),
            0
          ) / schedules.length
        ).toFixed(1)
      : '0';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-600 border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 lg:p-8 animate-fade-in">
        <PageHeader
          title="Horaires de travail"
          description="Gérez les horaires et leurs plages (pauses, franchises, heures sup, spéciales)"
          icon={Clock}
          actionLabel="Nouvel horaire"
          actionIcon={Plus}
          onAction={() => {
            resetForm();
            setShowModal(true);
          }}
        />

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border border-slate-200 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Total horaires</p>
                <p className="text-3xl font-bold text-slate-900">{schedules.length}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </Card>
          <Card className="border border-slate-200 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Plages configurées</p>
                <p className="text-3xl font-bold text-slate-900">{totalSlots}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Settings2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </Card>
          <Card className="border border-slate-200 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Heures théoriques (jour)</p>
                <p className="text-3xl font-bold text-slate-900">{averageDayHours}h</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Liste des horaires */}
        <Card className="border border-slate-200 shadow-soft">
          {schedules.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-slate-600 text-lg">Aucun horaire configuré</p>
              <p className="text-slate-500 text-sm mt-2">Commencez par créer un nouvel horaire</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-200">
                    <th className="text-left p-4 text-slate-700 font-semibold">Libellé</th>
                    <th className="text-left p-4 text-slate-700 font-semibold">Horaire</th>
                    <th className="text-left p-4 text-slate-700 font-semibold">Théorique</th>
                    <th className="text-left p-4 text-slate-700 font-semibold">Plages</th>
                    <th className="text-right p-4 text-slate-700 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => (
                    <tr key={schedule.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{schedule.label}</span>
                          {schedule.abbreviation && (
                            <span className="text-xs text-slate-500 uppercase tracking-wide">
                              {schedule.abbreviation}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-700">
                        {schedule.startTime} → {schedule.endTime}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200">
                            Journée: {schedule.theoreticalDayHours ?? '—'}h
                          </Badge>
                          <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                            Matin: {schedule.theoreticalMorningHours ?? '—'}h
                          </Badge>
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                            Après-midi: {schedule.theoreticalAfternoonHours ?? '—'}h
                          </Badge>
                        </div>
                      </td>
                      <td className="p-4">
                        {schedule.slots && schedule.slots.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {schedule.slots.map((slot) => (
                              <Badge
                                key={slot.id ?? `${slot.slotType}-${slot.startTime}-${slot.endTime}`}
                                className="bg-indigo-100 text-indigo-700 border-indigo-200 flex items-center gap-1"
                              >
                                <span className="font-semibold">
                                  {slot.label || defaultSlotLabel(slot.slotType)}
                                </span>
                                <span>
                                  {slot.startTime} → {slot.endTime}
                                </span>
                                <span>
                                  ·{' '}
                                  {slot.multiplier !== undefined && slot.multiplier !== null
                                    ? Number(slot.multiplier).toFixed(2)
                                    : '1.00'}
                                  x
                                </span>
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Aucune plage définie</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleEdit(schedule)}
                            className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(schedule.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Modal de création/édition */}
        <Modal
          size="xl"
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
          title={editingSchedule ? 'Modifier l\'horaire' : 'Nouvel horaire'}
          description="Définissez les heures théoriques et les différentes plages (pauses, heures sup, etc.)."
        >
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Libellé *"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                required
              />
              <Input
                label="Abrégé"
                value={formData.abbreviation}
                onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Heure de début *"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
              <Input
                label="Heure de fin *"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Théorique journée (h)"
                type="number"
                step="0.25"
                value={formData.theoreticalDayHours}
                onChange={(e) => setFormData({ ...formData, theoreticalDayHours: e.target.value })}
                placeholder="Ex: 8"
              />
              <Input
                label="Théorique matin (h)"
                type="number"
                step="0.25"
                value={formData.theoreticalMorningHours}
                onChange={(e) =>
                  setFormData({ ...formData, theoreticalMorningHours: e.target.value })
                }
                placeholder="Ex: 4"
              />
              <Input
                label="Théorique après-midi (h)"
                type="number"
                step="0.25"
                value={formData.theoreticalAfternoonHours}
                onChange={(e) =>
                  setFormData({ ...formData, theoreticalAfternoonHours: e.target.value })
                }
                placeholder="Ex: 4"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  Plages horaires
                </h4>
                <Button type="button" variant="outline" onClick={addSlot} className="text-xs">
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter une plage
                </Button>
              </div>

              {formData.slots.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-md p-4 text-sm text-slate-500 text-center">
                  Aucune plage définie. Ajoutez des franchises, pauses ou heures supplémentaires.
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.slots.map((slot, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 md:grid-cols-12 gap-3 border border-slate-200 rounded-md p-4 bg-slate-50 shadow-sm"
                    >
                      <div className="md:col-span-3">
                        <Select
                          label="Type de plage"
                          value={slot.slotType}
                          onChange={(e) => {
                            const newType = e.target.value;
                            updateSlot(index, {
                              slotType: newType,
                              label:
                                slot.label && slot.label !== defaultSlotLabel(slot.slotType)
                                  ? slot.label
                                  : defaultSlotLabel(newType),
                              multiplier:
                                slot.multiplier && slot.multiplier !== defaultSlotMultiplier(slot.slotType)
                                  ? slot.multiplier
                                  : defaultSlotMultiplier(newType),
                            });
                          }}
                          options={scheduleSlotTypeOptions}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Input
                          label="Début"
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => updateSlot(index, { startTime: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Input
                          label="Fin"
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => updateSlot(index, { endTime: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          label="Libellé"
                          value={slot.label}
                          onChange={(e) => updateSlot(index, { label: e.target.value })}
                          placeholder={defaultSlotLabel(slot.slotType)}
                        />
                      </div>
                      <div className="md:col-span-1">
                        <Input
                          label="x"
                          type="number"
                          step="0.05"
                          min="0"
                          value={slot.multiplier}
                          onChange={(e) => updateSlot(index, { multiplier: e.target.value })}
                        />
                      </div>
                      <div className="flex items-end justify-end md:col-span-1 md:justify-end md:items-end col-span-full">
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => removeSlot(index)}
                          className="w-full md:w-auto"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Retirer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                Annuler
              </Button>
              <Button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-700">
                {editingSchedule ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}

