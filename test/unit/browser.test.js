
import jsdomify from 'jsdomify';
import { XMLHttpRequest } from 'xmlhttprequest';
global.XMLHttpRequest = XMLHttpRequest;

let app = require('./app');
let Frisbee;
let server;

describe('browser', () => {

  before((done) => {

    // create our DOM instance and expose `global.window`
    // so that when we import Frisbee it will use `whatwg-fetch`
    // instead of using `node-fetch` as the other test does
    jsdomify.create();

    // <https://github.com/podio/jsdomify/issues/42>
    // wait for DOM to be created
    setTimeout(() => {
      let es6promise = require('es6-promise');
      es6promise.polyfill();
      require('isomorphic-fetch');
      // add Blob, FileReader, etc to global scope
      // otherwise `whatwg-fetch` won't work
      /*global global:true */
      // TODO: submit patch to whatwg-fetch in order to
      // explicity say `window.Blob` and `window.FileReader`
      // in the source code (instead of relying on global)
      global.Blob = window.Blob;
      global.FileReader = window.FileReader;
      global.FormData = window.FormData;
      // thanks to @skevy for this
      // <https://exponentjs.slack.com/archives/general/p1448833299000870>
      Frisbee = require('../../src/frisbee').default;
      done();
    }, 100);

  });

  before(() => {
    expect(window).to.exist();
  });

  before((done) => {
    server = app.listen(8080, done);
  });

  after((done) => {
    jsdomify.destroy();
    server.close(done);
  });

  it('should have `fetch` defined', () => {
    expect(window.fetch).to.exist();
  });

  // <https://github.com/niftylettuce/node-react-native-fetch-api>
  /*
  it('should throw an error if we fail to pass baseURI', () => {
    expect(new Frisbee).to.throw(new Error('baseURI option is required'));
  });
  */

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

});
