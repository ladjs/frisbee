const es6promise = require('es6-promise');
const Frisbee = require('../../lib');

es6promise.polyfill();

window.Frisbee = Frisbee;
