import { useRouterState } from '@tanstack/react-router';
import type { JSX, ReactNode } from 'react';
import { useEffect } from 'react';

import { AccessDeniedPage } from '@/features/access-control/AccessDeniedPage.tsx';
import { AccessLoadingState } from '@/features/access-control/AccessLoadingState.tsx';
import { AccessUnavailablePage } from '@/features/access-control/AccessUnavailablePage.tsx';
import { useCapabilities } from '@/hooks/use-capabilities.ts';
import {
  canSatisfyRouteRequirement,
  capabilityRequirementForRoute,
} from '@/lib/capabilities.ts';

export function CapabilityRouteGuard({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const matches = useRouterState({ select: (state) => state.matches });
  const currentMatch = matches.at(-1);
  const required = currentMatch?.routeId
    ? capabilityRequirementForRoute(currentMatch.routeId)
    : null;
  const capabilities = useCapabilities(
    required !== null && required.length > 0,
  );
  const location = useRouterState({ select: (state) => state.location });

  useEffect(() => {
    if (!capabilities.isUnauthorized || typeof window === 'undefined') {
      return;
    }
    const locale =
      /^\/(?<locale>en|es)(?:\/|$)/u.exec(location.pathname)?.groups?.locale ??
      'en';
    const returnTo = `${location.pathname}${location.searchStr}`;
    window.location.assign(
      `/${locale}/login?redirectTo=${encodeURIComponent(returnTo)}`,
    );
  }, [capabilities.isUnauthorized, location.pathname, location.searchStr]);

  if (required === null || required.length === 0) {
    return <>{children}</>;
  }

  if (capabilities.isLoading) {
    return <AccessLoadingState />;
  }

  if (capabilities.isUnauthorized) {
    return <AccessLoadingState />;
  }

  if (capabilities.isError && !capabilities.hasData && !capabilities.isDenied) {
    return <AccessUnavailablePage />;
  }

  if (!canSatisfyRouteRequirement(required, capabilities.can)) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
}
