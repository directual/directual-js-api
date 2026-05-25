import axios from 'axios';
import { extractResponseData } from './utils';
import Endpoint from './endpoint';
import { Auth } from './auth';
const defaultApiHost = 'https://api.directual.com';
const defaultStreamApiHost = 'https://api.alfa.directual.com';
const defaultApiVersion = 'v5';
const defaultAuthApiVersion = 'v4';

export class Config {
  config: any;

  constructor(config: any) {
    this.config = config;
  }
}

export interface StructureOptions {
  apiVersion?: string;
  apiHost?: string;
  streamApiHost?: string;
}

export class Structure extends Endpoint {
  constructor(name: string, config: any) {
    super();

    this.name = name;
    this.config = config;
  }
}

class Api {
  config: any = {};
  public auth: Auth;

  constructor(config: any) {
    this.config = config;
    if (config.apiHost === undefined) {
      this.config.apiHost = defaultApiHost;
    }
    if (config.streamApiHost === undefined) {
      this.config.streamApiHost = defaultStreamApiHost;
    }
    if (config.apiVersion === undefined) {
      this.config.apiVersion = defaultApiVersion;
    }
    if (config.authApiVersion === undefined) {
      this.config.authApiVersion = defaultAuthApiVersion;
    }
    this.auth = new Auth(config);
  }

  structure(name: string, options?: StructureOptions) {
    const config = options ? { ...this.config, ...options } : this.config;
    return new Structure(name, config);
  }
}

export default Api;
export var __useDefault = true;
