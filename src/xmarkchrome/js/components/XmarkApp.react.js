import '../../css/bootstrap.css'
import React from 'react'
import { List, Set, fromJS, is } from 'immutable'
import { connect } from 'react-redux'
import {requestAuth, revokeAuth, receiveBookmarksBlob, addBookmark,
  startEditBookmark, completeEditBookmark, cancelEditBookmark, deleteBookmark,
  toggleCollapse } from '../actions.js'
import { fetchBookmarks } from '../gDocs.js'
import { times, parseBookmarks, getNodeName, bookmarksToTreeNodes } from '../util.js'

var XmarkFolderNode = React.createClass({
  render: function() {
    var nodeData = this.props.nodeData;
    var indentLevel = nodeData.path.length;
    var index = 0;
    var indents = times(indentLevel, function(){
      return ( <img key={index++} height="32" width="32" src="image/blank32.png" /> );
    });
    var iconLink = ( <img height="32" width="32" onClick={this.props.onToggleCollapse} src='/image/folder32.png'  /> );
    var name = getNodeName(nodeData);
    return (
      <div>
        {indents}{iconLink}<span>{name}</span>
      </div>
    );
  }
});

var XmarkNode = React.createClass({
  _urlSpan: null,
  _nameInput: null,
  _urlInput: null,

  _showHideUrlSpan: function(show) {
    if (this._urlSpan == null)
      return;
    this._urlSpan.style.visibility = show ? 'visible' : 'hidden';
  },

  render: function() {
    var nodeData = this.props.nodeData;
    var xmarkNodeThis = this;
    var name = getNodeName(nodeData);
    var url = nodeData.url;
    var iconLink;
    var handleShowUrl = function(e){xmarkNodeThis._showHideUrlSpan(true);};
    var handleHideUrl = function(e){xmarkNodeThis._showHideUrlSpan(false);};
    var indentLevel = nodeData.path.length;
    var index = 0;
    var indents = times(indentLevel, function(){
      return ( <img height="32" width="32" key={index++} src="image/blank32.png" /> );
    });
    if (nodeData.iconLink)
        iconLink = ( <img height="32" width="32" src={nodeData.iconLink} onMouseEnter={handleShowUrl} /> );
    else
        iconLink = ( <img height="32" width="32" src="/image/blank32.png" /> );
    var inEditing = this.props.inEditing;
    if (!inEditing)
      return (
        <div onMouseEnter={handleShowUrl} onMouseOut={handleHideUrl}>
           {indents} {iconLink}<a href={url}  onMouseEnter={handleShowUrl} >{name}</a><span ref={urlSpan => {xmarkNodeThis._urlSpan = urlSpan; xmarkNodeThis._showHideUrlSpan(false);}}  onMouseEnter={handleShowUrl} >{url}</span>
           <button onClick={e => xmarkNodeThis.props.beginEdit(url)}>Edit</button>
           <button onClick={e => xmarkNodeThis.props.deleteMe(url)}>X</button>
        </div>
      );
    else
      return (
        <div onMouseEnter={handleShowUrl} onMouseOut={handleHideUrl}>
           {indents} {iconLink}<input type="text" ref={nameInput => xmarkNodeThis._nameInput = nameInput} defaultValue={name} ></input>
           <input type="text" ref={urlInput => xmarkNodeThis._urlInput = urlInput} defaultValue={url} ></input>
           <button onClick={e => xmarkNodeThis.props.doneEdit(xmarkNodeThis._urlInput.value, xmarkNodeThis._nameInput.value)}>Save</button>
           <button onClick={e => xmarkNodeThis.props.cancelEdit()}>Cancel</button>
           <button onClick={e => xmarkNodeThis.props.deleteMe(url)}>X</button>
        </div>
      );
  }
});

var XmarkApp = React.createClass({
  _authorized: function() {
    return this.props.accessToken != null;
  },

  _fetchBookmarks: function(){
    var dispatch = this.props.dispatch;
    var bookmarksCallback = function(xmarksFileId, responseText) {
      console.log(responseText);
      dispatch(receiveBookmarksBlob(xmarksFileId, responseText));
    };
    fetchBookmarks(this.props.accessToken, bookmarksCallback);
  },

  _clearBookmarks: function(){},

  _toggleAuth: function(){
    var thisXmarkApp = this;
    var dispatch = this.props.dispatch;
    if (!this._authorized()) {
      dispatch(requestAuth(true, function() {
        thisXmarkApp._fetchBookmarks();
      }));
    } else {
      dispatch(revokeAuth(this.props.accessToken, function() {
        thisXmarkApp._clearBookmarks();
      }));
    }
  },

  _addBookmark: function(){
    if (!this._authorized())
      return;

    var xmarkAppThis = this;
    var dispatch = this.props.dispatch;
    chrome.tabs.query({"active": true, "lastFocusedWindow": true}, function (tabs) {
      if (tabs.length == 0 || !(tabs[0]))
        return;
      var activeTab = tabs[0];
      var newUrl = activeTab.url;
      var title = activeTab.title;
      var bookmarks = parseBookmarks(xmarkAppThis.props.bookmarksBlob);
      var exists = false;
      for (var index = 0; index < bookmarks.length; index++) {
        var bookmark = bookmarks[index];
        if (bookmark.url == newUrl) {
          exists = true;
          break;
        }
      }
      if (exists)
        return;
      dispatch(addBookmark(newUrl, title));
    });
  },

  _refresh: function(){
  },

  _isVisible: function(nodeData) {
    var collapsedPaths = this.props.collapsedPaths;
    if (!collapsedPaths)
      collapsedPaths = Set();
    var isLeaf = nodeData.url;
    var path = fromJS(nodeData.path);
    var visible = collapsedPaths.filter(tmpPath => {
      if (path.count() < tmpPath.count())
        return false;
      var check = is(tmpPath, path.slice(0, tmpPath.count()));
      if (!check)
        return false;
      if (path.count() == tmpPath.count()) {
        return isLeaf;
      }
      return true;
    }).isEmpty();
    return visible;
  },

  _close: function(){window.close();},
  render: function() {
    var authorizeLabel = this._authorized() ? "Log Out Google" : "Log In Google";
    var thisXmarkApp = this;
    var dispatch = this.props.dispatch;
    var bookmarksJson = parseBookmarks(this.props.bookmarksBlob);
    var sortedTreeNodes = bookmarksToTreeNodes(bookmarksJson);
    var editingUrl = this.props.editingUrl;
    var nodeId = 0;
    var bookmarksList = sortedTreeNodes.map(function(node) {
      var itemKey = nodeId;
      var visible = thisXmarkApp._isVisible(node);
      nodeId++;
      if (!visible)
        return null;
      if (node.url) {
        var beginEdit = function(){dispatch(startEditBookmark(node.url))};
        var doneEdit = function(newUrl, newName){dispatch(completeEditBookmark(node.url, node.name, newUrl, newName))};
        var cancelEdit = function(){dispatch(cancelEditBookmark(node.url))};
        var deleteMe = function(){dispatch(deleteBookmark(node.url))};
        var inEditing = (editingUrl == node.url);
        return (
          <li key={itemKey}><XmarkNode nodeData={node} inEditing={inEditing} beginEdit={beginEdit} doneEdit={doneEdit} cancelEdit={cancelEdit} deleteMe={deleteMe} /></li>
        );
      }
      else {
        var onToggleCollapse = function() {
          dispatch(toggleCollapse(fromJS(node.path)));
        };
        return (
          <li key={itemKey}><XmarkFolderNode nodeData={node} onToggleCollapse={onToggleCollapse} /></li>
        );
      }
    });
    return (
      <div>
        <button className="btn" onClick={thisXmarkApp._toggleAuth}>{authorizeLabel}</button>
        <button className="btn" onClick={thisXmarkApp._addBookmark}>Add Bookmark</button>
        <button className="btn" onClick={thisXmarkApp._refresh}>Refresh</button>
        <button className="btn" onClick={thisXmarkApp._close}>X</button>
        <div>
          <ul>
            {bookmarksList}
          </ul>
        </div>
      </div>
    );
  }
});

function select(state) {
  return {
    accessToken: state.auth.accessToken,
    bookmarksFileId: state.auth.bookmarksFileId,
    bookmarksBlob: state.auth.bookmarksBlob,
    editingUrl: state.auth.editingUrl,
    collapsedPaths: state.auth.collapsedPaths
  }
}

export default connect(select)(XmarkApp)
