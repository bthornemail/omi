const assert = require("assert");

const trampPath = require("../workbench/src/tramp_path.js");

function testTrampParsing() {
  console.log("Testing TRAMP-style carrier locator parsing");

  const scp = trampPath.parse("/scp:user@example.com:/omi/models/trailer.omilisp");
  const ssh = trampPath.parse("/ssh:device:/var/omi/sync.omi-synclog.json");
  const esp32 = trampPath.parse("/esp32:node-001:/event-log");

  assert.strictEqual(scp.method, "scp");
  assert.strictEqual(scp.user, "user");
  assert.strictEqual(scp.host, "example.com");
  assert.strictEqual(ssh.method, "ssh");
  assert.strictEqual(ssh.host, "device");
  assert.strictEqual(esp32.method, "esp32");
  assert.strictEqual(esp32.host, "node-001");
  assert.strictEqual(esp32.authority, "carrier-locator");

  console.log("  OK remote paths parse as carrier locators, not authority\n");
}

console.log("Testing Phase 52 - TRAMP Paths");
console.log("================================\n");

testTrampParsing();

console.log("\n================================");
console.log("ALL PHASE 52 TRAMP PATH TESTS PASSED");
