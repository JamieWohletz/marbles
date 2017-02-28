/* eslint-env mocha */
import { assert } from 'chai';
import { emptyObject, keys, cloneDeep, assign, arrayHead, pull, without } from '../src/util.js';
describe('util', () => {
  describe('emptyObject()', () => {
    it('should create an empty object with no prototype', () => {
      const obj = emptyObject();
      assert.isNull(Object.getPrototypeOf(obj));
    });
  });
  describe('keys()', () => {
    it('should get the own enumerable keys of an object', () => {
      const keyList = keys({
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
      const cloned = cloneDeep(objToClone);
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
      const cloned = cloneDeep(objToClone);
      assert.property(cloned, 'nested');
      assert.deepProperty(cloned, 'nested.wololo');
      assert.deepPropertyVal(cloned, 'nested.wololo.ageOfEmpires', true);
    });
    it('should error on a circular object', () => {
      const objToClone = {};
      objToClone.circular = objToClone;
      assert.throws(cloneDeep.bind(null, objToClone), TypeError);
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
      const assigned = assign(obj, anotherObj);
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
      const assigned = assign(obj, anotherObj);
      assert.propertyVal(assigned, 'key', 'newVal');
    });
  });
  describe('arrayHead()', () => {
    it('should get the first element of an array', () => {
      assert.equal(arrayHead(['f1rstp0st']), 'f1rstp0st');
    });
    it('should return undefined for empty arrays', () => {
      assert.isUndefined(arrayHead([]));
    });
    it('should return undefined for non-arrays', () => {
      assert.isUndefined(arrayHead());
      assert.isUndefined(arrayHead({}));
      assert.isUndefined(arrayHead('string'));
      assert.isUndefined(arrayHead(31123));
    });
  });
  describe('pull()', () => {
    it('should remove matching elements from an array, mutating the array', () => {
      const array = ['foo', 'bar', 'baz', 'foo'];
      const ret = pull(['foo', 'bar'], array);
      assert.deepEqual(ret, ['foo', 'bar']);
      assert.deepEqual(array, ['baz']);
    });
    it('should not remove unmatching elements', () => {
      const array = ['foo', 'bar', 'baz'];
      const ret = pull(['la', 'lala'], array);
      assert.deepEqual(ret, []);
    });
  });
  describe('without()', () => {
    it('should return a new array without the matching elements', () => {
      const array = ['foo', 'bar', 'baz', 'foo', 'foo'];
      const ret = without(['foo', 'bar'], array);
      assert.deepEqual(ret, ['baz']);
      assert.deepEqual(array, ['foo', 'bar', 'baz', 'foo', 'foo']);
    });
  });
});
