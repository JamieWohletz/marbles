/* eslint-env mocha */
import { assert } from 'chai';
import sinon from 'sinon';
import {
  or,
} from '../src/logic.js';
describe('logic', () => {
  describe('or()', () => {
    describe('partial application', () => {
      it('should return a function', () => {
        assert.isFunction(or());
      });
      it('should return a function which accepts a callback parameter', () => {
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
});

