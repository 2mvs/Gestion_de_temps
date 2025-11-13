'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarRange,
  Clock,
  Filter,
  RefreshCw,
  Users,
} from 'lucide-react';

import Layout from '@/components/Layout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { isAuthenticated, getUser, isAdmin } from '@/lib/auth';
import { employeesAPI, overtimesAPI, specialHoursAPI } from '@/lib/api';
import { approvalStatusOptions } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';

interface EmployeeOption {
  value: string;
  label: string;
  unit?: string;
}

interface FilterState {
  employeeId: string;
  status: string;
  startDate: string;
  endDate: string;
}

export default function AdminHoursPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    employeeId: '',
    status: '',
    startDate: '',
    endDate: '',
  });
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [overtimes, setOvertimes] = useState<any[]>([]);
  const [specialHours, setSpecialHours] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    const storedUser = getUser();
    setCurrentUser(storedUser);

    if (!storedUser || !isAdmin(storedUser)) {
      router.push('/dashboard');
      return;
    }

    loadInitialData();
  }, [router]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [employeesRes] = await Promise.all([employeesAPI.getAll()]);
      const employeeOptions =
        employeesRes.data?.map((emp: any) => ({
          value: String(emp.id),
          label: `${emp.firstName} ${emp.lastName} (${emp.employeeNumber || '-'})`,
          unit: emp.organizationalUnit?.name,
        })) ?? [];
      setEmployees(employeeOptions);
      await loadHours(filters);
    } catch (error) {
      console.error('Erreur chargement heures admin:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHours = async (params: FilterState) => {
    try {
      setLoading(true);
      const query = {
        employeeId: params.employeeId || undefined,
        status: params.status || undefined,
        startDate: params.startDate || undefined,
        endDate: params.endDate || undefined,
      };

      const [overtimeRes, specialRes] = await Promise.all([
        overtimesAPI.getAll(query),
        specialHoursAPI.getAll(query),
      ]);

      setOvertimes(overtimeRes?.data ?? overtimeRes ?? []);
      setSpecialHours(specialRes?.data ?? specialRes ?? []);
    } catch (error) {
      console.error('Erreur chargement heures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    const nextFilters = { ...filters, [field]: value };
    setFilters(nextFilters);
  };

  const handleApplyFilters = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadHours(filters);
  };

  const handleResetFilters = async () => {
    const reset: FilterState = {
      employeeId: '',
      status: '',
      startDate: '',
      endDate: '',
    };
    setFilters(reset);
    await loadHours(reset);
  };

  const totalOvertimeHours = useMemo(
    () =>
      overtimes.reduce((sum, entry) => sum + (entry.hours || 0), 0),
    [overtimes]
  );

  const totalSpecialHours = useMemo(
    () =>
      specialHours.reduce((sum, entry) => sum + (entry.hours || 0), 0),
    [specialHours]
  );

  if (!currentUser || !isAdmin(currentUser)) {
    return null;
  }

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Heures supplémentaires & spéciales</h1>
            <p className="text-slate-600">
              Visualisez toutes les heures supplémentaires et spéciales enregistrées pour l&apos;organisation.
            </p>
          </div>
        </div>

        <Card className="shadow-soft">
          <form onSubmit={handleApplyFilters} className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <Select
                label="Employé"
                value={filters.employeeId}
                onChange={(e) => handleFilterChange('employeeId', e.target.value)}
                options={[
                  { value: '', label: 'Tous les employés' },
                  ...employees.map((emp) => ({
                    value: emp.value,
                    label: emp.unit ? `${emp.label} • ${emp.unit}` : emp.label,
                  })),
                ]}
              />
            </div>
            <div>
              <Select
                label="Statut"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                options={[
                  { value: '', label: 'Tous les statuts' },
                  ...approvalStatusOptions,
                ]}
              />
            </div>
            <div>
              <Input
                label="Début"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Fin"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div className="md:col-span-5 flex flex-wrap gap-3 justify-end pt-2 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={handleResetFilters}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Réinitialiser
              </Button>
              <Button
                type="submit"
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                <Filter className="w-4 h-4" />
                Appliquer
              </Button>
            </div>
          </form>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center justify-between shadow-soft">
            <div>
              <p className="text-sm font-semibold text-slate-600">Heures sup. totales</p>
              <p className="text-2xl font-bold text-cyan-700">{totalOvertimeHours.toFixed(2)} h</p>
            </div>
            <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </Card>
          <Card className="p-4 flex items-center justify-between shadow-soft">
            <div>
              <p className="text-sm font-semibold text-slate-600">Heures spéciales totales</p>
              <p className="text-2xl font-bold text-rose-600">{totalSpecialHours.toFixed(2)} h</p>
            </div>
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
              <CalendarRange className="w-6 h-6" />
            </div>
          </Card>
          <Card className="p-4 flex items-center justify-between shadow-soft">
            <div>
              <p className="text-sm font-semibold text-slate-600">Enregistrements</p>
              <p className="text-2xl font-bold text-slate-900">
                {overtimes.length + specialHours.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </Card>
        </div>

        <Card className="shadow-elevated overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-900">Heures supplémentaires</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Employé
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Heures
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Motif
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {overtimes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-sm text-slate-500">
                      Aucun enregistrement trouvé.
                    </td>
                  </tr>
                ) : (
                  overtimes.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                        {new Date(entry.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-900">
                          {entry.employee?.firstName} {entry.employee?.lastName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {entry.employee?.employeeNumber || '-'}
                          {entry.employee?.organizationalUnit?.name
                            ? ` • ${entry.employee.organizationalUnit.name}`
                            : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-cyan-700">
                        {entry.hours?.toFixed(2)} h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={
                            entry.status === 'APPROUVE'
                              ? 'success'
                              : entry.status === 'REJETE'
                              ? 'destructive'
                              : 'warning'
                          }
                          className="uppercase text-xs"
                        >
                          {approvalStatusOptions.find((opt) => opt.value === entry.status)?.label ||
                            entry.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {entry.reason || <span className="text-slate-400 italic">Non renseigné</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="shadow-elevated overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-900">Heures spéciales</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Employé
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Heures
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Motif
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {specialHours.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-sm text-slate-500">
                      Aucun enregistrement trouvé.
                    </td>
                  </tr>
                ) : (
                  specialHours.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                        {new Date(entry.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-900">
                          {entry.employee?.firstName} {entry.employee?.lastName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {entry.employee?.employeeNumber || '-'}
                          {entry.employee?.organizationalUnit?.name
                            ? ` • ${entry.employee.organizationalUnit.name}`
                            : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-rose-600">
                        {entry.hours?.toFixed(2)} h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                        {entry.hourType || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={
                            entry.status === 'APPROUVE'
                              ? 'success'
                              : entry.status === 'REJETE'
                              ? 'destructive'
                              : 'warning'
                          }
                          className="uppercase text-xs"
                        >
                          {approvalStatusOptions.find((opt) => opt.value === entry.status)?.label ||
                            entry.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {entry.reason || <span className="text-slate-400 italic">Non renseigné</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

