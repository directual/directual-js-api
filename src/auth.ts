import { Config } from './api';
import axios from 'axios';
const axiosInstance = axios.create({
  headers: {
    post: {
      'Content-Type': 'application/json',
    },
    'Access-Control-Allow-Origin': '*',
  },
});

export class Token {
  sessionID: String;
  username: String;

  constructor(token: String, username: String) {
    this.sessionID = token;
    this.username = username;
  }
}

export class Auth {
  config: any;

  constructor(config: any) {
    this.config = config;
  }

  isAuthenticated(): Promise<boolean> {
    return Promise.resolve(false);
  }

  isAuthorize(cb: (isAuth: Boolean, token?: Token) => boolean): void {
    this.check('')
      .then(res => {
        cb(false);
      })
      .catch(e => {
        cb(false);
      });
  }

  login(login: String, pass: String): Promise<Token> {
    return axiosInstance
      .request({
        method: 'POST',
        url: `/good/api/v4/auth`,
        baseURL: `${this.config.apiHost}`,
        params: { ...this.config },
        data: {
          appID: this.config.appID,
          provider: 'rest',
          username: login,
          password: pass,
        },
      })
      .then(result => {
        if (result.status == 200 && result.statusText === 'OK' && result.data) {
          let token = new Token(result.data.result.token, result.data.result.username);
          return Promise.resolve(token);
        }
        return Promise.reject(new Error('No reason but to reject'));
      });
  }

  logout(sessionID: string): Promise<any> {
    return axiosInstance
      .request({
        method: 'GET',
        url: `/good/api/v4/auth/logout`,
        baseURL: `${this.config.apiHost}`,
        params: { ...this.config, sessionID },
        data: {
          appID: this.config.appID,
        },
      })
      .then(result => {
        return Promise.resolve();
      });
  }

  check(sessionID: string): Promise<any> {
    return axiosInstance
      .request({
        method: 'GET',
        url: `/good/api/v4/auth/check`,
        baseURL: `${this.config.apiHost}`,
        params: { ...this.config, sessionID },
      })
      .then(result => {
        return Promise.resolve(false);
      });
  }
}
