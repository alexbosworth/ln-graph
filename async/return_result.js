/** Return a specific result of an async/auto process

  {
    [of]: <Property String>
  }

  @returns
  <Function> (err, res) => {}
*/
module.exports = (args, cbk) => {
  return (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    if (!!args.of) {
      return cbk(null, res[args.of]);
    }

    return cbk();
  };
};

