
# Frisbee

[![Slack Status][slack-image]][slack-url]
[![MIT License][license-image]][license-url]
[![Stability][stability-image]][stability-url]
[![Build Status][build-image]][build-url]
[![Coverage Status][coveralls-image]][coveralls-url]
[![Standard JS Style][standard-image]][standard-url]
[![Unicorn Approved][unicorn-approved]][unicorn-url]
[![NPM version][npm-image]][npm-url]
[![NPM downloads][npm-downloads]][npm-url]

> **tldr;** [Stripe][stripe]-inspired API wrapper for WHATWG's [fetch()][fetch-method] method for making simple HTTP requests (alternative to [superagent][superagent], [request][request], [axios][axios]).

> If you're using `node-fetch`, you need `node-fetch@v1.5.3` to use `form-data` with files properly (due to <https://github.com/bitinn/node-fetch/issues/102>)
> If you experience form file upload issues, please see <https://github.com/facebook/react-native/issues/7564#issuecomment-266323928>.


## Index

* [React Native Usage](#react-native-usage)
* [Browser and Server-Side Usage](#browser-and-server-side-usage)
* [API](#api)
* [Frequently Asked Questions](#frequently-asked-questions)
* [Tests](#tests)
* [Development](#development)
* [Background](#background)
* [Contributors](#contributors)
* [Credits](#credits)
* [License](#license)


## React Native Usage

1. Install the required package (note that `react-native` provides us with a `fetch` implementation):

   ```bash
   npm install --save frisbee
   ```

2. Import the package:

   ```js
   import Frisbee from 'frisbee';
   ```

3. See usage example and API below.


## Browser and Server-Side Usage

1. Install the required packages:
    * NPM:

        ```bash
        # optional (to support older browsers):
        npm install --save es6-promise

        # required (this package):
        npm install --save frisbee
        ```
    * Bower:

        ```bash
        # optional (to support older browsers):
        bower install --save es6-promise

        # required (this package):
        bower install --save frisbee
        ```

2. Require it, set default options, and make some requests:

    ```js
    // add optional support for older browsers
    import es6promise from 'es6-promise';
    es6promise.polyfill();

    // require the module
    import Frisbee from 'frisbee';

    // create a new instance of Frisbee
    const api = new Frisbee({
      baseURI: 'https://api.startup.com',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    makeRequests();

    async function makeRequests() {

      // log in to our API with a user/pass
      try {

        // make the request
        let res = await api.post('/v1/login');
        console.log('response', res.body);

        // handle HTTP or API errors
        if (res.err) throw res.err;

        // set basic auth headers for all
        // future API requests we make
        api.auth(res.body.api_token);

        // now let's post a message to our API
        res = await api.post('/v1/messages', { body: 'Hello' });
        console.log('response', res.body);

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
        console.log('response', res.body);

        // handle HTTP or API errors
        if (res.err) throw res.err;

        // unset auth now since we logged out
        api.auth();

        // for more information on `fetch` headers and
        // how to send and expect various types of data:
        // <https://github.com/github/fetch>

      } catch (err) {
        throw err;
      }

    }
    ```

## API

```js
import Frisbee from 'frisbee';
```

`Frisbee` is a function that optionally accepts an argument `options`, which is an object full of options for constructing your API instance.

* `Frisbee` - accepts an `options` object, with the following accepted options:

    * `baseURI` - the default URI to use as a prefix for all HTTP requests
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

    * `headers` - an object containing default headers to send with every request

        * **Tip**: You'll most likely want to set the `"Accept"` header to `"application/json"` and the `"Content-Type"` header to `"application/json"`

    * `auth` - will call the `auth()` function below and set it as a default

    * `arrayFormat` - how to stringify array in passed body. See [qs][qs-url] for available formats

Upon being invoked, `Frisbee` returns an object with the following chainable methods:

* `api.auth(creds)` - helper function that sets BasicAuth headers, and it accepts `user` and `pass` arguments

    * You can pass `creds` user and pass as an array, arguments, or string: `([user, pass])`, `(user, pass)`, or `("user:pass")`, so you shouldn't have any problems!
    * If you don't pass both `user` and `pass` arguments, then it removes any previously set BasicAuth headers from prior `auth()` calls
    * If you pass only a `user`, then it will set `pass` to an empty string `''`)
    * If you pass `:` then it will assume you are trying to set BasicAuth headers using your own `user:pass` string
    * If you pass more than two keys, then it will throw an error (since BasicAuth only consists of `user` and `pass` anyways)

* `api.jwt(token)` - helper function that sets a JWT Bearer header. It accepts the `jwt_token` as a single string argument.  If you simply invoke the function `null` as the argument for your token, it will remove JWT headers.

* All exposed HTTP methods return a Promise, and they require a `path` string, and accept an optional `options` object:
    * Accepted method arguments:
        * `path` **required** - the path for the HTTP request (e.g. `/v1/login`, will be prefixed with the value of `baseURI` mentioned earlier)
        * `options` _optional_ - an object containing options, such as header values, a request body, form data, or a querystring to send along with the request. For the `GET` method (and the `DELETE` method as of version `1.3.0`), `body` data will be encoded in the query string.

            Here are a few examples (you can override/merge your set default headers as well per request):
            * To set a custom header value of `X-Reply-To` on a `POST` request:

                ```js
                const res = await api.post('/messages', {
                  headers: {
                    'X-Reply-To': '7s9inuna748y4l1azchi'
                  }
                });
                ```
    * List of available HTTP methods:
        * `api.get(path, options)` - GET
        * `api.head(path, options)` - HEAD (*does not currently work - see tests*)
        * `api.post(path, options)` - POST
        * `api.put(path, options)` - PUT
        * `api.del(path, options)` - DELETE
        * `api.options(path, options)` - OPTIONS (*does not currently work - see tests*)
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

## Frequently Asked Questions

**How do I unset a default header?**

Simply set its value to `null`, `''`, or `undefined` &ndash; and it will be unset and removed from the headers sent with your request.

A common use case for this is when you are attempting to use `FormData` and need the content boundary automatically added.

**Why do my form uploads randomly fail with React Native?**

This is due to a bug with setting the boundary.  For more information and temporary workaround if you are affected please see <https://github.com/facebook/react-native/issues/7564#issuecomment-266323928>.

**Does this support callbacks, promises, or both?**

As of version `1.0.0` we have dropped support for callbacks, it now __only__ supports Promises.

**What is the `fetch` method?**

It is a WHATWG browser API specification.  You can read more about at the following links:

* <https://fetch.spec.whatwg.org/>
* <https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch>

**Does the Browser or Node.js support `fetch` yet?**

Yes, a lot of browsers are now supporting it!  See this reference for more information <http://caniuse.com/#feat=fetch>.

**If my engine does not support `fetch` yet, is there a polyfill?**

Yes you can use the `fetch` method (polyfill) from [whatwg-fetch][whatwg-fetch] or [node-fetch][node-fetch].

By default, React Native already has a built-in `fetch` out of the box!

**Can I make `fetch` support older browsers?**

Yes, but you'll need a [promise polyfill][promise-polyfill] for [older browsers][older-browsers].

**What is this project about?**

Use this package as a **universal API wrapper** for integrating your API in your client-side or server-side projects.

It's a better working alternative (and with less headaches; at least for me) &ndash; for talking to your API &ndash; than [superagent][superagent] and the default [fetch Network method][fetch-network-method] provide.

Use it for projects in [Node][nodejs], [React][react], [Angular][angular], [React Native][react-native], ...

It supports and is [tested](#Tests) for both client-side usage (e.g. with Bower, Browserify, or Webpack, with `whatwg-fetch`) and also server-side (with `node-fetch`).

**Why not just use `superagent` or `fetch`?**

See [Background](#background) for more information.

**Want to build an API back-end with Node.js?**

See [CrocodileJS][crocodile-url] as a great starting point, and read this article about [building Node.js API's with authentication][blog-article].

**Need help or want to request a feature?**

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

The docs suggest that you use `superagent` with React Native, but in our experience it did not work properly, therefore we went with the next best solution, the Github `fetch` API polyfill included with React Native.  After having several issues trying to use `fetch` and writing our own API wrapper for a project with it (and running into roadblocks along the way) &ndash; we decided to publish this.

Here were the issues we discovered/filed related to this:
* <https://github.com/github/fetch/issues/235>
* <https://github.com/facebook/react-native/issues/4376>
* <https://github.com/visionmedia/superagent/issues/636>
* <https://github.com/facebook/react-native/issues/863>
* <https://github.com/facebook/react-native/issues/370>
* <https://github.com/facebook/react-native/issues/10>

We know that solutions like `superagent` exist, but they don't seem to work well with React Native (which was our use case for this package).

In addition, the authors of WHATWG's fetch API only support throwing errors instead of catching them and bubbling them up to the callback/promise (for example, with Frisbee any HTTP or API errors are found in the `res.err` object).

Therefore we created `frisbee` to serve as our API glue, and hopefully it'll serve as yours too.


## Contributors

* Nick Baugh <niftylettuce@gmail.com>


## Credits

* Thanks to [James Ide][ide] for coining the name "Frisbee" (it used to be called `fetch-api`, and `frisbee` was surprisingly available on NPM)
* Inspiration from <https://gist.github.com/anthonator/0dc0310a931398490fab>, [superagent][superagent], and from writing dozens of API wrappers!
* Google for being an awesome search engine to help me discover stuff on GitHub (haha)


## License

[MIT][license-url]

[blog-article]: http://niftylettuce.com/posts/nodejs-auth-google-facebook-ios-android-eskimo/
[license-image]: http://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: LICENSE
[nodejs]: https://nodejs.org
[react-native]: https://facebook.github.io/react-native
[superagent]: https://github.com/visionmedia/superagent
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
[issue]: https://github.com/crocodilejs/frisbee/issues
[automatic-ip-configuration]: http://moduscreate.com/automated-ip-configuration-for-react-native-development/
[frisbee-logo]: https://cdn.rawgit.com/crocodilejs/frisbee/master/media/logo-revised.svg
[unicorn-approved]: http://img.shields.io/badge/unicorn-approved-ff69b4.svg
[unicorn-url]: https://www.youtube.com/watch?v=9auOCbH5Ns4
[coveralls-image]: https://coveralls.io/repos/github/crocodilejs/frisbee/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/crocodilejs/frisbee?branch=master
[build-image]: https://semaphoreci.com/api/v1/niftylettuce/frisbee/branches/master/shields_badge.svg
[build-url]: https://semaphoreci.com/niftylettuce/frisbee
[codecov-image]: https://img.shields.io/codecov/c/github/crocodilejs/frisbee/master.svg
[codecov-url]: https://codecov.io/github/crocodilejs/frisbee
[standard-image]: https://img.shields.io/badge/code%20style-standard%2Bes7-brightgreen.svg
[standard-url]: https://github.com/meetearnest/eslint-config-earnest-es7
[stability-image]: https://img.shields.io/badge/stability-stable-green.svg
[stability-url]: https://nodejs.org/api/documentation.html#documentation_stability_index
[request]: https://github.com/request/request
[slack-image]: http://slack.crocodilejs.com/badge.svg
[slack-url]: http://slack.crocodilejs.com
[axios]: https://github.com/mzabriskie/axios
[fetch-method]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
[stripe]: https://stripe.com/docs/api#errors
[crocodile-url]: https://github.com/crocodilejs/crocodile
[qs-url]: https://github.com/ljharb/qs
