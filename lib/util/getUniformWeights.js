module.exports = function getUniformWeights (count, args = []) {
  const computeSum = (a, b) => {
    return (a || 0) + (b || 0);
  };
  const sum = args.reduce(computeSum, 0);
  const remainingAmount = Math.max(0, 1 - sum);
  const remainingValues = count - args.length;
  const step = remainingAmount / remainingValues;
  const ret = args.slice();
  for (let i = 0; i < remainingValues; i++) {
    ret.push(step);
  }
  const newSum = ret.reduce(computeSum, 0);
  if (newSum > 1) console.warn('Sum is greater than one on:', args);
  if (newSum < 1) console.warn('Sum is less than one on:', args);
  return ret;
};
