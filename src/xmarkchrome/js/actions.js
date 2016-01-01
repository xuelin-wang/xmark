export const START_REQUEST_AUTH = 'START_REQUEST_AUTH'
export const COMPLETE_REQUEST_AUTH = 'COMPLETE_REQUEST_AUTH'
export const START_REVOKE_AUTH = 'START_REVOKE_AUTH'
export const COMPLETE_REVOKE_AUTH = 'COMPLETE_REVOKE_AUTH'
export const RECEIVE_BOOKMARKSBLOB = 'RECEIVE_BOOKMARKSBLOB'
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

export function receiveBookmarksBlob(xmarksFileId, bookmarksBlob) {
  return {
    type: RECEIVE_BOOKMARKSBLOB,
    bookmarksFileId: xmarksFileId,
    bookmarksBlob: bookmarksBlob
  };
}

export function addBookmark(url, title) {
  return {
    type: ADD_BOOKMARK,
    url: url,
    name: title
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

export function completeEditBookmark(oldUrl, oldName, url, name) {
  return {
    type: COMPLETE_EDIT_BOOKMARK,
    oldUrl: oldUrl,
    oldName: oldName,
    url: url,
    name: name
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

