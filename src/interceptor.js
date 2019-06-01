module.exports = class Interceptor {
  constructor(API, interceptableMethods = []) {
    this.interceptors = [];

    if (!API) throw new Error('API should be passed to the Interceptor');

    if (interceptableMethods.length === 0)
      throw new Error('no methods were added to interceptableMethods');

    interceptableMethods.forEach(methodName => {
      const methodFn = API[methodName];
      API[methodName] = (...args) =>
        this.interceptedMethod(methodFn(...args), ...args);
    });
  }

  /* eslint-disable promise/prefer-await-to-then */
  interceptedMethod(methodFn, ...args) {
    const { interceptors } = this;
    const reversedInterceptors = interceptors.slice().reverse();

    let promise = Promise.resolve(args);

    // Register request interceptors
    interceptors.forEach(({ request, requestError }) => {
      if (typeof request === 'function')
        promise = promise.then(args => request(...[].concat(args)));
      if (typeof requestError === 'function')
        promise = promise.catch(requestError);
    });

    // Register methodFn call
    if (typeof methodFn === 'function')
      promise = promise.then(args => methodFn(...[].concat(args)));

    // Register response interceptors
    reversedInterceptors.forEach(({ response, responseError }) => {
      if (typeof response === 'function') promise = promise.then(response);
      if (typeof responseError === 'function')
        promise = promise.catch(responseError);
    });

    return promise;
  }
  /* eslint-enable promise/prefer-await-to-then */

  register(interceptor) {
    this.interceptors.push(interceptor);
    return () => this.unregister(interceptor);
  }

  unregister(interceptor) {
    const index = this.interceptors.indexOf(interceptor);
    if (index >= 0) this.interceptors.splice(index, 1);
  }

  clear() {
    this.interceptors = [];
  }
};
