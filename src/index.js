const caseless = require('caseless');
const qs = require('qs');
const urlJoin = require('url-join');

// eslint-disable-next-line import/no-unassigned-import
require('cross-fetch/polyfill');

// eslint-disable-next-line import/no-unassigned-import
require('abortcontroller-polyfill/dist/polyfill-patch-fetch');

const Interceptor = require('./interceptor');

const methods = ['get', 'head', 'post', 'put', 'del', 'options', 'patch'];

const respProperties = {
  readOnly: [
    'headers',
    'ok',
    'redirected',
    'status',
    'statusText',
    'type',
    'url',
    'bodyUsed'
  ],
  writable: ['useFinalURL'],
  callable: [
    'clone',
    'error',
    'redirect',
    'arrayBuffer',
    'blob',
    'formData',
    'json',
    'text'
  ]
};

function createFrisbeeResponse(origResp) {
  const resp = {
    originalResponse: origResp
  };

  respProperties.readOnly.forEach(prop =>
    Object.defineProperty(resp, prop, {
      value: origResp[prop]
    })
  );

  respProperties.writable.forEach(prop =>
    Object.defineProperty(resp, prop, {
      get() {
        return origResp[prop];
      },
      set(value) {
        origResp[prop] = value;
      }
    })
  );

  let callable = null;
  respProperties.callable.forEach(prop => {
    Object.defineProperty(resp, prop, {
      value: ((callable = origResp[prop]),
      typeof callable === 'function' && callable.bind(origResp))
    });
  });

  const headersObj = {};
  origResp.headers.forEach(pair => {
    headersObj[pair[0]] = pair[1];
  });
  Object.defineProperty(resp, 'headersObj', {
    value: headersObj
  });

  return resp;
}

class Frisbee {
  constructor(opts = {}) {
    this.opts = opts;

    let localAbortController;
    Object.defineProperty(this, 'abortController', {
      enumerable: false,
      get() {
        if (!localAbortController) {
          localAbortController = new AbortController();
          localAbortController.signal.addEventListener('abort', () => {
            // when this is aborted, null out the localAbortController
            // so we'll create a new one next time we need it
            localAbortController = null;
          });
        }

        return localAbortController;
      }
    });

    const localAbortTokenMap = new Map();
    Object.defineProperty(this, 'abortTokenMap', {
      enumerable: false,
      get() {
        return localAbortTokenMap;
      }
    });

    Object.defineProperty(this, 'parseErr', {
      enumerable: false,
      value:
        opts.parseErr ||
        new Error(
          `Invalid JSON received${opts.baseURI ? ` from ${opts.baseURI}` : ''}`
        )
    });

    this.headers = {
      ...opts.headers
    };

    this.arrayFormat = opts.arrayFormat || 'indices';

    this.raw = opts.raw === true;

    if (opts.auth) this.auth(opts.auth);

    methods.forEach(method => {
      this[method] = this._setup(method);
    });

    // interceptor should be initialized after methods setup
    this.interceptor = new Interceptor(this, methods);

    // bind scope to method
    this.auth = this.auth.bind(this);
    this.jwt = this.jwt.bind(this);
    this.abort = this.abort.bind(this);
    this.abortAll = this.abortAll.bind(this);
    this._request = this._request.bind(this);
    this._parseJSON = this._parseJSON.bind(this);
    this._fetch = this._fetch.bind(this);
  }

  abort(token) {
    const mapValue = this.abortTokenMap.get(token);
    if (mapValue && mapValue.abortController) {
      mapValue.abortController.abort();
    }
  }

  abortAll() {
    this.abortController.abort();
  }

  _setup(method) {
    return (originalPath = '/', originalOptions = {}) => {
      if (originalOptions && typeof originalOptions === 'object') {
        let abortController;
        if (originalOptions.abortToken) {
          // allow to use a single token to cancel multiple requests
          let mapValue = this.abortTokenMap.get(originalOptions.abortToken);
          if (!mapValue) {
            mapValue = {
              abortController: new AbortController(),
              count: 0
            };
          }

          mapValue.count++;

          this.abortTokenMap.set(originalOptions.abortToken, mapValue);
          abortController = mapValue.abortController;
        } else {
          abortController = new AbortController();
        }

        // the user has defined their own signal we won't use it directly, but we'll listen to it
        if (originalOptions.signal) {
          originalOptions.signal.addEventListener('abort', () =>
            abortController.abort()
          );
        }

        // abort this request whenever this.abortController.abort() gets called - a.k.a. - abortAll()
        this.abortController.signal.addEventListener('abort', () =>
          abortController.abort()
        );
        originalOptions.signal = abortController.signal;
      }

      // these can't change with interceptors, otherwise we're in weird behaviour land
      const { signal, abortToken } = originalOptions;

      return this._request({
        method,
        originalPath,
        originalOptions,
        signal,
        abortToken
      });
    };
  }

  _request({ method, originalPath, originalOptions, signal, abortToken }) {
    return async (path = originalPath, options = originalOptions) => {
      // path must be string
      if (typeof path !== 'string')
        throw new TypeError('`path` must be a string');

      // otherwise check if its an object
      if (typeof options !== 'object' || Array.isArray(options))
        throw new TypeError('`options` must be an object');

      if (options.abortToken !== abortToken) {
        throw new Error('abortToken cannot be modified via an interceptor');
      }

      if (options.signal !== signal) {
        throw new Error('signal cannot be modified via an interceptor');
      }

      const { raw, ...noRaw } = options;

      const opts = {
        ...noRaw,
        headers: {
          ...this.headers,
          ...options.headers
        },
        method: method === 'del' ? 'DELETE' : method.toUpperCase()
      };

      // remove any nil or blank headers
      // (e.g. to automatically set Content-Type with `FormData` boundary)
      Object.keys(opts.headers).forEach(key => {
        if (
          typeof opts.headers[key] === 'undefined' ||
          opts.headers[key] === null ||
          opts.headers[key] === ''
        )
          delete opts.headers[key];
      });

      const c = caseless(opts.headers);

      // in order to support Android POST requests
      // we must allow an empty body to be sent
      // https://github.com/facebook/react-native/issues/4890
      if (typeof opts.body === 'undefined' && opts.method === 'POST') {
        opts.body = '';
      } else if (typeof opts.body === 'object' || Array.isArray(opts.body)) {
        if (opts.method === 'GET' || opts.method === 'DELETE') {
          const { arrayFormat } = this;
          path += `?${qs.stringify(opts.body, { arrayFormat })}`;
          delete opts.body;
        } else if (
          c.get('Content-Type') &&
          c.get('Content-Type').split(';')[0] === 'application/json'
        ) {
          try {
            opts.body = JSON.stringify(opts.body);
          } catch (err) {
            throw err;
          }
        }
      }

      let response;
      let error;
      try {
        response = await this._fetch(path, opts, raw);
      } catch (err) {
        error = err;
      }

      // update the abortTokenMap
      const mapValue = this.abortTokenMap.get(options.abortToken);
      if (mapValue) {
        if (mapValue.count - 1 === 0) {
          this.abortTokenMap.delete(options.abortToken);
        } else {
          this.abortTokenMap.set(options.abortToken, {
            ...mapValue,
            count: --mapValue.count
          });
        }
      }

      if (error) throw error;
      return response;
    };
  }

  async _parseJSON(res) {
    try {
      // attempt to parse json body to use as error message
      if (typeof res.json === 'function') {
        res.body = await res.json();
      } else {
        res.body = await res.text();
        res.body = JSON.parse(res.body);
      }

      // attempt to use better and human-friendly error messages
      if (
        typeof res.body === 'object' &&
        typeof res.body.message === 'string'
      ) {
        res.err = new Error(res.body.message);
      } else if (
        !Array.isArray(res.body) &&
        // attempt to utilize Stripe-inspired error messages
        typeof res.body.error === 'object'
      ) {
        if (res.body.error.message) res.err = new Error(res.body.error.message);
        if (res.body.error.stack) res.err.stack = res.body.error.stack;
        if (res.body.error.code) res.err.code = res.body.error.code;
        if (res.body.error.param) res.err.param = res.body.error.param;
      }
    } catch (err) {
      res.err = this.parseErr;
    }

    return res;
  }

  async _fetch(path, opts, raw) {
    const fullUri = this.opts.baseURI ? urlJoin(this.opts.baseURI, path) : path;
    const originalRes = await fetch(fullUri, opts);
    const res = createFrisbeeResponse(originalRes);
    const contentType = res.headers.get('Content-Type');

    if (res.ok) {
      // if we just want a raw response then return early
      if (raw === true || (this.raw && raw !== false))
        return res.originalResponse;

      // determine whether we're returning text or json for body
      if (contentType && contentType.includes('application/json')) {
        try {
          if (typeof res.json === 'function') {
            res.body = await res.json();
          } else {
            res.body = await res.text();
            res.body = JSON.parse(res.body);
          }
        } catch (err) {
          if (contentType === 'application/json') {
            res.err = this.parseErr;
            return res;
          }
        }
      } else {
        res.body = await res.text();
      }

      return res;
    }

    res.err = new Error(res.statusText);

    // check if the response was JSON, and if so, better the error
    // (return early if it's not)
    if (!contentType || !contentType.includes('application/json')) return res;

    return this._parseJSON(res);
  }

  auth(creds) {
    if (typeof creds === 'string') {
      const index = creds.indexOf(':');
      if (index !== -1)
        creds = [creds.substr(0, index), creds.substr(index + 1)];
    }

    if (!Array.isArray(creds)) {
      // eslint-disable-next-line prefer-rest-params
      creds = [].slice.call(arguments);
    }

    switch (creds.length) {
      case 0:
        creds = ['', ''];
        break;
      case 1:
        creds.push('');
        break;
      case 2:
        break;
      default:
        throw new Error('auth option can only have two keys `[user, pass]`');
    }

    if (typeof creds[0] !== 'string')
      throw new TypeError('auth option `user` must be a string');

    if (typeof creds[1] !== 'string')
      throw new TypeError('auth option `pass` must be a string');

    if (!creds[0] && !creds[1]) {
      delete this.headers.Authorization;
    } else {
      this.headers.Authorization = `Basic ${Buffer.from(
        creds.join(':')
      ).toString('base64')}`;
    }

    return this;
  }

  jwt(token) {
    if (token === null || token === undefined)
      delete this.headers.Authorization;
    else if (typeof token === 'string')
      this.headers.Authorization = `Bearer ${token}`;
    else throw new TypeError('jwt token must be a string');

    return this;
  }
}

module.exports = Frisbee;
