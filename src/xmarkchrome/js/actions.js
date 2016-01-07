import { List } from 'immutable'

export const START_REQUEST_AUTH = 'START_REQUEST_AUTH'
export const COMPLETE_REQUEST_AUTH = 'COMPLETE_REQUEST_AUTH'
export const START_REVOKE_AUTH = 'START_REVOKE_AUTH'
export const COMPLETE_REVOKE_AUTH = 'COMPLETE_REVOKE_AUTH'
export const RECEIVE_BOOKMARKS = 'RECEIVE_BOOKMARKS'
export const ADD_BOOKMARK = 'ADD_BOOKMARK'
export const START_EDIT_BOOKMARK = 'START_EDIT_BOOKMARK'
export const COMPLETE_EDIT_BOOKMARK = 'COMPLETE_EDIT_BOOKMARK'
export const CANCEL_EDIT_BOOKMARK = 'CANCEL_EDIT_BOOKMARK'
export const DELETE_BOOKMARK = 'DELETE_BOOKMARK'
export const TOGGLE_COLLAPSE = 'TOGGLE_COLLAPSE'

function startRequestAuth() {
  return {
    type: START_REQUEST_AUTH
  };
}

export function requestAuth(interactive, authCallback) {
  return dispatch => {
    dispatch(startRequestAuth())
    try {
      chrome.identity.getAuthToken({interactive: interactive}, function(token) {
        dispatch(completeRequestAuth(token));
        if (authCallback) {
          authCallback();
        }
      });
    } catch(e) {
      console.log(e);
    }
  }
}

function completeRequestAuth(accessToken) {
  return {
    type: COMPLETE_REQUEST_AUTH,
    accessToken: accessToken
  };
}

export function receiveBookmarks(xmarksFileId, bookmarks, collapsedPaths) {
  return {
    type: RECEIVE_BOOKMARKS,
    bookmarksFileId: xmarksFileId,
    bookmarks: bookmarks,
    collapsedPaths: collapsedPaths
  };
}

function toPath(pathStr) {
  var names = pathStr.split('/')
  var nonEmptyNames = new List();
  nonEmptyNames = nonEmptyNames.withMutations(arr => {
    for (var index = 0; index < names.length; index++) {
      var name = names[index];
      if (name != null && name.trim().length > 0) {
        arr.push(name.trim());
      }
    }
  });
  return nonEmptyNames;
}

export function addBookmark(url, title, pathStr) {
  var path = toPath(pathStr);
  return {
    type: ADD_BOOKMARK,
    url: url,
    name: title,
    path: path
  };
}

function startRevokeAuth() {
  return {
    type: START_REVOKE_AUTH
  };
}


var removeCachedAuthToken = function(accessToken, callback, dispatch) {
    // Remove token from the token cache.
    chrome.identity.removeCachedAuthToken({
      token: accessToken
    }, function() {
      callback && callback();
      dispatch(completeRevokeAuth());
    });
};

var revokeAuthToken = function(accessToken, callback, dispatch) {
  if (accessToken) {
    // Make a request to revoke token
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://accounts.google.com/o/oauth2/revoke?token=' +
             accessToken);
    xhr.send();
    removeCachedAuthToken(accessToken, callback, dispatch);
  }
};

export function revokeAuth(accessToken, authCallback) {
  return dispatch => {
    dispatch(startRevokeAuth())
    try {
      revokeAuthToken(accessToken, authCallback, dispatch);
    } catch(e) {
      console.log(e);
    }
  }
}

function completeRevokeAuth() {
  return {
    type: COMPLETE_REVOKE_AUTH
  };
}

export function startEditBookmark(url) {
  return {
    type: START_EDIT_BOOKMARK,
    url: url
  };
}

export function cancelEditBookmark(url) {
  return {
    type: CANCEL_EDIT_BOOKMARK,
    url: url
  };
}

export function completeEditBookmark(oldUrl, oldName, url, name, pathStr) {
  var path = toPath(pathStr);
  return {
    type: COMPLETE_EDIT_BOOKMARK,
    oldUrl: oldUrl,
    oldName: oldName,
    url: url,
    name: name,
    path: path
  };
}

export function deleteBookmark(url) {
  return {
    type: DELETE_BOOKMARK,
    url: url
  };
}

export function toggleCollapse(folderPath) {
  return {
    type: TOGGLE_COLLAPSE,
    folderPath: folderPath
  };
}

