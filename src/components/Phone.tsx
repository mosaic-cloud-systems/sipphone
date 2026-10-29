import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
  styled,
  useTheme,
} from '@mui/material';
import {
  Backspace as BackspaceIcon,
  CallEnd as CallEndIcon,
  Logout as LogoutIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Pause as PauseIcon,
  Phone as PhoneIcon,
  PlayArrow as PlayArrowIcon,
  Settings as SettingsIcon,
  TransferWithinAStation as TransferIcon,
} from '@mui/icons-material';
import { SipClient, PhoneState } from '../sip/SipClient';
import { hostOf, loadConfig, wazoWebSocketUrl } from '../sip/config';

const config = loadConfig(import.meta.env);
const STORAGE_KEY = 'sipphone.account';
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.spacing(2),
  width: '100%',
  maxWidth: 380,
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(145deg, #2c2c2c 0%, #1a1a1a 100%)'
      : 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  width: 56,
  height: 56,
  margin: theme.spacing(1),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  '&:hover': { backgroundColor: theme.palette.primary.dark },
  '&.Mui-disabled': {
    backgroundColor: theme.palette.action.disabledBackground,
    color: theme.palette.action.disabled,
  },
}));

const DialerButton = styled(Button)(({ theme }) => ({
  width: 70,
  height: 70,
  margin: theme.spacing(0.5),
  borderRadius: 35,
  fontSize: '1.8rem',
  fontWeight: 400,
}));

interface AccountForm {
  wsUrl: string;
  domain: string;
  username: string;
  password: string;
}

// Server, domain and username are remembered in this browser; the password never is.
function savedAccount(): AccountForm {
  const defaults = { wsUrl: config.wsUrl, domain: config.domain, username: config.username, password: '' };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return { ...defaults, ...saved, password: '' };
  } catch {
    return defaults;
  }
}

function saveAccount({ wsUrl, domain, username }: AccountForm): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ wsUrl, domain, username }));
  } catch {
    // Storage blocked (private window): the form just won't be prefilled next time.
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

const REGISTRATION_TEXT: Record<PhoneState['registration'], string> = {
  disconnected: 'Offline',
  connecting: 'Connecting…',
  registered: 'Registered',
  unregistered: 'Not registered',
  error: 'Error',
};

const Phone: React.FC = () => {
  const theme = useTheme();
  const [client] = useState(
    () => new SipClient({ iceServers: config.iceServers, traceSip: config.traceSip }),
  );
  const [state, setState] = useState<PhoneState>(client.getState());
  const [account, setAccount] = useState<AccountForm>(savedAccount);
  const [loginOpen, setLoginOpen] = useState(true);
  const [number, setNumber] = useState('');
  const [dtmfSent, setDtmfSent] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

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
    if (state.call.status === 'idle') setDtmfSent('');
    if (state.call.status !== 'active') return;
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

  const handleConnect = run(async () => {
    const wsUrl = wazoWebSocketUrl(account.wsUrl);
    const domain = account.domain.trim() || hostOf(wsUrl);
    const next = { ...account, wsUrl, domain };
    setAccount(next);
    saveAccount(next);
    await client.connect(next);
  });

  const handleKey = (key: string) => {
    if (state.call.status === 'active') {
      setDtmfSent((sent) => sent + key);
      void run(() => client.sendDtmf(key))();
    } else {
      setNumber((value) => value + key);
    }
  };

  const handleCall = run(async () => {
    if (number.trim()) await client.call(number);
  });

  const handleTransfer = run(async () => {
    await client.transfer(transferTarget);
    setTransferOpen(false);
    setTransferTarget('');
  });

  const { call, registration } = state;
  const registered = registration === 'registered';
  const connecting = registration === 'connecting';

  const statusText = (() => {
    switch (call.status) {
      case 'dialing':
        return 'Calling…';
      case 'incoming':
        return 'Incoming call';
      case 'active':
        return `${call.held ? 'On hold' : 'In call'} · ${formatDuration(now - (call.answeredAt ?? now))}`;
      default:
        return REGISTRATION_TEXT[registration];
    }
  })();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        p: 2,
        background:
          theme.palette.mode === 'dark'
            ? 'linear-gradient(180deg, #121212 0%, #1a1a1a 100%)'
            : 'linear-gradient(180deg, #f5f5f5 0%, #ffffff 100%)',
      }}
    >
      <Dialog open={loginOpen} onClose={() => registered && setLoginOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Connect to Wazo</DialogTitle>
        <DialogContent>
          {state.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {state.error}
            </Alert>
          )}
          <TextField
            margin="dense"
            label="Wazo server or WebSocket URL"
            helperText="e.g. wazo.example.com → wss://wazo.example.com/api/asterisk/ws"
            fullWidth
            value={account.wsUrl}
            onChange={(e) => setAccount({ ...account, wsUrl: e.target.value })}
          />
          <TextField
            margin="dense"
            label="SIP domain"
            helperText="Leave blank to use the server's host name"
            fullWidth
            value={account.domain}
            onChange={(e) => setAccount({ ...account, domain: e.target.value })}
          />
          <TextField
            margin="dense"
            label="SIP username (from the Wazo line)"
            fullWidth
            autoComplete="username"
            value={account.username}
            onChange={(e) => setAccount({ ...account, username: e.target.value })}
          />
          <TextField
            margin="dense"
            label="SIP password (from the Wazo line)"
            type="password"
            fullWidth
            autoComplete="current-password"
            value={account.password}
            onChange={(e) => setAccount({ ...account, password: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && void handleConnect()}
          />
        </DialogContent>
        <DialogActions>
          {registered && <Button onClick={() => setLoginOpen(false)}>Close</Button>}
          <Button
            variant="contained"
            onClick={() => void handleConnect()}
            disabled={connecting || !account.wsUrl.trim() || !account.username.trim() || !account.password}
            startIcon={connecting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {connecting ? 'Connecting' : 'Connect'}
          </Button>
        </DialogActions>
      </Dialog>

      <StyledPaper elevation={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="caption" color="text.secondary" noWrap>
            {registered ? `${account.username}@${account.domain}` : 'Not connected'}
          </Typography>
          <Box>
            <Tooltip title="Account">
              <IconButton size="small" onClick={() => setLoginOpen(true)}>
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Disconnect">
              <span>
                <IconButton
                  size="small"
                  disabled={registration === 'disconnected'}
                  onClick={() => void run(() => client.disconnect())()}
                >
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="h4" gutterBottom noWrap>
            {call.remote || 'Wazo Phone'}
          </Typography>
          <Typography
            variant="subtitle1"
            color={registered ? 'success.main' : registration === 'error' ? 'error.main' : 'text.secondary'}
          >
            {statusText}
          </Typography>
        </Box>

        {(actionError || (!loginOpen && state.error)) && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
            {actionError || state.error}
          </Alert>
        )}

        <TextField
          fullWidth
          value={call.status === 'active' ? dtmfSent : number}
          onChange={(e) => setNumber(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && call.status === 'idle' && void handleCall()}
          placeholder={call.status === 'active' ? 'Keypad tones' : 'Extension or number'}
          disabled={call.status !== 'idle' && call.status !== 'active'}
          InputProps={{
            readOnly: call.status === 'active',
            endAdornment: call.status === 'idle' && number && (
              <IconButton onClick={() => setNumber((value) => value.slice(0, -1))} size="small">
                <BackspaceIcon />
              </IconButton>
            ),
          }}
          sx={{ mb: 1 }}
        />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', mb: 1 }}>
          {KEYS.map((key) => (
            <DialerButton
              key={key}
              variant="outlined"
              onClick={() => handleKey(key)}
              disabled={call.status !== 'idle' && call.status !== 'active'}
            >
              {key}
            </DialerButton>
          ))}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
          {call.status === 'idle' && (
            <Tooltip title="Call">
              <span>
                <ActionButton
                  onClick={() => void handleCall()}
                  disabled={!registered || !number.trim()}
                  sx={{ backgroundColor: 'success.main' }}
                >
                  <PhoneIcon />
                </ActionButton>
              </span>
            </Tooltip>
          )}

          {call.status === 'incoming' && (
            <>
              <Tooltip title="Answer">
                <ActionButton onClick={() => void run(() => client.answer())()} sx={{ backgroundColor: 'success.main' }}>
                  <PhoneIcon />
                </ActionButton>
              </Tooltip>
              <Tooltip title="Decline">
                <ActionButton onClick={() => void run(() => client.decline())()} sx={{ backgroundColor: 'error.main' }}>
                  <CallEndIcon />
                </ActionButton>
              </Tooltip>
            </>
          )}

          {call.status === 'active' && (
            <>
              <Tooltip title={call.muted ? 'Unmute' : 'Mute'}>
                <ActionButton onClick={() => void run(() => client.toggleMute())()} color={call.muted ? 'secondary' : 'primary'}>
                  {call.muted ? <MicOffIcon /> : <MicIcon />}
                </ActionButton>
              </Tooltip>
              <Tooltip title={call.held ? 'Resume' : 'Hold'}>
                <ActionButton onClick={() => void run(() => client.toggleHold())()}>
                  {call.held ? <PlayArrowIcon /> : <PauseIcon />}
                </ActionButton>
              </Tooltip>
              <Tooltip title="Transfer">
                <ActionButton onClick={() => setTransferOpen(true)}>
                  <TransferIcon />
                </ActionButton>
              </Tooltip>
            </>
          )}

          {(call.status === 'active' || call.status === 'dialing') && (
            <Tooltip title="Hang up">
              <ActionButton onClick={() => void run(() => client.hangup())()} sx={{ backgroundColor: 'error.main' }}>
                <CallEndIcon />
              </ActionButton>
            </Tooltip>
          )}
        </Box>
      </StyledPaper>

      <Dialog open={transferOpen} onClose={() => setTransferOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Transfer call</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Transfer to (extension or number)"
            fullWidth
            value={transferTarget}
            onChange={(e) => setTransferTarget(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && transferTarget.trim() && void handleTransfer()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleTransfer()} disabled={!transferTarget.trim()}>
            Transfer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Phone;
