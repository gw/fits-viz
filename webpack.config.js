module.exports = {
    entry: {
      1: './src/1/app.js',
      2: './src/2/app.js',
      3: './src/3/app.js',
      4: './src/4/app.js',
      5: './src/5/app.js',
      6: './src/6/app.js',
      7: './src/7/app.js',
      8: './src/8/app.js',
    },
    output: {
        path: './dist',
        filename: '[name].bundle.js'
    },
    module: {
         loaders: [{
             test: /\.js$/,
             exclude: /node_modules/,
             loader: 'babel-loader'
         }]
     }
};
