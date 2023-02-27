"use strict";

const DbMixin = require("../mixins/db.mixin");

/**
 * @typedef {import('moleculer').ServiceSchema} ServiceSchema Moleculer's Service Schema
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

/** @type {ServiceSchema} */
module.exports = {
	name: "channels",
	mixins: [DbMixin("channels")],
	settings: {
		// Available fields in the responses
		fields: ["_id", "channelName", "channelImage", "channelCreator"],

		// Validator for the `channelName` actions.
		entityValidator: {
			channelName: { type: "string", min: 2 },
		},
		populates: {
			_id: {
				action: "channelUsers.get",
				params: {
					fields: "channelId fullName",
				},
			},
		},
	},
	/**
	 * Actions
	 */
	actions: {
		/**
		 * Create new channel
		 */
		create: {
			auth: "required",
			params: {
				channelRequest: { type: "object" },
			},
			handler(ctx) {
				let entity = ctx.params.channelRequest;
				console.log("fsghfhg : ", ctx.meta.user);
				if (!entity.channelName) {
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
					.then(() => {
						if (entity.channelName)
							return this.adapter
								.findOne({ channelName: entity.channelName })
								.then((found) => {
									if (found)
										return Promise.reject(
											new MoleculerClientError(
												"This name of channel already exist!",
												422,
												"",
												[
													{
														field: "channelName",
														message: "is exist",
													},
												]
											)
										);
								});
					})
					.then(() => {
						entity.channelName = entity.channelName || "";
						entity.channelCreator = ctx.meta.user._id;
						entity.channelImage = entity.channelImage;

						return this.adapter
							.insert(entity)
							.then((doc) => {
								return ctx
									.call("channelusers.add", {
										user: ctx.meta.user._id.toString(),
										channelId: doc._id.toString(),
									})
									.then((user) => {
										return this.transformDocuments(
											ctx,
											{},
											user
										);
									});
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
				method: "GET",
				path: "/all",
			},
			handler(ctx) {
				return this.adapter.find().then(async (channels) => {
					for (let i = 0; i < channels.length; i++) {
						let users = await ctx.call("channelusers.count", {
							channelId: channels[i]._id,
						});
						channels[i].users = users;
					}
					return channels;
					// return this.transformDocuments({}, {}, channels);
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
				channelRequest: {
					type: "object",
				},
			},
			handler(ctx) {
				const newData = ctx.params.channelRequest;
				if (!newData.channelId) {
					return Promise.reject(
						new MoleculerClientError("Required", 422, "", [
							{
								field: "fields",
								message: "required",
							},
						])
					);
				}
				return this.Promise.resolve()
					.then(() => {
						if (newData.channelName)
							return this.adapter
								.findOne({ channelName: newData.channelName })
								.then((found) => {
									if (found)
										return Promise.reject(
											new MoleculerClientError(
												"This name of channel already exist",
												422,
												"",
												[
													{
														field: "channelName",
														message: "is exist",
													},
												]
											)
										);
								});
					})
					.then(() => {
						if (newData.channelId)
							return this.adapter
								.findOne({
									_id: newData.channelId,
									channelCreator: ctx.meta.user._id,
								})
								.then((found) => {
									if (!found)
										return Promise.reject(
											new MoleculerClientError(
												"Only Channel creator can change channel name",
												422,
												"",
												[
													{
														field: "channelCreator",
														message: "is not you",
													},
												]
											)
										);
								});
					})
					.then(async () => {
						newData.updatedAt = new Date();
						const update = {
							$set: newData,
						};
						let updateChannel = await this.adapter.updateById(
							newData.channelId,
							update
						);
						return updateChannel;
					})
					.then((doc) => this.transformDocuments(ctx, {}, doc))
					.then((json) =>
						this.entityChanged("updated", json, ctx).then(
							() => json
						)
					);
			},
		},

		search: {
			auth: "required",
			rest: {
				method: "POST",
				path: "/search",
			},
			params: {
				search: {
					type: "string",
				},
			},
			handler(ctx) {
				if (!ctx.params.search) {
					return Promise.reject(
						new MoleculerClientError("Required", 422, "", [
							{
								field: "fields",
								message: "required",
							},
						])
					);
				}
				return this.adapter
					.find({
						query: { search: { channelName: ctx.params.search } },
					})
					.then(async (channels) => {
						return this.transformDocuments({}, {}, channels);
					});
			},
		},

		join: {
			auth: "required",
			rest: {
				method: "POST",
				path: "/join",
			},
			params: {
				channelId: {
					type: "string",
				},
			},
			handler(ctx) {
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
				return ctx
					.call("channelusers.add", {
						user: ctx.meta.user._id.toString(),
						channelId: ctx.params.channelId.toString(),
					})
					.then((user) => {
						return this.transformDocuments(ctx, {}, user);
					});
			},
		},

		leave: {
			auth: "required",
			rest: {
				method: "POST",
				path: "/leave",
			},
			params: {
				channelId: {
					type: "string",
				},
			},
			handler(ctx) {
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
				return ctx
					.call("channelusers.delete", {
						user: ctx.meta.user._id.toString(),
						channelId: ctx.params.channelId.toString(),
					})
					.then((user) => {
						return this.transformDocuments(ctx, {}, user);
					});
			},
		},
	},

	/**
	 * Methods
	 */
	methods: {},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {},
};
