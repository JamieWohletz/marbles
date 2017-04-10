'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _util = require('./util');

var util = _interopRequireWildcard(_util);

var _logic = require('./logic');

var logic = _interopRequireWildcard(_logic);

var _immutable = require('immutable');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TOKEN_REGEX = /{([^}]+)}/g;
var DIGIT_REGEX = /\d+/;

function rootSegment() {
  return {
    id: 'root',
    fragment: '',
    tokens: {},
    tokenData: {},
    rule: function rule() {
      return true;
    }
  };
}

function listWithRoot() {
  return (0, _immutable.List)([rootSegment()]);
}

function setTokenData(segment, data) {
  return util.assign({}, segment, { tokenData: util.isObject(data) ? data : {} });
}

function stripOuterBraces(dynamicToken) {
  return dynamicToken.substr(1, dynamicToken.length - 2);
}

function arraySwap(i, j, array) {
  var tmp = array[i];
  array[i] = array[j];
  array[j] = tmp;
}

function childOf(parentId) {
  return function (segmentId, list) {
    var parentIndex = list.findLastIndex(function (node) {
      return node.id === parentId;
    });
    var nodeIndex = list.findLastIndex(function (node) {
      return node.id === segmentId;
    });
    return parentIndex !== -1 && nodeIndex === parentIndex + 1;
  };
}

function present(requiredSegmentId) {
  return function (segmentId, list) {
    return list.findIndex(function (node) {
      return node.id === requiredSegmentId;
    }) !== -1;
  };
}

// TODO: memoize
function regexify(seg) {
  var newSegment = seg.fragment.replace(TOKEN_REGEX, function (token) {
    var tokenName = stripOuterBraces(token);
    var regex = seg.tokens[tokenName];
    if (!regex) {
      throw new Error('\n        The \'' + seg.id + '\' segment is missing a regex for its \'' + token + '\' dynamic token. \n\n        Please add a \'' + tokenName + '\' property with a RegExp value to that segment\'s \'tokens\' config.\n\n        In general, every segment with dynamic tokens requires a \n        \'token\' config with a regex for every dynamic token in that segment.\n      ');
    }
    return regex.source;
  });
  return new RegExp('' + newSegment);
}

function extractData(rawFragment, segment) {
  var tokens = segment.tokens;
  var searchString = rawFragment;
  var tokenKeys = util.keys(tokens);
  var tokenData = tokenKeys.reduce(function (data, tokenName) {
    var matches = searchString.match(tokens[tokenName]);
    var match = util.arrayHead(matches);
    searchString = searchString.substr(matches.index + match.length);
    data[tokenName] = match;
    return data;
  }, {});
  return tokenData;
}

function canPush(segment, list) {
  var newList = list.push(segment);
  if (segment && segment.rule(segment.id, newList)) {
    return true;
  }
  return false;
}

// TODO: memoize
function routeToList(route, segments) {
  var segs = segments.toArray();
  var list = (0, _immutable.List)();
  var matchString = route;
  var leftWall = 0;
  var finished = false;
  while (!finished) {
    finished = true;
    for (var i = leftWall; i < segs.length; i++) {
      var seg = segs[i];
      var regex = regexify(seg);
      var match = util.arrayHead(matchString.match(regex));
      if (util.isString(match) && canPush(seg, list)) {
        var data = extractData(match, seg);
        matchString = matchString.replace(match, '');
        arraySwap(i, leftWall, segs);
        leftWall += 1;
        finished = false;
        list = list.push(setTokenData(seg, data));
        break;
      }
    }
  }
  return list;
}

function replaceTokens(string, data) {
  return string.replace(TOKEN_REGEX, function (match) {
    return data[stripOuterBraces(match)];
  });
}

// TODO: memoize
function listToRoute(list, leadingSlash, trailingSlash) {
  var fragments = list.map(function (node) {
    return replaceTokens(node.fragment, node.tokenData);
  }).filter(function (frag) {
    return frag !== '';
  });
  var hash = fragments.join('/');
  return hash ? '' + (leadingSlash ? '/' : '') + hash + (trailingSlash ? '/' : '') : hash;
}

function validateNodesAfter(index, list) {
  return list.reduce(function (newList, node, i) {
    if (i > index && canPush(node, newList)) {
      return newList.push(node);
    }
    return newList;
  }, list.slice(0, index + 1));
}

function chainData(list, upToNode) {
  var data = util.emptyObject();
  var stopIndex = list.lastIndexOf(upToNode);
  return list.reduce(function (chainedData, node, index) {
    if (stopIndex !== -1 && index > stopIndex) {
      return chainedData;
    }
    return util.assign(chainedData, node.tokenData);
  }, data);
}

function listDiff(from, against, diffData) {
  return from.reduce(function (newList, node) {
    var found = against.find(function (_ref) {
      var id = _ref.id;
      return id === node.id;
    });
    if (!found || diffData && !util.equal(found.tokenData, node.tokenData)) {
      return newList.push(node);
    }
    return newList;
  }, (0, _immutable.List)());
}

function handleActivations(newList, oldList, subscribers) {
  var activated = listDiff(newList, oldList, true);
  activated.forEach(function (listNode) {
    subscribers[listNode.id].activated.forEach(function (handler) {
      setTimeout(function () {
        handler(chainData(newList));
      }, 0);
    });
  });
}

function handleDeactivations(newList, oldList, subscribers) {
  var deactivated = listDiff(oldList, newList, false);
  deactivated.forEach(function (listNode) {
    subscribers[listNode.id].deactivated.forEach(function (handler) {
      setTimeout(function () {
        return handler();
      }, 0);
    });
  });
}

function assertValidSegment(seg) {
  if (!(util.isObject(seg) && util.isString(seg.id) && util.isString(seg.fragment) && util.isFunction(seg.rule) && (typeof seg.tokens === 'undefined' || util.isObject(seg.tokens)))) {
    throw new Error('\n          Invalid segment. Segments must conform to the following interface: \n          {\n            id: string,\n            fragment: string,\n            rule: (segmentId: string, routeList: ImmutableList): Boolean,\n            tokens?: {\n              [tokenName]: RegExp\n            }\n          }\n        ');
  }
}

function assertOptionsOk(options) {
  if (options && !util.isObject(options)) {
    throw new Error('Invalid options. Please read the docs for details.');
  }
}

function assertValidSegments(segments) {
  if (!util.isArray(segments)) {
    throw new Error('\n        Invalid segments configuration. Segments configuration must be an array of Segment objects.\n        Please consult the documentation for more information on the Segment interface.\n      ');
  }
  segments.forEach(assertValidSegment);
  segments.reduce(function (set, seg) {
    if (set[seg.id]) {
      throw new Error('\n        Duplicate segment ID \'' + seg.id + '\'!\n        Please remove this duplicate from your segment configs.\n      ');
    }
    set[seg.id] = true;
    return set;
  }, {});
}

function normalizeSegment(segment) {
  return util.assign({
    tokens: {},
    tokenData: {}
  }, segment);
}

function normalizeSegments(segments) {
  return (0, _immutable.List)(segments.map(function (segment) {
    return normalizeSegment(segment);
  }));
}

function assertValidListenerObject(listener) {
  if (!util.isObject(listener) || typeof listener.activated !== 'undefined' && !util.isFunction(listener.activated) || typeof listener.deactivated !== 'undefined' && !util.isFunction(listener.deactivated)) {
    throw new Error('\n      Invalid ListenerObject. ListenerObjects must conform to the following interface: \n      {\n        activated?: (data: Object): void,\n        deactivated?: (): void \n      }\n    ');
  }
}

function assertValidSubscription(subscription) {
  if (!util.isObject(subscription)) {
    throw new Error('\n      Invalid Subscription. Subscriptions must conform to the following interface:\n      {\n        [segmentId: string]: ListenerObject\n      }\n    ');
  }
  util.keys(subscription).forEach(function (k) {
    return assertValidListenerObject(subscription[k]);
  });
}

module.exports = function () {
  function Marbles(segmentsConfig) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var win = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : window;

    _classCallCheck(this, Marbles);

    var defaultOptions = {
      leadingSlash: true,
      trailingSlash: true
    };

    assertValidSegments(segmentsConfig);
    assertOptionsOk(options);
    this.options = util.assign({}, defaultOptions, options);
    this.segments = normalizeSegments([rootSegment()].concat(segmentsConfig));
    this.subscribers = Object.freeze(this.segments.reduce(function (obj, _ref2) {
      var id = _ref2.id;

      obj[id] = {
        activated: [],
        deactivated: []
      };
      return obj;
    }, {}));
    this.win = win;
    this.list = listWithRoot();
  }

  _createClass(Marbles, [{
    key: 'start',
    value: function start() {
      var _this = this;

      var win = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.win;

      this.processRoute(win.location.hash);
      this.hashChangeHandler = function () {
        _this.processRoute(win.location.hash, true);
      };
      win.addEventListener('hashchange', this.hashChangeHandler);
    }
  }, {
    key: 'stop',
    value: function stop() {
      var win = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.win;

      win.removeEventListener('hashchange', this.hashChangeHandler);
    }
    // read the given route and fire activate and deactivate accordingly

  }, {
    key: 'processRoute',
    value: function processRoute() {
      var hash = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.win.location.hash;
      var replaceHistory = arguments[1];

      var route = hash.replace('#', '');
      var list = routeToList(route, this.segments);
      return this.processList(list, replaceHistory);
    }
  }, {
    key: 'processList',
    value: function processList(list, replaceHistory) {
      handleActivations(list, this.list, this.subscribers);
      handleDeactivations(list, this.list, this.subscribers);
      this.list = list;
      var newRoute = listToRoute(this.list, this.options.leadingSlash, this.options.trailingSlash);
      var newHash = '#' + newRoute;
      if (replaceHistory) {
        this.win.history.replaceState(util.emptyObject(), '', newHash);
      } else {
        this.win.location.hash = newHash;
      }
      return newRoute;
    }
  }, {
    key: 'activate',
    value: function activate(segmentId, data) {
      var list = this.list;
      var seg = this.segments.find(function (_ref3) {
        var id = _ref3.id;
        return id === segmentId;
      });
      var segmentWithData = setTokenData(seg, data);
      var foundIndex = list.findIndex(function (_ref4) {
        var id = _ref4.id;
        return id === segmentId;
      });
      var newList = list;
      var insertionIndex = 0;
      if (foundIndex !== -1) {
        newList = newList.set(foundIndex, segmentWithData);
      } else {
        for (insertionIndex; insertionIndex <= list.size; insertionIndex++) {
          if (canPush(segmentWithData, newList.slice(0, insertionIndex))) {
            newList = newList.insert(insertionIndex, segmentWithData);
            break;
          }
        }
      }
      return this.processList(validateNodesAfter(insertionIndex, newList));
    }
  }, {
    key: 'deactivate',
    value: function deactivate(segmentId) {
      var removalIndex = this.list.findLastIndex(function (node) {
        return node.id === segmentId;
      });
      var list = this.list;
      if (removalIndex !== -1) {
        list = this.list.delete(removalIndex);
      }
      return this.processList(list);
    }
  }, {
    key: 'subscribe',
    value: function subscribe(subscription) {
      assertValidSubscription(subscription);
      var subs = this.subscribers;
      util.keys(subscription).forEach(function (k) {
        var activators = subscription[k].activated || [];
        var deactivators = subscription[k].deactivated || [];
        subs[k].activated = subs[k].activated.concat(activators);
        subs[k].deactivated = subs[k].deactivated.concat(deactivators);
      });
    }
  }, {
    key: 'unsubscribe',
    value: function unsubscribe(subscription) {
      assertValidSubscription(subscription);
      var subs = this.subscribers;
      util.keys(subscription).forEach(function (k) {
        var activatorsToRm = subscription[k].activated || [];
        var deactivatorsToRm = subscription[k].deactivated || [];
        util.pull(activatorsToRm, subs[k].activated);
        util.pull(deactivatorsToRm, subs[k].deactivated);
      });
    }
  }, {
    key: 'getData',
    value: function getData() {
      return chainData(this.list);
    }
  }], [{
    key: 'rules',
    get: function get() {
      return util.assign({
        present: present,
        childOf: childOf
      }, logic);
    }
  }, {
    key: 'Regex',
    get: function get() {
      return {
        DIGITS: DIGIT_REGEX
      };
    }
  }]);

  return Marbles;
}();