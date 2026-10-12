import { createContext, useContext } from 'react';

export const TENANTS = [
  { id: 'tenant-alpha', label: 'Alpha' },
  { id: 'tenant-beta', label: 'Beta' },
] as const;

export type TenantId = (typeof TENANTS)[number]['id'];

export type TenantContextValue = {
  tenantId: TenantId;
  setTenantId: (tenantId: TenantId) => void;
};

export const TenantContext = createContext<TenantContextValue | null>(null);

export function useTenant(): TenantContextValue {
  const value = useContext(TenantContext);
  if (!value) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return value;
}
