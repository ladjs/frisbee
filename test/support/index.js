
// setup global fetch
//
// node-fetch has limits:
// <https://github.com/bitinn/node-fetch/blob/master/LIMITS.md>
global.fetch = (typeof window === 'undefined')
  ? require('node-fetch')
  : require('whatwg-fetch');

// setup global chai methods
import chai from 'chai';
import dirtyChai from 'dirty-chai';
import checkChai from 'check-chai';
chai.config.includeStack = true;
chai.config.showDiff = true;
chai.use(dirtyChai);
chai.use(checkChai);
global.chai = chai;
global.AssertionError = chai.AssertionError;
global.Assertion = chai.Assertion;
global.expect = chai.expect;
global.assert = chai.assert;
