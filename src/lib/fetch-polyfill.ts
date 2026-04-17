/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const nativeFetch = typeof window !== 'undefined' ? window.fetch.bind(window) : null;
console.log('Using fetch-polyfill.ts, nativeFetch exists:', !!nativeFetch);
export default nativeFetch;
export const Headers = typeof window !== 'undefined' ? window.Headers : null;
export const Request = typeof window !== 'undefined' ? window.Request : null;
export const Response = typeof window !== 'undefined' ? window.Response : null;
