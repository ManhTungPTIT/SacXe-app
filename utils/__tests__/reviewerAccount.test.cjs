const assert = require("node:assert/strict");
const test = require("node:test");

const { isReviewerAccount } = require("../reviewerAccount");

test("reviewer account is detected from the login email", () => {
  assert.equal(isReviewerAccount({ email: "reviewer@enovo.vn" }), true);
});

test("reviewer account detection ignores letter case and position", () => {
  assert.equal(isReviewerAccount({ email: "App.REVIEWER.01@enovo.vn" }), true);
});

test("a normal account is not treated as reviewer", () => {
  assert.equal(isReviewerAccount({ email: "nguyenvana@gmail.com" }), false);
});

test("the word must appear in the email, not in the display name", () => {
  assert.equal(
    isReviewerAccount({ email: "nguyenvana@gmail.com", name: "Reviewer" }),
    false,
  );
});

test("a missing or malformed user never counts as reviewer", () => {
  assert.equal(isReviewerAccount(null), false);
  assert.equal(isReviewerAccount(undefined), false);
  assert.equal(isReviewerAccount({}), false);
  assert.equal(isReviewerAccount({ email: 123 }), false);
});
