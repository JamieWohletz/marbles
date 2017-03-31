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
    fragment: '',
    tokens: {},
    tokenData: {},
    rule: () => true
  };
}

function listWithRoot() {
  return List([{
    id: 'root',
    segment: rootSegment()
  }]);
}

function stripOuterBraces(dynamicToken) {
  return dynamicToken.substr(1, dynamicToken.length - 2);
}

function regexify(seg) {
  const newSegment = seg.fragment.replace(TOKEN_REGEX, (token) => {
    return seg.tokens[stripOuterBraces(token)].source;
  });
  return new RegExp(`^${newSegment}$`);
}

function searchSegments(string, segments) {
  return util.keys(segments).filter((id) => {
    return regexify(segments[id]).test(string);
  });
}

function extractData(string, segment) {
  const tokens = segment.tokens;
  const tokenData = util.keys(tokens).reduce((data, tokenName) => {
    data[tokenName] = util.arrayHead(string.match(tokens[tokenName]));
  }, {});
  return util.assign({}, segment, {
    tokenData
  });
}

function matchingSegments(route, segments) {
  const fragments = route
    .split('/')
    .reduce((arr, str) => arr.concat(str.length >= 1 ? str : []), []);
  let matches = [];
  for (let i = 0; i < fragments.length; i++) {
    const frag = fragments[i];
    let searchFrag = frag;
    let j = i;
    do {
      matches = matches.concat(searchSegments(searchFrag, segments));
      j++;
      searchFrag += `/${fragments[j]}`;
    } while (j < fragments.length);
  }
  return matches;
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
  };
}

function routeToList(route, segments) {
  if (!segments.root) {
    return null;
  }
  const initialList = listWithRoot();
  const segmentIds = matchingSegments(route, segments);
  return segmentIds.reduce((list, id) => {
    const newList = list.push(segmentToListNode(id, segments, {}));
    const ok = segments[id].rule(id, newList);
    return ok ? newList : list;
  }, initialList);
}

function replaceTokens(string, data) {
  return string.replace(TOKEN_REGEX, (match) => data[stripOuterBraces(match)]);
}

function listToRoute(list, leadingSlash, trailingSlash) {
  const fragments = list.map(({ segment: { fragment, tokenData } }) => {
    return replaceTokens(fragment, tokenData);
  }).filter((frag) => frag !== '');
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
  return from.reduce((newList, node) => {
    const found = newList.find(({ id }) => id === node.id);
    if (!found || diffData && !util.equal(found.data, node.data)) {
      return newList.push(node);
    }
    return newList;
  }, List());
}

function handleActivations(newList, oldList, observers) {
  const activated = listDiff(newList, oldList, true);
  // activated.forEach((listNode) => {
  //   observers[listNode.id].activated.forEach((handler) => {
  //     handler(chainData(newList, listNode));
  //   });
  // });
}

function handleDeactivations(newList, oldList, observers) {
  const deactivated = listDiff(oldList, newList, false);
  // deactivated.forEach((listNode) => {
  //   observers[listNode.id].deactivated.forEach((handler) => {
  //     handler();
  //   });
  // });
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
    this.list = List();
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
    handleActivations(list, this.list, this.observers);
    handleDeactivations(list, this.list, this.observers);
    this.list = list;
    const newRoute = listToRoute(
      this.list,
      this.options.leadingSlash,
      this.options.trailingSlash
    );
    this.win.location.hash = newRoute;
    return newRoute;
  }
  // fire activated HERE
  activate(segmentId, data) {
    const list = this.list;
    const seg = this.segments[segmentId];
    const segNode = segmentToListNode(segmentId, this.segments, data);

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
  // fire deactivated HERE
  deactivate(segmentId) {

  }
  subscribe(listenerObject) {

  }
}
