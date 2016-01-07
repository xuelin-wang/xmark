import { combineReducers } from 'redux'
import { Set, Map } from 'immutable'
import { START_REQUEST_AUTH, COMPLETE_REQUEST_AUTH,
  START_REVOKE_AUTH, COMPLETE_REVOKE_AUTH,
  RECEIVE_BOOKMARKS, ADD_BOOKMARK, DELETE_BOOKMARK,
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
        bookmarks: null
      }
    case RECEIVE_BOOKMARKS:
      return {
        ...state,
        accessToken: action.accessToken,
        bookmarksFileId: action.bookmarksFileId,
        bookmarks: action.bookmarks,
        collapsedPaths: action.collapsedPaths
      }
    case ADD_BOOKMARK:
      var bookmarks = state.bookmarks;
      var newBookmark = new Map({"name": action.name, "url": action.url, "path": action.path});
      var newBookmarks = bookmarks.set(action.url, newBookmark);
      updateBookmarks(state.accessToken, state.bookmarksFileId, newBookmarks, state.collapsedPaths, null);
      return {
        ...state,
        bookmarks: newBookmarks
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
      var bookmarks = state.bookmarks;
      var oldUrl = action.oldUrl;
      var newBookmarks = bookmarks.delete(oldUrl);
      var newBookmark = new Map({url: action.url, name: action.name, path: action.path});
      newBookmarks = newBookmarks.set(action.url, newBookmark);
      updateBookmarks(state.accessToken, state.bookmarksFileId, newBookmarks, state.collapsedPaths, null);
      return {
        ...state,
        editingUrl: null,
        bookmarks: newBookmarks
      }
    case DELETE_BOOKMARK:
      var bookmarks = state.bookmarks;
      var newBookmarks = bookmarks.delete(action.url);
      updateBookmarks(state.accessToken, state.bookmarksFileId, newBookmarks, state.collapsedPaths, null);
      return {
        ...state,
        bookmarks: newBookmarks
      }
    case TOGGLE_COLLAPSE:
      var collapsedPaths = state.collapsedPaths;
      var path = action.folderPath;
      var newCollapsedPaths;
      if (collapsedPaths.contains(path)) {
        newCollapsedPaths = collapsedPaths.delete(path);
      }
      else {
        newCollapsedPaths = collapsedPaths.add(path);
      }

      updateBookmarks(state.accessToken, state.bookmarksFileId, state.bookmarks, newCollapsedPaths, null);
        
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
