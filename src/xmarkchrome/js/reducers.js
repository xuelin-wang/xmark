import { combineReducers } from 'redux'
import { Set } from 'immutable'
import { START_REQUEST_AUTH, COMPLETE_REQUEST_AUTH,
  START_REVOKE_AUTH, COMPLETE_REVOKE_AUTH,
  RECEIVE_BOOKMARKSBLOB, ADD_BOOKMARK, DELETE_BOOKMARK,
  START_EDIT_BOOKMARK, COMPLETE_EDIT_BOOKMARK, CANCEL_EDIT_BOOKMARK,
  TOGGLE_COLLAPSE } from './actions.js'
import { comparePath, parseBookmarks } from './util.js'
import { updateBookmarks } from './gDocs.js'

var initialState = {
  accessToken: null
}

function auth(state = initialState, action) {
  switch (action.type) {
    case START_REQUEST_AUTH:
      return {accessToken: state.accessToken, startRequestAuth: true}
    case START_REVOKE_AUTH:
      return {accessToken: state.accessToken, startRevokeAuth: true}
    case COMPLETE_REQUEST_AUTH:
      return {
        ...state,
        accessToken: action.accessToken,
        startRequestAuth: false
      }
    case COMPLETE_REVOKE_AUTH:
      return {
        ...state,
        accessToken: null,
        startRevokeAuth: false,
        bookmarksFileId: null,
        bookmarksBlob: null
      }
    case RECEIVE_BOOKMARKSBLOB:
      return {
        ...state,
        accessToken: action.accessToken,
        bookmarksFileId: action.bookmarksFileId,
        bookmarksBlob: action.bookmarksBlob
      }
    case ADD_BOOKMARK:
      var bookmarksBlob = state.bookmarksBlob;
      var bookmarks = parseBookmarks(bookmarksBlob);
      var newBookmark = {"name": action.name, "url": action.url, "path": action.path};
      bookmarks.push(newBookmark);
      updateBookmarks(state.accessToken, state.bookmarksFileId, bookmarks, null);
      return {
        ...state,
        bookmarksBlob: JSON.stringify(bookmarks)
      }
    case START_EDIT_BOOKMARK:
      return {
        ...state,
        editingUrl: action.url
      }
    case CANCEL_EDIT_BOOKMARK:
      return {
        ...state,
        editingUrl: null
      }
    case COMPLETE_EDIT_BOOKMARK:
      var bookmarksBlob = state.bookmarksBlob;
      var bookmarks = parseBookmarks(bookmarksBlob);
      var oldUrl = action.oldUrl;
      bookmarks.forEach(function(bookmark, index) {
        if (bookmark.url == oldUrl) {
          bookmark.url = action.url;
          bookmark.name = action.name;
          bookmark.path = action.path;
        }
      });
      updateBookmarks(state.accessToken, state.bookmarksFileId, bookmarks, null);
      return {
        ...state,
        editingUrl: null,
        bookmarksBlob: JSON.stringify(bookmarks)
      }
    case DELETE_BOOKMARK:
      var bookmarksBlob = state.bookmarksBlob;
      var bookmarks = parseBookmarks(bookmarksBlob);
      var url = action.url;
      bookmarks.forEach(function(bookmark, index) {
        if (bookmark.url == url) {
          bookmarks.splice(index, 1);
        }
      });
      updateBookmarks(state.accessToken, state.bookmarksFileId, bookmarks, null);
      return {
        ...state,
        bookmarksBlob: JSON.stringify(bookmarks)
      }
    case TOGGLE_COLLAPSE:
      var collapsedPaths = state.collapsedPaths;
      if (!collapsedPaths)
        collapsedPaths = Set();
      var path = action.folderPath;
      var newCollapsedPaths;
      if (collapsedPaths.contains(path))
        newCollapsedPaths = collapsedPaths.delete(path);
      else {
        newCollapsedPaths = collapsedPaths.add(path);
      }
        
      return {
        ...state,
        collapsedPaths: newCollapsedPaths,
        clickedFolderPath: path
      }
    default:
      return state
  }
}

const xmarkReducer = combineReducers({
  auth
})

export default xmarkReducer
