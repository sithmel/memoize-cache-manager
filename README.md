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
var Cache = require('memoize-cache/cache'); // or require('memoize-cache').cache;
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
Check [memoize-cache](https://github.com/sithmel/memoize-cache) for the list of methods
