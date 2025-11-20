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
    workCycle?: {
      label?: string | null;
      abbreviation?: string | null;
    } | null;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalHours: number;
    totalOvertimeHours: number;
    totalSpecialHours: number;
    totalBreakHours: number;
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
      toast.error(error.response?.data?.message || 'Erreur lors du chargement de la fiche de pointage');
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (value?: number | null) =>
    typeof value === 'number' ? value.toFixed(2) : '0.00';

  const handlePrint = () => {
    if (!printRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = printRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fiche de Pointage</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 1cm;
              }
              body { margin: 0; }
            }
            body {
              font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
              color: #0f172a;
              font-size: 0.95rem;
              line-height: 1.55;
              margin: 0;
              padding: 2rem;
            }
            .payslip-printable {
              font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
              color: #0f172a;
              font-size: 0.95rem;
              line-height: 1.55;
            }
            .payslip-header {
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .payslip-header h1 {
              font-size: 1.75rem;
              font-weight: 700;
              margin-bottom: 0.25rem;
              color: #0f172a;
              margin: 0;
            }
            .payslip-header .company-info {
              margin-top: 5px;
              font-size: 0.85rem;
              color: #475569;
            }
            .payslip-header .company-info p {
              margin: 0.25rem 0;
            }
            .payslip-section {
              margin-bottom: 1.75rem;
            }
            .payslip-section h2 {
              font-size: 1.05rem;
              font-weight: 600;
              margin-bottom: 0.5rem;
              color: #0f172a;
            }
            .payslip-employee-summary {
              margin-bottom: 1.5rem;
            }
            .employee-summary-header {
              display: flex;
              flex-direction: column;
              gap: 0.25rem;
            }
            .payslip-employee-summary h2 {
              margin: 0;
              font-size: 1.2rem;
            }
            .employee-matricule {
              font-size: 0.9rem;
              font-weight: 600;
              text-transform: uppercase;
              color: #0f172a;
              margin: 0;
            }
            .employee-meta-row {
              display: flex;
              gap: 1rem;
              flex-wrap: wrap;
              font-size: 0.9rem;
              color: #475569;
              margin-top: 0.35rem;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 1.25rem;
              background-color: #ffffff;
            }
            table th, table td {
              border: 1px solid #cbd5f5;
              padding: 0.65rem;
              text-align: left;
            }
            table th {
              background-color: #e2e8f0;
              color: #0f172a;
              font-weight: 600;
              font-size: 0.85rem;
              text-transform: uppercase;
              letter-spacing: 0.02em;
            }
            table td {
              font-size: 0.9rem;
            }
            .total-row td {
              font-weight: 700;
              background-color: #f8fafc;
            }
            .summary-box {
              padding: 15px;
              margin-top: 20px;
            }
            .summary-box h3 {
              margin-top: 0;
              font-size: 16px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
              gap: 0.75rem;
            }
            .summary-grid div {
              border: 1px solid #cbd5f5;
              padding: 0.75rem;
              background: #f8fafc;
            }
            .summary-grid p {
              margin: 0;
              font-size: 0.8rem;
              color: #475569;
            }
            .summary-grid strong {
              display: block;
              font-size: 1rem;
              color: #0f172a;
            }
            .signature-section {
              margin-top: 3rem;
              text-align: center;
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
              gap: 2rem;
            }
            .signature-section p {
              margin: 0.25rem 0;
            }
            .signature-name {
              font-size: 0.9rem;
              color: #475569;
            }
            .payslip-footer {
              margin-top: 2.5rem;
              text-align: center;
              font-size: 0.85rem;
              color: #475569;
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
        <div ref={printRef} className="bg-white p-8 shadow-lg max-w-4xl mx-auto payslip-printable">
          {/* Header */}
          <div className="payslip-header">
            <h1>FICHE DE POINTAGE</h1>
            <div className="company-info">
              <p>Entreprise: OGOOUE TECHNOLOGIE</p>
              <p>Période: {formatDate(payslipData.period.startDate)} - {formatDate(payslipData.period.endDate)}</p>
            </div>
          </div>

          {/* Employee Info */}
          <div className="payslip-section payslip-employee-summary">
            <div className="employee-summary-header">
            <h2>{payslipData.employee.firstName} {payslipData.employee.lastName}</h2>
              <p className="employee-matricule">Matricule : {payslipData.employee.employeeNumber}</p>
            </div>
            <div className="employee-meta-row">
              <span>
                Contact&nbsp;: {payslipData.employee.email || 'Email indisponible'}
                &nbsp;-&nbsp; {payslipData.employee.phone || 'Téléphone indisponible'}
                </span>
            </div>
            <div className="employee-meta-row">
              <span>
                Service&nbsp;: {payslipData.employee.organizationalUnit?.name || 'Non définie'}
              </span>
            </div>
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
                    <th>Heures normales</th>
                    <th>Heures sup.</th>
                    <th>Heures spéciales</th>
                    <th>Pause</th>
                  </tr>
                </thead>
                <tbody>
                  {payslipData.timeEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDate(entry.date)}</td>
                      <td>{entry.clockIn ? new Date(entry.clockIn).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td>{entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td>{formatHours(entry.calculatedHours?.normalHours)} h</td>
                      <td>{formatHours(entry.calculatedHours?.overtimeHours)} h</td>
                      <td>{formatHours(entry.calculatedHours?.specialHours)} h</td>
                      <td>{formatHours(entry.calculatedHours?.breakdown.other)} h</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan={3}><strong>Total:</strong></td>
                    <td><strong>{formatHours(payslipData.summary.totalHours)} h</strong></td>
                    <td><strong>{formatHours(payslipData.summary.totalOvertimeHours)} h</strong></td>
                    <td><strong>{formatHours(payslipData.summary.totalSpecialHours)} h</strong></td>
                    <td><strong>{formatHours(payslipData.summary.totalBreakHours)} h</strong></td>
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
                  <td><strong>{formatHours(payslipData.summary.totalOvertimeHours)} h</strong></td>
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
                  <td><strong>{formatHours(payslipData.summary.totalSpecialHours)} h</strong></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Absences */}
          {payslipData.absences.length > 0 && (
            <div className="payslip-section">
              <h2>ABSENCES ({payslipData.absences.length})</h2>
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
            <h2>RÉSUMÉ DE LA PÉRIODE</h2>
            <div className="summary-grid">
              <div>
                <p>Jours travaillés</p>
                <strong>{payslipData.summary.workDays}</strong>
              </div>
              <div>
                <p>Heures normales</p>
                <strong>{payslipData.summary.totalHours.toFixed(2)} h</strong>
              </div>
              <div>
                <p>Heures supplémentaires</p>
                <strong>{payslipData.summary.totalOvertimeHours.toFixed(2)} h</strong>
              </div>
              <div>
                <p>Heures spéciales</p>
                <strong>{payslipData.summary.totalSpecialHours.toFixed(2)} h</strong>
              </div>
              <div>
                <p>Jours d'absence</p>
                <strong>{payslipData.summary.totalAbsenceDays}</strong>
              </div>
            </div>
          </div>

        <div className="signature-section">
          <div>
            <p><strong>Signature de l'employé</strong></p>
            <p className="signature-name">{payslipData.employee.firstName} {payslipData.employee.lastName}</p>
          </div>
          <div>
            <p><strong>Signature du chef de service</strong></p>
            <p className="signature-name">Chef de service</p>
          </div>
          <div>
            <p><strong>Signature RH</strong></p>
            <p className="signature-name">Service RH</p>
          </div>
        </div>

        {/* Footer */}
        {/* <div className="payslip-footer">
          <p>Fiche générée le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}</p>
        </div> */}
        </div>
      </div>

      <style jsx>{`
        .payslip-printable {
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
          color: #0f172a;
          font-size: 0.95rem;
          line-height: 1.55;
        }

        .payslip-employee-summary {
          margin-bottom: 1.5rem;
        }

        .employee-summary-header {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .payslip-employee-summary h2 {
          margin: 0;
          font-size: 1.2rem;
        }

        .employee-matricule {
          font-size: 0.9rem;
          color: #475569;
          margin: 0;
        }

        .employee-meta-row {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          font-size: 0.9rem;
          color: #475569;
          margin-top: 0.35rem;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 0.75rem;
        }

        .summary-grid div {
          border: 1px solid #cbd5f5;
          padding: 0.75rem;
          // border-radius: 0.5rem;
          background: #f8fafc;
        }

        .summary-grid p {
          margin: 0;
          font-size: 0.8rem;
          color: #475569;
        }

        .summary-grid strong {
          display: block;
          font-size: 1rem;
          color: #0f172a;
        }

        .signature-section {
          margin-top: 3rem;
          text-align: center;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 2rem;
        }

        .signature-section p {
          margin: 0.25rem 0;
        }

        .signature-name {
          font-size: 0.9rem;
          color: #475569;
        }

        .payslip-footer {
          margin-top: 2.5rem;
          text-align: center;
          font-size: 0.85rem;
          color: #475569;
        }

        .payslip-printable h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
          color: #0f172a;
        }

        .payslip-printable h2 {
          font-size: 1.05rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #0f172a;
        }

        .payslip-printable table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1.25rem;
          background-color: #ffffff;
        }

        .payslip-printable table th,
        .payslip-printable table td {
          border: 1px solid #cbd5f5;
          padding: 0.65rem;
          text-align: left;
        }

        .payslip-printable table th {
          background-color: #e2e8f0;
          color: #0f172a;
          font-weight: 600;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .payslip-printable table td {
          font-size: 0.9rem;
        }

        .payslip-printable .total-row td {
          font-weight: 700;
          background-color: #f8fafc;
        }

        .payslip-printable .payslip-section {
          margin-bottom: 1.75rem;
        }

        .payslip-printable .company-info {
          font-size: 0.85rem;
          color: #475569;
        }

        @media (max-width: 768px) {
          .payslip-printable {
            font-size: 0.9rem;
            padding: 1.5rem;
          }

          .payslip-printable table th,
          .payslip-printable table td {
            padding: 0.5rem;
          }
        }
      `}</style>
    </Layout>
  );
}

