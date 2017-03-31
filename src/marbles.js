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
const DIGIT_REGEX = /\d+/;

function rootSegment() {
  return {
    fragment: '',
    tokens: {},
    tokenData: {},
    rule: () => true
  };
}

function newList() {
  return {
    id: 'root',
    segment: rootSegment(),
    next: null
  };
}

function regexify(seg) {
  const newSegment = seg.fragment.replace(TOKEN_REGEX, (token) => {
    return seg.tokens[token].source;
  });
  return new RegExp(newSegment);
}

function getSegments(routeFragment, segments) {
  const ids = util.keys(segments).filter((id) => id !== 'root');
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
  return matching;
}

function segmentToListNode(id, segments, data = {}) {
  const normalizedSegment = util.assign(
    {
      tokens: {}
    },
    segments[id],
    {
      tokenData: data
    }
  );
  return {
    id,
    segment: normalizedSegment,
    next: null
  };
}

function routeToList(route, segments) {
  if (!segments.root) {
    return null;
  }
  const initialList = newList();
  const segmentIds = matchingSegments(route, segments);
  return segmentIds.reduce((head, id) => {
    const newHead = util.listAppend(head, segmentToListNode(id, segments, {}));
    const ok = segments[id].rule(id, newHead);
    return ok ? newHead : head;
  }, initialList);
}

function replaceTokens(string, data) {
  function stripBraces(str) {
    return str.substr(1, str.length - 2);
  }
  return string.replace(TOKEN_REGEX, (match) => stripBraces(data[match]));
}

function listToRoute(head, leadingSlash, trailingSlash) {
  const fragments = util.listReduce(
    (array, { segment: { fragment, tokenData } }) => {
      return fragment ? array.concat(replaceTokens(fragment, tokenData)) : array;
    },
    [],
    head
  );
  const hash = fragments.join('/');
  return hash ? `${leadingSlash ? '/' : ''}${hash}${trailingSlash ? '/' : ''}` : hash;
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
      root: rootSegment()
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
  static get Regex() {
    return {
      DIGITS: DIGIT_REGEX
    };
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
    const newRoute = listToRoute(
      this.linkedList,
      this.options.leadingSlash,
      this.options.trailingSlash
    );
    this.win.location.hash = newRoute;
    return newRoute;
  }
  // fire activated HERE
  activate(segmentId, data) {
    const segment = this.segments[segmentId];
    const segNode = segmentToListNode(segmentId, this.segments, data);
    const rule = segment.rule;
    const len = util.listLength(this.linkedList);
    let finished = false;
    let head = this.linkedList;
    while (!finished) {
      finished = rule(segmentId, util.listAppend(head, segNode)) || util.listLength(head) === 0;
      head = util.listSlice(0, util.listLength(head) - 1, head);
    }
    head = util.listAppend(head, segNode);
    console.log('activate: intermediate list = ', head);
    console.log('to append: ', util.listSlice(util.listLength(head) - 1, len, this.linkedList));
    head = util.listAppend(
      head,
      util.listSlice(util.listLength(head) - 1, len, this.linkedList)
    );
    console.log('activate: final list = ', head);
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
