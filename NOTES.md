# Notes

## Race condition

Each `useQuery` instance keeps a generation counter. Starting a fetch increments it, and a resolved response writes hook state only if that generation is still the latest one. Changing variables (a fast search, or selecting device B while device A's detail is in flight) increments the counter in the effect cleanup, so the slower response can still arrive and fill its own cache entry, but it cannot call `setData`. Debounce only shrinks how often those requests start. The same rule sits inside the hook: call sites do not pass abort signals around.

A module-level flight map also joins two callers that ask for the same query and variables in the same tick into one `fetch`. A forced refetch bumps a per-key token so an older response for that same key cannot commit.

## Tenant id

`tenantId` is React context (`TenantProvider`). `useTenantQuery` and `useTenantMutation` read it and merge it into variables. No screen passes it. The hooks throw if they are rendered outside the provider, which is the bug the mock's "tenantId is required" error would otherwise be papering over.

The cache key includes the variables, so a later read for tenant-beta does not return tenant-alpha's payload. That is not sufficient on its own. The hook's `useState` would keep showing alpha until beta's response landed. `useTenantQuery` therefore passes the tenant as `scope`. When `scope` changes, `useQuery` clears `data` and `errors` during render, before paint. The list is also keyed by tenant and the open device is cleared in the same click as the switch, so the detail panel unmounts in that commit.

After the switch, the previous tenant is still in three places, none of which are on screen: the module cache (keyed with the old `tenantId`, and not garbage-collected), an in-flight response that may still commit into that old key, and any lock overlay for that tenant. Overlays are applied only when their tenant matches the one the hook is rendering.

Reading `tenantId` from a module variable would have skipped the provider and the render. The value closed over by a fetch could then disagree with the tenant the tree was showing, and a context update would not rerun the hook.

## Cache TTL

15 seconds (`CACHE_TTL_MS`).

A fresh entry is reused, so opening a device and going back, or React Strict Mode remounting, does not start a second request. Fifteen seconds is comfortably longer than the mock's worst latency (1.2s), so a response that just landed is actually reusable, and short enough that a list left up across a short interruption is refetched. Same-tick dedupe does not depend on the TTL; the TTL is only about reuse after the response has been stored.

Locks do not wait for it. A successful lock patches the device in place and invalidates that device's detail and history keys.

## Optimistic lock

The list query and the detail query each own their `data`. The mutation cannot see either. I did not lift both results into a parent (that parent would reimplement search, pagination, and history) and I did not refetch `listDevices` (that is the sledgehammer, and it is not optimistic).

What I did instead is a session overlay, `devicePatch`, keyed by `tenantId:deviceId`. `useTenantQuery` runs every payload through it, so the list row and the detail panel both render the destination state as soon as the click happens. The action id and destination state come from `listAvailableActions`; the button is not hardcoded to `act-lock`. While the mutation is in flight the badge says "confirming", because the new state is a prediction. `throwError: true` is what makes rollback a `catch`: the default swallows GraphQL errors into `errors` and returns `undefined`, which is the right shape for an inline form and the wrong shape for "undo the prediction if this throws". On failure the overlay write is reverted and the message is shown. On success the overlay stays (the server agreed), its pending flag drops, and only `detail:${tenant}:${device}` and `history:${tenant}:${device}` are invalidated. The list is not refetched. The new history row appears when that device's history query returns — I did not invent a timestamp or an operator email.

`queryKey` carries the device id for detail and history, which is what makes that invalidation targeted. The list key is `list:${tenantId}` and does not name a device, because one entry holds a page of them. The overlay is how the row still updates. A normalised store would record `Device:dev-0042 → cache keys` at write time and invalidate by entity. I would add that index before trying to patch arbitrary list pages by walking JSON.

## Partial `data` + `errors`

Both are stored. `useQuery` never takes the branch that drops `data` when `errors` is non-empty. `SN-0000-POISON` (tenant-alpha) renders the device with IMSI and policy shown as "Unavailable", and a warning that quotes the two field errors. The rest of the record stays. A history failure uses a different hook, so it cannot clear that panel.

While a refetch is in flight, previous rows stay on screen (otherwise the list blanks on every debounced search). The exception is a scope change — tenant, or the open device — which clears immediately. An error-only body (no `data`) keeps the previous payload and surfaces the errors above it, so a failed refresh does not wipe a good page.

## Left undone

Consciously not built: normalised entity storage, cache eviction, subscriptions, refetch-on-focus, retry with backoff, Suspense. The overlay is not retired when a later payload already contains the new state, and the module cache grows for the session.

The pasted handlers are unchanged apart from a `// @ts-nocheck` line. MSW 2.15's GraphQL resolver types reject the exercise's `gqlError` helper (`HttpResponse<JsonBodyType>` is not assignable to the operation response). I did not change the mock's behaviour to satisfy the checker.

The search box sends digits as `imei` and anything else as `serialNumber`. The mock ANDs those arguments, so one field cannot match either column. Next change would be a single search variable on the query.

`listAvailableActions` also returns unlock and release. Only lock is wired. The destination state name is a local map from `stateId`, because the action payload does not include it. The action's policy color is not invented; the detail refetch fills the real policy in, and the list does not display policy.

The failure path (lock rejected because the device is already `LOCKED`) is implemented and rolls the overlay back, but the UI will not offer that action for a device the server already reports as locked. The automated test covers the race in 2.2 rather than that rollback.
