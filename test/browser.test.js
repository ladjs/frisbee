const http = require('http');
const jsdom = require('jsdom');
const jsdomOld = require('jsdom/lib/old-api');
const _ = require('lodash');
const test = require('ava');

const app = require('./support/app');
const options = require('./support/options');

test.before.cb(t => {
  jsdomOld.env({
    html: '',
    scripts: [require.resolve('./support/browser.bundled.js')],
    virtualConsole: new jsdom.VirtualConsole().sendTo(console),
    done(err, window) {
      if (err) return t.end(err);
      t.context.window = window;
      t.end();
    }
  });
});

test.before.cb(t => {
  t.context.server = http.createServer(app).listen(() => {
    t.end();
  });
});

test.serial.before(t => {
  options.baseURI = `http://localhost:${t.context.server.address().port}`;
});

test.after(t => t.context.server.close());
test.after(t => t.context.window.close());

/*
  it('should throw an error if we fail to pass baseURI', () => {
    expect(new Frisbee).to.throw(new Error('baseURI option is required'));
  });
  */

test('should create Frisbee instance with all methods', t => {
  const api = new t.context.window.Frisbee(options);
  t.true(_.isObject(api));
  [
    'auth',
    'jwt',
    'get',
    'head',
    'post',
    'put',
    'del',
    'options',
    'patch'
  ].forEach(method => t.true(_.isFunction(api[method])));
});

// TODO: auth (string)
// TODO: auth (string with ':')
// TODO: array (empty)
// TODO: array (with only user)
// TODO: array (with user and pass)
// TODO: array (with only pass)
// TODO: array with more than 2 keys
// TODO: array with non-string value keys

[
  'get',
  // 'head',
  'post',
  'put',
  'del',
  // 'options',
  'patch'
].forEach(method => {
  const methodName = method === 'del' ? 'DELETE' : method.toUpperCase();

  test(`should return 200 on ${methodName}`, async t => {
    const api = new t.context.window.Frisbee(options);

    try {
      const res = await api[method]('/', {});
      t.true(_.isObject(res));
      t.true(_.isObject(res.body));
    } catch (err) {
      throw err;
    }
  });
});
