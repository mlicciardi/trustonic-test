import { stableStringify } from './stable';
import type { GraphQLResult } from './types';

export const CACHE_TTL_MS = 15_000;

type CacheEntry = {
  data: unknown;
  errors: string[];
  fetchedAt: number;
  queryKey?: string;
};

type Flight = {
  promise: Promise<GraphQLResult<unknown>>;
  controller: AbortController;
  token: number;
  queryKey?: string;
};

type InvalidateListener = () => void;
type ResetListener = () => void;

const entries = new Map<string, CacheEntry>();
const flights = new Map<string, Flight>();
const latestToken = new Map<string, number>();
const invalidateListeners = new Map<string, Set<InvalidateListener>>();
const resetListeners = new Map<string, Set<ResetListener>>();

export function cacheKeyFor(query: string, variables: unknown): string {
  return `${query}\n${stableStringify(variables ?? {})}`;
}

export function readFresh<T>(key: string): GraphQLResult<T> | undefined {
  const entry = entries.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return undefined;
  return { data: entry.data as T | undefined, errors: entry.errors };
}

export function fetchShared<T>(options: {
  cacheKey: string;
  queryKey?: string;
  force: boolean;
  start: (signal: AbortSignal) => Promise<GraphQLResult<T>>;
}): { promise: Promise<GraphQLResult<T>>; token: number } {
  const existing = flights.get(options.cacheKey);
  if (existing && !options.force) {
    return {
      promise: existing.promise as Promise<GraphQLResult<T>>,
      token: existing.token,
    };
  }

  if (existing) {
    existing.controller.abort();
    flights.delete(options.cacheKey);
  }

  const token = (latestToken.get(options.cacheKey) ?? 0) + 1;
  latestToken.set(options.cacheKey, token);
  const controller = new AbortController();
  const promise = options.start(controller.signal);
  const flight: Flight = {
    promise: promise as Promise<GraphQLResult<unknown>>,
    controller,
    token,
    queryKey: options.queryKey,
  };
  flights.set(options.cacheKey, flight);
  promise.finally(() => {
    if (flights.get(options.cacheKey)?.token === token) {
      flights.delete(options.cacheKey);
    }
  });
  return { promise, token };
}

export function commitResult<T>(
  cacheKey: string,
  token: number,
  result: GraphQLResult<T>,
  queryKey: string | undefined,
): GraphQLResult<T> | undefined {
  if (latestToken.get(cacheKey) !== token) return undefined;
  entries.set(cacheKey, {
    data: result.data,
    errors: result.errors,
    fetchedAt: Date.now(),
    queryKey,
  });
  return result;
}

export function onInvalidate(queryKey: string, listener: InvalidateListener): () => void {
  return addListener(invalidateListeners, queryKey, listener);
}

export function onReset(queryKey: string, listener: ResetListener): () => void {
  return addListener(resetListeners, queryKey, listener);
}

function addListener<T>(map: Map<string, Set<T>>, queryKey: string, listener: T): () => void {
  let set = map.get(queryKey);
  if (!set) {
    set = new Set();
    map.set(queryKey, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) map.delete(queryKey);
  };
}

export function invalidateQueryKey(queryKey: string): void {
  dropQueryKey(queryKey);
  invalidateListeners.get(queryKey)?.forEach((listener) => listener());
}

export function resetQueryKey(queryKey: string): void {
  dropQueryKey(queryKey);
  resetListeners.get(queryKey)?.forEach((listener) => listener());
}

export function abortCacheKey(cacheKey: string): void {
  const flight = flights.get(cacheKey);
  if (!flight) return;
  flight.controller.abort();
  flights.delete(cacheKey);
  latestToken.set(cacheKey, (latestToken.get(cacheKey) ?? 0) + 1);
}

function dropQueryKey(queryKey: string): void {
  for (const [key, entry] of entries) {
    if (entry.queryKey === queryKey) entries.delete(key);
  }
  for (const [key, flight] of flights) {
    if (flight.queryKey !== queryKey) continue;
    flight.controller.abort();
    flights.delete(key);
    latestToken.set(key, (latestToken.get(key) ?? 0) + 1);
  }
}

export function resetCacheForTests(): void {
  for (const flight of flights.values()) flight.controller.abort();
  entries.clear();
  flights.clear();
  latestToken.clear();
  invalidateListeners.clear();
  resetListeners.clear();
}
