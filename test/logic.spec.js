/* eslint-env mocha */
import { assert } from 'chai';
import sinon from 'sinon';
import {
  or,
  not,
  and
} from '../src/logic.js';
describe('logic', () => {
  describe('not()', () => {
    it('should be composable', () => {
      const f = not(not(not(false)));
      assert.isTrue(f());
    });
    describe('partial application', () => {
      it('should return a function', () => {
        assert.isFunction(not());
      });
      it('should return a function which accepts optional extra args', () => {
        const f = not((...args) => {
          assert.deepEqual(args, [1, 2, 3]);
          return true;
        });
        assert.isFunction(f);
        assert.isFalse(f(1, 2, 3));
      });
    });
    describe('evaluation', () => {
      it('should invert a single argument', () => {
        const f = not(true);
        assert.isFalse(f());
      });
    });
  });
  describe('or()', () => {
    it('should be composable', () => {
      const f = or(or(true, or(false, false)), false);
      assert.isTrue(f());
    });
    describe('partial application', () => {
      it('should return a function', () => {
        assert.isFunction(or());
      });
      it('should return a function which accepts optional extra args', () => {
        const f = or((...args) => {
          assert.deepEqual(args, [1, 2, 3]);
          return true;
        });
        assert.isFunction(f);
        assert.isTrue(f(1, 2, 3));
      });
    });
    describe('evaluation', () => {
      it('should check if any argument is truthy', () => {
        const f = or(
          () => true,
          false,
          'string',
          true,
          1,
          0,
          null,
          undefined
        );
        assert.isTrue(f());
        assert.isFalse(or(false, 0, null, undefined, '', () => false)());
      });
    });
    it('should return early if any argument evaluates to truthy', () => {
      const spy = sinon.spy();
      const result = or(true, spy)();
      assert.isTrue(result);
      assert.isTrue(spy.notCalled);
    });
  });
  describe('and()', () => {
    it('should be composable', () => {
      const f = and(and(true, true), true, and(true));
      assert.isTrue(f());
    });
    describe('partial application', () => {
      it('should return false for no arguments', () => {
        assert.isFalse(and()());
      });
      it('should return a function which accepts optional extra args', () => {
        const f = and((...args) => {
          assert.deepEqual(args, [1, 2, 3]);
          return true;
        });
        assert.isFunction(f);
        assert.isTrue(f(1, 2, 3));
      });
    });
    describe('evaluation', () => {
      it('should check if any argument is falsy', () => {
        const evaluate = and(true, 1, 'string', null, undefined, 0, {}, []);
        assert.isFalse(evaluate());
      });
      it('should fail early if any argument is falsy', () => {
        const spy = sinon.spy();
        assert.isFalse(and(true, false, spy)());
        assert.isTrue(spy.notCalled);
      });
    });
  });
});

