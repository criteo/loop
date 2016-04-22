const path = require('path');

module.exports = {
  entry: [
    path.resolve(__dirname, 'src/main/javascript/index.js')
  ],
  output: {
    path: path.resolve(__dirname, 'target/classes/public'),
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
        include: path.join(__dirname, 'src/main/javascript')
      }
    ]
  },
  devtool: 'eval'
}
