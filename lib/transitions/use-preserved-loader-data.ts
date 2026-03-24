import { useRef } from "react";
import { useLoaderData, useRouteLoaderData } from "react-router";

/**
 * Returns loader data frozen at mount time.
 * Prevents data from going stale during exit animations
 * (React Router updates loader data immediately on navigation).
 */
export function usePreservedLoaderData<T = unknown>(): T {
  const data = useLoaderData() as T;
  const ref = useRef(data);
  return ref.current;
}

/**
 * Same as usePreservedLoaderData but for a specific route's data.
 */
export function usePreservedRouteLoaderData<T = unknown>(routeId: string): T | undefined {
  const data = useRouteLoaderData(routeId) as T | undefined;
  const ref = useRef(data);
  return ref.current;
}
