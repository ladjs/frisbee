
import jsdomify from 'jsdomify';

let app = require('./app');

// create our DOM instance and expose `global.window`
// so that when we import API it will use `whatwg-fetch`
// instead of using `node-fetch` as the other test does
jsdomify.create();

import API from '../../';

describe('whatwg-fetch', () => {

  let server;

  before((done) => {
    server = app.listen(8080, done);
  });

  after((done) => {
    jsdomify.destroy();
    server.close(done);
  });

  it('should have `fetch` defined', () => {
    expect(fetch).to.exist();
  });

  // <https://github.com/niftylettuce/node-react-native-fetch-api>
  /*
  it('should throw an error if we fail to pass baseURI', () => {
    expect(new API).to.throw(new Error('baseURI option is required'));
  });
  */

  it('should create API instance with all methods', () => {

    let api = new API({
      baseURI: 'http://localhost:8080'
    });

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
    //'head',
    'post',
    'put',
    'del',
    //'options',
    'patch'
  ].forEach((method) => {

    let methodName = method === 'del' ? 'DELETE' : method.toUpperCase();

    it(`should return 200 on ${methodName}`, (done) => {

      let api = new API({
        baseURI: 'http://localhost:8080'
      });

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

});
