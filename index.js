var snappy = require('./utils/snappy')
var BaseCache = require('memoize-cache/base-cache')
var parallel = require('./utils/parallel')
var waterfall = require('./utils/waterfall')

function CacheManagerAdapter (opts) {
  BaseCache.call(this, opts)
  this.cacheManager = this.opts.cacheManager
  if (this.opts.compress) {
    if (!snappy.isSnappyInstalled) {
      throw new Error('The "compress" option requires the "snappy" library. Its installation failed (hint missing libraries or compiler)')
    }
    this.serialize = waterfall([this.serialize, snappy.compress])
    this.deserialize = waterfall([snappy.decompress, this.deserialize])
  }
}

CacheManagerAdapter.prototype = Object.create(BaseCache.prototype)
CacheManagerAdapter.prototype.constructor = CacheManagerAdapter

CacheManagerAdapter.prototype._set = function _cacheSet (keyObj, payload, maxAge, next) {
  var k = keyObj.key
  this.cacheManager.set(k, payload, maxAge ? { ttl: maxAge } : undefined, next)
}

CacheManagerAdapter.prototype._get = function _cacheGet (key, next) {
  this.cacheManager.get(key, next)
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
