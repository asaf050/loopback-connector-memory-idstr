var MemoryConnector = require('loopback-datasource-juggler/lib/connectors/memory')
var fs = require('fs'), util = require('util'), es = require('event-stream')

function FileReader () {}

FileReader.prototype.read = function (pathToFile, callback) {
  var returnTxt = ''
  var s = fs.createReadStream(pathToFile).pipe(es.split()).pipe(
    es
      .mapSync(function (line) {
        // pause the readstream
        s.pause()

        // console.log('reading line: '+line);
        returnTxt += line

        // resume the readstream, possibly from a callback
        s.resume()
      })
      .on('error', function () {
        console.log('Error while reading file.')
      })
      .on('end', function () {
        console.log('Read entire file.')
        callback(returnTxt)
      })
  )
}

FileReader.prototype.readJSON = function (pathToFile, callback) {
  try {
    this.read(pathToFile, function (txt) {
      callback(txt)
    })
  } catch (err) {
    throw new Error('json file is not valid! ' + err.stack)
  }
}

MemoryConnector.Memory.prototype.getDefaultIdType = function () {
  return String
}
MemoryConnector.Memory.prototype.collection = function (model, val) {
  model = this.getCollection(model)
  if (arguments.length > 1) this.cache[model] = val
  if (
    typeof this.cache[model] === 'undefined' ||
    typeof this.cache[model] === 'null'
  ) {
    this.cache[model] = {}
  }
  return this.cache[model]
}
MemoryConnector.Memory.prototype.loadFromFile = function (callback) {
  var self = this
  var hasLocalStorage = typeof window !== 'undefined' && window.localStorage
  var localStorage = hasLocalStorage && this.settings.localStorage

  if (self.settings.file) {
    var fileReader = new FileReader()
    fileReader.readJSON(self.settings.file, function (data) {
      parseAndLoad(data)
    })
  } else if (localStorage) {
    var data = window.localStorage.getItem(localStorage)
    data = data || '{}'
    parseAndLoad(data)
  } else {
    process.nextTick(callback)
  }

  function parseAndLoad (data) {
    if (data) {
      try {
        data = JSON.parse(data.toString())
      } catch (e) {
        return callback(e)
      }

      self.ids = data.ids || {}
      self.cache = data.models || {}
    } else {
      if (!self.cache) {
        self.ids = {}
        self.cache = {}
      }
    }
    callback && callback()
  }
}

module.exports = MemoryConnector
