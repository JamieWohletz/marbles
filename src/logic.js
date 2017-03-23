import * as util from './util.js';

function asyncBoolEval(done, anything, args) {
  if (util.isFunction(anything)) {
    anything.apply(null, [done].concat(args));
  } else {
    done(Boolean(anything));
  }
}

function not(argument) {
  return function strictNot(done, ...extraArgs) {
    asyncBoolEval((b) => {
      done(!b);
    }, argument, extraArgs);
  };
}

function or(...predicates) {
  return function strictOr(done, ...extraArgs) {
    (function asyncBoolFold(callback, ps, accumulator) {
      if (ps.length === 0 || accumulator) {
        callback(accumulator);
        return;
      }
      asyncBoolEval(asyncBoolFold.bind(null, callback, ps.slice(1)), ps[0], extraArgs);
    }(done, predicates, false));
  };
}

function and(...predicates) {
  return function strictAnd(done, ...extraArgs) {
    if (predicates.length === 0) {
      done(false);
      return;
    }
    (function asyncBoolFold(callback, ps, accumulator) {
      if (ps.length === 0 || !accumulator) {
        callback(accumulator);
        return;
      }
      asyncBoolEval(asyncBoolFold.bind(null, callback, ps.slice(1)), ps[0], extraArgs);
    }(done, predicates, true));
  };
}

export {
  not,
  or,
  and
};
