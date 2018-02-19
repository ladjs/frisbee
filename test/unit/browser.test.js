
import jsdom from 'jsdom';
import jsdomOld from 'jsdom/lib/old-api';

const app = require('./app');

let window;
let server;

describe('browser', () => {

  before(done => {
    jsdomOld.env({
      html: '',
      scripts: [ require.resolve('./browser.bundled.js') ],
      virtualConsole: new jsdom.VirtualConsole().sendTo(console),
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

  // <https://github.com/niftylettuce/node-react-native-fetch-api>
  /*
  it('should throw an error if we fail to pass baseURI', () => {
    expect(new Frisbee).to.throw(new Error('baseURI option is required'));
  });
  */

  it('should create Frisbee instance with all methods', () => {

    const api = new window.Frisbee(global._options);

    expect(api).to.be.an('object');

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
    ].forEach(method => expect(api[method]).to.be.a('function'));

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

    it(`should return 200 on ${methodName}`, async () => {

      const api = new window.Frisbee(global._options);

      try {
        const res = await api[method]('/', {});
        expect(res).to.be.an('object');
        expect(res.body).to.be.an('object');
      } catch (err) {
        throw err;
      }

    });

  });

});
