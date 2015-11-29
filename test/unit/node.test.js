
import 'isomorphic-fetch';
import Frisbee from '../../src/frisbee';
let app = require('./app');

describe('node runtime', () => {

  let server;

  before((done) => {
    server = app.listen(8080, done);
  });

  after((done) => {
    server.close(done);
  });

  it('should have `fetch` defined', () => {
    expect(fetch).to.exist();
  });

  // <https://github.com/niftylettuce/node-react-native-fetch-api>
  it('should throw an error if we fail to pass baseURI', () => {
    //expect(new Frisbee).to.throw(new Error('baseURI option is required'));
    expect(() => { new Frisbee(); }).to.throw(/baseURI option is required/);
  });

  it('should create Frisbee instance with all methods', () => {

    let api = new Frisbee({ baseURI: global.baseURI });

    expect(api).to.be.an('object');

    [
      'auth',
      'get',
      'head',
      'post',
      'put',
      'del',
      'options',
      'patch'
    ].forEach((method) => {
      expect(api[method]).to.be.a('function');
    });

  });

  it('should throw errors for incorrect auth() usage', () => {

    let api = new Frisbee({ baseURI: global.baseURI });

    expect(() => { api.auth({}); })
      .to.throw(/auth option `user` must be a string/);

    expect(() => { api.auth(new Array(3)); })
      .to.throw(/auth option can only have two keys/);

    expect(() => { api.auth(new Array({}, '')); })
      .to.throw(/auth option `user` must be a string/);

    expect(() => { api.auth(new Array('', {})); })
      .to.throw(/auth option `pass` must be a string/);

  });

  it('should accept valid auth("user:pass") usage', () => {

    let api = new Frisbee({ baseURI: global.baseURI });

    let creds = 'foo:bar';

    api.auth('foo:bar');

    let basicAuthHeader = 'Basic ' + new Buffer(creds).toString('base64');
    expect(api.headers.Authorization).to.equal(basicAuthHeader);

  });

  it('should allow chaining of methods', () => {

    let api = new Frisbee({ baseURI: global.baseURI });

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

    let api = new Frisbee({ baseURI: global.baseURI });

    api.auth('foo').auth();

    expect(api.headers.Authorization).to.not.exist();

  });

  it('should throw an error if we fail to pass a string `path`', () => {
    let api = new Frisbee({ baseURI: global.baseURI });
    expect(() => { api.get({}) }).to.throw(/`path` must be a string/);
  });

  it('should throw an error if we fail to pass an object `options`', () => {
    let api = new Frisbee({ baseURI: global.baseURI });
    expect(() => { api.get('', []); }).to.throw(/`options` must be an object/);
    expect(() => { api.get('', 1); }).to.throw(/`options` must be an object/);
  });

  it('should automatically set options to an empty object if false', () => {
    let api = new Frisbee({ baseURI: global.baseURI });
    expect(() => { api.get('', false, () => {}); }).to.not.throw();
  });

  it('should throw an error if we fail to pass a function `callback`', () => {
    let api = new Frisbee({ baseURI: global.baseURI });
    expect(() => { api.get('', {}, false); })
      .to.throw(/`callback` must be a function/);
  });

  [
    'get',
    //'head',
    'post',
    'put',
    'del',
    //'options',
    'patch'
  ].forEach((method) => {

    let methodName = method === 'del' ? 'DELETE' : method.toUpperCase();

    it(`should return 200 on ${methodName}`, (done) => {

      let api = new Frisbee({ baseURI: global.baseURI });

      api[method]('/', {}, (err, res, body) => {
        // until `check` is added here to mocha:
        // <https://github.com/sindresorhus/globals/blob/master/globals.json>
        global.chai.check(done, () => {
          expect(err).to.be.a('null');
          expect(res).to.be.an('object');
          expect(body).to.be.an('object');
        });
      });

    });

  });

  it('should not throw on parsing JSON from a 404', (done) => {

    let api = new Frisbee({ baseURI: global.baseURI });

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
