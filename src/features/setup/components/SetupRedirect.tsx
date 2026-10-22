import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isEmptyWorkspace } from '../../../data-access';
import { useAuth } from '../../auth';
import { readSetupMemory, shouldOpenSetupOnSignIn, writeSetupMemory } from '../model/setupMemory';
import { useCanRunSetup, useSetup } from '../model/useSetup';

/**
 * Wraps the landing page: the first time an owner or administrator of a brand-new organisation arrives there after
 * signing in, they are sent to /setup, once (remembered per person). Everyone else, and every later visit, sees the page.
 */
export function SetupRedirect({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const canSetup = useCanRunSetup();
  const { model } = useSetup();
  const [redirect] = useState(() => isAuthenticated && shouldOpenSetupOnSignIn({
    memory: readSetupMemory(user?.id),
    brandNew: isEmptyWorkspace(),
    canSetup,
    somethingLeft: model.done < model.total,
  }));
  useEffect(() => {
    if (redirect) writeSetupMemory(user?.id, { redirected: true });
  }, [redirect, user?.id]);
  return redirect ? <Navigate to="/setup" replace /> : <>{children}</>;
}
