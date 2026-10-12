import { useCallback, useEffect, useRef, useState } from 'react';
import { GraphQLRequestError, graphqlRequest } from './graphqlClient';
import type { UseMutationOptions, UseMutationResult } from './types';

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, unknown>;
}

export function useMutation<TData, TVars>(
  query: string,
  options: UseMutationOptions<TVars> = {},
): UseMutationResult<TData, TVars> {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const optionsRef = useRef(options);
  const queryRef = useRef(query);

  useEffect(() => {
    optionsRef.current = options;
    queryRef.current = query;
  });

  const mutateData = useCallback(async (variables?: TVars, replace = false) => {
    const configured = (optionsRef.current.variables ?? {}) as TVars;
    const resolved = (replace ? (variables ?? ({} as TVars)) : { ...configured, ...variables }) as TVars;

    setLoading(true);
    setErrors([]);

    try {
      const result = await graphqlRequest<TData>(queryRef.current, asRecord(resolved));
      if (result.errors.length > 0) {
        setErrors(result.errors);
        setLoading(false);
        if (optionsRef.current.throwError) {
          throw new GraphQLRequestError(result.errors);
        }
        return undefined;
      }
      setLoading(false);
      return result.data;
    } catch (error) {
      if (error instanceof GraphQLRequestError) throw error;
      const message = error instanceof Error ? error.message : 'Request failed';
      setErrors([message]);
      setLoading(false);
      if (optionsRef.current.throwError) throw error;
      return undefined;
    }
  }, []);

  return { loading, errors, mutateData };
}
