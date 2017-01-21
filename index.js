var path = require('path')
var fs = require('fs')
var express = require('express')
var app = express()

app.use(express.static('dist'))

app.get('/', function (req, res) {
  res.send('TODO: Table of Contents')
})

app.get('/:app', function (req, res) {
  var appPath = path.join(__dirname + '/src/' + req.params.app + '/index.html')
  if (fs.existsSync(appPath)) {
    res.sendFile(appPath)
  } else {
    console.error('404: ', appPath)
    res.status(404).send('Sorry, that doesn\'t exist!')
  }
})

app.listen(5000, function () {
  console.log('Listening on 5000.')
})
