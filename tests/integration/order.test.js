const request = require("supertest");
const app = require("../../app");
const db = require("../../../db");

let agent = request.agent(app);
let userId;

beforeAll(async () => {
  const [user] = await db
    .promise()
    .query("SELECT * FROM users LIMIT 1");

  userId = user[0].id;
});

describe("ORDER FLOW", () => {

  // ================== TC Cart requires login ==================
  test("Access cart without login → FAIL", async () => {
    const res = await request(app).get("/users/cart");
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/users/signin");
  });

  // ================== Login session ==================
  test("Login to continue order", async () => {
    await agent
      .post("/users/signin")
      .send({
        email: "integration@test.com",
        password: "123456"
      });
  });

  // ================== Add to cart PASS ==================
  test("Add product to cart successfully (PASS)", async () => {
    const res = await agent
      .post("/users/cart/add")
      .send({ productId: 1, quantity: 1 });

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("added");
  });

  // ================= Checkout Fail ==================
  test("Checkout fail missing address (FAIL)", async () => {
    const res = await agent.post("/users/checkout").send({
      address: ""
    });

    expect(res.statusCode).toBe(400);
    expect(res.text).toContain("address");
  });

  // ================= Checkout Success ==================
  test("Checkout success (PASS)", async () => {
    const res = await agent.post("/users/checkout").send({
      address: "Test Address"
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/users/confirmation");
  });

});
