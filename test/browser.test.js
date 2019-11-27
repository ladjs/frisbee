const http = require('http');
const path = require('path');
const { readFileSync } = require('fs');
const { Script } = require('vm');
const test = require('ava');
const _ = require('lodash');
const { JSDOM, VirtualConsole } = require('jsdom');

const app = require('./support/app');
const options = require('./support/options');

const virtualConsole = new VirtualConsole();
virtualConsole.sendTo(console);

const script = new Script(
  readFileSync(path.join(__dirname, '..', 'dist', 'frisbee.js'))
  // readFileSync(path.join(__dirname, '..', 'dist', 'frisbee.min.js'))
);

const dom = new JSDOM(``, {
  url: 'http://localhost:3000/',
  referrer: 'http://localhost:3000/',
  contentType: 'text/html',
  includeNodeLocations: true,
  resources: 'usable',
  runScripts: 'dangerously',
  virtualConsole
});

dom.runVMScript(script);

test.before.cb(t => {
  t.context.server = http.createServer(app).listen(() => {
    t.end();
  });
});

test.serial.before(t => {
  options.baseURI = `http://localhost:${t.context.server.address().port}`;
});

/*
  it('should throw an error if we fail to pass baseURI', () => {
    expect(new Frisbee).to.throw(new Error('baseURI option is required'));
  });
  */

test('should create Frisbee instance with all methods', t => {
  const api = new dom.window.Frisbee(options);
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
    const api = new dom.window.Frisbee(options);

    try {
      const res = await api[method]('/', {});
      t.true(_.isObject(res));
      t.true(_.isObject(res.body));
    } catch (err) {
      throw err;
    }
  });
});
