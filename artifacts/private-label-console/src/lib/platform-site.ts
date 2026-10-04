import type { PublicSite } from '@workspace/api-client-react';
import { QXLAYER_LOGO_URL } from './brand';

/**
 * Frontend-only marketing presentation for the QXLayer platform home.
 * It is NOT a tenant, holds no entitlements and binds to no sample tenant.
 * Colours, font, surface and radius mirror the approved dark premium appearance.
 * Exchange widget uses the original form presentation with no configured assets, prices or quotes.
 */
export const PLATFORM_SITE: PublicSite = {
  tenantSlug: '',
  brandName: 'QXLayer',
  logoUrl: QXLAYER_LOGO_URL,
  primaryColor: '#8C70ED',
  accentColor: '#80D6D4',
  themeMode: 'dark',
  domain: null,
  sandboxOnly: true,
  assets: [],
  features: { crypto_exchange: true, swap: true, convert: true },
  websiteSettings: {
    secondaryColor: '#171F38',
    glowColor: '#9D7DF9',
    surfaceStyle: 'glass',
    borderRadius: 'rounded',
    fontKey: 'space-grotesk',
    faviconUrl: QXLAYER_LOGO_URL,
    heroTitle: 'Digital finance.\nDistinctly yours.',
    heroSubtitle: 'A connected experience for conversion, payment configuration and merchant capabilities. Discover QXLayer in non-executing test mode, without moving real funds.',
    supportEmail: null,
    supportUrl: null,
    supportDetails: '',
    socialLinks: [],
    footerText: '',
    privacyContent: '',
    termsContent: '',
  },
};
