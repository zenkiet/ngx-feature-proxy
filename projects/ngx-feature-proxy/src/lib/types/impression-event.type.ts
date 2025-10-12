import { IContext } from 'unleash-proxy-client';

export interface BaseEvent {
  eventType: string;
  eventId: string;
  context: IContext;
  enabled: boolean;
  featureName: string;
  impressionData?: boolean;
}

export interface ImpressionEvent extends BaseEvent {
  variant?: string;
}
