/* eslint-env mocha */
import { assert } from 'chai';
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
