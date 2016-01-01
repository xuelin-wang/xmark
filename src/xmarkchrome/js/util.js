export function times(n, iterator) {
  var accum = Array(n);
  for (var i = 0; i < n; i++) accum[i] = iterator.call();
  return accum;
}

export function parseBookmarks(bookmarksBlob) {
  if (bookmarksBlob == null)
    bookmarksBlob = '[]';
  return JSON.parse(bookmarksBlob);
}

export function getNodeName(node) {
  var url = node.url;
  if (url)
    return node.name ? node.name : url;
  else
    return node.path[node.path.length - 1];
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
  return path1.length - path2.length;
}

function comparePathElems(path1, path2)
{
  var minLen = Math.min(path1.length, path2.length);
  for (var index = 0; index < minLen; index++) {
    var check = compareStr(path1[index], path2[index]);
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

  var lenCheck = node1.path.length - node2.path.length;
  var isLeaf1 = node1.url;
  var isLeaf2 = node2.url;

  if (!isLeaf1 && !isLeaf2) {
    return lenCheck;
  }
  if (isLeaf1 && isLeaf2) {
    if (lenCheck != 0)
      return -lenCheck;
    return compareStr(node1.url, node2.url);
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

export function bookmarksToTreeNodes(bookmarks) {
  var sortedNodes = [];
  bookmarks.map(function(bookmark) {
    var path = bookmark.path;
    if (!path)
      path = [];
    if (path.length > 0) {
      for (var index = path.length - 1; index >= 0; index--) {
        var node = mkFolderNode(path.slice(0, index + 1));
        var nodeIndex = findNode(node, sortedNodes);
        if (nodeIndex >= 0) {
          break;
        }
        sortedNodes.splice(-nodeIndex - 1, 0, node);
      }
    }
    var node = mkLeafNode(path, bookmark.url, bookmark.name);
    var nodeIndex = findNode(node, sortedNodes);
    if (nodeIndex < 0) {
      sortedNodes.splice(-nodeIndex - 1, 0, node);
    }
  });
  return sortedNodes;
}

