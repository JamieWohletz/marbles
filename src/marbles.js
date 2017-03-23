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
    this.linkedList = null;
  }
  // read the given route and fire activate and deactivate accordingly
  updateRoute(done, route) {
    parseRoute(list => {

    }, route, this.segments);
  }
  // fire activated HERE
  activate(segmentId, data) {

  }
  // fire deactivated HERE
  deactivate(segmentId) {

  }
  subscribe(listenerObject) {

  }
}
