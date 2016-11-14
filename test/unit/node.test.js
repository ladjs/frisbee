
import 'isomorphic-fetch';
import Frisbee from '../../lib/frisbee';
const app = require('./app');

const standardMethods = [
  'get',
  'post',
  'put',
  'del',
  'patch'
];
const methods = [].slice.call(standardMethods).concat(['head', 'options']);

describe('node runtime', () => {

  let api;
  let server;

  before(done => {
    server = app.listen(8080, done);
  });

  after(done => server.close(done));

  it('should have `fetch` defined', () => {
    expect(fetch).to.exist();
  });

  // <https://github.com/niftylettuce/node-react-native-fetch-api>
  it('should throw an error if we fail to pass baseURI', () => {
    // expect(new Frisbee).to.throw(new Error('baseURI option is required'));
    expect(() => new Frisbee()).to.throw(/baseURI option is required/);
  });

  it('should create Frisbee instance with all methods', () => {
    api = new Frisbee(global._options);
    expect(api).to.be.an('object');
    methods.forEach(method => expect(api[method]).to.be.a('function'));
  });

  it('should throw errors for incorrect auth() usage', () => {
    api = new Frisbee(global._options);
    expect(() => api.auth({}))
      .to.throw(/auth option `user` must be a string/);
    expect(() => api.auth(new Array(3)))
      .to.throw(/auth option can only have two keys/);
    expect(() => api.auth([{}, '']))
      .to.throw(/auth option `user` must be a string/);
    expect(() => api.auth(['', {}]))
      .to.throw(/auth option `pass` must be a string/);

  });

  it('should accept valid auth("user:pass") usage', () => {
    api = new Frisbee(global._options);
    const creds = 'foo:bar';
    api.auth('foo:bar');
    const basicAuthHeader = `Basic ${new Buffer(creds).toString('base64')}`;
    expect(api.headers.Authorization).to.equal(basicAuthHeader);
  });

  it('should allow chaining of `auth` and an HTTP method', async () => {
    api = new Frisbee(global._options);
    try {
      await api.auth('foo', 'bar').get('/');
    } catch (err) {
      throw err;
    }
  });

  it('should allow removal of auth() header', () => {
    api = new Frisbee(global._options);
    api.auth('foo').auth();
    expect(api.headers.Authorization).to.not.exist();
  });

  it('should throw an error if we fail to pass a string `path`', async () => {
    api = new Frisbee(global._options);
    try {
      await api.get({});
    } catch (err) {
      expect(err.message).to.equal('`path` must be a string');
    }
  });

  it('should throw an error if we fail to pass an object `options`', async () => {
    api = new Frisbee(global._options);
    try {
      await api.get('', []);
    } catch (err) {
      expect(err.message).to.equal('`options` must be an object');
    }
    try {
      await api.get('', 1);
    } catch (err) {
      expect(err.message).to.equal('`options` must be an object');
    }
  });

  it('should throw an error if we pass a non object `options`', async () => {
    api = new Frisbee(global._options);
    try {
      await api.get('', false);
    } catch (err) {
      expect(err.message).to.equal('`options` must be an object');
    }
  });

  it('should automatically set options to an empty object if not set', async () => {
    api = new Frisbee(global._options);
    try {
      await api.get('');
    } catch (err) {
      throw err;
    }
  });

  standardMethods.forEach(method => {

    const methodName = method === 'del' ? 'DELETE' : method.toUpperCase();

    it(`should return 200 on ${methodName}`, async () => {

      api = new Frisbee(global._options);

      const opts = {};

      if (method === 'post')
        opts.body = { foo: 'bar' };

      try {
        const res = await api[method]('/', opts);
        expect(res).to.be.an('object');
        expect(res.body).to.be.an('object');
      } catch (err) {
        throw err;
      }

    });

  });

  standardMethods.forEach(method => {

    const methodName = method === 'del' ? 'DELETE' : method.toUpperCase();

    it(`should return 200 on ${methodName}`, async () => {

      api = new Frisbee(global._options);

      const opts = {};

      if (method === 'post')
        opts.body = { foo: 'bar' };

      try {
        const res = await api[method]('/', opts);
        expect(res).to.be.an('object');
        expect(res.body).to.be.an('object');
      } catch (err) {
        throw err;
      }

    });

  });

  it('should stringify querystring parameters for GET requests', async () => {
    api = new Frisbee(global._options);
    const querystring = {
      a: 'blue',
      b: 'cyan',
      c: 'pink'
    };
    const res = await api.get('/querystring', {
      body: querystring
    });
    expect(res.body).to.be.an('object');
    expect(res.body).to.deep.equal(querystring);
  });

  it('should stringify querystring parameters with arrayFormat for GET requests', async () => {
    api = new Frisbee(Object.assign({}, global._options, {formatArray: 'brackets'}));
    const querystring = {
      a: 'blue',
      b: 'cyan',
      c: 'pink',
      d: [
        '1',
        '2',
        '3'
      ]
    };
    const res = await api.get('/querystring', {
      body: querystring
    });
    expect(res.body).to.be.an('object');
    expect(res.body).to.deep.equal(querystring);
  });

  it('should URL encode querystring parameters for GET requests', async () => {
    api = new Frisbee(global._options);
    const querystring = {
      a: '   ',
      b: '&foo&',
      c: '$$%%%%'
    };
    const res = await api.get('/querystring', {
      body: querystring
    });
    expect(res.body).to.be.an('object');
    expect(res.body).to.deep.equal(querystring);
  });

  it('should return 404', async () => {
    api = new Frisbee(global._options);
    const res = await api.get('/404');
    expect(res.err).to.be.an('error');
    expect(res.err.message).to.equal('Not Found');
  });

  it('should return 404 with valid json', async () => {
    api = new Frisbee(global._options);
    const res = await api.get('/404-with-valid-json');
    expect(res.err).to.be.an('error');
    expect(res.err.message).to.equal('Bad Request');
  });

  it('should return 404 with invalid json', async () => {
    api = new Frisbee(global._options);
    const res = await api.get('/404-with-invalid-json');
    expect(res.err).to.be.an('error');
    expect(res.err.message).to.equal(
      `Invalid JSON received from ${global._options.baseURI}`
    );
  });

  it('should return 404 with stripe error', async () => {
    api = new Frisbee(global._options);
    const res = await api.get('/404-with-stripe-error');
    expect(res.err).to.be.an('error');
    expect(res.err.message).to.be.a('string');
    expect(res.err.stack).to.be.an('object');
    expect(res.err.code).to.be.an('number');
    expect(res.err.param).to.be.a('string');
  });

  it('should return 400 with message', async () => {
    api = new Frisbee(global._options);
    const res = await api.get('/400-with-message');
    expect(res.err).to.be.an('error');
    expect(res.err.message).to.equal('Oops!');
  });

});
