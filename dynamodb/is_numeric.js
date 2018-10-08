/** Test if value is numeric

  <Value Object>

  @returns
  <Is Numeric Bool>
*/
module.exports = val => !isNaN(parseFloat(val)) && isFinite(val);

