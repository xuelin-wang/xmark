import ReactDOM from 'react-dom';
import React from 'react';
import thunkMiddleware from 'redux-thunk'
import createLogger from 'redux-logger'
import { createStore, applyMiddleware, dispatch } from 'redux'
import { Provider } from 'react-redux'
import xmarkReducer from './reducers'
import XmarkApp from './components/XmarkApp.react.js';
import completeRequestAuth from './actions.js';
import { fetchBookmarks } from './gDocs.js';

const loggerMiddleware = createLogger()
const createStoreWithMiddleware = applyMiddleware(
  thunkMiddleware, // lets us dispatch() functions
  loggerMiddleware // neat middleware that logs actions
)(createStore)

var initialState = {auth:{accessToken: null}
};

var gotInitialState = function() {
    var store = createStoreWithMiddleware(xmarkReducer, initialState)

    var rootElement = document.getElementById('xmark')

    ReactDOM.render(
      <Provider store={store}>
        <XmarkApp />
      </Provider>,
      rootElement
    );
};

try {
  var authCallback = function(token) {
    initialState.auth.accessToken = token;
    if (token) {
      var bookmarksCallback = function(xmarksFileId, responseText) {
        console.log("init state: " + responseText);
        initialState.auth.bookmarksFileId = xmarksFileId;
        initialState.auth.bookmarksBlob = responseText;
        gotInitialState();
      };
      fetchBookmarks(token, bookmarksCallback);
    }
    else {
      gotInitialState();
    }
  };
  chrome.identity.getAuthToken({interactive: false}, authCallback);
} catch(e) {
  console.log(e);
}

