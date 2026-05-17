import { computeConsumption, PrintItem } from "../consumption";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

function runTests() {
  console.log("Running consumption tests...\n");

  // Test 1: BW single-sided A4
  const item1: PrintItem = {
    type: "print",
    pageCount: 10,
    printConfig: { paperSize: "a4", colorMode: "bw", copies: 2, sides: "single" },
  };
  const res1 = computeConsumption(item1, "test-001");
  const paper1 = res1.find((e) => e.inventoryName === "A4 Paper (White)");
  assert(paper1 !== undefined, "A4 paper entry exists");
  assert(paper1!.amount === 20, `A4 sheets = 20 (got ${paper1!.amount})`);
  const ink1 = res1.find((e) => e.inventoryName === "Black Ink");
  assert(ink1 !== undefined, "Black ink entry exists");
  assert(ink1!.amount === 1, `Black ink = 1 cartridge (got ${ink1!.amount})`);

  // Test 2: Color double-sided A3
  const item2: PrintItem = {
    type: "print",
    pageCount: 100,
    printConfig: { paperSize: "a3", colorMode: "color", copies: 1, sides: "double" },
  };
  const res2 = computeConsumption(item2, "test-002");
  const paper2 = res2.find((e) => e.inventoryName === "A3 Paper");
  assert(paper2 !== undefined, "A3 paper entry exists");
  assert(paper2!.amount === 50, `A3 sheets = 50 duplex (got ${paper2!.amount})`);
  const cyan = res2.find((e) => e.inventoryName === "Color Ink (Cyan)");
  assert(cyan !== undefined, "Cyan ink entry exists");
  assert(cyan!.amount === 1, `Cyan cartridge = 1 (got ${cyan!.amount})`);

  // Test 3: Binding
  const item3: PrintItem = {
    type: "print",
    pageCount: 50,
    printConfig: { paperSize: "a4", colorMode: "bw", copies: 3, binding: true, sides: "single" },
  };
  const res3 = computeConsumption(item3, "test-003");
  const bind = res3.find((e) => e.inventoryName === "Spiral Binding Coils");
  assert(bind !== undefined, "Binding entry exists");
  assert(bind!.amount === 3, `Binding coils = 3 (got ${bind!.amount})`);

  // Test 3b: Explicit no-binding string from app orders should not consume coils
  const item3b: PrintItem = {
    type: "print",
    pageCount: 50,
    printConfig: { paperSize: "a4", colorMode: "bw", copies: 1, binding: "none", sides: "single" },
  };
  const res3b = computeConsumption(item3b, "test-003b");
  const noBind = res3b.find((e) => e.inventoryName === "Spiral Binding Coils");
  assert(noBind === undefined, "No binding coils for binding=none");

  // Test 4: Non-print item returns empty
  const item4: PrintItem = { type: "scan" };
  const res4 = computeConsumption(item4, "test-004");
  assert(res4.length === 0, "Scan item produces no consumption");

  // Test 5: Zero pages
  const item5: PrintItem = {
    type: "print",
    pageCount: 0,
    printConfig: { paperSize: "a4", colorMode: "bw", copies: 1 },
  };
  const res5 = computeConsumption(item5, "test-005");
  const paper5 = res5.find((e) => e.inventoryName === "A4 Paper (White)");
  assert(paper5 !== undefined, "Zero-page still produces paper entry");
  assert(paper5!.amount === 0, `Zero pages = 0 sheets (got ${paper5!.amount})`);

  // Test 6: selected page ranges reduce paper and ink consumption
  const item6: PrintItem = {
    type: "print",
    pageCount: 20,
    printConfig: { paperSize: "a4", colorMode: "bw", copies: 1, sides: "single", pageRangeText: "1-3, 10" },
  };
  const res6 = computeConsumption(item6, "test-006");
  const paper6 = res6.find((e) => e.inventoryName === "A4 Paper (White)");
  assert(paper6 !== undefined, "Page range paper entry exists");
  assert(paper6!.amount === 4, `Selected range sheets = 4 (got ${paper6!.amount})`);

  console.log("\n✅ All tests passed!");
}

runTests();
