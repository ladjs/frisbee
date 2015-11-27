
# Node React Native Fetch API

[![NPM version][npm-image]][npm-url]
[![NPM downloads][npm-downloads]][npm-url]
[![MIT License][license-image]][license-url]

> **API wrapper for ES6's fetch method used with GitHub's fetch polyfill**

> _Familiar with NPM packages?  [Click here to jump to Usage!](#usage)_

```bash
npm install --save fetch-api
```

**What is this project about?**

Use this package as a simple HTTP method wrapper for integrating your API in your [Node][nodejs] and [React Native][react-native] projects.  It's a better alternative, with less headaches (at least for me) for this use case than [superagent][superagent] and the default [fetch Network method][fetch-network-method].

**Why not just use `superagent` or `fetch`?**

See [Background](#background) for more information.

**Learning how to build an API with Node.js?**

Read my article about [building Node.js API's with authentication][blog-article].


## Index

* [Usage](#usage)
* [API](#api)
* [Background](#background)
* [Contributors](#contributors)
* [Credits](#credits)
* [License](#license)


## Usage

1. Install the package:

    ```bash
    npm install --save fetch-api
    ```

2. Require it, set a base URI, and call some methods:

    ```js
    // require the module
    import API from 'fetch-api';

    // instantiate a new API instance
    let api = new API({
      baseURI: 'https://api.startup.com'
    });

    // log in to our API with a user/pass
    api.post('/v1/login', ((err, res, user) => {

      // you'll probably want to handle this
      // error better than just throwing it
      if (err) throw err;

      // set basic auth headers for all
      // future API requests we make
      api.auth(user.api_token);

      // now let's post a message to our API
      api.post(
        '/v1/message',
        'Hello',
        (err, res, message) => {
          // again obviously handle this error better
          if (err) throw err;
          // do something with the response
          console.log('message', message);
        }
      );

    });
    ```


## API

```js
import API from 'fetch-api';
```

`API` is a function that optionally accepts an argument `options`, which is an object full of options for constructing your API instance.

* `API` - accepts an `options` object, with the following accepted options:

    * `baseURI` - the default URI to use as a prefix for all HTTP requests
        * If your API server is running on `http://localhost:8080`, then use that as the value for this option
        * If you use [React Native][react-native], then you most likely want to set `baseURI` as follows (e.g. making use of `__DEV__` global variable):
        
        ```js
        let api = new API({
          baseURI: __DEV__
            ? process.env.API_BASE_URI || 'http://localhost:8080'
            : 'https://api.startup.com'
        });
        ```
        
        * You could also set `API_BASE_URI` as an environment variable, and then set the value of this option to `process.env.API_BASE_URI` (e.g. `API_BASE_URI=http://localhost:8080 node app`)

    * `headers` - an object containing default headers to send with every request

Upon being invoked, `API` returns an object with the following methods:

* `api.auth(user, pass)` - helper function that sets BasicAuth headers, and it accepts `user` and `pass` arguments

    * If you don't pass both `user` and `pass` arguments, then it removes any previously set BasicAuth headers from prior `auth()` calls
    * If you pass only a `user`, then it will set `pass` to an empty string `''`)
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
        * `callback` **required** - a callback function that gets called with the  arguments of `(err, res, body)`:
            *  `err` - contains an error object (or `null`)
            *  `res` - the response from server (it contains status code, etc)
            *  `body` - the parsed JSON or text response (or `null`)
    * List of available HTTP methods:
        * `api.get(path, options, callback)` - GET
        * `api.head(path, options, callback)` - HEAD
        * `api.post(path, options, callback)` - POST
        * `api.put(path, options, callback)` - PUT
        * `api.del(path, options, callback)` - DELETE
        * `api.patch(path, options, callback)` - PATCH

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

Therefore I created `fetch-api` to serve as my API glue, and hopefully it'll serve as yours too.


## Contributors

* Nick Baugh <niftylettuce@gmail.com>

## Credits

* <https://gist.github.com/anthonator/0dc0310a931398490fab>

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


[npm-image]: http://img.shields.io/npm/v/fetch-api.svg?style=flat
[npm-url]: https://npmjs.org/package/fetch-api
[npm-downloads]: http://img.shields.io/npm/dm/fetch-api.svg?style=flat