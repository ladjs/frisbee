# Frisbee

[![Slack Status][slack-image]][slack-url]
[![npm version][npm-image]][npm-url]
[![npm downloads][npm-downloads]][npm-url]
[![build status](https://img.shields.io/travis/niftylettuce/frisbee.svg)](https://travis-ci.org/niftylettuce/frisbee)
[![code coverage](https://img.shields.io/codecov/c/github/niftylettuce/frisbee.svg)](https://codecov.io/gh/niftylettuce/frisbee)
[![code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![made with lass](https://img.shields.io/badge/made_with-lass-95CC28.svg)](https://lass.js.org)
[![license](https://img.shields.io/github/license/niftylettuce/frisbee.svg)](LICENSE)

> :heart: Love this project? Support <a href="https://github.com/niftylettuce" target="_blank">@niftylettuce's</a> [FOSS](https://en.wikipedia.org/wiki/Free_and_open-source_software) on <a href="https://patreon.com/niftylettuce" target="_blank">Patreon</a> or <a href="https://paypal.me/niftylettuce">PayPal</a> :unicorn:

Modern [fetch-based][fetch] alternative to [axios][]/[superagent][]/[request][]. Great for [React Native][react-native].

> **New in v2.0.4++**: `baseURI` is now optional and you can pass `raw: true` as a global or request-based option to get the raw `fetch()` response (e.g. if you want to use `res.arrayBuffer()` or [any other method][fetch-methods] manually).


## Table of Contents

* [Install](#install)
  * [Node (Koa, Express, React Native, ...)](#node-koa-express-react-native-)
  * [Browser](#browser)
* [Usage](#usage)
  * [Example](#example)
  * [API](#api)
  * [Logging and Debugging](#logging-and-debugging)
  * [Common Issues](#common-issues)
  * [Required Features](#required-features)
* [Frequently Asked Questions](#frequently-asked-questions)
  * [How do I unset a default header](#how-do-i-unset-a-default-header)
  * [Why do my form uploads randomly fail with React Native](#why-do-my-form-uploads-randomly-fail-with-react-native)
  * [Does this support callbacks, promises, or both](#does-this-support-callbacks-promises-or-both)
  * [What is the `fetch` method](#what-is-the-fetch-method)
  * [Does the Browser or Node.js support `fetch` yet](#does-the-browser-or-nodejs-support-fetch-yet)
  * [If my engine does not support `fetch` yet, is there a polyfill](#if-my-engine-does-not-support-fetch-yet-is-there-a-polyfill)
  * [Can I make `fetch` support older browsers](#can-i-make-fetch-support-older-browsers)
  * [What is this project about](#what-is-this-project-about)
  * [Why not just use `superagent` or `fetch`](#why-not-just-use-superagent-or-fetch)
  * [Want to build an API back-end with Node.js](#want-to-build-an-api-back-end-with-nodejs)
  * [Need help or want to request a feature](#need-help-or-want-to-request-a-feature)
* [Tests](#tests)
* [Development](#development)
* [Background](#background)
* [Contributors](#contributors)
* [Credits](#credits)
* [License](#license)


## Install

### Node (Koa, Express, React Native, ...)

1. Install the required package:

   ```sh
   npm install --save frisbee
   ```

2. See [usage example and API below](#usage)

### Browser

#### VanillaJS

1. Load the package via `<script>` tag (note you will need to polyfill with [required features](#required-features)):

```html
<script crossorigin="anonymous" src="https://polyfill.io/v3/polyfill.min.js?features=es6,fetch,Promise,Symbol,Array.from,Object.setPrototypeOf,Uint8Array,Map,Reflect,Object.getOwnPropertyDescriptors"></script>
<script src="https://unpkg.com/frisbee"></script>
<script type="text/javascript">
  (function() {
    // create a new instance of Frisbee
    var api = new Frisbee({
      baseURI: 'https://api.startup.com', // optional
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // this is a simple example using `.then` and `.catch`
    api.get('/hello-world').then(console.log).catch(console.error);

    //
    // see the Usage section below in Frisbee's README for more information
    // https://github.com/niftylettuce/frisbee
    //
  })();
</script>
```

2. See [usage example and API below](#usage) for a more complete example.

#### Bundler

1. Install the required package:

   ```sh
   npm install frisbee
   ```

2. Ensure that your environment is polyfilled with [required features](#required-features) (e.g. use [@babel/polyfill][babel-polyfill] globally or a service like [polyfill.io](https://polyfill.io))

3. See [usage example and API below](#usage)


## Usage

### Example

```js
const Frisbee = require('frisbee');

// create a new instance of Frisbee
const api = new Frisbee({
  baseURI: 'https://api.startup.com', // optional
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// this is a simple example using `.then` and `.catch`
api.get('/hello-world').then(console.log).catch(console.error);

// this is a more complex example using async/await and basic auth
(async () => {
  // log in to our API with a user/pass
  try {
    // make the request
    let res = await api.post('/v1/login');

    // handle HTTP or API errors
    if (res.err) throw res.err;

    // set basic auth headers for all
    // future API requests we make
    api.auth(res.body.api_token);

    // now let's post a message to our API
    res = await api.post('/v1/messages', { body: 'Hello' });

    // handle HTTP or API errors
    if (res.err) throw res.err;

    // now let's get a list of messages filtered by page and limit
    res = await api.get('/v1/messages', {
      body: {
        limit: 10,
        page: 2
      }
    });

    // handle HTTP or API errors
    if (res.err) throw res.err;

    // now let's logout
    res = api.post('/v1/logout');

    // handle HTTP or API errors
    if (res.err) throw res.err;

    // unset auth now since we logged out
    api.auth();

    // for more information on `fetch` headers and
    // how to send and expect various types of data:
    // <https://github.com/github/fetch>
  } catch (err) {
    console.error(err);
  }
})();
```

### API

```js
const Frisbee = require('frisbee');
```

`Frisbee` is a function that optionally accepts an argument `options`, which is an object full of options for constructing your API instance.

* `Frisbee` - accepts an `options` object, with the following accepted options:

  * `baseURI` (String) - the default URI to use as a prefix for all HTTP requests (optional as of v2.0.4+)

    * If your API server is running on `http://localhost:8080`, then use that as the value for this option

    * If you use [React Native][react-native], then you most likely want to set `baseURI` as follows (e.g. making use of `__DEV__` global variable):

      ```js
      const api = new Frisbee({
        baseURI: __DEV__
          ? process.env.API_BASE_URI || 'http://localhost:8080'
          : 'https://api.startup.com'
      });
      ```

    * You could also set `API_BASE_URI` as an environment variable, and then set the value of this option to `process.env.API_BASE_URI` (e.g. `API_BASE_URI=http://localhost:8080 node app`)

    * Using [React Native][react-native]?  You might want to read this article about [automatic IP configuration][automatic-ip-configuration].

  * `headers` (Object) - an object containing default headers to send with every request

    * **Tip**: You'll most likely want to set the `"Accept"` header to `"application/json"` and the `"Content-Type"` header to `"application/json"`

  * `body` (Object) - an object containing default body payload to send with every request  (API method specific `params` options will override or extend properties defined here, but not deep merge)

  * `params` (Object) - an object containing default querystring parameters to send with every request (API method specific `params` options will override or extend properties defined here, but will not deep merge)

  * `logRequest` (Function) - a function that accepts two arguments `path` (String) and `opts` (Object) and will be called with before a fetch request is made with (e.g. `fetch(path, opts)` – see [Logging and Debugging](#logging-and-debugging) below for example usage) - this defaults to `false` so no log request function is called out of the box

  * `logResponse` (Function) - a function that accepts three arguments `path` (String), `opts` (Object), and `response` (Object) and has the same parameters as `logRequest`, with the exception of the third `response`, which is the raw response object returned from fetch (see [Logging and Debugging](#logging-and-debugging) below for example usage) - this defaults to `false` so no log response function is called out of the box

  * `auth` - will call the `auth()` function below and set it as a default

  * `parse` - options passed to `qs.parse` method (see [qs][qs-url] for all available options)

    * `ignoreQueryPrefix` (Boolean) - defaults to `true`, and parses querystrings from URL's properly

  * `stringify` - options passed to `qs.stringify` method (see [qs][qs-url] for all available options)

    * `addQueryPrefix` (Boolean) - defaults to `true`, and affixes the path with required `?` parameter if a querystring is to be passed

    * `format` (String) - defaults to `RFC1738`

    * `arrayFormat` (String) - defaults to `'indices'`

  * `preventBodyOnMethods` (Array) - defaults to `[ 'GET', 'HEAD', 'DELETE', 'CONNECT' ]`, and is an Array of HTTP method names that we will convert a `body` option to be querystringified URL parameters (e.g. `api.get('/v1/users', { search: 'foo' })` will result in `GET /v1/users?search=foo`).  According to [RFC 7231](https://tools.ietf.org/html/rfc7231), the default methods defined here have no defined semantics for having a payload body, and having one may cause some implementations to reject the request (which is why we set this as a default).  If you wish to disable this, you may pass `preventBodyOnMethods: false` or your own custom Array `preventBodyOnMethods: [ ... ]`

  * `interceptableMethods` (Array) - defaults to all API methods supported below (defaults to `GET`, `HEAD`, `POST`, `PUT`, `DELETE`, `OPTIONS`, `PATCH`)

  * `raw` (Boolean) - return a raw fetch response (new as of v2.0.4+)

  * `abortToken` (Symbol) - some Symbol that you can use to abort one or more frisbee requests

  * `signal` (Object) - an [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) Signal used to cancel a fetch request

  * `mode` (String) - passed to fetch, defaults to "same-origin" (see [Fetch's documentation][fetch-documentation] for more info)

  * `cache` (String) - passed to fetch, defaults to "default" (see [Fetch's documentation][fetch-documentation] for more info)

  * `credentials` (String) - passed to fetch, defaults to "same-origin" (see [Fetch's documentation][fetch-documentation] for more info)

  * `redirect` (String) - passed to fetch, defaults to "follow" (see [Fetch's documentation][fetch-documentation] for more info)

  * `referrer` (String) - passed to fetch, defaults to "client" (see [Fetch's documentation][fetch-documentation] for more info)

Upon being invoked, `Frisbee` returns an object with the following chainable methods:

* `api.auth(creds)` - helper function that sets BasicAuth headers, and it accepts `user` and `pass` arguments

  * You can pass `creds` user and pass as an array, arguments, or string: `([user, pass])`, `(user, pass)`, or `("user:pass")`, so you shouldn't have any problems!
  * If you don't pass both `user` and `pass` arguments, then it removes any previously set BasicAuth headers from prior `auth()` calls
  * If you pass only a `user`, then it will set `pass` to an empty string `''`)
  * If you pass `:` then it will assume you are trying to set BasicAuth headers using your own `user:pass` string
  * If you pass more than two keys, then it will throw an error (since BasicAuth only consists of `user` and `pass` anyways)

* `api.setOptions(opts)` - helper function to update instance options (note this does not call `api.auth` internally again even if `opts.auth` is passed)

* `api.jwt(token)` - helper function that sets a JWT Bearer header. It accepts the `jwt_token` as a single string argument.  If you simply invoke the function `null` as the argument for your token, it will remove JWT headers.

* `api.abort(token)` - aborts all current/queued requests that were created using `token`

* `api.abortAll()` - aborts all current/queued - i.e. `await`-ing in an interceptor - requests

* All exposed HTTP methods return a Promise, and they require a `path` string, and accept an optional `options` object:

  * Accepted method arguments:

    * `path` **required** - the path for the HTTP request (e.g. `/v1/login`, will be prefixed with the value of `baseURI` if set)

    * `options` _optional_ - an object containing options, such as header values, a request body, form data, or a querystring to send along with the request. These options by default are inherited from global options passed to `new Frisbee({ options })`.  For the `GET` method (and the `DELETE` method as of version `1.3.0`), `body` data will be encoded in the query string.  \*\*This `options` object is passed to the native Fetch API method, which means you can use native Fetch API method options as well from [Fetch's documentation][fetch-documentation]

      > To make only a certain request be raw and not parsed by Frisbee:

      ```js
      const res = await api.get('/v1/messages', { raw: false });
      ```

      > Here are a few examples (you can override/merge your set default headers as well per request):

      * To turn off caching, pass `cache: 'reload'` to native fetch options:

        ```js
        const res = await api.get('/v1/messages', { cache: 'reload' });
        ```

      * To set a custom header value of `X-Reply-To` on a `POST` request:

        ```js
        const res = await api.post('/messages', {
          headers: {
            'X-Reply-To': '7s9inuna748y4l1azchi'
          }
        });
        ```

    * `raw` _optional_ - will override a global `raw` option if set, and if it is `true` it will return a raw `fetch` response (new as of v2.0.4+)

  * List of available HTTP methods:

    * `api.get(path, options)` - GET
    * `api.head(path, options)` - HEAD (_does not currently work - see tests_)
    * `api.post(path, options)` - POST
    * `api.put(path, options)` - PUT
    * `api.del(path, options)` - DELETE
    * `api.delete(path, options)` - DELETE
    * `api.options(path, options)` - OPTIONS (_does not currently work - see tests_)
    * `api.patch(path, options)` - PATCH

  * Note that you can chain the `auth` method and a HTTP method together:

    ```js
    const res = await api.auth('foo:bar').get('/');
    ```

* `interceptor` - object that can be used to manipulate request and response interceptors. It has the following methods:

  * `api.interceptor.register(interceptor)`:
    Accepts an interceptor object that can have one or more of the following functions
    ```js
    {
    request: function (path, options) {
        // Read/Modify the path or options
        // ...
        return [path, options];
    },
    requestError: function (err) {
        // Handle an error occured in the request method
        // ...
        return Promise.reject(err);
    },
    response: function (response) {
        // Read/Modify the response
        // ...
        return response;
    },
    responseError: function (err) {
        // Handle error occured in api/response methods
        return Promise.reject(err);
    }
    ```
    the `register` method returns an `unregister()` function so that you can unregister the added interceptor.

  * `api.interceptor.unregister(interceptor)`:
    Accepts the interceptor reference that you want to delete.

  * `api.interceptor.clear()`:
    Removes all the added interceptors.

  * Note that when interceptors are added in the order ONE->TWO->THREE:
    * The `request`/`requestError` functions will run in the same order `ONE->TWO->THREE`.
    * The `response`/`responseError` functions will run in reversed order `THREE->TWO->ONE`.

### Logging and Debugging

> We **highly recommend** to [use CabinJS as your Node.js and JavaScript logging utility][cabin] (see [Automatic Request Logging](https://cabinjs.com/#/?id=automatic-request-logging) for complete examples).

#### Logging Requests and Responses

You can log both requests and/or responses made to fetch internally in Frisbee.  Simply pass a `logRequest` and/or `logResponse` function.

> `logRequest` accepts two arguments `path` (String) and `opts` (Object) and these two arguments are what we call `fetch` with internally (e.g. `fetch(path, opts)`):

```js
const cabin = require('cabin');
const frisbee = require('frisbee');
const pino = require('pino')({
  customLevels: {
    log: 30
  }
});

const logger = new Cabin({
  // (optional: your free API key from https://cabinjs.com)
  // key: 'YOUR-CABIN-API-KEY',
  axe: { logger: pino }
});

const api = new Frisbee({
  logRequest: (path, opts) => {
    logger.info('fetch request', { path, opts });
  }
});
```

> `logResponse` accepts three arguments, the first two are the same as `logRequest` (e.g. `path` and `opts`), but the third argument is `response` (Object) and is the raw response object returned from fetch (e.g. `const response = await fetch(path, opts)`):

```js
const cabin = require('cabin');
const frisbee = require('frisbee');
const pino = require('pino')({
  customLevels: {
    log: 30
  }
});

const logger = new Cabin({
  // (optional: your free API key from https://cabinjs.com)
  // key: 'YOUR-CABIN-API-KEY',
  axe: { logger: pino }
});

const api = new Frisbee({
  logResponse: (path, opts, res) => {
    logger.info('fetch response', { path, opts, res });
  }
});
```

#### Debug Statements

You can run your application with `DEBUG=frisbee node app.js` to output debug logging statements with Frisbee.

### Common Issues

* If you're using `node-fetch`, you need `node-fetch@v1.5.3+` to use `form-data` with files properly (due to [bitinn/node-fetch#102](https://github.com/bitinn/node-fetch/issues/102))
* If you experience form file upload issues, please see [facebook/react-native#7564 (comment)](https://github.com/facebook/react-native/issues/7564#issuecomment-266323928).

### Required Features

This list is sourced from ESLint output and polyfilled settings through [eslint-plugin-compat][].

* `fetch`
* `Promise`
* `Symbol`
* `Array.from`
* `ArrayBuffer.isView`
* `Object.setPrototypeOf`
* `Object.getOwnPropertySymbols`
* `Uint8Array`
* `Reflect`
* `Map`
* `Object.getOwnPropertyDescriptors`


## Frequently Asked Questions

### How do I unset a default header

Simply set its value to `null`, `''`, or `undefined` – and it will be unset and removed from the headers sent with your request.

A common use case for this is when you are attempting to use `FormData` and need the content boundary automatically added.

### Why do my form uploads randomly fail with React Native

This is due to a bug with setting the boundary.  For more information and temporary workaround if you are affected please see [facebook/react-native#7564 (comment)](https://github.com/facebook/react-native/issues/7564#issuecomment-266323928).

### Does this support callbacks, promises, or both

As of version `1.0.0` we have dropped support for callbacks, it now **only** supports Promises.

### What is the `fetch` method

It is a WHATWG browser API specification.  You can read more about at the following links:

* <https://fetch.spec.whatwg.org/>
* <https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch>

### Does the Browser or Node.js support `fetch` yet

Yes, a lot of browsers are now supporting it!  See this reference for more information <http://caniuse.com/#feat=fetch>.

### If my engine does not support `fetch` yet, is there a polyfill

Yes you can use the `fetch` method (polyfill) from [whatwg-fetch][whatwg-fetch] or [node-fetch][node-fetch].

By default, React Native already has a built-in `fetch` out of the box!

### Can I make `fetch` support older browsers

Yes, but you'll need a [promise polyfill][promise-polyfill] for [older browsers][older-browsers].

### What is this project about

Use this package as a **universal API wrapper** for integrating your API in your client-side or server-side projects.

It's a better working alternative (and with less headaches; at least for me) – for talking to your API – than [superagent][superagent] and the default [fetch Network method][fetch-network-method] provide.

Use it for projects in [Node][nodejs], [React][react], [Angular][angular], [React Native][react-native], ...

It supports and is [tested](#tests) for both client-side usage (e.g. with Bower, Browserify, or Webpack, with `whatwg-fetch`) and also server-side (with `node-fetch`).

### Why not just use `superagent` or `fetch`

See [Background](#background) for more information.

### Want to build an API back-end with Node.js

See [Lad][lad-url] as a great starting point, and read this article about [building Node.js API's with authentication][blog-article].

### Need help or want to request a feature

File [an issue][issue] on GitHub and we'll try our best help you out.


## Tests

This package is tested to work with `whatwg-fetch` and `node-fetch`.

This means that it is compatible for both client-side and server-side usage.


## Development

1. Fork/clone this repository
2. Run `npm install`
3. Run `npm run watch` to watch the `src` directory for changes
4. Make changes in `src` directory
5. Write unit tests in `/test/` if you add more stuff
6. Run `npm test` when you're done
7. Submit a pull request


## Background

The docs suggest that you use `superagent` with React Native, but in our experience it did not work properly, therefore we went with the next best solution, the Github `fetch` API polyfill included with React Native.  After having several issues trying to use `fetch` and writing our own API wrapper for a project with it (and running into roadblocks along the way) – we decided to publish this.

Here were the issues we discovered/filed related to this:

* [github/fetch#235](https://github.com/github/fetch/issues/235)
* [facebook/react-native#4376](https://github.com/facebook/react-native/issues/4376)
* [visionmedia/superagent#636](https://github.com/visionmedia/superagent/issues/636)
* [facebook/react-native#863](https://github.com/facebook/react-native/issues/863)
* [facebook/react-native#370](https://github.com/facebook/react-native/issues/370)
* [facebook/react-native#10](https://github.com/facebook/react-native/issues/10)

We know that solutions like `superagent` exist, but they don't seem to work well with React Native (which was our use case for this package).

In addition, the authors of WHATWG's fetch API only support throwing errors instead of catching them and bubbling them up to the callback/promise (for example, with Frisbee any HTTP or API errors are found in the `res.err` object).

Therefore we created `frisbee` to serve as our API glue, and hopefully it'll serve as yours too.


## Contributors

| Name                 | Website                    |
| -------------------- | -------------------------- |
| **Nick Baugh**       | <http://niftylettuce.com/> |
| **Alexis Tyler**     |                            |
| **Assem-Hafez**      |                            |
| **Jordan Denison**   |                            |
| **James**            |                            |
| **Sampsa Saarela**   |                            |
| **Julien Moutte**    |                            |
| **Charles Soetan**   |                            |
| **Kesha Antonov**    |                            |
| **Ben Turley**       |                            |
| **Richard Evans**    |                            |
| **Hawken Rives**     |                            |
| **Fernando Montoya** |                            |
| **Brent Vatne**      |                            |
| **Hosmel Quintana**  |                            |
| **Kyle Kirbatski**   |                            |
| **Adam Jenkins**     |                            |


## Credits

* Thanks to [James Ide][ide] for coining the name "Frisbee" (it used to be called `fetch-api`, and `frisbee` was surprisingly available on npm)
* Inspiration from <https://gist.github.com/anthonator/0dc0310a931398490fab>, [superagent][superagent], and from writing dozens of API wrappers!
* Google for being an awesome search engine to help me discover stuff on GitHub (haha)


## License

[MIT](LICENSE) © [Nick Baugh](http://niftylettuce.com/)


## 

[blog-article]: http://niftylettuce.com/posts/nodejs-auth-google-facebook-ios-android-eskimo/

[nodejs]: https://nodejs.org

[fetch-network-method]: https://facebook.github.io/react-native/docs/network.html#fetch

[npm-image]: http://img.shields.io/npm/v/frisbee.svg?style=flat

[npm-url]: https://npmjs.org/package/frisbee

[npm-downloads]: http://img.shields.io/npm/dm/frisbee.svg?style=flat

[whatwg-fetch]: https://github.com/github/fetch

[node-fetch]: https://github.com/bitinn/node-fetch

[promise-polyfill]: https://github.com/jakearchibald/es6-promise

[older-browsers]: http://caniuse.com/#feat=promises

[ide]: https://github.com/ide

[react]: https://facebook.github.io/react/

[angular]: https://angularjs.org/

[issue]: https://github.com/niftylettuce/frisbee/issues

[automatic-ip-configuration]: http://moduscreate.com/automated-ip-configuration-for-react-native-development/

[slack-image]: https://slack.crocodilejs.com/badge.svg

[slack-url]: https://slack.crocodilejs.com

[lad-url]: https://lad.js.org

[qs-url]: https://github.com/ljharb/qs

[axios]: https://github.com/mzabriskie/axios

[fetch]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API

[react-native]: https://facebook.github.io/react-native

[superagent]: https://github.com/visionmedia/superagent

[request]: https://github.com/request/request

[fetch-methods]: https://developer.mozilla.org/en-US/docs/Web/API/Body

[babel-polyfill]: https://babeljs.io/docs/en/babel-polyfill

[eslint-plugin-compat]: https://github.com/amilajack/eslint-plugin-compat

[cabin]: https://cabinjs.com

[fetch-documentation]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
