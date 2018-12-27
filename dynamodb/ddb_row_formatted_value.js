const {uniq} = require('lodash');

const isNumeric = require('./is_numeric');

/** Convert a value to DynamoDb schema

  @param
  <Value Object>

  @throws
  <Error> // When value is not compatible

  @returns
  {
    [B]: <Value Base64 String>
    [BOOL]: <Value Bool>
    [BS]: [<Base64 Value String>]
    [S]: <Value String>
    [M]: <Dynamodb Values Object>
    [N]: <Number String>
    [NS]: [<Number Value String>]
    [NULL]: <True Value Bool>
    [SS]: [<Value String>]
  }
*/
module.exports = value => {
  if (typeof value === 'boolean') {
    return {BOOL: value};
  }

  if (Buffer.isBuffer(value)) {
    return {B: value.toString('base64')};
  }

  if (typeof value === 'string') {
    return {S: value};
  }

  if (!Array.isArray(value) && isNumeric(value)) {
    return {N: `${value}`};
  }

  if (value === null) {
    return {NULL: true};
  }

  if (!Array.isArray(value) && value === Object(value)) {
    const map = {};

    Object.keys(value).forEach(k => map[k] = module.exports(value[k]));

    return {M: map};
  }

  if (!Array.isArray(value)) {
    throw new Error(`NonCompatibleValueForDdbFormatting`);
  }

  const [firstArrValue] = value;

  if (Buffer.isBuffer(firstArrValue)) {
    return {BS: value.map(n => n.toString('base64'))};
  }

  if (typeof firstArrValue === 'string') {
    return {SS: uniq(value)};
  }

  if (isNumeric(firstArrValue)) {
    return {NS: value.map(n => `${n}`)};
  }

  throw new Error(`UnrecognizedValueTypeForDdb`);
};

