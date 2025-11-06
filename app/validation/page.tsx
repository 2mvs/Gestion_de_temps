'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Users,
  Search,
  Filter,
  RefreshCw,
  Download,
  Settings
} from 'lucide-react';
import Layout from '@/components/Layout';
import { isAuthenticated } from '@/lib/auth';
import { timeEntriesAPI, employeesAPI } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';

interface ValidationReport {
  timeEntryId: number;
  employeeId: number;
  employeeName: string;
  date: string;
  results: ValidationResult[];
  overallStatus: 'VALID' | 'WARNING' | 'INVALID';
  canAutoCorrect: boolean;
}

interface ValidationResult {
  isValid: boolean;
  ruleId: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suggestion?: string;
}

interface ValidationStats {
  totalEntries: number;
  validEntries: number;
  warningEntries: number;
  invalidEntries: number;
  mostCommonIssues: Array<{
    ruleId: string;
    count: number;
    ruleName: string;
  }>;
}

export default function ValidationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // 30 derniers jours par défaut
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [validationReports, setValidationReports] = useState<ValidationReport[]>([]);
  const [validationStats, setValidationStats] = useState<ValidationStats | null>(null);
  const [validating, setValidating] = useState(false);
  const [autoCorrecting, setAutoCorrecting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadEmployees();
  }, [router]);

  const loadEmployees = async () => {
    try {
      const response = await employeesAPI.getAll();
      setEmployees(response.data || []);
    } catch (error) {
      console.error('Erreur chargement employés:', error);
    } finally {
      setLoading(false);
    }
  };

  const runValidation = async () => {
    if (!selectedEmployee) return;

    setValidating(true);
    try {
      const response = await timeEntriesAPI.validatePeriod(
        selectedEmployee,
        startDate,
        endDate,
        false // Ne pas auto-corriger pour l'instant
      );

      setValidationReports(response.data.validationReports || []);
      setValidationStats(response.data.statistics);
    } catch (error) {
      console.error('Erreur validation:', error);
      alert('Erreur lors de la validation');
    } finally {
      setValidating(false);
    }
  };

  const runAutoCorrection = async () => {
    if (!selectedEmployee) return;

    setAutoCorrecting(true);
    try {
      const response = await timeEntriesAPI.validatePeriod(
        selectedEmployee,
        startDate,
        endDate,
        true // Auto-corriger
      );

      setValidationReports(response.data.validationReports || []);
      setValidationStats(response.data.statistics);

      alert(`${response.data.correctionsApplied} corrections appliquées automatiquement`);
    } catch (error) {
      console.error('Erreur auto-correction:', error);
      alert('Erreur lors de l\'auto-correction');
    } finally {
      setAutoCorrecting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VALID':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'INVALID':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VALID':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'INVALID':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-600';
      case 'HIGH':
        return 'text-orange-600';
      case 'MEDIUM':
        return 'text-yellow-600';
      case 'LOW':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Validation des Pointages</h1>
          <p className="text-gray-600">Vérifiez et corrigez automatiquement les pointages selon les règles métier</p>
        </div>

        {/* Filtres */}
        <Card className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employé
              </label>
              <select
                value={selectedEmployee || ''}
                onChange={(e) => setSelectedEmployee(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner un employé</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} (#{employee.employeeNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date début
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                onClick={runValidation}
                disabled={!selectedEmployee || validating}
                className="flex-1"
              >
                {validating ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Valider
              </Button>

              <Button
                onClick={runAutoCorrection}
                disabled={!selectedEmployee || autoCorrecting}
                variant="secondary"
              >
                {autoCorrecting ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Settings className="w-4 h-4 mr-2" />
                )}
                Auto-corriger
              </Button>
            </div>
          </div>
        </Card>

        {/* Statistiques */}
        {validationStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Pointages</p>
                  <p className="text-2xl font-bold text-gray-900">{validationStats.totalEntries}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Valides</p>
                  <p className="text-2xl font-bold text-green-600">{validationStats.validEntries}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avertissements</p>
                  <p className="text-2xl font-bold text-yellow-600">{validationStats.warningEntries}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Invalides</p>
                  <p className="text-2xl font-bold text-red-600">{validationStats.invalidEntries}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </Card>
          </div>
        )}

        {/* Problèmes les plus courants */}
        {validationStats && validationStats.mostCommonIssues.length > 0 && (
          <Card className="mb-8">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Problèmes les plus courants</h3>
            </div>
            <div className="space-y-3">
              {validationStats.mostCommonIssues.map((issue, index) => (
                <div key={issue.ruleId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-red-600">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{issue.ruleName}</p>
                      <p className="text-xs text-gray-500">{issue.count} occurrence(s)</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Rapports de validation détaillés */}
        {validationReports.length > 0 && (
          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Rapports de Validation Détaillés</h3>
            </div>
            <div className="space-y-4">
              {validationReports.map((report) => (
                <div key={report.timeEntryId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(report.overallStatus)}
                      <div>
                        <p className="font-medium text-gray-900">
                          {report.employeeName} - {new Date(report.date).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-sm text-gray-500">Pointage #{report.timeEntryId}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(report.overallStatus)}>
                      {report.overallStatus}
                    </Badge>
                  </div>

                  {report.results.filter(r => !r.isValid).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Problèmes détectés:</p>
                      {report.results.filter(r => !r.isValid).map((result, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <span className={`font-medium ${getSeverityColor(result.severity)}`}>
                            •
                          </span>
                          <div className="flex-1">
                            <span className="text-gray-900">{result.message}</span>
                            {result.suggestion && (
                              <p className="text-gray-600 mt-1">{result.suggestion}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {report.canAutoCorrect && (
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm text-blue-800">
                        ✅ Corrections automatiques disponibles
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {validationReports.length === 0 && selectedEmployee && (
          <Card>
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun pointage trouvé</h3>
              <p className="text-gray-600">
                Aucun pointage n'a été trouvé pour cet employé sur la période sélectionnée.
              </p>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
