
//     frisbee
//     Copyright (c) 2015- Nick Baugh <niftylettuce@gmail.com>
//     MIT Licensed

// * Author: [@niftylettuce](https://twitter.com/#!/niftylettuce)
// * Source: <https://github.com/niftylettuce/frisbee>

// # frisbee

import Debug from 'debug';

const debug = Debug('fetch-api');

let fetch = (typeof window === 'object') ? window.fetch : global.fetch;

if (!fetch)
  throw new Error(
      'A global `fetch` method is required as either `window.fetch` '
    + 'for browsers or `global.fetch` for node runtime environments. '
    + 'Please add `require(\'isomorphic-fetch\')` before importing `frisbee`. '
    + 'You may optionally `require(\'es6-promise\').polyfill()` before you '
    + 'require `isomorphic-fetch` if you want to support older browsers.'
    + '\n\nFor more info: https://github.com/niftylettuce/frisbee#usage'
  );

let methods = [
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
    }

    if (this.opts.auth)
      this.auth(this.opts.auth);

    methods.forEach((method) => {
      this[method] = this._setup(method);
    });

  }

  _setup(method) {

    let that = this;

    return (path, options, callback) => {

      // path must be string
      if (typeof path !== 'string')
        throw new Error('`path` must be a string');

      if (typeof options === 'function') {
        callback = options;
        options = {};
      }

      // options must be an object

      // in case it is null, undefined, or false value
      if (!options)
        options = {};

      // otherwise check if its an object
      if (typeof options !== 'object' || options instanceof Array)
        throw new Error('`options` must be an object');

      // callback must be a function
      if (typeof callback !== 'function')
        throw new Error('`callback` must be a function');

      let opts = {
        headers: {
          ...that.headers
        },
        ...options,
        method: method === 'del' ? 'DELETE' : method.toUpperCase()
      };

      let response;

      // TODO: rewrite this with `await`
      // <https://github.com/github/fetch/issues/235#issuecomment-160059975>
      let request = fetch(that.opts.baseURI + path, opts);
      request.then((res) => {
          // set original response
          response = res;
          return res;
        })
        .then((res) => {

          if (!res.ok)
            throw new Error(res.statusText);

          if (opts.headers['Content-Type'] !== 'application/json')
            return res.text();

          try {
            return res.json();
          } catch (err) {
            throw new Error(
              `Failed to parse JSON body: ${err.message}`
            );
          }

        }).then((body) => {
          callback(null, response, body);
        }).catch((err) => {
          callback(err, response, response.statusText);
        });

      return that;

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

    if (!(creds instanceof Array))
      creds = Array.prototype.slice.call(arguments);

    switch (creds.length) {
    case 0:
      creds = new Array('', '');
      break;
    case 1:
      creds.push('');
      break;
    case 2:
      break;
    default:
      throw new Error('auth option can only have two keys `[user, pass]`')
    }

    if (typeof creds[0] !== 'string')
      throw new Error('auth option `user` must be a string');

    if (typeof creds[1] !== 'string')
      throw new Error('auth option `pass` must be a string');

    if (creds[0] === '' && creds[1] === '')
      delete this.headers.Authorization;
    else
      this.headers.Authorization =
        'Basic ' + new Buffer(creds.join(':')).toString('base64');

    return this;

  }

}
