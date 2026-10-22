import { useEffect, useRef } from 'react';

/** What a step does when the person presses Continue: returns false to stay on the step (a validation error). */
export type ContinueHandler = () => boolean;
export type RegisterContinue = (handler: ContinueHandler | null) => void;

/** Registers the step's Continue behaviour with the page; the latest closure is always the one that runs. */
export function useContinueHandler(register: RegisterContinue, handler: ContinueHandler): void {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    register(() => latest.current());
    return () => register(null);
  }, [register]);
}
