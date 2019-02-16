const test = require('ava');
const sinon = require('sinon');
const { oneLine } = require('common-tags');

const Interceptor = require('../lib/interceptor');

//
// Interception Flow:
//
// Intercepted Method
// (request* -> requestError* -> APIMethod -> response* -> responseError*)
//
test('should only intercept passed interceptable methods', async t => {
  const API = {
    post: () => () => sinon.stub().resolves(),
    get: () => () => sinon.stub().resolves()
  };
  const interceptorManager = new Interceptor(API, ['post']);
  const interceptor = {
    request: sinon.stub().resolves()
  };
  interceptorManager.register(interceptor);

  await API.post();
  t.true(interceptor.request.calledOnce);

  await API.get();
  t.true(interceptor.request.calledOnce);
});

test('should call request before the APIMethod', async t => {
  const APIPostMethod = sinon.stub().resolves();
  const API = {
    post: () => APIPostMethod
  };
  const interceptorManager = new Interceptor(API, ['post']);
  const interceptor = {
    request: sinon.stub().resolves()
  };
  interceptorManager.register(interceptor);

  await API.post();
  sinon.assert.callOrder(interceptor.request, APIPostMethod);
  t.pass();
});

test('should call request with interceptedMethod arguments', async t => {
  const API = {
    post: () => () => Promise.resolve()
  };
  const interceptorManager = new Interceptor(API, ['post']);
  const interceptor = {
    request: sinon.stub().resolves()
  };
  const interceptedMethodArguments = ['foo', { foo: 'foo' }];
  interceptorManager.register(interceptor);

  await API.post(...interceptedMethodArguments);
  sinon.assert.calledWith(interceptor.request, ...interceptedMethodArguments);
  t.pass();
});

test('should call requestError on request error', async t => {
  const API = {
    post: () => () => Promise.resolve()
  };
  const interceptorManager = new Interceptor(API, ['post']);
  const interceptorOne = {
    request: () => {
      throw new Error('Request Error');
    },
    requestError: sinon.stub().resolves()
  };
  const interceptorTwo = {
    request: () => Promise.reject(),
    requestError: sinon.stub().resolves()
  };
  const interceptorThree = {
    request: () => Promise.resolve(),
    requestError: sinon.stub().resolves()
  };
  interceptorManager.register(interceptorOne);
  interceptorManager.register(interceptorTwo);
  interceptorManager.register(interceptorThree);

  await API.post();
  t.true(interceptorOne.requestError.called);
  t.true(interceptorTwo.requestError.called);
  t.false(interceptorThree.requestError.called);
});

test(
  oneLine`should call response with what APIMethod returns as argument`,
  async t => {
    const APIResponse = ['foo', { foo: 'foo' }];
    const API = {
      post: () => () => Promise.resolve(APIResponse)
    };
    const interceptorManager = new Interceptor(API, ['post']);
    const interceptor = {
      response: sinon.stub().resolves()
    };
    interceptorManager.register(interceptor);

    await API.post();

    t.true(interceptor.response.calledWith(APIResponse));
  }
);

test('should call responseError on response error', async t => {
  const API = {
    post: () => () => Promise.resolve()
  };

  const APInterceptorManager = new Interceptor(API, ['post']);
  const APIInterceptorOne = {
    response: () => {
      throw new Error('Request Error');
    },
    responseError: sinon.stub().resolves()
  };
  const APIInterceptorTwo = {
    response: () => Promise.reject(),
    responseError: sinon.stub().resolves()
  };
  const APIInterceptorThree = {
    response: () => Promise.resolve(),
    responseError: sinon.stub().resolves()
  };

  APInterceptorManager.register(APIInterceptorOne);
  APInterceptorManager.register(APIInterceptorTwo);
  APInterceptorManager.register(APIInterceptorThree);

  await API.post();
  t.true(APIInterceptorOne.responseError.called);
  t.true(APIInterceptorTwo.responseError.called);
  t.false(APIInterceptorThree.responseError.called);
});

test('should call responseError on APIMethod error', async t => {
  const API = {
    post: () => () => {
      throw new Error('API Error');
    },
    get: () => () => Promise.reject(),
    put: () => () => Promise.resolve()
  };

  const APInterceptorManager = new Interceptor(API, ['post', 'get']);
  const interceptor = {
    response: () => Promise.resolve(),
    responseError: sinon.stub().resolves()
  };

  APInterceptorManager.register(interceptor);

  await API.post();
  t.true(interceptor.responseError.calledOnce);

  await API.get();
  t.true(interceptor.responseError.calledTwice);

  await API.put();
  t.true(interceptor.responseError.calledTwice);
});

test(
  oneLine`should run request interceptors in the same registration order`,
  async t => {
    const API = {
      post: () => Promise.resolve()
    };
    const interceptorManager = new Interceptor(API, ['post']);
    const interceptorOne = {
      request: sinon.stub().resolves()
    };
    const interceptorTwo = {
      request: sinon.stub().resolves()
    };
    const interceptorThree = {
      request: sinon.stub().resolves()
    };
    interceptorManager.register(interceptorOne);
    interceptorManager.register(interceptorTwo);
    interceptorManager.register(interceptorThree);

    await API.post();
    t.true(interceptorOne.request.calledBefore(interceptorTwo.request));
    t.true(interceptorTwo.request.calledBefore(interceptorThree.request));
    t.true(interceptorThree.request.calledAfter(interceptorTwo.request));
  }
);

test(
  oneLine`should run response interceptors in reversed registration order`,
  async t => {
    const API = {
      post: () => () => Promise.resolve()
    };
    const interceptorManager = new Interceptor(API, ['post']);
    const interceptorOne = {
      response: sinon.stub().resolves()
    };
    const interceptorTwo = {
      response: sinon.stub().resolves()
    };
    const interceptorThree = {
      response: sinon.stub().resolves()
    };
    interceptorManager.register(interceptorOne);
    interceptorManager.register(interceptorTwo);
    interceptorManager.register(interceptorThree);

    await API.post();

    t.true(interceptorThree.response.calledBefore(interceptorTwo.response));
    t.true(interceptorTwo.response.calledBefore(interceptorOne.response));
    t.true(interceptorOne.response.calledAfter(interceptorTwo.response));
  }
);

test('should remove interceptor on unregister', async t => {
  const API = {
    post: () => () => Promise.resolve()
  };
  const interceptorManager = new Interceptor(API, ['post']);
  const interceptorOne = {
    request: sinon.stub().resolves()
  };
  const interceptorTwo = {
    request: sinon.stub().resolves()
  };
  const unregisterInterceptorOne = interceptorManager.register(interceptorOne);
  interceptorManager.register(interceptorTwo);

  await API.post();
  unregisterInterceptorOne();
  interceptorManager.unregister(interceptorTwo);

  await API.post();
  t.true(interceptorOne.request.calledOnce);
  t.true(interceptorTwo.request.calledOnce);
});

test('should remove all interceptors on clear', async t => {
  const API = {
    post: () => () => Promise.resolve()
  };
  const interceptorManager = new Interceptor(API, ['post']);
  const interceptor = {
    request: sinon.stub().resolves()
  };
  interceptorManager.register(interceptor);

  await API.post();

  interceptorManager.clear();

  await API.post();
  t.true(interceptor.request.calledOnce);
});
