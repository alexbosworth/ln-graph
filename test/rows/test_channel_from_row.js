const {deepEqual} = require('node:assert').strict;
const test = require('node:test');

const channelFromRow = require('./../../rows/channel_from_row');

const date = new Date().toISOString();

const tests = [
  {
    args: {
      capacity: 1,
      close_height: 1,
      key: '000832300008200001',
      node1_alias: 'node1 alias',
      node1_attempted: 'success',
      node1_attempted_at: date,
      node1_attempted_tokens: 1,
      node1_base_fee_mtokens: '1',
      node1_cltv_delta: 1,
      node1_color: '#111111',
      node1_fee_rate: 1,
      node1_is_disabled: true,
      node1_min_htlc_mtokens: '1',
      node1_public_key: '11',
      node2_alias: 'node2 alias',
      node2_attempted: 'temporary_channel_failure',
      node2_attempted_at: date,
      node2_attempted_tokens: 2,
      node2_base_fee_mtokens: '2',
      node2_cltv_delta: 2,
      node2_color: '#222222',
      node2_fee_rate: 2,
      node2_is_disabled: false,
      node2_min_htlc_mtokens: '2',
      node2_public_key: '22',
      transaction_id: '00',
      transaction_vout: 0,
      updated_at: date,
    },
    description: 'Channel is mapped from row',
    expected: {
      channel: {
        capacity: 1,
        close_height: 1,
        id: '537136x2080x1',
        policies: [
          {
            alias: 'node1 alias',
            attempted: 'success',
            attempted_at: date,
            attempted_tokens: 1,
            base_fee_mtokens: '1',
            cltv_delta: 1,
            color: '#111111',
            fee_rate: 1,
            is_disabled: true,
            min_htlc_mtokens: '1',
            public_key: '11',
          },
          {
            alias: 'node2 alias',
            attempted: 'temporary_channel_failure',
            attempted_at: date,
            attempted_tokens: 2,
            base_fee_mtokens: '2',
            cltv_delta: 2,
            color: '#222222',
            fee_rate: 2,
            is_disabled: false,
            min_htlc_mtokens: '2',
            public_key: '22'
          },
        ],
        transaction_id: '00',
        transaction_vout: 0,
        updated_at: date,
      },
    },
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, (t, end) => {
    const {channel} = channelFromRow(args);

    deepEqual(channel, expected.channel, 'Channel is derived from row');

    return end();
  });
});
