export interface FeatureContext {
  userId?: string;
  sessionId?: string;
  environment?: string;
  properties?: Record<string, string | number | boolean>;
}
