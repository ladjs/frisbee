const caseless = require('caseless');
const qs = require('qs');
const urlJoin = require('url-join');
const URL = require('url-parse');
const debug = require('debug')('frisbee');
const boolean = require('boolean');

// eslint-disable-next-line import/no-unassigned-import
require('cross-fetch/polyfill');

// eslint-disable-next-line import/no-unassigned-import
require('abortcontroller-polyfill/dist/polyfill-patch-fetch');

const Interceptor = require('./interceptor');

const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'];
const MODES = ['no-cors', 'cors', 'same-origin'];
const CACHE = [
  'default',
  'no-cache',
  'reload',
  'force-cache',
  'only-if-cached'
];
const CREDENTIALS = ['include', 'same-origin', 'omit'];
const REDIRECT = ['manual', 'follow', 'error'];
const REFERRER = ['no-referrer', 'client'];

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
    this.opts = {
      parse: {
        ignoreQueryPrefix: true
      },
      stringify: {
        addQueryPrefix: true,
        format: 'RFC1738',
        arrayFormat: 'indices'
      },
      preventBodyOnMethods: ['GET', 'HEAD', 'DELETE', 'CONNECT'],
      interceptableMethods: METHODS,
      mode: 'same-origin',
      cache: 'default',
      credentials: 'same-origin',
      redirect: 'follow',
      referrer: 'client',
      body: null,
      params: null,
      ...opts
    };

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
          `Invalid JSON received${
            this.opts.baseURI ? ` from ${this.opts.baseURI}` : ''
          }`
        )
    });

    if (opts.arrayFormat) {
      this.opts.parse.arrayFormat = 'indices';
      delete opts.arrayFormat;
    }

    if (Array.isArray(opts.preventBodyOnMethods))
      this.opts.preventBodyOnMethods = this.opts.preventBodyOnMethods.map(
        method => method.toUpperCase().trim()
      );

    this.opts.raw = boolean(this.opts.raw);

    if (this.opts.auth) this.auth(this.opts.auth);

    METHODS.forEach(method => {
      this[method.toLowerCase()] = this._setup(method.toLowerCase());
    });

    // alias for `this.del` -> `this.delete`
    this.del = this._setup('delete');

    // interceptor should be initialized after methods setup
    this.interceptor = new Interceptor(this, this.opts.interceptableMethods);

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
      debug('frisbee', method, path, options);
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

      const opts = {
        method: method === 'del' ? 'DELETE' : method.toUpperCase(),
        mode: options.mode || this.opts.mode,
        cache: options.cache || this.opts.cache,
        credentials: options.credentials || this.opts.credentials,
        headers: {
          ...this.opts.headers,
          ...options.headers
        },
        redirect: options.redirect || this.opts.redirect,
        referrer: options.referrer || this.opts.referrer,
        signal
      };

      if (this.opts.body || options.body)
        opts.body = { ...this.opts.body, ...options.body };

      if (this.opts.params || options.params)
        opts.params = { ...this.opts.params, ...options.params };

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

      // parse the path so that we can support
      // mixed params in body and in url path
      // e.g. `api.get('/v1/users?search=nifty`
      // = /v1/users?search=nifty
      // e.g. `api.get('/v1/users?search=nifty', { foo: 'bar' });
      // = /v1/users?search=nifty&foo=bar
      const url = new URL(path, {}, false);
      const href =
        url.origin === 'null'
          ? this.opts.baseURI
            ? urlJoin(this.opts.baseURI, url.pathname)
            : url.pathname
          : `${url.origin}${url.pathname}`;
      let query = qs.parse(url.query, options.parse || this.opts.parse);

      // allow params to be passed
      if (options.params || this.opts.params)
        query = { ...this.opts.params, ...options.params, ...query };

      // in order to support Android POST requests
      // we must allow an empty body to be sent
      // https://github.com/facebook/react-native/issues/4890
      if (typeof opts.body === 'undefined' && opts.method === 'POST') {
        opts.body = '';
      } else if (typeof opts.body === 'object') {
        //
        // according to RFC7231, `GET`, `HEAD`, `DELETE`, and `CONNECT`:
        //
        // > A payload within a $METHOD request message has no defined semantics;
        // > sending a payload body on a $METHOD request might cause some existing
        // > implementations to reject the request.
        //
        // <https://tools.ietf.org/html/rfc7231>
        //
        const preventBodyOnMethods =
          options.preventBodyOnMethods || this.opts.preventBodyOnMethods;
        debug('preventBodyOnMethods', preventBodyOnMethods);
        if (
          Array.isArray(preventBodyOnMethods) &&
          preventBodyOnMethods.includes(opts.method)
        ) {
          query = { ...opts.body, ...query };
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

      const querystring = qs.stringify(
        query,
        options.stringify || this.opts.stringify
      );

      let response;
      let error;
      try {
        response = await this._fetch(
          href + querystring,
          opts,
          typeof options.raw === 'boolean' ? options.raw : this.opts.raw
        );
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
    debug('fetch', path, opts);
    debug('raw', raw);
    // <https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch>
    // mode - no-cors, cors, *same-origin
    // cache - *default, no-cache, reload, force-cache, only-if-cached
    // credentials - include, *same-origin, omit
    // redirect - manual, follow*, error
    // referrer - no-referrer, *client
    if (!METHODS.includes(opts.method))
      throw new Error(
        `Invalid "method" of "${opts.method}", must be one of: ${METHODS.join(
          ', '
        )}`
      );

    if (!MODES.includes(opts.mode))
      throw new Error(
        `Invalid "mode" of "${opts.mode}", must be one of: ${MODES.join(', ')}`
      );

    if (!CACHE.includes(opts.cache))
      throw new Error(
        `Invalid "cache" of "${opts.cache}", must be one of: ${CACHE.join(
          ', '
        )}`
      );

    if (!CREDENTIALS.includes(opts.credentials))
      throw new Error(
        `Invalid "credentials" of "${
          opts.credentials
        }", must be one of: ${CREDENTIALS.join(', ')}`
      );

    if (!REDIRECT.includes(opts.redirect))
      throw new Error(
        `Invalid "redirect" of "${
          opts.redirect
        }", must be one of: ${REDIRECT.join(', ')}`
      );

    if (!REFERRER.includes(opts.referrer))
      throw new Error(
        `Invalid "referrer" of "${
          opts.referrer
        }", must be one of: ${REFERRER.join(', ')}`
      );

    const originalRes = await fetch(path, opts);
    const res = createFrisbeeResponse(originalRes);
    const contentType = res.headers.get('Content-Type');

    if (res.ok) {
      // if we just want a raw response then return early
      if (raw) return res.originalResponse;

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
      delete this.opts.headers.Authorization;
    } else {
      this.opts.headers.Authorization = `Basic ${Buffer.from(
        creds.join(':')
      ).toString('base64')}`;
    }

    return this;
  }

  jwt(token) {
    if (token === null || token === undefined)
      delete this.opts.headers.Authorization;
    else if (typeof token === 'string')
      this.opts.headers.Authorization = `Bearer ${token}`;
    else throw new TypeError('jwt token must be a string');

    return this;
  }
}

module.exports = Frisbee;
