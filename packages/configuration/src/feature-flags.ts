const reviewedFeatureFlags = {
  protocolCatalog: true,
  authentication: false,
  protocolPublishing: false,
  protocolTracking: false,
  outcomes: false,
  payments: false,
  aggregateAnalytics: false,
  notifications: false,
  aiInteroperability: false,
  readOnlyMcp: false,
} as const;

export const featureFlags = Object.freeze(reviewedFeatureFlags);

export type FeatureFlagName = keyof typeof featureFlags;

export function isFeatureEnabled(name: FeatureFlagName): boolean {
  return featureFlags[name];
}
