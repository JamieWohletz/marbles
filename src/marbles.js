import * as util from './util';
import * as logic from './logic';
// core premise: route is a linked list which obeys the rules specified in the
// initial configuration

// with that in mind, what should the api be?

/*
constructor :: SegmentConfig -> Options -> Router
activate :: SegmentId -> Data -> Null
deactivate :: SegmentId -> Null
subscribe({
  'home': {
    activated: f,
    deactivated: f
  }
})
updateRoute :: String
start()
stop()
*/

/*
config = {
  segmentId: {
    fragment: string,
    rule: Function(callback, segmentId, linkedList),
    tokens: {
      key: regex
    }
  }
}
*/

function regexify(seg) {
  const newSegment = seg.fragment.replace(/{([^}]+)}/g, (token) => {
    return seg[token].source;
  });
  return new RegExp(newSegment);
}

function getSegments(routeFragment, segments) {
  const ids = util.keys(segments);
  if (!routeFragment) {
    return null;
  }
  return ids.reduce((found, id) => {
    if (routeFragment.search(regexify(segments[id])) !== -1) {
      return found.concat(id);
    }
    return [];
  }, []);
}

function matchingSegments(route, segments) {
  const fragments = route
    .split('/')
    .reduce((arr, str) => arr.concat(str.length > 1 ? str : []), []);
  let fragment = [];
  let matching = [];
  while (fragments.length > 0) {
    fragment.push(fragments.unshift());
    const foundSegments = getSegments(fragment.join('/'), segments);
    if (foundSegments.length) {
      fragment = [];
    }
    matching = matching.concat(foundSegments);
  }
  return matching;
}

function segmentToListNode(id, segments) {
  return {
    id,
    segment: segments[id],
    next: null
  };
}

function listAppend(head, node) {
  let next = head;
  let last;
  while (next) {
    last = next;
    next = next.next;
  }
  last.next = node;
}

function parseRoute(done, route, segments) {
  if (!segments.root) {
    done(null);
  }
  const initialList = segmentToListNode('root', segments);
  const segmentIds = matchingSegments(route, segments);
  (function buildList(head, ids) {
    if (ids.length === 0) {
      done(head);
      return;
    }
    const id = ids[0];
    const seg = segments[id];
    seg.rule(ok => {
      if (ok) {
        listAppend(head, segmentToListNode(id));
      }
      buildList(head, ids.slice(1));
    }, id, head);
  }(initialList, segmentIds));
}

function chainData(list, upToNode) {
  const data = util.emptyObject();
  const stop = util.isObject(upToNode) ? upToNode : { data: {} };
  let next = list;
  while (next && next !== stop) {
    util.assign(data, next.data);
    next = next.next;
  }
  return util.assign(data, stop.data);
}

function listDiff(from, against, diffData) {
  return util.listReduce((arr, node) => {
    const found = util.listHas({ id: node.id }, against);
    if (!found || (diffData && !util.equal(found.data, node.data))) {
      return arr.concat(node);
    }
    return arr;
  }, [], from);
}

function handleActivations(newList, oldList, observers) {
  const activated = listDiff(newList, oldList, true);
  activated.forEach((listNode) => {
    observers[listNode.id].activated.forEach((handler) => {
      handler(chainData(newList, listNode));
    });
  });
}

function handleDeactivations(newList, oldList, observers) {
  const deactivated = listDiff(oldList, newList, false);
  deactivated.forEach(listNode => {
    observers[listNode.id].deactivated.forEach(handler => {
      handler();
    });
  });
}

export default class Marbles {
  constructor(segmentConfig, options) {
    const defaults = {
      leadingSlash: true,
      trailingSlash: true
    };
    const defaultSegments = {
      root: {
        fragment: '',
        rule: done => done(true),
      }
    };
    this.options = util.assign({}, defaults, options);

    function isValidSegment(seg) {
      return util.isObject(seg)
        && util.isString(seg.fragment)
        && util.isFunction(seg.rule)
        && seg.rule.length >= 1
        && (
          typeof seg.tokens === 'undefined' ||
          util.isObject(seg.tokens)
        );
    }

    function isValidConfig(conf) {
      return util.isObject(conf)
        && util.keys(conf).reduce((b, segId) => isValidSegment(conf[segId]), true);
    }

    if (!isValidConfig(segmentConfig)) {
      throw new Error(
        `
        Invalid segment configuration.
        Please read the docs for details on proper segment configuration.
        `
      );
    }

    this.segments = util.assign({}, defaultSegments, segmentConfig);
    this.observers = util.keys(this.segments).reduce((obj, key) => {
      obj[key] = {
        activated: [],
        deactivated: []
      };
      return obj;
    }, {});
    this.linkedList = null;
  }
  // read the given route and fire activate and deactivate accordingly
  updateRoute(done, route = window.location.hash) {
    parseRoute(list => {
      handleActivations(list, this.linkedList, this.observers);
      handleDeactivations(list, this.linkedList, this.observers);
      this.linkedList = list;
      done();
    }, route, this.segments);
  }
  // fire activated HERE
  activate(done, segmentId, data) {
    if (!this.linkedList) {
      return;
    }
    const segment = this.segments[segmentId];
    const rule = segment.rule;
    const len = util.listLength(this.linkedList);
    (function checkRule(head) {
      if (!head) {
        return;
      }
      rule((ok) => {
        if (!ok) {
          checkRule(util.listSlice(0, util.listLength(head) - 1));
        } else {
          listAppend(head, segmentToListNode('segmentId', this.segments));
          listAppend(
            head,
            util.listSlice(util.listLength(head) - 1, len, this.linkedList)
          );
        }
      }, segmentId, head);
    }(this.linkedList));
  }
  // fire deactivated HERE
  deactivate(segmentId) {

  }
  subscribe(listenerObject) {

  }
}
