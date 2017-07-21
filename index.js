var snappy = require('./utils/snappy');
var BaseCache = require('memoize-cache/base-cache');
var waterfall = require('async-deco/callback/waterfall');

function CacheManagerAdapter(opts) {
  BaseCache.call(this, opts);
  this.cacheManager = this.opts.cacheManager;
  if (this.opts.compress) {
    if (!snappy.isSnappyInstalled) {
      throw new Error('The "compress" option requires the "snappy" library. Its installation failed (hint missing libraries or compiler)');
    }
    this.serialize = waterfall([this.serialize, snappy.compress]);
    this.deserialize = waterfall([snappy.decompress, this.deserialize]);
  }
}

CacheManagerAdapter.prototype = Object.create(BaseCache.prototype);
CacheManagerAdapter.prototype.constructor = CacheManagerAdapter;

CacheManagerAdapter.prototype._set = function cache__set(k, payload, maxAge, next) {
  this.cacheManager.set(k, payload, maxAge ? {ttl: maxAge} : undefined, next);
};

CacheManagerAdapter.prototype._get = function cache__get(key, next) {
  this.cacheManager.get(key, next);
};

module.exports = CacheManagerAdapter;
