import { describe, expect, it } from 'vitest';
import { screenFor, visibleError } from './screen';

describe('screenFor', () => {
  it('shows a call in front of the login page', () => {
    expect(screenFor({ loginOpen: true, callStatus: 'incoming' })).toBe('call');
    expect(screenFor({ loginOpen: true, callStatus: 'active' })).toBe('call');
  });

  it('shows login, then the dialer, when there is no call', () => {
    expect(screenFor({ loginOpen: true, callStatus: 'idle' })).toBe('login');
    expect(screenFor({ loginOpen: false, callStatus: 'idle' })).toBe('dialer');
    expect(screenFor({ loginOpen: false, callStatus: 'dialing' })).toBe('call');
  });
});

describe('visibleError', () => {
  it('prefers the action error, then the registration error', () => {
    expect(visibleError({ actionError: 'a', stateError: 'b', dismissed: undefined })).toBe('a');
    expect(visibleError({ actionError: null, stateError: 'b', dismissed: undefined })).toBe('b');
    expect(visibleError({ actionError: null, stateError: undefined, dismissed: undefined })).toBeUndefined();
  });

  it('hides a registration error the user dismissed until it changes', () => {
    expect(visibleError({ actionError: null, stateError: 'b', dismissed: 'b' })).toBeUndefined();
    expect(visibleError({ actionError: null, stateError: 'c', dismissed: 'b' })).toBe('c');
  });
});
