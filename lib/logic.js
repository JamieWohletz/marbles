'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.and = exports.or = exports.not = undefined;

var _util = require('./util.js');

var util = _interopRequireWildcard(_util);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function boolEval(anything, args) {
  if (util.isFunction(anything)) {
    return anything.apply(null, args);
  } else {
    return Boolean(anything);
  }
}

function not(argument) {
  return function strictNot() {
    for (var _len = arguments.length, extraArgs = Array(_len), _key = 0; _key < _len; _key++) {
      extraArgs[_key] = arguments[_key];
    }

    return !boolEval(argument, extraArgs);
  };
}

function or() {
  for (var _len2 = arguments.length, predicates = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    predicates[_key2] = arguments[_key2];
  }

  return function strictOr() {
    for (var _len3 = arguments.length, extraArgs = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      extraArgs[_key3] = arguments[_key3];
    }

    for (var i = 0; i < predicates.length; i++) {
      if (boolEval(predicates[i], extraArgs)) {
        return true;
      }
    }
    return false;
  };
}

function and() {
  for (var _len4 = arguments.length, predicates = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
    predicates[_key4] = arguments[_key4];
  }

  return function strictAnd() {
    for (var _len5 = arguments.length, extraArgs = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
      extraArgs[_key5] = arguments[_key5];
    }

    for (var i = 0; i < predicates.length; i++) {
      if (!boolEval(predicates[i], extraArgs)) {
        return false;
      }
    }
    return predicates.length > 0;
  };
}

exports.not = not;
exports.or = or;
exports.and = and;