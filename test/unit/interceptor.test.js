import Interceptor from '../../lib/interceptor';
// Interception Flow:
// Intercepted Method(request* -> requestError* -> APIMethod -> response* -> responseError*)

describe('interceptor', () => {
  it('should only intercept passed interceptable methods', async () => {
    const API = {
      post: sinon.stub().resolves(true),
      get: sinon.stub().resolves(true)
    };
    const interceptorManager = new Interceptor(API, ['post']);
    const interceptor = {
      request: sinon.stub().resolves(true)
    };
    interceptorManager.register(interceptor);

    await API.post();

    expect(interceptor.request).to.have.been.calledOnce();

    await API.get();

    expect(interceptor.request).to.have.been.calledOnce();
  });

  it('should call request before the APIMethod', async () => {
    const APIPostMethod = sinon.stub().resolves(true);
    const API = {
      post: APIPostMethod
    };
    const interceptorManager = new Interceptor(API, ['post']);
    const interceptor = {
      request: sinon.stub().resolves(true)
    };
    interceptorManager.register(interceptor);

    await API.post();

    expect(interceptor.request).to.have.been.calledBefore(APIPostMethod);
    expect(APIPostMethod).to.have.been.calledAfter(interceptor.request);
  });

  it('should call request with interceptedMethod arguments', async () => {
    const API = {
      // eslint-disable-next-line promise/param-names
      post: () => new Promise(res => res())
    };
    const interceptorManager = new Interceptor(API, ['post']);
    const interceptor = {
      request: sinon.stub().resolves(true)
    };
    const interceptedMethodArguments = ['foo', {foo: 'foo'}];
    interceptorManager.register(interceptor);

    await API.post(...interceptedMethodArguments);

    expect(interceptor.request).to.have.been.calledWith(...interceptedMethodArguments);
  });

  it('should call requestError on request error', async () => {
    const API = {
      // eslint-disable-next-line promise/param-names
      post: () => new Promise(res => res())
    };
    const interceptorManager = new Interceptor(API, ['post']);
    const interceptorOne = {
      request: () => {
        throw new Error('Request Error');
      },
      requestError: sinon.stub().resolves(true)
    };
    const interceptorTwo = {
      request: () => Promise.reject(),
      requestError: sinon.stub().resolves(true)
    };
    const interceptorThree = {
      request: () => Promise.resolve(true),
      requestError: sinon.stub().resolves(true)
    };
    interceptorManager.register(interceptorOne);
    interceptorManager.register(interceptorTwo);
    interceptorManager.register(interceptorThree);

    await API.post();

    expect(interceptorOne.requestError).to.have.been.called();
    expect(interceptorTwo.requestError).to.have.been.called();
    expect(interceptorThree.requestError).to.not.have.been.called();
  });

  it('should call response with what APIMethod returns as argument', async () => {
    const APIResponse = ['foo', {foo: 'foo'}];
    const API = {
      // eslint-disable-next-line promise/param-names
      post: () => new Promise(res => res(APIResponse))
    };
    const interceptorManager = new Interceptor(API, ['post']);
    const interceptor = {
      response: sinon.stub().resolves(true)
    };
    interceptorManager.register(interceptor);

    await API.post();

    expect(interceptor.response).to.have.been.calledWith(APIResponse);
  });

  it('should call responseError on response error', async () => {
    const API = {
      // eslint-disable-next-line promise/param-names
      post: () => new Promise(res => res())
    };

    const APInterceptorManager = new Interceptor(API, ['post']);
    const APIInterceptorOne = {
      response: () => {
        throw new Error('Request Error');
      },
      responseError: sinon.stub().resolves(true)
    };
    const APIInterceptorTwo = {
      response: () => Promise.reject(),
      responseError: sinon.stub().resolves(true)
    };
    const APIInterceptorThree = {
      response: () => Promise.resolve(true),
      responseError: sinon.stub().resolves(true)
    };

    APInterceptorManager.register(APIInterceptorOne);
    APInterceptorManager.register(APIInterceptorTwo);
    APInterceptorManager.register(APIInterceptorThree);

    await API.post();

    expect(APIInterceptorOne.responseError).to.have.been.called();
    expect(APIInterceptorTwo.responseError).to.have.been.called();
    expect(APIInterceptorThree.responseError).to.not.have.been.called();
  });

  it('should call responseError on APIMethod error', async () => {
    const API = {
      post: () => {
        throw new Error('API Error');
      },
      /* eslint-disable promise/param-names */
      get: () => new Promise((res, rej) => rej()),
      put: () => new Promise(res => res())
      /* eslint-enable */
    };

    const APInterceptorManager = new Interceptor(API, ['post', 'get']);
    const interceptor = {
      response: () => Promise.resolve(true),
      responseError: sinon.stub().resolves(true)
    };

    APInterceptorManager.register(interceptor);

    await API.post();

    expect(interceptor.responseError).to.have.been.calledOnce();

    await API.get();

    expect(interceptor.responseError).to.have.been.calledTwice();

    await API.put();

    expect(interceptor.responseError).to.have.been.calledTwice();
  });

  it('should run request interceptors in the same registration order', async () => {
    const API = {
      // eslint-disable-next-line promise/param-names
      post: () => new Promise(res => res())
    };
    const interceptorManager = new Interceptor(API, ['post']);
    const interceptorOne = {
      request: sinon.stub().resolves(true)
    };
    const interceptorTwo = {
      request: sinon.stub().resolves(true)
    };
    const interceptorThree = {
      request: sinon.stub().resolves(true)
    };
    interceptorManager.register(interceptorOne);
    interceptorManager.register(interceptorTwo);
    interceptorManager.register(interceptorThree);

    await API.post();

    expect(interceptorOne.request).to.have.been.calledBefore(interceptorTwo.request);
    expect(interceptorTwo.request).to.have.been.calledBefore(interceptorThree.request);
    expect(interceptorThree.request).to.have.been.calledAfter(interceptorTwo.request);
  });

  it('should run response interceptors in reversed registration order', async () => {
    const API = {
      // eslint-disable-next-line promise/param-names
      post: () => new Promise(res => res())
    };
    const interceptorManager = new Interceptor(API, ['post']);
    const interceptorOne = {
      response: sinon.stub().resolves(true)
    };
    const interceptorTwo = {
      response: sinon.stub().resolves(true)
    };
    const interceptorThree = {
      response: sinon.stub().resolves(true)
    };
    interceptorManager.register(interceptorOne);
    interceptorManager.register(interceptorTwo);
    interceptorManager.register(interceptorThree);

    await API.post();

    expect(interceptorThree.response).to.have.been.calledBefore(interceptorTwo.response);
    expect(interceptorTwo.response).to.have.been.calledBefore(interceptorOne.response);
    expect(interceptorOne.response).to.have.been.calledAfter(interceptorTwo.response);
  });

  it('should remove interceptor on unregister', async () => {
    const API = {
      // eslint-disable-next-line promise/param-names
      post: () => new Promise(res => res())
    };
    const interceptorManager = new Interceptor(API, ['post']);
    const interceptorOne = {
      request: sinon.stub().resolves(true)
    };
    const interceptorTwo = {
      request: sinon.stub().resolves(true)
    };
    const unregisterInterceptorOne = interceptorManager.register(interceptorOne);
    interceptorManager.register(interceptorTwo);

    await API.post();

    unregisterInterceptorOne();
    interceptorManager.unregister(interceptorTwo);

    await API.post();

    expect(interceptorOne.request).to.have.been.calledOnce();
    expect(interceptorTwo.request).to.have.been.calledOnce();
  });

  it('should remove all interceptors on clear', async () => {
    const API = {
      // eslint-disable-next-line promise/param-names
      post: () => new Promise(res => res())
    };
    const interceptorManager = new Interceptor(API, ['post']);
    const interceptor = {
      request: sinon.stub().resolves(true)
    };
    interceptorManager.register(interceptor);

    await API.post();

    interceptorManager.clear();

    await API.post();

    expect(interceptor.request).to.have.been.calledOnce();
  });
});
