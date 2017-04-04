const deepEqual = require('deep-equal');

function emptyObject() {
  return Object.create(null);
}

function isObject(any) {
  return typeof any === 'object' && any !== null && !(any instanceof Array);
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

function assign(...args) {
  return Object.assign.apply(Object, args);
}

function arrayHead(array) {
  if (typeof array === 'undefined' || !(array instanceof Array)) {
    return undefined;
  }
  return array[0];
}

function pull(values, array) {
  return values.map((val) => {
    let index = array.indexOf(val);
    let results = [];
    while (index !== -1) {
      results = results.concat(array.splice(index, 1));
      index = array.indexOf(val);
    }
    return results;
  })
    .reduce((returnArray, subArray) => returnArray.concat(subArray), [])
    .reduce((returnArray, val) => {
      if (returnArray.indexOf(val) !== -1) {
        return returnArray;
      }
      return returnArray.concat(val instanceof Array ? [val] : val);
    }, []);
}

function without(values, array) {
  const newArray = array.slice();
  pull(values, newArray);
  return newArray;
}

function peek(arr) {
  if (!arr || !(arr instanceof Array)) {
    return null;
  }
  return arr[arr.length - 1] || null;
}

function noop() { }

function batchAsyncActions(fns, callback) {
  if (!isArray(fns)) {
    throw new TypeError(
      'batchAsyncResults() expects an array of functions as the first parameter.'
    );
  }
  let resolvedCount = 0;
  const results = [];
  fns.forEach((fn) => {
    fn((result) => {
      resolvedCount += 1;
      results.push(result);
      if (resolvedCount === fns.length) {
        callback(results);
      }
    });
  });
}

export {
  deepEqual as equal,
  emptyObject,
  isArray,
  isObject,
  isFunction,
  isString,
  batchAsyncActions,
  noop,
  keys,
  peek,
  assign,
  arrayHead,
  pull,
  without
};
