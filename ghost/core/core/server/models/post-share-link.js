const ghostBookshelf = require('./base');

const PostShareLink = ghostBookshelf.Model.extend({
    tableName: 'post_share_links',

    post() {
        return this.belongsTo('Post', 'post_id');
    },

    createdBy() {
        return this.belongsTo('User', 'created_by');
    }
});

const PostShareLinks = ghostBookshelf.Collection.extend({
    model: PostShareLink
});

module.exports = {
    PostShareLink: ghostBookshelf.model('PostShareLink', PostShareLink),
    PostShareLinks: ghostBookshelf.collection('PostShareLinks', PostShareLinks)
};
