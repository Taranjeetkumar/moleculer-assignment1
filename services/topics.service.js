"use strict";

const DbMixin = require("../mixins/db.mixin");

/** @type {ServiceSchema} */
module.exports = {
	name: "topics",
	mixins: [DbMixin("topics")],
	settings: {
		// Available fields in the responses
		fields: ["_id", "topicName", "channelId", "topicCreator"],

		// Validator for the `channelName` actions.
		entityValidator: {
			topicName: { type: "string", min: 2 },
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
				topicRequest: { type: "object" },
			},
			rest: {
				method: "POST",
				path: "/create",
			},
			handler(ctx) {
				let entity = ctx.params.topicRequest;
				if (!entity.topicName && !entity.channelId) {
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

						if (entity.topicName && entity.channelId)
							return this.adapter
								.findOne({
									topicName: entity.topicName,
									channelId: entity.channelId,
								})
								.then((found) => {
									if (found)
										return Promise.reject(
											new MoleculerClientError(
												"This name of topic already exist in this channel!",
												422,
												"",
												[
													{
														field: "topicName",
														message: "is exist",
													},
												]
											)
										);
								});
					})
					.then(async () => {
						entity.topicName = entity.topicName || "";
						entity.topicCreator = ctx.meta.user._id;
						entity.channelId = entity.channelId;
						let existedTopiCount = await this.adapter.count({
							channelId: entity.channelId,
						});
						if (existedTopiCount >= 100) {
							return Promise.reject(
								new MoleculerClientError(
									"Topic exceed limit for given channel",
									422,
									"",
									[
										{
											field: "topic",
											message: "exceed limit",
										},
									]
								)
							);
						}

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
				path: "/all",
			},
			params: {
				channelId: { type: "string" },
			},

			async handler(ctx) {
				if (!ctx.params.channelId) {
					return Promise.reject(
						new MoleculerClientError("Required", 422, "", [
							{
								field: "fields",
								message: "required",
							},
						])
					);
				}
				let userExist = await ctx.call("channelusers.has", {
					user: ctx.meta.user._id.toString(),
					channelId: ctx.params.channelId.toString(),
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

				return this.adapter
					.find({
						query: { channelId: ctx.params.channelId.toString() },
					})
					.then((channels) => {
						return this.transformDocuments({}, {}, channels);
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
				topicRequest: {
					type: "object",
				},
			},
			handler(ctx) {
				const newData = ctx.params.topicRequest;
				if(!newData.topicId){
					return Promise.reject(
						new MoleculerClientError(
							"Required",
							422,
							"",
							[
								{
									field: "fields",
									message: "required",
								},
							]
						)
					);
				}
				return this.Promise.resolve().then(() => {
					return this.findByTopicAndUser(
						newData.topicId,
						ctx.meta.user
					).then((item) => {
						if (!item) {
							return this.Promise.reject(
								new MoleculerClientError(
									"Only creator can edit the topic"
								)
							);
						}

						if (newData.topicName)
							return this.adapter
								.findOne({
									topicName: newData.topicName,
								})
								.then((found) => {
									if (found) {
										return Promise.reject(
											new MoleculerClientError(
												"This name of topic already exist",
												422,
												"",
												[
													{
														field: "topicName",
														message: "is exist",
													},
												]
											)
										);
									}
								})
								.then(async () => {
									newData.updatedAt = new Date();
									const update = {
										$set: newData,
									};
									let updateTopic =
										await this.adapter.updateById(
											newData.topicId,
											update
										);
									return updateTopic;
								})
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
				topicId: {
					type: "string",
				},
			},
			handler(ctx) {
				const topicId = ctx.params.topicId;
				if(!topicId){
					return Promise.reject(
						new MoleculerClientError(
							"Required",
							422,
							"",
							[
								{
									field: "fields",
									message: "required",
								},
							]
						)
					);
				}
				return this.Promise.resolve().then(() => {
					return this.findByTopicAndUser(topicId, ctx.meta.user).then(
						(item) => {
							if (!item)
								return this.Promise.reject(
									new MoleculerClientError(
										"Only creator can delete the topic"
									)
								);

							return this.adapter
								.removeById(item._id)
								.then((json) =>
									this.entityChanged(
										"removed",
										json,
										ctx
									).then(() => json)
								);
						}
					);
				});
			},
		},

		getTopicById: {
			auth: "required",
			rest: {
				method: "POST",
				path: "/get",
			},
			params: {
				topicId: {
					type: "string",
				},
			},
			handler(ctx) {
				const topicId = ctx.params.topicId;
				if(!topicId){
					return Promise.reject(
						new MoleculerClientError(
							"Required",
							422,
							"",
							[
								{
									field: "fields",
									message: "required",
								},
							]
						)
					);
				}
				return this.Promise.resolve().then(() => {
					return this.getById(topicId).then((topic) => {
						if (!topic)
							return this.Promise.reject(
								new MoleculerClientError(
									"Topic not found!",
									400
								)
							);

						return this.transformDocuments(ctx, {}, topic);
					});
				});
			},
		},
	},

	/**
	 * Methods
	 */
	methods: {
		findByTopicAndUser(topicId, user) {
			return this.adapter.findOne({
				_id: topicId,
				topicCreator: user._id,
			});
		},
	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {},
};
