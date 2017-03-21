import * as util from './util.js';

function asyncBoolEval(anything, args, done) {
  if (util.isFunction(anything)) {
    anything.apply(null, [done].concat(args));
  } else {
    done(Boolean(anything));
  }
}

function not(argument) {
  return function strictNot(...extraArgs) {
    return !asyncBoolEval(argument, extraArgs);
  };
}

function or(...predicates) {
  return function strictOr(done, ...extraArgs) {
    (function asyncBoolFold(callback, ps, accumulator) {
      if (ps.length === 0 || accumulator) {
        callback(accumulator);
        return;
      }
      asyncBoolEval(ps[0], extraArgs, asyncBoolFold.bind(null, callback, ps.slice(1)));
    }(done, predicates, false));
  };
}

export {
  not,
  or
};
