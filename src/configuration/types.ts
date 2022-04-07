import { Region } from "../locations";

export interface Config {
  region: Region;
  locations: string[];
  max_date: string;
  min_date?: string;
  email: string;
  phone: string;
  personnummer: string[];
  firstname: string[];
  lastname: string[];
  passport: boolean;
  id: boolean;
  confirmation: [ConfirmationType?, ConfirmationType?];
  throttle: number;
  sessions: number;
}

export enum ConfirmationType {
  EMAIL = "email",
  SMS = "sms",
}

export interface Location {
  name: string;
  id: number;
}
