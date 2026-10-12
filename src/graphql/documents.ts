export const LIST_DEVICES = /* GraphQL */ `
  query ListDevices(
    $tenantId: String
    $imei: String
    $serialNumber: String
    $stateId: Int
    $page: Int
    $pageSize: Int
  ) {
    listDevices(
      tenantId: $tenantId
      imei: $imei
      serialNumber: $serialNumber
      stateId: $stateId
      page: $page
      pageSize: $pageSize
    ) {
      pageInfo {
        total_count
      }
      deviceList {
        id
        serialNumber
        modelMarketingName
        brandName
        IMEIs {
          imei
          isPrimary
        }
        state {
          id
          name
        }
        policy {
          id
          name
          color
        }
        lastCheckin
      }
    }
  }
`;

export const DEVICE_DETAIL = /* GraphQL */ `
  query DeviceDetail($tenantId: String!, $deviceId: String!) {
    deviceDetail(tenantId: $tenantId, deviceId: $deviceId) {
      id
      serialNumber
      deviceBrandName
      deviceModelMarketingName
      imsi
      locale
      firstEnrollAt
      IMEIs {
        imei
        isPrimary
      }
      state {
        id
        name
      }
      policy {
        id
        name
        color
      }
      lastCheckin {
        label
        date
        color
      }
    }
  }
`;

export const LIST_DEVICE_HISTORY = /* GraphQL */ `
  query ListDeviceHistory($tenantId: String!, $deviceId: String!, $page: Int, $pageSize: Int) {
    listDeviceHistory(tenantId: $tenantId, deviceId: $deviceId, page: $page, pageSize: $pageSize) {
      pageInfo {
        total_count
      }
      histories {
        type
        createdAt
        email
        policyName
        nextPolicyName
        actionName
      }
    }
  }
`;

export const LIST_AVAILABLE_ACTIONS = /* GraphQL */ `
  query ListAvailableActions($tenantId: String, $stateId: String) {
    listAvailableActions(tenantId: $tenantId, stateId: $stateId) {
      id
      actionName
      policyName
      stateId
    }
  }
`;

export const ASSIGN_ACTION = /* GraphQL */ `
  mutation AssignAction($tenantId: String!, $deviceId: String!, $actionId: String!) {
    assignAction(tenantId: $tenantId, deviceId: $deviceId, actionId: $actionId)
  }
`;
