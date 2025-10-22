function safeFilename(name) {
  return String(name)
    .replace(/[\\/:"*?<>|]+/g, "_")
    .replace(/\s+/g, "_");
}

module.exports = {
  safeFilename
};