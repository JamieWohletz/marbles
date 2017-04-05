// /* eslint-env mocha */
import Marbles from '../src/marbles';
import { List } from 'immutable';
import { assert } from 'chai';
import mockBrowser from 'mock-browser';
// import sinon from 'sinon';
let win;

beforeEach(() => {
  win = mockBrowser.mocks.MockBrowser.createWindow();
});

describe('Marbles', () => {
  it('exposes some common regexes', () => {
    assert.deepEqual(Marbles.Regex, {
      DIGITS: /\d+/
    });
  });
  describe('.rules', () => {
    it('is visible as a static property', () => {
      assert.isObject(Marbles.rules);
    });
    it('exposes logic.or, logic.not, logic.and, and present and childOf', () => {
      assert.property(Marbles.rules, 'or');
      assert.property(Marbles.rules, 'not');
      assert.property(Marbles.rules, 'and');
      assert.property(Marbles.rules, 'childOf');
      assert.property(Marbles.rules, 'present');
    });
    describe('present()', () => {
      it('should check if a segment is present in a linked list', () => {
        const list = List([
          {
            id: 'root',
            segment: {}
          },
          {
            id: 'home',
            segment: {}
          }
        ]);
        assert.isTrue(Marbles.rules.present('home')('', list));
        assert.isFalse(Marbles.rules.present('about')('', list));
      });
    });
    describe('childOf()', () => {
      it('should check if a one segment is the direct ancestor of another in a linked list', () => {
        const list = List([
          {
            id: 'root',
            segment: {}
          },
          {
            id: 'home',
            segment: {}
          }
        ]);
        assert.isTrue(Marbles.rules.childOf('root')('home', list));
        const withAbout = list.push({
          id: 'about',
          segment: {}
        });
        assert.isFalse(Marbles.rules.childOf('root')('about', withAbout));
      });
    });
  });
  describe('constructor()', () => {
    it('should accept valid segment configs', () => {
      const valid = [
        {
          id: 'home',
          fragment: 'home',
          rule: () => true
        },
        {
          id: 'about',
          fragment: 'about',
          rule: () => false
        }
      ];
      assert.doesNotThrow(() => new Marbles(valid, {}, win));
    });
    it('should error for invalid segment configs', () => {
      const invalid = {
        'utterly-incorrect': {
          rule: 325
        }
      };
      const dupIds = [
        {
          id: 'home',
          fragment: 'home',
          rule: () => true
        },
        {
          id: 'home',
          fragment: 'about',
          rule: () => false
        }
      ];
      const missingRule = [{
        id: 'home',
        fragment: 'home'
      }];
      assert.throws(() => new Marbles(invalid, {}, win), Error);
      assert.throws(() => new Marbles(dupIds, {}, win), Error);
      assert.throws(() => new Marbles(missingRule, {}, win), Error);
    });
    it('should accept valid options', () => {
      const segments = [];
      assert.doesNotThrow(
        () => new Marbles(segments, { trailingSlash: true, leadingSlash: true }, win)
      );
    });
    it('should error for invalid options', () => {
      const segments = {
        'home': {
          fragment: 'home',
          rule: () => true
        },
        'about-with-a-dash-for-eslint': {
          fragment: 'about',
          rule: () => false
        }
      };
      assert.throws(() => new Marbles(segments, 532, win));
    });
  });
  describe('instance methods', () => {
    describe('processRoute()', () => {
      it('should process a given route based on rules', () => {
        const t = () => true;
        const f = () => false;
        const m = new Marbles([
          {
            id: 'home',
            fragment: 'home',
            rule: t
          },
          {
            id: 'about',
            fragment: 'about',
            rule: t
          },
          {
            id: 'never-visible',
            fragment: 'never-ever-ever',
            rule: f
          }
        ], {}, win);
        assert.equal(m.processRoute('#home/about/never-visible'), '/home/about/');
        assert.equal(m.processRoute('/home/about/'), '/home/about/');
      });
      it('should process rules in order', () => {
        const m = new Marbles([
          {
            id: 'ambiguous-one',
            fragment: '{ambigId}',
            tokens: {
              ambigId: Marbles.Regex.DIGITS
            },
            rule: () => Marbles.rules.childOf('root')
          },
          {
            id: 'ambiguous-two',
            fragment: 'ambiguous/{ambigId}',
            tokens: {
              ambigId: Marbles.Regex.DIGITS
            },
            rule: () => Marbles.rules.childOf('root')
          }
        ], {}, win);
        assert.equal(m.processRoute('ambiguous/3'), '/3/');
      });
      it('should work with complex routes', () => {
        const m = new Marbles([
          {
            id: 'user',
            fragment: 'users/{userId}',
            rule: Marbles.rules.childOf('root'),
            tokens: {
              userId: Marbles.Regex.DIGITS
            }
          },
          {
            id: 'user-messages',
            fragment: 'messages',
            rule: Marbles.rules.childOf('user')
          },
          {
            id: 'user-messages-details',
            fragment: '{messageId}/details',
            rule: Marbles.rules.childOf('user-messages'),
            tokens: {
              messageId: Marbles.Regex.DIGITS
            }
          },
          {
            id: 'user-messages-compose',
            fragment: 'compose',
            rule: Marbles.rules.or(
              Marbles.rules.childOf('user-messages'),
              Marbles.rules.childOf('user-messages-details')
            )
          }
        ], {}, win);
        assert.equal(
          m.processRoute('#users/1/messages/3/details'),
          '/users/1/messages/3/details/'
        );
        assert.equal(
          m.processRoute('users/1/messages/compose'),
          '/users/1/messages/compose/'
        );
        assert.equal(
          m.processRoute('users/1/messages/3/details/compose'),
          '/users/1/messages/3/details/compose/'
        );
      });
      it('should remove invalid segments', () => {
        const m = new Marbles([
          {
            id: 'home',
            fragment: 'home',
            rule: Marbles.rules.childOf('root'),
          }
        ], {}, win);
        assert.equal(m.processRoute('/what/ever/home/for/ever'), '/home/');
      });
      it('should work with dynamic tokens', () => {
        const m = new Marbles([
          {
            id: 'user',
            fragment: 'users/{userId}',
            tokens: {
              userId: Marbles.Regex.DIGITS
            },
            rule: Marbles.rules.childOf('root')
          },
          {
            id: 'profile',
            fragment: 'profile',
            rule: Marbles.rules.childOf('user')
          },
          {
            id: 'nonsense',
            fragment: '{nonsenseId}',
            rule: Marbles.rules.childOf('profile'),
            tokens: {
              nonsenseId: Marbles.Regex.DIGITS
            }
          }
        ], {}, win);
        assert.equal(m.processRoute('#users/1/profile/4'), '/users/1/profile/4/');
      });
      it('should work with multiple dynamic tokens in a single segment', () => {
        const m = new Marbles([
          {
            id: 'car',
            fragment: 'users/{userId}/cars/{carId}',
            tokens: {
              userId: Marbles.Regex.DIGITS,
              carId: Marbles.Regex.DIGITS
            },
            rule: () => true
          }
        ], {}, win);
        assert.equal(m.processRoute('users/1/cars/2'), '/users/1/cars/2/');
      });
      it('should set window.location.hash', () => {
        const t = () => true;
        const f = () => false;
        const m = new Marbles([
          {
            id: 'home',
            fragment: 'home',
            rule: t
          },
          {
            id: 'about',
            fragment: 'about',
            rule: t
          },
          {
            id: 'never-visible',
            fragment: 'never-ever-ever',
            rule: f
          }
        ], {}, win);
        assert.equal(m.processRoute('#home/about/never-visible'), '/home/about/');
        assert.equal(win.location.hash.replace('#', ''), '/home/about/');
      });
      it('should obey options', () => {
        const t = () => true;
        const f = () => false;
        const m = new Marbles([
          {
            id: 'home',
            fragment: 'home',
            rule: t
          },
          {
            id: 'about',
            fragment: 'about',
            rule: t
          },
          {
            id: 'never-visible',
            fragment: 'never-ever-ever',
            rule: f
          }
        ], {
          trailingSlash: false,
          leadingSlash: false
        },
          win
        );
        assert.equal(m.processRoute('#home/about/never-visible'), 'home/about');
        assert.equal(m.processRoute('home/about'), 'home/about');
      });
      it('should notify activation subscribers', (done) => {
        const m = new Marbles([
          {
            id: 'to-activate',
            fragment: 'to-activate',
            rule: () => true
          }
        ], {}, win);
        m.subscribe({
          'to-activate': {
            activated() {
              done();
            }
          }
        });
        m.processRoute('to-activate');
      });
      it('should notify activation subscribers with data', (done) => {
        const m = new Marbles([
          {
            id: 'user',
            fragment: 'users/{userId}',
            rule: () => true,
            tokens: {
              userId: Marbles.Regex.DIGITS
            }
          },
          {
            id: 'profile',
            fragment: 'profile',
            rule: Marbles.rules.childOf('user')
          },
          {
            id: 'post',
            fragment: 'posts/{postId}',
            rule: Marbles.rules.childOf('profile'),
            tokens: {
              postId: Marbles.Regex.DIGITS
            }
          }
        ], {}, win);
        m.subscribe({
          post: {
            activated(data) {
              assert.deepEqual(data, { userId: '1', postId: '2' });
              done();
            }
          }
        });
        assert.equal(m.processRoute('users/1/profile/posts/2'), '/users/1/profile/posts/2/');
      });
      it('should notify activation subscribers on data change', (done) => {
        const m = new Marbles([
          {
            id: 'user',
            fragment: 'users/{userId}',
            rule: () => true,
            tokens: {
              userId: Marbles.Regex.DIGITS
            }
          }
        ], {}, win);
        m.processRoute('users/1');
        m.subscribe({
          user: {
            activated(data) {
              assert.deepEqual(data, { userId: '2' });
              done();
            }
          }
        });
        m.processRoute('users/2');
      });
      it('should notify deactivation subscribers', (done) => {
        const m = new Marbles([
          {
            id: 'to-deactivate',
            fragment: 'garbage',
            rule: () => true
          }
        ], {}, win);
        m.subscribe({
          'to-deactivate': {
            deactivated: () => {
              done();
            }
          }
        });
        m.processRoute('garbage');
        m.deactivate('to-deactivate');
      });
    });
    describe('activate()', () => {
      it('should add a new segment into the route if allowed by its rule', () => {
        const m = new Marbles([
          {
            id: 'about',
            fragment: 'about',
            rule: Marbles.rules.and(Marbles.rules.present('root'), Marbles.rules.childOf('home'))
          },
          {
            id: 'home',
            fragment: 'home',
            rule: () => Marbles.rules.childOf('root')
          }
        ], {}, win);
        m.processRoute('#home');
        assert.equal(m.activate('about', {}), '/home/about/');
      });
      it('should not add a segment into the route if its rule forbids it', () => {
        const m = new Marbles([
          {
            id: 'home',
            fragment: 'home',
            rule: () => false
          }
        ], {}, win);
        m.processRoute('');
        assert.equal(m.activate('home', {}), '');
      });
      it('should use the data provided', () => {
        const m = new Marbles([
          {
            id: 'user',
            fragment: 'users/{userId}',
            rule: () => true,
            tokens: {
              userId: Marbles.Regex.DIGITS
            }
          }
        ], {}, win);
        m.processRoute('');
        assert.equal(m.activate('user', { userId: 1 }), '/users/1/');
      });
    });
  });
  describe('deactivate()', () => {
    it('should remove a segment from the route', () => {
      const m = new Marbles([
        {
          id: 'home',
          fragment: 'home',
          rule: () => true
        }
      ], {}, win);
      m.processRoute('home');
      assert.equal(m.deactivate('home'), '');
    });
    it('should do nothing for segments that are not present', () => {
      const m = new Marbles([], {}, win);
      assert.equal(m.deactivate('home'), '');
    });
  });
  describe('start()', () => {
    it('should listen to window hash change events', (done) => {
      const m = new Marbles([
        {
          id: 'home',
          fragment: 'home',
          rule: Marbles.rules.childOf('root')
        }
      ], {}, win);
      m.subscribe({
        home: {
          activated: () => {
            done();
          }
        }
      });
      m.start();
      win.location.hash = 'home';
    });
    it('should process the current window hash route', (done) => {
      const m = new Marbles([
        {
          id: 'home',
          fragment: 'home',
          rule: Marbles.rules.childOf('root')
        }
      ], {}, win);
      m.subscribe({
        home: {
          activated: () => {
            done();
          }
        }
      });
      win.location.hash = 'home';
      m.start();
    });
  });
  describe('stop()', () => {
    it('should stop listening to window hash change events', () => {
      const m = new Marbles([
        {
          id: 'home',
          fragment: 'home',
          rule: Marbles.rules.childOf('root')
        }
      ], {}, win);
      win.location.hash = 'blah';
      m.start();
      assert.equal(win.location.hash.replace('#', ''), '');
      m.stop();
      win.location.hash = 'blah';
      assert.equal(win.location.hash.replace('#', ''), 'blah');
    });
  });
  describe('getData()', () => {
    it('should return the data currently stored in the route', () => {
      const m = new Marbles([
        {
          id: 'user',
          fragment: 'users/{userId}',
          rule: Marbles.rules.childOf('root'),
          tokens: {
            userId: Marbles.Regex.DIGITS
          }
        },
        {
          id: 'car',
          fragment: 'cars/{carId}',
          rule: Marbles.rules.childOf('user'),
          tokens: {
            carId: Marbles.Regex.DIGITS
          }
        }
      ], {}, win);
      m.processRoute('users/1/cars/3');
      assert.deepEqual(m.getData(), {
        userId: '1',
        carId: '3'
      });
    });
  });
});
