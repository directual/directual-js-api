import { AxiosResponse } from "axios";
import * as _ from "lodash";

/**
 * Returns true if the specified value is not undefined.
 *
 * @param val Variable to test.
 * @return Whether variable is defined.
 */
export function isDef(val: any): boolean {
  // void 0 always evaluates to undefined and hence we do not need to depend on
  // the definition of the global variable named 'undefined'.
  return val !== void 0;
}

export function isEmptyString(val: string): boolean {
  return val.trim().length === 0;
}

export function isNotEmptyString(val: string): boolean {
  return val.trim().length > 0;
}

export function isNotEmpty(val: any): boolean {
  return _.isEmpty(val) === false;
}

/**
 * Compare function for string values by field.
 * @return {function(*, *):number}
 */
export function compareStringByField(fieldName: string) {
  return (a: any, b: any) => a[fieldName].localeCompare(b[fieldName], undefined, { numeric: true });
}

/**
 * Number of digits greater than argument.
 *
 * Gets count of digits and compare with argument.
 * Note: this works only with integers, not floats.
 */
export function numberOfDigitsGreaterThan(val: number, digitsCount: number): boolean {
  return val.toString().length > digitsCount;
}

/**
 * Extract `obj` from directual response.
 */
export function extractResponseObject(response: object): object {
  return _.get(response, 'obj', {});
}

/**
 * Extract array result from directual response.
 */
export function extractResponseArray(response: object): any[] {
  return _.get(response, 'result.list', []);
}

/**
 * Extract data from axios response.
 * @param {AxiosResponse} response
 * @return {*}
 */
export function extractResponseData(response: AxiosResponse): any {
  return response.data;
}

/**
 * Convert string to array.
 */
export function stringToArray(val: string): any[] {
  if (val.length === 0) return [];
  return val.split(',');
}
