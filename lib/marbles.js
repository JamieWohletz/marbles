'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _util = require('./util.js');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Marbles = function Marbles(routingGraph) {
  var win = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : window;

  _classCallCheck(this, Marbles);

  var IMMUTABLE_GRAPH = routingGraph;
  var DYNAMIC_SEGMENT_REGEX = /:[a-zA-Z]+(?=\/?)/;
  var DIGIT_SEGMENT_REGEX = /\d+(?=\/?)/;
  var observers = (0, _util.keys)(IMMUTABLE_GRAPH).reduce(function (obj, key) {
    obj[key] = [];
    return obj;
  }, (0, _util.emptyObject)());
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
      return (0, _util.assign)((0, _util.emptyObject)(), data);
    }, (0, _util.emptyObject)());
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
    var data = (0, _util.emptyObject)();
    var next = list;
    while (next && next !== upToNode) {
      (0, _util.assign)(data, next.data);
      next = next.next;
    }
    return (0, _util.assign)(data, upToNode.data);
  }

  function graphNodeToListNode(id, graph) {
    var graphNode = graph[id];
    return (0, _util.assign)((0, _util.emptyObject)(), graphNode, {
      id: id,
      segment: expandSegment(graphNode.segment, graphNode.data),
      next: null
    });
  }

  function deactivateGraphNode(force, nodeId, immutableGraph) {
    var graph = (0, _util.cloneDeep)(immutableGraph);
    function recDeactivate(target, current, g) {
      var curr = g[current];
      if (target === current || curr.dependency === target || force) {
        curr.active = false;
        curr.data = (0, _util.emptyObject)();
      }
      curr.children.forEach(function (childId) {
        return recDeactivate(target, childId, g);
      });
    }
    recDeactivate(nodeId, nodeId, graph);
    return graph;
  }

  function activateGraphNode(nodeId, data, immutableGraph) {
    var graph = (0, _util.cloneDeep)(immutableGraph);
    var parents = (0, _util.keys)(graph).filter(function (key) {
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
    var clonedHead = (0, _util.cloneDeep)(head);
    var next = clonedHead;
    var last = void 0;
    var dependencyMet = false;
    while (next) {
      dependencyMet = dependencyMet || next.id === node.dependency;
      last = next;
      next = next.next;
    }
    if (dependencyMet) {
      last.next = (0, _util.cloneDeep)(node);
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
        if (matches.length > 0 && (graph[child.dependency] || (0, _util.emptyObject)()).active) {
          newG = activateGraphNode(childId, extractSegmentData(child.segment, (0, _util.arrayHead)(matches)), graph);
        }
        return recParse(hash.substr(substrIndex), childId, visitedNodes, newG);
      }, graph);
    }
    var newGraph = (0, _util.cloneDeep)(routeGraph);
    return recParse(hashRoute, 'root', {}, newGraph);
  }

  function buildGraph(hash) {
    return parseHash(hash, IMMUTABLE_GRAPH);
  }

  function listToHashRoute(head) {
    var str = '#';
    var next = head;
    while (next) {
      if (next.segment) {
        str += next.segment + '/';
      }
      next = next.next;
    }
    return str;
  }

  function graphToLinkedList(graph, rootId, listHead, visitedNodes) {
    var root = graph[rootId];
    var nextListNode = graphNodeToListNode(rootId, graph);
    var newHead = root.active ? appendNode(nextListNode, listHead) : (0, _util.cloneDeep)(listHead);

    return root.children.reduce(function (head, childId) {
      if (visitedNodes[childId]) {
        return head;
      }
      visitedNodes[childId] = true;
      return graphToLinkedList(graph, childId, head, visitedNodes);
    }, newHead);
  }

  function logGraph(newGraph) {
    var lastGraph = (0, _util.peek)(graphStack);
    if (!lastGraph || JSON.stringify(lastGraph) !== JSON.stringify(newGraph)) {
      graphStack.push(newGraph);
    }
    return newGraph;
  }

  function graphToList(graph) {
    if (!graph) {
      return null;
    }
    return graphToLinkedList(graph, 'root', graphNodeToListNode('root', graph), (0, _util.emptyObject)());
  }

  function notifyObservers(obsObj, oldGraph, newGraph) {
    var oldListHead = graphToList(oldGraph);
    var newListHead = graphToList(newGraph);
    var missing = function () {
      var nxt = oldListHead;
      var arr = [];
      while (nxt) {
        if (!findListNode(nxt.id, newListHead)) {
          arr.push(nxt.id);
        }
        nxt = nxt.next;
      }
      return arr;
    }();
    missing.forEach(function (routeId) {
      obsObj[routeId].forEach(function (obs) {
        obs.removed();
      });
    });
    var next = newListHead;
    while (next) {
      var observerArray = obsObj[next.id];
      for (var i = 0; i < observerArray.length; i++) {
        observerArray[i].inserted(chainData(newListHead, next));
      }
      next = next.next;
    }
  }

  function insertOrRemove(insert, routeId, data) {
    var dataToUse = data;
    if (!(0, _util.isString)(routeId) || !IMMUTABLE_GRAPH[routeId]) {
      return null;
    }
    if (data === null || (typeof data === 'undefined' ? 'undefined' : _typeof(data)) !== 'object' || data instanceof Array) {
      dataToUse = (0, _util.emptyObject)();
    }
    var graph = buildGraph(win.location.hash);
    var newGraph = void 0;
    if (insert) {
      newGraph = activateGraphNode(routeId, dataToUse, graph);
    } else {
      newGraph = deactivateGraphNode(false, routeId, graph);
    }
    win.location.hash = listToHashRoute(graphToList(newGraph));
    return this;
  }
  // End private methods

  // Public methods
  this.subscribe = function subscribe(subscriptions) {
    if (!(0, _util.isObject)(subscriptions)) {
      return false;
    }
    var matchingKeys = (0, _util.keys)(subscriptions).filter(function (key) {
      return !!observers[key];
    });
    if (matchingKeys.length === 0) {
      return false;
    }
    matchingKeys.forEach(function (key) {
      var sub = subscriptions[key];
      observers[key].push({
        inserted: sub.inserted || _util.noop,
        removed: sub.removed || _util.noop
      });
    });
    return true;
  };
  this.unsubscribe = function unsubscribe(route, event, handler) {
    if (!(0, _util.isString)(route) || !(0, _util.isString)(event) || !(0, _util.isFunction)(handler) || !observers[route]) {
      return false;
    }
    var matchingObservers = observers[route].filter(function (obs) {
      return obs[event] === handler;
    });
    return (0, _util.pull)(matchingObservers, observers[route]);
  };
  this.insert = function insert(routeId, data) {
    return insertOrRemove.call(this, true, routeId, data);
  };
  this.remove = function remove(routeId) {
    return insertOrRemove.call(this, false, routeId);
  };
  this.step = function step() {
    var originalHash = win.location.hash;
    var graph = buildGraph(originalHash);
    notifyObservers(observers, graphStack.pop(), graph);
    logGraph(graph);
    win.history.replaceState((0, _util.emptyObject)(), '', listToHashRoute(graphToList(graph)));
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

exports.default = Marbles;
module.exports = exports['default'];