import { useState } from 'react';
import { isDevicePatchPending } from '../data/devicePatch';
import { useTenant } from '../data/tenant';
import { useTenantQuery } from '../data/useTenantQuery';
import {
  DEVICE_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  STATE_OPTIONS,
  formatTimestamp,
  primaryImei,
  searchVariables,
  stateClass,
} from '../domain/device';
import type { DeviceListData, ListDevice } from '../domain/types';
import { LIST_DEVICES } from '../graphql/documents';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { Pagination } from './Pagination';
import { QueryNotice } from './QueryNotice';

type DeviceListProps = {
  selectedId: string | null;
  onSelect: (deviceId: string) => void;
};

export function DeviceList({ selectedId, onSelect }: DeviceListProps) {
  const { tenantId } = useTenant();
  const [search, setSearch] = useState('');
  const [stateId, setStateId] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  const filterKey = `${debouncedSearch}\n${stateId ?? ''}`;
  const [appliedFilter, setAppliedFilter] = useState(filterKey);
  let currentPage = page;
  if (appliedFilter !== filterKey) {
    setAppliedFilter(filterKey);
    currentPage = 1;
    if (page !== 1) setPage(1);
  }

  const list = useTenantQuery<
    DeviceListData,
    {
      imei?: string;
      serialNumber?: string;
      stateId?: number;
      page: number;
      pageSize: number;
    }
  >(LIST_DEVICES, {
    variables: {
      ...searchVariables(debouncedSearch),
      stateId,
      page: currentPage,
      pageSize: DEVICE_PAGE_SIZE,
    },
    fetchFirst: true,
    queryKey: `list:${tenantId}`,
  });

  const rows = (list.data?.listDevices?.deviceList ?? []).filter((device): device is ListDevice =>
    Boolean(device?.id),
  );
  const total = list.data?.listDevices?.pageInfo?.total_count ?? 0;
  const hasData = list.data !== undefined;

  return (
    <section className="panel" aria-busy={list.loading}>
      <header className="panel-header">
        <h2>Devices</h2>
        <form
          className="filters"
          role="search"
          onSubmit={(event) => event.preventDefault()}
        >
          <label>
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Serial number or IMEI"
              autoComplete="off"
            />
          </label>
          <label>
            State
            <select
              value={stateId ?? ''}
              onChange={(event) => {
                const value = event.target.value;
                setStateId(value ? Number(value) : undefined);
              }}
            >
              <option value="">All states</option>
              {STATE_OPTIONS.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.name}
                </option>
              ))}
            </select>
          </label>
        </form>
        <p className="hint">Digits match IMEI. Any other text matches the serial number.</p>
      </header>

      <QueryNotice
        loading={list.loading}
        errors={list.errors}
        hasData={hasData}
        loadingLabel="Loading devices…"
        updatingLabel="Updating results…"
      />

      {!list.loading && hasData && rows.length === 0 ? (
        <p className="empty">No devices match these filters.</p>
      ) : null}

      {rows.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Serial</th>
                <th>Primary IMEI</th>
                <th>Model</th>
                <th>State</th>
                <th>Last check-in</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((device) => {
                const pending = isDevicePatchPending(tenantId, device.id);
                const stateName = device.state?.name ?? '—';
                return (
                  <tr
                    key={device.id}
                    role="button"
                    aria-label={device.serialNumber ?? device.id}
                    className={device.id === selectedId ? 'selected' : undefined}
                    aria-selected={device.id === selectedId}
                    tabIndex={0}
                    onClick={() => onSelect(device.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelect(device.id);
                      }
                    }}
                  >
                    <td>{device.serialNumber ?? '—'}</td>
                    <td className="mono">{primaryImei(device.IMEIs)}</td>
                    <td>
                      <div>{device.modelMarketingName ?? '—'}</div>
                      {device.brandName ? <div className="muted">{device.brandName}</div> : null}
                    </td>
                    <td>
                      <span className={stateClass(device.state?.name)}>
                        {stateName}
                        {pending ? <span className="pending"> confirming</span> : null}
                      </span>
                    </td>
                    <td>{formatTimestamp(device.lastCheckin)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {hasData ? (
        <Pagination
          page={currentPage}
          pageSize={DEVICE_PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      ) : null}
    </section>
  );
}
