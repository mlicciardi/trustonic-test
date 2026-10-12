export type UseQueryResult<TData, TVars> = {
  loading: boolean;
  errors: string[];
  data: TData | undefined;
  refetch: (variables?: TVars, replace?: boolean) => Promise<void>;
  reset: (queryKey?: string) => void;
};

export type UseQueryOptions<TVars> = {
  variables?: TVars;
  fetchFirst?: boolean;
  queryKey?: string;
  scope?: string;
};

export type UseMutationResult<TData, TVars> = {
  loading: boolean;
  errors: string[];
  mutateData: (variables?: TVars, replace?: boolean) => Promise<TData | undefined>;
};

export type UseMutationOptions<TVars> = {
  variables?: TVars;
  throwError?: boolean;
};

export type GraphQLResult<T> = {
  data: T | undefined;
  errors: string[];
};
