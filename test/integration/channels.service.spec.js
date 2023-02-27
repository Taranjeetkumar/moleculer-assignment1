"use strict";

const { ServiceBroker, Context } = require("moleculer");
const { ValidationError } = require("moleculer").Errors;
const TestService = require("../../services/channels.service");

describe("Test 'channel' service", () => {
	describe("Test actions", () => {
		const broker = new ServiceBroker({ logger: false });
		const service = broker.createService(TestService);
		service.seedDB = null; // Disable seeding

		beforeAll(() => broker.start());
		afterAll(() => broker.stop());

		const record = {
			_id: 123,
			channelName: "Group1",
			channelImage: "Group1 Image",
		};
		let newID;

// 		it("should add the new channel", async () => {
// 			const res = await broker.call(
// 				"channels.create",
// 				{ channelRequest: record },
// 				{ user: "123" }
// 			);
// 			expect(res).toEqual({
// 				_id: 123,
// 			});
// 			newID = res._id;
// 
// 			const res2 = await broker.call("channels.count");
// 			expect(res2).toBe(1);
// 		});

		it("should get the saved channels", async () => {
			const res = await broker.call("channels.all");
			expect(res).toEqual([]);

			const res2 = await broker.call("channels.list");
			expect(res2).toEqual({
				page: 1,
				pageSize: 10,
				rows: [],
				total: 0,
				totalPages: 0,
			});
		});

		// it("should join channels", async () => {
		// 	const res = await broker.call("channels.join", { channelId: expect.any(String) });
        //     console.log("FDVB : ", res)
		// 	expect(res).toEqual({
		// 		_id: expect.any(String),
		// 		channelName: "Group1",
		// 		channelImage: "Group1 Image",
		// 		channelCreator: expect.any(String),
		// 	});
		// });

		it("should remove the updated channels", async () => {

			const res2 = await broker.call("channels.count");
			expect(res2).toBe(0);

			const res3 = await broker.call("channels.list");
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
