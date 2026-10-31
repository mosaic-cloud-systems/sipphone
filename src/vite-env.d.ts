/// <reference types="vite/client" />

// The settings read by src/sip/config.ts (documented in .env.example).
interface ImportMetaEnv {
  readonly VITE_SIP_HOST?: string;
  readonly VITE_SIP_WS_URL?: string;
  readonly VITE_SIP_DOMAIN?: string;
  readonly VITE_SIP_USERNAME?: string;
  readonly VITE_ICE_SERVERS?: string;
  readonly VITE_TURN_USERNAME?: string;
  readonly VITE_TURN_CREDENTIAL?: string;
  readonly VITE_SIP_TRACE?: string;
}
