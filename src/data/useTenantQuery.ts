import { useSyncExternalStore } from 'react';
import {
  applyDevicePatches,
  getDevicePatchVersion,
  subscribeDevicePatches,
} from './devicePatch';
import { useTenant } from './tenant';
import type { UseQueryResult } from './types';
import { useQuery } from './useQuery';

type TenantQueryOptions<TVars> = {
  variables?: TVars;
  fetchFirst?: boolean;
  queryKey?: string;
  scope?: string;
};

export function useTenantQuery<TData, TVars extends Record<string, unknown>>(
  query: string,
  options: TenantQueryOptions<TVars> = {},
): UseQueryResult<TData, TVars & { tenantId: string }> {
  const { tenantId } = useTenant();
  const variables = { ...options.variables, tenantId } as TVars & { tenantId: string };
  const scope = options.scope ? `${tenantId}:${options.scope}` : tenantId;

  const result = useQuery<TData, TVars & { tenantId: string }>(query, {
    variables,
    fetchFirst: options.fetchFirst,
    queryKey: options.queryKey,
    scope,
  });

  useSyncExternalStore(subscribeDevicePatches, getDevicePatchVersion, getDevicePatchVersion);
  const data = applyDevicePatches(result.data, tenantId);

  return { ...result, data };
}
