import { useEffect, useRef, useState } from 'react';
import {
  abortCacheKey,
  cacheKeyFor,
  commitResult,
  fetchShared,
  onInvalidate,
  onReset,
  readFresh,
  resetQueryKey,
} from './cache';
import { graphqlRequest, isAbortError } from './graphqlClient';
import type { UseQueryOptions, UseQueryResult } from './types';

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, unknown>;
}

export function useQuery<TData, TVars>(
  query: string,
  options: UseQueryOptions<TVars> = {},
): UseQueryResult<TData, TVars> {
  const fetchFirst = options.fetchFirst ?? false;
  const { queryKey, scope } = options;
  const variables = options.variables;

  const cacheKey = cacheKeyFor(query, variables ?? {});
  const fresh = readFresh<TData>(cacheKey);

  const [data, setData] = useState<TData | undefined>(() => fresh?.data);
  const [errors, setErrors] = useState<string[]>(() => fresh?.errors ?? []);
  const [loading, setLoading] = useState(() => fetchFirst && !fresh);

  const [tracked, setTracked] = useState({ cacheKey, scope });
  if (tracked.cacheKey !== cacheKey || tracked.scope !== scope) {
    const scopeChanged = tracked.scope !== scope;
    const nextFresh = readFresh<TData>(cacheKey);
    setTracked({ cacheKey, scope });
    if (scopeChanged) {
      setData(nextFresh?.data);
      setErrors(nextFresh?.errors ?? []);
      setLoading(fetchFirst && !nextFresh);
    } else if (nextFresh) {
      setData(nextFresh.data);
      setErrors(nextFresh.errors);
      setLoading(false);
    } else {
      setLoading(fetchFirst);
      setErrors([]);
    }
  }

  const requestId = useRef(0);
  const variablesRef = useRef(variables);
  const queryRef = useRef(query);
  const queryKeyRef = useRef(queryKey);
  const cacheKeyRef = useRef(cacheKey);
  const executeRef = useRef<(vars: TVars | undefined, force: boolean) => Promise<void>>(
    async () => {},
  );

  useEffect(() => {
    variablesRef.current = variables;
    queryRef.current = query;
    queryKeyRef.current = queryKey;
    cacheKeyRef.current = cacheKey;

    executeRef.current = async (vars, force) => {
      const id = ++requestId.current;
      const key = cacheKeyFor(queryRef.current, vars ?? {});
      const activeQueryKey = queryKeyRef.current;

      if (!force) {
        const cached = readFresh<TData>(key);
        if (cached) {
          setData(cached.data);
          setErrors(cached.errors);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      setErrors([]);

      const flight = fetchShared({
        cacheKey: key,
        queryKey: activeQueryKey,
        force,
        start: (signal) => graphqlRequest<TData>(queryRef.current, asRecord(vars), signal),
      });

      try {
        const result = await flight.promise;
        const committed = commitResult(key, flight.token, result, activeQueryKey);
        if (requestId.current !== id) return;
        if (!committed) {
          setLoading(false);
          return;
        }
        if (committed.data !== undefined) {
          setData(committed.data);
        }
        setErrors(committed.errors);
        setLoading(false);
      } catch (error) {
        if (requestId.current !== id) return;
        if (isAbortError(error)) {
          setLoading(false);
          return;
        }
        setErrors([error instanceof Error ? error.message : 'Request failed']);
        setLoading(false);
      }
    };
  });

  useEffect(() => {
    if (!fetchFirst) return undefined;
    if (readFresh(cacheKey)) return undefined;
    void executeRef.current(variablesRef.current, false);
    return () => {
      requestId.current += 1;
    };
  }, [fetchFirst, cacheKey]);

  useEffect(() => {
    if (!queryKey) return undefined;
    return onInvalidate(queryKey, () => {
      void executeRef.current(variablesRef.current, true);
    });
  }, [queryKey]);

  useEffect(() => {
    if (!queryKey) return undefined;
    return onReset(queryKey, () => {
      requestId.current += 1;
      setData(undefined);
      setErrors([]);
      setLoading(false);
    });
  }, [queryKey]);

  function refetch(next?: TVars, replace = false) {
    const base = (variablesRef.current ?? {}) as TVars;
    const merged = (replace ? (next ?? ({} as TVars)) : { ...base, ...next }) as TVars;
    return executeRef.current(merged, true);
  }

  function reset(key?: string) {
    const target = key ?? queryKeyRef.current;
    if (target) {
      resetQueryKey(target);
      return;
    }
    requestId.current += 1;
    abortCacheKey(cacheKeyRef.current);
    setData(undefined);
    setErrors([]);
    setLoading(false);
  }

  return { loading, errors, data, refetch, reset };
}
