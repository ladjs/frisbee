
//     frisbee
//     Copyright (c) 2015- Nick Baugh <niftylettuce@gmail.com>
//     MIT Licensed

// * Author: [@niftylettuce](https://twitter.com/#!/niftylettuce)
// * Source: <https://github.com/niftylettuce/frisbee>

// # frisbee

const fetch = typeof window === 'object' ? window.fetch : global.fetch;

if (!fetch)
  throw new Error(
      'A global `fetch` method is required as either `window.fetch` '
    + 'for browsers or `global.fetch` for node runtime environments. '
    + 'Please add `require(\'isomorphic-fetch\')` before importing `frisbee`. '
    + 'You may optionally `require(\'es6-promise\').polyfill()` before you '
    + 'require `isomorphic-fetch` if you want to support older browsers.'
    + '\n\nFor more info: https://github.com/niftylettuce/frisbee#usage'
  );

const methods = [
  'get',
  'head',
  'post',
  'put',
  'del',
  'options',
  'patch'
];

export default class Frisbee {

  constructor(opts) {

    this.opts = opts || {};

    if (!this.opts.baseURI)
      throw new Error('baseURI option is required');

    this.headers = {
      ...opts.headers
    };

    if (this.opts.auth)
      this.auth(this.opts.auth);

    methods.forEach(method => this[method] = this._setup(method));

  }

  _setup(method) {

    return (path, options = {}, callback) => {

      // path must be string
      if (typeof path !== 'string')
        throw new Error('`path` must be a string');

      if (typeof options === 'function') {
        callback = options;
        options = {};
      }

      // otherwise check if its an object
      if (typeof options !== 'object' || Array.isArray(options))
        throw new Error('`options` must be an object');

      // callback must be a function
      if (callback && typeof callback !== 'function')
        throw new Error('`callback` must be a function');

      const opts = {
        headers: {
          ...this.headers
        },
        ...options,
        method: method === 'del' ? 'DELETE' : method.toUpperCase()
      };

      let response;

      const request = fetch(this.opts.baseURI + path, opts)
        .then(res => {
          // set original response
          response = res;
          return res;
        })
        .then(res => {

          let body;

          if (!res.ok) {

            let err = new Error(res.statusText);

            // As inspired by Stripe
            // <https://goo.gl/QFLdGM>
            try {
              body = JSON.parse(res._bodyInit);
              if (typeof body === 'object' && typeof body.error === 'object') {
                err = new Error(body.error.message);
                if (body.error.stack)
                  err.stack = body.error.stack;
                if (body.error.code)
                  err.code = body.error.code;
                if (body.error.param)
                  err.param = body.error.param;
              }
            } catch (e) {} finally {
              throw err;
            }

          }

          if (opts.headers['Content-Type'] !== 'application/json' && opts.headers['Accept'] !== 'application/json') {
            body = res.text();
          }
          else {
            try {
              body = res.json();
            } catch (err) {
              var message = 'Failed to parse JSON body: ' + err.message;
              if (callback) {
                return callback(message);
              }
              throw new Error(message);
            }
          }

          return body;
        })
        .then(body =>
          callback ?
          callback(null, response, body) :
          { response, body }
        )
        .catch(err => {
          if (!response || !response.statusText) {
            if (callback) return callback(err, response || null);
            throw err;
          }

          if (callback)
            return callback(err, response, response.statusText);
          throw new Error(err);
        });

      return callback ? this : request;

    }

  }

  auth(creds) {

    if (typeof creds === 'string') {
      let index = creds.indexOf(':');
      if (index !== -1) {
        creds = [
          creds.substr(0, index),
          creds.substr(index + 1)
        ]
      }
    }

    if (!Array.isArray(creds))
      creds = [].slice.call(arguments);

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
      throw new Error('auth option `user` must be a string');

    if (typeof creds[1] !== 'string')
      throw new Error('auth option `pass` must be a string');

    if (!creds[0] && !creds[1])
      delete this.headers.Authorization;
    else
      this.headers.Authorization =
        'Basic ' + new Buffer(creds.join(':')).toString('base64');

    return this;

  }

}
