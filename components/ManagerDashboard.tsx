"use client";

import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { employeesAPI, absencesAPI, timeEntriesAPI } from "@/lib/api";
import { Users, Clock, CheckCircle2, ArrowRight } from "lucide-react";

export default function ManagerDashboard() {
  const [teamSize, setTeamSize] = useState(0);
  const [pendingAbsences, setPendingAbsences] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [empsRes, absRes] = await Promise.all([employeesAPI.getAll(), absencesAPI.getAll()]);
        const emps = empsRes?.data || [];
        const abs = absRes?.data || [];

        setTeamSize(emps.length);
        setPendingAbsences(abs.filter((a: any) => a.status === "PENDING").length);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const attendanceCounts = await Promise.all(
          emps.map(async (emp: any) => {
            if (!emp.id) return 0;
            try {
              const entriesRes = await timeEntriesAPI.getByEmployee(emp.id, today.toISOString(), tomorrow.toISOString(), false);
              const entries = entriesRes?.data ?? entriesRes ?? [];
              const hasPresence = entries.some(
                (entry: any) =>
                  entry.status === 'COMPLETED' ||
                  (entry.clockIn && entry.clockOut)
              );
              return hasPresence ? 1 : 0;
            } catch {
              return 0;
            }
          })
        );

        setPresentToday(attendanceCounts.reduce((sum, value) => sum + value, 0));
      } catch (error) {
        console.error("Erreur lors du chargement du dashboard manager:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

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
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Bienvenue sur votre portail manager</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                {/* <p className="text-xs text-gray-500">Demandes à approuver</p> */}
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

        {/* Quick Actions */}
        <div className="mb-8">
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

        {/* Alerts / Notes */}
        <Card>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Remarques</h3>
            <p className="text-sm text-gray-600">Cette vue montre des informations synthétiques. Pour plus de détails, utilisez les liens ci-dessus.</p>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
