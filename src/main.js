
//     node-react-native-fetch-api
//     Copyright (c) 2015- Nick Baugh <niftylettuce@gmail.com>
//     MIT Licensed

// * Author: [@niftylettuce](https://twitter.com/#!/niftylettuce)
// * Source: <https://github.com/niftylettuce/node-react-native-fetch-api>

// # node-react-native-fetch-api

import Debug from 'debug';

const debug = Debug('fetch-api');
const fetch = typeof window === 'undefined' ? global.fetch : window.fetch;

if (!fetch)
  throw new Error('fetch is required, use `whatwg-fetch` or `node-fetch`');

let methods = [
  'get',
  'head',
  'post',
  'put',
  'del',
  'options',
  'patch'
];

export default class Api {

  constructor(opts) {

    this.opts = opts || {};

    if (!this.opts.baseURI)
      throw new Error('baseURI option is required');

    this.headers = {
      ...opts.headers,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }

    // support `auth` being an array or a string
    // and if it is a string and contains ':'
    // then split on that and only return 2 keys
    if (this.opts.auth)
      this.auth(this.opts.auth);

    methods.forEach((method) => {
      this[method] = this._setup(method);
    });

  }

  _setup(method) {

    let that = this;

    return (path, options, callback) => {

      // TODO: path must be string

      if (typeof options === 'function') {
        callback = options;
        options = {};
      }

      // TODO: callback must be a function

      let opts = {
        headers: {
          ...that.headers
        },
        ...options,
        method: method === 'del' ? 'DELETE' : method.toUpperCase()
      };

      let res;

      fetch(
        that.opts.baseURI + path,
        opts
      ).then((_res) => {
        res = _res;
        try {
          _res = _res.json();
        } catch (e) {
          _res = _res.text();
        } finally {
          return _res;
        }
      }).then((body) => {
        callback(null, res, body);
      }).catch((err) => {
        callback(err);
      });

    }
  }

  auth(creds) {

    if (typeof creds === 'string') {
      let index = creds.indexOf(':');
      if (index !== -1) {
        let split = creds.split(':');
        creds = [
          split.slice(0),
          split.slice(index, split.length)
        ]
      } else {
        creds = [ creds ];
      }
    }

    if (!creds instanceof Array)
      throw new Error('auth must be an array or string');

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
  }

  /*
      get(path, fn) {
        fetch(that.opts.baseURI + path, {
          method: 'GET',
          headers: that.headers
        })
        .then((res) => {
          try {
            let response = JSON.parse(res);
            if (response && response.error)
              throw new Error(response.error);
            return res.json();
          } catch (e) {
            return res.text();
          }
        })
        .then((res) => {
          fn(null, res);
        })
        .catch((err) => {
          fn(err);
        })
      },
      post(path, data, fn) {
        if (!fn)
          fn = data;
        fetch(that.opts.baseURI + path, {
          method: 'POST',
          body: JSON.stringify(data),
          headers: that.headers
        })
        .then((res) => res.json())
        .then((res) => {
          if (res && res.error)
            return fn(res.error);
          fn(null, res);
        })
        .catch(fn)
      },
      put(path, data, fn) {
        fetch(that.opts.baseURI + path, {
          method: 'PUT',
          body: JSON.stringify(data),
          headers: that.headers
        })
        .then((res) => res.json())
        .then((res) => {
          if (res && res.error)
            return fn(res.error);
          fn(null, res);
        })
        .catch(fn)
      },
      delete(path, data, fn) {
        fetch(that.opts.baseURI + path, {
          method: 'DELETE',
          headers: that.headers
        })
        .then((res) => res.json())
        .then((res) => {
          if (res && res.error)
            return fn(res.error);
          fn(null, res);
        })
        .catch(fn)
      }
    };
  }
  */

}
