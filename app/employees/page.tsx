'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit, Trash2, UserPlus, X, Users, Building2, Upload, Printer, KeyRound, UserCheck } from 'lucide-react';
import Layout from '@/components/Layout';
import { isAuthenticated, getUser, isAdmin } from '@/lib/auth';
import { employeesAPI, organizationalUnitsAPI, workCyclesAPI } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import FormActions from '@/components/ui/FormActions';
import PageHeader from '@/components/ui/PageHeader';
import { genderTypeOptions, contractTypeOptions, employeeStatusOptions, userRoleOptions } from '@/lib/constants';
import { toast } from 'react-toastify/unstyled';

const normalizeValue = (value?: string | null) => (value || '').toString().toUpperCase();

const GENDER_MAPPING: Record<string, string> = {
  HOMME: 'HOMME',
  MALE: 'HOMME',
  FEMME: 'FEMME',
  FEMALE: 'FEMME',
  INCONNU: 'INCONNU',
  UNKNOWN: 'INCONNU',
};

const CONTRACT_MAPPING: Record<string, string> = {
  TEMPS_PLEIN: 'TEMPS_PLEIN',
  FULL_TIME: 'TEMPS_PLEIN',
  TEMPS_PARTIEL: 'TEMPS_PARTIEL',
  PART_TIME: 'TEMPS_PARTIEL',
  INTERIM: 'INTERIM',
  CONTRAT: 'CONTRAT',
  CONTRACT: 'CONTRAT',
};

const EMPLOYEE_STATUS_MAPPING: Record<string, string> = {
  ACTIF: 'ACTIF',
  ACTIVE: 'ACTIF',
  INACTIF: 'INACTIF',
  INACTIVE: 'INACTIF',
  SUSPENDU: 'SUSPENDU',
  SUSPENDED: 'SUSPENDU',
  RESILIE: 'RESILIE',
  TERMINATED: 'RESILIE',
};

const ROLE_MAPPING: Record<string, string> = {
  ADMINISTRATEUR: 'ADMINISTRATEUR',
  ADMIN: 'ADMINISTRATEUR',
  ADMINISTRATOR: 'ADMINISTRATEUR',
  GESTIONNAIRE: 'GESTIONNAIRE',
  MANAGER: 'GESTIONNAIRE',
  MANGER: 'GESTIONNAIRE',
  UTILISATEUR: 'UTILISATEUR',
  USER: 'UTILISATEUR',
};

const mapGenderToFrench = (gender?: string | null) => GENDER_MAPPING[normalizeValue(gender)] || 'INCONNU';
const mapContractToFrench = (contract?: string | null) => CONTRACT_MAPPING[normalizeValue(contract)] || 'TEMPS_PLEIN';
const mapEmployeeStatusToFrench = (status?: string | null) => EMPLOYEE_STATUS_MAPPING[normalizeValue(status)] || 'ACTIF';
const mapRoleToFrench = (role?: string | null) => ROLE_MAPPING[normalizeValue(role)] || 'UTILISATEUR';
const isEmployeeActiveStatus = (status?: string | null) => mapEmployeeStatusToFrench(status) === 'ACTIF';

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [organizationalUnits, setOrganizationalUnits] = useState<any[]>([]);
  const [workCycles, setWorkCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    employeeNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: 'INCONNU',
    hireDate: '',
    contractType: 'TEMPS_PLEIN',
    status: 'ACTIF',
    organizationalUnitId: null as number | null,
    workCycleId: '',
  });
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedEmployeeForAccess, setSelectedEmployeeForAccess] = useState<any | null>(null);
  const [accessForm, setAccessForm] = useState({ email: '', password: '', role: 'UTILISATEUR' });
  const [accessLoading, setAccessLoading] = useState(false);
  const isCurrentUserAdmin = isAdmin(currentUser);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    const storedUser = getUser();
    setCurrentUser(storedUser);
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const [employeesResponse, unitsResponse, cyclesResponse] = await Promise.all([
        employeesAPI.getAll(),
        organizationalUnitsAPI.getAll(),
        workCyclesAPI.getAll(),
      ]);
      setEmployees(employeesResponse.data || []);
      setOrganizationalUnits(unitsResponse.data || []);
      setWorkCycles(cyclesResponse.data || cyclesResponse || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAccessModal = (employee: any) => {
    if (!isCurrentUserAdmin) {
      toast.error('Accès refusé');
      return;
    }
    setSelectedEmployeeForAccess(employee);
    setAccessForm({
      email: employee?.user?.email || employee?.email || '',
      password: '',
      role: mapRoleToFrench(employee?.user?.role || 'UTILISATEUR'),
    });
    setShowAccessModal(true);
  };

  const closeAccessModal = () => {
    setShowAccessModal(false);
    setSelectedEmployeeForAccess(null);
    setAccessForm({ email: '', password: '', role: 'UTILISATEUR' });
    setAccessLoading(false);
  };

  const handleAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeForAccess) return;

    if (!isCurrentUserAdmin) {
      toast.error('Accès refusé');
      return;
    }

    try {
      setAccessLoading(true);
      const payload: any = {
        email: accessForm.email.trim(),
      };
      if (!payload.email) {
        toast.error('Veuillez renseigner un email valide');
        setAccessLoading(false);
        return;
      }
      const trimmedPassword = accessForm.password.trim();
      if (trimmedPassword && trimmedPassword.length < 6) {
        toast.error('Le mot de passe doit contenir au moins 6 caractères');
        setAccessLoading(false);
        return;
      }
      if (!selectedEmployeeForAccess?.user && trimmedPassword.length < 6) {
        toast.error('Veuillez définir un mot de passe initial de minimum 6 caractères');
        setAccessLoading(false);
        return;
      }
      if (trimmedPassword) {
        payload.password = trimmedPassword;
      }
      if (isCurrentUserAdmin) {
        const selectedRole = mapRoleToFrench(accessForm.role);
        const allowedRoles = userRoleOptions.map((option) => option.value);
        if (!allowedRoles.includes(selectedRole)) {
          toast.error('Rôle utilisateur invalide');
          setAccessLoading(false);
          return;
        }
        payload.role = selectedRole;
      }

      const response = await employeesAPI.linkAccount(selectedEmployeeForAccess.id, payload);
      toast.success(response?.message || 'Accès employé mis à jour');
      closeAccessModal();
      await loadData();
    } catch (error: any) {
      console.error('Erreur lors de l\'activation de l\'accès:', error);
      toast.error(error.response?.data?.message || error.message || 'Erreur lors de l\'activation de l\'accès');
    } finally {
      setAccessLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit appelé, editingEmployee:', editingEmployee);
    console.log('formData:', formData);
    
    if (!isCurrentUserAdmin) {
      toast.error('Accès refusé');
      return;
    }

    try {
      if (editingEmployee) {
        // Pour l'update, on ne modifie pas employeeNumber (c'est un champ unique)
        const updateData = {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          gender: mapGenderToFrench(formData.gender),
          hireDate: formData.hireDate,
          contractType: mapContractToFrench(formData.contractType),
          status: mapEmployeeStatusToFrench(formData.status),
          organizationalUnitId: formData.organizationalUnitId || null,
          workCycleId: formData.workCycleId ? Number(formData.workCycleId) : null,
        };
        console.log('Données de mise à jour envoyées:', updateData);
        console.log('ID employé:', editingEmployee.id);
        const response = await employeesAPI.update(editingEmployee.id, updateData);
        console.log('Réponse API:', response);
        toast.success('Employé modifié avec succès !');
      } else {
        // Pour la création, on inclut employeeNumber
        const createData = {
          employeeNumber: formData.employeeNumber.trim(),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          gender: mapGenderToFrench(formData.gender),
          hireDate: formData.hireDate,
          contractType: mapContractToFrench(formData.contractType),
          status: mapEmployeeStatusToFrench(formData.status),
          organizationalUnitId: formData.organizationalUnitId || null,
          workCycleId: formData.workCycleId ? Number(formData.workCycleId) : null,
        };
        await employeesAPI.create(createData);
        toast.success('Employé créé avec succès !');
      }
      setShowModal(false);
      setEditingEmployee(null);
      setFormData({
        employeeNumber: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        gender: 'INCONNU',
        hireDate: '',
        contractType: 'TEMPS_PLEIN',
        status: 'ACTIF',
        organizationalUnitId: null,
        workCycleId: '',
      });
      loadData();
    } catch (error: any) {
      console.error('Erreur lors de l\'opération:', error);
      toast.error(error.response?.data?.message || error.message || 'Erreur lors de l\'opération');
    }
  };

  const handleEdit = (employee: any) => {
  if (!isCurrentUserAdmin) {
    toast.error('Accès refusé');
    return;
  }
    setEditingEmployee(employee);
    // Récupérer organizationalUnitId soit directement, soit depuis la relation
    const orgUnitId = employee.organizationalUnitId || employee.organizationalUnit?.id || null;
    
    setFormData({
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email || '',
      phone: employee.phone || '',
      gender: mapGenderToFrench(employee.gender),
      hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '',
      contractType: mapContractToFrench(employee.contractType),
      status: mapEmployeeStatusToFrench(employee.status),
      organizationalUnitId: orgUnitId,
      workCycleId: employee.workCycle?.id ? String(employee.workCycle.id) : '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
  if (!isCurrentUserAdmin) {
    toast.error('Accès refusé');
    return;
  }
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet employé ? Cette action sera archivée.')) {
      return;
    }

    try {
      await employeesAPI.delete(id);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const getRoleLabel = (role: string) => {
    if (!role) return '-';
    const option = userRoleOptions.find((opt) => opt.value === role);
    return option ? option.label : role;
  };

  const filteredEmployees = employees.filter((emp) =>
    `${emp.firstName} ${emp.lastName} ${emp.employeeNumber}`
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

  const workCycleOptions = [
    { value: '', label: 'Aucun cycle (non assigné)' },
    ...(workCycles || []).map((cycle: any) => {
      const schedule = cycle.schedule || {};
      const scheduleLabel = schedule?.label
        ? `${schedule.label} (${schedule.startTime || '--:--'} – ${schedule.endTime || '--:--'})`
        : 'Horaire non défini';
      const slotSummary = (schedule.slots || [])
        .filter((slot: any) => ['HEURE_SUPPLEMENTAIRE', 'HEURE_SPECIALE', 'OVERTIME', 'SPECIAL'].includes(normalizeValue(slot.slotType)))
        .map(
          (slot: any) =>
            `${slot.label || slot.slotType} ${slot.multiplier ? `${Number(slot.multiplier).toFixed(2)}x` : ''}`
              .trim()
        )
        .join(' • ');
      const labelParts = [cycle.label, scheduleLabel];
      if (slotSummary) {
        labelParts.push(slotSummary);
      }
      return {
        value: String(cycle.id),
        label: labelParts.join(' • '),
      };
    }),
  ];

  const handleOpenModal = () => {
    if (!isCurrentUserAdmin) {
      toast.error('Accès refusé');
      return;
    }
    setEditingEmployee(null);
    setFormData({
      employeeNumber: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      gender: 'INCONNU',
      hireDate: '',
      contractType: 'TEMPS_PLEIN',
      status: 'ACTIF',
      organizationalUnitId: null,
      workCycleId: '',
    });
    setShowModal(true);
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 animate-fade-in">
        {/* Header Section */}
        <PageHeader
          title="Employés"
          description="Gérez vos employés et leurs informations"
          icon={Users}
          actionLabel={isCurrentUserAdmin ? 'Ajouter un employé' : undefined}
          actionIcon={isCurrentUserAdmin ? Plus : undefined}
          onAction={isCurrentUserAdmin ? handleOpenModal : undefined}
        />

        {!isCurrentUserAdmin && (
          <Card className="mb-6 border border-amber-200 bg-amber-50 text-amber-800 shadow-sm">
            <div className="p-4 text-sm">
              Cette vue est en lecture seule. En tant que manager, vous pouvez consulter votre équipe et valider les pointages ou absences, mais la création ou la modification des comptes reste réservée aux administrateurs.
            </div>
          </Card>
        )}

        {/* Search Bar with Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <Card className="lg:col-span-3 shadow-soft hover:shadow-elevated transition-shadow">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Rechercher un employé"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 py-3 text-base border-slate-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all"
              />
            </div>
          </Card>
          <Card className="bg-white border-cyan-50 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-1">Total</p>
                <p className="text-2xl font-bold text-cyan-700">{filteredEmployees.length}</p>
              </div>
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-cyan-700" />
              </div>
            </div>
          </Card>
        </div>

        {/* Import CSV */}
        {isCurrentUserAdmin && (
          <Card className="shadow-soft mb-6">
            <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-slate-700 font-medium">Importer des employés via un fichier CSV</p>
                {/* <p className="text-slate-500 text-sm">Colonnes supportées: employeeNumber, firstName, lastName, email, phone, gender, hireDate, contractType, status, organizationalUnitId, workCycleId</p> */}
              </div>
              <div className="flex items-center gap-3">
                <input id="csvFileInput" type="file" accept=".csv" className="hidden" onChange={async (e) => {
                  if (!isCurrentUserAdmin) return;
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImporting(true);
                  setImportResult(null);
                  try {
                    const text = await file.text();
                    const rows = text.split(/\r?\n/).filter(Boolean);
                    if (rows.length < 2) {
                      toast.error('CSV vide ou en-têtes absents');
                      setImporting(false);
                      return;
                    }
                    const headers = rows[0].split(',').map(h => h.trim());
                    const items = rows.slice(1).map(line => {
                      const values = line.split(',');
                      const obj: any = {};
                      headers.forEach((h, i) => obj[h] = values[i]?.trim());
                      return obj;
                    });
                    const result = await employeesAPI.bulkImport(items);
                    setImportResult(result?.data || result);
                    await loadData();
                  } catch (err: any) {
                    toast.error(err?.response?.data?.message || err?.message || 'Erreur lors de l\'import');
                  } finally {
                    setImporting(false);
                    // reset input to allow re-upload same file if needed
                    const input = document.getElementById('csvFileInput') as HTMLInputElement | null;
                    if (input) input.value = '';
                  }
                }} />
                <Button
                  onClick={() => (document.getElementById('csvFileInput') as HTMLInputElement)?.click()}
                  disabled={importing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {importing ? 'Import en cours...' : 'Importer CSV'}
                </Button>
              </div>
            </div>
            {importResult && (
              <div className="px-4 pb-4 text-sm text-slate-700">
                <p>Créés: <span className="font-semibold text-emerald-700">{importResult.createdCount}</span> — Ignorés: <span className="font-semibold text-amber-700">{importResult.skippedCount}</span></p>
              </div>
            )}
          </Card>
        )}

        {/* Table */}
        <Card className="shadow-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase ">
                    Matricule
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase ">
                    Nom
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase ">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase ">
                    Type de contrat
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase ">
                    Unité organisationnelle
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase ">
                    Cycle / Horaire
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase ">
                    Statut
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase ">
                    Accès au Portail
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp: any, index: number) => (
                  <tr 
                    key={emp.id} 
                    className="hover:bg-slate-50 transition-all duration-200 group"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1  text-cyan-700 text-sm font-semibold">
                        {emp.employeeNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {/* <div className="w-11 h-11 bg-cyan-600 rounded-full flex items-center justify-center mr-3 shadow-md group-hover:scale-110 transition-transform">
                          <span className="text-white font-bold text-sm">
                            {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                          </span>
                        </div> */}
                        <span className="text-sm font-semibold text-slate-900">
                          {emp.firstName} {emp.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600">{emp.email || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 text-slate-700 text-xs font-medium">
                        {emp.contractType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600 flex items-center gap-1">
                        {emp.organizationalUnit?.name ? (
                          <>
                            {emp.organizationalUnit.name}
                          </>
                        ) : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {emp.workCycle ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-800">
                            {emp.workCycle.label}
                          </span>
                          {emp.workCycle.schedule && (
                            <span className="text-xs text-slate-500">
                              {emp.workCycle.schedule.startTime} → {emp.workCycle.schedule.endTime}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Non assigné</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={isEmployeeActiveStatus(emp.status) ? 'success' : 'secondary'} className="shadow-sm">
                        {employeeStatusOptions.find((opt) => opt.value === mapEmployeeStatusToFrench(emp.status))?.label || mapEmployeeStatusToFrench(emp.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {emp.user ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="success" className="shadow-sm flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            Activé
                          </Badge>
                          <Badge variant="outline" className="shadow-sm">
                            {getRoleLabel(emp.user.role)}
                          </Badge>
                          <span className="text-xs text-slate-500 truncate max-w-[120px]" title={emp.user.email}>
                            {emp.user.email}
                          </span>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="shadow-sm">
                          Non activé
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {isCurrentUserAdmin && (
                          <button
                            onClick={() => openAccessModal(emp)}
                            className="p-2.5 text-emerald-600 bg-emerald-100 hover:bg-emerald-50 transition-all hover:scale-110 active:scale-95"
                            title={emp.user ? 'Mettre à jour l\'accès' : 'Donner l\'accès'}
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/employees/${emp.id}/payslip`)}
                          className="p-2.5 text-blue-600 bg-blue-100 hover:bg-blue-50 transition-all hover:scale-110 active:scale-95"
                          title="Fiche de paie"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {isCurrentUserAdmin && (
                          <button
                            onClick={() => handleEdit(emp)}
                            className="p-2.5 text-cyan-600 bg-cyan-100 hover:bg-cyan-50 transition-all hover:scale-110 active:scale-95"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {isCurrentUserAdmin && (
                          <button
                            onClick={() => handleDelete(emp.id)}
                            className="p-2.5 text-red-600 bg-red-100 hover:bg-red-50 transition-all hover:scale-110 active:scale-95"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredEmployees.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucun employé trouvé</h3>
                <p className="text-slate-500">Commencez par ajouter votre premier employé</p>
              </div>
            )}
          </div>
        </Card>

        {isCurrentUserAdmin && (
          <Modal
            isOpen={showAccessModal}
            onClose={closeAccessModal}
            title={selectedEmployeeForAccess?.user ? "Mettre à jour l'accès utilisateur" : "Donner l'accès utilisateur"}
            description="Autorisez un employé à se connecter à l'interface en lui attribuant un compte utilisateur."
          >
            <form onSubmit={handleAccessSubmit} className="p-6 space-y-6">
              <div>
                <Input
                  label="Email de connexion *"
                  type="email"
                  required
                  value={accessForm.email}
                  onChange={(e) => setAccessForm({ ...accessForm, email: e.target.value })}
                />
              </div>
              <div>
                <Input
                  label={selectedEmployeeForAccess?.user ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe initial *'}
                  type="password"
                  required={!selectedEmployeeForAccess?.user}
                  value={accessForm.password}
                  onChange={(e) => setAccessForm({ ...accessForm, password: e.target.value })}
                  placeholder={selectedEmployeeForAccess?.user ? "Laisser vide pour conserver l'actuel" : ''}
                />
                <p className="text-xs text-slate-500 mt-2">
                  {selectedEmployeeForAccess?.user
                    ? 'Laissez vide pour conserver le mot de passe actuel. Minimum 6 caractères si vous souhaitez le modifier.'
                    : 'Mot de passe initial de minimum 6 caractères.'}
                </p>
              </div>

              <Select
                label="Rôle utilisateur"
                value={accessForm.role}
                onChange={(e) => setAccessForm({ ...accessForm, role: e.target.value })}
                options={userRoleOptions}
              />

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeAccessModal}
                  disabled={accessLoading}
                  className="hover:bg-slate-100 border-2"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={accessLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg"
                >
                  {accessLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 mr-2" />
                      {selectedEmployeeForAccess?.user ? 'Mettre à jour' : "Créer l'accès"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Modal Amélioré */}
        {isCurrentUserAdmin && (
          <Modal
            isOpen={showModal}
            onClose={() => {
              setShowModal(false);
              setEditingEmployee(null);
            }}
            title={editingEmployee ? "Modifier l'employé" : 'Nouvel Employé'}
            description={editingEmployee ? 'Modifiez les informations ci-dessous' : 'Remplissez les informations pour créer un nouvel employé'}
          >
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Numéro d'employé *"
                    required
                    disabled={!!editingEmployee}
                    value={formData.employeeNumber}
                    onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                  />
                  <Input
                    label="Date d'embauche *"
                    type="date"
                    required
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Prénom *"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                  <Input
                    label="Nom *"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <Input
                    label="Téléphone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <Select
                  label="Genre"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  options={genderTypeOptions}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Type de contrat"
                    value={formData.contractType}
                    onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
                    options={contractTypeOptions}
                  />
                  <Select
                    label="Statut"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    options={employeeStatusOptions}
                  />
                </div>
                <Select
                  label="Unité organisationnelle"
                  value={formData.organizationalUnitId?.toString() || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      organizationalUnitId: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  options={[
                    { value: '', label: 'Aucune' },
                    ...organizationalUnits.map((unit) => ({
                      value: unit.id.toString(),
                      label: unit.name,
                    })),
                  ]}
                />
                <Select
                  label="Cycle de travail (horaire)"
                  value={formData.workCycleId}
                  onChange={(e) => setFormData({ ...formData, workCycleId: e.target.value })}
                  options={workCycleOptions}
                />
            
            <FormActions
              onCancel={() => {
                setShowModal(false);
                setEditingEmployee(null);
              }}
              submitLabel={editingEmployee ? 'Modifier' : 'Créer'}
              isEditing={!!editingEmployee}
              submitIcon={editingEmployee ? undefined : <UserPlus className="w-4 h-4 mr-2" />}
            />
            </form>
          </Modal>
        )}
      </div>
    </Layout>
  );
}
