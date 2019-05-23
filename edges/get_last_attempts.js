const asyncAuto = require('async/auto');
const asyncMapSeries = require('async/mapSeries');
const {returnResult} = require('asyncjs-util');

const {getAllChannels} = require('./../records');
const getEdgeHistory = require('./get_edge_history');

/** Get the last edge attempts for all edges

  {
    [after]: <Attempts After ISO 8601 Date String>
    lmdb_path: <LMDB Path String>
    [min_capacity]: <Minimum Capacity Tokens Number>
    network: <Network Name String>
  }

  @returns via cbk
  {
    edges: [{
      attempt: <Attempt Result Type String>
      channel: <Standard Format Channel Id String>
      from_public_key: <Payment From Source Public Key Hex String>
      to_public_key: <Payment To Destination Public Key Hex String>
    }]
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!args.lmdb_path) {
        return cbk([400, 'ExpectedLmdbPathToGetLastEdgeAttempts']);
      }

      if (!args.network) {
        return cbk([400, 'ExpectedNetworkToGetLastEdgeAttempts']);
      }

      return cbk();
    },

    // Get all the channels
    getChannels: ['validate', ({}, cbk) => {
      try {
        const {channels} = getAllChannels({
          lmdb_path: args.lmdb_path,
          min_capacity: args.min_capacity || undefined,
          network: args.network,
        });

        return cbk(null, {channels});
      } catch (err) {
        return cbk([500, 'FailedToGetChannelsToFetchLastAttempts', err]);
      }
    }],

    // Get channel edges
    getEdges: ['getChannels', ({getChannels}, cbk) => {
      return asyncMapSeries(getChannels.channels, (channel, cbk) => {
        return asyncMapSeries(channel.policies, (policy, cbk) => {
          const pubKey = policy.public_key;

          const peer = channel.policies.find(n => n.public_key !== pubKey);

          if (!peer || !pubKey) {
            return cbk();
          }

          return getEdgeHistory({
            after: args.after,
            channel: channel.id,
            limit: [pubKey].length,
            lmdb_path: args.lmdb_path,
            network: args.network,
            to_public_key: pubKey,
          },
          (err, res) => {
            if (!!err) {
              return cbk(err);
            }

            return cbk(null, {
              channel: channel.id,
              attempts: res.attempts,
              from_public_key: peer.public_key,
              to_public_key: policy.public_key,
            });
          });
        },
        (err, res) => {
          if (!!err) {
            return cbk(err);
          }

          const edges = res
            .filter(n => !!n)
            .map(n => {
              const [attempt] = n.attempts;

              if (!attempt) {
                return null;
              }

              return {
                attempt: attempt.type,
                channel: n.channel,
                from_public_key: n.from_public_key,
                to_public_key: n.to_public_key,
              };
            })
            .filter(n => !!n);

          return !edges.length ? cbk() : cbk(null, edges);
        });
      },
      cbk);
    }],

    // Edges
    edges: ['getEdges', ({getEdges}, cbk) => {
      const edges = [].concat(...getEdges.filter(n => !!n));

      return cbk(null, {edges})
    }],
  },
  returnResult({of: 'edges'}, cbk));
};
