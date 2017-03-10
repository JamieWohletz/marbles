'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function emptyObject() {
  return Object.create(null);
}

function isObject(any) {
  return (typeof any === 'undefined' ? 'undefined' : _typeof(any)) === 'object' && any !== null && !(any instanceof Array);
}

function isArray(any) {
  return any instanceof Array;
}

function isString(any) {
  return typeof any === 'string';
}

function isFunction(any) {
  return typeof any === 'function';
}

function keys(obj) {
  return Object.keys(obj);
}

function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function assign() {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return Object.assign.apply(this, args);
}

function arrayHead(array) {
  if (typeof array === 'undefined' || !(array instanceof Array)) {
    return undefined;
  }
  return array[0];
}

function pull(values, array) {
  return values.map(function (val) {
    var index = array.indexOf(val);
    var results = [];
    while (index !== -1) {
      results = results.concat(array.splice(index, 1));
      index = array.indexOf(val);
    }
    return results;
  }).reduce(function (returnArray, subArray) {
    return returnArray.concat(subArray);
  }, []).reduce(function (returnArray, val) {
    if (returnArray.indexOf(val) !== -1) {
      return returnArray;
    }
    return returnArray.concat(val instanceof Array ? [val] : val);
  }, []);
}

function without(values, array) {
  var newArray = array.slice();
  pull(values, newArray);
  return newArray;
}

function peek(arr) {
  if (!arr || !(arr instanceof Array)) {
    return null;
  }
  return arr[arr.length - 1] || null;
}

function noop() {}

function isList(listish) {
  return listish === null || isObject(listish) && _typeof(listish.next) === 'object';
}

function assertList(list) {
  if (!isList(list)) {
    throw new TypeError('listForEach requires a list! Lists are objects with a `next` property.');
  }
}

function listForEach(iterator, list) {
  assertList(list);
  var next = list;
  var i = 0;
  while (next) {
    iterator(next, i);
    next = next.next;
    i = i + 1;
  }
}

function listMap(iterator, list) {
  var newNodes = [];
  listForEach(function (node, index) {
    newNodes.push(iterator(node, index));
  }, list);
  return newNodes.reduceRight(function (tail, node) {
    return assign({}, node, {
      next: tail
    });
  }, null);
}

function listReduce(reducer, accumulator, list) {
  return function foldl(f, a, head, i) {
    if (head === null) {
      return a;
    }
    assertList(head);
    return foldl(f, f(a, head, i), head.next, i + 1);
  }(reducer, accumulator, list, 0);
}

function batchAsyncActions(fns, callback) {
  if (!isArray(fns)) {
    throw new TypeError('batchAsyncResults() expects an array of functions as the first parameter.');
  }
  var resolvedCount = 0;
  var results = [];
  fns.forEach(function (fn) {
    fn(function (result) {
      resolvedCount += 1;
      results.push(result);
      if (resolvedCount === fns.length) {
        callback(results);
      }
    });
  });
}

exports.emptyObject = emptyObject;
exports.isArray = isArray;
exports.isObject = isObject;
exports.isFunction = isFunction;
exports.isString = isString;
exports.isList = isList;
exports.listForEach = listForEach;
exports.listMap = listMap;
exports.listReduce = listReduce;
exports.batchAsyncActions = batchAsyncActions;
exports.noop = noop;
exports.keys = keys;
exports.peek = peek;
exports.cloneDeep = cloneDeep;
exports.assign = assign;
exports.arrayHead = arrayHead;
exports.pull = pull;
exports.without = without;