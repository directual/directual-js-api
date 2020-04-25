import axios from 'axios';
import { extractResponseData } from './utils';
import Endpoint from './endpoint';
import { Auth } from './auth';
const defaultApiHost = 'https://api.directual.com';

export class Config {
  config: any;

  constructor(config: any) {
    this.config = config;
  }
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
    if (!config.apiHost) {
      this.config.apiHost = defaultApiHost;
    }
    this.auth = new Auth(config);
  }

  structure(name: string) {
    return new Structure(name, this.config);
  }
}

export default Api;
export var __useDefault = true;
