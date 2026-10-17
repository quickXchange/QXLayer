import assert from "node:assert/strict";
import test from "node:test";
import {cardPresentation} from "./explore-visual-model";
test("shortened card concept rows stay safe and never expose a full number",()=>{
  assert.deepEqual(cardPresentation([["Sample user"]]),{lastFour:"0000",primaryHolder:"Sample user",secondaryHolder:"Sample user"});
  assert.equal(cardPresentation([["Sample","Virtual 0462"]]).lastFour,"0462");
  assert.deepEqual(cardPresentation([]),{lastFour:"0000",primaryHolder:"Sample cardholder",secondaryHolder:"Sample cardholder"});
});
