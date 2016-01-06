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

    var tabElement = document.getElementById('xmarkTab')
    var popupElement = document.getElementById('xmark')
    var rootElement;
    if (tabElement != null) {
      rootElement = tabElement;
    }
    else {
      rootElement = popupElement;
    }

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
        initialState.auth.bookmarksFileId = xmarksFileId;
        initialState.auth.bookmarksBlob = responseText;
        chrome.tabs.query({"active": true, "lastFocusedWindow": true}, function (tabs) {
         if (tabs.length != 0 && tabs[0]) {
           var activeTab = tabs[0];
           var newUrl = activeTab.url;
           var title = activeTab.title;
           initialState.auth.activeTabUrl = newUrl;
           initialState.auth.activeTabTitle = title;
         }
         console.log("init state: ")
         console.log(initialState.auth);
         gotInitialState();
    });
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

