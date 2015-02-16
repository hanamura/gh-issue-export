var Promise = require('bluebird');
var fs      = require('fs');

var readFile = Promise.promisify(fs.readFile);

module.exports = function(paths) {
  paths = paths.slice(0);

  return new Promise(function resolver(resolve, reject) {
    var path = paths.shift();

    if (!path) {
      reject();
    }
    readFile(path, {flags: 'r+'})
    .then(function(data) {
      resolve(data);
    })
    .catch(function(err) {
      resolve(new Promise(resolver));
    });
  });
};
