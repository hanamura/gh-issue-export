var marked  = require('marked');

marked.setOptions({
  gfm: true,
  tables: true,
  breaks: true,
});

module.exports = function(input) {
  return marked(input);
};
module.exports.safe = true;
