const {getChannelHistory} = require('./records');
const {getSpendActivity} = require('./records');
const {recordSpendActivity} = require('./records');
const {updateChannel} = require('./records');
const {updateNode} = require('./records');

module.exports = {
  getChannelHistory,
  getSpendActivity,
  recordSpendActivity,
  updateChannel,
  updateNode,
};

