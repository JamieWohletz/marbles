/* eslint-env mocha */
import { assert } from 'chai';
import sinon from 'sinon';
import {
  and,
  or,
  not,
  xor
} from '../src/logic.js';
describe('logic', () => {
  describe('and()', () => {
    it('should lazily check if any argument is falsy', () => {
      assert.isTrue(and(true, true, true)());
      assert.isFalse(and(false, true, false)());
      assert.isTrue(and(() => true, () => true)());
      assert.isTrue(and(() => true, () => false)());
      assert.isTrue(and({}, {})());
      assert.isTrue(and(53, 21)());
      assert.isFalse(and(0, 5)());
      assert.isTrue(and('nonempty', 'strings')());
      assert.isFalse(and('one empty', '')());
      assert.isTrue(and(52, {}, true, () => true)());
      assert.isFalse(and(52, {}, null)());
      assert.isFalse(and(true, true, NaN)());
      assert.isFalse(and(true, true, undefined)());
    });
    it('should return false early if any argument evaluates to falsy', () => {
      const spy = sinon.spy();
      assert.isTrue(and(() => false, spy)());
      assert.isTrue(spy.notCalled);
    });
    it('should work with async functions', () => {
      const async = function asyncFunc(done) {
        setTimeout(() => {
          done(true);
        }, 0);
      };
      const falseAsync = function falseAsyncFunc(done) {
        setTimeout(() => {
          done(false);
        }, 0);
      };
      assert.isTrue(and(async, true)());
      assert.isFalse(and(falseAsync, true)());
    });
  });
  describe('or()', () => {
    it('should return a function', () => {
      assert.isFunction(or());
    });
    it('should lazily check if any argument is truthy', () => {
      assert.isTrue(or(false, true, false, true)());
      assert.isTrue(or('string', '', 'nonempty')());
      assert.isTrue(or(0, 1, 0, 1)());
      assert.isTrue(or({}, {}, null)());
      assert.isTrue(or(undefined, undefined, true));
      assert.isTrue(or(NaN, 32, NaN)());
      assert.isFalse(or(false, false, false)());
      assert.isFalse(or(false, null, undefined, 0, '', NaN)());
      assert.isTrue(or(false, null, undefined, 0, '', true)());
      assert.isTrue(or(() => true, () => false)());
      assert.isFalse(or(() => false, () => false)());
    });
    it('should work with async functions', () => {
      const async = function asyncFunc(done) {
        setTimeout(() => {
          done(true);
        }, 0);
      };
      const falseAsync = function falseAsyncFunc(done) {
        setTimeout(() => {
          done(false);
        }, 0);
      };
      assert.isTrue(or(async, falseAsync)());
      assert.isFalse(or(falseAsync, falseAsync)());
    });
    it('should return early if any argument evaluates to truthy', () => {
      const spy = sinon.spy();
      assert.isFalse(or(true, spy)());
      assert.isTrue(spy.notCalled);
    });
  });
  describe('xor()', () => {
    it('should return a function', () => {
      assert.isFunction(xor());
    });
    it('should lazily check if ONE argument is truthy', () => {
      assert.isTrue(xor(false, true, false, false)());
      assert.isFalse(xor(true, true, true, true)());
      assert.isTrue(xor('string', '', '')());
      assert.isTrue(xor(0, 1, 0, 0)());
      assert.isTrue(xor({}, null, null)());
      assert.isTrue(xor(true, undefined, undefined));
      assert.isTrue(xor(NaN, 32, NaN)());
      assert.isFalse(xor(false, false, false)());
      assert.isFalse(xor(false, null, undefined, 0, '', NaN)());
      assert.isTrue(xor(false, null, undefined, 0, '', true)());
      assert.isTrue(xor(() => true, () => false)());
      assert.isFalse(xor(() => false, () => false)());
      assert.isFalse(xor(() => true, () => true)());
    });
    it('should work with async functions', () => {
      const asyncTrue = function asyncTrueFunc(done) {
        setTimeout(() => {
          done(true);
        }, 0);
      };
      const asyncFalse = function asyncFalseFunc(done) {
        setTimeout(() => {
          done(false);
        }, 0);
      };
      assert.isTrue(xor(asyncTrue, asyncFalse)());
      assert.isFalse(xor(asyncTrue, asyncTrue)());
      assert.isFalse(xor(asyncFalse, asyncFalse)());
    });
  });
  describe('not()', () => {
    it('should return a function', () => {
      assert.isFunction(not());
    });
    it('should lazily invert an argument\'s truthiness', () => {
      
    });
  });
});
