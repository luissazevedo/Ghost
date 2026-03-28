// # Ghost Foot Helper
// Usage: `{{ghost_foot}}`
//
// Outputs scripts and other assets at the bottom of a Ghost theme
const {settingsCache} = require('../services/proxy');
const {SafeString} = require('../services/handlebars');
const _ = require('lodash');

function getSharedPostCallout(root) {
    const post = root?.post;
    const member = root?.member;
    const site = root?.site;
    const sharedPostAccess = root?._locals?.sharedPostAccess;

    if (!post || !sharedPostAccess?.postIds?.includes(post.id)) {
        return '';
    }

    if (!sharedPostAccess?.showCallout || String(sharedPostAccess?.attributionId || '') !== String(post.id)) {
        return '';
    }

    if (!['paid', 'tiers'].includes(post.visibility)) {
        return '';
    }

    if (member?.status && member.status !== 'free') {
        return '';
    }

    const accentColor = site?.accent_color || '#15171a';
    const allowSelfSignup = site?.allow_self_signup;
    const isFreeMember = member?.status === 'free';
    const cardId = `gh-shared-post-callout-${post.id}`;
    const dismissKey = `gh-shared-post-callout:${post.id}`;

    let body = 'Read this post in full today.';
    let actions = '';

    if (isFreeMember) {
        body = 'You can read it in full today. Upgrade to go further.';
        actions = `
            <a class="gh-shared-post-callout-btn gh-shared-post-callout-btn-primary" data-portal="account/plans" href="#/portal/account/plans">Upgrade to paid</a>
        `;
    } else if (allowSelfSignup) {
        body = 'You can read it in full today. Subscribe to go further.';
        actions = `
            <a class="gh-shared-post-callout-btn gh-shared-post-callout-btn-primary" data-portal="signup" href="#/portal/signup">Subscribe</a>
            <a class="gh-shared-post-callout-btn gh-shared-post-callout-btn-secondary" data-portal="signin" href="#/portal/signin">Sign in</a>
        `;
    } else {
        body = 'You can read it in full today. Subscribe to go further.';
        actions = `
            <a class="gh-shared-post-callout-btn gh-shared-post-callout-btn-primary" data-portal="signup" href="#/portal/signup">Subscribe</a>
            <a class="gh-shared-post-callout-btn gh-shared-post-callout-btn-secondary" data-portal="signin" href="#/portal/signin">Sign in</a>
        `;
    }

    return `
        <style id="gh-shared-post-callout-styles">
            .gh-shared-post-callout {
                position: fixed;
                right: 24px;
                bottom: 24px;
                z-index: 9998;
                width: min(360px, calc(100vw - 32px));
                padding: 16px;
                border: 1px solid rgba(0, 0, 0, 0.08);
                border-radius: 14px;
                background: rgba(255, 255, 255, 0.96);
                color: #15171a;
                box-shadow: 0 16px 40px rgba(0, 0, 0, 0.14);
                backdrop-filter: blur(12px);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            .gh-shared-post-callout-header {
                display: flex;
                align-items: start;
                justify-content: space-between;
                gap: 12px;
                margin-bottom: 8px;
            }
            .gh-shared-post-callout-title {
                margin: 0;
                font-size: 15px;
                font-weight: 700;
                line-height: 1.35;
            }
            .gh-shared-post-callout-copy {
                margin: 0;
                color: #626d79;
                font-size: 14px;
                line-height: 1.5;
            }
            .gh-shared-post-callout-close {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                border: 0;
                border-radius: 999px;
                background: transparent;
                color: #626d79;
                cursor: pointer;
                transition: background-color 0.2s ease, color 0.2s ease;
            }
            .gh-shared-post-callout-close:hover {
                background: rgba(0, 0, 0, 0.06);
                color: #15171a;
            }
            .gh-shared-post-callout-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 14px;
            }
            .gh-shared-post-callout-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-height: 40px;
                padding: 0 14px;
                border-radius: 999px;
                font-size: 14px;
                font-weight: 600;
                text-decoration: none;
                transition: transform 0.15s ease, background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
            }
            .gh-shared-post-callout-btn:hover {
                transform: translateY(-1px);
            }
            .gh-shared-post-callout-btn-primary {
                background: ${accentColor};
                color: #ffffff;
            }
            .gh-shared-post-callout-btn-primary:hover {
                color: #ffffff;
                opacity: 0.94;
            }
            .gh-shared-post-callout-btn-secondary {
                border: 1px solid rgba(0, 0, 0, 0.1);
                background: #ffffff;
                color: #15171a;
            }
            .gh-shared-post-callout-btn-secondary:hover {
                color: #15171a;
                border-color: rgba(0, 0, 0, 0.18);
            }
            @media (max-width: 640px) {
                .gh-shared-post-callout {
                    right: 16px;
                    bottom: 16px;
                    left: 16px;
                    width: auto;
                }
            }
        </style>
        <aside class="gh-shared-post-callout" id="${cardId}" aria-live="polite">
            <div class="gh-shared-post-callout-header">
                <div>
                    <p class="gh-shared-post-callout-title">This paid post was shared with you</p>
                </div>
                <button class="gh-shared-post-callout-close" type="button" aria-label="Dismiss shared post message" data-shared-post-callout-close>&times;</button>
            </div>
            <p class="gh-shared-post-callout-copy">${body}</p>
            <div class="gh-shared-post-callout-actions">
                ${actions}
            </div>
        </aside>
        <script>
            (function () {
                const dismissKey = ${JSON.stringify(dismissKey)};
                const callout = document.getElementById(${JSON.stringify(cardId)});
                if (!callout) {
                    return;
                }

                try {
                    if (window.sessionStorage.getItem(dismissKey) === 'dismissed') {
                        callout.remove();
                        return;
                    }
                } catch (err) {}

                const closeButton = callout.querySelector('[data-shared-post-callout-close]');
                if (!closeButton) {
                    return;
                }

                closeButton.addEventListener('click', function () {
                    try {
                        window.sessionStorage.setItem(dismissKey, 'dismissed');
                    } catch (err) {}
                    callout.remove();
                });
            }());
        </script>
    `;
}

// We use the name ghost_foot to match the helper for consistency:
module.exports = function ghost_foot(options) { // eslint-disable-line camelcase
    const foot = [];

    const globalCodeinjection = settingsCache.get('codeinjection_foot');
    const postCodeinjection = options.data.root && options.data.root.post ? options.data.root.post.codeinjection_foot : null;
    const tagCodeinjection = options.data.root && options.data.root.tag ? options.data.root.tag.codeinjection_foot : null;

    if (!_.isEmpty(globalCodeinjection)) {
        foot.push(globalCodeinjection);
    }

    if (!_.isEmpty(postCodeinjection)) {
        foot.push(postCodeinjection);
    }

    if (!_.isEmpty(tagCodeinjection)) {
        foot.push(tagCodeinjection);
    }

    const sharedPostCallout = getSharedPostCallout(options.data.root);
    if (!_.isEmpty(sharedPostCallout)) {
        foot.push(sharedPostCallout);
    }

    return new SafeString(foot.join(' ').trim());
};
