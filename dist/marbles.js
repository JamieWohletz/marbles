(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["Marbles"] = factory();
	else
		root["Marbles"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };
	
	var _util = __webpack_require__(1);
	
	var util = _interopRequireWildcard(_util);
	
	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	module.exports = function Marbles(routingGraph) {
	  var win = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : window;
	
	  _classCallCheck(this, Marbles);
	
	  var IMMUTABLE_GRAPH = routingGraph;
	  var DYNAMIC_SEGMENT_REGEX = /:[a-zA-Z]+(?=\/?)/;
	  var DIGIT_SEGMENT_REGEX = /\d+(?=\/?)/;
	  var observers = util.keys(IMMUTABLE_GRAPH).reduce(function (obj, key) {
	    obj[key] = [];
	    return obj;
	  }, util.emptyObject());
	  var graphStack = [];
	
	  // Private methods
	  function expandSegment(segment, data) {
	    return segment.replace(DYNAMIC_SEGMENT_REGEX, function (segmentKey) {
	      return data[segmentKey.replace(':', '')];
	    });
	  }
	
	  function extractSegmentData(templateSegment, segmentWithData) {
	    var dynamicSegments = templateSegment.match(new RegExp(DYNAMIC_SEGMENT_REGEX.source, 'g')) || [];
	    return (segmentWithData.match(DIGIT_SEGMENT_REGEX) || []).reduce(function (data, value, index) {
	      data[dynamicSegments[index].replace(':', '')] = value;
	      return util.assign(util.emptyObject(), data);
	    }, util.emptyObject());
	  }
	
	  function segmentToRegex(segment) {
	    // It just got weird
	    var regexed = segment.replace(new RegExp(DYNAMIC_SEGMENT_REGEX.source, 'g'), DIGIT_SEGMENT_REGEX.source);
	    return new RegExp(regexed);
	  }
	
	  function findListNode(nodeId, list) {
	    var next = list;
	    while (next) {
	      if (next.id === nodeId) {
	        return next;
	      }
	      next = next.next;
	    }
	    return null;
	  }
	
	  function chainData(list, upToNode) {
	    var data = util.emptyObject();
	    var stop = util.isObject(upToNode) ? upToNode : { data: {} };
	    var next = list;
	    while (next && next !== stop) {
	      util.assign(data, next.data);
	      next = next.next;
	    }
	    return util.assign(data, stop.data);
	  }
	
	  function graphNodeToListNode(id, graph) {
	    var graphNode = graph[id];
	    return util.assign(util.emptyObject(), graphNode, {
	      id: id,
	      segment: expandSegment(graphNode.segment, graphNode.data),
	      next: null
	    });
	  }
	
	  function deactivateGraphNode(force, nodeId, immutableGraph) {
	    var graph = util.cloneDeep(immutableGraph);
	    function recDeactivate(target, current, g) {
	      var curr = g[current];
	      if (target === current || curr.dependency === target || force) {
	        curr.active = false;
	        curr.data = util.emptyObject();
	      }
	      curr.children.forEach(function (childId) {
	        return recDeactivate(target, childId, g);
	      });
	    }
	    recDeactivate(nodeId, nodeId, graph);
	    return graph;
	  }
	
	  function activateGraphNode(nodeId, data, immutableGraph) {
	    var graph = util.cloneDeep(immutableGraph);
	    var parents = util.keys(graph).filter(function (key) {
	      return graph[key].children.indexOf(nodeId) !== -1;
	    });
	    function dfsActivate(searchId, currentId, dependencyMet) {
	      var curr = graph[currentId];
	      var search = graph[searchId];
	      if (currentId === searchId && dependencyMet) {
	        search.active = true;
	        search.data = data;
	        return true;
	      } else if (currentId === searchId && !dependencyMet) {
	        return false;
	      }
	      return curr.children.reduce(function (depMet, childId) {
	        return dfsActivate(searchId, childId, depMet);
	      }, dependencyMet || currentId === search.dependency);
	    }
	
	    var activated = dfsActivate(nodeId, 'root', false);
	    if (activated) {
	      // deactivate immediate siblings
	      return parents.reduce(function (g, parentId) {
	        return g[parentId].children.filter(function (id) {
	          return id !== nodeId;
	        }).reduce(function (retG, childId) {
	          return deactivateGraphNode(true, childId, retG);
	        }, g);
	      }, graph);
	    }
	    return graph;
	  }
	
	  function appendNode(node, head) {
	    var clonedHead = util.cloneDeep(head);
	    var next = clonedHead;
	    var last = void 0;
	    var dependencyMet = false;
	    while (next) {
	      dependencyMet = dependencyMet || next.id === node.dependency;
	      last = next;
	      next = next.next;
	    }
	    if (dependencyMet) {
	      last.next = util.cloneDeep(node);
	    }
	    return clonedHead;
	  }
	
	  function parseHash(hashRoute, routeGraph) {
	    function recParse(hash, rootId, visitedNodes, graph) {
	      var root = graph[rootId];
	      return root.children.reduce(function (g, childId) {
	        var child = graph[childId];
	        var newG = g;
	        var matches = hash.match(segmentToRegex(child.segment)) || [];
	        var substrIndex = matches.index ? matches.index + matches[0].length : 0;
	        if (visitedNodes[childId]) {
	          return newG;
	        }
	        visitedNodes[childId] = true;
	        if (matches.length > 0 && (graph[child.dependency] || util.emptyObject()).active) {
	          newG = activateGraphNode(childId, extractSegmentData(child.segment, util.arrayHead(matches)), graph);
	        }
	        return recParse(hash.substr(substrIndex), childId, visitedNodes, newG);
	      }, graph);
	    }
	    var newGraph = util.cloneDeep(routeGraph);
	    return recParse(hashRoute, 'root', {}, newGraph);
	  }
	
	  function buildGraph(hash) {
	    return parseHash(hash, IMMUTABLE_GRAPH);
	  }
	
	  function listToHashRoute(head) {
	    return util.listReduce(function (hash, node) {
	      if (node.segment) {
	        return '' + hash + node.segment + '/';
	      }
	      return hash;
	    }, '#', head);
	  }
	
	  function graphToLinkedList(graph, rootId, listHead, visitedNodes) {
	    var root = graph[rootId];
	    var nextListNode = graphNodeToListNode(rootId, graph);
	    var newHead = root.active ? appendNode(nextListNode, listHead) : util.cloneDeep(listHead);
	
	    return root.children.reduce(function (head, childId) {
	      if (visitedNodes[childId]) {
	        return head;
	      }
	      visitedNodes[childId] = true;
	      return graphToLinkedList(graph, childId, head, visitedNodes);
	    }, newHead);
	  }
	
	  function logGraph(newGraph) {
	    var lastGraph = util.peek(graphStack);
	    if (!lastGraph || JSON.stringify(lastGraph) !== JSON.stringify(newGraph)) {
	      graphStack.push(newGraph);
	    }
	    return newGraph;
	  }
	
	  function graphToList(graph) {
	    if (!graph) {
	      return null;
	    }
	    return graphToLinkedList(graph, 'root', graphNodeToListNode('root', graph), util.emptyObject());
	  }
	
	  function listDiff(from, against, includeUpdates) {
	    return util.listReduce(function (arr, node) {
	      var found = findListNode(node.id, against);
	      if (!found || includeUpdates && !util.equal(found.data, node.data)) {
	        return arr.concat(node);
	      }
	      return arr;
	    }, [], from);
	  }
	
	  function notifyObservers(obsObj, oldGraph, newGraph) {
	    var oldListHead = graphToList(oldGraph);
	    var newListHead = graphToList(newGraph);
	    var removed = listDiff(oldListHead, newListHead, false);
	    var insertedNodes = listDiff(newListHead, oldListHead, true);
	    removed.forEach(function (node) {
	      obsObj[node.id].forEach(function (obs) {
	        obs.removed(chainData(oldListHead, node));
	      });
	    });
	    util.listForEach(function (node) {
	      obsObj[node.id].forEach(function (obs) {
	        obs.inserted(chainData(newListHead, node));
	      });
	    }, insertedNodes[0] || null);
	  }
	
	  function insertOrRemove(insert, segmentId, data) {
	    var dataToUse = data;
	    if (!util.isString(segmentId) || !IMMUTABLE_GRAPH[segmentId]) {
	      return null;
	    }
	    if (data === null || (typeof data === 'undefined' ? 'undefined' : _typeof(data)) !== 'object' || data instanceof Array) {
	      dataToUse = util.emptyObject();
	    }
	    var graph = buildGraph(win.location.hash);
	    var newGraph = void 0;
	    if (insert) {
	      newGraph = activateGraphNode(segmentId, dataToUse, graph);
	    } else {
	      newGraph = deactivateGraphNode(false, segmentId, graph);
	    }
	    win.location.hash = listToHashRoute(graphToList(newGraph));
	    return this;
	  }
	  // End private methods
	
	  // Public methods
	  this.subscribe = function subscribe(subscriptions) {
	    if (!util.isObject(subscriptions)) {
	      return false;
	    }
	    var matchingKeys = util.keys(subscriptions).filter(function (key) {
	      return !!observers[key];
	    });
	    if (matchingKeys.length === 0) {
	      return false;
	    }
	    matchingKeys.forEach(function (key) {
	      var sub = subscriptions[key];
	      observers[key].push({
	        inserted: sub.inserted || util.noop,
	        removed: sub.removed || util.noop
	      });
	    });
	    return true;
	  };
	  this.unsubscribe = function unsubscribe(segmentId, event, handler) {
	    if (!util.isString(segmentId) || !util.isString(event) || !util.isFunction(handler) || !observers[segmentId]) {
	      return false;
	    }
	    var matchingObservers = observers[segmentId].filter(function (obs) {
	      return obs[event] === handler;
	    });
	    return util.pull(matchingObservers, observers[segmentId]);
	  };
	  this.insert = function insert(segmentId, data) {
	    return insertOrRemove.call(this, true, segmentId, data);
	  };
	  this.remove = function remove(segmentId) {
	    return insertOrRemove.call(this, false, segmentId);
	  };
	  this.getData = function getData() {
	    return chainData(graphToList(buildGraph(win.location.hash)));
	  };
	  this.step = function step() {
	    var beginningState = win.location.hash;
	    var beginningGraph = buildGraph(beginningState);
	    notifyObservers(observers, graphStack.pop(), beginningGraph);
	    logGraph(beginningGraph);
	    var newState = win.location.hash;
	    var newGraph = buildGraph(newState);
	    win.history.replaceState(util.emptyObject(), '', listToHashRoute(graphToList(newGraph)));
	    return this;
	  };
	
	  var listener = this.step.bind(this);
	  this.start = function start() {
	    win.addEventListener('hashchange', listener);
	    return this;
	  };
	  this.stop = function stop() {
	    win.removeEventListener('hashchange', listener);
	    return this;
	  };
	  // End public methods
	};

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };
	
	var deepEqual = __webpack_require__(2);
	
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
	
	exports.equal = deepEqual;
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

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var pSlice = Array.prototype.slice;
	var objectKeys = __webpack_require__(3);
	var isArguments = __webpack_require__(4);
	
	var deepEqual = module.exports = function (actual, expected, opts) {
	  if (!opts) opts = {};
	  // 7.1. All identical values are equivalent, as determined by ===.
	  if (actual === expected) {
	    return true;
	
	  } else if (actual instanceof Date && expected instanceof Date) {
	    return actual.getTime() === expected.getTime();
	
	  // 7.3. Other pairs that do not both pass typeof value == 'object',
	  // equivalence is determined by ==.
	  } else if (!actual || !expected || typeof actual != 'object' && typeof expected != 'object') {
	    return opts.strict ? actual === expected : actual == expected;
	
	  // 7.4. For all other Object pairs, including Array objects, equivalence is
	  // determined by having the same number of owned properties (as verified
	  // with Object.prototype.hasOwnProperty.call), the same set of keys
	  // (although not necessarily the same order), equivalent values for every
	  // corresponding key, and an identical 'prototype' property. Note: this
	  // accounts for both named and indexed properties on Arrays.
	  } else {
	    return objEquiv(actual, expected, opts);
	  }
	}
	
	function isUndefinedOrNull(value) {
	  return value === null || value === undefined;
	}
	
	function isBuffer (x) {
	  if (!x || typeof x !== 'object' || typeof x.length !== 'number') return false;
	  if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
	    return false;
	  }
	  if (x.length > 0 && typeof x[0] !== 'number') return false;
	  return true;
	}
	
	function objEquiv(a, b, opts) {
	  var i, key;
	  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
	    return false;
	  // an identical 'prototype' property.
	  if (a.prototype !== b.prototype) return false;
	  //~~~I've managed to break Object.keys through screwy arguments passing.
	  //   Converting to array solves the problem.
	  if (isArguments(a)) {
	    if (!isArguments(b)) {
	      return false;
	    }
	    a = pSlice.call(a);
	    b = pSlice.call(b);
	    return deepEqual(a, b, opts);
	  }
	  if (isBuffer(a)) {
	    if (!isBuffer(b)) {
	      return false;
	    }
	    if (a.length !== b.length) return false;
	    for (i = 0; i < a.length; i++) {
	      if (a[i] !== b[i]) return false;
	    }
	    return true;
	  }
	  try {
	    var ka = objectKeys(a),
	        kb = objectKeys(b);
	  } catch (e) {//happens when one is a string literal and the other isn't
	    return false;
	  }
	  // having the same number of owned properties (keys incorporates
	  // hasOwnProperty)
	  if (ka.length != kb.length)
	    return false;
	  //the same set of keys (although not necessarily the same order),
	  ka.sort();
	  kb.sort();
	  //~~~cheap key test
	  for (i = ka.length - 1; i >= 0; i--) {
	    if (ka[i] != kb[i])
	      return false;
	  }
	  //equivalent values for every corresponding key, and
	  //~~~possibly expensive deep test
	  for (i = ka.length - 1; i >= 0; i--) {
	    key = ka[i];
	    if (!deepEqual(a[key], b[key], opts)) return false;
	  }
	  return typeof a === typeof b;
	}


/***/ },
/* 3 */
/***/ function(module, exports) {

	exports = module.exports = typeof Object.keys === 'function'
	  ? Object.keys : shim;
	
	exports.shim = shim;
	function shim (obj) {
	  var keys = [];
	  for (var key in obj) keys.push(key);
	  return keys;
	}


/***/ },
/* 4 */
/***/ function(module, exports) {

	var supportsArgumentsClass = (function(){
	  return Object.prototype.toString.call(arguments)
	})() == '[object Arguments]';
	
	exports = module.exports = supportsArgumentsClass ? supported : unsupported;
	
	exports.supported = supported;
	function supported(object) {
	  return Object.prototype.toString.call(object) == '[object Arguments]';
	};
	
	exports.unsupported = unsupported;
	function unsupported(object){
	  return object &&
	    typeof object == 'object' &&
	    typeof object.length == 'number' &&
	    Object.prototype.hasOwnProperty.call(object, 'callee') &&
	    !Object.prototype.propertyIsEnumerable.call(object, 'callee') ||
	    false;
	};


/***/ }
/******/ ])
});
;
//# sourceMappingURL=marbles.js.map