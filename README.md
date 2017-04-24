# marbles

Client-side hierarchical routing library supporting optional views.

[![Travis](https://img.shields.io/travis/JamieWohletz/marbles.svg)](https://travis-ci.org/JamieWohletz/marbles)
[![Codecov](https://img.shields.io/codecov/c/github/JamieWohletz/marbles.svg)](https://codecov.io/gh/JamieWohletz/marbles)
[![npm](https://img.shields.io/npm/v/marbles.svg)](https://npmjs.com/package/marbles)

## Overview

Marbles is a **flexible**, **framework-agnostic**, **client-side**, ***rule-based*** routing library.

Features:
* Event-driven interface
* Optional route segments
* Rule-based segment configuration

If you want to see a (vanilla js) demo, please look in the demo directory of this repository.

## Why Another Routing Library?

Why did I take the time and effort to write yet _another_ routing library? Seriously, there are [so. many.](https://github.com/search?l=JavaScript&q=router&type=Repositories&utf8=%E2%9C%93)

Well, why do people usually reinvent the wheel?

1. To learn
2. Because the wheel doesn't do something they need

While learning was a nice side effect of having done this project, the main reason was that I couldn't find any routers that did what I _needed_. Granted, I didn't read the docs for all 13,771 (as of this writing) other routers, but I read the docs for some of the top ones and couldn't find what I needed.

What did I need?

I needed this:

1. Click "User Profile". Route changes to `/users/1/profile`
2. Click "New Message". Route changes to 
`/users/1/profile/new-message`
3. Click "View Messages". Route changes to `/users/1/profile/new-message/view-messages`
4. Close the "New Message" form. Route changes to `/users/1/profile/view-messages`

See what happened there? The `new-message` fragment came before the `view-messages` fragment, but when you closed the "New Messages" form, only the `new-messages` fragment was removed from the route. Not convinced this is special? Let's continue with this example.

5. Reopen the "New Message" form. Route changes to `/users/1/profile/new-message/view-messages`
6. Collapse the messages list. Route changes to `/users/1/profile/new-message`.

Ah! Both `view-message` and `new-message` are **optional**. Furthermore, and this might not be immediately apparent from the example, they can only appear _if certain conditions are met_ (they'll only be shown if the `users/:id` and `profile` bits are in the route). 

So there it is. You could specify this same sequence of routes with other common routing libraries, for example, in an Express-ish library, it would look something like this:

```
route('/users/:id/profile', () => ...);
route('/users/:id/profile/new-message', () => ...);
route('/users/:id/profile/view-messages', () => ...);
route('/users/:id/profile/new-message/view-message)
```

In such a library, you have to list every possible combination. That's not too bad with this limited example, but imagine if `profile` were optional as well. 

There are more flexible libraries, of course, like the wonderful [UI Router](https://ui-router.github.io/tutorials/). But you'll notice that the tutorials only describe working with frameworks like Angular and React. That's excellent, if you're working with those frameworks, but for the rare few of us who work at places that use [more arcane tools](https://www.sencha.com/products/extjs/), we can't use it without great difficulty.

So there you have it. Why did I make this?

* I needed something _very_ flexible
* I needed something framework agnostic

If you need those things too, maybe Marbles is for you!

## Getting started

Currently, because I've been so busy working on this library, I haven't had the time or motivation to figure out how to publish this project to NPM and Bower and get semantic-release and all the tools working together correctly. Therefore, to install...

### Installation

Download the [minified](https://github.com/JamieWohletz/marbles/blob/master/dist/marbles.min.js) or [regular](https://github.com/JamieWohletz/marbles/blob/master/dist/marbles.js) source and include it in a script tag at the bottom of your HTML `<body>`:

`<script src="./marbles.min.js"></script>`

Then, in your code, create the router and set it up like this:

```
const router = new Marbles([
  // segment definitions -- see below
]);
// Listen for hashchange events and fire event listeners for the current route.
router.start();
```

### Specifying segments

*Segments* are the fundamental building blocks for
routes in Marbles. A segment can be anything from `home` to `users/{userId}` to `company/about/contact-us`. 

In Marbles, routes are constructed out of segments. 
Marbles determines if a segment can be added to the 
route at any given time based on the segment's *rule*. This is the *rule-based* part of Marbles.

Without further ado, a segment configuration example.

#### Example
```
var segments = [
  {
    id: 'home',
    // do not include leading or trailing slashes
    fragment: 'home',
    // 'root' is a special segment added by Marbles.
    // It exists before all other segments in the route.
    rule: Marbles.rules.childOf('root')
  },
  {
    id: 'about',
    fragment: 'about',
    // This has the same rule as 'home'! 
    // Fortunately, Marbles is smart enough to 
    // figure out that only one such segment is allowed. 
    // That's where the array ordering comes in.
    // Given a route /home/about/, Marbles will
    // remove 'about' because it comes AFTER
    // home in this configuration array.
    // However, there is special behavior when
    // activating segments (see below).
    rule: Marbles.rules.childOf('root')
  },
  {
    id: 'blog',
    fragment: 'blog',
    rule: Marbles.rules.childOf('root')
  },
  {
    id: 'founder',
    fragment: 'our-founder',
    // Notice that you can pass any segment ID to
    // Marbles.rules.childOf()
    rule: Marbles.rules.childOf('about')
  },
  {
    id: 'employees',
    fragment: 'employees',
    // Oh! Interesting. Here we say that
    // employees can show up anytime in the route
    // after 'about'. That means it could come
    // after 'founder' or directly after 'about'.
    // Therefore, founder is an optional segment
    // from this segment's point of view.
    rule: Marbles.rules.present('about')
  }
};
```

Notice how segments are configured as an array. This is important. *The array is ordered by segment weight, from lowest to highest*. What that means is that if you have two segments with conflicting rules and Marbles is trying to parse a route with both segments in it, Marbles will choose the segment that appears earlier in the array.

In general, a single segment config object looks like this:

```
{
  id: string,
  fragment: string,
  rule: (segmentId: string, routeList: List): Boolean,
  tokens?: {
    [tokenName]: RegExp
  }
}
```

#### Rules

The most important part of any segment's definition is its _rule_. A rule is simply a function that accepts a couple parameters and returns a boolean. Here's the function signature:

`(segmentId: string, routeList: List) : Boolean`

* `segmentId` is the ID of the segment whose rule is being evaluated. For example, in this configuration, the segmentId would be 'home':
```
{
  id: 'home',
  rule: (segmentId) => true,
  fragment: 'home'
}
```
* `routeList` is an [Immutable List](https://facebook.github.io/immutable-js/docs/#/List) representing a *portion* of the route _that includes the current segment_. Note that this portion may actually be the whole route.

Rule functions should analyze the List provided and return whether it is valid, i.e., whether the current segment can exist on the end of the given List.

It is important to note that rules should never look _ahead_ in the route, only behind.

Marbles comes with some useful built-in rules to make your job easier. These are the following:

* `Marbles.rules.childOf(segmentId: string)` - requires that the current segment be a direct child of the segment identified by `segmentId`
* `Marbles.rules.descendsFrom(segmentId: string)` - requires that the current segment be a _descendent_ of the segment identified by `segmentId`.

#### Dynamic Tokens

Segments may specify _dynamic tokens_ in their fragment strings. Example:

```
{
  id: 'user',
  // `:userId` is a dynamic token.
  fragment: 'users/{userId}',
  rule: () => true,
  // The `tokens` object is required 
  // when a dynamic token is present.
  // Every dynamic token must be configured
  // with a regex that will match it.
  tokens: {
    userId: Marbles.Regex.DIGITS
  }
}
```

## API

Marbles exposes an event-driven interface.

### subscribe(subscriptions): Boolean

This method can be used to subscribe to events. It returns true if the subscription was successful, or false otherwise.

`subscriptions` should be an object of the following form:

```
{
  [segment_id]: {
    activated: function(data) {
      // do something
    },
    deactivated: function() {
      // do something
    }
  }
}
```

Both the `activated` and `deactivated` keys are optional, though you should provide at least one for every segment to which you are subscribing (otherwise what's the point?). 

The function registered under `activated` is fired every time the segment under watch is activated either with Marbles.activate or by adding it to the URL. It is passed a `data` object, which is a key-value map of all dynamic token data stored in the route.

The function registered under `deactivated` is fired every time the segment under watch is deactivated, either by Marbles.deactivate or by removing the segment from the URL. It is not passed anything.

**Example**:

```
m.subscribe({
  'user': {
    // fired on .activate('user', ...) calls
    activated: function(data) {
      console.log('Route for user #' + data.userId + ' activated!');
      // note that data will have any other
      // dynamic tokens from segments preceeding 'user' as well
      someView.show();
    },
    // fired on .deactivate('user') calls
    deactivated: function() {
      console.log('User route deactivated.');
      someView.hide();
    }
  }
});
```

### unsubscribe(subscriptions): Boolean|Array

Use this method to remove subscriptions. The parameters are as follows:
* subscriptions - The subscription config used when `.subscribe` was called.

This method will return false if removal was unsuccessful (for example, if a bad parameter is passed), otherwise it will return an array of removed listeners.

**Example:**

```
const handler = function doSomething(data) {
  ...
};
const subscription = {
  'home': {
    activated: handler
  }
};
// first, subscribe to an event
m.subscribe(subscription);
// unsubscribe!
m.unsubscribe(subscription);
```

### processRoute(hash: string): string

This method accepts a hash route (e.g., `/users/1` or `#home/about-us`) and returns a new, transformed route. The transformation applied is based on the configured segments. 

**Example**:

```
// configure router with segments
const m = new Marbles({...});
// then you may call processRoute()
m.processRoute('/home/about-us');
```

### start()

**This method is chainable.**

Listens for `hashchange` events and fires listeners added using `subscribe()` on said events. Unless you need fine-grained control of when your event listeners fire, you should always call this method when setting up Marbles. 

*Note*: This method will also fire `activated` and `deactivated` events for all subscribers based on the current window hash route when called.

**Example**:

```
// instantiate marbles
const m = new Marbles(...);
// set up some listeners
m.subscribe({
  'home': {
    activated: () => {
      console.log('Honey, I\'m home!');
    },
    deactivated: () => {
      console.log('Hold my calls, I\'m going out!');
    }
  }
});
// assume window.location.hash === '#home'
m.start();
// => Honey, I'm home!
// user clicks a link that redirects to some other route
// => Hold my calls, I'm going out!
```

### stop()

**This method is chainable.**

Stop Marbles from listening to `hashchange` events.

**Example**:

`m.stop();`

### activate(segmentId: string [, data: Object]): string

When `activate()` is called, Marbles attempts to insert the given segment with the provided data at the _leftmost possible position_ into the hash route. Whether this is successful depends on the segment's rule. 

It is very important to understand how this mechanism works, so I will expand on it here.

Suppose window.location.hash currently equals `/users/1/profile` and you've configured your Marbles instance with the following segments:

```
[
  {
    id: 'user',
    fragment: 'users/{userId}',
    rule: Marbles.rules.childOf('root'),
    tokens: {
      userId: Marbles.Regex.DIGITS
    }
  },
  {
    id: 'profile',
    fragment: 'profile',
    rule: Marbles.rules.present('user')
  },
  {
    id: 'messages',
    fragment: 'messages',
    rule: Marbles.rules.present('user')
  }
]
```

Notice how `profile` and `messages` have the same rule. Let's activate `messages`:

`m.activate('messages');`

Now Marbles has to figure out where to put the `messages` fragment in the route. The steps below detail how it does this.

`m.list` looks like | root | user | profile |.
1. Attempt to insert `messages` into the 1st position in the list (after root and before user). Is this a valid position for `messages`? No, according to its rule.
2. Attempt to insert `messages` into the 2nd position in the list (after user and before profile). Is this a valid position for `messages`? Yes, according to its rule. Now the list looks like this: | root | user | messages | profile |.
3. Are the nodes after `messages` still valid, or should they be removed? Left-to-right traverse List at i > List.indexOf(messages), evaluating rules and removing segments accordingly. 
4. Final list is | root | user | messages | profile |.

As you can see, Marbles will place the segment in the lowest index possible and remove any invalid segments that come after that.

*Parameters*: 
* segmentId - The segment to activate
* data - A key-value map of data to include. For example, if activating the `user` segment, one might pass a data object that looks like `{ userId: 1 }`.

*Return value*:
A transformed hash route that may include the activated segment, if allowed by its rule.

**Examples**: 

* Insert the 'home' segment:
    
    `m.insert('home');`

* Insert the 'user' segment, and pass it a `userId` of `1`. Assuming 'user' has the segment 'users/:userId', the dynamic token `:userId` will be replaced with `1`.
    
    `m.insert('user', { userId: 1 });`

### deactivate(segmentId: string): string

This method removes a segment from the hash route.

*Parameters*: 
* segmentId - The segment to remove (if present)

*Return value*:
A transformed hash route that no longer includes the segment identified by `segmentId`.

**Examples**: 

* Remove the 'home' segment:

    `m.deactivate('home');`

* Remove the `user` segment. Notice that no data needs to be passed when _deactivating_ a segment.

    `m.deactivate('user');

### getData(): data

Call this method to retrieve all the data from the dynamic tokens in the active hashroute.

**Example**:

Assume the hashroute is `users/1/cars/2` and Marbles is configured with the following segment definitions:

```
[
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
]
```

`m.getData(); // ->`
```
{
  userId: 1,
  carId: 2
}
```
