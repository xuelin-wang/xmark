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
    var indentLevel = nodeData.path.length - 1;
    var iconLink = ( <img height="32" width="32" onClick={this.props.onClickFolder} src='/image/folder32.png'  /> );
    var name = getNodeName(nodeData);
    var leftPx = indentLevel * 32;
    var divStyle = {marginLeft: leftPx};
    return (
      <div style={divStyle}>
        {iconLink}<span>{name}</span>
      </div>
    );
  }
});

var XmarkNode = React.createClass({
  _urlSpan: null,
  _nameInput: null,
  _urlInput: null,
  _pathInput: null,

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
    var leftPx = indentLevel * 32;
    var divStyle = {
      marginLeft: leftPx,
      display: "flex",
      flexWrap: "wrap"
    };
    if (nodeData.iconLink)
        iconLink = ( <img height="32" width="32" src={nodeData.iconLink} onMouseEnter={handleShowUrl} /> );
    else
        iconLink = ( <img height="32" width="32" src="/image/blank32.png" /> );
    var inEditing = this.props.inEditing;
    var item1Style = {order:1};
    var item2Style = {order:2};
    if (!inEditing)
      return (
        <div style={divStyle} onMouseEnter={handleShowUrl} onMouseOut={handleHideUrl}>
           <div style={item1Style} >
             {iconLink}<a href={url}  onMouseEnter={handleShowUrl} >{name}</a><span ref={urlSpan => {xmarkNodeThis._urlSpan = urlSpan; xmarkNodeThis._showHideUrlSpan(false);}}  onMouseEnter={handleShowUrl} >{url}</span>
           </div>
           <div style={item2Style}>
             <button onClick={e => xmarkNodeThis.props.beginEdit(url)}>Edit</button>
             <button onClick={e => xmarkNodeThis.props.deleteMe(url)}>X</button>
           </div>
        </div>
      );
    else {
      var path = nodeData.path;
      if (!path) path = [];
      var pathStr = path.join('/');
      return (
        <div style={divStyle} className='bookmarkRow' onMouseEnter={handleShowUrl} onMouseOut={handleHideUrl}>
           <div>{iconLink}
             title: <input type="text" ref={nameInput => xmarkNodeThis._nameInput = nameInput} defaultValue={name} ></input>
             url: <input type="text" ref={urlInput => xmarkNodeThis._urlInput = urlInput} defaultValue={url} ></input>
             folder: <input type="text" ref={pathInput => xmarkNodeThis._pathInput = pathInput} defaultValue={pathStr} ></input>
           </div>
           <div><button onClick={e => xmarkNodeThis.props.doneEdit(xmarkNodeThis._urlInput.value, xmarkNodeThis._nameInput.value, xmarkNodeThis._pathInput.value)}>Save</button>
             <button onClick={e => xmarkNodeThis.props.cancelEdit()}>Cancel</button>
             <button onClick={e => xmarkNodeThis.props.deleteMe(url)}>X</button>
           </div>
        </div>
      );
    }
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

  _addPathInput: null,

  _addBookmark: function(){
    if (!this._authorized())
      return;

    var xmarkAppThis = this;
    var dispatch = this.props.dispatch;
    var pathStr = this._addPathInput.value;
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
      dispatch(addBookmark(newUrl, title, pathStr));
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
        var doneEdit = function(newUrl, newName, newPath){dispatch(completeEditBookmark(node.url, node.name, newUrl, newName, newPath))};
        var cancelEdit = function(){dispatch(cancelEditBookmark(node.url))};
        var deleteMe = function(){dispatch(deleteBookmark(node.url))};
        var inEditing = (editingUrl == node.url);
        return (
          <XmarkNode key={itemKey} nodeData={node} inEditing={inEditing} beginEdit={beginEdit} doneEdit={doneEdit} cancelEdit={cancelEdit} deleteMe={deleteMe} />
        );
      }
      else {
        var onClickFolder = function() {
          dispatch(toggleCollapse(fromJS(node.path)));
        };
        return (
          <XmarkFolderNode key={itemKey} nodeData={node} onClickFolder={onClickFolder} />
        );
      }
    });
    var clickedFolderPath = this.props.clickedFolderPath;
    if (!clickedFolderPath)
      clickedFolderPath = [];
    var addPathStr = clickedFolderPath.join('/');
    return (
      <div>
        <button className="btn" onClick={thisXmarkApp._toggleAuth}>{authorizeLabel}</button>
        <button className="btn" onClick={thisXmarkApp._addBookmark}>Add Bookmark</button>
        to path (folder names separated by '/'): <input type="text" ref={addPathInput => this._addPathInput = addPathInput} defaultValue={addPathStr} ></input>
        <button className="btn" onClick={thisXmarkApp._close}>X</button>
        <div>
            {bookmarksList}
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
    collapsedPaths: state.auth.collapsedPaths,
    clickedFolderPath: state.auth.clickedFolderPath
  }
}

export default connect(select)(XmarkApp)
