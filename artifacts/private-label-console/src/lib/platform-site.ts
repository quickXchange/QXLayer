import type { PublicSite } from '@workspace/api-client-react';

/**
 * Frontend-only marketing presentation for the Private Label platform home.
 * It is NOT a tenant, holds no entitlements and binds to no sample tenant.
 * Colours, font, surface and radius mirror the approved dark premium appearance.
 * Exchange widget uses the original form presentation with no configured assets, prices or quotes.
 */
export const PLATFORM_SITE: PublicSite = {
  tenantSlug: '',
  brandName: 'Private Label',
  logoUrl: null,
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
    faviconUrl: null,
    heroTitle: 'Digital finance.\nDistinctly yours.',
    heroSubtitle: 'A connected experience for conversion, payment configuration and merchant capabilities. Discover Private Label in non-executing test mode, without moving real funds.',
    supportEmail: null,
    supportUrl: null,
    supportDetails: '',
    socialLinks: [],
    footerText: '',
    privacyContent: '',
    termsContent: '',
  },
};
