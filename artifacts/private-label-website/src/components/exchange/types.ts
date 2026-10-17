export interface RateInfo { mode: 'swap' | 'convert' | null; sourceAsset: string | null; targetAsset: string | null; rate: string | null; loading: boolean; error: boolean }
