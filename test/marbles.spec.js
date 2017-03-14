/* eslint-env mocha */
import Marbles from '../src/marbles';
import { assert } from 'chai';
import mockBrowser from 'mock-browser';
import sinon from 'sinon';
const routes = {
  'root': {
    active: true,
    children: ['home', 'user', 'search'],
    data: {},
    dependency: '',
    segment: ''
  },
  'home': {
    active: false,
    children: [],
    data: {},
    dependency: 'root',
    segment: 'home'
  },
  'user': {
    active: false,
    children: ['user-profile'],
    data: {
      userId: null
    },
    dependency: 'root',
    segment: 'users/:userId'
  },
  'search': {
    active: false,
    children: [],
    data: {},
    dependency: 'root',
    segment: 'search'
  },
  'user-profile': {
    active: false,
    children: ['user-optional-details'],
    data: {},
    dependency: 'user',
    segment: 'profile'
  },
  'user-optional-details': {
    active: false,
    children: ['user-edit'],
    data: {},
    dependency: 'user-profile',
    segment: 'details'
  },
  'user-edit': {
    active: false,
    children: ['user-edit-product'],
    data: {},
    dependency: 'user-profile',
    segment: 'edit'
  },
  'user-edit-product': {
    active: false,
    children: [],
    data: {
      productId: null
    },
    dependency: 'user-edit',
    segment: 'products/:productId'
  }
};
let marbles;
let win;

beforeEach(() => {
  win = mockBrowser.mocks.MockBrowser.createWindow();
  marbles = new Marbles(routes, win);
});

describe('Marbles', () => {
  describe('start()', () => {
    it('should listen for hashchange events', (done) => {
      marbles.subscribe({
        home: {
          inserted: () => done()
        }
      });
      win.location.hash = '';
      marbles.start();
      win.location.hash = 'home';
    });
  });
  describe('stop()', () => {
    it('should stop listening for hashchange events', () => {
      const shouldNotBeCalled = sinon.spy();
      win.location.hash = '';
      marbles.subscribe('home', shouldNotBeCalled);
      marbles.start();
      marbles.stop();
      win.location.hash = 'home';
      assert.notOk(shouldNotBeCalled.called, 'Subscriber wasn\'t notified');
    });
  });
  describe('subscribe()', () => {
    it('should only accept an object as a parameter', () => {
      assert.isNotOk(marbles.subscribe('asdf'));
      assert.isNotOk(marbles.subscribe(32));
      assert.isNotOk(marbles.subscribe(null));
      assert.isNotOk(marbles.subscribe());
      assert.isNotOk(marbles.subscribe(() => { }));
    });
    it('should not create subscriptions for unknown routes', () => {
      const shouldBeFalse = marbles.subscribe({
        whatnot: {
          inserted: function noop() { }
        }
      });
      assert.isNotOk(shouldBeFalse);
    });
    it('should create subscriptions for known routes', () => {
      const func = function empty() { };
      const shouldBeTrue = marbles.subscribe({
        home: {
          inserted: func,
          removed: func
        }
      });
      assert.isOk(shouldBeTrue);
    });
    describe('notifying subscribers', () => {
      it('should notify on insertion', (done) => {
        marbles.subscribe({
          home: {
            inserted: () => done()
          }
        });
        marbles.insert('home');
        marbles.step();
      });
      it('should notify inserted listeners on changed data', () => {
        const passedNewData = sinon.spy();
        const notCalled = sinon.spy();
        marbles.insert('user', {
          userId: 1
        });
        marbles.step();
        marbles.subscribe({
          user: {
            inserted: passedNewData,
            removed: notCalled
          }
        });
        marbles.insert('user', {
          userId: 2
        });
        marbles.step();
        assert.ok(passedNewData.calledOnce);
        assert.deepEqual(passedNewData.args[0][0], { userId: '2' });
        assert.ok(notCalled.notCalled);
      });
      it('should notify subscribers for inserted node and its children', () => {
        const spy = sinon.spy();
        win.location.hash = 'users/1/profile/details';
        marbles.step();
        marbles.subscribe({
          'user': {
            inserted: spy
          },
          'user-profile': {
            inserted: spy
          },
          'user-optional-details': {
            inserted: spy
          }
        });
        marbles.insert('user', {
          userId: 2
        });
        marbles.step();
        assert.ok(spy.calledThrice);
      });
      it('should NOT notify subscribers for parents of inserted node', () => {
        const shouldNotBeCalled = sinon.spy();
        const shouldBeCalled = sinon.spy();
        win.location.hash = 'users/1/profile/edit';
        marbles.step();
        marbles.subscribe({
          'user': {
            inserted: shouldNotBeCalled
          },
          'user-profile': {
            inserted: shouldNotBeCalled
          },
          'user-optional-details': {
            inserted: shouldBeCalled
          },
          'user-edit': {
            inserted: shouldBeCalled
          }
        });
        marbles.insert('user-optional-details');
        marbles.step();
        assert.ok(shouldBeCalled.calledTwice);
        assert.ok(shouldNotBeCalled.notCalled);
      });
      it('should notify on removal', (done) => {
        marbles.subscribe({
          home: {
            removed: () => {
              done();
            }
          }
        });
        marbles.insert('home');
        marbles.step();
        marbles.remove('home');
        marbles.step();
      });
      it('should notify listeners for removed node and its dependents', () => {
        const spy = sinon.spy();
        win.location.hash = 'users/1/profile/details';
        marbles.step();
        marbles.subscribe({
          'user': {
            removed: spy
          },
          'user-profile': {
            removed: spy
          },
          'user-optional-details': {
            removed: spy
          }
        });
        marbles.remove('user');
        marbles.step();
        assert.ok(spy.calledThrice);
      });
      it('should notify on both insertion and removal', () => {
        const shouldBeCalled = sinon.spy();
        marbles.subscribe({
          home: {
            inserted: shouldBeCalled,
            removed: shouldBeCalled
          }
        });
        marbles.insert('home');
        marbles.step();
        assert.ok(shouldBeCalled.called, 'Should be called on insertion');
        marbles.remove('home');
        marbles.step();
        assert.equal(shouldBeCalled.callCount, 2, 'Should be called on removal');
        marbles.step();
      });
    });
  });
  describe('unsubscribe()', () => {
    it('should remove subscriptions', () => {
      const shouldNotBeCalled = sinon.spy();
      win.location.hash = 'users/1/profile';
      marbles.subscribe({
        user: {
          inserted: shouldNotBeCalled
        }
      });
      marbles.subscribe({
        profile: {
          inserted: shouldNotBeCalled
        }
      });
      marbles.unsubscribe('user', 'inserted', shouldNotBeCalled);
      marbles.unsubscribe('profile', 'inserted', shouldNotBeCalled);
      marbles.step();
      assert.notOk(shouldNotBeCalled.called, 'Should not be called');
    });
  });
  describe('step()', () => {
    it('should do nothing for the root hash', () => {
      const hash = win.location.hash;
      marbles.step();
      assert.equal(win.location.hash, hash);
    });
    it('should remove unknown routes', () => {
      const unknown = 'harpadarp';
      win.location.hash = unknown;
      marbles.step();
      assert.notInclude(win.location.hash, unknown);
      win.location.hash = `${unknown}/${unknown}/${unknown}`;
      marbles.step();
      assert.notInclude(win.location.hash, unknown);
    });
    it('should add a trailing slash to known routes', () => {
      win.location.hash = 'home';
      marbles.step();
      assert.ok(win.location.hash.indexOf('home/' !== -1));
    });
    it('should notify subscribers for active routes', () => {
      const shouldBeCalled = sinon.spy();
      const shouldNotBeCalled = sinon.spy();
      marbles.subscribe({
        home: {
          inserted: shouldBeCalled
        }
      });
      marbles.subscribe({
        'user-profile': {
          inserted: shouldNotBeCalled
        }
      });
      win.location.hash = 'home';
      marbles.step();
      assert.ok(shouldBeCalled.called, 'Subscriber for active route called');
      assert.notOk(shouldNotBeCalled.called, 'Subscriber for inactive route not called');
    });
  });
  describe('remove()', () => {
    it('returns null for bad arguments', () => {
      assert.isNull(marbles.remove(null));
      assert.isNull(marbles.remove({}));
      assert.isNull(marbles.remove('missing-route'));
      assert.isNull(marbles.remove(4615162132));
      assert.isNull(marbles.remove(undefined));
      assert.isNull(marbles.remove());
    });
    it('returns this when arguments are valid', () => {
      assert.strictEqual(marbles.remove('home'), marbles);
    });
    it('removes existing segments', () => {
      win.location.hash = 'home';
      marbles.remove('home');
      assert.notInclude(win.location.hash, 'home');
    });
    it('does nothing when the segment is not present in the route', () => {
      win.location.hash = 'home';
      marbles.remove('user-profile');
      assert.include(win.location.hash, 'home');
    });
    it('removes segments and their dependents', () => {
      const route = 'users/1/profile/details';
      win.location.hash = route;
      marbles.remove('user');
      assert.notInclude(win.location.hash, route);
    });
    it('removes optional views, leaving the rest of the route alone', () => {
      win.location.hash = 'users/1/profile/details/edit';
      marbles.remove('user-optional-details');
      assert.include(win.location.hash, 'users/1/profile/edit');
    });
  });
  describe('insert()', () => {
    it('gracefully handles non-object data values', () => {
      assert.doesNotThrow(
        marbles.insert.bind(marbles, 'user-profile'),
        'Does not throw when no data passed'
      );
      assert.doesNotThrow(
        marbles.insert.bind(marbles, 'user-profile', 5),
        'Does not throw when a number is passed'
      );
      assert.doesNotThrow(
        marbles.insert.bind(marbles, 'user-profile', 'string'),
        'Does not throw when a string is passed'
      );
      assert.doesNotThrow(
        marbles.insert.bind(marbles, 'user-profile', 'string'),
        'Does not throw when a string is passed'
      );
    });
    it('updates the hash if the route\'s dependencies are met', () => {
      win.location.hash = 'users/1';
      marbles.insert('user-profile', {});
      assert.include(win.location.hash, 'users/1/profile');
      marbles.insert('user-edit', {});
      assert.include(win.location.hash, 'users/1/profile/edit');
    });
    it('supports optional views', () => {
      win.location.hash = 'users/1/profile';
      marbles.insert('user-edit', {});
      assert.include(win.location.hash, 'users/1/profile/edit');
      marbles.insert('user-optional-details', {});
      assert.include(win.location.hash, 'users/1/profile/details/edit');
    });
    it('ignores sequential duplicate calls', (done) => {
      marbles.subscribe({
        home: {
          inserted: () => {
            done();
          }
        }
      });
      marbles.start();
      win.location.hash = '';
      marbles.insert('home', {});
      const hashAfterOneCall = win.location.hash;
      assert.include(win.location.hash, 'home');
      marbles.insert('home', {});
      assert.equal(win.location.hash, hashAfterOneCall);
    });
    it('ignores sequential duplicate calls with data', (done) => {
      marbles.subscribe({
        user: {
          inserted: () => {
            done();
          }
        }
      });
      marbles.start();
      marbles.insert('user', {
        userId: 1
      });
      marbles.insert('user', {
        userId: '1'
      });
    });
    it('ignores routes whose dependencies are unmet', () => {
      const originalHash = win.location.hash;
      marbles.insert('user-profile', {});
      assert.equal(win.location.hash, originalHash);
      marbles.insert('user-edit', {});
      assert.equal(win.location.hash, originalHash);
    });
    it('notifies all subscribers for active routes when a route is inserted', () => {
      const shouldNotBeCalled = sinon.spy();
      const shouldBeCalled = sinon.spy();
      marbles.subscribe({
        user: {
          inserted: shouldNotBeCalled
        },
        home: {
          inserted: shouldBeCalled
        }
      });
      marbles.insert('home');
      marbles.step();
      assert.ok(
        shouldBeCalled.called,
        'Subscribers notified for active route'
      );
      assert.notOk(shouldNotBeCalled.called, 'Subscriber not notified for inactive route');
    });
    // test for failing silently for invalid data?
    it('passes data to subscribers', (done) => {
      marbles.subscribe({
        user: {
          inserted: (data) => {
            assert.isObject(data);
            assert.equal(data.userId, 1);
            done();
          }
        }
      });
      marbles.insert('user', { userId: 1 });
      marbles.step();
    });
  });
  describe('getData()', () => {
    it('should give an empty object when no dynamic segments are present', () => {
      marbles.insert('home');
      assert.deepEqual(marbles.getData(), {});
    });
    it('should return an object with all dynamic segment data', () => {
      marbles.insert('user', { userId: 1 });
      marbles.insert('user-profile');
      marbles.insert('user-edit');
      marbles.insert('user-edit-product', { productId: 3 });
      assert.deepEqual(marbles.getData(), {
        productId: '3',
        userId: '1'
      });
    });
  });
});
