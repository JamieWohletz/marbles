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
    it('should be composable', (done) => {
      const f = not(not(not(false)));
      f(result => {
        assert.isTrue(result);
        done();
      });
    });
    describe('partial application', () => {
      it('should return a function', () => {
        assert.isFunction(not());
      });
      it('should return a function which accepts a callback as its first arg', () => {
        const spy = sinon.spy();
        const f = not(true);
        assert.isFunction(f);
        f(spy);
        assert.isTrue(spy.calledOnce);
        assert.isTrue(spy.calledWith(false));
      });
      it('should return a function which accepts optional extra args', (done) => {
        const f = not((cb, ...args) => {
          assert.deepEqual(args, [1, 2, 3]);
          cb(true);
        });
        assert.isFunction(f);
        f(() => done(), 1, 2, 3);
      });
    });
    describe('evaluation', () => {
      it('should asynchronously invert a single argument', (done) => {
        const f = not(true);
        f(b => {
          assert.isFalse(b);
          done();
        });
      });
      it('should work with async function args', (done) => {
        const f = not(cb => {
          setTimeout(() => {
            cb(true);
          }, 0);
        });
        f(b => {
          assert.isFalse(b);
          done();
        });
      });
    });
  });
  describe('or()', () => {
    it('should be composable', (done) => {
      const f = or(or(true, or(false, false)), false);
      f(result => {
        assert.isTrue(result);
        done();
      });
    });
    describe('partial application', () => {
      it('should return a function', () => {
        assert.isFunction(or());
      });
      it('should return a function which accepts a callback as its first arg', () => {
        const spy = sinon.spy();
        const f = or(true);
        assert.isFunction(f);
        f(spy);
        assert.isTrue(spy.calledOnce);
        assert.isTrue(spy.calledWith(true));
      });
      it('should return a function which accepts optional extra args', (done) => {
        const f = or((cb, ...args) => {
          assert.deepEqual(args, [1, 2, 3]);
          cb(true);
        });
        assert.isFunction(f);
        f(() => done(), 1, 2, 3);
      });
    });
    describe('evaluation', () => {
      it('should asynchronously check if any argument is truthy', (done) => {
        or(
          (callback) => callback(true),
          false,
          'string',
          true,
          1,
          0,
          null,
          undefined
        )(b => {
          assert.isTrue(b);
          or(false, 0, null, undefined, '', cb => cb(false))(bool => {
            assert.isFalse(bool);
            done();
          });
        });
      });
      it('should check asynchronous functions', (done) => {
        const asyncTrue = function asyncT(callback) {
          setTimeout(() => {
            callback(true);
          }, 0);
        };
        const asyncFalse = function asyncF(callback) {
          setTimeout(() => {
            callback(false);
          }, 0);
        };
        or(asyncTrue, asyncFalse)(bool => {
          assert.isTrue(bool);
          or(asyncFalse)(b => {
            assert.isFalse(b);
            done();
          });
        });
      });
    });
    it('should return early if any argument evaluates to truthy', (done) => {
      const spy = sinon.spy();
      or(true, spy)(bool => {
        assert.isTrue(bool);
        assert.isTrue(spy.notCalled);
        done();
      });
    });
  });
  describe('and()', () => {
    it('should be composable', (done) => {
      const f = and(and(true, true), true, and(true));
      f(b => {
        assert.isTrue(b);
        done();
      });
    });
    describe('partial application', () => {
      it('should return false for no arguments', (done) => {
        and()(b => {
          assert.isFalse(b);
          done();
        });
      });
      it('should return a function which accepts a callback as its firt arg', (done) => {
        const f = and(true, false);
        assert.isFunction(f);
        f(b => {
          assert.isFalse(b);
          done();
        });
      });
      it('should return a function which accepts optional extra args', (done) => {
        const f = and((cb, ...args) => {
          assert.deepEqual(args, [1, 2, 3]);
          cb(true);
        });
        assert.isFunction(f);
        f(() => done(), 1, 2, 3);
      });
    });
    describe('evaluation', () => {
      it('should check if any argument is falsy', (done) => {
        const evaluate = and(true, 1, 'string', null, undefined, 0, {}, []);
        evaluate(b => {
          assert.isFalse(b);
          done();
        });
      });
      it('should check if any async function produces a falsy value', (done) => {
        const evaluate = and(true, (cb) => {
          setTimeout(() => {
            cb(true);
          }, 0);
        });
        evaluate(b => {
          assert.isTrue(b);
          done();
        });
      });
      it('should fail early if any argument is falsy', (done) => {
        const spy = sinon.spy();
        and(true, false, spy)(b => {
          assert.isTrue(spy.notCalled);
          assert.isFalse(b);
          done();
        });
      });
    });
  });
});

