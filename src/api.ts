import axios from 'axios';
import { extractResponseData } from './utils';
import Endpoint from './endpoint';
const defaultApiHost = 'https://api.directual.com';

export class Structure extends Endpoint {
  constructor(name: string, config: any) {
    super();

    this.name = name;
    this.config = config;
  }
}

class Api {
  config: any = {};

  constructor(config: any) {
    this.config = config;
    if (!config.apiHost) {
      this.config.apiHost = defaultApiHost;
    }
  }

  structure(name: string) {
    return new Structure(name, this.config);
  }
}

export default Api;
export var __useDefault = true;
