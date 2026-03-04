const request = require("supertest");
const express = require("express");

// Mock authentication middleware
jest.mock("../middleware/auth", () => (req, res, next) => {
  req.user = { userId: "u1" };
  next();
});

// Mock User model
jest.mock("../models/User", () => ({
  findById: jest.fn(),
  find: jest.fn(),
}));

const User = require("../models/User");
const usersRouter = require("./users");

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/", usersRouter);
  return app;
}

describe("Users routes - GET /me", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 200 with user data when user exists", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "u1",
        firstName: "John",
        lastName: "Doe",
        email: "john@test.com",
      }),
    });

    const res = await request(makeApp()).get("/me");

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("john@test.com");
  });

  test("returns correct user fields", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "u1",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@test.com",
      }),
    });

    const res = await request(makeApp()).get("/me");

    expect(res.body).toHaveProperty("firstName");
    expect(res.body).toHaveProperty("lastName");
    expect(res.body).toHaveProperty("email");
  });

  test("returns 404 when user not found", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const res = await request(makeApp()).get("/me");

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("User not found");
  });

  test("calls database with correct userId", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "u1",
      }),
    });

    await request(makeApp()).get("/me");

    expect(User.findById).toHaveBeenCalledWith("u1");
  });

  test("returns 500 when database throws error", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockRejectedValue(new Error("DB error")),
    });

    const res = await request(makeApp()).get("/me");

    expect(res.status).toBe(500);
  });

});