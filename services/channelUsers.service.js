"use strict";

const { MoleculerClientError } = require("moleculer").Errors;
const DbService = require("../mixins/db.mixin");

module.exports = {
	name: "channelusers",
	mixins: [DbService("channelusers")],

	/**
	 * Default settings
	 */
	settings: {
        fields: ["_id", "user", "channelId"],

        populates: {
            // Define the params of action call. It will receive only with username & full name of author.
            "channelId": {
                action: "channels.get",
                params: {
                    fields: "channelName channelImage channelCreator"
                }
            },
		}
	},

	/**
	 * Actions
	 */
	actions: {

		/**
		 * Create a new following record
		 * 
		 * @actions
		 * 
		 * @param {String} user - Follower username
		 * @param {String} follow - Followee username
		 * @returns {Object} Created following record
		 */
		add: {
			params: {
				user: { type: "string" },
				channelId : { type: "string" },
			},
			handler(ctx) {
				const { channelId, user } = ctx.params;
				if (!channelId && !user) {
					return Promise.reject(
						new MoleculerClientError("Required", 422, "", [
							{
								field: "fields",
								message: "required",
							},
						])
					);
				}
				return this.findByChannelAndUser(channelId, user)
					.then(item => {
						if (item)
							return this.Promise.reject(new MoleculerClientError("User has already in this channel"));

						return this.adapter.insert({ channelId, user, createdAt: new Date() })
							.then(json => this.entityChanged("created", json, ctx).then(() => json));
					});
			}
		},

		/**
		 * Check the given 'follow' user is followed by 'user' user.
		 * 
		 * @actions
		 * 
		 * @param {String} user - Follower username
		 * @param {String} follow - Followee username
		 * @returns {Boolean} 
		 */
		has: {
			cache: {
				keys: ["article", "user"]
			},
			params: {
				user: { type: "string" },
				channelId: { type: "string" },
			},
			handler(ctx) {
				if (!ctx.params.channelId && !ctx.params.user) {
					return Promise.reject(
						new MoleculerClientError("Required", 422, "", [
							{
								field: "fields",
								message: "required",
							},
						])
					);
				}
				return this.findByChannelAndUser(ctx.params.channelId, ctx.params.user)
					.then(item => !!item);
			}
		},

		/**
		 * Count of following.
		 * 
		 * @actions
		 * 
		 * @param {String?} user - Follower username
		 * @param {String?} follow - Followee username
		 * @returns {Number}
		 */
		count: {
			cache: {
				keys: ["article", "user"]
			},
			params: {
				channelId: { type: "string", optional: true },
				user: { type: "string", optional: true },
			},
			handler(ctx) {
				let query = {};
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
				if (ctx.params.channelId) 
					query = { channelId: ctx.params.channelId };
				
				if (ctx.params.user) 
					query = { user: ctx.params.user };

				return this.adapter.count({ query });
			}
		},

		/**
		 * Delete a following record
		 * 
		 * @actions
		 * 
		 * @param {String} user - Follower username
		 * @param {String} follow - Followee username
		 * @returns {Number} Count of removed records
		 */
		delete: {
			params: {
				user: { type: "string" },
				channelId: { type: "string" },
			},
			handler(ctx) {
				const { channelId, user } = ctx.params;
				if (!channelId &&!user) {
					return Promise.reject(
						new MoleculerClientError("Required", 422, "", [
							{
								field: "fields",
								message: "required",
							},
						])
					);
				}
				return this.findByChannelAndUser(channelId, user)
					.then(item => {
						if (!item)
							return this.Promise.reject(new MoleculerClientError("User has not present in this channel"));

						return this.adapter.removeById(item._id)
							.then(json => this.entityChanged("removed", json, ctx).then(() => json));
					});
			}
		}
	},

	/**
	 * Methods
	 */
	methods: {

		findByChannelAndUser(channelId, user) {
			return this.adapter.findOne({ channelId, user });
		},
	},

	events: {
		"cache.clean.follows"() {
			if (this.broker.cacher)
				this.broker.cacher.clean(`${this.name}.*`);
		},
		"cache.clean.users"() {
			if (this.broker.cacher)
				this.broker.cacher.clean(`${this.name}.*`);
		}
	}	
};