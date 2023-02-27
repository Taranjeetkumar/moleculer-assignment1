"use strict";

const DbMixin = require("../mixins/db.mixin");

/** @type {ServiceSchema} */
module.exports = {
	name: "messages",
	mixins: [DbMixin("messages")],
	settings: {
		// Available fields in the responses
		fields: ["_id", "message", "topicId", "userId"],

		// Validator for the `channelName` actions.
		entityValidator: {
			message: { type: "string", min: 1 },
		},
	},
	/**
	 * Actions
	 */
	actions: {
		/**
		 * Create new tpic
		 */
		create: {
			auth: "required",
			params: {
				messageRequest: { type: "object" },
			},
			rest: {
				method: "POST",
				path: "/create",
			},
			handler(ctx) {
				let entity = ctx.params.messageRequest;
				if (!entity.topicId && !entity.channelId && !entity.message) {
					return Promise.reject(
						new MoleculerClientError("Required", 422, "", [
							{
								field: "fields",
								message: "required",
							},
						])
					);
				}
				return this.validateEntity(entity)
					.then(async () => {
						let userExist = await ctx.call("channelusers.has", {
							user: ctx.meta.user._id.toString(),
							channelId: entity.channelId.toString(),
						});

						if (!userExist)
							return Promise.reject(
								new MoleculerClientError(
									"User is not a member of this channel",
									422,
									"",
									[
										{
											field: "user",
											message: "presence not exist",
										},
									]
								)
							);
					})
					.then(async () => {
						entity.topicId = entity.topicId || "";
						entity.message = entity.message;
						entity.userId = ctx.meta.user._id;
						entity.createdAt = new Date();

						return this.adapter
							.insert(entity)
							.then((doc) => {
								return this.transformDocuments(ctx, {}, doc);
							})
							.then((json) =>
								this.entityChanged("created", json, ctx).then(
									() => json
								)
							);
					});
			},
		},

		all: {
			auth: "required",
			rest: {
				method: "POST",
				path: "/",
			},
			params: {
				topicId: { type: "string" },
			},
			async handler(ctx) {
				if (!ctx.params.topicId) {
					return Promise.reject(
						new MoleculerClientError("Required", 422, "", [
							{
								field: "fields",
								message: "required",
							},
						])
					);
				}
				return this.Promise.resolve().then(() => {
					return ctx
						.call("topics.getTopicById", {
							topicId: ctx.params.topicId.toString(),
						})
						.then((topic) => {
							if (topic) {
								return this.checkUserExistChannel(
									ctx,
									topic.channelId,
									ctx.meta.user
								).then((item) => {
									if (!item) {
										return this.Promise.reject(
											new MoleculerClientError(
												"User is not a member of this channel"
											)
										);
									}

									return this.adapter
										.find({
											query: {
												topicId: topic._id.toString(),
											},
										})
										.then((messages) => {
											return this.transformDocuments(
												{},
												{},
												messages
											);
										});
								});
							}
						});
				});
			},
		},

		edit: {
			auth: "required",
			rest: {
				method: "PUT",
				path: "/edit",
			},
			params: {
				messageRequest: { type: "object" },
			},
			handler(ctx) {
				const newData = ctx.params.messageRequest;
				if (!newData.messageId) {
					return Promise.reject(
						new MoleculerClientError("Required", 422, "", [
							{
								field: "fields",
								message: "required",
							},
						])
					);
				}
				return this.Promise.resolve().then(() => {
					return this.adapter
						.findOne({
							_id: newData.messageId,
							userId: ctx.meta.user._id,
						})
						.then((message) => {
							if (!message)
								return this.Promise.reject(
									new MoleculerClientError(
										"Message not found!",
										400
									)
								);

							newData.updatedAt = new Date();
							const update = {
								$set: newData,
							};
							return this.adapter
								.updateById(message._id, update)
								.then((doc) =>
									this.transformDocuments(ctx, {}, doc)
								)
								.then((json) =>
									this.entityChanged(
										"updated",
										json,
										ctx
									).then(() => json)
								);
						});
				});
			},
		},

		delete: {
			auth: "required",
			rest: {
				method: "POST",
				path: "/delete",
			},
			params: {
				messageRequest: { type: "object" },
			},
			handler(ctx) {
				const newData = ctx.params.messageRequest;
				if (!newData.messageId) {
					return Promise.reject(
						new MoleculerClientError("Required", 422, "", [
							{
								field: "fields",
								message: "required",
							},
						])
					);
				}
				return this.Promise.resolve().then(() => {
					return this.adapter
						.findOne({
							_id: newData.messageId,
							userId: ctx.meta.user._id,
						})
						.then((message) => {
							if (!message)
								return this.Promise.reject(
									new MoleculerClientError(
										"Message not found!",
										400
									)
								);

							return this.adapter
								.removeById(message._id)
								.then((json) =>
									this.entityChanged(
										"removed",
										json,
										ctx
									).then(() => json)
								);
						});
				});
			},
		},
	},

	/**
	 * Methods
	 */
	methods: {
		checkUserExistChannel(ctx, channelId, user) {
			return ctx.call("channelusers.has", {
				user: user._id.toString(),
				channelId: channelId.toString(),
			});
		},
	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {},
};
