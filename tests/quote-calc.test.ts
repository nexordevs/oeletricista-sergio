import { test } from "node:test";
import assert from "node:assert/strict";
import { calcQuote } from "../src/lib/quote-calc";

test("soma itens, deslocamento e desconto percentual", () => {
  const r = calcQuote({ items: [{ quantity: 1, unitPrice: 90 }, { quantity: 14, unitPrice: 26 }, { quantity: 1, unitPrice: 950 }], travelFee: 20, discountType: "PERCENT", discountValue: 10 });
  assert.equal(r.itemsTotal, 1404); assert.equal(r.subtotal, 1424); assert.equal(r.discount, 142.4); assert.equal(r.total, 1281.6);
});
test("desconto em reais nunca deixa total negativo", () => {
  const r = calcQuote({ items: [{ quantity: 2, unitPrice: 10 }], travelFee: 0, discountType: "VALUE", discountValue: 500 });
  assert.equal(r.total, 0);
});
test("percentual acima de 100 é limitado", () => {
  assert.equal(calcQuote({ items: [{ quantity: 1, unitPrice: 100 }], travelFee: 0, discountType: "PERCENT", discountValue: 250 }).total, 0);
});
test("arredonda centavos corretamente", () => {
  const r = calcQuote({ items: [{ quantity: 3, unitPrice: 0.1 }, { quantity: 1.5, unitPrice: 33.33 }], travelFee: 0, discountType: "VALUE", discountValue: 0 });
  assert.equal(r.lines[0], 0.3); assert.equal(r.lines[1], 50); assert.equal(r.total, 50.3);
});
test("valores negativos são ignorados", () => {
  assert.equal(calcQuote({ items: [{ quantity: -1, unitPrice: 50 }], travelFee: -10, discountType: "VALUE", discountValue: -5 }).total, 0);
});
