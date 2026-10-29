import React, { useEffect, useRef, useState } from 'react';
import { SipClient, type CallInfo, type PhoneState } from '../sip/SipClient';
import { loadConfig } from '../sip/config';
import { resolveAccount, saveAccount, savedAccount, type AccountForm } from './account';
import { screenFor, visibleError } from './screen';
import {
  addEntry,
  entryFor,
  loadRecents,
  loadTab,
  recentsKey,
  saveRecents,
  saveTab,
  unseenMissed,
  type DialerTab,
  type RecentsStore,
} from './recents';
import Login from './Login';
import Dialer from './Dialer';
import CallScreen from './CallScreen';

const config = loadConfig(import.meta.env);

/**
 * Owns the SIP client and every call into it. The screens below it only
 * render state and report what the user pressed.
 */
const Phone: React.FC = () => {
  const [client] = useState(
    () => new SipClient({ iceServers: config.iceServers, traceSip: config.traceSip }),
  );
  const [state, setState] = useState<PhoneState>(client.getState());
  const [form, setForm] = useState<AccountForm>(() => savedAccount(config));
  const [loginOpen, setLoginOpen] = useState(true);
  const [number, setNumber] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [dismissedError, setDismissedError] = useState<string | undefined>();
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState<DialerTab>(loadTab);
  const [store, setStore] = useState<RecentsStore>({ entries: [], seenAt: 0 });
  const lastCall = useRef<CallInfo>();

  useEffect(() => client.subscribe(setState), [client]);

  useEffect(() => {
    const leave = () => void client.disconnect();
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [client]);

  useEffect(() => {
    if (state.registration === 'registered') setLoginOpen(false);
  }, [state.registration]);

  useEffect(() => {
    if (state.call.status !== 'active') return;
    setNow(Date.now()); // the clock is stale from before the call was answered
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state.call.status]);

  // Runs a client action and shows its error instead of failing silently.
  const run = (action: () => Promise<void> | void) => async () => {
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    }
  };

  const account = resolveAccount(form);
  const accountLabel = `${account.username}@${account.domain}`;

  // Recent calls are kept per account, in this browser.
  useEffect(() => {
    setStore(loadRecents(recentsKey(accountLabel)));
  }, [accountLabel]);

  const updateStore = (next: RecentsStore) => {
    setStore(next);
    saveRecents(recentsKey(accountLabel), next);
  };

  // When the call state returns to idle, the last call it saw becomes an entry.
  useEffect(() => {
    if (state.call.status !== 'idle') {
      lastCall.current = state.call;
      return;
    }
    const ended = lastCall.current;
    lastCall.current = undefined;
    if (!ended) return;
    const entry = entryFor(ended, Date.now());
    if (entry) updateStore({ ...store, entries: addEntry(store.entries, entry) });
  }, [state.call]); // eslint-disable-line react-hooks/exhaustive-deps

  const screen = screenFor({ loginOpen, callStatus: state.call.status });
  const missedCount = unseenMissed(store.entries, store.seenAt);

  // Opening the Recents tab marks the missed calls as seen.
  useEffect(() => {
    if (screen === 'dialer' && tab === 'recents' && missedCount > 0) {
      updateStore({ ...store, seenAt: Date.now() });
    }
  }, [screen, tab, missedCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeTab = (next: DialerTab) => {
    setTab(next);
    saveTab(next);
  };

  const handleConnect = run(async () => {
    saveAccount(form);
    await client.connect(account);
  });

  const handleCall = run(async () => {
    if (number.trim()) await client.call(number);
  });

  const callEntry = (target: string) => void run(() => client.call(target))();

  const { registration } = state;
  const error = visibleError({ actionError, stateError: state.error, dismissed: dismissedError });
  const dismissError = () => {
    setActionError(null);
    setDismissedError(state.error);
  };
  if (screen === 'login') {
    return (
      <Login
        form={form}
        onChange={setForm}
        onSubmit={() => void handleConnect()}
        connecting={registration === 'connecting'}
        error={error}
        onDismissError={dismissError}
        canClose={registration === 'registered'}
        onClose={() => setLoginOpen(false)}
      />
    );
  }

  if (screen === 'dialer') {
    return (
      <Dialer
        state={state}
        accountLabel={accountLabel}
        number={number}
        onNumberChange={setNumber}
        onCall={() => void handleCall()}
        onOpenAccount={() => setLoginOpen(true)}
        onDisconnect={() => void run(() => client.disconnect())()}
        error={error}
        onDismissError={dismissError}
        tab={tab}
        onTabChange={changeTab}
        entries={store.entries}
        missedCount={missedCount}
        now={Date.now()}
        onCallEntry={callEntry}
        onClearRecents={() => updateStore({ entries: [], seenAt: Date.now() })}
      />
    );
  }

  return (
    <CallScreen
      state={state}
      accountLabel={accountLabel}
      now={now}
      onAnswer={() => void run(() => client.answer())()}
      onDecline={() => void run(() => client.decline())()}
      onHangup={() => void run(() => client.hangup())()}
      onToggleMute={() => void run(() => client.toggleMute())()}
      onToggleHold={() => void run(() => client.toggleHold())()}
      onDtmf={(key) => void run(() => client.sendDtmf(key))()}
      onTransfer={(target) => run(() => client.transfer(target))()}
      error={error}
      onDismissError={dismissError}
    />
  );
};

export default Phone;
