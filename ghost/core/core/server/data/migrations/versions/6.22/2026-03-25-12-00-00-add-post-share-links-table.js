const {addTable} = require('../../utils');

module.exports = addTable('post_share_links', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    post_id: {type: 'string', maxlength: 24, nullable: false, references: 'posts.id', cascadeDelete: true},
    token: {type: 'string', maxlength: 191, nullable: false, unique: true},
    created_by: {type: 'string', maxlength: 24, nullable: true, references: 'users.id', setNullDelete: true},
    view_count: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0},
    revoked_at: {type: 'dateTime', nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    '@@INDEXES@@': [
        ['post_id'],
        ['revoked_at']
    ]
});
