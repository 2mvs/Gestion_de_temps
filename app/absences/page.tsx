'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Check, X as XIcon, Briefcase, Search } from 'lucide-react';
import Layout from '@/components/Layout';
import { isAuthenticated } from '@/lib/auth';
import { absencesAPI, employeesAPI } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import SelectSearch from '@/components/ui/SelectSearch';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import { absenceTypeOptions } from '@/lib/constants';

export default function AbsencesPage() {
  const router = useRouter();
  const [absences, setAbsences] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    employeeId: '',
    absenceType: 'VACATION',
    startDate: '',
    endDate: '',
    days: 0,
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
      const [absencesRes, employeesRes] = await Promise.all([
        absencesAPI.getAll(),
        employeesAPI.getAll(),
      ]);
      setAbsences(absencesRes.data || []);
      setEmployees(employeesRes.data || []);
      if (employeesRes.data?.length > 0 && !formData.employeeId) {
        setFormData({ ...formData, employeeId: String(employeesRes.data[0].id) });
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await absencesAPI.create({ ...formData, employeeId: parseInt(formData.employeeId) });
      setShowModal(false);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur');
    }
  };

  const handleApprove = async (id: number, status: string) => {
    try {
      const userId = parseInt(localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).id : '0');
      await absencesAPI.approve(id, status, userId);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur');
    }
  };

  const filteredAbsences = absences.filter((abs) =>
    `${abs.employee?.firstName} ${abs.employee?.lastName} ${abs.absenceType}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div className="p-6 lg:p-8">
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 lg:p-8 animate-fade-in">
        {/* Header Section */}
        <PageHeader
          title="Absences"
          description="Gérez les demandes d'absences des employés"
          icon={Briefcase}
          actionLabel="Nouvelle absence"
          actionIcon={Plus}
          onAction={() => setShowModal(true)}
        />

        {/* Search Bar with Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <Card className="lg:col-span-3 shadow-soft hover:shadow-elevated transition-shadow">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Rechercher une absence par employé ou type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 py-3 text-base border-slate-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all"
              />
            </div>
          </Card>
          <Card className="bg-cyan-50 border-cyan-200 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total</p>
                <p className="text-2xl font-bold text-cyan-700">{filteredAbsences.length}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-cyan-700" />
              </div>
            </div>
          </Card>
        </div>

        {/* Table */}
        <Card className="shadow-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Employé</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Période</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Jours</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAbsences.map((absence: any, index: number) => (
                  <tr 
                    key={absence.id} 
                    className="hover:bg-slate-50 transition-all duration-200 group"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center mr-3 shadow-md group-hover:scale-110 transition-transform">
                          <span className="text-white font-bold text-sm">
                            {absence.employee?.firstName?.charAt(0)}{absence.employee?.lastName?.charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">
                          {absence.employee?.firstName} {absence.employee?.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                        {absence.absenceType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(absence.startDate).toLocaleDateString('fr-FR')} - {new Date(absence.endDate).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-sm font-semibold">
                        {absence.days} jour{absence.days > 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          absence.status === 'APPROVED'
                            ? 'success'
                            : absence.status === 'REJECTED'
                            ? 'error'
                            : 'warning'
                        }
                        className="shadow-sm"
                      >
                        {absence.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {absence.status === 'PENDING' && (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleApprove(absence.id, 'APPROVED')}
                            className="p-2.5 text-green-600 hover:bg-green-50 rounded-lg transition-all hover:scale-110 active:scale-95"
                            title="Approuver"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleApprove(absence.id, 'REJECTED')}
                            className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-110 active:scale-95"
                            title="Rejeter"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAbsences.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucune absence trouvée</h3>
                <p className="text-slate-500">Commencez par ajouter une absence</p>
              </div>
            )}
          </div>
        </Card>

        {/* Modal Amélioré */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Nouvelle Absence"
          description="Enregistrez une nouvelle demande d'absence"
        >
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] bg-white space-y-6">
            <SelectSearch
              label="Employé"
              required
              value={formData.employeeId}
              onChange={(value) => setFormData({ ...formData, employeeId: value })}
              options={employees.map((emp) => ({
                value: String(emp.id),
                label: `${emp.firstName} ${emp.lastName}`,
                subtitle: `${emp.employeeNumber} • ${emp.organizationalUnit?.name || 'Aucune unité'}`,
              }))}
              placeholder="Recherchez un employé par nom..."
            />
            <Select
              label="Type"
              required
              value={formData.absenceType}
              onChange={(e) => setFormData({ ...formData, absenceType: e.target.value })}
              options={absenceTypeOptions}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Date début"
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
              <Input
                label="Date fin"
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
            <Input
              label="Nombre de jours"
              type="number"
              required
              step="0.5"
              value={formData.days}
              onChange={(e) => setFormData({ ...formData, days: parseFloat(e.target.value) })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Raison</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-gray-900"
                rows={4}
                placeholder="Expliquez la raison de l'absence..."
              />
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
