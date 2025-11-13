"use client";

import React, { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { employeesAPI, absencesAPI, timeEntriesAPI } from "@/lib/api";
import { Users, Clock, CheckCircle2, ArrowRight, Activity, Calendar } from "lucide-react";
import { getUser, isManager } from "@/lib/auth";

export default function ManagerDashboard() {
  const [teamEmployees, setTeamEmployees] = useState<any[]>([]);
  const [pendingAbsences, setPendingAbsences] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [managerStats, setManagerStats] = useState({
    totalHours: 0,
    entriesCount: 0,
    totalAbsences: 0,
  });

  useEffect(() => {
    const user = getUser();
    setCurrentUser(user);

    const load = async () => {
      try {
        const [empsRes, absRes] = await Promise.all([employeesAPI.getAll(), absencesAPI.getAll()]);
        const employeesList = empsRes?.data || [];
        const absencesList = absRes?.data || [];

        const teamList = employeesList;
        setTeamEmployees(teamList);

        setPendingAbsences(absencesList.filter((a: any) => a.status === "EN_ATTENTE").length);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const attendanceCounts = await Promise.all(
          teamList.map(async (emp: any) => {
            if (!emp.id) return 0;
            try {
              const entriesRes = await timeEntriesAPI.getByEmployee(
                emp.id,
                today.toISOString(),
                tomorrow.toISOString(),
                false
              );
              const entries = entriesRes?.data ?? entriesRes ?? [];
              const hasPresence = entries.some(
                (entry: any) =>
                  entry.status === "TERMINE" ||
                  (entry.clockIn && entry.clockOut)
              );
              return hasPresence ? 1 : 0;
            } catch {
              return 0;
            }
          })
        );

        setPresentToday(attendanceCounts.reduce((sum, value) => sum + value, 0));

        if (user?.employee?.id) {
          const [entriesRes, absencesRes] = await Promise.all([
            timeEntriesAPI.getByEmployee(user.employee.id),
            absencesAPI.getByEmployee(user.employee.id),
          ]);

          const entries = entriesRes?.data ?? entriesRes ?? [];
          const absences = absencesRes?.data ?? absencesRes ?? [];

          const totalHours = entries
            .filter((entry: any) => entry.status === "TERMINE")
            .reduce((sum: number, entry: any) => sum + (entry.totalHours || 0), 0);

          setManagerStats({
            totalHours: Math.round(totalHours * 100) / 100,
            entriesCount: entries.length,
            totalAbsences: absences.length,
          });
        }
      } catch (error) {
        console.error("Erreur lors du chargement du dashboard manager:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const teamSize = teamEmployees.length;
  const managerName = useMemo(() => {
    const firstName = currentUser?.employee?.firstName || currentUser?.firstName || "";
    const lastName = currentUser?.employee?.lastName || currentUser?.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || currentUser?.email || "Manager";
  }, [currentUser]);

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

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bienvenue {managerName}</h1>
            <p className="text-gray-600 text-sm">
              Vision consolidée de votre équipe et de votre activité personnelle.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Membres de l'équipe</p>
                <p className="text-2xl font-bold text-gray-900">{teamSize}</p>
                <p className="text-xs text-gray-500">Total des employés visibles</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Absences en attente</p>
                <p className="text-2xl font-bold text-gray-900">{pendingAbsences}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-xl">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 text-cyan-500 text-sm font-medium flex gap-2">
              <Link href="/absences" className="flex items-center gap-2">
                <p>Gérer les absences</p>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Présents aujourd'hui</p>
                <p className="text-2xl font-bold text-gray-900">{presentToday}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </Card>
        </div>

        {currentUser?.employee?.id && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Mes statistiques</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Heures travaillées</p>
                    <p className="text-2xl font-bold text-gray-900">{managerStats.totalHours.toFixed(2)} h</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pointages</p>
                    <p className="text-2xl font-bold text-gray-900">{managerStats.entriesCount}</p>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl">
                    <Activity className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Absences</p>
                    <p className="text-2xl font-bold text-gray-900">{managerStats.totalAbsences}</p>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl">
                    <Calendar className="w-6 h-6 text-rose-600" />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Actions rapides</h2>
          <div className="flex gap-3 flex-wrap">
            <Link href="/employees">
              <Button variant="ghost">Consulter l'équipe</Button>
            </Link>
            <Link href="/validation">
              <Button>Valider des demandes</Button>
            </Link>
            <Link href="/absences/new">
              <Button variant="outline">Ajouter une absence</Button>
            </Link>
          </div>
        </div>

        <Card>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Remarques</h3>
            <p className="text-sm text-gray-600">
              Cette vue montre des informations synthétiques. Pour plus de détails, utilisez les liens ci-dessus.
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
