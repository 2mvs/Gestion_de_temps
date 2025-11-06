// Constantes pour correspondre exactement aux enums du backend Prisma

export const ABSENCE_TYPES = {
  VACATION: { value: 'VACATION', label: 'Congés' },
  SICK_LEAVE: { value: 'SICK_LEAVE', label: 'Maladie' },
  PERSONAL: { value: 'PERSONAL', label: 'Personnel' },
  MATERNITY: { value: 'MATERNITY', label: 'Maternité' },
  PATERNITY: { value: 'PATERNITY', label: 'Paternité' },
  UNPAID_LEAVE: { value: 'UNPAID_LEAVE', label: 'Sans solde' },
  OTHER: { value: 'OTHER', label: 'Autre' },
} as const;

export const CONTRACT_TYPES = {
  FULL_TIME: { value: 'FULL_TIME', label: 'Temps plein' },
  PART_TIME: { value: 'PART_TIME', label: 'Temps partiel' },
  INTERIM: { value: 'INTERIM', label: 'Intérim' },
  CONTRACT: { value: 'CONTRACT', label: 'Contrat' },
} as const;

export const EMPLOYEE_STATUS = {
  ACTIVE: { value: 'ACTIVE', label: 'Actif' },
  INACTIVE: { value: 'INACTIVE', label: 'Inactif' },
  SUSPENDED: { value: 'SUSPENDED', label: 'Suspendu' },
  TERMINATED: { value: 'TERMINATED', label: 'Terminé' },
} as const;

export const GENDER_TYPES = {
  MALE: { value: 'MALE', label: 'Homme' },
  FEMALE: { value: 'FEMALE', label: 'Femme' },
  UNKNOWN: { value: 'UNKNOWN', label: 'Non spécifié' },
} as const;

export const CYCLE_TYPES = {
  WEEKLY: { value: 'WEEKLY', label: 'Hebdomadaire' },
  BIWEEKLY: { value: 'BIWEEKLY', label: 'Bihebdomadaire' },
  MONTHLY: { value: 'MONTHLY', label: 'Mensuel' },
  CUSTOM: { value: 'CUSTOM', label: 'Personnalisé' },
} as const;

export const SCHEDULE_TYPES = {
  STANDARD: { value: 'STANDARD', label: 'Standard' },
  NIGHT_SHIFT: { value: 'NIGHT_SHIFT', label: 'Nuit' },
  FLEXIBLE: { value: 'FLEXIBLE', label: 'Flexible' },
  CUSTOM: { value: 'CUSTOM', label: 'Personnalisé' },
} as const;

export const TIME_ENTRY_STATUS = {
  PENDING: { value: 'PENDING', label: 'En attente' },
  COMPLETED: { value: 'COMPLETED', label: 'Complété' },
  INCOMPLETE: { value: 'INCOMPLETE', label: 'Incomplet' },
  ABSENT: { value: 'ABSENT', label: 'Absent' },
} as const;

export const APPROVAL_STATUS = {
  PENDING: { value: 'PENDING', label: 'En attente' },
  APPROVED: { value: 'APPROVED', label: 'Approuvé' },
  REJECTED: { value: 'REJECTED', label: 'Rejeté' },
} as const;

export const SPECIAL_HOUR_TYPES = {
  HOLIDAY: { value: 'HOLIDAY', label: 'Jour férié' },
  NIGHT_SHIFT: { value: 'NIGHT_SHIFT', label: 'Nuit' },
  WEEKEND: { value: 'WEEKEND', label: 'Week-end' },
  ON_CALL: { value: 'ON_CALL', label: 'Astreinte' },
} as const;

export const USER_ROLES = {
  ADMIN: { value: 'ADMIN', label: 'Administrateur' },
  MANAGER: { value: 'MANAGER', label: 'Manager' },
  USER: { value: 'USER', label: 'Utilisateur' },
} as const;

// Helper functions to convert to Select options
export const getSelectOptions = (obj: Record<string, { value: string; label: string }>) => {
  return Object.values(obj);
};

export const absenceTypeOptions = getSelectOptions(ABSENCE_TYPES);
export const contractTypeOptions = getSelectOptions(CONTRACT_TYPES);
export const employeeStatusOptions = getSelectOptions(EMPLOYEE_STATUS);
export const genderTypeOptions = getSelectOptions(GENDER_TYPES);
export const cycleTypeOptions = getSelectOptions(CYCLE_TYPES);
export const scheduleTypeOptions = getSelectOptions(SCHEDULE_TYPES);
export const timeEntryStatusOptions = getSelectOptions(TIME_ENTRY_STATUS);
export const approvalStatusOptions = getSelectOptions(APPROVAL_STATUS);
export const specialHourTypeOptions = getSelectOptions(SPECIAL_HOUR_TYPES);
export const userRoleOptions = getSelectOptions(USER_ROLES);

