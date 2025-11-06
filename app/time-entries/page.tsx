'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, LogOut, Calendar, Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import Layout from '@/components/Layout';
import { isAuthenticated } from '@/lib/auth';
import { timeEntriesAPI, employeesAPI } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SelectSearch from '@/components/ui/SelectSearch';
import Badge from '@/components/ui/Badge';

export default function TimeEntriesPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadEmployees();
  }, [router]);

  useEffect(() => {
    if (selectedEmployee) {
      loadEntries();
    }
  }, [selectedEmployee]);

  const loadEmployees = async () => {
    try {
      const response = await employeesAPI.getAll();
      setEmployees(response.data || []);
      if (response.data?.length > 0) {
        setSelectedEmployee(response.data[0].id);
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

  const handleClockIn = async () => {
    if (!selectedEmployee) return;
    setActionLoading(true);
    try {
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

        {/* Actions */}
        <Card className="mb-6 shadow-soft">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1 w-full sm:w-auto">
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
              </div>
              <div className="flex items-center gap-3 mt-4 sm:mt-7">
                <Button
                  onClick={handleClockIn}
                  disabled={actionLoading || !selectedEmployee}
                  size="sm"
                  className="bg-green-100 hover:bg-green-200 text-green-500 shadow-sm hover:shadow-sm transition-all"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Entrée
                </Button>
                <Button
                  onClick={handleClockOut}
                  disabled={actionLoading || !selectedEmployee}
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
                          entry.status === 'COMPLETED'
                            ? 'success'
                            : entry.status === 'PENDING'
                            ? 'warning'
                            : 'secondary'
                        }
                        className="shadow-sm"
                      >
                        {entry.status}
                      </Badge>
                    </td>
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
      </div>
    </Layout>
  );
}
