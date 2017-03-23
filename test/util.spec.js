/* eslint-env mocha */
import { assert } from 'chai';
import sinon from 'sinon';
import * as util from '../src/util.js';
describe('util', () => {
  describe('noop()', () => {
    it('should do nothing', () => {
      const mutableObj = { foo: 'bar' };
      const mutableArr = [1, 2, 3];
      assert.isUndefined(util.noop());
      assert.isUndefined(util.noop(325));
      assert.isUndefined(util.noop('12asdf34'));
      assert.isUndefined(util.noop(mutableObj));
      assert.deepEqual(mutableObj, { foo: 'bar' });
      assert.isUndefined(util.noop(mutableArr));
      assert.deepEqual(mutableArr, [1, 2, 3]);
    });
  });
  describe('isString()', () => {
    it('should ensure the given value is a string', () => {
      assert.ok(util.isString('asdf'));
      assert.notOk(util.isString({}));
      assert.notOk(util.isString(32512));
      assert.notOk(util.isString([]));
      assert.notOk(util.isString(null));
      assert.notOk(util.isString());
    });
  });
  describe('isFunction()', () => {
    it('should check if the given value is a function', () => {
      assert.ok(util.isFunction(() => { }));
      assert.notOk(util.isFunction({}));
      assert.notOk(util.isFunction(32512));
      assert.notOk(util.isFunction([]));
      assert.notOk(util.isFunction(null));
      assert.notOk(util.isFunction());
      assert.notOk(util.isFunction('string'));
    });
  });
  describe('isObject()', () => {
    it('should check if the given value is an object', () => {
      assert.ok(util.isObject(Object.create(null)));
      assert.ok(util.isObject({}));
      assert.notOk(util.isObject('string'));
      assert.notOk(util.isObject(32512));
      assert.notOk(util.isObject([]));
      assert.notOk(util.isObject(null));
      assert.notOk(util.isObject());
    });
  });
  describe('isArray()', () => {
    it('should check if the given value is an array', () => {
      assert.ok(util.isArray([]));
      assert.ok(util.isArray([32, 532, 193, 33]));
      assert.notOk(util.isArray());
      assert.notOk(util.isArray(null));
      assert.notOk(util.isArray({}));
      assert.notOk(util.isArray(32));
      assert.notOk(util.isArray('string'));
    });
  });
  describe('emptyObject()', () => {
    it('should create an empty object with no prototype', () => {
      const obj = util.emptyObject();
      assert.isNull(Object.getPrototypeOf(obj));
    });
  });
  describe('keys()', () => {
    it('should get the own enumerable keys of an object', () => {
      const keyList = util.keys({
        one: 1,
        two: 2,
        three: 3
      });
      assert.deepEqual(keyList, ['one', 'two', 'three']);
    });
  });
  describe('cloneDeep()', () => {
    it('should clone a non-circular object, excluding its prototype', () => {
      const objToClone = {
        one: 1,
        two: 2,
        three: 3
      };
      const cloned = util.cloneDeep(objToClone);
      assert.propertyVal(cloned, 'one', 1);
      assert.propertyVal(cloned, 'two', 2);
      assert.propertyVal(cloned, 'three', 3);
    });
    it('should deep clone a non-circular object', () => {
      const objToClone = {
        nested: {
          wololo: {
            ageOfEmpires: true
          }
        }
      };
      const cloned = util.cloneDeep(objToClone);
      assert.property(cloned, 'nested');
      assert.deepProperty(cloned, 'nested.wololo');
      assert.deepPropertyVal(cloned, 'nested.wololo.ageOfEmpires', true);
    });
    it('should error on a circular object', () => {
      const objToClone = {};
      objToClone.circular = objToClone;
      assert.throws(util.cloneDeep.bind(null, objToClone), TypeError);
    });
  });
  describe('assign()', () => {
    it('should assign object properties', () => {
      const obj = {
        key: 'val'
      };
      const anotherObj = {
        anotherKey: 'anotherVal'
      };
      const assigned = util.assign(obj, anotherObj);
      assert.propertyVal(assigned, 'key', 'val');
      assert.propertyVal(assigned, 'anotherKey', 'anotherVal');
    });
    it('should overwrite existing object properties', () => {
      const obj = {
        key: 'val'
      };
      const anotherObj = {
        key: 'newVal'
      };
      const assigned = util.assign(obj, anotherObj);
      assert.propertyVal(assigned, 'key', 'newVal');
    });
  });
  describe('arrayHead()', () => {
    it('should get the first element of an array', () => {
      assert.equal(util.arrayHead(['f1rstp0st']), 'f1rstp0st');
    });
    it('should return undefined for empty arrays', () => {
      assert.isUndefined(util.arrayHead([]));
    });
    it('should return undefined for non-arrays', () => {
      assert.isUndefined(util.arrayHead());
      assert.isUndefined(util.arrayHead({}));
      assert.isUndefined(util.arrayHead('string'));
      assert.isUndefined(util.arrayHead(31123));
    });
  });
  describe('pull()', () => {
    it('should remove matching elements from an array, mutating the array', () => {
      const array = ['foo', 'bar', 'baz', 'foo'];
      const ret = util.pull(['foo', 'bar'], array);
      assert.deepEqual(ret, ['foo', 'bar']);
      assert.deepEqual(array, ['baz']);
    });
    it('should not remove unmatching elements', () => {
      const array = ['foo', 'bar', 'baz'];
      const ret = util.pull(['la', 'lala'], array);
      assert.deepEqual(ret, []);
    });
  });
  describe('without()', () => {
    it('should return a new array without the matching elements', () => {
      const array = ['foo', 'bar', 'baz', 'foo', 'foo'];
      const ret = util.without(['foo', 'bar'], array);
      assert.deepEqual(ret, ['baz']);
      assert.deepEqual(array, ['foo', 'bar', 'baz', 'foo', 'foo']);
    });
  });
  describe('isList()', () => {
    it('should determine if something is a linked list', () => {
      assert.notOk(util.isList({}));
      assert.notOk(util.isList([]));
      assert.notOk(util.isList());
      assert.notOk(util.isList(325));
      assert.notOk(util.isList('string'));
      assert.ok(util.isList(null));
      assert.ok(util.isList({
        next: {
          next: null
        }
      }));
      assert.ok(util.isList({
        next: null
      }));
    });
  });
  describe('listHas()', () => {
    it('should determine if a linked list has the item specified', () => {
      const emptyList = null;
      const fullList = {
        id: 'one',
        data: {
          x: 1,
          y: 2
        },
        next: {
          id: 'two',
          data: {
            x: 5,
            y: 2
          },
          next: {
            id: 'three',
            data: {
              x: 8,
              y: 3
            },
            next: null
          }
        }
      };
      assert.isFalse(util.listHas({ data: { x: 1, y: 2 } }, emptyList));
      assert.isTrue(util.listHas({ data: { x: 1, y: 2 } }, fullList));
      assert.isTrue(util.listHas({ id: 'three' }, fullList));
    });
  });
  describe('listForEach()', () => {
    it('should call a function for every item in a linked list', () => {
      const iterator = sinon.spy();
      const list = {
        data: 1,
        next: {
          data: 2,
          next: {
            data: 3,
            next: null
          }
        }
      };
      util.listForEach(iterator, list);
      assert.ok(iterator.calledThrice);
    });
    it('should pass the node and index to the callback', () => {
      const iterator = sinon.spy();
      const list = {
        data: 1,
        next: {
          data: 2,
          next: {
            data: 3,
            next: null
          }
        }
      };
      util.listForEach(iterator, list);
      const args = iterator.args[0];
      assert.isObject(args[0]);
      assert.property(args[0], 'data');
      assert.property(args[0], 'next');
      assert.propertyVal(args[0], 'data', 1);
      assert.isObject(args[0].next);
      assert.isNumber(args[1]);
      assert.equal(args[1], 0);
    });
    it('should throw an error for non-lists', () => {
      assert.throws(util.listForEach.bind(null, () => { }, []), TypeError);
      assert.throws(util.listForEach.bind(null, () => { }, {}), TypeError);
      assert.throws(util.listForEach.bind(null, () => { }), TypeError);
      assert.throws(util.listForEach.bind(null, () => { }, 37), TypeError);
      assert.throws(util.listForEach.bind(null, () => { }, 'string'), TypeError);
    });
  });
  describe('listMap()', () => {
    it('should call the iterator for every element in the list', () => {
      const spy = sinon.spy((node) => node);
      const list = {
        data: 1,
        next: {
          data: 2,
          next: null
        }
      };
      util.listMap(spy, list);
      assert.ok(spy.calledTwice);
    });
    it('should pass the current node and index to the iterator', () => {
      const spy = sinon.spy((node) => node);
      const list = {
        data: 1,
        next: null
      };
      util.listMap(spy, list);
      const args = spy.args[0];
      assert.equal(args[0], list);
      assert.equal(args[1], 0);
    });
    it('should return an empty list for empty lists', () => {
      assert.isNull(util.listMap((node) => node, null));
    });
    it('should map the list over a function, returning a new list', () => {
      const list = {
        data: 1,
        next: {
          data: 2,
          next: null
        }
      };
      const newList = util.listMap((node) =>
        util.assign({}, node, {
          data: node.data + 1
        }), list);
      assert.notEqual(newList, list);
      assert.deepEqual(newList, {
        data: 2,
        next: {
          data: 3,
          next: null
        }
      });
    });
    it('should throw an error for non-lists', () => {
      assert.throws(util.listMap.bind(null, () => { }, []), TypeError);
      assert.throws(util.listMap.bind(null, () => { }, {}), TypeError);
      assert.throws(util.listMap.bind(null, () => { }), TypeError);
      assert.throws(util.listMap.bind(null, () => { }, 37), TypeError);
      assert.throws(util.listMap.bind(null, () => { }, 'string'), TypeError);
    });
  });

  describe('listReduce()', () => {
    it('should pass the accumulator, the current node, and the index to the reducer', () => {
      const spy = sinon.spy((a) => a);
      util.listReduce(spy, [], {
        next: null
      });
      const args = spy.args[0];
      assert.isArray(args[0]);
      assert.deepEqual(args[0], []);
      assert.isObject(args[1]);
      assert.deepEqual(args[1], {
        next: null
      });
      assert.isNumber(args[2]);
      assert.equal(args[2], 0);
    });
    it('should throw a TypeError for non-lists', () => {
      assert.throws(util.listReduce.bind(null, () => { }, null, []), TypeError);
      assert.throws(util.listReduce.bind(null, () => { }, null, {}), TypeError);
      assert.throws(util.listReduce.bind(null, () => { }, null), TypeError);
      assert.throws(util.listReduce.bind(null, () => { }, null, 37), TypeError);
      assert.throws(util.listReduce.bind(null, () => { }, null, 'string'), TypeError);
    });
    it('should return the accumulator for empty lists', () => {
      assert.equal(util.listReduce((a) => a, 5, null), 5);
    });
    it('should fold lists into new values', () => {
      const list = {
        data: 'foo',
        next: {
          data: 'bar',
          next: null
        }
      };
      const result = util.listReduce((a, node) => a.concat(node), [], list);
      assert.isArray(result);
      assert.lengthOf(result, 2);
      assert.deepEqual(result, [list, { data: 'bar', next: null }]);
    });
  });
  describe('batchAsyncActions()', () => {
    it('should throw an error if the first parameter is not an array', () => {
      assert.throws(util.batchAsyncActions.bind(null, null), TypeError);
      assert.throws(util.batchAsyncActions.bind(null, {}), TypeError);
      assert.throws(util.batchAsyncActions.bind(null, 55), TypeError);
      assert.throws(util.batchAsyncActions.bind(null, 'string'), TypeError);
      assert.throws(util.batchAsyncActions.bind(null), TypeError);
    });
    it('should combine the results of async actions into an array', (done) => {
      const asyncRandom = function asyncRandom(callback) {
        setTimeout(() => {
          callback(Math.random());
        }, 0);
      };
      const actions = [
        asyncRandom,
        asyncRandom,
        asyncRandom
      ];
      util.batchAsyncActions(actions, (batched) => {
        assert.isArray(batched);
        assert.lengthOf(batched, 3);
        assert.isNumber(batched[0]);
        assert.isNumber(batched[1]);
        assert.isNumber(batched[2]);
        done();
      });
    });
  });
});
