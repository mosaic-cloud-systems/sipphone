// The sign-in form, the login rule, and what is remembered. The password is never saved.
import { MOSAIC_EDGE, wazoWebSocketUrl, type PhoneConfig } from '../sip/config';
import type { SipAccount } from '../sip/SipClient';

export interface AccountForm {
  /** "1004@dave.mosaicvoice.net", or "alice@wazo.example.com" for a plain Wazo. */
  login: string;
  password: string;
  /** Override from the env file: server host or ws(s):// URL. Blank follows the login rule. */
  wsUrl: string;
  /** Override from the env file: SIP domain. Blank follows the login rule. */
  domain: string;
}

export const STORAGE_KEY = 'sipphone.account';
const MOSAIC_SUFFIX = '.mosaicvoice.net';

export interface ResolvedLogin {
  /** The name the line authenticates with. */
  username: string;
  domain: string;
  wsUrl: string;
}

/**
 * The login rule. A Mosaic Voice login, <ext>@<slug>.mosaicvoice.net, registers
 * as <slug>-<ext> on that realm through the shared edge: line names must be
 * unique across tenants, so the slug is part of the name. Any other domain is
 * a plain Wazo host. Nothing when the login has no user or no domain.
 */
export function resolveLogin(login: string): ResolvedLogin | undefined {
  const at = login.trim().lastIndexOf('@');
  if (at < 0) return undefined;
  const user = login.trim().slice(0, at);
  const domain = login.trim().slice(at + 1);
  if (!user || !domain) return undefined;
  const mosaic = domain.endsWith(MOSAIC_SUFFIX) && domain !== MOSAIC_EDGE;
  const slug = domain.slice(0, -MOSAIC_SUFFIX.length).split('.')[0];
  return {
    username: mosaic && slug ? `${slug}-${user}` : user,
    domain,
    wsUrl: wazoWebSocketUrl(mosaic ? MOSAIC_EDGE : domain),
  };
}

/** What the form needs before Login makes sense. */
export function isComplete(form: AccountForm): boolean {
  return Boolean(resolveLogin(form.login) && form.password);
}

/** The account the SIP client connects with: the login rule, then the env overrides. */
export function resolveAccount(form: AccountForm): SipAccount | undefined {
  const resolved = resolveLogin(form.login);
  if (!resolved) return undefined;
  return {
    username: resolved.username,
    domain: form.domain.trim() || resolved.domain,
    wsUrl: form.wsUrl.trim() ? wazoWebSocketUrl(form.wsUrl) : resolved.wsUrl,
    password: form.password,
  };
}

/** Help text under the username: where the phone will register, or what a login looks like. */
export function describeLogin(form: AccountForm): string {
  const account = resolveAccount({ ...form, password: 'x' });
  if (!account) return 'Looks like 1004@company.mosaicvoice.net';
  return `Registers as ${account.username} on ${account.domain} via ${hostOf(account.wsUrl)}`;
}

function hostOf(wsUrl: string): string {
  return wsUrl.replace(/^[a-z]+:\/\//i, '').replace(/[/?#].*$/, '');
}

/** A plain-words line under a sign-in error, when the error's shape is known. */
export function loginErrorHint(error: string): string | undefined {
  if (/^Registration rejected: 40[13]\b/.test(error)) {
    return 'The username or password was not accepted. The server does not say which; passwords are case-sensitive.';
  }
  if (/^WebSocket closed\b|^WebSocket error\b|Unable to connect/i.test(error)) {
    return 'The server could not be reached. Check the domain in the username.';
  }
  return undefined;
}

/** The remembered login, with the config's login as the default; overrides come from the config only. */
export function savedAccount(config: PhoneConfig): AccountForm {
  const defaults: AccountForm = { login: config.login, wsUrl: config.wsUrl, domain: config.domain, password: '' };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<AccountForm>;
    return { ...defaults, login: typeof saved.login === 'string' ? saved.login : defaults.login };
  } catch {
    return defaults;
  }
}

export function saveAccount({ login }: AccountForm): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ login }));
  } catch {
    // Storage blocked (private window): the form just won't be prefilled next time.
  }
}
