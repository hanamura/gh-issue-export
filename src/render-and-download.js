var Promise = require('bluebird');
var _       = require('lodash');
var cheerio = require('cheerio');
var crypto  = require('crypto');
var fs      = require('fs');
var logger  = require('log4js').getLogger('gh-issue-export');
var mkdirp  = require('mkdirp');
var path    = require('path');
var sprintf = require('sprintf-js').sprintf;
var swig    = require('swig');

var download    = require('./download');
var findAndRead = require('./find-and-read');

var readFile   = Promise.promisify(fs.readFile);
var writeFile  = Promise.promisify(fs.writeFile);
var makeDir    = Promise.promisify(mkdirp);
var renderFile = Promise.promisify(swig.renderFile);

swig.setFilter('markdown', require('./swig-markdown'));

module.exports = function(issues, dest, callback) {

  // filter
  // ======

  var filter = function(src, callback) {
    if (!src.match(/^https?:\/\//)) {
      return callback(src, []);
    }

    logger.info('Found image file, ' + src);

    var sha1 = crypto.createHash('sha1');
    sha1.update(src);
    var hash     = sha1.digest('hex');
    var extname  = path.extname(src);
    var filename = hash + extname;
    var filepath = path.join(dest, filename);

    callback(filename, download(src, filepath));
  };

  // render and download promise
  // ===========================

  var styleGithubPaths    = [];
  var styleNormalizePaths = [];
  module.paths.forEach(function(modulePath) {
    styleGithubPaths.push(path.join(modulePath, 'github-markdown-css/github-markdown.css'));
    styleNormalizePaths.push(path.join(modulePath, 'normalize.css/normalize.css'));
  });

  var promise = Promise.all([
    findAndRead(styleGithubPaths),
    findAndRead(styleNormalizePaths),
    makeDir(dest),
  ])
  .then(function(res) {
    logger.info('Created directory, ' + path.resolve(dest));

    var digit          = issues.length.toString().length;
    var styleGithub    = res[0];
    var styleNormalize = res[1];

    var promises = issues.map(function(comments) {
      var issue = _.clone(comments[0]);
      issue.comments       = comments;
      issue.styleGithub    = styleGithub;
      issue.styleNormalize = styleNormalize;

      var filename = sprintf(
        '#%0' + String(digit) + 'd-%s.html',
        issue.number,
        issue.title.trim().replace(/\s+/g, '-'));
      var filepath = path.join(dest, filename);

      return renderFile(path.resolve(__dirname, '../tmpl/issue.html'), issue)
      .then(function(html) {
        var promises = [];
        var $ = cheerio.load(html);

        $('img[src^="http"]').each(function() {
          var $el = $(this);
          filter($el.attr('src'), function(src, promise) {
            $el.attr('src', src);
            promises.push(promise);
          });
        });

        promises.push(writeFile(filepath, $.html()));

        return Promise.all(promises);
      })
    });

    return Promise.all(promises);
  });

  // callback
  // ========

  if (callback) {
    promise.then(function(res) {
      logger.info('Rendered issues and downloaded image files');

      callback(null);
    }).catch(function(err) {
      logger.info('Failed to render and download');

      callback(err);
    });
  } else {
    return promise;
  }
};
