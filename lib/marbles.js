'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _util = require('./util.js');

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