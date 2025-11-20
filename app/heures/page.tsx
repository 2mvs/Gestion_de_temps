'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarRange,
  Clock,
  Filter,
  RefreshCw,
  Users,
  Check,
  X,
  Eye,
  CheckCircle,
} from 'lucide-react';

import Layout from '@/components/Layout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { isAuthenticated, getUser, isAdmin } from '@/lib/auth';
import { employeesAPI, overtimesAPI, specialHoursAPI, timeEntriesAPI } from '@/lib/api';
import { approvalStatusOptions, APPROVAL_STATUS } from '@/lib/constants';
import { toast } from 'react-toastify';

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
  const [updatingOvertimeId, setUpdatingOvertimeId] = useState<number | null>(null);
  const [updatingSpecialHourId, setUpdatingSpecialHourId] = useState<number | null>(null);
  const [selectedOvertime, setSelectedOvertime] = useState<any | null>(null);
  const [selectedSpecialHour, setSelectedSpecialHour] = useState<any | null>(null);
  const [showOvertimeDetails, setShowOvertimeDetails] = useState(false);
  const [showSpecialHourDetails, setShowSpecialHourDetails] = useState(false);
  const [overtimeDayDetails, setOvertimeDayDetails] = useState<any | null>(null);
  const [specialHourDayDetails, setSpecialHourDayDetails] = useState<any | null>(null);
  const [loadingDayDetails, setLoadingDayDetails] = useState(false);

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

  const handleApproveOvertime = async (id: number) => {
    try {
      setUpdatingOvertimeId(id);
      await overtimesAPI.approve(id, APPROVAL_STATUS.APPROUVE.value);
      toast.success('Heures supplémentaires approuvées avec succès');
      await loadHours(filters);
    } catch (error: any) {
      console.error('Erreur approbation heures sup:', error);
      toast.error(error?.response?.data?.message || 'Erreur lors de l\'approbation');
    } finally {
      setUpdatingOvertimeId(null);
    }
  };

  const handleRejectOvertime = async (id: number) => {
    try {
      setUpdatingOvertimeId(id);
      await overtimesAPI.approve(id, APPROVAL_STATUS.REJETE.value);
      toast.success('Heures supplémentaires rejetées avec succès');
      await loadHours(filters);
    } catch (error: any) {
      console.error('Erreur rejet heures sup:', error);
      toast.error(error?.response?.data?.message || 'Erreur lors du rejet');
    } finally {
      setUpdatingOvertimeId(null);
    }
  };

  const handleApproveSpecialHour = async (id: number) => {
    try {
      setUpdatingSpecialHourId(id);
      await specialHoursAPI.approve(id, APPROVAL_STATUS.APPROUVE.value);
      toast.success('Heures spéciales approuvées avec succès');
      await loadHours(filters);
    } catch (error: any) {
      console.error('Erreur approbation heures spéciales:', error);
      toast.error(error?.response?.data?.message || 'Erreur lors de l\'approbation');
    } finally {
      setUpdatingSpecialHourId(null);
    }
  };

  const handleRejectSpecialHour = async (id: number) => {
    try {
      setUpdatingSpecialHourId(id);
      await specialHoursAPI.approve(id, APPROVAL_STATUS.REJETE.value);
      toast.success('Heures spéciales rejetées avec succès');
      await loadHours(filters);
    } catch (error: any) {
      console.error('Erreur rejet heures spéciales:', error);
      toast.error(error?.response?.data?.message || 'Erreur lors du rejet');
    } finally {
      setUpdatingSpecialHourId(null);
    }
  };

  const openOvertimeDetails = async (entry: any) => {
    setSelectedOvertime(entry);
    setShowOvertimeDetails(true);
    setLoadingDayDetails(true);
    setOvertimeDayDetails(null);

    try {
      // Récupérer le pointage de la journée
      // Créer une date au début et à la fin de la journée pour couvrir toute la journée
      const entryDate = new Date(entry.date);
      const startOfDay = new Date(entryDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(entryDate);
      endOfDay.setHours(23, 59, 59, 999);

      const startDateStr = startOfDay.toISOString().split('T')[0];
      const endDateStr = endOfDay.toISOString().split('T')[0];

      const timeEntriesResponse = await timeEntriesAPI.getByEmployee(
        entry.employeeId,
        startDateStr,
        endDateStr,
        true // includeCalculations
      );

      // Normaliser la réponse (peut être data ou directement un tableau)
      const timeEntries = timeEntriesResponse?.data || timeEntriesResponse || [];
      const entriesArray = Array.isArray(timeEntries) ? timeEntries : [];

      // Trouver le pointage pour cette date exacte
      // Normaliser la date d'entrée (ignorer l'heure)
      const targetDate = new Date(entryDate);
      targetDate.setHours(0, 0, 0, 0);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      console.log('Recherche pointage pour:', {
        entryDate: entry.date,
        targetDateStr,
        employeeId: entry.employeeId,
        entriesCount: entriesArray.length,
      });

      const dayEntry = entriesArray.find((te: any) => {
        if (!te.date) return false;
        const teDate = new Date(te.date);
        teDate.setHours(0, 0, 0, 0);
        const teDateStr = teDate.toISOString().split('T')[0];
        return teDateStr === targetDateStr;
      });

      if (dayEntry) {
        console.log('Pointage trouvé:', dayEntry);
        setOvertimeDayDetails(dayEntry);
      } else {
        console.warn('Aucun pointage trouvé pour la date:', targetDateStr, 'Employé:', entry.employeeId);
        console.log('Pointages disponibles:', entriesArray.map((te: any) => {
          if (!te.date) return { date: null, dateStr: null };
          const teDate = new Date(te.date);
          teDate.setHours(0, 0, 0, 0);
          return {
            id: te.id,
            date: te.date,
            dateStr: teDate.toISOString().split('T')[0],
            clockIn: te.clockIn,
            clockOut: te.clockOut,
          };
        }));
      }
    } catch (error: any) {
      console.error('Erreur chargement détails journée:', error);
      toast.error('Erreur lors du chargement des détails du pointage');
    } finally {
      setLoadingDayDetails(false);
    }
  };

  const closeOvertimeDetails = () => {
    setShowOvertimeDetails(false);
    setSelectedOvertime(null);
    setOvertimeDayDetails(null);
  };

  const openSpecialHourDetails = async (entry: any) => {
    setSelectedSpecialHour(entry);
    setShowSpecialHourDetails(true);
    setLoadingDayDetails(true);
    setSpecialHourDayDetails(null);

    try {
      // Récupérer le pointage de la journée
      // Créer une date au début et à la fin de la journée pour couvrir toute la journée
      const entryDate = new Date(entry.date);
      const startOfDay = new Date(entryDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(entryDate);
      endOfDay.setHours(23, 59, 59, 999);

      const startDateStr = startOfDay.toISOString().split('T')[0];
      const endDateStr = endOfDay.toISOString().split('T')[0];

      const timeEntriesResponse = await timeEntriesAPI.getByEmployee(
        entry.employeeId,
        startDateStr,
        endDateStr,
        true // includeCalculations
      );

      // Normaliser la réponse (peut être data ou directement un tableau)
      const timeEntries = timeEntriesResponse?.data || timeEntriesResponse || [];
      const entriesArray = Array.isArray(timeEntries) ? timeEntries : [];

      // Trouver le pointage pour cette date exacte
      // Normaliser la date d'entrée (ignorer l'heure)
      const targetDate = new Date(entryDate);
      targetDate.setHours(0, 0, 0, 0);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      console.log('Recherche pointage pour:', {
        entryDate: entry.date,
        targetDateStr,
        employeeId: entry.employeeId,
        entriesCount: entriesArray.length,
      });

      const dayEntry = entriesArray.find((te: any) => {
        if (!te.date) return false;
        const teDate = new Date(te.date);
        teDate.setHours(0, 0, 0, 0);
        const teDateStr = teDate.toISOString().split('T')[0];
        return teDateStr === targetDateStr;
      });

      if (dayEntry) {
        console.log('Pointage trouvé:', dayEntry);
        setSpecialHourDayDetails(dayEntry);
      } else {
        console.warn('Aucun pointage trouvé pour la date:', targetDateStr, 'Employé:', entry.employeeId);
        console.log('Pointages disponibles:', entriesArray.map((te: any) => {
          if (!te.date) return { date: null, dateStr: null };
          const teDate = new Date(te.date);
          teDate.setHours(0, 0, 0, 0);
          return {
            id: te.id,
            date: te.date,
            dateStr: teDate.toISOString().split('T')[0],
            clockIn: te.clockIn,
            clockOut: te.clockOut,
          };
        }));
      }
    } catch (error: any) {
      console.error('Erreur chargement détails journée:', error);
      toast.error('Erreur lors du chargement des détails du pointage');
    } finally {
      setLoadingDayDetails(false);
    }
  };

  const closeSpecialHourDetails = () => {
    setShowSpecialHourDetails(false);
    setSelectedSpecialHour(null);
    setSpecialHourDayDetails(null);
  };

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
                    Actions
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openOvertimeDetails(entry)}
                            className="bg-gray-100 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {entry.status !== 'APPROUVE' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveOvertime(entry.id)}
                              disabled={updatingOvertimeId === entry.id}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Approuver"
                            >
                              {updatingOvertimeId === entry.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          {entry.status !== 'REJETE' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRejectOvertime(entry.id)}
                              disabled={updatingOvertimeId === entry.id}
                              className="bg-red-50 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Rejeter"
                            >
                              {updatingOvertimeId === entry.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
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
                    Actions
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openSpecialHourDetails(entry)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {entry.status !== 'APPROUVE' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveSpecialHour(entry.id)}
                              disabled={updatingSpecialHourId === entry.id}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Approuver"
                            >
                              {updatingSpecialHourId === entry.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          {entry.status !== 'REJETE' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRejectSpecialHour(entry.id)}
                              disabled={updatingSpecialHourId === entry.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Rejeter"
                            >
                              {updatingSpecialHourId === entry.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Modal Détails Heures Supplémentaires */}
        {selectedOvertime && (
          <Modal
            isOpen={showOvertimeDetails}
            onClose={closeOvertimeDetails}
            title="Détails des heures supplémentaires"
            description={`Enregistré le ${new Date(selectedOvertime.date).toLocaleDateString('fr-FR')}`}
            size="md"
          >
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs uppercase text-slate-500 font-semibold">Employé</p>
                  <p className="text-sm text-slate-800 font-medium">
                    {selectedOvertime.employee
                      ? `${selectedOvertime.employee.firstName} ${selectedOvertime.employee.lastName}`
                      : '-'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Matricule&nbsp;: {selectedOvertime.employee?.employeeNumber || '-'}
                  </p>
                  {selectedOvertime.employee?.organizationalUnit?.name && (
                    <p className="text-xs text-slate-500">
                      Unité&nbsp;: {selectedOvertime.employee.organizationalUnit.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase text-slate-500 font-semibold">Date</p>
                  <p className="text-sm text-slate-800 font-medium">
                    {new Date(selectedOvertime.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase text-slate-500 font-semibold">Heures</p>
                  <p className="text-2xl font-bold text-cyan-700">
                    {selectedOvertime.hours?.toFixed(2) || '0.00'} h
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase text-slate-500 font-semibold">Statut</p>
                  <Badge
                    variant={
                      selectedOvertime.status === 'APPROUVE'
                        ? 'success'
                        : selectedOvertime.status === 'REJETE'
                        ? 'destructive'
                        : 'warning'
                    }
                    className="uppercase text-xs"
                  >
                    {approvalStatusOptions.find((opt) => opt.value === selectedOvertime.status)?.label ||
                      selectedOvertime.status}
                  </Badge>
                  {selectedOvertime.approvedAt && (
                    <p className="text-xs text-slate-500">
                      Approuvé le&nbsp;:{' '}
                      {new Date(selectedOvertime.approvedAt).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </div>
              {/* Détails des heures de la journée */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <p className="text-xs uppercase text-slate-500 font-semibold">Récapitulatif des heures de la journée</p>
                {loadingDayDetails ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                    <span className="ml-2 text-sm text-slate-500">Chargement des détails...</span>
                  </div>
                ) : overtimeDayDetails && overtimeDayDetails.calculatedHours ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-slate-500 mb-1">Heures totales</p>
                      <p className="text-xl font-bold text-slate-900">
                        {(
                          (overtimeDayDetails.calculatedHours.normalHours || 0) +
                          (overtimeDayDetails.calculatedHours.overtimeHours || 0) +
                          (overtimeDayDetails.calculatedHours.specialHours || 0)
                        ).toFixed(2)} h
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500 mb-1">Heures normales</p>
                      <p className="text-xl font-bold text-blue-600">
                        {(overtimeDayDetails.calculatedHours.normalHours || 0).toFixed(2)} h
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500 mb-1">Heures supplémentaires</p>
                      <p className="text-xl font-bold text-cyan-700">
                        {(overtimeDayDetails.calculatedHours.overtimeHours || 0).toFixed(2)} h
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      Aucun pointage trouvé pour cette journée ou les calculs ne sont pas disponibles.
                    </p>
                  </div>
                )}
                {overtimeDayDetails && overtimeDayDetails.clockIn && overtimeDayDetails.clockOut && (
                  <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Heure d'entrée</p>
                      <p className="font-medium text-slate-800">
                        {new Date(overtimeDayDetails.clockIn).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Heure de sortie</p>
                      <p className="font-medium text-slate-800">
                        {new Date(overtimeDayDetails.clockOut).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div className="space-y-2">
                  <p className="text-xs uppercase text-slate-500 font-semibold">Date de création</p>
                  <p className="text-sm text-slate-700">
                    {selectedOvertime.createdAt
                      ? new Date(selectedOvertime.createdAt).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </p>
                </div>
                {selectedOvertime.updatedAt && selectedOvertime.updatedAt !== selectedOvertime.createdAt && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase text-slate-500 font-semibold">Dernière modification</p>
                    <p className="text-sm text-slate-700">
                      {new Date(selectedOvertime.updatedAt).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}

        {/* Modal Détails Heures Spéciales */}
        {selectedSpecialHour && (
          <Modal
            isOpen={showSpecialHourDetails}
            onClose={closeSpecialHourDetails}
            title="Détails des heures spéciales"
            description={`Enregistré le ${new Date(selectedSpecialHour.date).toLocaleDateString('fr-FR')}`}
            size="md"
          >
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs uppercase text-slate-500 font-semibold">Employé</p>
                  <p className="text-sm text-slate-800 font-medium">
                    {selectedSpecialHour.employee
                      ? `${selectedSpecialHour.employee.firstName} ${selectedSpecialHour.employee.lastName}`
                      : '-'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Matricule&nbsp;: {selectedSpecialHour.employee?.employeeNumber || '-'}
                  </p>
                  {selectedSpecialHour.employee?.organizationalUnit?.name && (
                    <p className="text-xs text-slate-500">
                      Unité&nbsp;: {selectedSpecialHour.employee.organizationalUnit.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase text-slate-500 font-semibold">Date</p>
                  <p className="text-sm text-slate-800 font-medium">
                    {new Date(selectedSpecialHour.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase text-slate-500 font-semibold">Heures</p>
                  <p className="text-2xl font-bold text-rose-600">
                    {selectedSpecialHour.hours?.toFixed(2) || '0.00'} h
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase text-slate-500 font-semibold">Type</p>
                  <p className="text-sm text-slate-800 font-medium">
                    {selectedSpecialHour.hourType || '-'}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase text-slate-500 font-semibold">Statut</p>
                  <Badge
                    variant={
                      selectedSpecialHour.status === 'APPROUVE'
                        ? 'success'
                        : selectedSpecialHour.status === 'REJETE'
                        ? 'destructive'
                        : 'warning'
                    }
                    className="uppercase text-xs"
                  >
                    {approvalStatusOptions.find((opt) => opt.value === selectedSpecialHour.status)?.label ||
                      selectedSpecialHour.status}
                  </Badge>
                  {selectedSpecialHour.approvedAt && (
                    <p className="text-xs text-slate-500">
                      Approuvé le&nbsp;:{' '}
                      {new Date(selectedSpecialHour.approvedAt).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </div>
              {/* Détails des heures de la journée */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <p className="text-xs uppercase text-slate-500 font-semibold">Récapitulatif des heures de la journée</p>
                {loadingDayDetails ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                    <span className="ml-2 text-sm text-slate-500">Chargement des détails...</span>
                  </div>
                ) : specialHourDayDetails && specialHourDayDetails.calculatedHours ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-slate-500 mb-1">Heures totales</p>
                      <p className="text-xl font-bold text-slate-900">
                        {(
                          (specialHourDayDetails.calculatedHours.normalHours || 0) +
                          (specialHourDayDetails.calculatedHours.overtimeHours || 0) +
                          (specialHourDayDetails.calculatedHours.specialHours || 0)
                        ).toFixed(2)} h
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500 mb-1">Heures normales</p>
                      <p className="text-xl font-bold text-blue-600">
                        {(specialHourDayDetails.calculatedHours.normalHours || 0).toFixed(2)} h
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500 mb-1">Heures spéciales</p>
                      <p className="text-xl font-bold text-rose-600">
                        {(specialHourDayDetails.calculatedHours.specialHours || 0).toFixed(2)} h
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      Aucun pointage trouvé pour cette journée ou les calculs ne sont pas disponibles.
                    </p>
                  </div>
                )}
                {specialHourDayDetails && specialHourDayDetails.clockIn && specialHourDayDetails.clockOut && (
                  <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Heure d'entrée</p>
                      <p className="font-medium text-slate-800">
                        {new Date(specialHourDayDetails.clockIn).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Heure de sortie</p>
                      <p className="font-medium text-slate-800">
                        {new Date(specialHourDayDetails.clockOut).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div className="space-y-2">
                  <p className="text-xs uppercase text-slate-500 font-semibold">Date de création</p>
                  <p className="text-sm text-slate-700">
                    {selectedSpecialHour.createdAt
                      ? new Date(selectedSpecialHour.createdAt).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </p>
                </div>
                {selectedSpecialHour.updatedAt && selectedSpecialHour.updatedAt !== selectedSpecialHour.createdAt && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase text-slate-500 font-semibold">Dernière modification</p>
                    <p className="text-sm text-slate-700">
                      {new Date(selectedSpecialHour.updatedAt).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
}

