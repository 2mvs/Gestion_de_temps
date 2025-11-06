'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit, Trash2, UserPlus, X, Users, Building2, Upload, Printer } from 'lucide-react';
import Layout from '@/components/Layout';
import { isAuthenticated } from '@/lib/auth';
import { employeesAPI, organizationalUnitsAPI } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import FormActions from '@/components/ui/FormActions';
import PageHeader from '@/components/ui/PageHeader';
import { genderTypeOptions, contractTypeOptions, employeeStatusOptions } from '@/lib/constants';
import { toast } from 'react-toastify/unstyled';

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [organizationalUnits, setOrganizationalUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    gender: 'UNKNOWN',
    hireDate: '',
    contractType: 'FULL_TIME',
    status: 'ACTIVE',
    organizationalUnitId: null as number | null,
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
      const [employeesResponse, unitsResponse] = await Promise.all([
        employeesAPI.getAll(),
        organizationalUnitsAPI.getAll(),
      ]);
      setEmployees(employeesResponse.data || []);
      setOrganizationalUnits(unitsResponse.data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit appelé, editingEmployee:', editingEmployee);
    console.log('formData:', formData);
    
    try {
      if (editingEmployee) {
        // Pour l'update, on ne modifie pas employeeNumber (c'est un champ unique)
        const updateData = {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          gender: formData.gender,
          hireDate: formData.hireDate,
          contractType: formData.contractType,
          status: formData.status,
          organizationalUnitId: formData.organizationalUnitId || null,
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
          gender: formData.gender,
          hireDate: formData.hireDate,
          contractType: formData.contractType,
          status: formData.status,
          organizationalUnitId: formData.organizationalUnitId || null,
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
        gender: 'UNKNOWN',
        hireDate: '',
        contractType: 'FULL_TIME',
        status: 'ACTIVE',
        organizationalUnitId: null,
      });
      loadData();
    } catch (error: any) {
      console.error('Erreur lors de l\'opération:', error);
      toast.error(error.response?.data?.message || error.message || 'Erreur lors de l\'opération');
    }
  };

  const handleEdit = (employee: any) => {
    setEditingEmployee(employee);
    // Récupérer organizationalUnitId soit directement, soit depuis la relation
    const orgUnitId = employee.organizationalUnitId || employee.organizationalUnit?.id || null;
    
    setFormData({
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email || '',
      phone: employee.phone || '',
      gender: employee.gender || 'UNKNOWN',
      hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '',
      contractType: employee.contractType || 'FULL_TIME',
      status: employee.status || 'ACTIVE',
      organizationalUnitId: orgUnitId,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
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

  const handleOpenModal = () => {
    setEditingEmployee(null);
    setFormData({
      employeeNumber: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      gender: 'UNKNOWN',
      hireDate: '',
      contractType: 'FULL_TIME',
      status: 'ACTIVE',
      organizationalUnitId: null,
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
          actionLabel="Ajouter un employé"
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
        <Card className="shadow-soft mb-6">
          <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-slate-700 font-medium">Importer des employés via un fichier CSV</p>
              {/* <p className="text-slate-500 text-sm">Colonnes supportées: employeeNumber, firstName, lastName, email, phone, gender, hireDate, contractType, status, organizationalUnitId, workCycleId</p> */}
            </div>
            <div className="flex items-center gap-3">
              <input id="csvFileInput" type="file" accept=".csv" className="hidden" onChange={async (e) => {
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
                    Statut
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
                      <Badge variant={emp.status === 'ACTIVE' ? 'success' : 'secondary'} className="shadow-sm">
                        {emp.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => router.push(`/employees/${emp.id}/payslip`)}
                          className="p-2.5 text-blue-600 bg-blue-100 hover:bg-blue-50 transition-all hover:scale-110 active:scale-95"
                          title="Fiche de paie"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(emp)}
                          className="p-2.5 text-cyan-600 bg-cyan-100 hover:bg-cyan-50 transition-all hover:scale-110 active:scale-95"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="p-2.5 text-red-600 bg-red-100 hover:bg-red-50 transition-all hover:scale-110 active:scale-95"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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

        {/* Modal Amélioré */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingEmployee(null);
          }}
          title={editingEmployee ? 'Modifier l\'employé' : 'Nouvel Employé'}
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
      </div>
    </Layout>
  );
}
