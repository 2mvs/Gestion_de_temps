// Constantes pour correspondre exactement aux enums du backend Prisma

export const ABSENCE_TYPES = {
  CONGES: { value: 'CONGES', label: 'Congés' },
  CONGE_MALADIE: { value: 'CONGE_MALADIE', label: 'Maladie' },
  PERSONNEL: { value: 'PERSONNEL', label: 'Personnel' },
  MATERNITE: { value: 'MATERNITE', label: 'Maternité' },
  PATERNITE: { value: 'PATERNITE', label: 'Paternité' },
  SANS_SOLDE: { value: 'SANS_SOLDE', label: 'Sans solde' },
  AUTRE: { value: 'AUTRE', label: 'Autre' },
} as const;

export const CONTRACT_TYPES = {
  TEMPS_PLEIN: { value: 'TEMPS_PLEIN', label: 'Temps plein' },
  TEMPS_PARTIEL: { value: 'TEMPS_PARTIEL', label: 'Temps partiel' },
  INTERIM: { value: 'INTERIM', label: 'Intérim' },
  CONTRAT: { value: 'CONTRAT', label: 'Contrat' },
} as const;

export const EMPLOYEE_STATUS = {
  ACTIF: { value: 'ACTIF', label: 'Actif' },
  INACTIF: { value: 'INACTIF', label: 'Inactif' },
  SUSPENDU: { value: 'SUSPENDU', label: 'Suspendu' },
  RESILIE: { value: 'RESILIE', label: 'Résilié' },
} as const;

export const GENDER_TYPES = {
  HOMME: { value: 'HOMME', label: 'Homme' },
  FEMME: { value: 'FEMME', label: 'Femme' },
  INCONNU: { value: 'INCONNU', label: 'Non spécifié' },
} as const;

export const SCHEDULE_SLOT_TYPES = {
  FRANCHISE_ENTREE: { value: 'FRANCHISE_ENTREE', label: 'Franchise d\'entrée' },
  PAUSE: { value: 'PAUSE', label: 'Pause' },
  HEURE_SUPPLEMENTAIRE: { value: 'HEURE_SUPPLEMENTAIRE', label: 'Heures supplémentaires' },
  HEURE_SPECIALE: { value: 'HEURE_SPECIALE', label: 'Heures spéciales' },
} as const;

export const TIME_ENTRY_STATUS = {
  EN_ATTENTE: { value: 'EN_ATTENTE', label: 'En attente' },
  TERMINE: { value: 'TERMINE', label: 'Terminé' },
  INCOMPLET: { value: 'INCOMPLET', label: 'Incomplet' },
  ABSENT: { value: 'ABSENT', label: 'Absent' },
} as const;

export const APPROVAL_STATUS = {
  EN_ATTENTE: { value: 'EN_ATTENTE', label: 'En attente' },
  APPROUVE: { value: 'APPROUVE', label: 'Approuvé' },
  REJETE: { value: 'REJETE', label: 'Rejeté' },
} as const;

export const SPECIAL_HOUR_TYPES = {
  FERIE: { value: 'FERIE', label: 'Jour férié' },
  NUIT: { value: 'NUIT', label: 'Nuit' },
  WEEKEND: { value: 'WEEKEND', label: 'Week-end' },
  ASTREINTE: { value: 'ASTREINTE', label: 'Astreinte' },
} as const;

export const USER_ROLES = {
  ADMINISTRATEUR: { value: 'ADMINISTRATEUR', label: 'Administrateur' },
  GESTIONNAIRE: { value: 'GESTIONNAIRE', label: 'Gestionnaire' },
  UTILISATEUR: { value: 'UTILISATEUR', label: 'Utilisateur' },
} as const;

// Helper functions to convert to Select options
export const getSelectOptions = (obj: Record<string, { value: string; label: string }>) => {
  return Object.values(obj);
};

export const absenceTypeOptions = getSelectOptions(ABSENCE_TYPES);
export const contractTypeOptions = getSelectOptions(CONTRACT_TYPES);
export const employeeStatusOptions = getSelectOptions(EMPLOYEE_STATUS);
export const genderTypeOptions = getSelectOptions(GENDER_TYPES);
export const timeEntryStatusOptions = getSelectOptions(TIME_ENTRY_STATUS);
export const approvalStatusOptions = getSelectOptions(APPROVAL_STATUS);
export const specialHourTypeOptions = getSelectOptions(SPECIAL_HOUR_TYPES);
export const userRoleOptions = getSelectOptions(USER_ROLES);
export const scheduleSlotTypeOptions = getSelectOptions(SCHEDULE_SLOT_TYPES);

