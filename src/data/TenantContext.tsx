import { useMemo, useState, type ReactNode } from 'react';
import { TenantContext, type TenantId } from './tenant';

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantId] = useState<TenantId>('tenant-alpha');
  const value = useMemo(() => ({ tenantId, setTenantId }), [tenantId]);
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}
