var webpack = require('webpack');
var path = require('path');

var BUILD_DIR = path.resolve(__dirname, '.');
var JS_DIR = path.resolve(__dirname, 'js');

var config = {
  module: {
    loaders: [
      {
        test: /\.jsx?/,
        include: BUILD_DIR,
        loader: 'babel'
      },
      {
        test: /\.css$/,
        loader: "style!css"
      }
    ]
  },
  entry: JS_DIR + '/main.js',
  output: {
    path: JS_DIR,
    filename: 'bundle.js'
  }
};

module.exports = config;
