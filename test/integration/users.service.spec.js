"use strict";

const { ServiceBroker, Context } = require("moleculer");
const { ValidationError } = require("moleculer").Errors;
const TestService = require("../../services/user.service");

describe("Test 'user' service", () => {
	describe("Test actions", () => {
		const broker = new ServiceBroker({ logger: false });
		const service = broker.createService(TestService);
		service.seedDB = null; // Disable seeding

		beforeAll(() => broker.start());
		afterAll(() => broker.stop());

		const record = {
			_id: "123",
			username: "demo",
			password: "123456",
			email: "test@gmail.com",
			bio: "test",
			image: "test",
		};
		let newID;

		it("should add the new user", async () => {
			const res = await broker.call("users.create", { user: record });
			expect(res).toEqual({
				_id: "123",
				username: "demo",
				email: "test@gmail.com",
				bio: "test",
				image: "test",
			});
			newID = res._id;

			const res2 = await broker.call("users.count");
			expect(res2).toBe(1);
		});

		it("should get the saved users", async () => {
			const res = await broker.call("users.get", { id: newID });
			expect(res).toEqual({
				_id: expect.any(String),
				username: "demo",
				email: "test@gmail.com",
				bio: "test",
				image: "test",
			});

			const res2 = await broker.call("users.list");
			expect(res2).toEqual({
				page: 1,
				pageSize: 10,
				rows: [
					{
						_id: newID,
						username: "demo",
						email: "test@gmail.com",
						bio: "test",
						image: "test",
					},
				],
				total: 1,
				totalPages: 1,
			});
		});

		it("should get the updated item", async () => {
			const res = await broker.call("users.get", { id: newID });
			expect(res).toEqual({
				_id: expect.any(String),
				username: "demo",
				email: "test@gmail.com",
				bio: "test",
				image: "test",
			});
		});

		it("should remove the updated item", async () => {
			const res = await broker.call("users.remove", { id: newID });
			expect(res).toBe(1);

			const res2 = await broker.call("users.count");
			expect(res2).toBe(0);

			const res3 = await broker.call("users.list");
			expect(res3).toEqual({
				page: 1,
				pageSize: 10,
				rows: [],
				total: 0,
				totalPages: 0,
			});
		});
	});
});
