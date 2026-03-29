const crypto = require('crypto');
const {default: ObjectID} = require('bson-objectid');
const createCookies = require('cookies');
const errors = require('@tryghost/errors');
const config = require('../../../shared/config');
const models = require('../../models');
const urlService = require('../url');

const COOKIE_NAME = 'ghost-post-share';
const COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;
const MAX_COOKIE_TOKENS = 20;

class PostShareLinksService {
    get cookieOptions() {
        return {
            signed: false,
            httpOnly: true,
            sameSite: 'lax',
            maxAge: COOKIE_MAX_AGE_MS,
            path: '/',
            secure: config.get('url')?.startsWith('https://') || false
        };
    }

    _getCookies(req, res) {
        return createCookies(req, res, {secure: this.cookieOptions.secure});
    }

    _readCookieTokens(req, res) {
        const cookies = this._getCookies(req, res);
        const raw = cookies.get(COOKIE_NAME, {signed: false});

        if (!raw) {
            return [];
        }

        return raw.split('|').map(token => token.trim()).filter(Boolean);
    }

    _writeCookieTokens(req, res, tokens) {
        const cookies = this._getCookies(req, res);
        const uniqueTokens = [...new Set(tokens)].slice(-MAX_COOKIE_TOKENS);

        if (!uniqueTokens.length) {
            cookies.set(COOKIE_NAME, null, this.cookieOptions);
            return;
        }

        cookies.set(COOKIE_NAME, uniqueTokens.join('|'), this.cookieOptions);
    }

    clearCookie(req, res) {
        this._writeCookieTokens(req, res, []);
    }

    _generateToken() {
        return crypto.randomBytes(24).toString('base64url');
    }

    _buildCanonicalShareUrl(postId, token) {
        const siteUrl = config.get('url').replace(/\/$/, '');
        return `${siteUrl}/share/${token}/`;
    }

    _buildPostShareRedirectUrl(postId, token) {
        const postUrl = new URL(urlService.getUrlByResourceId(postId, {absolute: true}));
        postUrl.searchParams.set('share', token);
        return postUrl.toString();
    }

    _serialize(model) {
        if (!model) {
            return null;
        }

        return {
            id: model.get('id'),
            post_id: model.get('post_id'),
            token: model.get('token'),
            share_url: this._buildCanonicalShareUrl(model.get('post_id'), model.get('token')),
            post_url: urlService.getUrlByResourceId(model.get('post_id'), {absolute: true}),
            view_count: model.get('view_count') || 0,
            created_at: model.get('created_at'),
            updated_at: model.get('updated_at'),
            revoked_at: model.get('revoked_at')
        };
    }

    async _getPost(postId) {
        return await models.Post.findOne({id: postId, status: 'all'}, {require: true});
    }

    async assertPostCanBeShared(postId) {
        const post = await this._getPost(postId);
        const visibility = post.get('visibility');
        const status = post.get('status');

        if (!['published', 'sent'].includes(status)) {
            throw new errors.ValidationError({
                message: 'Only published posts can have gift links.'
            });
        }

        if (!['paid', 'tiers'].includes(visibility)) {
            throw new errors.ValidationError({
                message: 'Gift links are only available for paid posts.'
            });
        }

        return post;
    }

    async getActiveByPostId(postId) {
        return await models.PostShareLink.forge()
            .query((qb) => {
                qb.where('post_id', postId).whereNull('revoked_at');
            })
            .fetch({require: false});
    }

    async getByToken(token, {includeRevoked = false, withPost = false} = {}) {
        const fetchOptions = {require: false};
        if (withPost) {
            fetchOptions.withRelated = ['post'];
        }

        const model = await models.PostShareLink.forge()
            .query((qb) => {
                qb.where('token', token);
            })
            .fetch(fetchOptions);

        if (!model) {
            return null;
        }

        if (!includeRevoked && model.get('revoked_at')) {
            return null;
        }

        return model;
    }

    async getForAdmin(postId) {
        await this.assertPostCanBeShared(postId);
        const link = await this.getOrCreateForPost(postId);
        return this._serialize(link);
    }

    async getOrCreateForPost(postId) {
        const existing = await this.getActiveByPostId(postId);
        if (existing) {
            return existing;
        }

        return await models.PostShareLink.add({
            id: new ObjectID().toHexString(),
            post_id: postId,
            token: this._generateToken(),
            view_count: 0
        });
    }

    async createForPost(postId) {
        await this.assertPostCanBeShared(postId);
        const link = await this.getOrCreateForPost(postId);
        return this._serialize(link);
    }

    async cycleForPost(postId) {
        await this.assertPostCanBeShared(postId);

        const existing = await this.getActiveByPostId(postId);
        if (existing) {
            await models.PostShareLink.edit({
                revoked_at: new Date()
            }, {
                id: existing.get('id')
            });
        }

        const newLink = await models.PostShareLink.add({
            id: new ObjectID().toHexString(),
            post_id: postId,
            token: this._generateToken(),
            view_count: 0
        });

        return this._serialize(newLink);
    }

    async revokeForPost(postId) {
        return this.cycleForPost(postId);
    }

    async incrementViewCount(id) {
        const existing = await models.PostShareLink.findOne({id}, {require: false});
        if (!existing) {
            return;
        }

        await models.PostShareLink.edit({
            view_count: (existing.get('view_count') || 0) + 1
        }, {
            id
        });
    }

    async loadActiveLinksFromCookie(req, res) {
        const tokens = this._readCookieTokens(req, res);
        if (!tokens.length) {
            return [];
        }

        const links = [];
        const validTokens = [];

        for (const token of tokens) {
            const link = await this.getByToken(token);
            if (link) {
                links.push(link);
                validTokens.push(token);
            }
        }

        if (validTokens.length !== tokens.length) {
            this._writeCookieTokens(req, res, validTokens);
        }

        return links;
    }

    middleware = {
        loadSharedAccess: async (req, res, next) => {
            try {
                const token = typeof req.query?.share === 'string' ? req.query.share : null;
                if (!token) {
                    return next();
                }

                const link = await this.getByToken(token);
                if (!link) {
                    return next();
                }

                const postId = link.get('post_id');
                const postIds = [postId];
                const canonicalPath = new URL(urlService.getUrlByResourceId(postId, {absolute: true})).pathname;
                if (req.method === 'GET' && req.path === canonicalPath) {
                    await this.incrementViewCount(link.get('id'));
                }

                req.postShareLinks = [link];
                res.locals.postAccess = {postIds};
                res.locals.sharedPostAccess = {
                    postIds,
                    source: 'unlock-link',
                    attributionId: postId,
                    showCallout: req.method === 'GET' && req.path === canonicalPath
                };
                return next();
            } catch (error) {
                return next(error);
            }
        },

        redeemShareLink: async (req, res, next) => {
            try {
                const token = req.params.token;
                const activeLink = await this.getByToken(token);

                if (activeLink) {
                    return res.redirect(302, this._buildPostShareRedirectUrl(activeLink.get('post_id'), token));
                }

                const revokedLink = await this.getByToken(token, {includeRevoked: true});
                if (revokedLink) {
                    return res.redirect(302, urlService.getUrlByResourceId(revokedLink.get('post_id'), {absolute: true}));
                }

                return next();
            } catch (error) {
                return next(error);
            }
        }
    };
}

module.exports = new PostShareLinksService();
