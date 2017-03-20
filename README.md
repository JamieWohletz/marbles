# marbles

Client-side hierarchical routing library supporting optional views.

[![Travis](https://img.shields.io/travis/JamieWohletz/marbles.svg)](https://travis-ci.org/JamieWohletz/marbles)
[![Codecov](https://img.shields.io/codecov/c/github/JamieWohletz/marbles.svg)](https://codecov.io/gh/JamieWohletz/marbles)
[![npm](https://img.shields.io/npm/v/marbles.svg)](https://npmjs.com/package/marbles)

## Overview

Marbles is a **flexible**, **framework-agnostic**, **client-side** routing library.

Features:
* Event-driven interface
* Optional route segments/fragments
* Hierarchical routes

## Why Another Routing Library?

Why did I take the time and effort to write yet _another_ routing library? Seriously, there are [so. many.](https://github.com/search?l=JavaScript&q=router&type=Repositories&utf8=%E2%9C%93)

Well, why do people usually reinvent the wheel?

1. To learn
2. Because the wheel doesn't do something they need

While learning was a nice side effect of having done this project, my main reason was that I couldn't find any routers that did what I _needed_. Granted, I didn't read the docs for all 13,771 (as of this writing) other routers, but I read the docs for some of the top ones and couldn't find what I needed.

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
var Marbles = marbles.default; 
var router = new Marbles({
  // segment definitions -- see below
});
// The hashchange event doesn't fire on window load. Calling `step()` forces the hash route to be evaluated by Marbles.
router.step();
// Listen for hashchange events.
router.start();
```

### Specifying segments

You specify segments as an [adjacency list](https://en.wikipedia.org/wiki/Adjacency_list).

#### Example
```
var segments = {
  // 'root' is REQUIRED
  'root': {
    // and it should always be active
    active: true,
    // root has no segment (though it can, if you want it to!)
    segment: '',
    // 'root' is strong and independent, like Katy Perry
    dependency: '',
    // This is an XOR'd list of children.
    // That means that root can be followed by 'home' XOR 'about' XOR 'blog'
    children: ['home', 'about', 'blog'],
    data: {}
  },
  'home': {
    // when loading the page without a hashroute, it will automatically direct to '#home' because this is active and root is active.
    active: true,
    // do not include leading or trailing slashes
    segment: 'home',
    // can't build a home without setting down ROOTS!
    dependency: 'root',
    children: [],
    data: {}
  },
  'about': {
    active: false,
    segment: 'about',
    dependency: 'root',
    children: [
      'founder'
    ],
    data: {}
  },
  'blog': {
    active: false,
    segment: 'about',
    dependency: 'root',
    children: [],
    data: {}
  },
  'founder': {
    active: false,
    segment: 'our-founder',
    dependency: 'about',
    children: ['employees'],
    data: {}
  },
  'employees': {
    active: false,
    segment: 'employees',
    // Specifying 'about' as the dependency means that we can remove 'founder' and 'employees' will still stick around, as long as 'about' is present in the route.
    // That means that 'founder' is an optional segment! Notice that since 'employees' is a child of 'founder', if 'founder' is present, it will _always_ come before 'employees'.
    dependency: 'about',
    children: [],
    data: {}
  }
};
```

The keys are **IDs**, and the nested objects are **segment configs**. That is, in example above, 'home' is the ID of a segment, and its config is 

```
{
  active: true,
  segment: 'home',
  dependency: 'root',
  children: []
}
```

#### Segments

Segments consist of a configuration object and an ID. In the route configuration, you specify the ID as a string key, and the configuration object as an object value mapped to a key.

**You may specify the following options on segment configs**:

```
{
  // (Required) Whether this segment is active initially. 
  active: <Boolean>
  // (Required) The actual segment to place in the hash route. Omit leading and trailing slashes.
  segment: <String>
  // (Required) Specifies what segment this segment must descend from.
  dependency: <String>,
  // (Required) A list of segment IDs that are direct descendants of this segment. These children are XOR'd, meaning only one child may be present in the hash route at a time. In tree terminology, they are on the same level.
  children: Array<String>
  // (Required) An object specifying what data to provide the route. Normally this will be empty, unless you want to hardcode some data.
  // It is useful for segments with dynamic tokens (more on that below).
  data: {}
}
```

#### Dynamic Tokens

Segments may specify _dynamic tokens_ in their segment strings. Example:

```
{
  active: false,
  // `:userId` is a dynamic token.
  segment: 'users/:userId'
  dependency: 'root',
  children: [],
  // the `data` object can be used
  // to provide default values
  data: {
    userId: 1
  }
}
```

Notice the use of the `data` object. You would almost never do this, so it's a contrived example. Instead, you set the data by using the `insert()` method. See the API section for details.

**Warning: There is a BUG (🐛) that prevents multiple dynamic tokens in a single segment from working correctly.** This is being worked on. 

## API

Marbles exposes an event-driven interface.

### subscribe(subscriptions): Boolean

This method can be used to subscribe to events. It returns true if the subscription was successful, or false otherwise.

`subscriptions` should be an object of the following form:

```
{
  <segment_id>: {
    inserted: function(data) {
      // do something
    },
    removed: function() {
      // do something
    }
  }
}
```

Both the `inserted` and `removed` keys are optional, though you should provide at least one for every segment to which you are subscribing (otherwise what's the point?). 

The function registered under `inserted` is fired every time the segment under watch is inserted. It is passed a `data` object, which is a key-value map of all dynamic token data stored in the route _up to that segment_. 

The function registered under `removed` is fired every time the segment under watch is removed. It is not passed anything.

**Example**:

```
m.subscribe({
  'user': {
    // fired on .insert('user', ...) calls
    inserted: function(data) {
      console.log('Route for user #' + data.userId + ' activated!');
      // note that data will have any other
      // dynamic tokens from segments preceeding 'user' as well
      someView.show();
    },
    // fired on .remove('user') calls
    removed: function() {
      console.log('User route deactivated.');
      someView.hide();
    }
  }
});
```

### unsubscribe(segmentId, event, handler): Boolean|Array

Use this method to remove subscriptions. The parameters are as follows:
* segmentId - ID of the segment whose listener you want to remove
* event - Name of event whose listener want you to remove. Can be either 'inserted' or 'removed'.
* handler - The handler function you provided in your `subscribe()` config.

This method will return false if removal was unsuccessful (for example, if a bad parameter is passed), otherwise it will return an array of removed listeners.

**Example:**

```
const handler = function doSomething(data) {
  ...
};
// first, subscribe to an event
m.subscribe({
  'home': {
    inserted: handler
  }
});
// unsubscribe!
m.unsubscribe('home', 'inserted', handler);
```

### step()

**This method is chainable.**

`step()` takes a snapshot of the current `window.location.hash` and fires any listeners that have been registered with `subscribe()`. The snapshot is recorded and is used as the previous state the next time `step()` is called. Note that internally, `start()` simply calls `step()` every time the `hashchange` event fires.

Normally, you don't want to call `step()` directly, BUT you should **always call it once after router instantiation**. Why? So you can fire listeners for the initial state of the hash route, which isn't captured by `start()` because `hashchange` doesn't fire on page load.

**Examples**:

* On router instantiation:
    
    ```
    const m = new Marbles(...);
    m.subscribe(...); // add listeners
    m.step(); // fire listeners for initial hash route.
    m.start(); // listen for further hashchange events.
    ```

* Assume `window.location.hash` = `users/1/profile/details`, and also that there are listeners for every segment in the given hash. 

    `step(); // fires listeners` 


### start()

**This method is chainable.**

Listens for `hashchange` events and fires listeners added using `subscribe()` on said events. Unless you need fine-grained control of when your event listeners fire, you should always call this method when setting up Marbles, AFTER a single call to `step()`. 

**Example**:

```
// instantiate marbles
const m = new Marbles(...);
// set up some listeners
m.subscribe({
  'home': {
    inserted: () => {
      console.log('Honey, I\'m home!');
    }
  }
});
// assume window.location.hash = ''
// call step() to handle initial hashroute.
m.step();
// finally, call start() to listen for hashchange events.
m.start();
// assume window.location.hash changes to 'home'
// "Honey, I'm home!"
```

### stop()

**This method is chainable.**

Stop Marbles from listening to `hashchange` events.

**Example**:

`m.stop();`

### insert(segmentId[, data])

**This method is chainable.**

When `insert()` is called, Marbles attempts to insert the given segment with the provided data into the hash route. Whether this is successful depends on the route configuration. 

**NOTE**: `insert()` only updates the hashroute.
To ensure your listeners are fired, use `step()` or `start()`.

**Examples**: 

* Insert the 'home' segment:
    
    `m.insert('home');`

* Insert the 'user' segment, and pass it a `userId` of `1`. Assuming 'user' has the segment 'users/:userId', the dynamic token `:userId` will be replaced with `1`.
    
    `m.insert('user', { userId: 1 });`

### remove(segmentId)

**This method is chainable.**

This method removes a segment from the hash route. This will update `window.location.hash` but will NOT fire any listeners by default. To fire the listeners, ensure you've already called `start()`, or call `step()` immediately after calling `remove()`.

**Examples**: 

* Remove the 'home' segment:

    `m.remove('home');`

* Remove the `user` segment. Notice that no data needs to be passed when _removing_ a segment.

    `m.remove('user');

### getData(): data

Call this method to retrieve all the data from the dynamic tokens in the active hashroute.

**Example**:

Assume the hashroute is `users/1/cars/2/details` and Marbles is configured with the following segment definitions:

```
{
  'root': {
    active: true,
    children: ['user'],    
    data: {},
    dependency: '',
    segment: ''
  },
  'user': {
    active: false,
    children: ['car'],
    data: {},
    dependency: 'root',
    segment: 'users/:userId'
  },
  'car': {
    active: false,
    children: ['car-details'],
    data: {},
    dependency: 'user',
    segment: 'cars/:carId'
  },
  'car-details': {
    active: false,
    children: [],
    data: {},
    dependency: 'car',
    segment: 'details'
  }
}
```

`m.getData(); // ->`
```
{
  userId: 1,
  carId: 2
}
```
