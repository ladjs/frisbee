
![Frisbee][frisbee-logo]

# Frisbee

[![Circle CI][circle-ci-image]][circle-ci-url]
[![NPM version][npm-image]][npm-url]
[![NPM downloads][npm-downloads]][npm-url]
[![MIT License][license-image]][license-url]

> **Your API wrapper for ES6's fetch method.  Easily make HTTP requests to your API.  BYOF; Bring your own `fetch` method from [whatwg-fetch][whatwg-fetch] or [node-fetch][node-fetch].  You'll need a [promise polyfill][promise-polyfill] for [older browsers][older-browsers].**


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

2. Require the package:
  * If you're using stock React Native:

      ```js
      var Frisbee = require('frisbee').default;
      ```
  * If you're using Webpack with support for ES6:

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

        # required (to add global `fetch` method):
        npm install --save isomorphic-fetch

        # required (this package):
        npm install --save frisbee
        ```
    * Bower:

        ```bash
        # optional (to support older browsers):
        bower install --save es6-promise

        # required (to add global `fetch` method):
        bower install --save isomorphic-fetch

        # required (this package):
        bower install --save frisbee
        ```

2. Require it, set default options, and make some requests using promises:

    ```js
    // add optional support for older browsers
    import es6promise from 'es6-promise';
    es6promise.polyfill();

    // add required support for global `fetch` method
    // *this must always come before `frisbee` is imported*
    import 'isomorphic-fetch';

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

    // log in to our API with a user/pass
    api.post('/v1/login').then(data => {

      // you'll probably want to handle this
      // error better than just throwing it
      if (err) throw err;

      // set basic auth headers for all
      // future API requests we make
      api.auth(data.body.api_token);

      // now let's post a message to our API
      return api.post(
        '/v1/message',
        { body: 'Hello' },
        // if you wanted to pass JSON instead of plaintext:
        // { body: JSON.stringify({ message: 'Hello' }) }
      ).catch(function(err) {
        // again obviously handle this error better instead of just throwing it again
        if (err) throw err;
        // do something with the response
        console.log('message', message);
      });

      // for more information on `fetch` headers and
      // how to send and expect various types of data:
      // <https://github.com/github/fetch>

    });
    ```

3. Require it, set default options, and make some requests using callbacks:

    ```js
    // add optional support for older browsers
    import es6promise from 'es6-promise';
    es6promise.polyfill();

    // add required support for global `fetch` method
    // *this must always come before `frisbee` is imported*
    import 'isomorphic-fetch';

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

    // log in to our API with a user/pass
    api.post('/v1/login', (err, res, user) => {

      // you'll probably want to handle this
      // error better than just throwing it
      if (err) throw err;

      // set basic auth headers for all
      // future API requests we make
      api.auth(user.api_token);

      // now let's post a message to our API
      api.post(
        '/v1/message',
        { body: 'Hello' },
        // if you wanted to pass JSON instead of plaintext:
        // { body: JSON.stringify({ message: 'Hello' }) }
        (err, res, message) => {
          // again obviously handle this error better
          if (err) throw err;
          // do something with the response
          console.log('message', message);
        }
      );

      // for more information on `fetch` headers and
      // how to send and expect various types of data:
      // <https://github.com/github/fetch>

    });
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
        let api = new Frisbee({
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

Upon being invoked, `Frisbee` returns an object with the following chainable methods:

* `api.auth(creds)` - helper function that sets BasicAuth headers, and it accepts `user` and `pass` arguments

    * You can pass `creds` user and pass as an array, arguments, or string: `([user, pass])`, `(user, pass)`, or `("user:pass")`, so you shouldn't have any problems!
    * If you don't pass both `user` and `pass` arguments, then it removes any previously set BasicAuth headers from prior `auth()` calls
    * If you pass only a `user`, then it will set `pass` to an empty string `''`)
    * If you pass `:` then it will assume you are trying to set BasicAuth headers using your own `user:pass` string
    * If you pass more than two keys, then it will throw an error (since BasicAuth only consists of `user` and `pass` anyways)

* All exposed HTTP methods require a `path` string and `callback` function arguments, and accept an optional `options` object:
    * Accepted method arguments:
        * `path` **required** - the path for the HTTP request (e.g. `/v1/login`, will be prefixed with the value of `baseURI` mentioned earlier)
        * `options` _optional_ - an object containing options, such as header values, a request body, form data, or a querystring to send along with the request, here are a few examples:
            * To set a custom header value of `X-Reply-To` on a `POST` request:

                ```js
                api.post('/messages', {
                  headers: {
                    'X-Reply-To': '7s9inuna748y4l1azchi'
                  }
                }, callback);
                ```
        * `callback` _optional_ - a callback function that gets called with the  arguments of `(err, res, body)`, otherwise a promise is returned:
            *  `err` - contains an error object (or `null`)
            *  `res` - the response from server (it contains status code, etc)
            *  `body` - the parsed JSON or text response (or `null`)
    * List of available HTTP methods:
        * `api.get(path, options, callback)` - GET
        * `api.head(path, options, callback)` - HEAD (*does not currently work - see tests*)
        * `api.post(path, options, callback)` - POST
        * `api.put(path, options, callback)` - PUT
        * `api.del(path, options, callback)` - DELETE
        * `api.options(path, options, callback)` - OPTIONS (*does not currently work - see tests*)
        * `api.patch(path, options, callback)` - PATCH

* Note that you can chain methods together, for example:

    ```js
    api.auth('foo:bar').get('/', callback);

    api.get('/', callback).post('/', callback);
    ```


## Frequently Asked Questions

**What is this project about?**

Use this package as a **universal API wrapper** for integrating your API in your client-side or server-side projects.

It's a better working alternative (and with less headaches; at least for me) &ndash; for talking to your API &ndash; than [superagent][superagent] and the default [fetch Network method][fetch-network-method] provide.

Use it for projects in [Node][nodejs], [React][react], [Angular][angular], [React Native][react-native], ...

It supports and is [tested](#Tests) for both client-side usage (e.g. with Bower, Browserify, or Webpack, with `whatwg-fetch`) and also server-side (with `node-fetch`).

**Why not just use `superagent` or `fetch`?**

See [Background](#background) for more information.

**Want to build an API back-end with Node.js?**

Read my article about [building Node.js API's with authentication][blog-article].

**Need help or want to request a feature?**

File [an issue][issue] on GitHub and we'll try our best help you out.

**Why don't you have an ES5 compiled version readily available in this git repo?**

As this module relies on ES6 **fetch**, there is currently no backwards compatibility for ES5

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

Facebook [recommends][facebook-recommends] to use `superagent` with React Native, but it does not work properly, therefore I went with the next best solution, their `fetch` package.  After having several issues trying to use `fetch` and writing my own API wrapper for a project with it (and running into roadblocks along the way) -- I decided to publish this.

Here were the issues I discovered/filed related to this:
* <https://github.com/github/fetch/issues/235>
* <https://github.com/facebook/react-native/issues/4376>
* <https://github.com/visionmedia/superagent/issues/636>
* <https://github.com/facebook/react-native/issues/863>
* <https://github.com/facebook/react-native/issues/370>
* <https://github.com/facebook/react-native/issues/10>

I know that solutions like `superagent` exist, but they don't seem to work well with React Native (which was my use case for this package).

In addition, the authors of the spec for ES6's fetch support throwing errors instead of catching them and bubbling them up to the callback/promise.

Therefore I created `frisbee` to serve as my API glue, and hopefully it'll serve as yours too.


## Contributors

* Nick Baugh <niftylettuce@gmail.com>


## Credits

* Thanks to [James Ide][ide] for coining the name "Frisbee" (it used to be called `fetch-api`, and `frisbee` was surprisingly available on NPM)
* Inspiration from <https://gist.github.com/anthonator/0dc0310a931398490fab>, [superagent][superagent], and from writing dozens of API wrappers!
* Google for being an awesome search engine to help me discover stuff on GitHub (haha)


## License

[MIT][license-url]


[facebook-recommends]: https://facebook.github.io/react-native/docs/network.html
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
[circle-ci-image]: https://circleci.com/gh/niftylettuce/frisbee.svg?style=svg
[circle-ci-url]: https://circleci.com/gh/niftylettuce/frisbee
[whatwg-fetch]: https://github.com/github/fetch
[node-fetch]: https://github.com/bitinn/node-fetch
[promise-polyfill]: https://github.com/jakearchibald/es6-promise
[older-browsers]: http://caniuse.com/#feat=promises
[ide]: https://github.com/ide
[react]: https://facebook.github.io/react/
[angular]: https://angularjs.org/
[issue]: https://github.com/niftylettuce/frisbee/issues
[automatic-ip-configuration]: http://moduscreate.com/automated-ip-configuration-for-react-native-development/
[frisbee-logo]: https://cdn.rawgit.com/niftylettuce/frisbee/master/media/logo-revised.svg
