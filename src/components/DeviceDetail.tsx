import { useState } from 'react';
import { isDevicePatchPending } from '../data/devicePatch';
import { useTenant } from '../data/tenant';
import { useLockDevice } from '../data/useLockDevice';
import { useTenantQuery } from '../data/useTenantQuery';
import {
  HISTORY_PAGE_SIZE,
  formatTimestamp,
  primaryImei,
  stateClass,
} from '../domain/device';
import type { ActionsData, DeviceDetailData, HistoryData, HistoryEntry } from '../domain/types';
import { DEVICE_DETAIL, LIST_AVAILABLE_ACTIONS, LIST_DEVICE_HISTORY } from '../graphql/documents';
import { Pagination } from './Pagination';
import { QueryNotice } from './QueryNotice';

type DeviceDetailProps = {
  deviceId: string;
};

function missingField(value: string | null | undefined, hasErrors: boolean): string {
  if (value) return value;
  return hasErrors ? 'Unavailable' : '—';
}

export function DeviceDetailPanel({ deviceId }: DeviceDetailProps) {
  const { tenantId } = useTenant();
  const [historyPage, setHistoryPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const { lockDevice, loading: locking } = useLockDevice();

  const detail = useTenantQuery<DeviceDetailData, { deviceId: string }>(DEVICE_DETAIL, {
    variables: { deviceId },
    fetchFirst: true,
    queryKey: `detail:${tenantId}:${deviceId}`,
    scope: deviceId,
  });

  const device = detail.data?.deviceDetail;
  const stateId = device?.state?.id;
  const pending = device ? isDevicePatchPending(tenantId, device.id) : false;

  const history = useTenantQuery<HistoryData, { deviceId: string; page: number; pageSize: number }>(
    LIST_DEVICE_HISTORY,
    {
      variables: { deviceId, page: historyPage, pageSize: HISTORY_PAGE_SIZE },
      fetchFirst: true,
      queryKey: `history:${tenantId}:${deviceId}`,
      scope: `${deviceId}:${historyPage}`,
    },
  );

  const actions = useTenantQuery<ActionsData, { stateId?: string }>(LIST_AVAILABLE_ACTIONS, {
    variables: { stateId: stateId == null ? undefined : String(stateId) },
    fetchFirst: stateId != null,
    queryKey: `actions:${tenantId}:${deviceId}:${stateId ?? 'none'}`,
    scope: `${deviceId}:${stateId ?? 'none'}`,
  });

  const histories = (history.data?.listDeviceHistory?.histories ?? []).filter(
    (entry): entry is HistoryEntry => Boolean(entry),
  );
  const reportedHistoryTotal = history.data?.listDeviceHistory?.pageInfo?.total_count;
  const [seenHistoryTotal, setSeenHistoryTotal] = useState(0);
  if (typeof reportedHistoryTotal === 'number' && reportedHistoryTotal !== seenHistoryTotal) {
    setSeenHistoryTotal(reportedHistoryTotal);
  }
  const historyTotal = typeof reportedHistoryTotal === 'number' ? reportedHistoryTotal : seenHistoryTotal;
  const lockAction = actions.data?.listAvailableActions?.find(
    (action) => action?.actionName === 'Lock device' && action.stateId != null,
  );
  const detailErrors = detail.errors;
  const partial = detailErrors.length > 0 && device != null;

  async function onLock() {
    if (!device || !lockAction?.id || lockAction.stateId == null || locking || pending) return;
    setActionError(null);
    try {
      await lockDevice(device.id, {
        id: lockAction.id,
        stateId: lockAction.stateId,
        policyName: lockAction.policyName ?? 'Updated policy',
      });
      setHistoryPage(1);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Lock failed');
    }
  }

  return (
    <section className="panel detail-panel" aria-busy={detail.loading}>
      <header className="panel-header">
        <h2>Device</h2>
      </header>

      <QueryNotice
        loading={detail.loading}
        errors={detail.errors}
        hasData={device != null}
        loadingLabel="Loading device…"
        updatingLabel="Refreshing device…"
      />

      {device ? (
        <div className="detail-body">
          <div className="detail-title">
            <div>
              <p className="serial">{device.serialNumber ?? '—'}</p>
              <p className="muted">
                {[device.deviceBrandName, device.deviceModelMarketingName].filter(Boolean).join(' ') ||
                  'Unknown model'}
              </p>
            </div>
            <span className={stateClass(device.state?.name)}>
              {device.state?.name ?? '—'}
              {pending ? <span className="pending"> confirming</span> : null}
            </span>
          </div>

          {pending ? (
            <p className="status" role="status">
              Lock submitted. Waiting for the server to confirm.
            </p>
          ) : null}

          <dl className="facts">
            <div>
              <dt>Primary IMEI</dt>
              <dd className="mono">{primaryImei(device.IMEIs)}</dd>
            </div>
            <div>
              <dt>IMSI</dt>
              <dd className="mono">{missingField(device.imsi, partial)}</dd>
            </div>
            <div>
              <dt>Policy</dt>
              <dd>
                {device.policy?.color ? (
                  <span className="swatch" style={{ background: device.policy.color }} />
                ) : null}
                {device.policy?.name ?? (partial ? 'Unavailable' : '—')}
              </dd>
            </div>
            <div>
              <dt>Locale</dt>
              <dd>{device.locale ?? '—'}</dd>
            </div>
            <div>
              <dt>{device.lastCheckin?.label ?? 'Last check-in'}</dt>
              <dd>{formatTimestamp(device.lastCheckin?.date)}</dd>
            </div>
            <div>
              <dt>First enrolled</dt>
              <dd>{formatTimestamp(device.firstEnrollAt)}</dd>
            </div>
          </dl>

          <div className="lock-row">
            {lockAction ? (
              <button type="button" onClick={() => void onLock()} disabled={locking || pending}>
                {locking || pending ? 'Locking…' : 'Lock device'}
              </button>
            ) : null}
            {!lockAction && !actions.loading && !pending && !locking && stateId != null ? (
              <p className="muted">No lock action is available for this state.</p>
            ) : null}
            {actions.loading && !actions.data ? (
              <p className="status" role="status">
                Loading actions…
              </p>
            ) : null}
            {actions.errors.length > 0 ? (
              <p className="banner error" role="alert">
                {actions.errors.join(' ')}
              </p>
            ) : null}
            {actionError ? (
              <p className="banner error" role="alert">
                {actionError}
              </p>
            ) : null}
          </div>

          <div className="history">
            <h3>History</h3>
            <QueryNotice
              loading={history.loading}
              errors={history.errors}
              hasData={history.data !== undefined}
              loadingLabel="Loading history…"
              updatingLabel="Updating history…"
            />
            {!history.loading && history.data && histories.length === 0 ? (
              <p className="empty">No history for this device.</p>
            ) : null}
            {histories.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Policy</th>
                      <th>Operator</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {histories.map((entry, index) => (
                      <tr key={`${entry.createdAt ?? 'row'}-${index}`}>
                        <td>
                          <div>{entry.type ?? '—'}</div>
                          {entry.actionName ? <div className="muted">{entry.actionName}</div> : null}
                        </td>
                        <td>
                          {entry.policyName ?? '—'} → {entry.nextPolicyName ?? '—'}
                        </td>
                        <td>{entry.email ?? '—'}</td>
                        <td>{formatTimestamp(entry.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {history.data !== undefined || historyTotal > 0 ? (
              <Pagination
                page={historyPage}
                pageSize={HISTORY_PAGE_SIZE}
                total={historyTotal}
                onPageChange={setHistoryPage}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
