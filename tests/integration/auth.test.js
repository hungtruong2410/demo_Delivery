const request = require("supertest");
const app = require("../../app");
const db = require("../../db");

describe("AUTH INTEGRATION TEST", () => {
  const testUser = {
    email: "integration@test.com",
    password: "123456",
    username: "IntegrationUser"
  };

  afterAll(async () => {
    await db.query("DELETE FROM users WHERE email = ?", [testUser.email]);
    db.end();
  });

  // ================== TC-01 Required Validation ==================
  test("Signup fail when missing required fields (FAIL CASE)", async () => {
    const res = await request(app)
      .post("/users/signup")
      .send({
        email: "",
        password: ""
      });

    expect(res.statusCode).toBe(400);
    expect(res.text).toContain("required");
  });

  // ================== TC-02 Duplicate Email ==================
  test("Signup success first time (PASS CASE)", async () => {
    const res = await request(app)
      .post("/users/signup")
      .send(testUser);

    expect(res.statusCode).toBe(302); 
    expect(res.headers.location).toBe("/users/signin");
  });

  test("Signup fail when email already exists (FAIL CASE)", async () => {
    const res = await request(app)
      .post("/users/signup")
      .send(testUser);

    expect(res.statusCode).toBe(400);
    expect(res.text).toContain("Email already exists");
  });

  // ================== TC-03 Login Success ==================
  test("Login success with correct credentials (PASS CASE)", async () => {
    const res = await request(app)
      .post("/users/signin")
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/users/homepage");
  });

  // ================== TC-04 Login Fail ==================
  test("Login fail with wrong password (FAIL CASE)", async () => {
    const res = await request(app)
      .post("/users/signin")
      .send({
        email: testUser.email,
        password: "wrongpass"
      });

    expect(res.statusCode).toBe(401);
    expect(res.text).toContain("Invalid");
  });
});
