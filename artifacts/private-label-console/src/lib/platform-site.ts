import type { PublicSite } from '@workspace/api-client-react';
import { VYNOX } from '@site/lib/theme';
import { QXLAYER_LOGO_URL, QXLAYER_ICON_URL } from './brand';

/**
 * Frontend-only marketing presentation for the VYNOX LAYER platform home.
 * It is NOT a tenant, holds no entitlements and binds to no sample tenant.
 * Colours, font, surface and radius mirror the approved dark premium appearance.
 * Exchange widget uses the original form presentation with no configured assets, prices or quotes.
 */
export const PLATFORM_SITE: PublicSite = {
  tenantSlug: '',
  brandName: 'VYNOX LAYER',
  logoUrl: QXLAYER_LOGO_URL,
  primaryColor: VYNOX.electric,
  accentColor: VYNOX.lavender,
  themeMode: 'dark',
  domain: null,
  sandboxOnly: true,
  assets: [],
  features: { crypto_exchange: true, swap: true, convert: true },
  websiteSettings: {
    secondaryColor: VYNOX.deepBlue,
    glowColor: VYNOX.glow,
    surfaceStyle: 'glass',
    borderRadius: 'rounded',
    fontKey: 'space-grotesk',
    faviconUrl: QXLAYER_ICON_URL,
    heroTitle: 'Digital finance.\nDistinctly yours.',
    heroSubtitle: 'A connected experience for conversion, payment configuration and merchant capabilities. Discover VYNOX LAYER in non-executing test mode, without moving real funds.',
    supportEmail: null,
    supportUrl: null,
    supportDetails: '',
    socialLinks: [],
    footerText: '',
    privacyContent: '',
    termsContent: '',
  },
};
