'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Plus, Edit2, Trash2, Calendar, X, Settings2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { isAuthenticated } from '@/lib/auth';
import { schedulesAPI, periodsAPI, timeRangesAPI } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import FormActions from '@/components/ui/FormActions';
import PageHeader from '@/components/ui/PageHeader';
import { scheduleTypeOptions } from '@/lib/constants';

interface Period {
  id?: number;
  name: string;
  startTime: string;
  endTime: string;
  periodType: string;
  timeRanges: TimeRange[];
}

interface TimeRange {
  id?: number;
  name: string;
  startTime: string;
  endTime: string;
  rangeType: string;
  multiplier: number;
}

interface Schedule {
  id: number;
  label: string;
  abbreviation?: string;
  scheduleType: string;
  startTime?: string;
  endTime?: string;
  breakDuration?: number;
  totalHours?: number;
  periods?: Period[];
}

const periodTypeOptions = [
  { value: 'REGULAR', label: 'Normale' },
  { value: 'BREAK', label: 'Pause' },
  { value: 'OVERTIME', label: 'Heures sup' },
  { value: 'SPECIAL', label: 'Spéciale' },
];

const timeRangeTypeOptions = [
  { value: 'NORMAL', label: 'Normale (x1.0)' },
  { value: 'OVERTIME', label: 'Heures sup (x1.25)' },
  { value: 'NIGHT_SHIFT', label: 'Nuit (x1.5)' },
  { value: 'SUNDAY', label: 'Dimanche (x2.0)' },
  { value: 'HOLIDAY', label: 'Férié (x2.0)' },
  { value: 'SPECIAL', label: 'Spéciale' },
];

export default function SchedulesPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    abbreviation: '',
    scheduleType: 'STANDARD',
    startTime: '08:00',
    endTime: '17:00',
    breakDuration: 60,
    periods: [] as Period[],
  });

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
      const schedulesList = Array.isArray(response.data) ? response.data : response || [];
      setSchedules(schedulesList);
    } catch (error: any) {
      console.error('Erreur lors du chargement des horaires:', error);
      alert('Erreur: ' + (error?.response?.data?.message || error?.message || 'Impossible de charger les horaires'));
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const scheduleData = {
        label: formData.label,
        abbreviation: formData.abbreviation || null,
        scheduleType: formData.scheduleType,
        startTime: formData.startTime,
        endTime: formData.endTime,
        breakDuration: formData.breakDuration || null,
        periods: formData.periods.map((period) => ({
          name: period.name,
          startTime: period.startTime,
          endTime: period.endTime,
          periodType: period.periodType || 'REGULAR',
          timeRanges: period.timeRanges.map((range) => ({
            name: range.name,
            startTime: range.startTime,
            endTime: range.endTime,
            rangeType: range.rangeType || 'NORMAL',
            multiplier: range.multiplier || 1.0,
          })),
        })),
      };

      if (editingSchedule) {
        await schedulesAPI.update(editingSchedule.id, scheduleData);
      } else {
        await schedulesAPI.create(scheduleData);
      }

      loadSchedules();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert('Erreur: ' + (error?.response?.data?.message || error?.message || 'Erreur inconnue'));
    }
  };

  const handleEdit = async (schedule: Schedule) => {
    setEditingSchedule(schedule);
    
    // Charger les périodes si elles n'existent pas déjà
    let periods: Period[] = [];
    if (schedule.periods && schedule.periods.length > 0) {
      periods = schedule.periods;
    } else if (schedule.id) {
      try {
        const periodsData = await periodsAPI.getBySchedule(schedule.id);
        periods = Array.isArray(periodsData.data) ? periodsData.data : periodsData || [];
        
        // Charger les plages pour chaque période
        for (const period of periods) {
          if (period.id) {
            try {
              const rangesData = await timeRangesAPI.getByPeriod(period.id);
              period.timeRanges = Array.isArray(rangesData.data) ? rangesData.data : rangesData || [];
            } catch (err) {
              period.timeRanges = [];
            }
          }
        }
      } catch (err) {
        periods = [];
      }
    }

    setFormData({
      label: schedule.label,
      abbreviation: schedule.abbreviation || '',
      scheduleType: schedule.scheduleType,
      startTime: schedule.startTime || '08:00',
      endTime: schedule.endTime || '17:00',
      breakDuration: schedule.breakDuration || 60,
      periods: periods,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet horaire ?')) return;
    try {
      await schedulesAPI.delete(id);
      loadSchedules();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      label: '',
      abbreviation: '',
      scheduleType: 'STANDARD',
      startTime: '08:00',
      endTime: '17:00',
      breakDuration: 60,
      periods: [],
    });
    setEditingSchedule(null);
  };

  const addPeriod = () => {
    setFormData({
      ...formData,
      periods: [
        ...formData.periods,
        {
          name: '',
          startTime: '08:00',
          endTime: '12:00',
          periodType: 'REGULAR',
          timeRanges: [],
        },
      ],
    });
  };

  const updatePeriod = (index: number, period: Partial<Period>) => {
    const newPeriods = [...formData.periods];
    newPeriods[index] = { ...newPeriods[index], ...period };
    setFormData({ ...formData, periods: newPeriods });
  };

  const removePeriod = (index: number) => {
    const newPeriods = formData.periods.filter((_, i) => i !== index);
    setFormData({ ...formData, periods: newPeriods });
  };

  const addTimeRange = (periodIndex: number) => {
    const newPeriods = [...formData.periods];
    newPeriods[periodIndex].timeRanges = [
      ...(newPeriods[periodIndex].timeRanges || []),
      {
        name: '',
        startTime: '08:00',
        endTime: '12:00',
        rangeType: 'NORMAL',
        multiplier: 1.0,
      },
    ];
    setFormData({ ...formData, periods: newPeriods });
  };

  const updateTimeRange = (periodIndex: number, rangeIndex: number, range: Partial<TimeRange>) => {
    const newPeriods = [...formData.periods];
    newPeriods[periodIndex].timeRanges[rangeIndex] = {
      ...newPeriods[periodIndex].timeRanges[rangeIndex],
      ...range,
    };
    setFormData({ ...formData, periods: newPeriods });
  };

  const removeTimeRange = (periodIndex: number, rangeIndex: number) => {
    const newPeriods = [...formData.periods];
    newPeriods[periodIndex].timeRanges = newPeriods[periodIndex].timeRanges.filter(
      (_, i) => i !== rangeIndex
    );
    setFormData({ ...formData, periods: newPeriods });
  };

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
          description="Gérez les templates d'horaires avec périodes et plages horaires"
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
                <p className="text-slate-600 text-sm mb-1">Avec périodes</p>
                <p className="text-3xl font-bold text-slate-900">
                  {schedules.filter(s => s.periods && s.periods.length > 0).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Settings2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>
          <Card className="border border-slate-200 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Horaires standard</p>
                <p className="text-3xl font-bold text-slate-900">
                  {schedules.filter(s => s.scheduleType === 'STANDARD').length}
                </p>
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
                    <th className="text-left p-4 text-slate-700 font-semibold">Périodes</th>
                    <th className="text-right p-4 text-slate-700 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => (
                    <tr key={schedule.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-semibold text-sm text-slate-900">{schedule.label}</p>
                          </div>
                        </div>
                      </td>
                      {/* <td className="p-4">
                        <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200">
                          {scheduleTypeOptions.find(opt => opt.value === schedule.scheduleType)?.label || schedule.scheduleType}
                        </Badge>
                      </td> */}
                      <td className="p-4">
                        {schedule.startTime && schedule.endTime ? (
                          <div className="text-sm">
                            <span className="font-semibold text-slate-900">{schedule.startTime}</span>
                            <span className="text-slate-500 mx-2">→</span>
                            <span className="font-semibold text-slate-900">{schedule.endTime}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">Non défini</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                            {schedule.periods?.length || 0} période{(schedule.periods?.length || 0) > 1 ? 's' : ''}
                          </Badge>
                          {(schedule.periods || []).reduce((sum, p) => sum + (p.timeRanges?.length || 0), 0) > 0 && (
                            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
                              {(schedule.periods || []).reduce((sum, p) => sum + (p.timeRanges?.length || 0), 0)} plage{(schedule.periods || []).reduce((sum, p) => sum + (p.timeRanges?.length || 0), 0) > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
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
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
          title={editingSchedule ? 'Modifier l\'horaire' : 'Nouvel horaire'}
          description={editingSchedule ? 'Modifiez les informations de l\'horaire' : 'Créez un nouvel horaire avec périodes et plages horaires'}
          size="xl"
        >
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Informations de base */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-600" />
                Informations de base
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Libellé *"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    required
                    placeholder="Ex: Horaire Bureau Standard"
                  />
                </div>
                <div>
                  <Input
                    label="Abrégé"
                    value={formData.abbreviation}
                    onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                    placeholder="Ex: STD"
                  />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Type d'horaire *"
                  value={formData.scheduleType}
                  onChange={(e) => setFormData({ ...formData, scheduleType: e.target.value })}
                  required
                  options={scheduleTypeOptions}
                />
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
            </div>

            {/* Périodes */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-purple-600" />
                  Périodes ({formData.periods.length})
                </h3>
                <Button
                  type="button"
                  onClick={addPeriod}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une période
                </Button>
              </div>

              {formData.periods.length === 0 ? (
                <Card className="border-2 border-dashed border-slate-300 p-8 text-center">
                  <p className="text-slate-500 mb-4">Aucune période définie</p>
                  <p className="text-sm text-slate-400 mb-4">
                    Les périodes permettent de diviser l'horaire en sections (Matin, Après-midi, Nuit, etc.)
                  </p>
                  <Button
                    type="button"
                    onClick={addPeriod}
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Créer la première période
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  {formData.periods.map((period, periodIndex) => (
                    <Card key={periodIndex} className="border border-purple-200 bg-purple-50/30">
                      <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-purple-900">Période {periodIndex + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removePeriod(periodIndex)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <Input
                            label="Nom *"
                            value={period.name}
                            onChange={(e) => updatePeriod(periodIndex, { name: e.target.value })}
                            required
                            placeholder="Ex: Matin"
                          />
                          <Input
                            label="Début *"
                            type="time"
                            value={period.startTime}
                            onChange={(e) => updatePeriod(periodIndex, { startTime: e.target.value })}
                            required
                          />
                          <Input
                            label="Fin *"
                            type="time"
                            value={period.endTime}
                            onChange={(e) => updatePeriod(periodIndex, { endTime: e.target.value })}
                            required
                          />
                          <Select
                            label="Type"
                            value={period.periodType}
                            onChange={(e) => updatePeriod(periodIndex, { periodType: e.target.value })}
                            options={periodTypeOptions}
                          />
                        </div>

                        {/* Plages horaires */}
                        <div className="mt-4 pt-4 border-t border-purple-200">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-sm font-semibold text-purple-800">
                              Plages horaires ({period.timeRanges?.length || 0})
                            </h5>
                            <Button
                              type="button"
                              onClick={() => addTimeRange(periodIndex)}
                              variant="outline"
                              size="sm"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Ajouter
                            </Button>
                          </div>

                          {(!period.timeRanges || period.timeRanges.length === 0) ? (
                            <div className="bg-white/50 border border-dashed border-purple-300 rounded-lg p-4 text-center">
                              <p className="text-sm text-purple-600 mb-2">Aucune plage définie</p>
                              <p className="text-xs text-purple-500 mb-3">
                                Les plages définissent les multiplicateurs (x1.0, x1.25, x1.5, etc.)
                              </p>
                              <Button
                                type="button"
                                onClick={() => addTimeRange(periodIndex)}
                                variant="outline"
                                size="sm"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Ajouter une plage
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {period.timeRanges.map((range, rangeIndex) => (
                                <div key={rangeIndex} className="bg-white rounded-lg p-3 border border-purple-200">
                                  <div className="flex items-start justify-between mb-2">
                                    <span className="text-xs font-medium text-purple-700">
                                      Plage {rangeIndex + 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeTimeRange(periodIndex, rangeIndex)}
                                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <Input
                                      label="Nom"
                                      value={range.name}
                                      onChange={(e) =>
                                        updateTimeRange(periodIndex, rangeIndex, { name: e.target.value })
                                      }
                                      placeholder="Ex: Heures normales"
                                      size="sm"
                                    />
                                    <Input
                                      label="Début"
                                      type="time"
                                      value={range.startTime}
                                      onChange={(e) =>
                                        updateTimeRange(periodIndex, rangeIndex, { startTime: e.target.value })
                                      }
                                      size="sm"
                                    />
                                    <Input
                                      label="Fin"
                                      type="time"
                                      value={range.endTime}
                                      onChange={(e) =>
                                        updateTimeRange(periodIndex, rangeIndex, { endTime: e.target.value })
                                      }
                                      size="sm"
                                    />
                                    <div className="space-y-1">
                                      <Select
                                        label="Type"
                                        value={range.rangeType}
                                        onChange={(e) =>
                                          updateTimeRange(periodIndex, rangeIndex, {
                                            rangeType: e.target.value,
                                            multiplier:
                                              e.target.value === 'NORMAL'
                                                ? 1.0
                                                : e.target.value === 'OVERTIME'
                                                ? 1.25
                                                : e.target.value === 'NIGHT_SHIFT'
                                                ? 1.5
                                                : e.target.value === 'SUNDAY' || e.target.value === 'HOLIDAY'
                                                ? 2.0
                                                : range.multiplier,
                                          })
                                        }
                                        options={timeRangeTypeOptions}
                                        size="sm"
                                      />
                                      <Input
                                        label="Multiplicateur"
                                        type="number"
                                        step="0.25"
                                        min="0"
                                        value={range.multiplier}
                                        onChange={(e) =>
                                          updateTimeRange(periodIndex, rangeIndex, {
                                            multiplier: parseFloat(e.target.value) || 1.0,
                                          })
                                        }
                                        size="sm"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <FormActions
              onCancel={() => {
                setShowModal(false);
                resetForm();
              }}
              submitLabel={editingSchedule ? 'Modifier' : 'Créer'}
              isEditing={!!editingSchedule}
            />
          </form>
        </Modal>
      </div>
    </Layout>
  );
}
