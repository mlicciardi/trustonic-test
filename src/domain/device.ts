export const DEVICE_PAGE_SIZE = 10;
export const HISTORY_PAGE_SIZE = 5;
export const SEARCH_DEBOUNCE_MS = 300;

export const STATE_OPTIONS = [
  { id: 1, name: 'ENROLLED' },
  { id: 2, name: 'ACTIVE' },
  { id: 3, name: 'LOCKED' },
  { id: 4, name: 'RELEASED' },
] as const;

export function stateName(id: number): string {
  return STATE_OPTIONS.find((state) => state.id === id)?.name ?? `STATE_${id}`;
}

export function stateClass(name: string | null | undefined): string {
  switch (name) {
    case 'ENROLLED':
      return 'state state-enrolled';
    case 'ACTIVE':
      return 'state state-active';
    case 'LOCKED':
      return 'state state-locked';
    case 'RELEASED':
      return 'state state-released';
    default:
      return 'state';
  }
}

type ImeiLike = { imei?: string | null; isPrimary?: boolean | null };

export function primaryImei(imeis: ImeiLike[] | null | undefined): string {
  if (!imeis?.length) return '—';
  return imeis.find((item) => item.isPrimary)?.imei ?? imeis[0]?.imei ?? '—';
}

export function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

// TODO: one search variable. The mock ANDs imei and serialNumber, so digits go to IMEI and anything else to serial.
export function searchVariables(term: string): { imei?: string; serialNumber?: string } {
  const trimmed = term.trim();
  if (!trimmed) return {};
  if (/^\d+$/.test(trimmed)) return { imei: trimmed };
  return { serialNumber: trimmed };
}

export function pageCount(total: number, pageSize: number): number {
  if (total <= 0 || pageSize <= 0) return 0;
  return Math.ceil(total / pageSize);
}
