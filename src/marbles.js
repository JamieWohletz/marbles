import * as util from './util';
import * as logic from './logic';
import { List } from 'immutable';
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
    id: 'root',
    fragment: '',
    tokens: {},
    tokenData: {},
    rule: () => true
  };
}

function listWithRoot() {
  return List([rootSegment()]);
}

function setTokenData(segment, data) {
  return util.assign({}, segment, {
    tokenData: util.isObject(data) ? data : {}
  });
}

function stripOuterBraces(dynamicToken) {
  return dynamicToken.substr(1, dynamicToken.length - 2);
}

function arraySwap(i, j, array) {
  const tmp = array[i];
  array[i] = array[j];
  array[j] = tmp;
}

// TODO: memoize
function regexify(seg) {
  const newSegment = seg.fragment.replace(TOKEN_REGEX, (token) => {
    const tokenName = stripOuterBraces(token);
    const regex = seg.tokens[tokenName];
    if (!regex) {
      throw new Error(`
        The '${seg.id}' segment is missing a regex for its '${token}' dynamic token. 

        Please add a '${tokenName}' property with a RegExp value to that segment's 'tokens' config.

        In general, every segment with dynamic tokens requires a 
        'token' config with a regex for every dynamic token in that segment.
      `);
    }
    return regex.source;
  });
  return new RegExp(`${newSegment}`);
}

function segmentMatch(string, segment) {
  return string.match(regexify(segment)) || [];
}

function extractData(string, segment) {
  const tokens = segment.tokens;
  let searchString = string;
  const tokenKeys = (segment.fragment.match(TOKEN_REGEX) || []).map(stripOuterBraces);
  const tokenData = tokenKeys.reduce((data, tokenName) => {
    const matches = searchString.match(tokens[tokenName]);
    const match = util.arrayHead(matches);
    searchString = string.substr(matches.index + match.length);
    data[tokenName] = match;
    return data;
  }, {});
  return tokenData;
}

function matchingSegments(route, segments) {
  return util.keys(segments).reduce((arr, key) => {
    const seg = segments[key];
    const matches = segmentMatch(route, segments[key]);
    const segmentsWithData = matches.map((str) => {
      return setTokenData(seg, extractData(str, seg));
    });
    return arr.concat(segmentsWithData);
  }, []);
}

// TODO: memoize
function routeToList(route, segments) {
  if (!segments.root) {
    return null;
  }
  const matchingSegs = matchingSegments(route, segments);
  const matchCount = matchingSegs.length;
  let leftWall = 0;
  let newList = List();
  let added = true;
  while (leftWall < matchCount && added) {
    added = false;
    for (let i = leftWall; i < matchCount; i++) {
      const node = matchingSegs[i];
      const listWithNode = newList.push(node);
      if (node.rule(node.id, listWithNode)) {
        newList = listWithNode;
        arraySwap(i, leftWall, matchingSegs);
        added = true;
        leftWall += 1;
        break;
      }
    }
  }
  return newList;
}

function replaceTokens(string, data) {
  return string.replace(TOKEN_REGEX, (match) => data[stripOuterBraces(match)]);
}

// TODO: memoize
function listToRoute(list, leadingSlash, trailingSlash) {
  const fragments = list.map((node) => {
    return replaceTokens(node.fragment, node.tokenData);
  }).filter((frag) => frag !== '');
  const hash = fragments.join('/');
  return hash ? `${leadingSlash ? '/' : ''}${hash}${trailingSlash ? '/' : ''}` : hash;
}

function chainData(list, upToNode) {
  const data = util.emptyObject();
  const stopIndex = list.lastIndexOf(upToNode);
  return list.reduce((chainedData, node, index) => {
    if (stopIndex !== -1 && index > stopIndex) {
      return chainedData;
    }
    return util.assign(chainedData, node.tokenData);
  }, data);
}

function listDiff(from, against, diffData) {
  return from.reduce((newList, node) => {
    const found = newList.find(({ id }) => id === node.id);
    if (!found || diffData && !util.equal(found.data, node.data)) {
      return newList.push(node);
    }
    return newList;
  }, List());
}

function handleActivations(newList, oldList, subscribers) {
  const activated = listDiff(newList, oldList, true);
  activated.forEach((listNode) => {
    subscribers[listNode.id].activated.forEach((handler) => {
      setTimeout(() => {
        handler(chainData(newList, listNode));
      }, 0);
    });
  });
}

function handleDeactivations(newList, oldList, subscribers) {
  const deactivated = listDiff(oldList, newList, false);
  deactivated.forEach((listNode) => {
    subscribers[listNode.id].deactivated.forEach((handler) => {
      setTimeout(() => handler(), 0);
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

function normalizeSegment(id, segment) {
  return util.assign(
    {
      id,
      tokens: {},
      tokenData: {}
    },
    segment
  );
}

function normalizeSegments(segmentConfig) {
  return util.keys(segmentConfig).reduce((norm, id) => {
    norm[id] = normalizeSegment(id, segmentConfig[id]);
    return norm;
  }, {});
}

function assertValidListenerObject(listener) {
  if (
    !util.isObject(listener) ||
    (
      (typeof listener.activated !== 'undefined' &&
      !util.isFunction(listener.activated)) ||
      (typeof listener.deactivated !== 'undefined' &&
      !util.isFunction(listener.deactivated))
    )
  ) {
    throw new Error(`
      Invalid ListenerObject. ListenerObjects must conform to the following interface: 
      {
        activated?: (data: Object): void,
        deactivated?: (): void 
      }
    `);
  }
}

function assertValidSubscription(subscription) {
  if (!util.isObject(subscription)) {
    throw new Error(`
      Invalid Subscription. Subscriptions must conform to the following interface:
      {
        [segmentId: string]: ListenerObject
      }
    `);
  }
  util.keys(subscription).forEach((k) => assertValidListenerObject(subscription[k]));
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
    this.segments = Object.freeze(
      normalizeSegments(util.assign({}, defaultSegments, segmentConfig))
    );
    this.subscribers = Object.freeze(util.keys(this.segments).reduce((obj, key) => {
      obj[key] = {
        activated: [],
        deactivated: []
      };
      return obj;
    }, {}));
    this.win = win;
    this.list = listWithRoot();
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
    return (segmentId, list) => {
      return list.findIndex((node) => {
        return node.id === requiredSegmentId;
      }) !== -1;
    };
  }
  static parent(parentId) {
    return (segmentId, list) => {
      const parentIndex = list.findLastIndex((node) => {
        return node.id === parentId;
      });
      const nodeIndex = list.findLastIndex((node) => {
        return node.id === segmentId;
      });
      return nodeIndex === parentIndex + 1;
    };
  }
  // read the given route and fire activate and deactivate accordingly
  processRoute(hash = this.win.location.hash) {
    const route = hash.replace('#', '');
    const list = routeToList(route, this.segments);
    handleActivations(list, this.list, this.subscribers);
    handleDeactivations(list, this.list, this.subscribers);
    this.list = list;
    const newRoute = listToRoute(
      this.list,
      this.options.leadingSlash,
      this.options.trailingSlash
    );
    this.win.location.hash = newRoute;
    return newRoute;
  }
  activate(segmentId, data) {
    const list = this.list;
    const seg = this.segments[segmentId];
    const segNode = setTokenData(seg, data);

    const newList = list.reduce((l, node) => {
      const withNode = l.push(node);
      const withSeg = withNode.push(segNode);
      const ok = seg.rule(segmentId, withSeg);
      return ok ? withSeg : withNode;
    }, List());
    const route = listToRoute(
      newList,
      this.options.leadingSlash,
      this.options.trailingSlash
    );
    return this.processRoute(route);
  }
  deactivate(segmentId) {
    const removalIndex = this.list.findLastIndex((node) => node.id === segmentId);
    const newRoute = listToRoute(
      this.list.delete(removalIndex),
      this.options.leadingSlash,
      this.options.trailingSlash
    );
    return this.processRoute(newRoute);
  }
  subscribe(subscription) {
    assertValidSubscription(subscription);
    const subs = this.subscribers;
    util.keys(subscription).forEach((k) => {
      const activators = subscription[k].activated || [];
      const deactivators = subscription[k].deactivated || [];
      subs[k].activated = subs[k].activated.concat(activators);
      subs[k].deactivated = subs[k].deactivated.concat(deactivators);
    });
  }
  unsubscribe(subscription) {
    assertValidSubscription(subscription);
    const subs = this.subscribers;
    util.keys(subscription).forEach((k) => {
      const activatorsToRm = subscription[k].activated || [];
      const deactivatorsToRm = subscription[k].deactivated || [];
      util.pull(activatorsToRm, subs[k].activated);
      util.pull(deactivatorsToRm, subs[k].deactivated);
    });
  }
}
