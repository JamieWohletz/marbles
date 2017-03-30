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
const TOKEN_REGEX = /{([^}]+)}/g;

function regexify(seg) {
  const newSegment = seg.fragment.replace(TOKEN_REGEX, (token) => {
    return seg.tokens[token].source;
  });
  console.log('regexified: ', new RegExp(newSegment));
  return new RegExp(newSegment);
}

function getSegments(routeFragment, segments) {
  const ids = util.keys(segments).filter((id) => id !== 'root');
  console.log('searching for ', routeFragment);
  if (!routeFragment) {
    return null;
  }
  return ids.reduce((found, id) => {
    if (routeFragment.search(regexify(segments[id])) !== -1) {
      return found.concat(id);
    }
    return found;
  }, []);
}

function matchingSegments(route, segments) {
  const fragments = route
    .split('/')
    .reduce((arr, str) => arr.concat(str.length > 1 ? str : []), []);
  let fragment = [];
  let matching = [];
  while (fragments.length > 0) {
    fragment.push(fragments.shift());
    const foundSegments = getSegments(fragment.join('/'), segments);
    if (foundSegments.length) {
      fragment = [];
    }
    matching = matching.concat(foundSegments);
  }
  console.log('matching fragments: ', matching);
  return matching;
}

function segmentToListNode(id, segments, data = {}) {
  return {
    id,
    segment: util.assign(
      {
        tokens: {}
      },
      segments[id],
      {
        tokenData: data
      }
    ),
    next: null
  };
}

// MUTATES HEAD
function listAppend(list, node) {
  const head = util.listSlice(0, util.listLength(list), list);
  let next = head;
  let last;
  while (next) {
    last = next;
    next = next.next;
  }
  last.next = node;
  return head;
}

function routeToList(route, segments) {
  if (!segments.root) {
    return null;
  }
  const initialList = segmentToListNode('root', segments);
  const segmentIds = matchingSegments(route, segments);
  return segmentIds.reduce((head, id) => {
    const ok = segments[id].rule(id, head);
    return ok ? listAppend(head, segmentToListNode(id, segments)) : head;
  }, initialList);
}

function replaceTokens(string, data) {
  function stripBraces(str) {
    return str.substr(1, str.length - 2);
  }
  return string.replace(TOKEN_REGEX, (match) => stripBraces(data[match]));
}

function listToRoute({ next }, leadingSlash, trailingSlash) {
  const fragments = util.listReduce(
    (array, { segment: { fragment, tokenData } }) => {
      return array.concat(replaceTokens(fragment, tokenData));
    },
    [],
    next
  );
  const hash = fragments.join('/');
  return `${leadingSlash ? '/' : ''}${hash}${trailingSlash ? '/' : ''}`;
}

function chainData(list, upToNode) {
  const data = util.emptyObject();
  const stop = util.isObject(upToNode) ? upToNode : { data: {} };
  let next = list;
  while (next && next !== stop) {
    util.assign(data, next.segment.tokenData);
    next = next.next;
  }
  return util.assign(data, stop.segment.tokenData);
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
  deactivated.forEach((listNode) => {
    observers[listNode.id].deactivated.forEach((handler) => {
      handler();
    });
  });
}

function isValidSegment(seg) {
  return util.isObject(seg)
    && util.isString(seg.fragment)
    && util.isFunction(seg.rule)
    && (
      typeof seg.tokens === 'undefined' ||
      util.isObject(seg.tokens)
    );
}

function isValidConfig(conf) {
  return util.isObject(conf)
    && util.keys(conf).reduce((b, segId) => isValidSegment(conf[segId]), true);
}

function assertOptionsOk(options) {
  if (options && !util.isObject(options)) {
    throw new Error('Invalid options. Please read the docs for details.');
  }
}

function assertSegmentConfigOk(segmentConfig) {
  if (!isValidConfig(segmentConfig)) {
    throw new Error(
      `
        Invalid segment configuration.
        Please read the docs for details on proper segment configuration.
        `
    );
  }
}

export default class Marbles {
  constructor(segmentConfig, options = {}, win = window) {
    const defaultOptions = {
      leadingSlash: true,
      trailingSlash: true
    };
    const defaultSegments = {
      root: {
        fragment: '',
        rule: (done) => done(true),
      }
    };

    assertSegmentConfigOk(segmentConfig);
    assertOptionsOk(options);
    this.options = util.assign({}, defaultOptions, options);
    this.segments = Object.freeze(util.assign({}, defaultSegments, segmentConfig));
    this.observers = Object.freeze(util.keys(this.segments).reduce((obj, key) => {
      obj[key] = {
        activated: [],
        deactivated: []
      };
      return obj;
    }, {}));
    this.win = win;
    this.linkedList = null;
  }
  static get logic() {
    return logic;
  }
  static present(requiredSegmentId) {
    return (segmentId, linkedList) =>
      util.listHas({
        id: requiredSegmentId
      }, linkedList);
  }
  static parent(parentId) {
    return (segmentId, linkedList) => {
      const parent = util.findListNode({
        id: parentId
      }, linkedList);
      return parent && parent.next && parent.next.id === segmentId;
    };
  }
  // read the given route and fire activate and deactivate accordingly
  processRoute(hash = this.win.location.hash) {
    const route = hash.replace('#', '');
    const list = routeToList(route, this.segments);
    handleActivations(list, this.linkedList, this.observers);
    handleDeactivations(list, this.linkedList, this.observers);
    this.linkedList = list;
    return listToRoute(
      this.linkedList,
      this.options.leadingSlash,
      this.options.trailingSlash
    );
  }
  // fire activated HERE
  activate(segmentId, data) {
    if (!this.linkedList) {
      return '';
    }
    const segment = this.segments[segmentId];
    const segNode = segmentToListNode(segmentId, this.segments);
    const rule = segment.rule;
    const len = util.listLength(this.linkedList);
    let ok = false;
    let head = this.linkedList;
    // BROKEN: this function does not account for the case
    // where the segment being activated is already in the route
    // it also does not handle appension correctly because
    // listAppend mutates the input list. Fix listAppend first

    // listAppend fixed
    while (!ok && util.listLength(head) > 0) {
      ok = rule(segmentId, listAppend(head, segNode));
      console.log('rule ', ok);
      head = util.listSlice(0, util.listLength(head) - 1, head);
    }
    listAppend(
      head,
      util.listSlice(util.listLength(head) - 1, len, this.linkedList)
    );
    console.log('route: ', listToRoute(head, this.options.leadingSlash, this.options.trailingSlash));
    return this.processRoute(
      listToRoute(head, this.options.leadingSlash, this.options.trailingSlash)
    );
  }
  // fire deactivated HERE
  deactivate(segmentId) {

  }
  subscribe(listenerObject) {

  }
}
