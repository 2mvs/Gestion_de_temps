'use client';

export const setAuthToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
};

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

export const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

export const setUser = (user: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
};

export const getUser = (): any | null => {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
  return null;
};

export const isAuthenticated = (): boolean => {
  return getAuthToken() !== null;
};

// Role helpers
export const isAdmin = (user?: any): boolean => {
  const role = user?.role || getUser()?.role;
  if (!role) return false;
  return ['ADMINISTRATEUR', 'ADMIN', 'ADMINISTRATOR'].includes(role.toString().toUpperCase());
};

export const isManager = (user?: any): boolean => {
  const role = user?.role || getUser()?.role;
  if (!role) return false;
  return ['GESTIONNAIRE', 'MANAGER', 'MANGER'].includes(role.toString().toUpperCase());
};

export const isBasicUser = (user?: any): boolean => {
  const role = user?.role || getUser()?.role;
  if (!role) return false;
  return ['UTILISATEUR', 'USER'].includes(role.toString().toUpperCase());
};

export const hasAnyRole = (roles: string[], user?: any): boolean => {
  const role = (user?.role || getUser()?.role || '').toString().toUpperCase();
  const normalizedRoles = roles
    .map(r => r.toString().toUpperCase())
    .flatMap((r) => {
      if (r === 'ADMINISTRATEUR' || r === 'ADMIN' || r === 'ADMINISTRATOR') {
        return ['ADMINISTRATEUR', 'ADMIN', 'ADMINISTRATOR'];
      }
      if (r === 'GESTIONNAIRE' || r === 'MANAGER' || r === 'MANGER') {
        return ['GESTIONNAIRE', 'MANAGER', 'MANGER'];
      }
      if (r === 'UTILISATEUR' || r === 'USER') {
        return ['UTILISATEUR', 'USER'];
      }
      return [r];
    });
  return normalizedRoles.includes(role);
};

