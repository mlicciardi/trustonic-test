import { useCallback } from 'react';
import { useTenant } from './tenant';
import type { UseMutationResult } from './types';
import { useMutation } from './useMutation';

type TenantMutationOptions<TVars> = {
  variables?: TVars;
  throwError?: boolean;
};

export function useTenantMutation<TData, TVars extends Record<string, unknown>>(
  query: string,
  options: TenantMutationOptions<TVars> = {},
): UseMutationResult<TData, TVars> {
  const { tenantId } = useTenant();
  const { loading, errors, mutateData } = useMutation<TData, TVars & { tenantId: string }>(query, {
    variables: { ...options.variables, tenantId } as TVars & { tenantId: string },
    throwError: options.throwError,
  });

  const mutateWithTenant = useCallback(
    (variables?: TVars, replace = false) => {
      if (replace) {
        return mutateData({ ...(variables ?? ({} as TVars)), tenantId }, true);
      }
      return mutateData(variables as (TVars & { tenantId: string }) | undefined, false);
    },
    [mutateData, tenantId],
  );

  return { loading, errors, mutateData: mutateWithTenant };
}
