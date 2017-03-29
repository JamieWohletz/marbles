import * as util from './util.js';

function boolEval(anything, args) {
  if (util.isFunction(anything)) {
    return anything.apply(null, args);
  } else {
    return Boolean(anything);
  }
}

function not(argument) {
  return function strictNot(...extraArgs) {
    return !boolEval(argument, extraArgs);
  };
}

function or(...predicates) {
  return function strictOr(...extraArgs) {
    for (let i = 0; i < predicates.length; i++) {
      if (boolEval(predicates[i], extraArgs)) {
        return true;
      }
    }
    return false;
  };
}

function and(...predicates) {
  return function strictAnd(...extraArgs) {
    for (let i = 0; i < predicates.length; i++) {
      if (!boolEval(predicates[i], extraArgs)) {
        return false;
      }
    }
    return predicates.length > 0;
  };
}

export {
  not,
  or,
  and
};
