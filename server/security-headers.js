import { BEHIND_TLS_PROXY } from './config.js';
import { buildSecurityHeaders } from '../src/utils/security-headers.js';

export const SECURITY_HEADERS = buildSecurityHeaders({ https: BEHIND_TLS_PROXY });
