var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var helpers = require('broccoli-kitchen-sink-helpers')
var Transform = require('broccoli-transform')
var jsStringEscape = require('js-string-escape')

module.exports = Concat

Concat.prototype = Object.create(Transform.prototype)
Concat.prototype.constructor = Concat
function Concat(inputTree, options) {
  if (!(this instanceof Concat)) return new Concat(inputTree, options)
  this.inputTree = inputTree
  for (var key in options) {
    if (options.hasOwnProperty(key)) {
      this[key] = options[key]
    }
  }

  this.cache = {}
}

Concat.prototype.getWrapInEval = function () {
  // default to true for now
  return this.wrapInEval == null ? true : this.wrapInEval;
};

Concat.prototype.transform = function (srcDir, destDir) {
  var self = this
  var modulesAdded = {}
  var output = []

  // When we are done compiling, we replace this.cache with newCache, so that
  // unused cache entries are garbage-collected
  var newCache = {}

  var inputFiles = helpers.multiGlob(this.inputFiles, {cwd: srcDir})
  for (i = 0; i < inputFiles.length; i++) {
    addFile(inputFiles[i])
  }

  helpers.assertAbsolutePaths([this.outputFile])
  mkdirp.sync(path.join(destDir, path.dirname(this.outputFile)))
  fs.writeFileSync(path.join(destDir, this.outputFile), output.join(''))

  self.cache = newCache

  function addFile (filePath) {
    // This function is just slow enough that we benefit from caching
    var statsHash = helpers.hashStats(fs.statSync(srcDir + '/' + filePath), filePath)
    var cacheObject = self.cache[statsHash]
    if (cacheObject == null) { // cache miss
      var fileContents = fs.readFileSync(srcDir + '/' + filePath, { encoding: 'utf8' })
      if (self.getWrapInEval()) {
        fileContents = wrapInEval(fileContents, filePath)
      }
      cacheObject = {
        output: fileContents
      }
    }
    newCache[statsHash] = cacheObject
    output.push(cacheObject.output)
  }
}

function wrapInEval (fileContents, fileName) {
  // Should pull out copyright comment headers
  // Eventually we want source maps instead of sourceURL
  return 'eval("(function() {' +
    jsStringEscape(fileContents) +
    '})();//@ sourceURL=' + jsStringEscape(fileName) +
    '");\n';
}
