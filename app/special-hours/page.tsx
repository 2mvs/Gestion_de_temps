'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { isAuthenticated } from '@/lib/auth';
import { specialHoursAPI, employeesAPI } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { specialHourTypeOptions } from '@/lib/constants';
import SelectSearch from '@/components/ui/SelectSearch';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import FormActions from '@/components/ui/FormActions';
import PageHeader from '@/components/ui/PageHeader';
import { Calendar, Clock, X, Plus, Star, Check } from 'lucide-react';

export default function SpecialHoursPage() {
  const router = useRouter();
  const [specialHours, setSpecialHours] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '' as number | string,
    date: '',
    hours: 0,
    hourType: 'HOLIDAY',
    multiplier: 2.0,
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
      setEmployees(employeesList || []);
      if (employeesList.length > 0) {
        const employeeId = employeesList[0].id;
        setFormData({ ...formData, employeeId });
        const specialHoursResponse = await specialHoursAPI.getByEmployee(employeeId);
        setSpecialHours(specialHoursResponse?.data || []);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = async (employeeId: number) => {
    setFormData({ ...formData, employeeId: Number(employeeId) });
    try {
      const response = await specialHoursAPI.getByEmployee(employeeId);
      setSpecialHours(response?.data || []);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await specialHoursAPI.create(formData);
      setShowModal(false);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur');
    }
  };

  const handleApprove = async (id: number, status: string) => {
    try {
      await specialHoursAPI.approve(id, status);
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
          title="Heures spéciales"
          description="Nuits, dimanches, fériés et autres majorations"
          icon={Clock}
          actionLabel="Nouvelle demande"
          actionIcon={Star}
          onAction={() => setShowModal(true)}
        />

        {/* Filtres */}
        <Card className="mb-6 shadow-soft">
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Heures</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Multiplicateur</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {specialHours.map((sh: any, index: number) => (
                  <tr key={sh.id} className="hover:bg-slate-50 transition-all duration-200" style={{ animationDelay: `${index * 50}ms` }}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center shadow-md">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-slate-900">
                          {new Date(sh.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700">{sh.hourType}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-sm font-semibold">
                        {sh.hours}h
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700">{sh.multiplier}x</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          sh.status === 'APPROVED' ? 'success' : sh.status === 'PENDING' ? 'warning' : 'secondary'
                        }
                        className="shadow-sm"
                      >
                        {sh.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {sh.status === 'PENDING' && (
                        <div className="flex items-center gap-2 justify-end">
                          <Button size="sm" onClick={() => handleApprove(sh.id, 'APPROVED')} className="bg-green-100 hover:bg-green-200 text-green-600">
                            Approuver
                          </Button>
                          <Button size="sm" onClick={() => handleApprove(sh.id, 'REJECTED')} className="bg-red-100 hover:bg-red-200 text-red-600">
                            Rejeter
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {specialHours.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucune heure spéciale</h3>
                <p className="text-slate-500">Cliquez sur “Nouvelle demande” pour commencer</p>
              </div>
            )}
          </div>
        </Card>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Nouvelle Heure Spéciale"
          description="Enregistrez des heures spéciales (nuit, férié, week-end)"
        >
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <SelectSearch
                  label="Employé *"
                  required
                  value={String(formData.employeeId)}
                  onChange={(value) => setFormData({ ...formData, employeeId: Number(value) })}
                  options={employees.map((emp) => ({
                    value: String(emp.id),
                    label: `${emp.firstName} ${emp.lastName}`,
                    subtitle: `${emp.employeeNumber} • ${emp.organizationalUnit?.name || 'Aucune unité'}`,
                  }))}
                  placeholder="Recherchez un employé..."
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Heures *</label>
                    <input
                      type="number"
                      required
                      step="0.5"
                      value={formData.hours}
                      onChange={(e) => setFormData({ ...formData, hours: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                  <select
                    required
                    value={formData.hourType}
                    onChange={(e) => setFormData({ ...formData, hourType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {specialHourTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Multiplicateur</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.multiplier}
                    onChange={(e) => setFormData({ ...formData, multiplier: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Raison</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                  />
                </div>
            
            <FormActions
              onCancel={() => setShowModal(false)}
              submitLabel="Créer"
            />
          </form>
        </Modal>
      </div>
    </Layout>
  );
}

