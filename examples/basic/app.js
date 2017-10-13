
// add optional support for older browsers
import es6promise from 'es6-promise';
es6promise.polyfill();

// require the module
import Frisbee from 'frisbee';

// create a new instance of Frisbee
const api = new Frisbee({
  baseURI: 'https://api.startup.com',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

makeRequests();

async function makeRequests() {

  // log in to our API with a user/pass
  try {

    // make the request
    let res = await api.post('/v1/login');
    console.log('response', res.body);

    // handle HTTP or API errors
    if (res.err) throw res.err;

    // set basic auth headers for all
    // future API requests we make
    api.auth(res.body.api_token);

    // now let's post a message to our API
    res = await api.post('/v1/messages', { body: 'Hello' });
    console.log('response', res.body);

    // handle HTTP or API errors
    if (res.err) throw res.err;

    // now let's get a list of messages filtered by page and limit
    res = await api.get('/v1/messages', {
      body: {
        limit: 10,
        page: 2
      }
    });

    // handle HTTP or API errors
    if (res.err) throw res.err;

    // now let's logout
    res = api.post('/v1/logout');
    console.log('response', res.body);

    // handle HTTP or API errors
    if (res.err) throw res.err;

    // unset auth now since we logged out
    api.auth();

    // for more information on `fetch` headers and
    // how to send and expect various types of data:
    // <https://github.com/github/fetch>

  } catch (err) {
    throw err;
  }

}
