import { renderHook, waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { act } from 'react';
import { expect, it } from 'vitest';
import { server } from '../test/server';
import { useQuery } from './useQuery';

const endpoint = graphql.link('http://localhost:3000/graphql');

const LIST_DEVICES = /* GraphQL */ `
  query ListDevices($tenantId: String, $serialNumber: String) {
    listDevices(tenantId: $tenantId, serialNumber: $serialNumber) {
      pageInfo {
        total_count
      }
      deviceList {
        id
      }
    }
  }
`;

type ListData = {
  listDevices: {
    pageInfo: { total_count: number };
    deviceList: Array<{ id: string }>;
  };
};

type ListVars = {
  tenantId: string;
  serialNumber: string;
};

it('ignores a stale list response that resolves after a newer one', async () => {
  let releaseSlow: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    releaseSlow = resolve;
  });
  let staleDelivered = false;

  server.use(
    endpoint.query('ListDevices', async ({ variables }) => {
      if (variables.serialNumber === 'slow') {
        await gate;
        staleDelivered = true;
        return HttpResponse.json({
          data: {
            listDevices: {
              pageInfo: { total_count: 1 },
              deviceList: [{ id: 'stale' }],
            },
          },
        });
      }

      return HttpResponse.json({
        data: {
          listDevices: {
            pageInfo: { total_count: 1 },
            deviceList: [{ id: 'fresh' }],
          },
        },
      });
    }),
  );

  const { result, rerender } = renderHook(
    ({ serialNumber }: { serialNumber: string }) =>
      useQuery<ListData, ListVars>(LIST_DEVICES, {
        variables: { tenantId: 'tenant-alpha', serialNumber },
        fetchFirst: true,
        queryKey: 'race-list',
      }),
    { initialProps: { serialNumber: 'slow' } },
  );

  await waitFor(() => {
    expect(result.current.loading).toBe(true);
  });

  rerender({ serialNumber: 'fast' });

  await waitFor(() => {
    expect(result.current.data?.listDevices.deviceList[0]?.id).toBe('fresh');
  });

  await act(async () => {
    releaseSlow();
  });

  await waitFor(() => {
    expect(staleDelivered).toBe(true);
  });
  expect(result.current.data?.listDevices.deviceList[0]?.id).toBe('fresh');
  expect(result.current.errors).toEqual([]);
});
