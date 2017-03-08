function emptyObject() {
  return Object.create(null);
}

function isObject(any) {
  return typeof any === 'object' && any !== null && !(any instanceof Array);
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

function assign(...args) {
  return Object.assign.apply(this, args);
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
  return arr[arr.length-1] || null;
}

function noop() {}

export {
  emptyObject,
  isObject,
  isFunction,
  isString,
  noop,
  keys,
  peek,
  cloneDeep,
  assign,
  arrayHead,
  pull,
  without
};
