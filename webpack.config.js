module.exports = {
    entry: {
      1: './src/1/app.js',
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
