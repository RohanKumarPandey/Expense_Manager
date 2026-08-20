const generateInviteCode = () => {
  // 6-char uppercase alphanumeric, e.g. "K3F9XQ"
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

module.exports = generateInviteCode;
