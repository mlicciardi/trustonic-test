import { useState } from 'react';
import { DeviceDetailPanel } from './components/DeviceDetail';
import { DeviceList } from './components/DeviceList';
import { TenantProvider } from './data/TenantContext';
import { TENANTS, useTenant, type TenantId } from './data/tenant';

export default function App() {
  return (
    <TenantProvider>
      <Console />
    </TenantProvider>
  );
}

function Console() {
  const { tenantId, setTenantId } = useTenant();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function switchTenant(next: TenantId) {
    setTenantId(next);
    setSelectedId(null);
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">ALPS</p>
          <h1>Device console</h1>
        </div>
        <div className="tenant-switch" role="group" aria-label="Tenant">
          {TENANTS.map((tenant) => (
            <button
              key={tenant.id}
              type="button"
              aria-pressed={tenant.id === tenantId}
              onClick={() => switchTenant(tenant.id)}
            >
              {tenant.label}
            </button>
          ))}
        </div>
      </header>

      <main className="layout">
        <DeviceList key={tenantId} selectedId={selectedId} onSelect={setSelectedId} />
        {selectedId ? (
          <DeviceDetailPanel key={selectedId} deviceId={selectedId} />
        ) : (
          <section className="panel detail-panel">
            <header className="panel-header">
              <h2>Device</h2>
            </header>
            <p className="empty">Select a device to see its record and history.</p>
          </section>
        )}
      </main>
    </div>
  );
}
