var Promise = require('bluebird');
var fs      = require('fs');
var http    = require('http');
var https   = require('https');
var logger  = require('log4js').getLogger('gh-issue-export');

var exists = Promise.promisify(fs.exists);

module.exports = function(src, dest) {
  var protocol = src.match(/^https:\/\//) ? https : http;

  return new Promise(function(resolve, reject) {
    var out = fs.createWriteStream(dest);

    var res = protocol.get(src, function(res) {
      res.pipe(out);
      res.on('end', function() {
        logger.info('Downloaded file, ' + src);
        logger.info('           into  ' + dest);

        out.close();
        resolve(dest);
      });
    }).on('error', function(err) {
      logger.error('Failed to download file, ' + src);

      reject(err);
    });
  });
};
