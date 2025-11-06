'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Calendar, Clock, Plus, Check, TrendingUp } from 'lucide-react';
import Layout from '@/components/Layout';
import { isAuthenticated } from '@/lib/auth';
import { overtimesAPI, employeesAPI } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SelectSearch from '@/components/ui/SelectSearch';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';

export default function OvertimesPage() {
  const router = useRouter();
  const [overtimes, setOvertimes] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    date: '',
    hours: 0,
    multiplier: 1.5,
    reason: '',
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const employeesResponse = await employeesAPI.getAll();
      const employeesList = employeesResponse?.data || [];
      setEmployees(employeesList);
      if (employeesList.length > 0) {
        const employeeId = employeesList[0].id;
        setFormData({ ...formData, employeeId: String(employeeId) });
        const overtimesResponse = await overtimesAPI.getByEmployee(employeeId);
        setOvertimes(overtimesResponse?.data || []);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = async (employeeId: number) => {
    setFormData({ ...formData, employeeId: String(employeeId) });
    try {
      const response = await overtimesAPI.getByEmployee(employeeId);
      setOvertimes(response?.data || []);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await overtimesAPI.create({
        ...formData,
        employeeId: parseInt(formData.employeeId),
      });
      setShowModal(false);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur');
    }
  };

  const handleApprove = async (id: number, status: string) => {
    try {
      await overtimesAPI.approve(id, status);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8">Chargement...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 lg:p-8 animate-fade-in">
        {/* En-tête */}
        <PageHeader
          title="Heures supplémentaires"
          description="Gérez les demandes et validations d'heures sup"
          icon={TrendingUp}
          actionLabel="Nouvelle demande"
          actionIcon={Plus}
          onAction={() => setShowModal(true)}
        />

        {/* Filtres */}
        <Card className="mb-6 shadow-soft">
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
              <SelectSearch
                label="Employé"
                value={String(formData.employeeId || '')}
                onChange={(value) => handleEmployeeChange(Number(value))}
                options={employees.map((emp) => ({
                  value: String(emp.id),
                  label: `${emp.firstName} ${emp.lastName}`,
                  subtitle: `${emp.employeeNumber} • ${emp.organizationalUnit?.name || 'Aucune unité'}`,
                }))}
                placeholder="Recherchez un employé..."
              />
            </div>
          </div>
        </Card>

        {/* Tableau */}
        <Card className="shadow-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Heures</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Multiplicateur</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overtimes.map((ot: any, index: number) => (
                  <tr key={ot.id} className="hover:bg-slate-50 transition-all duration-200" style={{ animationDelay: `${index * 50}ms` }}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center shadow-md">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-slate-900">
                          {new Date(ot.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-sm font-semibold">
                        {ot.hours}h
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700">{ot.multiplier}x</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          ot.status === 'APPROVED' ? 'success' : ot.status === 'PENDING' ? 'warning' : 'secondary'
                        }
                        className="shadow-sm"
                      >
                        {ot.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {ot.status === 'PENDING' && (
                        <div className="flex items-center gap-2 justify-end">
                          <Button size="sm" onClick={() => handleApprove(ot.id, 'APPROVED')} className="bg-green-100 hover:bg-green-200 text-green-600">
                            Approuver
                          </Button>
                          <Button size="sm" onClick={() => handleApprove(ot.id, 'REJECTED')} className="bg-red-100 hover:bg-red-200 text-red-600">
                            Rejeter
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {overtimes.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucune demande d'heures sup</h3>
                <p className="text-slate-500">Cliquez sur “Nouvelle demande” pour commencer</p>
              </div>
            )}
          </div>
        </Card>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Nouvelle Heure Supplémentaire"
          description="Déclarez des heures supplémentaires"
        >
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] bg-white space-y-6">
            {/* Informations de base */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Informations de base
              </h3>
              <div className="space-y-4">
                <SelectSearch
                  label="Employé"
                  required
                  value={String(formData.employeeId)}
                  onChange={(value) => setFormData({ ...formData, employeeId: value })}
                  options={employees.map((emp) => ({
                    value: String(emp.id),
                    label: `${emp.firstName} ${emp.lastName}`,
                    subtitle: `${emp.employeeNumber} • ${emp.organizationalUnit?.name || 'Aucune unité'}`,
                  }))}
                  placeholder="Recherchez un employé..."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Date"
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                  <Input
                    label="Heures"
                    type="number"
                    required
                    step="0.5"
                    min="0"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            {/* Détails des heures */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Détails des heures
              </h3>
              <div className="space-y-4">
                <Input
                  label="Multiplicateur"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.multiplier}
                  onChange={(e) => setFormData({ ...formData, multiplier: parseFloat(e.target.value) || 1.0 })}
                />
                <p className="text-xs text-slate-500">
                  Ex: 1.0 = normal, 1.25 = 25% sup, 1.5 = 50% sup, 2.0 = double
                </p>
              </div>
            </div>

            {/* Raison */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Justification
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Raison</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-gray-900"
                  rows={4}
                  placeholder="Expliquez la raison des heures supplémentaires..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border-2 border-slate-300"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                Créer
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}

