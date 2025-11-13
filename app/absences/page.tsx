'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Check, X as XIcon, Briefcase, Search, Edit, Eye } from 'lucide-react';
import Layout from '@/components/Layout';
import { isAuthenticated, getUser, isBasicUser, isManager, isAdmin } from '@/lib/auth';
import { absencesAPI, employeesAPI } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import SelectSearch from '@/components/ui/SelectSearch';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import { absenceTypeOptions, approvalStatusOptions } from '@/lib/constants';

const normalizeStatus = (value?: string | null) => (value || '').toString().toUpperCase();
const isApprovalPending = (status: any) => ['EN_ATTENTE', 'PENDING'].includes(normalizeStatus(status));
const isApprovalApproved = (status: any) => ['APPROUVE', 'APPROVED'].includes(normalizeStatus(status));
const isApprovalRejected = (status: any) => ['REJETE', 'REJECTED'].includes(normalizeStatus(status));

const initialFormState = {
  employeeId: '',
  absenceType: 'CONGES',
  startDate: '',
  endDate: '',
  days: 0,
  reason: '',
};

const calculateInclusiveDays = (start: string, end: string): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 0;
  }
  const startUTC = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endUTC = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const diff = endUTC - startUTC;
  if (diff < 0) {
    return 0;
  }
  const MS_IN_DAY = 1000 * 60 * 60 * 24;
  return Math.floor(diff / MS_IN_DAY) + 1;
};

export default function AbsencesPage() {
  const router = useRouter();
  const [absences, setAbsences] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(initialFormState);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [editingAbsence, setEditingAbsence] = useState<any | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAbsenceDetails, setSelectedAbsenceDetails] = useState<any | null>(null);

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDefaultEmployeeId = () => {
    if (currentUser && isBasicUser(currentUser) && currentUser.employee) {
      return String(currentUser.employee.id);
    }
    if (employees.length > 0) {
      return String(employees[0].id);
    }
    return '';
  };

  const resetFormState = (employeeId?: string) => {
    setFormData({
      ...initialFormState,
      employeeId: employeeId ?? '',
    });
    setDateError(null);
  };

  const handleOpenModal = () => {
    setEditingAbsence(null);
    resetFormState(getDefaultEmployeeId());
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAbsence(null);
    resetFormState(getDefaultEmployeeId());
  };

  const openDetailsModal = (absence: any) => {
    setSelectedAbsenceDetails(absence);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setSelectedAbsenceDetails(null);
    setShowDetailsModal(false);
  };

  const handleEdit = (absence: any) => {
    setEditingAbsence(absence);
    setDateError(null);
    const employeeId = absence.employeeId ?? absence.employee?.id ?? getDefaultEmployeeId();
    setFormData({
      employeeId: employeeId ? String(employeeId) : '',
      absenceType: absence.absenceType,
      startDate: absence.startDate ? new Date(absence.startDate).toISOString().split('T')[0] : '',
      endDate: absence.endDate ? new Date(absence.endDate).toISOString().split('T')[0] : '',
      days: absence.days || 0,
      reason: absence.reason || '',
    });
    setShowModal(true);
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    const u = getUser();
    setCurrentUser(u);
    loadData(u);
  }, [router]);

  const loadData = async (u?: any) => {
    try {
      const resolvedUser = u || currentUser || getUser();
      // Si l'utilisateur est un USER basique, ne charger que ses propres absences
      if (resolvedUser && isBasicUser(resolvedUser) && resolvedUser.employee) {
        const absencesRes = await absencesAPI.getByEmployee(resolvedUser.employee.id);
        setAbsences(absencesRes.data || []);
        setEmployees([resolvedUser.employee]);
        setFormData((prev) => ({
          ...prev,
          employeeId: prev.employeeId || String(resolvedUser.employee.id),
        }));
      } else {
        const [absencesRes, employeesRes] = await Promise.all([
          absencesAPI.getAll(),
          employeesAPI.getAll(),
        ]);
        setAbsences(absencesRes.data || []);
        setEmployees(employeesRes.data || []);
        setFormData((prev) => {
          if (prev.employeeId) return prev;
          const firstEmployeeId = employeesRes.data?.[0]?.id;
          if (!firstEmployeeId) return prev;
          return {
            ...prev,
            employeeId: String(firstEmployeeId),
          };
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!formData.startDate || !formData.endDate) {
      setDateError(null);
      if (formData.days !== 0) {
        setFormData((prev) => ({ ...prev, days: 0 }));
      }
      return;
    }

    const computedDays = calculateInclusiveDays(formData.startDate, formData.endDate);
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (endDate < startDate) {
      setDateError('La date de fin doit être postérieure ou égale à la date de début');
      if (formData.days !== 0) {
        setFormData((prev) => ({ ...prev, days: 0 }));
      }
      return;
    }

    setDateError(null);
    if (computedDays !== formData.days) {
      setFormData((prev) => ({ ...prev, days: computedDays }));
    }
  }, [formData.startDate, formData.endDate, formData.days]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) {
      alert('Aucun employé sélectionné');
      return;
    }
    if (dateError) {
      alert(dateError);
      return;
    }
    if (formData.days <= 0) {
      alert('Le nombre de jours doit être supérieur à 0');
      return;
    }

    try {
      const payload = {
        employeeId: parseInt(formData.employeeId, 10),
        absenceType: formData.absenceType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        days: formData.days,
        reason: formData.reason?.trim() || null,
      };

      if (editingAbsence) {
        await absencesAPI.update(editingAbsence.id, payload);
      } else {
        await absencesAPI.create(payload);
      }
      handleCloseModal();
      loadData(currentUser ?? undefined);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur');
    }
  };

  const handleApprove = async (id: number, status: string) => {
    if (!currentUser || (!isManager(currentUser) && !isAdmin(currentUser))) {
      alert('Accès refusé');
      return;
    }
    try {
      const userId = parseInt(localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).id : '0');
      await absencesAPI.approve(id, status, userId);
      loadData(currentUser ?? undefined);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur');
    }
  };

  const filteredAbsences = absences.filter((abs) =>
    `${abs.employee?.firstName} ${abs.employee?.lastName} ${abs.absenceType}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );
  const canModerateAbsences = currentUser ? (isManager(currentUser) || isAdmin(currentUser)) : false;

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
          onAction={handleOpenModal}
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
                        {/* <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center mr-3 shadow-md group-hover:scale-110 transition-transform">
                          <span className="text-white font-bold text-sm">
                            {absence.employee?.firstName?.charAt(0)}{absence.employee?.lastName?.charAt(0)}
                          </span>
                        </div> */}
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
                        isApprovalApproved(absence.status)
                          ? 'success'
                          : isApprovalRejected(absence.status)
                          ? 'error'
                          : 'warning'
                      }
                      className="shadow-sm"
                    >
                      {absence.status}
                    </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openDetailsModal(absence)}
                          className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-50 transition-all hover:scale-110 active:scale-95"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {currentUser &&
                          isBasicUser(currentUser) &&
                        currentUser.employee?.id === absence.employee?.id &&
                        isApprovalPending(absence.status) && (
                            <button
                              onClick={() => handleEdit(absence)}
                              className="p-2.5 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all hover:scale-110 active:scale-95"
                              title="Modifier la demande"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                      {isApprovalPending(absence.status) && canModerateAbsences && (
                          <>
                            <button
                            onClick={() => handleApprove(absence.id, 'APPROVED')}
                              className="p-2.5 bg-green-100 text-green-600 hover:bg-green-50 transition-all hover:scale-110 active:scale-95"
                              title="Approuver"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                            onClick={() => handleApprove(absence.id, 'REJECTED')}
                              className="p-2.5 bg-red-100 text-red-600 hover:bg-red-50 transition-all hover:scale-110 active:scale-95"
                              title="Rejeter"
                            >
                              <XIcon className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
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
          onClose={handleCloseModal}
          title={editingAbsence ? 'Modifier la demande' : 'Nouvelle Absence'}
          description={
            editingAbsence
              ? 'Mettez à jour votre demande d\'absence avant validation par votre manager.'
              : 'Enregistrez une nouvelle demande d\'absence.'
          }
        >
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] bg-white space-y-6">
            {currentUser && isBasicUser(currentUser) ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employé</label>
                <input
                  type="text"
                  readOnly
                  value={`${currentUser.employee?.firstName || ''} ${currentUser.employee?.lastName || ''}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                />
              </div>
            ) : (
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
            )}
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
            {dateError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {dateError}
              </p>
            )}
            <Input
              label="Nombre de jours"
              type="number"
              step="0.5"
              value={formData.days}
              readOnly
              className="bg-gray-100"
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
                onClick={handleCloseModal}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border-2 border-slate-300"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={!!dateError || formData.days <= 0 || !formData.startDate || !formData.endDate}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                {editingAbsence ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </form>
        </Modal>

        {selectedAbsenceDetails && (
          <Modal
            isOpen={showDetailsModal}
            onClose={closeDetailsModal}
            title="Détails de la demande"
            description="Informations complètes sur la demande d'absence sélectionnée."
          >
            <div className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs uppercase text-slate-500 font-semibold">Employé</p>
                  <p className="text-sm text-slate-800 font-medium">
                    {selectedAbsenceDetails.employee
                      ? `${selectedAbsenceDetails.employee.firstName} ${selectedAbsenceDetails.employee.lastName}`
                      : '-'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Matricule&nbsp;: {selectedAbsenceDetails.employee?.employeeNumber || '-'}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase text-slate-500 font-semibold">Type d'absence</p>
                  <p className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                    {selectedAbsenceDetails.absenceType}
                  </p>
                  <p className="text-xs text-slate-500">
                    Statut&nbsp;:{' '}
                    <span className="font-semibold text-slate-700">{selectedAbsenceDetails.status}</span>
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase text-slate-500 font-semibold">Période</p>
                  <p className="text-sm text-slate-800 font-medium">
                    {formatDate(selectedAbsenceDetails.startDate)} → {formatDate(selectedAbsenceDetails.endDate)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Durée&nbsp;:{' '}
                    <span className="font-semibold">
                      {selectedAbsenceDetails.days} jour{selectedAbsenceDetails.days > 1 ? 's' : ''}
                    </span>
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase text-slate-500 font-semibold">Informations de suivi</p>
                  <p className="text-xs text-slate-500">
                    Créée le&nbsp;: <span className="font-medium text-slate-700">{formatDateTime(selectedAbsenceDetails.createdAt)}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Mise à jour le&nbsp;: <span className="font-medium text-slate-700">{formatDateTime(selectedAbsenceDetails.updatedAt)}</span>
                  </p>
                  {selectedAbsenceDetails.approvedAt && (
                    <p className="text-xs text-slate-500">
                      Traitée le&nbsp;: <span className="font-medium text-slate-700">{formatDateTime(selectedAbsenceDetails.approvedAt)}</span>
                    </p>
                  )}
                  {selectedAbsenceDetails.approver && (
                    <p className="text-xs text-slate-500">
                      Par&nbsp;:{' '}
                      <span className="font-medium text-slate-700">
                        {selectedAbsenceDetails.approver.email}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-500 font-semibold mb-2">Raison</p>
                <p className="text-sm text-slate-700 whitespace-pre-line border border-slate-200 bg-slate-50 rounded-md px-3 py-2">
                  {selectedAbsenceDetails.reason?.trim() || '—'}
                </p>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={closeDetailsModal}>
                  Fermer
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
}
