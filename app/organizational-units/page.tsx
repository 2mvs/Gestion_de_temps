'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, X, Building2, ChevronRight, ChevronDown, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import Layout from '@/components/Layout';
import { getUser, isAdmin, isAuthenticated } from '@/lib/auth';
import { employeesAPI, organizationalUnitsAPI } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

interface OrganizationalUnit {
  id: number;
  code: string;
  name: string;
  description: string | null;
  parentId: number | null;
  parent?: OrganizationalUnit | null;
  children?: OrganizationalUnit[];
  employees?: any[];
  manager?: {
    id: number;
    email: string;
    role: string;
  } | null;
  _count?: {
    employees: number;
    children: number;
  };
}

export default function OrganizationalUnitsPage() {
  const router = useRouter();
  const [tree, setTree] = useState<OrganizationalUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<OrganizationalUnit | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    parentId: null as number | null,
    managerId: '',
  });
  const [allUnits, setAllUnits] = useState<OrganizationalUnit[]>([]);
  const [managerOptions, setManagerOptions] = useState<{ value: string; label: string }[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const isAdminUser = useMemo(() => isAdmin(currentUser), [currentUser]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    const user = getUser();
    setCurrentUser(user);
    loadData(isAdmin(user));
  }, [router]);

  const loadData = async (includeManagers: boolean = false) => {
    try {
      const [treeResponse, allUnitsResponse] = await Promise.all([
        organizationalUnitsAPI.getTree(),
        organizationalUnitsAPI.getAll(),
      ]);
      setTree(treeResponse.data || []);
      setAllUnits(allUnitsResponse.data || []);
      // Développer tous les nœuds par défaut
      const allIds = extractAllIds(treeResponse.data || []);
      setExpandedNodes(new Set(allIds));

      if (includeManagers) {
        try {
          const employeesResponse = await employeesAPI.getAll();
          const managers =
            (employeesResponse.data || [])
              .filter((emp: any) => String(emp.user?.role || '').toUpperCase() === 'MANAGER')
              .map((emp: any) => ({
                value: emp.user?.id?.toString() || '',
                label: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.user?.email,
              }))
              .filter((option: { value: string }) => option.value);
          setManagerOptions(managers);
        } catch (managerError) {
          console.error('Erreur chargement managers:', managerError);
          setManagerOptions([]);
        }
      } else {
        setManagerOptions([]);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractAllIds = (units: OrganizationalUnit[]): number[] => {
    let ids: number[] = [];
    units.forEach((unit) => {
      ids.push(unit.id);
      if (unit.children && unit.children.length > 0) {
        ids = ids.concat(extractAllIds(unit.children));
      }
    });
    return ids;
  };

  const toggleNode = (id: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminUser) {
      toast.error('Accès refusé');
      return;
    }
    try {
      // Convertir parentId correctement
      const parentIdValue = formData.parentId === null || formData.parentId === 0 
        ? null 
        : Number(formData.parentId);

      const payload: any = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        parentId: parentIdValue,
      };

      payload.managerId = formData.managerId ? Number(formData.managerId) : null;

      if (editingUnit) {
        await organizationalUnitsAPI.update(editingUnit.id, payload);
        toast.success('Unité organisationnelle modifiée avec succès');
      } else {
        await organizationalUnitsAPI.create(payload);
        toast.success('Unité organisationnelle créée avec succès');
      }

      setShowModal(false);
      setEditingUnit(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        parentId: null,
        managerId: '',
      });
      loadData(isAdminUser);
    } catch (error: any) {
      console.error('Erreur lors de l\'opération:', error);
      toast.error(error.response?.data?.message || error.message || 'Erreur lors de l\'opération');
    }
  };

  const handleEdit = (unit: OrganizationalUnit) => {
    setEditingUnit(unit);
    setFormData({
      code: unit.code || '',
      name: unit.name,
      description: unit.description || '',
      parentId: unit.parentId,
      managerId: unit.manager?.id ? unit.manager.id.toString() : '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!isAdminUser) {
      toast.error('Accès refusé');
      return;
    }
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette unité organisationnelle ?')) {
      return;
    }

    try {
      await organizationalUnitsAPI.delete(id);
      toast.success('Unité organisationnelle supprimée avec succès');
      loadData(isAdminUser);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleAddChild = (parentId: number) => {
    if (!isAdminUser) {
      toast.error('Accès refusé');
      return;
    }
    setEditingUnit(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      parentId: parentId,
      managerId: '',
    });
    setShowModal(true);
  };

  const renderUnit = (unit: OrganizationalUnit, level: number = 0) => {
    const isExpanded = expandedNodes.has(unit.id);
    const hasChildren = unit.children && unit.children.length > 0;

    return (
      <div key={unit.id} className="select-none">
        <div
          className="flex items-center justify-between p-3 hover:bg-slate-100 transition-all duration-200 group"
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          <div className="flex items-center flex-1 min-w-0">
            {hasChildren ? (
              <button
                onClick={() => toggleNode(unit.id)}
                className="mr-2 p-1.5 hover:bg-cyan-100  transition-all hover:scale-110"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-cyan-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-cyan-600" />
                )}
              </button>
            ) : (
              <div className="w-7 mr-2" />
            )}
            {/* <div className="w-10 h-10 bg-cyan-600 rounded-sm flex items-center justify-center mr-3 shadow-md group-hover:scale-110 transition-transform">
              <Building2 className="w-5 h-5 text-white" />
            </div> */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 truncate">{unit.name}</h3>
                {unit._count && (
                  <>
                    {unit._count.children > 0 && (
                      <Badge variant="secondary" className="text-xs shadow-sm bg-cyan-50 text-cyan-700 border-cyan-200">
                        {unit._count.children} sous-unité{unit._count.children > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {unit._count.employees > 0 && (
                      <Badge variant="secondary" className="text-xs shadow-sm bg-slate-100 text-slate-700 border-slate-200">
                        <Users className="w-3 h-3 inline mr-1" />
                        {unit._count.employees}
                      </Badge>
                    )}
                  </>
                )}
              </div>
              {unit.manager && (
                <p className="text-xs text-slate-500 mt-1">
                  Manager&nbsp;: <span className="font-medium text-slate-700">{unit.manager.email}</span>
                </p>
              )}
              {unit.description && (
                <p className="text-sm text-slate-500 truncate mt-1">{unit.description}</p>
              )}
            </div>
          </div>
          {isAdminUser && (
            <div className="flex items-center gap-2 ml-4 shrink-0">
              <button
                onClick={() => handleAddChild(unit.id)}
                className="p-2.5 text-gray-600 bg-gray-200 hover:bg-cyan-50  transition-all hover:scale-110 active:scale-95"
                title="Ajouter une sous-unité"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleEdit(unit)}
                className="p-2.5 text-cyan-600 bg-cyan-200 hover:bg-cyan-50  transition-all hover:scale-110 active:scale-95"
                title="Modifier"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(unit.id)}
                className="p-2.5 text-red-600 bg-red-200 hover:bg-red-50  transition-all hover:scale-110 active:scale-95"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {unit.children!.map((child) => renderUnit(child, level + 1))}
          </div>
        )}
      </div>
    );
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
          <div className="absolute inset-0 bg-slate-100/50 -z-10"></div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 bg-white border border-slate-200 shadow-soft">
            <div>
              <h1 className="text-xl font-bold text-slate-800 mb-2">Organigramme</h1>
              <p className="text-slate-600 flex text-sm items-center gap-2">
                Gérez la structure organisationnelle de votre entreprise
              </p>
            </div>
            {isAdminUser && (
              <Button 
                onClick={() => {
                  setEditingUnit(null);
                  setFormData({
                    code: '',
                    name: '',
                    description: '',
                    parentId: null,
                    managerId: '',
                  });
                  setShowModal(true);
                }} 
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="w-5 h-5 mr-2" />
                Ajouter une unité
              </Button>
            )}
          </div>
        </div>

        {/* Organigramme Tree */}
        <Card className="shadow-elevated">
          <div className="p-4">
            {tree.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucune unité organisationnelle</h3>
                <p className="text-slate-500 mb-4">Commencez par créer votre première unité</p>
                {isAdminUser && (
                  <Button 
                    onClick={() => {
                      setEditingUnit(null);
                      setFormData({
                        code: '',
                        name: '',
                        description: '',
                        parentId: null,
                        managerId: '',
                      });
                      setShowModal(true);
                    }}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-md hover:shadow-lg"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Créer la première unité
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {tree.map((unit) => renderUnit(unit))}
              </div>
            )}
          </div>
        </Card>

        {/* Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingUnit(null);
          }}
          title={editingUnit ? 'Modifier l\'unité' : 'Nouvelle unité organisationnelle'}
          description={editingUnit ? 'Modifiez les informations de l\'unité' : 'Créez une nouvelle unité organisationnelle'}
        >
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] bg-white space-y-6">
            <Input
              label="Code"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="DG"
            />
            <Input
              label="Nom"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Direction Générale"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 focus:outline-none focus:ring focus:ring-cyan-200  transition-colors text-gray-900"
                rows={4}
                placeholder="Description"
              />
            </div>
            <Select
              label="Unité parente"
              value={formData.parentId?.toString() || ''}
              onChange={(e: any) =>
                setFormData({
                  ...formData,
                  parentId: e.target.value && e.target.value !== '' ? parseInt(e.target.value, 10) : null,
                })
              }
              options={[
                { value: '', label: 'Aucune (Unité racine)' },
                ...allUnits
                  .filter((u) => !editingUnit || u.id !== editingUnit.id)
                  .map((unit) => ({
                    value: unit.id.toString(),
                    label: unit.name,
                  }))
              ]}
            />

            {isAdminUser && (
              <Select
                label="Manager (optionnel)"
                value={formData.managerId}
                onChange={(e: any) =>
                  setFormData({
                    ...formData,
                    managerId: e.target.value,
                  })
                }
                options={[
                  { value: '', label: 'Aucun manager' },
                  ...managerOptions,
                ]}
              />
            )}
            {isAdminUser && managerOptions.length === 0 && (
              <p className="text-xs text-slate-500 -mt-3">
                Aucun manager disponible. Assurez-vous d\'avoir des utilisateurs avec le rôle MANAGER.
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingUnit(null);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                {editingUnit ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}

