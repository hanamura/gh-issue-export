var Github  = require('github');
var Promise = require('bluebird');
var logger  = require('log4js').getLogger('gh-issue-export');

var greedify = require('./greedify');

module.exports = function(options, callback) {
  logger.info('Fetching issues...');

  var client             = new Github({version: '3.0.0'});
  var promiseIssues      = Promise.promisify(client.issues.repoIssues);
  var promiseComments    = Promise.promisify(client.issues.getComments);
  var promiseAllIssues   = greedify(promiseIssues);
  var promiseAllComments = greedify(promiseComments);

  options.token && client.authenticate({
    type:  'token',
    token: options.token,
  });

  var promise = promiseAllIssues({
    user:  options.user,
    repo:  options.repo,
    state: 'all',
  })
  .then(function(issues) {
    logger.info('Fetched ' + issues.length + ' issues');
    logger.info('Fetching issue comments...');

    var promises = issues.map(function(issue) {
      return new Promise(function(resolve, reject) {
        if (!issue.comments) {
          return resolve([issue]);
        }
        promiseAllComments({
          user:   options.user,
          repo:   options.repo,
          number: issue.number,
        })
        .then(function(comments) {
          logger.info('Fetched ' + comments.length + ' issue comments');

          resolve([issue].concat(comments));
        }, reject);
      });
    });
    return Promise.all(promises);
  });

  if (callback) {
    promise.then(function(issues) {
      logger.info('Fetched all issues and issue comments');

      callback(null, issues);
    }).catch(function(err) {
      logger.error('Failed to fetch all issues and issue comments');

      callback(err);
    });
  } else {
    return promise;
  }
};
