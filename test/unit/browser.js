import es6promise from 'es6-promise';
es6promise.polyfill();
import 'isomorphic-fetch';
import Frisbee from '../../lib/frisbee';
window.Frisbee = Frisbee;
