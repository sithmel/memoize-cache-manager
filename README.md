memoize-cache-manager
=====================
[![Build Status](https://travis-ci.org/sithmel/memoize-cache-manager.svg?branch=master)](https://travis-ci.org/sithmel/memoize-cache-manager)

A configurable cache support for functions (https://www.npmjs.com/package/async-deco). This adapter allows to use [cache-manager](https://github.com/BryanDonovan/node-cache-manager) as its backends


cache
=====
The constructor takes an "options" object.
The options object may contain these attributes:
cacheManager: a cacheManager instance
* key: a function used to extract the cache key (used in the push and query method for storing, retrieving the cached value). The key returned should be a string or it will be converted to JSON and then md5. Default: a function returning a fixed key. The value won't be cached if the function returns null
* maxAge: it is a function that allows you to use a different TTL for a specific item (in seconds). If it returns 0 it will avoid caching the item. The function takes the same arguments as the "push" method (an array of inputs and the output). If it returns undefined, the default ttl will be used.
* maxValidity: the maximum age of an item stored in the cache before being considered "stale" (in seconds). Default: Infinity. You can also pass a function that will calculate the validity of a specific item. The function will take the same arguments as the "push" method (an array of inputs and the output).
* serialize: it is an optional function that serialize the value stored (takes a value, returns a value). It can be used for pruning part of the object we don't want to save or even using a compression algorithm
* deserialize: it is an optional function that deserialize the value stored (takes a value, returns a value).
* serializeAsync: it is an optional function that serialize the value stored, it returns using a callback. It can be used for pruning part of the object we don't want to save or even using a custom compression algorithm
* deserializeAsync: it is an optional function that deserialize the value stored, it returns using a callback.
* compress: if "true" will serialize/deserialize the values using the "snappy" compression algorithms (it can be used in combination with either serialize/serializeAsync steps)

Example:
```js
var Cache = require('memoize-cache-manager');
var cacheManager = require('cache-manager'); // npm install cache-manager

// using the id property of the first argument
// this cache will store maximum 100 items
// every item will be considered stale and purged after 20 seconds.
var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 20});

var cache = new Cache({ cacheManager: memoryCache, key: function (config){
  return config.id;
} });
```

Methods
=======

Pushing a new cached value
--------------------------
```js
cache.push(args, output);
```
"args" is an array containing the arguments passed to the function that generated the output.
This function is a "fire and forget" caching request. So there is no need of waiting for an answer, but if you want you can use a callback as third argument.
It returns an object or undefined if the value won't be cached (because the TTL is 0 for example, or the resulting cachekey is null).
This object contains:
* key: the "cache key" if the value is scheduled to be cached
* tags: an array with tags. They can be used to track and delete other keys **this adapter does not have any method for doing that**

Querying for cache hit
----------------------
```js
cache.query(args, function (err, result){
  // result.cached is true when you find a cached value
  // result.hit is the value cached
  // result.timing is the time spent in ms to retrieve the value (also used for cache miss)
  // cached.key is the key used to store the value (might be useful for debugging)
  // cache.stale (true/false) depending on the maxValidity function (if defined)
});
```
"args" is an array containing the arguments passed to the function that generated the output.

Getting the cache key
---------------------
```js
var key = cache.getCacheKey(...);
```
It takes as arguments the same arguments of the function. It returns the cache key.
It uses the function passed in the factory function. If it returns a string it uses it as key. In case it is not a string it tries to serialize it to JSON and then to an hash (using md5).

The cache object
----------------
The cache object is in the "cache" property and it support the API specified here: https://github.com/sithmel/little-ds-toolkit#lru-cache

Purging cache items
-------------------
```js
cache.purgeByKeys(keys);
// it removes the cache item with a specific key (string) or keys (array of strings).
// You can pass an optional callback.
```
