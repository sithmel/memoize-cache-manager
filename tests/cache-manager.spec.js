var assert = require('chai').assert;
var Cache = require('..');
var cacheManager = require('cache-manager');
var redisStore = require('cache-manager-redis');
var lzma = require('lzma-purejs');
var snappy = require('snappy');

describe('cache-manager', function () {

  it('must translate args to key', function () {
    var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 10});
    var cache = new Cache({ cacheManager: memoryCache, key: function (n) {return n;} });
    assert.equal(cache.getCacheKey('1'), '1');
    assert.equal(cache.getCacheKey(1), 'c4ca4238a0b923820dcc509a6f75849b');
    assert.equal(cache.getCacheKey({d:1}), 'dc6f789c90af7a7f8156af120f33e3be');
  });

  it('returns the key', function () {
    var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 10});
    var cache = new Cache({ cacheManager: memoryCache });
    var obj = cache.push([], 'result');
    assert.equal(obj.key, '_default');
  });

  it('must configure cache: default key', function (done) {
    var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 10});
    var cache = new Cache({ cacheManager: memoryCache });
    cache.push([], 'result', function (err) {
      cache.query({}, function (err, res) {
        assert.equal(res.cached, true);
        assert.equal(res.key, '_default');
        assert.equal(res.hit, 'result');
        done();
      });
    });
  });

  it('must push twice', function (done) {
    var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 10});
    var cache = new Cache({ cacheManager: memoryCache });
    cache.push([], 'result1', function (err) {
      cache.push([], 'result2', function (err) {
        cache.query({}, function (err, res) {
          assert.equal(res.cached, true);
          assert.equal(res.stale, false);
          assert.equal(res.key, '_default');
          assert.equal(res.hit, 'result2');
          done();
        });
      });
    });
  });

  describe('maxValidity', function () {
    var memoryCache;
    beforeEach(function () {
      memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 10});
    });

    it('must use value', function (done) {
      var cache = new Cache({ cacheManager: memoryCache, maxValidity: 0.010});
      cache.push([], 'result', function (err) {
        cache.query({}, function (err, res) {
          assert.equal(res.cached, true);
          assert.equal(res.stale, false);
          assert.equal(res.key, '_default');
          assert.equal(res.hit, 'result');
          done();
        });
      });
    });

    it('must use value (2)', function (done) {
      var cache = new Cache({ cacheManager: memoryCache, maxValidity: 0.010});
      cache.push([], 'result', function (err) {
        setTimeout(function () {
          cache.query({}, function (err, res) {
            assert.equal(res.cached, true);
            assert.equal(res.stale, true);
            assert.equal(res.key, '_default');
            assert.equal(res.hit, 'result');
            done();
          });
        }, 15);
      });
    });

    it('must use func', function (done) {
      var cache = new Cache({ cacheManager: memoryCache, maxValidity: function () {
        return 0.010;
      }});
      cache.push([], 'result', function (err) {
        setTimeout(function () {
          cache.query({}, function (err, res) {
            assert.equal(res.cached, true);
            assert.equal(res.stale, true);
            assert.equal(res.key, '_default');
            assert.equal(res.hit, 'result');
            done();
          });
        }, 15);
      });
    });
  });


  it('must return null key', function () {
    var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 10});
    var cache = new Cache({ cacheManager: memoryCache, key: function (n) {return null;}});
    assert.equal(cache.getCacheKey('1'), null);
  });

  it('must not cache if key is null', function (done) {
    var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 10});
    var cache = new Cache({ cacheManager: memoryCache, key: function (n) {return null;}});
    cache.push([], 'result', function (err) {
      cache.query({}, function (err, res) {
        assert.equal(res.cached, false);
        assert.equal(res.key, null);
        assert.isUndefined(res.hit);
        done();
      });
    });
  });

  it('must not cache with specific output', function (done) {
    var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 10});
    var cache = new Cache({
      cacheManager: memoryCache,
      key: function (n) {
        return n;
      },
      maxAge: function (args, output) {
        if (output === 'result') {
          return 0;
        }
        return Infinity;
      }
    });
    cache.push(['1'], 'result', function (err) {
      cache.query(['1'], function (err, res) {
        assert.equal(res.cached, false);
        assert.equal(res.key, '1');
        assert.isUndefined(res.hit);
        done();
      });
    });
  });

  describe('simple key', function () {
    var cache;

    beforeEach(function (done) {
      var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 10});
      cache = new Cache({
        cacheManager: memoryCache,
        key: function (data) {
          return data.test;
        }});
      cache.push([{test: '1'}], 'result1', function (err) {
        cache.push([{test: '2'}], 'result2', done);
      });
    });

    it('must configure cache: string key 1', function (done) {
      cache.query([{test: '1'}], function (err, res1) {
        assert.equal(res1.cached, true);
        assert.equal(res1.key, '1');
        assert.equal(res1.hit, 'result1');
        done();
      });
    });

    it('must configure cache: string key 2', function (done) {
      cache.query([{test: '2'}], function (err, res2) {
        assert.equal(res2.cached, true);
        assert.equal(res2.key, '2');
        assert.equal(res2.hit, 'result2');
        done();
      });
    });

    it('must configure cache: string key 3', function (done) {
      cache.query([{test: '3'}], function (err, res3) {
        assert.equal(res3.cached, false);
        assert.equal(res3.key, '3');
        assert.isUndefined(res3.hit);
        done();
      });
    });
  });

  describe('simple key (redis)', function () {
    var cache;

    beforeEach(function (done) {
      var memoryCache = cacheManager.caching({store: redisStore, max: 100, ttl: 10});
      cache = new Cache({ cacheManager: memoryCache, key: function (data) {
        return data.test;
      }});
      cache.push([{test: '1'}], 'result1', function (err) {
        cache.push([{test: '2'}], 'result2', done);
      });
    });

    it('must configure cache: string key 1', function (done) {
      cache.query([{test: '1'}], function (err, res1) {
        assert.equal(res1.cached, true);
        assert.equal(res1.key, '1');
        assert.equal(res1.hit, 'result1');
        done();
      });
    });

    it('must configure cache: string key 2', function (done) {
      cache.query([{test: '2'}], function (err, res2) {
        assert.equal(res2.cached, true);
        assert.equal(res2.key, '2');
        assert.equal(res2.hit, 'result2');
        done();
      });
    });

    it('must configure cache: string key 3', function (done) {
      cache.query([{test: '3'}], function (err, res3) {
        assert.equal(res3.cached, false);
        assert.equal(res3.key, '3');
        assert.isUndefined(res3.hit);
        done();
      });
    });
  });

  it('must configure cache: string key/object', function (done) {
    var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 10});
    var cache = new Cache({ cacheManager: memoryCache, key: function (data) {
      return data.test;
    }});
    cache.push([{test: [1, 2]}], 'result1', function (err) {
      cache.push([{test: [3, 4]}], 'result2', function (err) {
        cache.query([{test: [1, 2]}], function (err, res1) {
          assert.equal(res1.cached, true);
          assert.equal(res1.key, 'f79408e5ca998cd53faf44af31e6eb45');
          assert.equal(res1.hit, 'result1');
          done();
        });
      });
    });

  });

  it('must configure cache: array key', function (done) {
    var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 10});
    var cache = new Cache({ cacheManager: memoryCache, key: function (data) {
      return data.test[0];
    }});
    cache.push([{test: [1, 2]}], 'result1', function (err) {
      cache.query([{test: [1, 'x']}], function (err, res1) {
        assert.equal(res1.cached, true);
        assert.equal(res1.key, 'c4ca4238a0b923820dcc509a6f75849b');
        assert.equal(res1.hit, 'result1');
        done();
      });
    });
  });

  it('must configure cache: array key/object', function (done) {
    var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 10});
    var cache = new Cache({ cacheManager: memoryCache, key: function (data) {
      return data.test;
    }});
    cache.push([{test: [1, 2]}], 'result1', function (err) {
      cache.query([{test: [1, 2]}], function (err, res1) {
        assert.equal(res1.cached, true);
        assert.equal(res1.key, 'f79408e5ca998cd53faf44af31e6eb45');
        assert.equal(res1.hit, 'result1');
        done();
      });
    });
  });

  it('must configure cache: func', function (done) {
    var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 10});
    var cache = new Cache({ cacheManager: memoryCache, key: function (config) {
      return config.test * 2;
    }});
    cache.push([{test: 4}], 'result1', function (err) {
      cache.query([{test: 4}], function (err, res1) {
        assert.equal(res1.cached, true);
        assert.equal(res1.key, 'c9f0f895fb98ab9159f51fd0297e236d');
        assert.equal(res1.hit, 'result1');
        done();
      });
    });
  });

  describe('maxLen', function () {
    var cache;

    beforeEach(function (done) {
      var memoryCache = cacheManager.caching({store: 'memory', max: 2, ttl: 10});
      cache = new Cache({ cacheManager: memoryCache, key: function (data) {
        return data.test;
      }});
      cache.push([{test: '1'}], 'result1', function (err) {
        cache.push([{test: '2'}], 'result2', done);
      });
    });

    describe('remove one', function () {
      beforeEach(function (done) {
        cache.query([{test: '2'}], function () {
          cache.push([{test: '3'}], 'result3', done);
        });
      });

      it('must not be cached (purged)', function (done) {
        cache.query([{test: '1'}], function (err, res1) {
          assert.equal(res1.cached, false);
          done();
        });
      });

      it('must not be cached 1', function (done) {
        cache.query([{test: '2'}], function (err, res2) {
          assert.equal(res2.cached, true);
          assert.equal(res2.key, '2');
          assert.equal(res2.hit, 'result2');
          done();
        });
      });

      it('must not be cached 2', function (done) {
        cache.query([{test: '3'}], function (err, res3) {
          assert.equal(res3.cached, true);
          assert.equal(res3.key, '3');
          assert.equal(res3.hit, 'result3');
          done();
        });
      });
    });
  });

  describe('maxAge', function () {
    var cache;

    beforeEach(function (done) {
      var memoryCache = cacheManager.caching({store: 'memory', max: 20, ttl: 0.030});
      cache = new Cache({ cacheManager: memoryCache, key: function (data) {
        return data.test;
      }});
      cache.push([{test: '1'}], 'result1', done);
    });

    it('must be cached', function (done) {
      cache.query([{test: '1'}], function (err, res1) {
        assert.equal(res1.cached, true);
        assert.equal(res1.key, '1');
        assert.equal(res1.hit, 'result1');
        done();
      });
    });

    it('must be cached after a bit', function (done) {
      setTimeout(function () {
        cache.query([{test: '1'}], function (err, res1) {
          assert.equal(res1.cached, true);
          assert.equal(res1.key, '1');
          assert.equal(res1.hit, 'result1');
          done();
        });
      }, 10);
    });

    it('must be expired after a while', function (done) {
      setTimeout(function () {
        cache.push([{test: '2'}], 'result2', function (err) {
          cache.query([{test: '1'}], function (err, res1) {
            assert.equal(res1.cached, false);
            assert.equal(res1.key, '1');
            assert.isUndefined(res1.hit);
            cache.query([{test: '2'}], function (err, res1) {
              assert.equal(res1.cached, true);
              assert.equal(res1.key, '2');
              assert.equal(res1.hit, 'result2');
              done();
            });
          });
        });
      }, 40);
    });
  });

  describe('maxAge (function)', function () {
    var cache;

    beforeEach(function (done) {
      var memoryCache = cacheManager.caching({store: 'memory', max: 20, ttl: 0.030});
      cache = new Cache({ cacheManager: memoryCache,
        key: function (data) {
          return data.test;
        },
        maxAge: function (args, output) {
          var data = args[0];
          return data.test === '1' ? 0 : 0.050;
        }
      });

      cache.push([{test: '1'}], 'result1', done);
    });

    it('must not be cached', function (done) {
      cache.query([{test: '1'}], function (err, res1) {
        assert.equal(res1.cached, false);
        assert.equal(res1.key, '1');
        assert.isUndefined(res1.hit);
        done();
      });
    });

    it('must be not expired', function (done) {
      cache.push([{test: '2'}], 'result2', function (err) {
        setTimeout(function () {
          cache.query([{test: '2'}], function (err, res1) {
            assert.equal(res1.cached, true);
            assert.equal(res1.key, '2');
            assert.equal(res1.hit, 'result2');
            done();
          });
        }, 40);
      });
    });

    it('must be expired after a while', function (done) {
      cache.push([{test: '2'}], 'result2', function (err) {
        setTimeout(function () {
          cache.query([{test: '2'}], function (err, res1) {
            assert.equal(res1.cached, false);
            assert.equal(res1.key, '2');
            assert.isUndefined(res1.hit);
            done();
          });
        }, 60);
      });
    });
  });

  it('must serialize/deserialize data with lzma', function (done) {
    var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 10});

    var serialize = function (obj) {
      var data = new Buffer(JSON.stringify(obj), 'utf8');
      var compressed = lzma.compressFile(data);
      return compressed;
    };

    var deserialize = function (buf) {
      var uncompressed = lzma.decompressFile(buf);
      var data2 = new Buffer(uncompressed).toString('utf8');
      return JSON.parse(data2);
    };

    var cache = new Cache({ cacheManager: memoryCache, serialize: serialize, deserialize: deserialize});
    cache.push([], 'result', function (err) {
      cache.query({}, function (err, res) {
        assert.equal(res.cached, true);
        assert.equal(res.key, '_default');
        assert.equal(res.hit, 'result');
        done();
      });
    });
  });

  it('must serialize/deserialize data with snappy', function (done) {
    var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 10});

    var serialize = function (obj) {
      var data = new Buffer(JSON.stringify(obj), 'binary');
      var compressed = snappy.compressSync(data);
      return compressed;
    };

    var deserialize = function (buf) {
      var uncompressed = snappy.uncompressSync(buf);
      var data2 = new Buffer(uncompressed).toString('binary');
      return JSON.parse(data2);
    };

    var cache = new Cache({ cacheManager: memoryCache, serialize: serialize, deserialize: deserialize});
    cache.push([], 'result', function (err) {
      cache.query({}, function (err, res) {
        assert.equal(res.cached, true);
        assert.equal(res.key, '_default');
        assert.equal(res.hit, 'result');
        done();
      });
    });
  });

  it('must serialize/deserialize data with snappy async', function (done) {
    var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 10});

    var serialize = function (obj, cb) {
      snappy.compress(JSON.stringify(obj), function (err, buf) {
        cb(err, buf.toString('binary'));
      });
    };

    var deserialize = function (str, cb) {
      // var buf = Buffer.from(str, 'binary');
      var buf = new Buffer(str, 'binary');
      snappy.uncompress(buf, { asBuffer: false }, function (err, uncompressed) {
        var obj;
        if (err) {
          cb(err);
        }
        else {
          try {
            obj = JSON.parse(uncompressed);
          }
          catch (e) {
            return cb(e);
          }
          cb(null, obj);
        }
      });
    };

    var cache = new Cache({ cacheManager: memoryCache, serializeAsync: serialize, deserializeAsync: deserialize});
    cache.push([], 'result', function (err) {
      cache.query({}, function (err, res) {
        assert.equal(res.cached, true);
        assert.equal(res.key, '_default');
        assert.equal(res.hit, 'result');
        done();
      });
    });
  });

  it('must serialize/deserialize data with snappy (use flag)', function (done) {
    var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 10});

    var cache = new Cache({ cacheManager: memoryCache, compress: true});
    cache.push([], 'result', function (err) {
      cache.query({}, function (err, res) {
        assert.equal(res.cached, true);
        assert.equal(res.key, '_default');
        assert.equal(res.hit, 'result');
        done();
      });
    });
  });

  it('must serialize/deserialize data with snappy (use flag + serialize)', function (done) {
    var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 10});

    var serialize = function (obj) {
      return obj.split();
    };

    var deserialize = function (arr) {
      return arr.join('');
    };

    var cache = new Cache({ cacheManager: memoryCache, compress: true, serialize: serialize, deserialize: deserialize});
    cache.push([], 'result', function (err) {
      cache.query({}, function (err, res) {
        assert.equal(res.cached, true);
        assert.equal(res.key, '_default');
        assert.equal(res.hit, 'result');
        done();
      });
    });
  });

  it('removes a key', function (done) {
    var getKey = function (key) {
      return key;
    };

    var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 10});
    var cache = new Cache({ cacheManager: memoryCache, key: getKey, });
    cache.push(['k1'], 'result');
    cache.query(['k1'], function (err, value) {
      assert.equal(value.hit, 'result');
      cache.purgeByKeys('k1', function (err) {
        cache.query(['k1'], function (err, value) {
          assert.isFalse(value.cached);
          done();
        });
      });
    });
  });

});
