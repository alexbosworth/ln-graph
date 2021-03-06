const {rawChanId} = require('bolt07');

const {activityDb} = require('./constants');
const {chainId} = require('./../chains');
const {dateForDecrementingNumber} = require('./../dates');
const {decrementingNumberForDate} = require('./../dates');
const {lmdb} = require('./../lmdb');
const {queryLmdb} = require('./../lmdb');

/** Get the history of an edge

  {
    [after]: <After ISO 8601 Date String>
    channel: <Standard Format Channel Id String>
    [limit]: <Limit Number>
    lmdb_path: <LMDB Path String>
    network: <Network Name String>
    to_public_key: <Public Key Hex String>
  }

  @throws
  <Error>

  @returns
  {
    attempts: [{
      attempted_at: <Attempted At ISO 8601 Date String>
      tokens: <Tokens Number>
      type: <Type String>
    }]
  }
*/
module.exports = args => {
  if (!args.channel) {
    throw new Error('ExpectedChannelIdForEdgeHistoryQuery');
  }

  if (!args.lmdb_path) {
    throw new Error('ExpectedLmdbPathForEdgeHistoryQuery');
  }

  if (!args.network) {
    throw new Error('ExpectedNetworkForEdgeHistory');
  }

  if (!args.to_public_key) {
    throw new Error('ExpectedPublicKeyForEdgeHistory');
  }

  let chain;
  let id;
  let start;

  try {
    id = rawChanId({channel: args.channel}).id;
  } catch (err) {
    throw new Error('ExpectedValidChannelIdToGetEdgeRecords');
  }

  try {
    chain = chainId({network: args.network}).chain_id;
  } catch (err) {
    throw new Error('ExpectedValidNetworkToGetEdgeRecords');
  }

  const edge = `${args.to_public_key}${chain}${id}`;

  try {
    start = !args.after ? '' : decrementingNumberForDate({date: args.after});
  } catch (err) {
    throw new Error('FailedToDeriveStartDateForEdgeHistoryQuery');
  }

  try {
    const {items} = queryLmdb({
      db: activityDb,
      keys: {before: !start ? undefined : start.number, starts_with: edge},
      limit: args.limit,
      lmdb: lmdb({path: args.lmdb_path}),
    });

    const attempts = items.map(({key, data}) => {
      const number = key.slice(edge.length);

      try {
        return {
          attempted_at: dateForDecrementingNumber({number}).date,
          tokens: data.tokens,
          type: data.type,
        };
      } catch (err) {
        return null;
      }
    });

    return {attempts: attempts.filter(n => !!n)};
  } catch (err) {
    throw new Error('FailedToQueryEdgeHistory');
  }
}
