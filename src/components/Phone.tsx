import React, { useEffect, useRef, useState } from 'react';
import { SipClient, type PhoneState } from '../sip/SipClient';
import { loadConfig } from '../sip/config';
import { resolveAccount, saveAccount, savedAccount, type AccountForm } from './account';
import { screenFor, visibleError } from './screen';
import {
  addEntry,
  callRecorder,
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
  // The account the client was last asked to connect with; recents are filed under it.
  const [connectedLabel, setConnectedLabel] = useState<string>();
  const [store, setStore] = useState<RecentsStore>({ entries: [], seenAt: 0 });
  // Mirrors of the store and its key for the client subscriber, which runs
  // outside React's render cycle (so a call ended by unloading is still saved).
  const storeRef = useRef(store);
  const keyRef = useRef<string>();
  const record = useRef(callRecorder());

  const commitStore = (next: RecentsStore) => {
    storeRef.current = next;
    setStore(next);
    if (keyRef.current) saveRecents(keyRef.current, next);
  };

  useEffect(
    () =>
      client.subscribe((next) => {
        setState(next);
        const entry = record.current(next.call, Date.now());
        if (entry) commitStore({ ...storeRef.current, entries: addEntry(storeRef.current.entries, entry) });
      }),
    [client], // eslint-disable-line react-hooks/exhaustive-deps
  );

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

  // What the user typed, shown on the phone and used to file recents.
  const accountLabel = form.login.trim();

  // Recent calls are kept per connected account, in this browser.
  useEffect(() => {
    keyRef.current = connectedLabel ? recentsKey(connectedLabel) : undefined;
    const loaded = keyRef.current ? loadRecents(keyRef.current) : { entries: [], seenAt: 0 };
    storeRef.current = loaded;
    setStore(loaded);
  }, [connectedLabel]);

  const screen = screenFor({ loginOpen, callStatus: state.call.status });
  const missedCount = unseenMissed(store.entries, store.seenAt);

  // Opening the Recents tab marks the missed calls as seen.
  useEffect(() => {
    if (screen === 'dialer' && tab === 'recents' && missedCount > 0) {
      commitStore({ ...storeRef.current, seenAt: Date.now() });
    }
  }, [screen, tab, missedCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeTab = (next: DialerTab) => {
    setTab(next);
    saveTab(next);
  };

  const handleConnect = run(async () => {
    const account = resolveAccount(form);
    if (!account) return;
    saveAccount(form);
    setConnectedLabel(accountLabel);
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
        accountLabel={connectedLabel ?? accountLabel}
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
        onClearRecents={() => commitStore({ entries: [], seenAt: Date.now() })}
      />
    );
  }

  return (
    <CallScreen
      state={state}
      accountLabel={connectedLabel ?? accountLabel}
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
