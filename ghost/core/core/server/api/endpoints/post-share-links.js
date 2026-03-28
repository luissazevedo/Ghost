const postShareLinksService = require('../../services/post-share-links');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'post_share_links',

    read: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: {
            docName: 'posts',
            method: 'read'
        },
        async query(frame) {
            return {
                post_share_link: await postShareLinksService.getForAdmin(frame.options.id)
            };
        }
    },

    add: {
        statusCode: 201,
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: {
            docName: 'posts',
            method: 'edit'
        },
        async query(frame) {
            return {
                post_share_link: await postShareLinksService.createForPost(frame.options.id, frame.user?.get?.('id') || frame.user?.id)
            };
        }
    },

    destroy: {
        statusCode: 204,
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: {
            docName: 'posts',
            method: 'edit'
        },
        async query(frame) {
            await postShareLinksService.revokeForPost(frame.options.id);
            return null;
        }
    }
};

module.exports = controller;
