import { Config } from './api';
import axios from 'axios';
const axiosInstance = axios.create({
  headers: {
    post: {
      'Content-Type': 'application/json',
    },
  },
});

export class Token {
  sessionID: String;
  username: String;
  role: String;

  constructor(token: String, username: String, role: String) {
    this.sessionID = token;
    this.username = username;
    this.role = role;
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

  isAuthorize(sid: string, cb: (isAuth: Boolean, token?: Token) => boolean): void {
    this.check(sid).then(res => {
      cb(res.result, res.token);
    });
  }

  login(login: String, pass: String): Promise<Token> {
    return axiosInstance
      .request({
        method: 'POST',
        url: `/good/api/v5/auth`,
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
        if (result.status === 200 && result.data) {
          let token = new Token(
            result.data.result.token,
            result.data.result.username,
            result.data.result.role,
          );
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
        return Promise.resolve(result.data.result);
      });
  }
}
