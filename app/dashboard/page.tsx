'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  User,
  UserRound,
  Calendar,
  BarChart3,
  Activity,
  Target,
  AlertTriangle,
  DollarSign,
  UserCheck
} from 'lucide-react';
import Layout from '@/components/Layout';
import ManagerDashboard from '@/components/ManagerDashboard';
import { getUser, isAuthenticated, isBasicUser, isManager } from '@/lib/auth';
import {
  employeesAPI,
  absencesAPI,
  reportsAPI,
  timeEntriesAPI,
  auditLogsAPI,
  overtimesAPI,
} from '@/lib/api';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

const ACTION_TRANSLATIONS: Record<string, string> = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  LOGIN: 'Connexion',
  LOGOUT: 'Déconnexion',
  APPROVE: 'Approbation',
  REJECT: 'Rejet',
  VALIDATE: 'Validation',
};

const MODEL_TRANSLATIONS: Record<string, string> = {
  Employee: 'Employé',
  TimeEntry: 'Pointage',
  Absence: 'Absence',
  WorkCycle: 'Cycle de travail',
  WorkSchedule: 'Horaire',
  OrganizationalUnit: 'Unité organisationnelle',
  AuditLog: 'Journal',
  User: 'Utilisateur',
};

const translateAction = (action?: string) => {
  if (!action) return 'Action inconnue';
  const key = action.toUpperCase();
  return ACTION_TRANSLATIONS[key] || action;
};

const translateModel = (model?: string) => {
  if (!model) return 'Modèle inconnu';
  return MODEL_TRANSLATIONS[model] || model;
};

const normalizeStatus = (value?: string | null) => (value || '').toString().toUpperCase();

const isTimeEntryCompleted = (status: any) => ['TERMINE', 'COMPLETED'].includes(normalizeStatus(status));
const isAbsencePending = (status: any) => ['EN_ATTENTE', 'PENDING'].includes(normalizeStatus(status));
const isAbsenceApproved = (status: any) => ['APPROUVE', 'APPROVED'].includes(normalizeStatus(status));
const isAbsenceRejected = (status: any) => ['REJETE', 'REJECTED'].includes(normalizeStatus(status));
const isMale = (gender: any) => ['HOMME', 'MALE'].includes(normalizeStatus(gender));
const isFemale = (gender: any) => ['FEMME', 'FEMALE'].includes(normalizeStatus(gender));
const isEmployeeActive = (status: any) => ['ACTIF', 'ACTIVE'].includes(normalizeStatus(status));

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    // Statistiques générales
    totalEmployees: 0,
    activeEmployees: 0,
    totalTimeEntries: 0,
    totalAbsences: 0,
    totalOvertime: 0,
    averageHoursPerDay: 0,
    totalWorkedHours: 0,
    totalTheoreticalHours: 0,
    efficiencyRate: 0,

    // Statistiques démographiques
    maleCount: 0,
    femaleCount: 0,
    pendingAbsences: 0,

    // Statistiques avancées
    topEmployees: [] as any[],
    monthlyTrends: [] as any[],
    alerts: [] as any[]
  });
  const [loading, setLoading] = useState(true);
  const AUDIT_PAGE_SIZE = 7;
  const [userStats, setUserStats] = useState({
    totalHours: 0,
    totalAbsenceDays: 0,
    totalPresenceDays: 0,
    totalPointages: 0,
    pendingAbsences: 0,
    approvedAbsences: 0,
  });
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [recentAbsences, setRecentAbsences] = useState<any[]>([]);
  const [userError, setUserError] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditPage, setAuditPage] = useState(0);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);

  const formatDate = (value?: string) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (value?: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
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

  const getStatusBadgeVariant = (status: string) => {
    const normalized = normalizeStatus(status);
    switch (normalized) {
      case 'TERMINE':
      case 'APPROUVE':
        return 'success';
      case 'EN_ATTENTE':
        return 'warning';
      case 'REJETE':
        return 'error';
      default:
        return 'secondary';
    }
  };

  useEffect(() => {
    // lecture du user stocké côté client (localStorage)
    try {
      const u = getUser();
      setUser(u);
    } catch (e) {
      console.error('Erreur récupération user :', e);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  const loadAuditLogs = async (page: number) => {
    setAuditLoading(true);
    try {
      const offset = page * AUDIT_PAGE_SIZE;
      const response = await auditLogsAPI.getAll({
        limit: AUDIT_PAGE_SIZE + 1,
        offset,
      });
      const data = response?.data ?? response ?? [];
      setAuditLogs(data.slice(0, AUDIT_PAGE_SIZE));
      setAuditHasMore(data.length > AUDIT_PAGE_SIZE);
      setAuditPage(page);
    } catch (error) {
      console.error('Erreur lors du chargement des actions :', error);
      setAuditLogs([]);
      setAuditHasMore(false);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    if (isBasicUser(user)) {
      loadUserDashboard(user);
      return;
    }

    if (isManager(user)) {
      setLoading(false);
      return;
    }

    loadStats();
    loadAuditLogs(0);
  }, [user]);

  // Si l'utilisateur est manager, afficher la vue manager
  if (user && isManager(user)) {
    return <ManagerDashboard />;
  }

  async function loadUserDashboard(currentUser: any) {
    if (!currentUser?.employee?.id) {
      setUserError("Aucun profil employé associé. Contactez votre administrateur.");
      setRecentEntries([]);
      setRecentAbsences([]);
      setUserStats({
        totalHours: 0,
        totalAbsenceDays: 0,
        totalPresenceDays: 0,
        totalPointages: 0,
        pendingAbsences: 0,
        approvedAbsences: 0,
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setUserError(null);
    try {
      const employeeId = currentUser.employee.id;
      const [entriesResponse, absencesResponse] = await Promise.all([
        timeEntriesAPI.getByEmployee(employeeId),
        absencesAPI.getByEmployee(employeeId),
      ]);

      const entriesData = entriesResponse?.data ?? entriesResponse ?? [];
      const absencesData = absencesResponse?.data ?? absencesResponse ?? [];

      const completedEntries = entriesData.filter((entry: any) => isTimeEntryCompleted(entry.status));
      const totalHours = completedEntries.reduce(
        (sum: number, entry: any) => sum + (entry.totalHours || 0),
        0
      );

      const relevantAbsences = absencesData.filter((absence: any) => !isAbsenceRejected(absence.status));
      const totalAbsenceDays = relevantAbsences.reduce(
        (sum: number, absence: any) => sum + (absence.days || 0),
        0
      );
      const pendingAbsences = absencesData.filter((absence: any) => isAbsencePending(absence.status)).length;
      const approvedAbsences = absencesData.filter((absence: any) => isAbsenceApproved(absence.status)).length;

      setUserStats({
        totalHours: Math.round(totalHours * 100) / 100,
        totalAbsenceDays: Math.round(totalAbsenceDays * 100) / 100,
        totalPresenceDays: completedEntries.length,
        totalPointages: entriesData.length,
        pendingAbsences,
        approvedAbsences,
      });

      const sortedEntries = [...entriesData].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const sortedAbsences = [...absencesData].sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );

      setRecentEntries(sortedEntries.slice(0, 5));
      setRecentAbsences(sortedAbsences.slice(0, 5));
    } catch (error) {
      console.error('Erreur chargement dashboard utilisateur :', error);
      setUserError("Impossible de charger vos statistiques personnelles.");
      setRecentEntries([]);
      setRecentAbsences([]);
      setUserStats({
        totalHours: 0,
        totalAbsenceDays: 0,
        totalPresenceDays: 0,
        totalPointages: 0,
        pendingAbsences: 0,
        approvedAbsences: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    setLoading(true);
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonthIndex = now.getMonth();
      const currentMonthNumber = currentMonthIndex + 1;
      const monthStart = new Date(currentYear, currentMonthIndex, 1);
      const monthEnd = new Date(currentYear, currentMonthNumber, 0, 23, 59, 59, 999);
      const monthStartISO = monthStart.toISOString();
      const monthEndISO = monthEnd.toISOString();

      const trendMonths = Array.from({ length: 6 }).map((_, idx) => {
        const date = new Date(currentYear, currentMonthIndex - (5 - idx), 1);
        return {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          label: `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`,
        };
      });

      const trendPromises = trendMonths.map(({ year, month }) =>
        reportsAPI
          .getMonthly({ year, month })
          .then((res) => {
            const data = res?.data ?? {};
            return {
              year,
              month,
              summary: data.summary || {
                totalTimeEntries: 0,
                totalHours: 0,
                totalAbsences: 0,
                totalAbsenceDays: 0,
              },
              timeEntries: data.timeEntries || [],
              absences: data.absences || [],
            };
          })
          .catch(() => ({
            year,
            month,
            summary: {
              totalTimeEntries: 0,
              totalHours: 0,
              totalAbsences: 0,
              totalAbsenceDays: 0,
            },
            timeEntries: [],
            absences: [],
          }))
      );

      const [
        employeesRes,
        absencesRes,
        overtimeRes,
        monthlyTrendResults,
      ] = await Promise.all([
        employeesAPI.getAll(),
        absencesAPI.getAll(),
        overtimesAPI.getAll({ startDate: monthStartISO, endDate: monthEndISO }),
        Promise.all(trendPromises),
      ]);
      const employees = employeesRes?.data || employeesRes || [];
      const absences = absencesRes?.data || absencesRes || [];
      const overtimeEntries = overtimeRes?.data || overtimeRes || [];
      const monthlyTrendData = monthlyTrendResults || [];
      const currentMonthlyData =
        monthlyTrendData[monthlyTrendData.length - 1] || {
          summary: {
            totalTimeEntries: 0,
            totalHours: 0,
            totalAbsences: 0,
            totalAbsenceDays: 0,
          },
          timeEntries: [],
          absences: [],
        };

      const currentSummary = currentMonthlyData.summary;
      const maleCount = employees.filter((e: any) => isMale(e.gender)).length;
      const femaleCount = employees.filter((e: any) => isFemale(e.gender)).length;
      const activeEmployees = employees.filter((e: any) => isEmployeeActive(e.status)).length;

      const daysInMonth = new Date(currentYear, currentMonthNumber, 0).getDate();
      const theoreticalHours = employees.reduce((sum: number, emp: any) => {
        const hoursPerDay = emp.workCycle?.schedule?.theoreticalDayHours ?? 8;
        return sum + (hoursPerDay || 0) * daysInMonth;
      }, 0);

      const totalOvertimeHours = overtimeEntries.reduce(
        (sum: number, entry: any) => sum + (entry.hours || 0),
        0
      );

      const employeeHoursMap = new Map<number, {
        employeeId: number;
        employeeNumber: string;
        firstName: string;
        lastName: string;
        totalWorkedHours: number;
        expectedHours: number;
      }>();

      currentMonthlyData.timeEntries.forEach((entry: any) => {
        const hours = entry.totalHours || 0;
        const employee = entry.employee;
        if (!employee) return;
        const existing = employeeHoursMap.get(employee.id) || {
          employeeId: employee.id,
          employeeNumber: employee.employeeNumber || '-',
          firstName: employee.firstName || '',
          lastName: employee.lastName || '',
          totalWorkedHours: 0,
          expectedHours:
            ((employees.find((e: any) => e.id === employee.id)?.workCycle?.schedule?.theoreticalDayHours) ?? 8) *
            daysInMonth,
        };
        existing.totalWorkedHours += hours;
        employeeHoursMap.set(employee.id, existing);
      });

      const topEmployees = Array.from(employeeHoursMap.values())
        .map((emp) => {
          const efficiency =
            emp.expectedHours > 0 ? (emp.totalWorkedHours / emp.expectedHours) * 100 : 0;
          return {
            ...emp,
            totalWorkedHours: Math.round(emp.totalWorkedHours * 100) / 100,
            efficiencyRate: Math.min(150, Math.max(0, efficiency)),
          };
        })
        .sort((a, b) => b.totalWorkedHours - a.totalWorkedHours)
        .slice(0, 5);

      const monthlyTrends = monthlyTrendData.map((item, index) => ({
        label: trendMonths[index]?.label ?? `${String(item.month).padStart(2, '0')}/${item.year}`,
        totalWorkedHours: item.summary.totalHours || 0,
        totalTimeEntries: item.summary.totalTimeEntries || 0,
      }));

      const efficiencyRate =
        theoreticalHours > 0
          ? Math.min(150, Math.max(0, (currentSummary.totalHours / theoreticalHours) * 100))
          : 0;

      const alerts = generateAlerts(employees, absences, overtimeEntries);

      setStats({
        totalEmployees: employees.length,
        activeEmployees,
        totalTimeEntries: currentSummary.totalTimeEntries || 0,
        totalAbsences: absences.length,
        totalOvertime: Math.round(totalOvertimeHours * 100) / 100,
        averageHoursPerDay:
          currentSummary.totalTimeEntries > 0
            ? currentSummary.totalHours / currentSummary.totalTimeEntries
            : 0,
        totalWorkedHours: currentSummary.totalHours || 0,
        totalTheoreticalHours: theoreticalHours,
        efficiencyRate,
        maleCount,
        femaleCount,
        pendingAbsences: absences.filter((a: any) => isAbsencePending(a.status)).length,
        topEmployees,
        monthlyTrends,
        alerts,
      });
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
    } finally {
      setLoading(false);
    }
  }

  // Génère des alertes basées sur les métriques
  function generateAlerts(
    employees: any[],
    absences: any[],
    overtimeEntries: any[]
  ) {
    const alerts = [];

    // Alerte si beaucoup d'absences en attente
    const pendingAbsences = absences.filter((a: any) => isAbsencePending(a.status)).length;
    if (pendingAbsences > 0) {
      alerts.push({
        type: 'info',
        message: `${pendingAbsences} absence${pendingAbsences > 1 ? 's' : ''} en attente d'approbation`,
        icon: Clock
      });
    }

    // Alerte si beaucoup d'employés
    if (employees.length > 20) {
      alerts.push({
        type: 'info',
        message: `${employees.length} employés dans le système`,
        icon: Users
      });
    }

    // Alerte si heures sup en attente
    const pendingOvertimes = overtimeEntries.filter(
      (ot: any) => normalizeStatus(ot.status) === 'EN_ATTENTE'
    ).length;
    if (pendingOvertimes > 0) {
      alerts.push({
        type: 'warning',
        message: `${pendingOvertimes} demande${pendingOvertimes > 1 ? 's' : ''} d'heures sup. en attente`,
        icon: AlertTriangle
      });
    }

    return alerts;
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </Layout>
    );
  }

  if (user && isBasicUser(user)) {
    const presenceLabel = userStats.totalPresenceDays > 1 ? 'jours' : 'jour';
    const absenceLabel = userStats.totalAbsenceDays > 1 ? 'jours' : 'jour';
    const userCardData = [
      {
        title: 'Heures travaillées',
        value: `${userStats.totalHours.toFixed(2)} h`,
        subtitle: `${userStats.totalPresenceDays} ${presenceLabel} de présence`,
        icon: Clock,
        bg: 'bg-blue-100',
        iconColor: 'text-blue-600',
      },
      {
        title: 'Absences',
        value: `${userStats.totalAbsenceDays.toFixed(1)} ${absenceLabel}`,
        subtitle: `${userStats.approvedAbsences} approuvée(s) • ${userStats.pendingAbsences} en attente`,
        icon: Calendar,
        bg: 'bg-red-100',
        iconColor: 'text-red-600',
      },
      {
        title: 'Présences',
        value: userStats.totalPresenceDays,
        subtitle: 'Jours avec pointage complet',
        icon: UserCheck,
        bg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
      },
      {
        title: 'Pointages',
        value: userStats.totalPointages,
        subtitle: 'Total des entrées enregistrées',
        icon: Activity,
        bg: 'bg-purple-100',
        iconColor: 'text-purple-600',
      },
    ];

    return (
      <Layout>
        <div className="p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mon tableau de bord</h1>
            <p className="text-gray-600">Résumé de vos heures de travail et absences personnelles</p>
          </div>

          {userError && (
            <Card className="mb-6 border border-red-200 bg-red-50">
              <p className="text-sm text-red-700">{userError}</p>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            {userCardData.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.subtitle}</p>
                    </div>
                    <div className={`${stat.bg} p-3 rounded-xl`}>
                      <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Mes derniers pointages</h3>
                <p className="text-sm text-gray-600">Les 5 enregistrements les plus récents</p>
              </div>
              <div className="space-y-3">
                {recentEntries.length > 0 ? (
                  recentEntries.map((entry: any) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{formatDate(entry.date)}</p>
                          <p className="text-xs text-gray-500">
                            Entrée {formatTime(entry.clockIn)} • Sortie {formatTime(entry.clockOut)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Total: {entry.totalHours ? `${entry.totalHours.toFixed(2)} h` : '-'}
                          </p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(entry.status)}>
                          {entry.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-6">
                    Aucun pointage enregistré pour le moment.
                  </p>
                )}
              </div>
            </Card>

            <Card>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Mes absences</h3>
                <p className="text-sm text-gray-600">Les 5 dernières demandes</p>
              </div>
              <div className="space-y-3">
                {recentAbsences.length > 0 ? (
                  recentAbsences.map((absence: any) => (
                    <div
                      key={absence.id}
                      className="p-3 rounded-lg border border-slate-200 bg-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{absence.absenceType}</p>
                          <p className="text-xs text-gray-500">
                            {formatDate(absence.startDate)} → {formatDate(absence.endDate)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {absence.days} jour{absence.days > 1 ? 's' : ''}{' '}
                            • {absence.reason ? absence.reason : 'Aucune raison précisée'}
                          </p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(absence.status)}>
                          {absence.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-6">
                    Aucune demande d'absence pour le moment.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  const totalWithGender = stats.maleCount + stats.femaleCount;
  const malePercentage = totalWithGender > 0 ? (stats.maleCount / totalWithGender) * 100 : 0;
  const femalePercentage = totalWithGender > 0 ? (stats.femaleCount / totalWithGender) * 100 : 0;

  const ManIcon = './man.png';
  const WomanIcon = './woman.png';

  const statCards = [
    {
      title: 'Total Employés',
      value: stats.totalEmployees,
      subtitle: `${stats.activeEmployees} actifs`,
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      showGender: true,
    },
    {
      title: 'Heures Travaillées',
      value: `${stats.totalWorkedHours.toFixed(1)}h`,
      subtitle: `Efficacité: ${stats.efficiencyRate.toFixed(1)}%`,
      icon: Clock,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Heures Sup.',
      value: `${stats.totalOvertime.toFixed(1)}h`,
      subtitle: 'Ce mois',
      icon: TrendingUp,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Pointages',
      value: stats.totalTimeEntries,
      subtitle: `${stats.averageHoursPerDay.toFixed(1)}h/jour moyen`,
      icon: Activity,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Absences',
      value: stats.totalAbsences,
      subtitle: `${stats.pendingAbsences} en attente`,
      icon: Calendar,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Tendance Mensuelle',
      value: stats.monthlyTrends.length > 0 ?
        `${stats.monthlyTrends[stats.monthlyTrends.length - 1].totalWorkedHours.toFixed(0)}h` : '0h',
      subtitle: stats.monthlyTrends.length > 1 ?
        `${((stats.monthlyTrends[stats.monthlyTrends.length - 1].totalWorkedHours -
           stats.monthlyTrends[stats.monthlyTrends.length - 2].totalWorkedHours) /
           stats.monthlyTrends[stats.monthlyTrends.length - 2].totalWorkedHours * 100).toFixed(1)}%` : '',
      icon: BarChart3,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
    },
  ];

  return (
    <Layout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Vue d'ensemble de votre système de gestion des temps</p>
        </div>

        {/* Alertes */}
        {stats.alerts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertes</h2>
            <div className="space-y-3">
              {stats.alerts.map((alert, index) => {
                const Icon = alert.icon;
                const bgColor = alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                               alert.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200';
                const textColor = alert.type === 'warning' ? 'text-yellow-800' :
                                 alert.type === 'error' ? 'text-red-800' : 'text-blue-800';

                return (
                  <div key={index} className={`p-4 rounded-lg border ${bgColor}`}>
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${textColor}`} />
                      <p className={`text-sm font-medium ${textColor}`}>{alert.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                    {stat.subtitle && (
                      <p className="text-xs text-gray-500">{stat.subtitle}</p>
                    )}

                    {/* Icônes homme/femme avec pourcentages */}
                    {stat.showGender && stats.totalEmployees > 0 && (
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <div className="flex items-center gap-2">
                          {/* <span className="text-xs font-medium text-gray-900">
                            {stats.maleCount}
                          </span> */}
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-gray-500">
                              {malePercentage.toFixed(1)}%
                            </span>
                            <p className="text-xs text-gray-500">
                              Hommes
                            </p>
                          </div>
                          <img src={ManIcon} alt="Homme" className="w-10 h-10" />
                        </div>
                        <div className="flex items-center gap-1">
                          <img src={WomanIcon} alt="Femme" className="w-10 h-10" />
                          {/* <span className="text-xs font-medium text-gray-900">
                            {stats.femaleCount}
                          </span> */}
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-gray-500">
                              {femalePercentage.toFixed(1)}%
                            </span>
                            <p className="text-xs text-gray-500">
                              Femmes
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-xl`}>
                    <Icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Top Employés et Tendances */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Employés */}
          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Top 5 Employés</h3>
              <p className="text-sm text-gray-600">Par heures travaillées ce mois</p>
            </div>
            <div className="space-y-3">
              {stats.topEmployees.length > 0 ? (
                stats.topEmployees.map((employee, index) => (
                  <div key={employee.employeeId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </p>
                        <p className="text-xs text-gray-500">#{employee.employeeNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{employee.totalWorkedHours}h</p>
                      <p className="text-xs text-gray-500">{employee.efficiencyRate.toFixed(1)}% eff.</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Aucune donnée disponible</p>
              )}
            </div>
          </Card>

          {/* Tendances Mensuelles */}
          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Évolution Mensuelle</h3>
              <p className="text-sm text-gray-600">Heures travaillées sur 6 mois</p>
            </div>
            <div className="space-y-3">
              {stats.monthlyTrends.length > 0 ? (
                stats.monthlyTrends.slice(-6).map((month, index) => {
                  const maxHours = Math.max(
                    ...stats.monthlyTrends.map((m) => m.totalWorkedHours || 0)
                  );
                  const ratio =
                    maxHours > 0 ? (month.totalWorkedHours / maxHours) * 100 : 0;
                  return (
                    <div key={`${month.label}-${index}`} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{month.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                              width: `${ratio}%`
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 min-w-12 text-right">
                        {month.totalWorkedHours.toFixed(0)}h
                      </span>
                    </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Aucune donnée disponible</p>
              )}
            </div>
          </Card>
        </div>

        {/* Historique des actions */}
        <Card className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Historique des actions</h3>
              <p className="text-sm text-gray-600">Dernières opérations enregistrées dans le système</p>
            </div>
            <div className="text-xs text-gray-500">
              Page {auditPage + 1}
            </div>
          </div>
          {auditLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-6 h-6 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : auditLogs.length > 0 ? (
            <div className="space-y-3">
              {auditLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {translateAction(log.action)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {log.user?.email ? `Par ${log.user.email}` : 'Par le système'} • {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {log.user?.role && (
                      <Badge variant="secondary">{log.user.role}</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedAuditLog(log)}
                      className="flex items-center gap-2"
                    >
                      <span>Voir détails</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-6 text-center">
              Aucune activité récente.
            </p>
          )}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => loadAuditLogs(Math.max(0, auditPage - 1))}
              disabled={auditPage === 0 || auditLoading}
              className="px-3 py-1.5 rounded-md border border-slate-200 text-sm text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
            >
              Précédent
            </button>
            <button
              onClick={() => loadAuditLogs(auditPage + 1)}
              disabled={!auditHasMore || auditLoading}
              className="px-3 py-1.5 rounded-md border border-slate-200 text-sm text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
            >
              Suivant
            </button>
          </div>
        </Card>

        <Modal
          isOpen={!!selectedAuditLog}
          onClose={() => setSelectedAuditLog(null)}
          title="Détails de l'action"
          description={selectedAuditLog ? `Enregistrée le ${formatDateTime(selectedAuditLog.createdAt)}` : undefined}
          size="lg"
        >
          {selectedAuditLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs uppercase text-slate-500 font-semibold mb-1">Action</p>
                  <p className="text-sm text-slate-900">{translateAction(selectedAuditLog.action)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500 font-semibold mb-1">Objet</p>
                  <p className="text-sm text-slate-900">
                    {translateModel(selectedAuditLog.modelType)}
                    {selectedAuditLog.modelId ? ` #${selectedAuditLog.modelId}` : ''}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs uppercase text-slate-500 font-semibold mb-1">Utilisateur</p>
                  <p className="text-sm text-slate-900">
                    {selectedAuditLog.user?.email || 'Système'}
                    {selectedAuditLog.user?.role ? ` • ${selectedAuditLog.user.role}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500 font-semibold mb-1">Date & heure</p>
                  <p className="text-sm text-slate-900">{formatDateTime(selectedAuditLog.createdAt)}</p>
                </div>
              </div>
              {(selectedAuditLog.oldValue || selectedAuditLog.newValue) && (
                <div className="space-y-3">
                  {selectedAuditLog.oldValue && (
                    <div>
                      <p className="text-xs uppercase text-slate-500 font-semibold mb-1">Avant</p>
                      <div className="bg-slate-100 p-3 rounded-md text-xs text-slate-800">
                        <p className="whitespace-pre-wrap">{selectedAuditLog.oldValue}</p>
                      </div>
                    </div>
                  )}
                  {selectedAuditLog.newValue && (
                    <div>
                      <p className="text-xs uppercase text-slate-500 font-semibold mb-1">Après</p>
                      <div className="bg-slate-100 p-3 rounded-md text-xs text-slate-800">
                        <p className="whitespace-pre-wrap">{selectedAuditLog.newValue}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end">
                <Button type="button" onClick={() => setSelectedAuditLog(null)}>
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
}
