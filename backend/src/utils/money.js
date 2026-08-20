// rupees (can be a decimal like 33.5) -> integer paise
const toPaise = (rupees) => Math.round(rupees * 100);

// integer paise -> rupees (for display/API responses)
const toRupees = (paise) => paise / 100;

module.exports = { toPaise, toRupees };
