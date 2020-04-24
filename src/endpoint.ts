import { extractResponseData } from './utils';
import axios from 'axios';

const axiosInstance = axios.create({
  headers: {
    post: {
      'Content-Type': 'application/json',
    },
    'Access-Control-Allow-Origin': '*',
  },
});

export default class Endpoint {
  name: string;
  config: any;

  /**
   * GET request for API V5
   *
   * @return {Promise}
   */
  getData(name: string, params?: object, options?: object) {
    return axiosInstance
      .request({
        method: 'GET',
        url: `/good/api/v5/data/${this.name}/${name}`,
        baseURL: `${this.config.apiHost}`,
        params: { ...this.config, ...params },
        ...options,
      })
      .then(extractResponseData);
  }

  /**
   * POST request for API V5
   *
   * @return {Promise}
   */
  setData(name: string, data?: object, options?: object) {
    return axiosInstance
      .request({
        method: 'POST',
        url: `/good/api/v5/data/${this.name}/${name}`,
        baseURL: `${this.config.apiHost}`,
        params: this.config,
        data,
        ...options,
      })
      .then(extractResponseData);
  }
}
