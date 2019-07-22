export function DataLoader(batchLoadFn, options) {
  if (!(this instanceof DataLoader)) {
    throw new TypeError(`Cannot call a class as a function`)
  }

  if (typeof batchLoadFn !== `function`) {
    throw new TypeError(
      `DataLoader must be constructed with a function which accepts
      Array<key> and returns Promise<Array<value>>, but got: ${batchLoadFn}.`
    )
  }

  this._queue = []
  this._promiseCache = new Map()
  this._batchLoadFn = batchLoadFn
  this._options = options || {}

  if (!this._options.cacheKeyFn) {
    this._options.cacheKeyFn = function(key) {
      return key
    }
  }
}

DataLoader.prototype.load = function load(key, skipCache) {
  if (key == null) {
    throw new TypeError(
      `The loader.load() function must be called with a value,
      but got: ${String(key)}.`
    )
  }

  var _this = this
  var shouldBatch = this._options.batch !== false
  var shouldCache = this._options.cache !== false
  var cacheKey = this._options.cacheKeyFn(key)

  if (shouldCache && !skipCache) {
    var cachedPromise = _this._promiseCache.get(cacheKey)

    if (cachedPromise) {
      return cachedPromise
    }
  }

  var promise = new Promise(function(resolve, reject) {
    _this._queue.push({ key: key, resolve: resolve, reject: reject })

    if (_this._queue.length === 1) {
      if (shouldBatch) {
        setTimeout(dispatchQueue, 4, _this)
      } else {
        dispatchQueue(_this)
      }
    }
  })

  if (shouldCache) {
    _this._promiseCache.set(cacheKey, promise)
  }

  return promise
}

DataLoader.prototype.loadMany = function loadMany(keys, skipCache) {
  if (!Array.isArray(keys)) {
    throw new TypeError(
      `The loader.loadMany() function must be called with Array<key>
      but got: ${keys}.`
    )
  }

  var _this2 = this

  return Promise.all(
    keys.map(function(key) {
      return _this2.load(key, skipCache)
    })
  )
}

DataLoader.prototype.clear = function clear(key) {
  var cacheKey = this._options.cacheKeyFn(key)

  this._promiseCache.delete(cacheKey)

  return this
}

DataLoader.prototype.clearAll = function clearAll() {
  this._promiseCache.clear()

  return this
}

DataLoader.prototype.prime = function prime(key, value) {
  var cacheKey = this._options.cacheKeyFn(key)

  if (this._promiseCache.get(cacheKey) === undefined) {
    this._promiseCache.set(
      cacheKey,
      value instanceof Error ? Promise.reject(value) : Promise.resolve(value)
    )
  }

  return this
}

function dispatchQueue(loader) {
  var queue = loader._queue
  var maxBatchSize = loader._options.maxBatchSize || 0

  loader._queue = []

  if (maxBatchSize > 0 && maxBatchSize < queue.length) {
    for (var i = 0; i < queue.length / maxBatchSize; i++) {
      dispatchQueueBatch(
        loader,
        queue.slice(i * maxBatchSize, (i + 1) * maxBatchSize)
      )
    }
  } else {
    dispatchQueueBatch(loader, queue)
  }
}

function dispatchQueueBatch(loader, queue) {
  var keys = queue.map(function(_ref) { return _ref.key })
  var batchPromise = loader._batchLoadFn(keys)

  if (!batchPromise || typeof batchPromise.then !== `function`) {
    return failedDispatch(
      loader,
      queue,
      new TypeError(
        `DataLoader must be constructed with a function which accepts
        Array<key> and returns Promise<Array<value>>, but the function did
        not return a Promise: ${String(batchPromise)}.`
      )
    )
  }

  batchPromise
    .then(function(values) {
      if (!Array.isArray(values)) {
        throw new TypeError(
          `DataLoader must be constructed with a function which accepts
          Array<key> and returns Promise<Array<value>>, but the function did
          not return a Promise of an Array: ${String(values)}.`
        )
      }

      if (values.length !== keys.length) {
        throw new TypeError(
          `DataLoader must be constructed with a function which accepts
          Array<key> and returns Promise<Array<value>>, but the function did
          not return a Promise of an Array of the same length as the Array of keys.
          \n\n Keys: \n ${String(keys)} \n\n Values: \n ${String(values)}`
        )
      }

      queue.forEach(function(_ref2, index) {
        var value = values[index]

        return value instanceof Error
          ? _ref2.reject(value)
          : _ref2.resolve(value)
      })
    })
    .catch(function(error) {
      return failedDispatch(loader, queue, error)
    })
}

function failedDispatch(loader, queue, error) {
  queue.forEach(function(_ref3) {
    loader.clear(ref3.key)
    _ref3.reject(error)
  })
}
