import test from "node:test";
import assert from "node:assert/strict";
import {customerName,customerCopy} from "../src/customer-copy.mjs";

test("customer language uses entered ownership, without changing saved field keys",()=>{
  assert.deepEqual(customerCopy("John Doe"),{
    name:"John Doe",subject:"John Doe",possessive:"John Doe’s",
    leadPossessive:"John Doe’s"
  });
  assert.equal(customerCopy("Acme, Inc.").leadPossessive,"Acme, Inc.’s");
  assert.equal(customerCopy("Chris").leadPossessive,"Chris’s");
  assert.equal(customerCopy("James'").leadPossessive,"James’");
});
test("blank or whitespace-only names use readable customer fallback",()=>{
  assert.equal(customerCopy("").leadPossessive,"The customer’s");
  assert.equal(customerCopy(" \n\t ").subject,"the customer");
  assert.equal(customerCopy(null).possessive,"the customer’s");
});
test("name normalization is safe literal data rather than HTML markup",()=>{
  assert.equal(customerName("  John \n Doe  "),"John Doe");
  assert.equal(customerCopy("<img src=x onerror=alert(1)>").name,
    "<img src=x onerror=alert(1)>");
});
