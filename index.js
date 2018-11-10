var snappy = require('./utils/snappy')
var BaseCache = require('memoize-cache/base-cache')
var parallel = require('./utils/parallel')

function CacheManagerAdapter (opts) {
  BaseCache.call(this, opts)
  this.cacheManager = this.opts.cacheManager
  this.compress = function (obj, cb) { cb(null, obj) }
  this.decompress = function (str, cb) { cb(null, str) }
  if (this.opts.compress) {
    if (!snappy.isSnappyInstalled) {
      throw new Error('The "compress" option requires the "snappy" library. Its installation failed (hint missing libraries or compiler)')
    }
    this.compress = snappy.compress
    this.decompress = snappy.decompress
  }
}

CacheManagerAdapter.prototype = Object.create(BaseCache.prototype)
CacheManagerAdapter.prototype.constructor = CacheManagerAdapter

CacheManagerAdapter.prototype._set = function _cacheSet (keyObj, payload, maxAge, next) {
  var k = keyObj.key
  var that = this
  this.compress(payload, function (err, compressed) {
    if (err) return next(err)
    that.cacheManager.set(k, compressed, maxAge ? { ttl: maxAge } : undefined, next)
  })
}

CacheManagerAdapter.prototype._get = function _cacheGet (key, next) {
  var that = this
  this.cacheManager.get(key, function (err, payload) {
    if (err) return next(err)
    that.decompress(payload, next)
  })
}

CacheManagerAdapter.prototype.purgeByKeys = function cachePurgeByKeys (keys, next) {
  next = next || function () {}
  keys = Array.isArray(keys) ? keys : [keys]
  var cacheManager = this.cacheManager
  var changes = parallel(keys.map(function (key) {
    return function (cb) {
      cacheManager.del(key, cb)
    }
  }))
  changes(next)
}

module.exports = CacheManagerAdapter
