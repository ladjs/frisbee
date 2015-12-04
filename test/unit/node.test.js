
import 'isomorphic-fetch';
import Frisbee from '../../src/frisbee';
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
    //expect(new Frisbee).to.throw(new Error('baseURI option is required'));
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
    expect(() => api.auth(new Array({}, '')))
      .to.throw(/auth option `user` must be a string/);
    expect(() => api.auth(new Array('', {})))
      .to.throw(/auth option `pass` must be a string/);

  });

  it('should accept valid auth("user:pass") usage', () => {

    api = new Frisbee(global._options);

    let creds = 'foo:bar';

    api.auth('foo:bar');

    let basicAuthHeader = 'Basic ' + new Buffer(creds).toString('base64');
    expect(api.headers.Authorization).to.equal(basicAuthHeader);

  });

  it('should allow chaining of methods', () => {

    api = new Frisbee(global._options);

    expect(() => {

      api
        .auth('foo', 'bar')
        .auth()
        .auth('foo:bar')
        .get('/', () => {})
        .auth()
        .post('/', () => {})
        .auth('baz');

    }).to.not.throw();

  });

  it('should allow removal of auth() header', () => {

    api = new Frisbee(global._options);

    api.auth('foo').auth();

    expect(api.headers.Authorization).to.not.exist();

  });

  it('should throw an error if we fail to pass a string `path`', () => {

    api = new Frisbee(global._options);

    expect(() => api.get({})).to.throw(/`path` must be a string/);

  });

  it('should throw an error if we fail to pass an object `options`', () => {

    api = new Frisbee(global._options);

    expect(() => api.get('', [])).to.throw(/`options` must be an object/);
    expect(() => api.get('', 1)).to.throw(/`options` must be an object/);
    
  });

  it('should throw an error if we pass a non object `options`', () => {

    api = new Frisbee(global._options);

    expect(() => api.get('', false, () => {})).to.throw(/`options` must be an object/);

  });

  it('should automatically set options to an empty object if not set', () => {

    api = new Frisbee(global._options);

    expect(() => api.get('', () => {})).to.not.throw();

  });

  standardMethods.forEach(method => {

    const methodName = method === 'del' ? 'DELETE' : method.toUpperCase();

    it(`should return 200 on ${methodName}`, done => {

      api = new Frisbee(global._options);

      const opts = {};

      if (method === 'post')
        opts.body = JSON.stringify({ foo: 'bar' });

      api[method]('/', opts).then(data => {
        expect(data.response).to.be.an('object');
        expect(data.body).to.be.an('object');
      }).then(done).catch(done);

    });

  });

  standardMethods.forEach(method => {

    const methodName = method === 'del' ? 'DELETE' : method.toUpperCase();

    it(`should return 200 on ${methodName} when using callbacks`, done => {

      api = new Frisbee(global._options);

      const opts = {};

      if (method === 'post')
        opts.body = JSON.stringify({ foo: 'bar' });

      api[method]('/', opts, (err, res, body) => {
        // until `check` is added here to mocha:
        // <https://github.com/sindresorhus/globals/blob/master/globals.json>
        global.chai.check(done, () => {
          expect(err).to.be.null;
          expect(res).to.be.an('object');
          expect(body).to.be.an('object');
        });
      });

    });

  });

  it('should not throw on parsing JSON from a 404', done => {

    api = new Frisbee(global._options);

    expect(() => {
      api.get('/404-with-json-expected', (err, res, body) => {
        global.chai.check(done, () => {
          expect(err).to.exist();
          expect(err.message).to.equal('Not Found');
          expect(res).to.be.an('object');
          expect(res).to.have.property('status');
          expect(res.status).to.be.a('number');
          expect(res.status).to.equal(404);
          expect(body).to.equal('Not Found');
        });
      });
    }).to.not.throw();

  });

  // TODO: expect text/plain without Content-Type specified

  // TODO: expect error "Failed to parse JSON body" when
  // JSON body is invalid but 200 status

});
