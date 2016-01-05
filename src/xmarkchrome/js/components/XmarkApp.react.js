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
    var folderStyle = {cursor: "pointer"};
    var iconLink = ( <img title="Click to toggle collapse" style={folderStyle} height="32" width="32" onClick={this.props.onClickFolder} src='/image/folder32.png'  /> );
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
  _nameInput: null,
  _urlInput: null,
  _pathInput: null,

  render: function() {
    var nodeData = this.props.nodeData;
    var xmarkNodeThis = this;
    var name = getNodeName(nodeData);
    var url = nodeData.url;
    var iconLink;
    var indentLevel = nodeData.path.length;
    var leftPx = indentLevel * 32;
    var divStyle = {
      marginLeft: leftPx,
      display: "flex",
      flexWrap: "wrap"
    };
    var newInputsDivStyle = {
      marginLeft: leftPx
    };
    if (nodeData.iconLink)
        iconLink = ( <img height="32" width="32" src={nodeData.iconLink} /> );
    else
        iconLink = ( <img height="32" width="32" src="/image/blank32.png" /> );
    var inEditing = this.props.inEditing;
    var item1Style = {order:1};
    var item2Style = {order:2};
    if (!inEditing)
      return (
        <div>
        <div style={divStyle} >
           <div style={item1Style} >
             {iconLink}<a href={url} title={url} >{name}</a>
           </div>
           <div style={item2Style}>
             <img height="32" width="32" src='/image/blank32.png'  />
             <button onClick={e => xmarkNodeThis.props.beginEdit(url)}>Edit</button>
             <button onClick={e => xmarkNodeThis.props.deleteMe(url)}>X</button>
           </div>
        </div>
        </div>
      );
    else {
      var path = nodeData.path;
      if (!path) path = [];
      var pathStr = path.join('/');
      return (
        <div>
        <div style={divStyle} className='bookmarkRow' >
           <div>{iconLink}
             title: <input type="text" ref={nameInput => xmarkNodeThis._nameInput = nameInput} defaultValue={name} ></input>
           </div>
           <div>
              <img height="32" width="32" src='/image/blank32.png'  />
              <button onClick={e => xmarkNodeThis.props.doneEdit(xmarkNodeThis._urlInput.value, xmarkNodeThis._nameInput.value, xmarkNodeThis._pathInput.value)}>Save</button>
             <button onClick={e => xmarkNodeThis.props.cancelEdit()}>Cancel</button>
             <button onClick={e => xmarkNodeThis.props.deleteMe(url)}>X</button>
           </div>
        </div>
        <div style={newInputsDivStyle} >
             url: <input type="text" ref={urlInput => xmarkNodeThis._urlInput = urlInput} defaultValue={url} ></input>
             folder: <input type="text" ref={pathInput => xmarkNodeThis._pathInput = pathInput} defaultValue={pathStr} ></input>
        </div>
        </div>
      );
    }
  }
});

var XmarkApp = React.createClass({
  getInitialState: function(){
    return {};
  },

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
  _addUrlInput: null,

  _addBookmark: function(){
    if (!this._authorized())
      return;

    var xmarkAppThis = this;
    var dispatch = this.props.dispatch;
    var addPathStr = this._addPathInput.value;
    var addUrl = this._addUrlInput.value;
    var addTitle = this._addTitleInput.value;
    var bookmarks = parseBookmarks(xmarkAppThis.props.bookmarksBlob);
    var exists = false;
    for (var index = 0; index < bookmarks.length; index++) {
      var bookmark = bookmarks[index];
      if (bookmark.url == addUrl) {
        exists = true;
        break;
      }
    }
    if (exists)
      return;
    dispatch(addBookmark(addUrl, addTitle, addPathStr));
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
          thisXmarkApp.setState({addPathStr: null});
          dispatch(toggleCollapse(fromJS(node.path)));
        };
        return (
          <XmarkFolderNode key={itemKey} nodeData={node} onClickFolder={onClickFolder} />
        );
      }
    });
    var addPathStr = this.state.addPathStr;
    if (!addPathStr) {
      var clickedFolderPath = this.props.clickedFolderPath;
      if (!clickedFolderPath)
        clickedFolderPath = [];
      addPathStr = clickedFolderPath.join('/');
    }
    var addUrl = this.state.addUrl;
    if (!addUrl) {
      addUrl = this.props.activeTabUrl;
      if (!addUrl)
        addUrl = '';
    }
    var addTitle = this.state.addTitle;
    if (!addTitle) {
      addTitle = this.props.activeTabTitle;
      if (!addTitle)
        addTitle = '';
    }
    var topDivStyle = {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "baseline"
    };
    return (
      <div>
        <div style={topDivStyle} >
          <button className="btn" onClick={thisXmarkApp._toggleAuth}>{authorizeLabel}</button>
          <button className="btn" onClick={thisXmarkApp._addBookmark}>Add Bookmark</button> 
          url: <input type="text" ref={addUrlInput => this._addUrlInput = addUrlInput} onChange={e => thisXmarkApp.setState({activeTabUrl: e.target.value})} value={addUrl}></input>
          title: <input type="text" ref={addTitleInput => this._addTitleInput = addTitleInput} onChange={e => thisXmarkApp.setState({activeTabTitle: e.target.value})} value={addTitle}></input>
          to path (delimited by '/'): <input type="text" ref={addPathInput => this._addPathInput = addPathInput} onChange={e => thisXmarkApp.setState({addPathStr: e.target.value})} value={addPathStr} ></input>
          <button className="btn" onClick={thisXmarkApp._close}>X</button>
        </div>
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
    clickedFolderPath: state.auth.clickedFolderPath,
    activeTabUrl: state.auth.activeTabUrl,
    activeTabTitle: state.auth.activeTabTitle
  }
}

export default connect(select)(XmarkApp)
