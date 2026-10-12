// TODO: index cache entries by device id, drop a patch once a refetch already has the new state, and evict unused entries.

export type DevicePatch = {
  tenantId: string;
  deviceId: string;
  state: { id: number; name: string };
  policyName: string;
  pending: boolean;
};

type PatchableDevice = {
  id?: string;
  state?: { id: number; name?: string | null } | null;
  policy?: { id?: string | null; name?: string | null; color?: string | null } | null;
};

const patches = new Map<string, DevicePatch>();
const listeners = new Set<() => void>();
let version = 0;

function patchKey(tenantId: string, deviceId: string): string {
  return `${tenantId}:${deviceId}`;
}

function emit(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function subscribeDevicePatches(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDevicePatchVersion(): number {
  return version;
}

export function isDevicePatchPending(tenantId: string, deviceId: string): boolean {
  return patches.get(patchKey(tenantId, deviceId))?.pending ?? false;
}

export function applyDevicePatch(patch: DevicePatch): () => void {
  const key = patchKey(patch.tenantId, patch.deviceId);
  const previous = patches.get(key);
  patches.set(key, patch);
  emit();
  return () => {
    if (patches.get(key) !== patch) return;
    if (previous) patches.set(key, previous);
    else patches.delete(key);
    emit();
  };
}

export function settleDevicePatch(tenantId: string, deviceId: string): void {
  const key = patchKey(tenantId, deviceId);
  const current = patches.get(key);
  if (!current?.pending) return;
  patches.set(key, { ...current, pending: false });
  emit();
}

function patchRecord<T extends PatchableDevice>(device: T, patch: DevicePatch): T {
  if (device.id !== patch.deviceId) return device;
  const policy = device.policy ? { ...device.policy, name: patch.policyName } : { name: patch.policyName };
  return { ...device, state: patch.state, policy };
}

export function applyDevicePatches<T>(data: T, tenantId: string): T {
  if (!data || typeof data !== 'object' || patches.size === 0) return data;

  const relevant = [...patches.values()].filter((patch) => patch.tenantId === tenantId);
  if (relevant.length === 0) return data;

  let next = data as Record<string, unknown>;
  let changed = false;

  for (const patch of relevant) {
    const detail = next.deviceDetail;
    if (isDevice(detail) && detail.id === patch.deviceId) {
      next = { ...next, deviceDetail: patchRecord(detail, patch) };
      changed = true;
    }

    const list = next.listDevices;
    if (!list || typeof list !== 'object' || !('deviceList' in list)) continue;
    const deviceList = (list as { deviceList?: unknown }).deviceList;
    if (!Array.isArray(deviceList)) continue;

    let listChanged = false;
    const mapped = deviceList.map((item) => {
      if (!isDevice(item)) return item;
      const updated = patchRecord(item, patch);
      if (updated !== item) listChanged = true;
      return updated;
    });
    if (listChanged) {
      next = { ...next, listDevices: { ...(list as object), deviceList: mapped } };
      changed = true;
    }
  }

  return (changed ? next : data) as T;
}

function isDevice(value: unknown): value is PatchableDevice {
  return Boolean(value) && typeof value === 'object';
}
