function parseDecimal(value, scale = 2) {
  const text = String(value ?? '').trim();
  const match = text.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) throw new TypeError(`Monto decimal inválido: ${value}`);
  const fraction = match[3] || '';
  if (fraction.length > scale) throw new RangeError(`El valor admite como máximo ${scale} decimales.`);
  const units = BigInt(match[2]) * (10n ** BigInt(scale)) + BigInt((fraction + '0'.repeat(scale)).slice(0, scale));
  return match[1] ? -units : units;
}

function formatDecimal(units, scale = 2) {
  const negative = units < 0n;
  const absolute = negative ? -units : units;
  const base = 10n ** BigInt(scale);
  return `${negative ? '-' : ''}${absolute / base}.${String(absolute % base).padStart(scale, '0')}`;
}

function addMoney(values) {
  return formatDecimal(values.reduce((total, value) => total + parseDecimal(value), 0n));
}

function subtractMoney(left, right) {
  return formatDecimal(parseDecimal(left) - parseDecimal(right));
}

function multiplyMoney(quantity, unitPrice) {
  const quantityUnits = parseDecimal(quantity, 2);
  const priceUnits = parseDecimal(unitPrice, 2);
  const product = quantityUnits * priceUnits;
  const divisor = 100n;
  const roundedCents = (product + divisor / 2n) / divisor;
  return formatDecimal(roundedCents);
}

module.exports = { parseDecimal, formatDecimal, addMoney, subtractMoney, multiplyMoney };
