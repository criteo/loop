const path = require('path');

module.exports = {
  entry: [
    path.resolve(__dirname, 'app/javascripts/index.js')
  ],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js'
  },
  resolve: {
    extensions: ['', '.js']
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        query: {
          cacheDirectory: true,
          presets: ['es2015']
        },
        include: path.join(__dirname, 'app/javascript')
      }
    ]
  },
  devtool: 'eval'
}
