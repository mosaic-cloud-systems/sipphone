// Which screen the phone shows, and which error it shows there.
import type { CallStatus } from '../sip/SipClient';

export type Screen = 'login' | 'dialer' | 'call';

/** A call always wins: an incoming call must be seen even with the login page open. */
export function screenFor({ loginOpen, callStatus }: { loginOpen: boolean; callStatus: CallStatus }): Screen {
  if (callStatus !== 'idle') return 'call';
  return loginOpen ? 'login' : 'dialer';
}

/**
 * The error to show: a failed action first, else the registration error unless
 * the user has dismissed that exact message. A new registration error shows again.
 */
export function visibleError({
  actionError,
  stateError,
  dismissed,
}: {
  actionError: string | null;
  stateError: string | undefined;
  dismissed: string | undefined;
}): string | undefined {
  if (actionError) return actionError;
  if (stateError && stateError !== dismissed) return stateError;
  return undefined;
}
