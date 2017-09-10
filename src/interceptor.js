export default class Interceptor {

  constructor(API, interceptableMethods = []) {
    this.interceptors = [];

    if (!API)
      throw new Error('API should be passed to the Interceptor');

    if (interceptableMethods.length <= 0)
      throw new Error('no methods were added to interceptableMethods');

    interceptableMethods.forEach(methodName => {
      const APIMethod = API[methodName];
      API[methodName] = (...args) => {
        return this.interceptedMethod(APIMethod, ...args);
      };
    });
  }

  interceptedMethod = (APIMethod, ...args) => {
    const interceptors = this.interceptors;
    const reversedInterceptors = interceptors.slice().reverse();
    let promise = Promise.resolve(args);

    // Register request interceptors
    interceptors.forEach(({ request, requestError }) => {
      if (typeof request === 'function') {
        promise = promise.then(args => request(...args));
      }
      if (typeof requestError === 'function') {
        promise = promise.catch(requestError);
      }
    });

    // Register APIMethod call
    if (typeof APIMethod === 'function') {
      promise = promise.then(args => APIMethod(...args));
    }

    // Register response interceptors
    reversedInterceptors.forEach(({ response, responseError }) => {
      if (typeof response === 'function') {
        promise = promise.then(response);
      }
      if (typeof responseError === 'function') {
        promise = promise.catch(responseError);
      }
    });

    return promise;
  }

  register = (interceptor) => {
    this.interceptors.push(interceptor);
    return () => {
      this.unregister(interceptor);
    };
  }

  unregister = (interceptor) => {
    const index = this.interceptors.indexOf(interceptor);
    if (index >= 0) {
      this.interceptors.splice(index, 1);
    }
  }

  clear = () => {
    this.interceptors = [];
  }

}
