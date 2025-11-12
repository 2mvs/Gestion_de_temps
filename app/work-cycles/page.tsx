'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Plus, Edit2, Trash2, Clock, Calendar } from 'lucide-react';
import Layout from '@/components/Layout';
import { isAuthenticated } from '@/lib/auth';
import api, { workCyclesAPI, schedulesAPI } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';

interface WorkSchedule {
  id: number;
  label: string;
  abbreviation?: string;
  startTime: string;
  endTime: string;
  theoreticalDayHours?: number;
  theoreticalMorningHours?: number;
  theoreticalAfternoonHours?: number;
  slots?: Array<{
    id?: number;
    slotType: string;
    startTime: string;
    endTime: string;
  }>;
}

interface WorkCycle {
  id: number;
  label: string;
  abbreviation?: string;
  scheduleId: number;
  schedule?: WorkSchedule & { slots?: any[] };
  employees?: any[];
}

export default function WorkCyclesPage() {
  const router = useRouter();
  const [workCycles, setWorkCycles] = useState<WorkCycle[]>([]);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCycle, setEditingCycle] = useState<WorkCycle | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    abbreviation: '',
    scheduleId: '',
  });

  useEffect(() => {
  // ✅ Assurer que le code s'exécute seulement côté client
  if (typeof window === 'undefined') return;

  const auth = isAuthenticated();
  console.log("Authenticated ?", auth);

  if (!auth) {
    router.push('/login');
    return;
  }

  loadData();
}, [router]);


  const loadData = async () => {
    console.log("Chargement en cours...");
    console.log("Base URL API:", api.defaults.baseURL);
    try {
      const cyclesRes = await workCyclesAPI.getAll();
      console.log("Réponse cycles:", cyclesRes);
  
      const schedulesRes = await schedulesAPI.getAll();
      console.log("Réponse horaires:", schedulesRes);
  
      // Gérer la structure de la réponse (peut être un tableau ou { data: [...] })
      const cyclesList = Array.isArray(cyclesRes) 
        ? cyclesRes 
        : Array.isArray(cyclesRes?.data) 
        ? cyclesRes.data 
        : [];
      
      const schedulesList = Array.isArray(schedulesRes) 
        ? schedulesRes 
        : Array.isArray(schedulesRes?.data) 
        ? schedulesRes.data 
        : [];
  
      setWorkCycles(cyclesList);
      setSchedules(schedulesList);
    } catch (error: any) {
      console.error("Erreur lors du chargement des données:", error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Impossible de charger les cycles de travail';
      alert('Erreur: ' + errorMessage);
      setWorkCycles([]);
      setSchedules([]);
    } finally {
      console.log("Fin du chargement !");
      setLoading(false);
    }
  };
  
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.scheduleId) {
        alert('Veuillez sélectionner un horaire.');
        return;
      }

      const payload = {
        label: formData.label,
        abbreviation: formData.abbreviation || null,
        scheduleId: parseInt(formData.scheduleId, 10),
      };

      if (editingCycle) {
        await workCyclesAPI.update(editingCycle.id, payload);
      } else {
        await workCyclesAPI.create(payload);
      }
      
      loadData();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Erreur lors de la création/mise à jour:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Erreur inconnue';
      alert('Erreur: ' + errorMessage);
    }
  };

  const handleEdit = (cycle: WorkCycle) => {
    setEditingCycle(cycle);
    setFormData({
      label: cycle.label,
      abbreviation: cycle.abbreviation || '',
      scheduleId: cycle.scheduleId ? String(cycle.scheduleId) : '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce cycle de travail ?')) return;
    try {
      await workCyclesAPI.delete(id);
      loadData();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      label: '',
      abbreviation: '',
      scheduleId: '',
    });
    setEditingCycle(null);
  };

  const totalEmployeesCount = workCycles.reduce((sum, c) => sum + (c.employees?.length || 0), 0);
  const uniqueSchedulesCount = new Set(workCycles.map((cycle) => cycle.scheduleId)).size;
  const averageEmployeesPerCycle =
    workCycles.length > 0 ? (totalEmployeesCount / workCycles.length).toFixed(1) : '0';
  const scheduleOptions =
    schedules.length > 0
      ? [
          { value: '', label: 'Sélectionnez un horaire' },
          ...schedules.map((schedule) => ({
            value: String(schedule.id),
            label: `${schedule.label} (${schedule.startTime} → ${schedule.endTime})`,
          })),
        ]
      : [{ value: '', label: 'Aucun horaire disponible' }];
  const selectedSchedule = formData.scheduleId
    ? schedules.find((schedule) => schedule.id === parseInt(formData.scheduleId, 10))
    : null;

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
        {/* En-tête */}
          <div className="bg-white p-6 mb-8 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  Cycles de travail
                </h1>
                <p className="text-slate-600">Gérez les cycles de travail et leurs paramètres</p>
              </div>
              <Button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-md hover:shadow-lg transition-all hover:scale-105"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nouveau cycle
              </Button>
            </div>
          </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Total cycles</p>
                <p className="text-3xl font-bold text-slate-900">{workCycles.length}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </Card>
          <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Horaires distincts</p>
                <p className="text-3xl font-bold text-slate-900">{uniqueSchedulesCount}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
          <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Employés couverts</p>
                <p className="text-3xl font-bold text-slate-900">{totalEmployeesCount}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>
          <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Moy. employés/cycle</p>
                <p className="text-3xl font-bold text-slate-900">{averageEmployeesPerCycle}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Liste des cycles */}
        <Card className="border border-slate-200 shadow-sm">
          {workCycles.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-slate-600 text-lg">Aucun cycle de travail configuré</p>
              <p className="text-slate-500 text-sm mt-2">Commencez par créer un nouveau cycle</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-200">
                    <th className="text-left p-4 text-slate-700 font-semibold">Libellé</th>
                    <th className="text-left p-4 text-slate-700 font-semibold">Abrégé</th>
                    <th className="text-left p-4 text-slate-700 font-semibold">Horaire</th>
                    <th className="text-left p-4 text-slate-700 font-semibold">Plages</th>
                    <th className="text-left p-4 text-slate-700 font-semibold">Employés</th>
                    <th className="text-right p-4 text-slate-700 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workCycles.map((cycle, index) => (
                    <tr
                      key={cycle.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                            <RefreshCw className="w-5 h-5 text-cyan-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{cycle.label}</p>
                            {cycle.schedule && (
                              <p className="text-sm text-slate-500">
                                {cycle.schedule.startTime} → {cycle.schedule.endTime}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {cycle.abbreviation ? (
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                            {cycle.abbreviation}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {cycle.schedule ? (
                          <div className="flex flex-col text-sm text-slate-700">
                            <span className="font-medium">{cycle.schedule.label}</span>
                            {cycle.schedule.abbreviation && (
                              <span className="text-xs text-slate-500">{cycle.schedule.abbreviation}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Aucun horaire</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
                          {cycle.schedule?.slots?.length || 0} plage(s)
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200">
                          {cycle.employees?.length || 0} employé(s)
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleEdit(cycle)}
                            className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cycle.id)}
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
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            ></div>
            <div className="relative bg-white rounded-md shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border-2 border-slate-200 animate-scale-up">
              {/* En-tête du modal */}
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingCycle ? 'Modifier le cycle' : 'Nouveau cycle de travail'}
                </h2>
              </div>

              {/* Contenu du formulaire */}
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] bg-white">
                {/* Informations de base */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 text-cyan-600" />
                    </div>
                    Informations de base
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Input
                        label="Libellé *"
                        value={formData.label}
                        onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                        required
                        placeholder="Ex: Cycle journée standard"
                      />
                    </div>
                    <div>
                      <Input
                        label="Abrégé"
                        value={formData.abbreviation}
                        onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                        placeholder="Ex: STD-J"
                      />
                    </div>
                  </div>
                </div>

                {/* Horaire associé */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-cyan-600" />
                    </div>
                    Horaire associé
                  </h3>
                  <Select
                    label="Horaire *"
                    value={formData.scheduleId}
                    onChange={(e) => setFormData({ ...formData, scheduleId: e.target.value })}
                    required
                    options={scheduleOptions}
                    disabled={schedules.length === 0}
                  />
                  {selectedSchedule && (
                    <div className="mt-4 p-4 border border-slate-200 rounded-md bg-slate-50">
                      <p className="text-sm font-semibold text-slate-800 mb-2">
                        Aperçu de l'horaire sélectionné
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
                        <div>
                          <span className="font-medium text-slate-800">Heure de début :</span>{' '}
                          {selectedSchedule.startTime}
                        </div>
                        <div>
                          <span className="font-medium text-slate-800">Heure de fin :</span>{' '}
                          {selectedSchedule.endTime}
                        </div>
                        <div>
                          <span className="font-medium text-slate-800">Nombre de plages :</span>{' '}
                          {selectedSchedule.slots?.length || 0}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions du modal */}
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border-2 border-slate-300"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    {editingCycle ? 'Enregistrer' : 'Créer'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
