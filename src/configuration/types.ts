import { Region } from "../locations";

export interface RequiredConfig {
  region: Region;
  locations: string[];
  max_date: string;
  email: string;
  phone: string;
  personnummer: string[];
  firstname: string[];
  lastname: string[];
  passport: boolean;
  id: boolean;
  confirmation: [ConfirmationType?, ConfirmationType?];
}

export interface OptionalConfig {
  min_date?: string;
  throttle?: number;
  sessions?: number;
  useProxies?: boolean;
  proxyTimeout?: number;
  proxyRetries?: number;
}

export interface Config extends RequiredConfig, OptionalConfig {
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
}
