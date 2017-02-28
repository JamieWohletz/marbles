import { pull, emptyObject, keys, cloneDeep, assign, arrayHead } from './util.js';
class Marbles {
  constructor(routingGraph) {
    const IMMUTABLE_GRAPH = routingGraph;
    const DYNAMIC_SEGMENT_REGEX = /:[a-zA-Z]+(?=\/?)/;
    const DIGIT_SEGMENT_REGEX = /\d+(?=\/?)/;
    const observers = keys(IMMUTABLE_GRAPH).reduce((obj, key) => {
      obj[key] = [];
      return obj;
    }, emptyObject());
    let mutableGraph;
    let linkedList;

    // Private methods
    function expandSegment(segment, data) {
      return segment.replace(
        DYNAMIC_SEGMENT_REGEX,
        (segmentKey) => data[segmentKey.replace(':', '')]
      );
    }

    function extractSegmentData(templateSegment, segmentWithData) {
      const dynamicSegments = templateSegment.match(new RegExp(DYNAMIC_SEGMENT_REGEX, 'g')) || [];
      return (segmentWithData.match(DIGIT_SEGMENT_REGEX) || []).reduce((data, value, index) => {
        data[dynamicSegments[index].replace(':', '')] = value;
        return assign(emptyObject(), data);
      }, emptyObject());
    }

    function segmentToRegex(segment) {
      // It just got weird
      const regexed = segment.replace(
        new RegExp(DYNAMIC_SEGMENT_REGEX, 'g'),
        DIGIT_SEGMENT_REGEX.source
      );
      return new RegExp(regexed);
    }

    function findListNode(list, nodeId) {
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
        next: null
      });
    }

    function deactivateGraphNode(nodeId, graph) {
      const node = graph[nodeId];
      node.active = false;
      node.data = emptyObject();
      node.children.forEach((childId) => deactivateGraphNode(childId, graph));
    }

    function activateGraphNode(nodeId, data, graph) {
      const parents = keys(graph).filter(
        (key) => graph[key].children.indexOf(nodeId) !== -1
      );
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
        return curr.children.reduce((depMet, childId) => {
          return dfsActivate(searchId, childId, depMet);
        }, dependencyMet || currentId === search.dependency);
      }
      const activated = dfsActivate(nodeId, 'root', false);
      if (!activated) {
        return;
      }
      parents.forEach((parentId) => {
        graph[parentId].children.filter((id) => id !== nodeId).forEach((childId) => {
          deactivateGraphNode(childId, graph);
        });
      });
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

    function parseHash(hash, graph, rootId, visitedNodes) {
      const root = graph[rootId];
      root.children.forEach((childId) => {
        const child = graph[childId];
        const matches = hash.match(segmentToRegex(child.segment)) || [];
        const substrIndex = matches.index ? matches.index + matches[0].length : 0;
        if (visitedNodes[childId]) {
          return;
        }
        visitedNodes[childId] = true;
        if (matches.length > 0 && (graph[child.dependency] || emptyObject()).active) {
          activateGraphNode(childId, extractSegmentData(child.segment, arrayHead(matches)), graph);
        }
        parseHash(hash.substr(substrIndex), graph, childId, visitedNodes);
      });
    }

    function listToHashRoute(head) {
      let str = '#';
      let next = head;
      while (next) {
        str += `${next.segment}/`;
        next = next.next;
      }
      return str;
    }

    function graphToLinkedList(graph, rootId, listHead, visitedNodes) {
      const root = graph[rootId];
      const nextListNode = graphNodeToListNode(rootId, graph);
      const newHead = root.active ? appendNode(nextListNode, listHead) : cloneDeep(listHead);

      return root.children.reduce((head, childId) => {
        if (visitedNodes[childId]) {
          return head;
        }
        visitedNodes[childId] = true;
        return graphToLinkedList(graph, childId, head, visitedNodes);
      }, newHead);
    }

    function graphToList(graph) {
      return graphToLinkedList(graph, 'root', graphNodeToListNode('root', graph), emptyObject());
    }

    function notifyObservers(obs, listHead) {
      let next = listHead;
      while (next) {
        const handlers = obs[next.id];
        for (let i = 0; i < handlers.length; i++) {
          handlers[i](chainData(listHead, next));
        }
        next = next.next;
      }
    }
    // End private methods

    // Public methods
    this.subscribe = function subscribe(routeId, handler) {
      const observer = {
        routeId,
        handler
      };
      observers[routeId].push(observer.handler);
      return observer;
    };
    this.unsubscribe = function unsubscribe(observer) {
      return pull(observers[observer.routeId], observer.handler);
    };
    this.publish = function publish(routeId, data) {
      activateGraphNode(routeId, data, mutableGraph);
      linkedList = graphToList(mutableGraph);
      // TODO: make this async
      observers[routeId].forEach((handler) => {
        handler(chainData(linkedList, findListNode(linkedList, routeId)));
      });
      window.location.hash = listToHashRoute(linkedList);
    };
    this.trigger = function trigger() {
      const originalHash = window.location.hash;
      mutableGraph = cloneDeep(IMMUTABLE_GRAPH);
      parseHash(originalHash, mutableGraph, 'root', emptyObject());
      linkedList = graphToList(mutableGraph);
      const newHash = listToHashRoute(linkedList);
      history.replaceState(emptyObject(), '', newHash);
      notifyObservers(observers, linkedList);
    };
    // End public methods

    window.addEventListener('hashchange', this.trigger.bind(this));
  }
}

export default Marbles;
