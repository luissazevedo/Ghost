const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('members_created_events', 'unlock_link_post_id', {
        type: 'string',
        maxlength: 24,
        nullable: true
    }),

    createAddColumnMigration('members_subscription_created_events', 'unlock_link_post_id', {
        type: 'string',
        maxlength: 24,
        nullable: true
    })
);
