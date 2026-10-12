import { useCallback } from 'react';
import { invalidateQueryKey } from './cache';
import { applyDevicePatch, settleDevicePatch } from './devicePatch';
import { useTenant } from './tenant';
import { useTenantMutation } from './useTenantMutation';
import { ASSIGN_ACTION } from '../graphql/documents';
import { stateName } from '../domain/device';
import type { AssignActionData } from '../domain/types';

type LockAction = {
  id: string;
  stateId: number;
  policyName: string;
};

export function useLockDevice() {
  const { tenantId } = useTenant();
  const { mutateData, loading, errors } = useTenantMutation<
    AssignActionData,
    { deviceId: string; actionId: string }
  >(ASSIGN_ACTION, { throwError: true });

  const lockDevice = useCallback(
    async (deviceId: string, action: LockAction) => {
      const rollback = applyDevicePatch({
        tenantId,
        deviceId,
        state: { id: action.stateId, name: stateName(action.stateId) },
        policyName: action.policyName,
        pending: true,
      });

      try {
        const result = await mutateData({ deviceId, actionId: action.id });
        if (!result?.assignAction) {
          throw new Error('Lock was not applied');
        }
        settleDevicePatch(tenantId, deviceId);
        invalidateQueryKey(`detail:${tenantId}:${deviceId}`);
        invalidateQueryKey(`history:${tenantId}:${deviceId}`);
      } catch (error) {
        rollback();
        throw error;
      }
    },
    [mutateData, tenantId],
  );

  return { lockDevice, loading, errors };
}
