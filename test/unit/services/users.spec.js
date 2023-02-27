"use strict";

const { ServiceBroker, Context } = require("moleculer");
const { ValidationError } = require("moleculer").Errors;
const TestService = require("../../../services/user.service");

describe("Test 'users' service", () => {
	const record = {
		_id: "123",
		username: "demo",
		password: "123456",
		email: "test@gmail.com",
		bio: "test",
		image: "test",
	};

	describe("Test hooks", () => {
		const broker = new ServiceBroker({ logger: false });
		const createActionFn = jest.fn();
		broker.createService({
			mixins: [TestService],
			actions: {
				create: {
					handler: createActionFn,
				},
			},
		});

		beforeAll(() => broker.start());
		afterAll(() => broker.stop());

		describe("Test before 'create' hook", () => {
			it("should add quantity with zero", async () => {
				await broker.call("users.create", { user: record });

				expect(createActionFn).toBeCalledTimes(1);
				expect(createActionFn.mock.calls[0][0].params).toEqual({
					user: {
						_id: "123",
						username: "demo",
						email: "test@gmail.com",
						password: "123456",
						bio: "test",
						image: "test",
					},
				});
			});
		});
	});
});
