import type { GraphQLResult } from './types';

export const GRAPHQL_ENDPOINT = 'http://localhost:3000/graphql';

export class GraphQLRequestError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super(errors.join('; ') || 'GraphQL error');
    this.name = 'GraphQLRequestError';
    this.errors = errors;
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

export async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<GraphQLResult<T>> {
  let response: Response;
  try {
    response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables }),
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new Error(error instanceof Error ? error.message : 'Network request failed');
  }

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  const body = (await response.json()) as GraphQLResponse<T>;
  const errors = (body.errors ?? [])
    .map((error) => error.message)
    .filter((message): message is string => Boolean(message));

  return { data: body.data, errors };
}
