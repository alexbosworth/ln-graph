const {test} = require('tap');

const {calculateStability} = require('./../../');

const hour = 1000 * 60 * 60;
const now = Date.now();

const tests = [
  {
    args: {
      after: new Date(now - 24*hour).toISOString(),
      before: new Date(now).toISOString(),
      initially: [{is_online: true}, {is_online: true}],
      nodes: ['A', 'B'],
      updates: [
        {
          // 18h in, B marks A as disabled
          node2_is_disabled: true,
          node2_updated_at: new Date(now - 6*hour).toISOString(),
        },
        {
          // 12h in, A marks B as disabled
          node1_is_disabled: true,
          node1_updated_at: new Date(now - 12*hour).toISOString(),
        },
      ],
    },
    description: 'A marks B as down',
    expected: {changes: [1, 1], uptime: [18*hour, 12*hour]},
  },
  {
    args: {
      after: new Date(now - 24*hour).toISOString(),
      before: new Date(now).toISOString(),
      initially: [{is_online: true}, {is_online: true}],
      nodes: ['A', 'B'],
      updates: [
        {
          // 18h in, A marks B as disabled
          node1_is_disabled: true,
          node1_updated_at: new Date(now - 6*hour).toISOString(),
        },
        {
          // 12h in, B marks A as disabled
          node2_is_disabled: true,
          node2_updated_at: new Date(now - 12*hour).toISOString(),
        },
      ],
    },
    description: 'B marks A as down',
    expected: {changes: [1, 1], uptime: [12*hour, 18*hour]},
  },
  {
    args: {
      after: new Date(now - 24*hour).toISOString(),
      before: new Date(now).toISOString(),
      initially: [{is_online: true}, {is_online: true}],
      nodes: ['A', 'B'],
      updates: [
        {
          // 18h in, A marks B as disabled
          node1_is_disabled: true,
          node1_updated_at: new Date(now - 6*hour).toISOString(),
        },
        {
          // 13h in, B marks A as disabled again
          node2_is_disabled: true,
          node2_updated_at: new Date(now - 11*hour).toISOString(),
        },
        {
          // 12h in, B marks A as disabled
          node2_is_disabled: true,
          node2_updated_at: new Date(now - 12*hour).toISOString(),
        },
      ],
    },
    description: 'B marks A as down, repeatedly',
    expected: {changes: [1, 1], uptime: [12*hour, 18*hour]},
  },
  {
    args: {
      after: new Date(now - 24*hour).toISOString(),
      before: new Date(now).toISOString(),
      initially: [{is_online: false}, {is_online: false}],
      nodes: ['A', 'B'],
      updates: [],
    },
    description: 'Always offline',
    expected: {changes: [0, 0], uptime: [0, 0]},
  },
  {
    args: {
      after: new Date(now - 24*hour).toISOString(),
      before: new Date(now).toISOString(),
      initially: [{is_online: true}, {is_online: true}],
      nodes: ['A', 'B'],
      updates: [],
    },
    description: 'Always online',
    expected: {changes: [0, 0], uptime: [24*hour, 24*hour]},
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({equal, end}) => {
    const got = calculateStability(args);

    got.changes.forEach((count, i) => {
      return equal(count, expected.changes[i], `${i} change count`);
    });

    got.uptime.forEach((ms, i) => {
      return equal(ms, expected.uptime[i], `${i} ms uptime`);
    });

    return end();
  });
});

