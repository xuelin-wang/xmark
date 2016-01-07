import React from 'react'
import { List, Set, Immutable, is } from 'immutable'
import { connect } from 'react-redux'
import {requestAuth, revokeAuth, receiveBookmarks, addBookmark,
  startEditBookmark, completeEditBookmark, cancelEditBookmark, deleteBookmark,
  toggleCollapse } from '../actions.js'
import { fetchBookmarks } from '../gDocs.js'
import { times, parseBookmarks, getNodeName, bookmarksToTreeNodes } from '../util.js'
import { Row, Col, Grid, ButtonToolbar, Button, Input } from 'react-bootstrap'

var XmarkFolderNode = React.createClass({
  render: function() {
    var nodeData = this.props.nodeData;
    var indentLevel = nodeData.path.count() - 1;
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
    var indentLevel = nodeData.path.count();
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
    var item1Style = {order:1}; var item2Style = {order:2};
    if (!inEditing)
      return (
        <div>
        <div style={divStyle} >
           <div style={item1Style} >
             {iconLink}<a href={url} title={url} >{name}</a>
           </div>
           <div style={item2Style}>
             <img height="32" width="32" src='/image/blank32.png'  />
             <div className="btn-group btn-group-xs">
               <Button bsSize="small" onClick={e => xmarkNodeThis.props.beginEdit(url)}>Edit</Button>
             </div> 
             <div className="btn-group btn-group-xs">
               <Button bsSize="small" onClick={e => xmarkNodeThis.props.deleteMe(url)}>X</Button>
             </div> 
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
             <div className="btn-group btn-group-xs">
              <Button bsSize="small" onClick={e => xmarkNodeThis.props.doneEdit(xmarkNodeThis._urlInput.value, xmarkNodeThis._nameInput.value, xmarkNodeThis._pathInput.value)}>Save</Button>
             </div> 
             <div className="btn-group btn-group-xs">
             <Button bsSize="small" onClick={e => xmarkNodeThis.props.cancelEdit()}>Cancel</Button>
             </div> 
             <div className="btn-group btn-group-xs">
             <Button bsSize="small" onClick={e => xmarkNodeThis.props.deleteMe(url)}>X</Button>
             </div>
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

  _openMeInTab: function() {
    chrome.tabs.create({'url': chrome.extension.getURL('xmark.html')}, function(tab) {
      // Tab opened.
    })
  },

  _authorized: function() {
    return this.props.accessToken != null;
  },

  _fetchBookmarks: function(){
    var dispatch = this.props.dispatch;
    var bookmarksCallback = function(xmarksFileId, responseText) {
      console.log(responseText);
      var bookmarks = parseBookmarks(responseText);
      dispatch(receiveBookmarks(xmarksFileId, bookmarks));
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
console.log("addPathStr = " + addPathStr);
console.log("stat addPathStr = " + this.state.addPathStr);
    var addUrl = this._addUrlInput.value;
console.log("addUrl = " + addUrl);
    var addTitle = this._addTitleInput.value;
console.log("addTitle = " + addTitle);
    var bookmarks = xmarkAppThis.props.bookmarks;
    var bookmark = bookmarks.get(addUrl, null);
    if (bookmark != null)
      return;
    dispatch(addBookmark(addUrl, addTitle, addPathStr));
  },

  _refresh: function(){
  },

  _isVisible: function(nodeData) {
    var collapsedPaths = this.props.collapsedPaths;
    var isLeaf = nodeData.url;
    var path = nodeData.path;
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
    var bookmarksMap = this.props.bookmarks;
    var sortedTreeNodes = bookmarksToTreeNodes(bookmarksMap);
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
          dispatch(toggleCollapse(node.path));
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
    var isTab = (document.getElementById("xmarkTab") != null);
    var openTabButton;
    if (isTab)
      openTabButton = (
        <span />
      );
    else
      openTabButton = (
          <Button bsSize="small" onClick={thisXmarkApp._openMeInTab}>Open in tab</Button>
      );
    return (
      <div>
          <ButtonToolbar>
            {openTabButton}
            <Button bsSize="small" onClick={thisXmarkApp._toggleAuth}>{authorizeLabel}</Button>
            <Button bsSize="small" onClick={thisXmarkApp._close}>Close</Button>
          </ButtonToolbar>

<Grid>
  <Row>
    <Col xs={12} sm={12} md={12}>
          <Button bsSize="small" onClick={thisXmarkApp._addBookmark}>Add Bookmark</Button> 
    </Col>
  </Row>
  <Row>
    <Col xs={12} sm={6} md={4}>
          url: <input type="text" ref={addUrlInput => this._addUrlInput = addUrlInput} onChange={e => thisXmarkApp.setState({activeTabUrl: e.target.value})} defaultValue={addUrl}></input>
    </Col>
    <Col xs={12} sm={6} md={4}>
          title: <input type="text" ref={addTitleInput => this._addTitleInput = addTitleInput} onChange={e => thisXmarkApp.setState({activeTabTitle: e.target.value})} defaultValue={addTitle}></input>
    </Col>
    <Col xs={12} sm={6} md={4}>
          Path(delimited by /): <input type="text" ref={addPathInput => this._addPathInput = addPathInput} onChange={e => thisXmarkApp.setState({addPathStr: e.target.value})} defaultValue={addPathStr} ></input>
    </Col>
  </Row>
</Grid>
  <hr />
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
    bookmarks: state.auth.bookmarks,
    editingUrl: state.auth.editingUrl,
    collapsedPaths: state.auth.collapsedPaths,
    clickedFolderPath: state.auth.clickedFolderPath,
    activeTabUrl: state.auth.activeTabUrl,
    activeTabTitle: state.auth.activeTabTitle
  }
}

export default connect(select)(XmarkApp)
