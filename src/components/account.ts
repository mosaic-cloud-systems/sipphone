// The sign-in form and what is remembered of it. The password is never saved.
import { hostOf, wazoWebSocketUrl, type PhoneConfig } from '../sip/config';
import type { SipAccount } from '../sip/SipClient';

export interface AccountForm {
  /** Server host name or a full ws:// / wss:// URL, as typed. */
  wsUrl: string;
  /** SIP realm; blank means "same as the server's host". */
  domain: string;
  username: string;
  password: string;
}

export const STORAGE_KEY = 'sipphone.account';

/** What the form needs before Login makes sense. */
export function isComplete(form: AccountForm): boolean {
  return Boolean(form.wsUrl.trim() && form.username.trim() && form.password);
}

/** Turns the typed form into the account the SIP client connects with. */
export function resolveAccount(form: AccountForm): SipAccount {
  const wsUrl = wazoWebSocketUrl(form.wsUrl);
  return {
    wsUrl,
    domain: form.domain.trim() || hostOf(wsUrl),
    username: form.username.trim(),
    password: form.password,
  };
}

/** The remembered server, domain and username, with the config as defaults. */
export function savedAccount(config: PhoneConfig): AccountForm {
  const defaults = { wsUrl: config.wsUrl, domain: config.domain, username: config.username, password: '' };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return { ...defaults, ...saved, password: '' };
  } catch {
    return defaults;
  }
}

export function saveAccount({ wsUrl, domain, username }: AccountForm): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ wsUrl, domain, username }));
  } catch {
    // Storage blocked (private window): the form just won't be prefilled next time.
  }
}
