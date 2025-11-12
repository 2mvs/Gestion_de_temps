'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Printer, ArrowLeft, Calendar } from 'lucide-react';
import Layout from '@/components/Layout';
import { isAuthenticated } from '@/lib/auth';
import { employeesAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import { toast } from 'react-toastify';
import Card from '@/components/ui/Card';

interface PayslipData {
  employee: {
    id: number;
    employeeNumber: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    organizationalUnit: any;
    contractType: string;
    hireDate: string;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalHours: number;
    totalOvertimeHours: number;
    totalSpecialHours: number;
    totalAbsenceDays: number;
    workDays: number;
  };
  timeEntries: any[];
  overtimes: any[];
  specialHours: any[];
  absences: any[];
}

export default function PayslipPage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = parseInt(params.id as string);
  const [loading, setLoading] = useState(true);
  const [payslipData, setPayslipData] = useState<PayslipData | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // Premier jour du mois
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(0); // Dernier jour du mois
    return date.toISOString().split('T')[0];
  });
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadPayslip();
  }, [employeeId, startDate, endDate]);

  const loadPayslip = async () => {
    try {
      setLoading(true);
      const response = await employeesAPI.getPayslip(employeeId, startDate, endDate);
      setPayslipData(response.data);
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.response?.data?.message || 'Erreur lors du chargement de la fiche de paie');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    
    // Masquer les éléments non nécessaires à l'impression
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = printRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fiche de Paie</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 1cm;
              }
              body { margin: 0; }
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.5;
              color: #000;
            }
            .payslip-header {
              border-bottom: 3px solid #000;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .payslip-header h1 {
              font-size: 24px;
              margin: 0;
            }
            .payslip-header .company-info {
              margin-top: 10px;
              font-size: 10px;
            }
            .payslip-section {
              margin-bottom: 20px;
            }
            .payslip-section h2 {
              font-size: 14px;
              font-weight: bold;
              border-bottom: 1px solid #000;
              padding-bottom: 5px;
              margin-bottom: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            table th, table td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }
            table th {
              background-color: #f0f0f0;
              font-weight: bold;
            }
            .summary-box {
              border: 2px solid #000;
              padding: 15px;
              margin-top: 20px;
            }
            .summary-box h3 {
              margin-top: 0;
              font-size: 16px;
            }
            .total-row {
              font-weight: bold;
              font-size: 14px;
            }
            .no-print {
              display: none;
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

  if (!payslipData) {
    return (
      <Layout>
        <div className="p-6 lg:p-8">
          <Card>
            <div className="p-6 text-center">
              <p className="text-slate-600">Aucune donnée disponible pour cette période</p>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 lg:p-8">
        {/* Controls */}
        <div className="no-print mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              onClick={() => router.back()}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </Button>
          </div>
          <Card className="p-4">
             <h1 className='text-xl font-semibold mb-3'>Selectionner la periode</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-500" />
                <label className="text-sm font-medium text-slate-700">Date de début:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700">Date de fin:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
              </div>
              <Button
                onClick={loadPayslip}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
                size="sm"
              >
                Charger
              </Button>
            </div>
          </Card>
        </div>

        {/* Payslip Content */}
        <div ref={printRef} className="bg-white p-8 shadow-lg max-w-4xl mx-auto">
          {/* Header */}
          <div className="payslip-header">
            <h1>FICHE DE PAIE</h1>
            <div className="company-info">
              <p>Entreprise: OGOOUE TECHNOLOGIE</p>
              <p>Période: {formatDate(payslipData.period.startDate)} - {formatDate(payslipData.period.endDate)}</p>
            </div>
          </div>

          {/* Employee Info */}
          <div className="payslip-section">
            <h2>INFORMATIONS EMPLOYÉ</h2>
            <table>
              <tbody>
                <tr>
                  <td><strong>Matricule:</strong></td>
                  <td>{payslipData.employee.employeeNumber}</td>
                </tr>
                <tr>
                  <td><strong>Nom:</strong></td>
                  <td>{payslipData.employee.firstName} {payslipData.employee.lastName}</td>
                </tr>
                <tr>
                  <td><strong>Email:</strong></td>
                  <td>{payslipData.employee.email || '-'}</td>
                </tr>
                <tr>
                  <td><strong>Téléphone:</strong></td>
                  <td>{payslipData.employee.phone || '-'}</td>
                </tr>
                <tr>
                  <td><strong>Unité Organisationnelle:</strong></td>
                  <td>{payslipData.employee.organizationalUnit?.name || '-'}</td>
                </tr>
                <tr>
                  <td><strong>Type de Contrat:</strong></td>
                  <td>{payslipData.employee.contractType}</td>
                </tr>
                <tr>
                  <td><strong>Date d'embauche:</strong></td>
                  <td>{formatDate(payslipData.employee.hireDate)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Time Entries */}
          {payslipData.timeEntries.length > 0 && (
            <div className="payslip-section">
              <h2>POINTAGES ({payslipData.timeEntries.length} jours)</h2>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Entrée</th>
                    <th>Sortie</th>
                    <th>Heures</th>
                  </tr>
                </thead>
                <tbody>
                  {payslipData.timeEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDate(entry.date)}</td>
                      <td>{entry.clockIn ? new Date(entry.clockIn).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td>{entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td>{entry.totalHours?.toFixed(2) || '0.00'} h</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan={3}><strong>Total:</strong></td>
                    <td><strong>{payslipData.summary.totalHours.toFixed(2)} h</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Overtimes */}
          {payslipData.overtimes.length > 0 && (
            <div className="payslip-section">
              <h2>HEURES SUPPLÉMENTAIRES ({payslipData.overtimes.length} enregistrement(s))</h2>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Heures</th>
                    <th>Raison</th>
                  </tr>
                </thead>
                <tbody>
                  {payslipData.overtimes.map((ot) => (
                    <tr key={ot.id}>
                      <td>{formatDate(ot.date)}</td>
                      <td>{ot.hours.toFixed(2)} h</td>
                      <td>{ot.reason || '-'}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan={1}><strong>Total:</strong></td>
                    <td><strong>{payslipData.summary.totalOvertimeHours.toFixed(2)} h</strong></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Special Hours */}
          {payslipData.specialHours.length > 0 && (
            <div className="payslip-section">
              <h2>HEURES SPÉCIALES ({payslipData.specialHours.length} enregistrement(s))</h2>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Heures</th>
                    <th>Raison</th>
                  </tr>
                </thead>
                <tbody>
                  {payslipData.specialHours.map((sh) => (
                    <tr key={sh.id}>
                      <td>{formatDate(sh.date)}</td>
                      <td>{sh.hourType}</td>
                      <td>{sh.hours.toFixed(2)} h</td>
                      <td>{sh.reason || '-'}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan={2}><strong>Total:</strong></td>
                    <td><strong>{payslipData.summary.totalSpecialHours.toFixed(2)} h</strong></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Absences */}
          {payslipData.absences.length > 0 && (
            <div className="payslip-section">
              <h2>ABSENCES ({payslipData.absences.length} enregistrement(s))</h2>
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Date Début</th>
                    <th>Date Fin</th>
                    <th>Jours</th>
                    <th>Raison</th>
                  </tr>
                </thead>
                <tbody>
                  {payslipData.absences.map((abs) => (
                    <tr key={abs.id}>
                      <td>{abs.absenceType}</td>
                      <td>{formatDate(abs.startDate)}</td>
                      <td>{formatDate(abs.endDate)}</td>
                      <td>{abs.days}</td>
                      <td>{abs.reason || '-'}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan={3}><strong>Total:</strong></td>
                    <td><strong>{payslipData.summary.totalAbsenceDays} jours</strong></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Summary */}
          <div className="summary-box">
            <h3>RÉSUMÉ DE LA PÉRIODE</h3>
            <table>
              <tbody>
                <tr>
                  <td><strong>Jours travaillés:</strong></td>
                  <td>{payslipData.summary.workDays} jours</td>
                </tr>
                <tr>
                  <td><strong>Total heures normales:</strong></td>
                  <td>{payslipData.summary.totalHours.toFixed(2)} h</td>
                </tr>
                <tr>
                  <td><strong>Total heures supplémentaires:</strong></td>
                  <td>{payslipData.summary.totalOvertimeHours.toFixed(2)} h</td>
                </tr>
                <tr>
                  <td><strong>Total heures spéciales:</strong></td>
                  <td>{payslipData.summary.totalSpecialHours.toFixed(2)} h</td>
                </tr>
                <tr>
                  <td><strong>Total jours d'absence:</strong></td>
                  <td>{payslipData.summary.totalAbsenceDays} jours</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-slate-300 text-center text-xs text-slate-500">
            <p>Fiche générée le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

