var Promise = require('bluebird');
var _       = require('lodash');

module.exports = function(promise) {
  return function(options) {
    var all   = [];
    var page  = 1;
    var limit = 100;

    return new Promise(function resolver(resolve, reject) {
      promise(_.defaults({
        page:     page++,
        per_page: limit,
      }, options))
      .then(function(items) {
        all.push.apply(all, items);

        if (items.length < limit) {
          resolve(all);
        } else {
          resolve(new Promise(resolver));
        }
      }, reject);
    });
  };
};
