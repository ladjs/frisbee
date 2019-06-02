const http = require('http');
const test = require('ava');
const _ = require('lodash');
const sinon = require('sinon');
const { oneLine } = require('common-tags');
const isStream = require('is-stream');

const Frisbee = require('../lib');
const app = require('./support/app');
const options = require('./support/options');

const standardMethods = ['get', 'post', 'put', 'del', 'patch'];
const methods = [].slice.call(standardMethods).concat(['head', 'options']);

test.serial.before.cb(t => {
  t.context.server = http.createServer(app).listen(() => {
    t.end();
  });
});

test.serial.before(t => {
  options.baseURI = `http://localhost:${t.context.server.address().port}`;
});

test.after(t => t.context.server.close());

// <https://github.com/niftylettuce/node-react-native-fetch-api>
test('should not throw an error if we fail to pass baseURI', t => {
  t.notThrows(() => new Frisbee());
});

test('should create Frisbee instance with all methods', t => {
  const api = new Frisbee(options);
  t.true(_.isObject(api));
  methods.forEach(method => t.true(_.isFunction(api[method])));
});

test('should throw errors for incorrect auth() usage', t => {
  const api = new Frisbee(options);
  let error = t.throws(() => api.auth({}));
  t.regex(error.message, /auth option `user` must be a string/);
  error = t.throws(() => api.auth(new Array(3)));
  t.regex(error.message, /auth option can only have two keys/);
  error = t.throws(() => api.auth([{}, '']));
  t.regex(error.message, /auth option `user` must be a string/);
  error = t.throws(() => api.auth(['', {}]));
  t.regex(error.message, /auth option `pass` must be a string/);
});

test('should accept valid auth("user:pass") usage', t => {
  const api = new Frisbee(options);
  const creds = 'foo:bar';
  api.auth('foo:bar');
  const basicAuthHeader = `Basic ${Buffer.from(creds).toString('base64')}`;
  t.is(api.headers.Authorization, basicAuthHeader);
});

test('should allow chaining of `auth` and an HTTP method', async t => {
  const api = new Frisbee(options);
  await t.notThrows(() => api.auth('foo', 'bar').get('/'));
});

test('should allow removal of auth() header', t => {
  const api = new Frisbee(options);
  api.auth('foo').auth();
  t.true(_.isUndefined(api.headers.Authorization));
});

test('should throw an error if we fail to pass a string `path`', async t => {
  const api = new Frisbee(options);
  const error = await t.throwsAsync(api.get({}));
  t.is(error.message, '`path` must be a string');
});

test(`should throw an error if we fail to pass an object options`, async t => {
  const api = new Frisbee(options);
  let error = await t.throwsAsync(() => api.get('', []));
  t.is(error.message, '`options` must be an object');
  error = await t.throwsAsync(() => api.get('', 1));
  t.is(error.message, '`options` must be an object');
});

test('should throw an error if we pass a non object `options`', async t => {
  const api = new Frisbee(options);
  const error = await t.throwsAsync(() => api.get('', false));
  t.is(error.message, '`options` must be an object');
});

test('should throw an error if we fail to pass a string `path` after intercept', async t => {
  const api = new Frisbee(options);
  api.interceptor.register({
    request: sinon.stub().resolves([null, {}])
  });
  const error = await t.throwsAsync(() => api.get('/', {}));
  t.is(error.message, '`path` must be a string');
});

test(`should throw an error if we fail to pass an object options after intercept`, async t => {
  const api = new Frisbee(options);
  api.interceptor.register({
    request: sinon.stub().resolves(['/', 1])
  });
  const error = await t.throwsAsync(() => api.get('/', {}));
  t.is(error.message, '`options` must be an object');
});

test('should throw an error if we pass a non object `options` after intercept', async t => {
  const api = new Frisbee(options);
  api.interceptor.register({
    request: sinon.stub().resolves(['/', 'not an object'])
  });
  const error = await t.throwsAsync(() => api.get('/', {}));
  t.is(error.message, '`options` must be an object');
});

test(
  oneLine`should automatically set options to an empty object if not set`,
  async t => {
    const api = new Frisbee(options);
    await t.notThrows(() => api.get(''));
  }
);

test(
  oneLine`should not throw an error
  if headers with value ""|null|undefined`,
  async t => {
    const api = new Frisbee(options);
    await t.notThrows(() => api.get('', { headers: { empty: '' } }));
    await t.notThrows(() => api.get('', { headers: { null: null } }));
    await t.notThrows(() => api.get('', { headers: { undefine: undefined } }));
  }
);

standardMethods.forEach(method => {
  const methodName = method === 'del' ? 'DELETE' : method.toUpperCase();

  test(`should return 200 on ${methodName}`, async t => {
    const api = new Frisbee(options);

    const opts = {};

    if (method === 'post') opts.body = { foo: 'bar' };

    try {
      const res = await api[method]('/', opts);
      t.true(_.isObject(res));
      t.true(_.isObject(res.body));
    } catch (err) {
      throw err;
    }
  });
});

test.serial(
  oneLine`should not strip trailing slash on GET requests with params`,
  async t => {
    // Since `express` does not distinguish `path/?param` from `path?param`,
    // we instead spy on the URL passed to the `fetch()` call.
    // `test.serial` is used to prevent global-stub errors.
    sinon.stub(global, 'fetch');
    try {
      const api = new Frisbee(options);
      try {
        await api.get('/querystring/', { body: { param: 'foo' } });
      } catch (err) {
        // We broke `fetch`, so this is expected
      }

      const [url] = fetch.getCall(0).args;
      const hasTrailingSlash = url.indexOf('querystring/?') !== -1;
      t.true(hasTrailingSlash, 'Trailing slash is still present');
    } finally {
      fetch.restore();
    }
  }
);

test(
  oneLine`should stringify querystring parameters for GET and DELETE requests`,
  async t => {
    const api = new Frisbee(options);
    const querystring = {
      a: 'blue',
      b: 'cyan',
      c: 'pink'
    };
    const getRes = await api.get('/querystring', {
      body: querystring
    });
    t.true(_.isObject(getRes.body));
    t.deepEqual(getRes.body, querystring);

    const delRes = await api.get('/querystring', {
      body: querystring
    });
    t.true(_.isObject(delRes.body));
    t.deepEqual(delRes.body, querystring);
  }
);

test(
  oneLine`
    should stringify querystring parameters with
    arrayFormat for GET and DELETE requests`,
  async t => {
    const api = new Frisbee({ ...options, formatArray: 'brackets' });
    const querystring = {
      a: 'blue',
      b: 'cyan',
      c: 'pink',
      d: ['1', '2', '3']
    };
    const getRes = await api.get('/querystring', {
      body: querystring
    });
    t.true(_.isObject(getRes.body));
    t.deepEqual(getRes.body, querystring);

    const delRes = await api.get('/querystring', {
      body: querystring
    });
    t.true(_.isObject(delRes.body));
    t.deepEqual(delRes.body, querystring);
  }
);

test(
  oneLine`
    should URL encode querystring parameters
    for GET and DELETE requests`,
  async t => {
    const api = new Frisbee(options);
    const querystring = {
      a: '   ',
      b: '&foo&',
      c: '$$%%%%'
    };
    const getRes = await api.get('/querystring', {
      body: querystring
    });
    t.true(_.isObject(getRes.body));
    t.deepEqual(getRes.body, querystring);

    const delRes = await api.get('/querystring', {
      body: querystring
    });
    t.true(_.isObject(delRes.body));
    t.deepEqual(delRes.body, querystring);
  }
);

test('should return 404', async t => {
  const api = new Frisbee(options);
  const res = await api.get('/404');
  t.true(_.isError(res.err));
  t.is(res.err.message, 'Not Found');
});

test('should return 404 with valid json', async t => {
  const api = new Frisbee(options);
  const res = await api.get('/404-with-valid-json');
  t.true(_.isError(res.err));
  t.is(res.err.message, 'Bad Request');
});

test('should return 404 with invalid json', async t => {
  const api = new Frisbee(options);
  const res = await api.get('/404-with-invalid-json');
  t.true(_.isError(res.err));
  t.is(res.err.message, `Invalid JSON received from ${options.baseURI}`);
});

test('should return 404 with stripe error', async t => {
  const api = new Frisbee(options);
  const res = await api.get('/404-with-stripe-error');
  t.true(_.isError(res.err));
  t.true(_.isString(res.err.message));
  t.true(_.isObject(res.err.stack));
  t.true(_.isNumber(res.err.code));
  t.true(_.isString(res.err.param));
});

test('should return 400 with message', async t => {
  const api = new Frisbee(options);
  const res = await api.get('/400-with-message');
  t.true(_.isError(res.err));
  t.is(res.err.message, 'Oops!');
});

methods.forEach(method => {
  const methodName = method === 'del' ? 'DELETE' : method.toUpperCase();

  test(`should intercept ${methodName} method`, async t => {
    const api = new Frisbee(options);
    const interceptor = {
      request: sinon.stub().resolves()
    };
    api.interceptor.register(interceptor);

    try {
      await api[method]('/');
      t.true(interceptor.request.calledOnce);
    } catch (err) {
      throw err;
    }
  });
});

test('should set global raw', async t => {
  const api = new Frisbee({
    ...options,
    raw: true
  });
  t.true(api.raw);
  const res = await api.get('/querystring');
  t.true(isStream(res.body));
});

test('should set request raw', async t => {
  const api = new Frisbee({
    ...options
  });
  t.false(api.raw);
  const res = await api.get('/querystring', { raw: true });
  t.true(isStream(res.body));
});

test('should allow false request raw with global raw', async t => {
  const api = new Frisbee({
    ...options,
    raw: true
  });
  t.true(api.raw);
  const res = await api.get('/querystring', { raw: false });
  t.false(isStream(res.body));
});

test('should allow a custom parseErr', t => {
  const api = new Frisbee({ parseErr: 'oops!' });
  t.is(api.parseErr, 'oops!');
});

test('should set default parseErr', t => {
  const api = new Frisbee();
  t.is(api.parseErr.message, 'Invalid JSON received');
});

test('should abort with AbortController signal native style', async t => {
  const api = new Frisbee({
    ...options
  });
  const controller = new AbortController();
  const req = api.get('/', { signal: controller.signal });
  controller.abort();

  const { name } = await t.throwsAsync(req);
  t.is(name, 'AbortError');
});

test('should abort using a token', async t => {
  const api = new Frisbee({
    ...options
  });
  const abortToken = 'some token';
  const req = api.get('/', { abortToken });
  api.abort(abortToken);

  const { name } = await t.throwsAsync(req);
  t.is(name, 'AbortError');
});

test('should not abort if different token is passed in', async t => {
  const api = new Frisbee({
    ...options
  });
  const abortToken = 'some token';
  const req = api.get('/', { abortToken });
  api.abort('some other token');

  await t.notThrowsAsync(req);
});

test('should only abort one request when aborting with a token', async t => {
  const api = new Frisbee({
    ...options
  });
  const abortToken = 'some token';
  const abortedReq = api.get('/', { abortToken });
  const nonAbortedReq = api.get('/');
  const nonAbortedReqTwo = api.get('/', { abortToken: 'some other token' });
  api.abort(abortToken);

  const { name } = await t.throwsAsync(abortedReq);
  await t.notThrowsAsync(nonAbortedReq);
  await t.notThrowsAsync(nonAbortedReqTwo);
  t.is(name, 'AbortError');
});

test('should abort all', async t => {
  const api = new Frisbee({
    ...options
  });
  const abortToken = 'some token';
  const req = api.get('/', { abortToken });
  const reqTwo = api.get('/');
  api.abortAll();

  const reason = await t.throwsAsync(req);
  const reasonTwo = await t.throwsAsync(reqTwo);
  t.is(reason.name, 'AbortError');
  t.is(reasonTwo.name, 'AbortError');
});

test('should abort using abortAll when using their own signal', async t => {
  const api = new Frisbee({
    ...options
  });
  const controller = new AbortController();
  const req = api.get('/', { signal: controller.signal });
  api.abortAll();

  const { name } = await t.throwsAsync(req);
  t.is(name, 'AbortError');
});

test('should abort using abortToken when using their own signal', async t => {
  const api = new Frisbee({
    ...options
  });
  const controller = new AbortController();
  const abortToken = 'some token';
  const req = api.get('/', { signal: controller.signal, abortToken });
  api.abort(abortToken);

  const { name } = await t.throwsAsync(req);
  t.is(name, 'AbortError');
});

test('should not abort new requests after abortAll has been called ', async t => {
  const api = new Frisbee(options);
  const controller = new AbortController();
  const abortToken = 'some token';
  const req = api.get('/', { signal: controller.signal, abortToken });
  api.abortAll();
  const reqTwo = api.get('/');
  await t.notThrowsAsync(reqTwo);
  const { name } = await t.throwsAsync(req);
  t.is(name, 'AbortError');
});

test('should cancel all requests that use the same abort token', async t => {
  const api = new Frisbee(options);
  const abortToken = 'some token';
  const newAbortToken = 'another token';
  const reqOne = api.get('/', { abortToken });
  const reqTwo = api.get('/', { abortToken });
  const reqThree = api.get('/', { abortToken });
  const reqFour = api.get('/', { abortToken: newAbortToken });

  api.abort(abortToken);

  await t.throwsAsync(reqOne);
  await t.throwsAsync(reqTwo);
  await t.throwsAsync(reqThree);
  await t.notThrowsAsync(reqFour);
});

test('should throw if abortToken or signal are modified by an interceptor', async t => {
  const api = new Frisbee(options);
  let i = 0;
  api.interceptor.register({
    request: async (path, config) => {
      i++;
      const abortToken = 'new abort token';
      const { signal } = abortController;
      switch (i) {
        case 1:
          return [path, { ...config, abortToken }];
        case 2:
          return [path, { ...config, signal }];
        default:
          return [path, config];
      }
    }
  });
  const abortController = new AbortController();
  const { signal } = abortController;
  await t.throwsAsync(() =>
    api.get('/', { abortToken: Math.random(), signal })
  );
  await t.throwsAsync(() =>
    api.get('/', { abortToken: Math.random(), signal })
  );
  await t.notThrowsAsync(() =>
    api.get('/', { abortToken: Math.random(), signal })
  );
});

test('should remove everything from abortTokenMap after requests have completed', async t => {
  const api = new Frisbee(options);
  const abortToken = 'abort token';
  const newAbortToken = 'new abort token';
  const one = api.get('/delay', { abortToken, body: { delay: 1000 } });
  const two = api.get('/delay', { abortToken, body: { delay: 2000 } });
  const three = api.get('/delay', { abortToken, body: { delay: 3000 } });
  const four = api.get('/', { abortToken: newAbortToken });

  t.is(api.abortTokenMap.size, 2);

  api.abort(newAbortToken);
  await t.throwsAsync(four);
  t.is(api.abortTokenMap.size, 1);

  await one;
  t.is(api.abortTokenMap.size, 1);

  await two;
  t.is(api.abortTokenMap.size, 1);

  await three;
  t.is(api.abortTokenMap.size, 0);
});
