import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8008/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Auth
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (email: string, password: string) => {
    const response = await api.post('/auth/register', { email, password });
    return response.data;
  },
};

// API Employees
export const employeesAPI = {
  getAll: () => api.get('/employees').then((res) => res.data),
  getById: (id: number) => api.get(`/employees/${id}`).then((res) => res.data),
  getPayslip: (id: number, startDate: string, endDate: string) =>
    api.get(`/employees/${id}/payslip`, { params: { startDate, endDate } }).then((res) => res.data),
  create: (data: any) => api.post('/employees', data).then((res) => res.data),
  update: (id: number, data: any) =>
    api.put(`/employees/${id}`, data).then((res) => res.data),
  delete: (id: number) => api.delete(`/employees/${id}`).then((res) => res.data),
  bulkImport: (items: any[]) =>
    api.post('/employees/bulk', items).then((res) => res.data),
};

// API Work Cycles
export const workCyclesAPI = {
  getAll: () => api.get('/work-cycles').then((res) => res.data),
  getById: (id: number) => api.get(`/work-cycles/${id}`).then((res) => res.data),
  create: (data: any) => api.post('/work-cycles', data).then((res) => res.data),
  update: (id: number, data: any) =>
    api.put(`/work-cycles/${id}`, data).then((res) => res.data),
  delete: (id: number) => api.delete(`/work-cycles/${id}`).then((res) => res.data),
};

// API Schedules
export const schedulesAPI = {
  getAll: () => api.get('/schedules').then((res) => res.data),
  getByEmployee: (employeeId: number) =>
    api.get(`/schedules/employee/${employeeId}`).then((res) => res.data),
  create: (data: any) => api.post('/schedules', data).then((res) => res.data),
  update: (id: number, data: any) =>
    api.put(`/schedules/${id}`, data).then((res) => res.data),
  delete: (id: number) => api.delete(`/schedules/${id}`).then((res) => res.data),
};

// API Absences
export const absencesAPI = {
  getAll: () => api.get('/absences').then((res) => res.data),
  getByEmployee: (employeeId: number) =>
    api.get(`/absences/employee/${employeeId}`).then((res) => res.data),
  create: (data: any) => api.post('/absences', data).then((res) => res.data),
  approve: (id: number, status: string, approvedBy: number) =>
    api.patch(`/absences/${id}/approve`, { status, approvedBy }).then((res) => res.data),
};

// API Overtimes
export const overtimesAPI = {
  getByEmployee: (employeeId: number) =>
    api.get(`/overtimes/employee/${employeeId}`).then((res) => res.data),
  create: (data: any) => api.post('/overtimes', data).then((res) => res.data),
  approve: (id: number, status: string) =>
    api.patch(`/overtimes/${id}/approve`, { status }).then((res) => res.data),
};

// API Periods
export const periodsAPI = {
  getBySchedule: (scheduleId: number) =>
    api.get(`/periods/schedule/${scheduleId}`).then((res) => res.data),
  create: (data: any) => api.post('/periods', data).then((res) => res.data),
  update: (id: number, data: any) =>
    api.put(`/periods/${id}`, data).then((res) => res.data),
  delete: (id: number) => api.delete(`/periods/${id}`).then((res) => res.data),
};

// API Time Ranges
export const timeRangesAPI = {
  getByPeriod: (periodId: number) =>
    api.get(`/time-ranges/period/${periodId}`).then((res) => res.data),
  create: (data: any) => api.post('/time-ranges', data).then((res) => res.data),
  update: (id: number, data: any) =>
    api.put(`/time-ranges/${id}`, data).then((res) => res.data),
  delete: (id: number) => api.delete(`/time-ranges/${id}`).then((res) => res.data),
};

// API Special Hours
export const specialHoursAPI = {
  getByEmployee: (employeeId: number) =>
    api.get(`/special-hours/employee/${employeeId}`).then((res) => res.data),
  create: (data: any) => api.post('/special-hours', data).then((res) => res.data),
  approve: (id: number, status: string) =>
    api.patch(`/special-hours/${id}/approve`, { status }).then((res) => res.data),
};

// API Time Entries
export const timeEntriesAPI = {
  getByEmployee: (employeeId: number, startDate?: string, endDate?: string, includeCalculations?: boolean) =>
    api
      .get(`/time-entries/employee/${employeeId}`, {
        params: { startDate, endDate, includeCalculations },
      })
      .then((res) => res.data),
  clockIn: (employeeId: number, data?: any) =>
    api.post(`/time-entries/${employeeId}/clock-in`, data).then((res) => res.data),
  clockOut: (employeeId: number, data?: any) =>
    api.post(`/time-entries/${employeeId}/clock-out`, data).then((res) => res.data),
  getBalance: (employeeId: number, startDate: string, endDate: string) =>
    api.get(`/time-entries/employee/${employeeId}/balance`, { params: { startDate, endDate } }).then((res) => res.data),
  validate: (id: number, autoCorrect?: boolean) =>
    api.post(`/time-entries/${id}/validate`, {}, { params: { autoCorrect } }).then((res) => res.data),
  validatePeriod: (employeeId: number, startDate: string, endDate: string, autoCorrect?: boolean) =>
    api.post(`/time-entries/employee/${employeeId}/validate-period`, { startDate, endDate, autoCorrect }).then((res) => res.data),
  getValidationStats: (employeeId: number, startDate: string, endDate: string) =>
    api.get(`/time-entries/employee/${employeeId}/validation-stats`, { params: { startDate, endDate } }).then((res) => res.data),
  getValidationRules: () => api.get('/time-entries/validation-rules').then((res) => res.data),
};

// API Organizational Units
export const organizationalUnitsAPI = {
  getAll: () => api.get('/organizational-units').then((res) => res.data),
  getTree: () => api.get('/organizational-units/tree').then((res) => res.data),
  getRoots: () => api.get('/organizational-units/roots').then((res) => res.data),
  getById: (id: number) => api.get(`/organizational-units/${id}`).then((res) => res.data),
  getChildren: (id: number) => api.get(`/organizational-units/${id}/children`).then((res) => res.data),
  create: (data: any) => api.post('/organizational-units', data).then((res) => res.data),
  update: (id: number, data: any) =>
    api.put(`/organizational-units/${id}`, data).then((res) => res.data),
  delete: (id: number) => api.delete(`/organizational-units/${id}`).then((res) => res.data),
};

// API Audit Logs
export const auditLogsAPI = {
  getAll: (params?: any) => api.get('/audit-logs', { params }).then((res) => res.data),
  getByModel: (modelType: string, modelId: number) =>
    api.get(`/audit-logs/model/${modelType}/${modelId}`).then((res) => res.data),
  getByUser: (userId: number) =>
    api.get(`/audit-logs/user/${userId}`).then((res) => res.data),
};

// API Reports
export const reportsAPI = {
  getGeneral: (params?: any) => api.get('/reports/general', { params }).then((res) => res.data),
  getEmployees: (params?: any) => api.get('/reports/employees', { params }).then((res) => res.data),
  getMonthly: (params?: any) => api.get('/reports/monthly', { params }).then((res) => res.data),
  getAttendance: (params?: any) => api.get('/reports/attendance', { params }).then((res) => res.data),
  getOvertimeSummary: (params?: any) => api.get('/reports/overtime-summary', { params }).then((res) => res.data),
  export: (type: string, params?: any) =>
    api.get(`/reports/export/${type}`, {
      params,
      responseType: 'blob'
    }).then((res) => res.data),
};

// API Notifications
export const notificationsAPI = {
  getAll: (params?: any) => api.get('/notifications', { params }).then((res) => res.data),
  getUnreadCount: () => api.get('/notifications/unread-count').then((res) => res.data),
  markAsRead: (id: number) => api.patch(`/notifications/${id}/read`).then((res) => res.data),
  markAllAsRead: () => api.patch('/notifications/mark-all-read').then((res) => res.data),
  delete: (id: number) => api.delete(`/notifications/${id}`).then((res) => res.data),
  sendTest: (data: any) => api.post('/notifications/test', data).then((res) => res.data),
  sendSystemAlert: (data: any) => api.post('/notifications/system-alert', data).then((res) => res.data),
};

export default api;

