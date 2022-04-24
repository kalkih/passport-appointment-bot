import { Region } from "../locations";

export interface RequiredConfig {
  region: Region;
  locations: string[];
  max_date: string;
  email: string;
  phone: string;
  passport: boolean;
  id: boolean;
  confirmation: [ConfirmationType?, ConfirmationType?];
}

export interface OptionalConfig {
  booking_number?: string;
  extra_personnummer?: string[];
  extra_firstnames?: string[];
  extra_lastnames?: string[];
  min_date?: string;
  throttle?: number;
  sessions?: number;
  useProxies?: boolean;
  proxyTimeout?: number;
  proxyRetries?: number;
}

export interface Config extends RequiredConfig, OptionalConfig {
  extra_personnummer: string[];
  extra_firstnames: string[];
  extra_lastnames: string[];
  throttle: number;
  sessions: number;
  useProxies: boolean;
  proxyTimeout: number;
  proxyRetries: number;
}

export enum ConfirmationType {
  EMAIL = "email",
  SMS = "sms",
}

export interface Location {
  name: string;
  id: number;
  serviceId: number;
}
