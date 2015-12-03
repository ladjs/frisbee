
import jsdom from 'jsdom';

let app = require('./app');

let window;
let server;

describe('browser', () => {

  before(done => {
    jsdom.env({
      html: '',
      scripts: [ require.resolve('./browser.bundled.js') ],
      virtualConsole: jsdom.createVirtualConsole().sendTo(console),
      done(err, _window) {
        if (err) return done(err);
        window = _window;
        done();
      }
    });
  });

  before(done => {
    server = app.listen(8080, done);
  });

  after(() => {
    // free memory associated with the window
    window.close();
    server.close();
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

    let api = new window.Frisbee(global._options);

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

    it(`should return 200 on ${methodName}`, done => {

      let api = new window.Frisbee(global._options);

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
