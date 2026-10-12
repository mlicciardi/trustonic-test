export type Imei = {
  imei?: string | null;
  isPrimary?: boolean | null;
};

export type DeviceState = {
  id: number;
  name?: string | null;
};

export type DevicePolicy = {
  id?: string | null;
  name?: string | null;
  color?: string | null;
} | null;

export type ListDevice = {
  id: string;
  serialNumber?: string | null;
  modelMarketingName?: string | null;
  brandName?: string | null;
  IMEIs?: Imei[] | null;
  state?: DeviceState | null;
  policy?: DevicePolicy;
  lastCheckin?: string | null;
};

export type DeviceListData = {
  listDevices?: {
    pageInfo?: { total_count?: number | null } | null;
    deviceList?: Array<ListDevice | null> | null;
  } | null;
};

export type DeviceRecord = {
  id: string;
  serialNumber?: string | null;
  deviceBrandName?: string | null;
  deviceModelMarketingName?: string | null;
  imsi?: string | null;
  locale?: string | null;
  firstEnrollAt?: string | null;
  IMEIs?: Imei[] | null;
  state?: DeviceState | null;
  policy?: DevicePolicy;
  lastCheckin?: { label?: string | null; date?: string | null; color?: string | null } | null;
};

export type DeviceDetailData = {
  deviceDetail?: DeviceRecord | null;
};

export type HistoryEntry = {
  type?: string | null;
  createdAt?: string | null;
  email?: string | null;
  policyName?: string | null;
  nextPolicyName?: string | null;
  actionName?: string | null;
};

export type HistoryData = {
  listDeviceHistory?: {
    pageInfo?: { total_count?: number | null } | null;
    histories?: Array<HistoryEntry | null> | null;
  } | null;
};

export type AvailableAction = {
  id: string;
  actionName?: string | null;
  policyName?: string | null;
  stateId?: number | null;
};

export type ActionsData = {
  listAvailableActions?: Array<AvailableAction | null> | null;
};

export type AssignActionData = {
  assignAction?: boolean | null;
};
