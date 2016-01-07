import { fromJS, List, Set, Map } from 'immutable'

export function times(n, iterator) {
  var accum = Array(n);
  for (var i = 0; i < n; i++) accum[i] = iterator.call();
  return accum;
}

export function parseBookmarks(bookmarksBlob) {
  if (bookmarksBlob == null || bookmarksBlob.trim().length == 0)
    bookmarksBlob = '{"bookmarks":[], "collapsedPaths":[]}';
  var jsObj = JSON.parse(bookmarksBlob);
  var immuObj = fromJS(jsObj);
  var bookmarks = immuObj.get("bookmarks", new List());
  var collapsedPaths = immuObj.get("collapsedPaths", new List());
  var bookmarksMap = new Map();
  bookmarksMap = bookmarksMap.withMutations(theMap => {
    bookmarks.forEach(function(bookmark, index, arr){
      theMap.set(bookmark.get("url"), bookmark);
    });
  });

  var collapsedPathsSet = new Set();
  collapsedPathsSet = collapsedPathsSet.withMutations(theSet => {
    collapsedPaths.forEach(function(val, index, arr){
      theSet.add(val);
    });
  });

  return [bookmarksMap, collapsedPathsSet];
}

export function getNodeName(node) {
  var url = node.url;
  if (url)
    return node.name ? node.name : url;
  else
    return node.path.get(node.path.count() - 1);
}

function compareStr(str1, str2) {
  var lower1 = str1.toLowerCase();
  var lower2 = str2.toLowerCase();
  return lower1.localeCompare(lower2);
}

export function comparePath(path1, path2)
{
  var check = comparePathElems(path1, path2);
  if (check != 0)
    return check;
  return path1.count() - path2.count();
}

function comparePathElems(path1, path2)
{
  var minLen = Math.min(path1.count(), path2.count());
  for (var index = 0; index < minLen; index++) {
    var check = compareStr(path1.get(index), path2.get(index));
    if (check != 0)
      return check;
  }
  return 0;
}

function compareNode(node1, node2) {
  var path1 = node1.path;
  var path2 = node2.path;
  var pathCheck = comparePathElems(path1, path2);
  if (pathCheck != 0)
    return pathCheck;

  var lenCheck = node1.path.count() - node2.path.count();
  var isLeaf1 = node1.url;
  var isLeaf2 = node2.url;

  if (!isLeaf1 && !isLeaf2) {
    return lenCheck;
  }
  if (isLeaf1 && isLeaf2) {
    if (lenCheck != 0)
      return -lenCheck;
    var name1 = getNodeName(node1);
    var name2 = getNodeName(node2);
    return compareStr(name1, name2);
  }
  else {
    return isLeaf1 ? 1 : -1;
  }
}

function mkFolderNode(path) {
  return {path: path};
}

function mkLeafNode(path, url, name) {
  return {path: path, url: url, name: name};
}

function findNode(node, sortedNodes) {
  for (var index = 0; index < sortedNodes.length; index++) {
    var tmpNode = sortedNodes[index];
    var check = compareNode(node, tmpNode);
    if (check < 0)
      return -index - 1;
    if (check == 0)
      return index;
  }
  return -sortedNodes.length - 1;
}

export function bookmarksToTreeNodes(bookmarksMap) {
  var sortedNodes = [];
  bookmarksMap.forEach(function(bookmark) {
    var path = bookmark.get("path");
    if (!path)
      path = new List();
    path.forEach(function(name, index, arr) {
      var node = mkFolderNode(path.slice(0, index + 1));
      var nodeIndex = findNode(node, sortedNodes);
      if (nodeIndex < 0) {
        sortedNodes.splice(-nodeIndex - 1, 0, node);
      }
    });
    var node = mkLeafNode(path, bookmark.get("url"), bookmark.get("name", null));
    var nodeIndex = findNode(node, sortedNodes);
    if (nodeIndex < 0) {
      sortedNodes.splice(-nodeIndex - 1, 0, node);
    }
  });
  return sortedNodes;
}

