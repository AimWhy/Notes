```javascript
var objectTag = '[object Object]',
    objectProto = Object.prototype,
    funcToString = Function.prototype.toString,
    objectToString = objectProto.toString,
    objectCtorString = funcToString.call(Object),
    getPrototypeOf = Object.getPrototypeOf,
    ActionTypes = {
        INIT: '@@redux/INIT'
    };

function isObjectLike(value) {
    return !!value && (typeof value === 'object');
}

function isHostObject(value) {
    var result = false;
    if (value != null && typeof value.toString !== 'function') {
        try { result = !!(value + ''); } catch (e) { }
    }
    return result;
}

function warning(message) {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
        console.error(message);
    } else {
        try {
            throw new Error(message);
        } catch (e) {
        }
    }
}

function compose() {
    for (var _len = arguments.length, funcs = Array(_len), _i = 0; _i < _len; _i++) {
        funcs[_i] = arguments[_i];
    }
    return function () {
        if (funcs.length === 0) {
            return arguments.length <= 0 ? undefined : arguments[0];
        } else {
            var last = funcs[funcs.length - 1],
            rest = funcs.slice(0, -1);

            return rest.reduceRight(function (composed, f) { return f(composed); }, last.apply(undefined, arguments));
        }
    };
}

function bindActionCreator(actionCreator, dispatch) {
    return function () {
        return dispatch(actionCreator.apply(undefined, arguments));
    };
}

function bindActionCreators(actionCreators, dispatch) {
    if (typeof actionCreators === 'function') {
        return bindActionCreator(actionCreators, dispatch);
    }
    if (typeof actionCreators !== 'object' || actionCreators === null) {
        throw new Error('参数actionCreators应为函数或对象');
    }

    var keys = Object.keys(actionCreators),
        boundActionCreators = {};

    for (var i = 0; i < keys.length; i++) {
        var key = keys[i],
            actionCreator = actionCreators[key];

        if (typeof actionCreator === 'function') {
            boundActionCreators[key] = bindActionCreator(actionCreator, dispatch);
        }
    }
    return boundActionCreators;
}

var _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
            }
        }
    }
    return target;
};

/**注：param = {dispatch : dispatch, getState : getState};

function thunkMiddleware(param) {
  return function (next) {
    return function (action) {
      if (typeof action === 'function') {
        return action(param.dispatch, param.getState);
      }
      return next(action);
    };
  };
}*/
function applyMiddleware() {
    for (var _len = arguments.length, middlewares = Array(_len), _i = 0; _i < _len; _i++) {
        middlewares[_i] = arguments[_i];
    }

    return function (createStore) {
        return function (reducer, initialState, enhancer) {
            var store = createStore(reducer, initialState, enhancer),
                _dispatch = store.dispatch,
                chain;

            var middlewareAPI = {
                getState: store.getState,
                dispatch: function (action) {
                    return _dispatch(action);
                }
            };

            chain = middlewares.map(function (middleware) {
                return middleware(middlewareAPI);
            });

            _dispatch = compose.apply(undefined, chain)(store.dispatch);

            return _extends({}, store, {
                dispatch: _dispatch
            });
        };
    };
}

function isPlainObject(value) {
    if (!isObjectLike(value) || objectToString.call(value) !== objectTag || isHostObject(value)) {
        return false;
    } else {
        var proto = objectProto;
        if (typeof value.constructor === 'function') {
            proto = getPrototypeOf(value);
        }

        if (proto == null) {
            return true;
        } else {
            var Ctor = proto.constructor;
            return (typeof Ctor === 'function') && (Ctor instanceof Ctor) && (funcToString.call(Ctor) === objectCtorString);
        }
    }
}

function createStore(reducer, initialState, enhancer) {
    if (typeof initialState === 'function' && typeof enhancer === 'undefined') {
        enhancer = initialState;
        initialState = undefined;
    }

    if (typeof enhancer !== 'undefined') {
        if (typeof enhancer !== 'function') {
            throw new Error('Expected the enhancer to be a function.');
        } else {
            return enhancer(createStore)(reducer, initialState);
        }
    }

    if (typeof reducer !== 'function') {
        throw new Error('Expected the reducer to be a function.');
    }

    var currentReducer = reducer,
        currentState = initialState,
        currentListeners = [],
        nextListeners = currentListeners,
        isDispatching = false;

    function ensureCanMutateNextListeners() {
        if (nextListeners === currentListeners) {
            nextListeners = currentListeners.slice();
        }
    }

    function getState() {
        return currentState;
    }

    function subscribe(listener) {
        if (typeof listener !== 'function') {
            throw new Error('Expected listener to be a function.');
        }

        var isSubscribed = true;
        ensureCanMutateNextListeners();
        nextListeners.push(listener);

        return function () {
            if (!isSubscribed) {
                return;
            } else {
                isSubscribed = false;
                ensureCanMutateNextListeners();
                var index = nextListeners.indexOf(listener);
                nextListeners.splice(index, 1);
            }
        };
    }


    function dispatch(action) {
        if (!isPlainObject(action)) {
            throw new Error('Actions必须是普通对象.异步actions使用middleware.');
        }
        if (typeof action.type === 'undefined') {
            throw new Error('Actions需要一个type属性');
        }
        if (isDispatching) {
            throw new Error('Reducers may not dispatch actions.');
        }

        try {
            isDispatching = true;
            currentState = currentReducer(currentState, action);
        } finally {
            isDispatching = false;
        }

        var listeners = currentListeners = nextListeners;
        for (var i = 0; i < listeners.length; i++) {
            listeners[i]();
        }

        return action;
    }

    function replaceReducer(nextReducer) {
        if (typeof nextReducer !== 'function') {
            throw new Error('Expected the nextReducer to be a function.');
        }

        currentReducer = nextReducer;
        dispatch({ type: ActionTypes.INIT });
    }

    dispatch({ type: ActionTypes.INIT });

    return {
        dispatch: dispatch,
        subscribe: subscribe,
        getState: getState,
        replaceReducer: replaceReducer
    };
}

function getUndefinedStateErrorMessage(key, action) {
    return 'Reducer "' + key + '" returned undefined handling ' + ((action && action.type) || 'an action');
}

function getUnexpectedStateShapeWarningMessage(inputState, reducers, action) {
    var reducerKeys = Object.keys(reducers),
        argumentName = (action && action.type === createStore.ActionTypes.INIT) ? 'during initialState' : 'during previousState';

    if (!reducerKeys.length) {
        warning('reducers应为{key:value},value为reducer.');
    }
    if (!isPlainObject(inputState)) {
        warning('State应为一个{}');
    }

    var unexpectedKeys = Object.keys(inputState).filter(function (key) {
        return !reducers.hasOwnProperty(key);
    });

    if (unexpectedKeys.length) {
        warning('Unexpected keys:' + unexpectedKeys.join(',') + argumentName);
    }
}

function assertReducerSanity(reducers) {
    Object.keys(reducers).forEach(function (key) {
        var reducer = reducers[key],
            type = '@@redux/RANDOM' + Math.random().toString(36).substring(7).split('').join('.');

        if (typeof reducer(undefined, { type: createStore.ActionTypes.INIT }) === 'undefined') {
            return 'returned undefined during initialization.';
        }
        if (typeof reducer(undefined, { type: type }) === 'undefined') {
            return 'returned undefined when probed with a random type';
        }
        return '';
    });
}

function combineReducers(reducers) {
    var reducerKeys = Object.keys(reducers),
        finalReducers = {},
        finalReducerKeys = [],
        sanityError;

    for (var j = 0; j < reducerKeys.length; j++) {
        var rkey = reducerKeys[j];
        if (typeof reducers[rkey] === 'function') {
            finalReducers[rkey] = reducers[rkey];
            finalReducerKeys.push(rkey);
        }
    }
    sanityError = assertReducerSanity(finalReducers);

    return function () {
        var state = (arguments.length <= 0 || arguments[0] === undefined) ? {} : arguments[0],
            action = arguments[1];

        if (sanityError) {
            throw sanityError;
        }
        getUnexpectedStateShapeWarningMessage(state, finalReducers, action);

        var hasChanged = false,
            nextState = {};
        for (var i = 0; i < finalReducerKeys.length; i++) {
            var key = finalReducerKeys[i],
                reducer = finalReducers[key],
                previousStateForKey = state[key],
                nextStateForKey = reducer(previousStateForKey, action);

            if (typeof nextStateForKey === 'undefined') {
                var errorMessage = getUndefinedStateErrorMessage(key, action);
                throw new Error(errorMessage);
            } else {
                nextState[key] = nextStateForKey;
                hasChanged = hasChanged || (nextStateForKey !== previousStateForKey);
            }
        }
        return hasChanged ? nextState : state;
    };
}


function a(param) {
    return function (next) {
        return function (action) {
            console.log('a');
            if (typeof action === 'function') {
                return action(param.dispatch, param.getState);
            }
            return next(action);
        };
    };
}

function b(param) {
    return function (next) {
        return function (action) {
            console.log('b');
            return next(action);
        };
    };
}

var createStoreWithMiddleware = applyMiddleware(a, b)(createStore);
var action = function (dispatch, state) { dispatch({ type: '58' }); };
var reduce = function () { return {}; };

//@ sourceURL=redux.js
```
