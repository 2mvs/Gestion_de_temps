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
import { cycleTypeOptions } from '@/lib/constants';

interface WorkCycle {
  id: number;
  name: string;
  abbreviation?: string;
  description?: string;
  cycleType: string;
  cycleDays: number;
  weeklyHours: number;
  overtimeThreshold?: number;
  employees?: any[];
  schedules?: any[];
}

interface Schedule {
  id: number;
  label: string;
  abbreviation?: string;
  scheduleType: string;
}

export default function WorkCyclesPage() {
  const router = useRouter();
  const [workCycles, setWorkCycles] = useState<WorkCycle[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCycle, setEditingCycle] = useState<WorkCycle | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    abbreviation: '',
    description: '',
    cycleType: 'WEEKLY',
    cycleDays: 7,
    weeklyHours: 40,
    overtimeThreshold: 40,
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
      if (editingCycle) {
        await workCyclesAPI.update(editingCycle.id, formData);
      } else {
        await workCyclesAPI.create(formData);
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
      name: cycle.name,
      abbreviation: cycle.abbreviation || '',
      description: cycle.description || '',
      cycleType: cycle.cycleType,
      cycleDays: cycle.cycleDays,
      weeklyHours: cycle.weeklyHours,
      overtimeThreshold: cycle.overtimeThreshold || 0,
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
      name: '',
      abbreviation: '',
      description: '',
      cycleType: 'WEEKLY',
      cycleDays: 7,
      weeklyHours: 40,
      overtimeThreshold: 40,
    });
    setEditingCycle(null);
  };

  const getCycleTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      WEEKLY: 'Hebdomadaire',
      BIWEEKLY: 'Bihebdomadaire',
      MONTHLY: 'Mensuel',
      CUSTOM: 'Personnalisé',
    };
    return types[type] || type;
  };

  const getCycleTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      WEEKLY: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      BIWEEKLY: 'bg-blue-100 text-blue-700 border-blue-200',
      MONTHLY: 'bg-purple-100 text-purple-700 border-purple-200',
      CUSTOM: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return colors[type] || 'bg-gray-100 text-gray-700 border-gray-200';
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
        {/* En-tête */}
          <div className="bg-white rounded-2xl p-6 mb-8 border border-slate-200 shadow-sm">
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
                <p className="text-slate-600 text-sm mb-1">Hebdomadaire</p>
                <p className="text-3xl font-bold text-slate-900">
                  {workCycles.filter(c => c.cycleType === 'WEEKLY').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
          <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Total employés</p>
                <p className="text-3xl font-bold text-slate-900">
                  {workCycles.reduce((sum, c) => sum + (c.employees?.length || 0), 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>
          <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm mb-1">Moy. heures/sem</p>
                <p className="text-3xl font-bold text-slate-900">
                  {workCycles.length > 0
                    ? (workCycles.reduce((sum, c) => sum + c.weeklyHours, 0) / workCycles.length).toFixed(1)
                    : 0}
                </p>
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
                    <th className="text-left p-4 text-slate-700 font-semibold">Type</th>
                    <th className="text-left p-4 text-slate-700 font-semibold">Durée</th>
                    <th className="text-left p-4 text-slate-700 font-semibold">Heures/sem</th>
                    <th className="text-left p-4 text-slate-700 font-semibold">Seuil HS</th>
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
                            <p className="font-semibold text-slate-900">{cycle.name}</p>
                            {cycle.description && (
                              <p className="text-sm text-slate-500">{cycle.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {cycle.abbreviation && (
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                            {cycle.abbreviation}
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge className={getCycleTypeColor(cycle.cycleType)}>
                          {getCycleTypeLabel(cycle.cycleType)}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-slate-700 font-medium">{cycle.cycleDays} jours</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-500" />
                          <span className="text-slate-700 font-medium">{cycle.weeklyHours}h</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {cycle.overtimeThreshold ? (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                            {cycle.overtimeThreshold}h
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="md:col-span-2">
                      <Input
                        label="Libellé *"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="Ex: Cycle standard 40h"
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
                  <div>
                    <Input
                      label="Description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Description optionnelle du cycle"
                    />
                  </div>
                </div>

                {/* Configuration du cycle */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-cyan-600" />
                    </div>
                    Configuration du cycle
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Select
                        label="Type de cycle *"
                        value={formData.cycleType}
                        onChange={(e) => setFormData({ ...formData, cycleType: e.target.value })}
                        required
                        options={cycleTypeOptions}
                      />
                    </div>
                    <div>
                      <Input
                        label="Nombre de jours *"
                        type="number"
                        value={formData.cycleDays}
                        onChange={(e) => setFormData({ ...formData, cycleDays: parseInt(e.target.value) || 0 })}
                        required
                        min="1"
                      />
                    </div>
                  </div>
                </div>

                {/* Heures et limites */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-cyan-600" />
                    </div>
                    Heures et seuils
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="Heures par semaine *"
                        type="number"
                        step="0.5"
                        value={formData.weeklyHours}
                        onChange={(e) => setFormData({ ...formData, weeklyHours: parseFloat(e.target.value) || 0 })}
                        required
                        min="0"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Nombre d'heures théoriques par semaine
                      </p>
                    </div>
                    <div>
                      <Input
                        label="Seuil heures supplémentaires"
                        type="number"
                        step="0.5"
                        value={formData.overtimeThreshold}
                        onChange={(e) => setFormData({ ...formData, overtimeThreshold: parseFloat(e.target.value) || 0 })}
                        min="0"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Limite pour appliquer les heures sup si nécessaire
                      </p>
                    </div>
                  </div>
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
