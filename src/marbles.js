import {
  pull,
  isString,
  isFunction,
  emptyObject,
  noop,
  keys,
  cloneDeep,
  assign,
  arrayHead,
  isObject,
  peek
} from './util.js';

export default class Marbles {
  constructor(routingGraph, win = window) {
    const IMMUTABLE_GRAPH = routingGraph;
    const DYNAMIC_SEGMENT_REGEX = /:[a-zA-Z]+(?=\/?)/;
    const DIGIT_SEGMENT_REGEX = /\d+(?=\/?)/;
    const observers = keys(IMMUTABLE_GRAPH).reduce((obj, key) => {
      obj[key] = [];
      return obj;
    }, emptyObject());
    const graphStack = [];

    // Private methods
    function expandSegment(segment, data) {
      return segment.replace(
        DYNAMIC_SEGMENT_REGEX,
        segmentKey => data[segmentKey.replace(':', '')]
      );
    }

    function extractSegmentData(templateSegment, segmentWithData) {
      const dynamicSegments = templateSegment.match(
        new RegExp(DYNAMIC_SEGMENT_REGEX.source, 'g')
      ) || [];
      return (segmentWithData.match(DIGIT_SEGMENT_REGEX) || []).reduce((data, value, index) => {
        data[dynamicSegments[index].replace(':', '')] = value;
        return assign(emptyObject(), data);
      },
        emptyObject()
      );
    }

    function segmentToRegex(segment) {
      // It just got weird
      const regexed = segment.replace(
        new RegExp(DYNAMIC_SEGMENT_REGEX.source, 'g'),
        DIGIT_SEGMENT_REGEX.source
      );
      return new RegExp(regexed);
    }

    function findListNode(nodeId, list) {
      let next = list;
      while (next) {
        if (next.id === nodeId) {
          return next;
        }
        next = next.next;
      }
      return null;
    }

    function chainData(list, upToNode) {
      const data = emptyObject();
      let next = list;
      while (next && next !== upToNode) {
        assign(data, next.data);
        next = next.next;
      }
      return assign(data, upToNode.data);
    }

    function graphNodeToListNode(id, graph) {
      const graphNode = graph[id];
      return assign(emptyObject(), graphNode, {
        id,
        segment: expandSegment(graphNode.segment, graphNode.data),
        next: null,
      });
    }

    function deactivateGraphNode(force, nodeId, immutableGraph) {
      const graph = cloneDeep(immutableGraph);
      function recDeactivate(target, current, g) {
        const curr = g[current];
        if (target === current || curr.dependency === target || force) {
          curr.active = false;
          curr.data = emptyObject();
        }
        curr.children.forEach(childId => recDeactivate(target, childId, g));
      }
      recDeactivate(nodeId, nodeId, graph);
      return graph;
    }

    function activateGraphNode(nodeId, data, immutableGraph) {
      const graph = cloneDeep(immutableGraph);
      const parents = keys(graph).filter(key => graph[key].children.indexOf(nodeId) !== -1);
      function dfsActivate(searchId, currentId, dependencyMet) {
        const curr = graph[currentId];
        const search = graph[searchId];
        if (currentId === searchId && dependencyMet) {
          search.active = true;
          search.data = data;
          return true;
        }
        else if (currentId === searchId && !dependencyMet) {
          return false;
        }
        return curr.children.reduce(
          (depMet, childId) => dfsActivate(searchId, childId, depMet),
          dependencyMet || currentId === search.dependency
        );
      }

      const activated = dfsActivate(nodeId, 'root', false);
      if (activated) {
        // deactivate immediate siblings
        return parents.reduce((g, parentId) => {
          return g[parentId].children.filter(id => id !== nodeId).reduce((retG, childId) => {
            return deactivateGraphNode(true, childId, retG);
          }, g);
        }, graph);
      }
      return graph;
    }

    function appendNode(node, head) {
      const clonedHead = cloneDeep(head);
      let next = clonedHead;
      let last;
      let dependencyMet = false;
      while (next) {
        dependencyMet = dependencyMet || next.id === node.dependency;
        last = next;
        next = next.next;
      }
      if (dependencyMet) {
        last.next = cloneDeep(node);
      }
      return clonedHead;
    }

    function parseHash(hashRoute, routeGraph) {
      function recParse(hash, rootId, visitedNodes, graph) {
        const root = graph[rootId];
        return root.children.reduce((g, childId) => {
          const child = graph[childId];
          let newG = g;
          const matches = hash.match(segmentToRegex(child.segment)) || [];
          const substrIndex = matches.index ? matches.index + matches[0].length : 0;
          if (visitedNodes[childId]) {
            return newG;
          }
          visitedNodes[childId] = true;
          if (matches.length > 0 && (graph[child.dependency] || emptyObject()).active) {
            newG = activateGraphNode(
              childId,
              extractSegmentData(child.segment, arrayHead(matches)),
              graph
            );
          }
          return recParse(hash.substr(substrIndex), childId, visitedNodes, newG);
        }, graph);
      }
      const newGraph = cloneDeep(routeGraph);
      return recParse(hashRoute, 'root', {}, newGraph);
    }

    function buildGraph(hash) {
      return parseHash(hash, IMMUTABLE_GRAPH);
    }

    function listToHashRoute(head) {
      let str = '#';
      let next = head;
      while (next) {
        if (next.segment) {
          str += `${next.segment}/`;
        }
        next = next.next;
      }
      return str;
    }

    function graphToLinkedList(graph, rootId, listHead, visitedNodes) {
      const root = graph[rootId];
      const nextListNode = graphNodeToListNode(rootId, graph);
      const newHead = root.active ? appendNode(nextListNode, listHead) : cloneDeep(listHead);

      return root.children.reduce(
        (head, childId) => {
          if (visitedNodes[childId]) {
            return head;
          }
          visitedNodes[childId] = true;
          return graphToLinkedList(graph, childId, head, visitedNodes);
        },
        newHead
      );
    }

    function logGraph(newGraph) {
      const lastGraph = peek(graphStack);
      if (!lastGraph || JSON.stringify(lastGraph) !== JSON.stringify(newGraph)) {
        graphStack.push(newGraph);
      }
      return newGraph;
    }

    function graphToList(graph) {
      if (!graph) {
        return null;
      }
      return graphToLinkedList(graph, 'root', graphNodeToListNode('root', graph), emptyObject());
    }

    function notifyObservers(obsObj, oldGraph, newGraph) {
      const oldListHead = graphToList(oldGraph);
      const newListHead = graphToList(newGraph);
      const missing = (() => {
        let nxt = oldListHead;
        const arr = [];
        while (nxt) {
          if (!findListNode(nxt.id, newListHead)) {
            arr.push(nxt.id);
          }
          nxt = nxt.next;
        }
        return arr;
      })();
      missing.forEach((routeId) => {
        obsObj[routeId].forEach((obs) => {
          obs.removed();
        });
      });
      let next = newListHead;
      while (next) {
        const observerArray = obsObj[next.id];
        for (let i = 0; i < observerArray.length; i++) {
          observerArray[i].inserted(chainData(newListHead, next));
        }
        next = next.next;
      }
    }

    function insertOrRemove(insert, routeId, data) {
      let dataToUse = data;
      if (!isString(routeId) || !IMMUTABLE_GRAPH[routeId]) {
        return null;
      }
      if (data === null || typeof data !== 'object' || data instanceof Array) {
        dataToUse = emptyObject();
      }
      const graph = buildGraph(win.location.hash);
      let newGraph;
      if (insert) {
        newGraph = activateGraphNode(routeId, dataToUse, graph);
      }
      else {
        newGraph = deactivateGraphNode(false, routeId, graph);
      }
      win.location.hash = listToHashRoute(graphToList(newGraph));
      return this;
    }
    // End private methods

    // Public methods
    this.subscribe = function subscribe(subscriptions) {
      if (!isObject(subscriptions)) {
        return false;
      }
      const matchingKeys = keys(subscriptions).filter(key => !!observers[key]);
      if (matchingKeys.length === 0) {
        return false;
      }
      matchingKeys.forEach(key => {
        const sub = subscriptions[key];
        observers[key].push({
          inserted: sub.inserted || noop,
          removed: sub.removed || noop,
        });
      });
      return true;
    };
    this.unsubscribe = function unsubscribe(route, event, handler) {
      if (!isString(route) || !isString(event) || !isFunction(handler) || !observers[route]) {
        return false;
      }
      const matchingObservers = observers[route].filter((obs) => obs[event] === handler);
      return pull(matchingObservers, observers[route]);
    };
    this.insert = function insert(routeId, data) {
      return insertOrRemove.call(this, true, routeId, data);
    };
    this.remove = function remove(routeId) {
      return insertOrRemove.call(this, false, routeId);
    };
    this.step = function step() {
      const originalHash = win.location.hash;
      const graph = buildGraph(originalHash);
      notifyObservers(observers, graphStack.pop(), graph);
      logGraph(graph);
      win.history.replaceState(emptyObject(), '', listToHashRoute(graphToList(graph)));
      return this;
    };

    const listener = this.step.bind(this);
    this.start = function start() {
      win.addEventListener('hashchange', listener);
      return this;
    };
    this.stop = function stop() {
      win.removeEventListener('hashchange', listener);
      return this;
    };
    // End public methods
  }
}
