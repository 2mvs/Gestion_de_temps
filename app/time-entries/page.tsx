'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, LogOut, Clock, Edit, Trash2, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import Layout from '@/components/Layout';
import { isAuthenticated, getUser, isManager, isAdmin, isBasicUser } from '@/lib/auth';
import { timeEntriesAPI, employeesAPI } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SelectSearch from '@/components/ui/SelectSearch';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

const normalizeStatus = (value?: string | null) => (value || '').toString().toUpperCase();

const TIME_ENTRY_STATUS_MAPPING: Record<string, string> = {
  EN_ATTENTE: 'EN_ATTENTE',
  PENDING: 'EN_ATTENTE',
  TERMINE: 'TERMINE',
  COMPLETED: 'TERMINE',
  INCOMPLET: 'INCOMPLET',
  INCOMPLETE: 'INCOMPLET',
  ABSENT: 'ABSENT',
};

const TIME_ENTRY_STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  TERMINE: 'Terminé',
  INCOMPLET: 'Incomplet',
  ABSENT: 'Absent',
};

const mapTimeEntryStatusToFrench = (status?: string | null) =>
  TIME_ENTRY_STATUS_MAPPING[normalizeStatus(status)] || 'EN_ATTENTE';

const getTimeEntryStatusLabel = (status?: string | null) =>
  TIME_ENTRY_STATUS_LABELS[mapTimeEntryStatusToFrench(status)] || status || '';

const isEntryCompleted = (status?: string | null) => mapTimeEntryStatusToFrench(status) === 'TERMINE';
const isEntryPending = (status?: string | null) => mapTimeEntryStatusToFrench(status) === 'EN_ATTENTE';

export default function TimeEntriesPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [employeeLinkError, setEmployeeLinkError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editEntry, setEditEntry] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);
  const [validatingEntryId, setValidatingEntryId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    clockIn: '',
    clockOut: '',
    totalHours: '',
    status: 'TERMINE',
  });
  const statusOptions = [
    { value: 'EN_ATTENTE', label: 'En attente' },
    { value: 'TERMINE', label: 'Terminé' },
    { value: 'INCOMPLET', label: 'Incomplet' },
    { value: 'ABSENT', label: 'Absent' },
  ];
  const canEditEntries = user ? (isAdmin(user) || isManager(user)) : false;
  const canDeleteEntries = user ? isAdmin(user) : false;
  const canValidateEntries = user ? (isAdmin(user) || isManager(user)) : false;

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    // charger le user et ensuite les employés selon le rôle
    const u = getUser();
    setUser(u);
    loadEmployees(u);
  }, [router]);

  useEffect(() => {
    if (selectedEmployee) {
      loadEntries();
    }
  }, [selectedEmployee]);

  const loadEmployees = async (currentUser?: any) => {
    try {
      const u = currentUser || getUser();
      setEmployeeLinkError(null);

      if (u && isBasicUser(u)) {
        const response = await employeesAPI.getAll();
        const employeesList = response.data || [];

        const linkedEmployee =
          employeesList.find((emp: any) => emp.user?.id === u.id) ||
          (u.employee ? employeesList.find((emp: any) => emp.id === u.employee.id) : undefined) ||
          u.employee;

        if (linkedEmployee) {
          setEmployees([linkedEmployee]);
          setSelectedEmployee(linkedEmployee.id);
          setCurrentEmployee(linkedEmployee);
        } else if (u.employee?.id) {
          try {
            const employeeResponse = await employeesAPI.getById(u.employee.id);
            const employeeDetails = employeeResponse.data || employeeResponse;
            if (employeeDetails) {
              setEmployees([employeeDetails]);
              setSelectedEmployee(employeeDetails.id);
              setCurrentEmployee(employeeDetails);
            } else {
              setEmployees([]);
              setSelectedEmployee(null);
              setCurrentEmployee(null);
            }
          } catch (innerError) {
            console.error('Erreur lors du chargement de l\'employé lié:', innerError);
            setEmployees([]);
            setSelectedEmployee(null);
            setCurrentEmployee(null);
            setEmployeeLinkError("Votre compte n'est pas correctement lié à un profil employé. Contactez un administrateur.");
          }
        } else {
          setEmployees([]);
          setSelectedEmployee(null);
          setCurrentEmployee(null);
          setEmployeeLinkError("Votre compte n'est lié à aucun employé. Contactez un administrateur pour finaliser la configuration.");
        }
        return;
      }

      const response = await employeesAPI.getAll();
      const list = response.data || [];
      setEmployees(list);
      setCurrentEmployee(null);
      if (list.length > 0) {
        setSelectedEmployee(list[0].id);
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des employés');
    } finally {
      setLoading(false);
    }
  };

  const loadEntries = async () => {
    if (!selectedEmployee) return;
    try {
      const response = await timeEntriesAPI.getByEmployee(selectedEmployee);
      setEntries(response.data || []);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des pointages');
    }
  };

  const handleValidateEntry = async (entryId: number) => {
    if (!canValidateEntries) return;
    try {
      setValidatingEntryId(entryId);
      const result = await timeEntriesAPI.validate(entryId);
      const validation = result?.data;
      if (validation?.isValidated) {
        toast.success('Pointage validé avec succès');
      } else {
        const errors = Array.isArray(validation?.validationErrors) ? validation.validationErrors : [];
        if (errors.length > 0) {
          toast.warning(`Validation impossible : ${errors.join(' • ')}`);
        } else {
          toast.warning('Validation impossible, vérifiez les données du pointage.');
        }
      }
      await loadEntries();
    } catch (error: any) {
      console.error('Erreur validation pointage:', error);
      toast.error(error?.response?.data?.message || 'Erreur lors de la validation');
    } finally {
      setValidatingEntryId(null);
    }
  };

  const formatDateTimeLocal = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const tzOffset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - tzOffset * 60000);
    return localDate.toISOString().slice(0, 16);
  };

  const openEditModal = (entry: any) => {
    setEditEntry(entry);
    setEditForm({
      clockIn: formatDateTimeLocal(entry.clockIn),
      clockOut: formatDateTimeLocal(entry.clockOut),
      totalHours: entry.totalHours !== null && entry.totalHours !== undefined ? String(entry.totalHours) : '',
      status: mapTimeEntryStatusToFrench(entry.status),
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditEntry(null);
    setEditForm({
      clockIn: '',
      clockOut: '',
      totalHours: '',
      status: 'TERMINE',
    });
    setEditLoading(false);
  };

  useEffect(() => {
    setEditForm((prev) => {
      if (!prev.clockIn || !prev.clockOut) {
        if (prev.totalHours === '') return prev;
        return { ...prev, totalHours: '' };
      }

      const start = new Date(prev.clockIn);
      const end = new Date(prev.clockOut);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        if (prev.totalHours === '') return prev;
        return { ...prev, totalHours: '' };
      }

      const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (diffHours <= 0) {
        if (prev.totalHours === '') return prev;
        return { ...prev, totalHours: '' };
      }

      const formatted = (Math.round(diffHours * 100) / 100).toFixed(2);
      if (prev.totalHours === formatted) return prev;
      return { ...prev, totalHours: formatted };
    });
  }, [editForm.clockIn, editForm.clockOut]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEntry) return;

    const payload: any = {};
    let clockInDate: Date | null = null;
    let clockOutDate: Date | null = null;

    if (editForm.clockIn !== '') {
      clockInDate = new Date(editForm.clockIn);
      if (Number.isNaN(clockInDate.getTime())) {
        toast.error("Heure d'entrée invalide");
        return;
      }
      payload.clockIn = clockInDate.toISOString();
    } else {
      payload.clockIn = null;
    }

    if (editForm.clockOut !== '') {
      clockOutDate = new Date(editForm.clockOut);
      if (Number.isNaN(clockOutDate.getTime())) {
        toast.error("Heure de sortie invalide");
        return;
      }
      payload.clockOut = clockOutDate.toISOString();
    } else {
      payload.clockOut = null;
    }

    if (clockInDate && clockOutDate) {
      const diffHours = (clockOutDate.getTime() - clockInDate.getTime()) / (1000 * 60 * 60);
      if (diffHours <= 0) {
        toast.error("L'heure de sortie doit être après l'heure d'entrée");
        return;
      }
      payload.totalHours = Math.round(diffHours * 100) / 100;
    } else if (editForm.totalHours !== '') {
      const parsed = parseFloat(editForm.totalHours);
      if (Number.isNaN(parsed)) {
        toast.error('Total heures invalide');
        return;
      }
      payload.totalHours = parsed;
    }

    if (editForm.status) {
      payload.status = mapTimeEntryStatusToFrench(editForm.status);
    }

    try {
      setEditLoading(true);
      await timeEntriesAPI.update(editEntry.id, payload);
      toast.success('Pointage mis à jour');
      closeEditModal();
      loadEntries();
    } catch (error: any) {
      console.error('Erreur update pointage:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour du pointage');
      setEditLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    if (typeof window !== 'undefined' && !window.confirm('Supprimer ce pointage ? Cette action est irréversible.')) {
      return;
    }
    try {
      setDeleteLoadingId(entryId);
      await timeEntriesAPI.delete(entryId);
      toast.success('Pointage supprimé');
      loadEntries();
    } catch (error: any) {
      console.error('Erreur suppression pointage:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression du pointage');
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleClockIn = async () => {
    if (!selectedEmployee) return;
    setActionLoading(true);
    try {
      // Les appels backend doivent déjà appliquer la sécurité; côté frontend on fait juste la sélection
      await timeEntriesAPI.clockIn(selectedEmployee, {});
      toast.success('Pointage d\'entrée enregistré');
      loadEntries();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du pointage d\'entrée');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!selectedEmployee) return;
    setActionLoading(true);
    try {
      await timeEntriesAPI.clockOut(selectedEmployee, {});
      toast.success('Pointage de sortie enregistré');
      loadEntries();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du pointage de sortie');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 lg:p-8">
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 lg:p-8 animate-fade-in">
        {/* Header Section */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-slate-100/50 rounded-2xl -z-10"></div>
          <div className="p-6 bg-white rounded-lg border border-slate-200 shadow-soft">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Pointages</h1>
              <p className="text-slate-600 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Enregistrez les entrées et sorties des employés
              </p>
            </div>
          </div>
        </div>

        {employeeLinkError && (
          <Card className="mb-6 border border-red-200 bg-red-50 text-red-700">
            <p className="text-sm font-medium">{employeeLinkError}</p>
            <p className="text-xs mt-2">
              Les actions de pointage sont désactivées tant que l'association n'est pas corrigée.
            </p>
          </Card>
        )}

        {/* Actions */}
        <Card className="mb-6 shadow-soft">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1 w-full sm:w-auto">
                {user && isBasicUser(user) ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employé</label>
                    <input
                      type="text"
                      readOnly
                      value={(() => {
                        const firstName = currentEmployee?.firstName || user.employee?.firstName || '';
                        const lastName = currentEmployee?.lastName || user.employee?.lastName || '';
                        const fullName = `${firstName} ${lastName}`.trim();
                        if (fullName) return fullName;
                        const employeeNumber = currentEmployee?.employeeNumber || user.employee?.employeeNumber;
                        if (employeeNumber) return `Employé #${employeeNumber}`;
                        if (user.email) return user.email;
                        return 'Profil non lié – contactez votre administrateur';
                      })()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                    />
                  </div>
                ) : (
                  <SelectSearch
                    label="Employé"
                    value={String(selectedEmployee || '')}
                    onChange={(value) => setSelectedEmployee(Number(value))}
                    options={employees.map((emp) => ({
                      value: String(emp.id),
                      label: `${emp.firstName} ${emp.lastName}`,
                      subtitle: `${emp.employeeNumber} • ${emp.organizationalUnit?.name || 'Aucune unité'}`,
                    }))}
                    placeholder="Sélectionnez un employé..."
                  />
                )}
              </div>
              <div className="flex items-center gap-3 mt-4 sm:mt-7">
                <Button
                  onClick={handleClockIn}
                  disabled={actionLoading || !selectedEmployee || !!employeeLinkError}
                  size="sm"
                  className="bg-green-100 hover:bg-green-200 text-green-500 shadow-sm hover:shadow-sm transition-all"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Entrée
                </Button>
                <Button
                  onClick={handleClockOut}
                  disabled={actionLoading || !selectedEmployee || !!employeeLinkError}
                  size="sm"
                  className="bg-red-100 hover:bg-red-200 text-red-500 shadow-sm hover:shadow-sm transition-all"
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Sortie
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Entries Table */}
        <Card className="shadow-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Heure d'entrée
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Heure de sortie
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Total heures
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Statut
                  </th>
          <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
            Validation
          </th>
          {(canEditEntries || canDeleteEntries || canValidateEntries) && (
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry: any, index: number) => (
                  <tr 
                    key={entry.id} 
                    className="hover:bg-slate-50 transition-all duration-200"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {new Date(entry.date).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-green-700">
                          {entry.clockIn
                            ? new Date(entry.clockIn).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-red-700">
                          {entry.clockOut
                            ? new Date(entry.clockOut).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-sm font-semibold">
                        {entry.totalHours ? `${entry.totalHours.toFixed(2)}h` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          isEntryCompleted(entry.status)
                            ? 'success'
                            : isEntryPending(entry.status)
                            ? 'warning'
                            : 'secondary'
                        }
                        className="shadow-sm"
                      >
                        {getTimeEntryStatusLabel(entry.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={entry.isValidated ? 'success' : 'warning'}
                        className="shadow-sm"
                        title={
                          entry.isValidated && entry.validatedAt
                            ? `Validé le ${new Date(entry.validatedAt).toLocaleString('fr-FR')}`
                            : 'En attente de validation par un manager'
                        }
                      >
                        {entry.isValidated ? 'Pointage validé' : 'En attente de validation'}
                      </Badge>
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={entry.isValidated ? 'success' : 'warning'}
                        className="shadow-sm"
                      >
                        {entry.isValidated ? 'Validé par un manager' : 'En attente de validation'}
                      </Badge>
                    </td> */}
                    {(canEditEntries || canDeleteEntries || canValidateEntries) && (
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canValidateEntries && (
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8 text-emerald-600"
                              disabled={validatingEntryId === entry.id || entry.isValidated}
                              onClick={() => handleValidateEntry(entry.id)}
                              title="Valider ce pointage"
                            >
                              {validatingEntryId === entry.id ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          {canEditEntries && (
                            <>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8 text-slate-600"
                                onClick={() => openEditModal(entry)}
                                title="Modifier le pointage"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              {canDeleteEntries && (
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={deleteLoadingId === entry.id}
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  title="Supprimer le pointage"
                                >
                                  {deleteLoadingId === entry.id ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {entries.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucun pointage enregistré</h3>
                <p className="text-slate-500">Commencez par enregistrer une entrée</p>
              </div>
            )}
          </div>
        </Card>
        <Modal
          isOpen={showEditModal}
          onClose={closeEditModal}
          title="Modifier le pointage"
          description="Ajustez les heures pour ce pointage employé."
        >
          <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
            <Input
              label="Heure d'entrée"
              type="datetime-local"
              value={editForm.clockIn}
              onChange={(e) => setEditForm((prev) => ({ ...prev, clockIn: e.target.value }))}
            />
            <Input
              label="Heure de sortie"
              type="datetime-local"
              value={editForm.clockOut}
              onChange={(e) => setEditForm((prev) => ({ ...prev, clockOut: e.target.value }))}
            />
            <Input
              label="Total heures"
              type="number"
              step="0.01"
              value={editForm.totalHours}
              onChange={(e) => setEditForm((prev) => ({ ...prev, totalHours: e.target.value }))}
              placeholder="Laissez vide pour recalculer automatiquement"
            />
            <Select
              label="Statut"
              value={editForm.status}
              onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
              options={statusOptions}
            />
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={closeEditModal}
                disabled={editLoading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={editLoading}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {editLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}
