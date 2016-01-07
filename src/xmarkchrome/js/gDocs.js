/*
Copyright 2012 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Author: Eric Bidelman (ericbidelman@chromium.org)
*/

function queryGdrive(accessToken, apiUrl, method, isUpload, headers, data, callback) {
  var SCOPE = 'https://www.googleapis.com/' + (isUpload ? 'upload/' : '') + 'drive/v3/';
  var url = SCOPE + apiUrl;

  var xhr = new XMLHttpRequest();

  xhr.open(method, url, true);

  // Include common headers (auth and version) and add rest.
  xhr.setRequestHeader('Authorization', 'Bearer ' +accessToken);
  if (headers != null) {
    for (var key in headers) {
      xhr.setRequestHeader(key, headers[key]);
    }
  }

  xhr.onload = function(e) {
    try {
      if (callback) {
        callback(xhr.responseText);
      }
    }
    catch(e) {
      console.log(e);
    }
  };
  xhr.onerror = function(e) {
    console.log(this, this.status, this.response,
                this.getAllResponseHeaders());
  };
  xhr.send(data);
}

function findBookmarksFile(accessToken, xmarksCallback) {
  var q = "name = '__xmarks__' and 'root' in parents";
  var fields = "files(id,modifiedTime,name,parents)";
  var apiUrl = "files?q=" + encodeURIComponent(q) + "&corpus=user&spaces=drive&" +
    "fields=" + encodeURIComponent(fields);

  var callback = function(responseText) {
    var jsonResp = JSON.parse(responseText);
    if (jsonResp.files && jsonResp.files.length > 0) {
      var xmarksFileId = jsonResp.files[0].id;
      xmarksCallback(accessToken, xmarksFileId, false);
    }
    else {
      var createCallback = function(createRespText, theFileId) {
        xmarksCallback(accessToken, theFileId, true);
      };
      createBookmarks(accessToken, createCallback);
    }
  }
  queryGdrive(accessToken, apiUrl, "GET", false, null, null, callback);
}

export function fetchBookmarks(accessToken, processBookmarksContent){
    var bookmarksCallback = function(accessToken, xmarksFileId, isNew) {
      if (isNew) {
        processBookmarksContent(xmarksFileId, '[]');
        return;
      }
      var exportCallback = function(content) {
        var startIndex = content.indexOf("{");
        var jsonContent;
        if (startIndex < 0)
            jsonContent = content;
        else {
          var endIndex = content.lastIndexOf("}");
          jsonContent = content.substring(startIndex, endIndex + 1);
        }
        processBookmarksContent(xmarksFileId, jsonContent);
      }
      exportGdriveFile(accessToken, xmarksFileId, 'text/plain', exportCallback);
    };
    findBookmarksFile(accessToken, bookmarksCallback);
}

function getGdriveFileMetadata(accessToken, fileId, callback) {
  var apiUrl = "files/" + fileId;

  queryGdrive(accessToken, apiUrl, "GET", false, null, null, callback);
}

function exportGdriveFile(accessToken, fileId, mimeType, callback) {
  var apiUrl = "files/" + fileId + "/export?" + "mimeType=" + encodeURIComponent(mimeType);

  queryGdrive(accessToken, apiUrl, "GET", false, null, null, callback);
}

function updateGdriveFile(accessToken, fileId, blob, callback) {
  var apiUrl = "files/" + fileId + "?uploadType=media";
  var data = new FormData();
  data.append("data", blob);
  queryGdrive(accessToken, apiUrl, "PATCH", true, null, data, callback);
}

function renameGdriveFile(accessToken, fileId, name, renameCallback) {
  var apiUrl = "files/" + fileId;
  var data = new FormData();
  data.append("title", name);
  data.append("name", name);
  var callback = function(respText) {
    renameCallback(respText, fileId);
  };
  var headers = {};
  queryGdrive(accessToken, apiUrl, "POST", true, headers, data, callback);
}

export function updateBookmarks(accessToken, fileId, bookmarksMap, collapsedPathsSet, callback) {
  var bookmarksJsObj = bookmarksMap.toList().toJS();
  var collapsedPathsJsObj = collapsedPathsSet.toJS();
  var jsObj = {bookmarks: bookmarksJsObj, collapsedPaths: collapsedPathsJsObj};
  var blob = new Blob([JSON.stringify(jsObj)], {type: 'text/plain'});
  updateGdriveFile(accessToken, fileId, blob, callback);
}

function createGdriveFile(accessToken, mimeType, name, callback) {
  var apiUrl = "files";
  var headers = {"Content-type": "application/json; charset=UTF-8"};
  var dataJson = {
    "mimeType": mimeType,
    "name": name
  };
  var data = JSON.stringify(dataJson);
  var newCallback = function(respText) {
    var createResp = JSON.parse(respText);
    var newFileId = createResp.id;
    callback(respText, newFileId);
//    renameGdriveFile(accessToken, newFileId, name, callback);
  };
  queryGdrive(accessToken, apiUrl, "POST", false, headers, data, callback);
}

function createBookmarks(accessToken, createCallback) {
  createGdriveFile(accessToken, "application/vnd.google-apps.document", "__xmarks__", createCallback);
}
