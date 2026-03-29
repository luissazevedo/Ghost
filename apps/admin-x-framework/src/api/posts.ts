import {Meta, createQuery, createQueryWithId, createMutation} from '../utils/api/hooks';

export type Email = {
    opened_count: number;
    email_count: number;
    status?: string;
};

export type Post = {
    id: string;
    url: string;
    slug: string;
    title: string;
    visibility?: string;
    uuid: string;
    feature_image?: string;
    count?: {
        clicks?: number;
        positive_feedback?: number;
        negative_feedback?: number;
    };
    email?: Email;
    status?: string;
    published_at?: string;
    newsletter_id?: string;
    newsletter?: object;
    email_only?: boolean;
    email_segment?: string;
    email_recipient_filter?: string;
    send_email_when_published?: boolean;
    email_stats?: object;
};

export interface PostsResponseType {
    meta?: Meta
    posts: Post[];
}

const dataType = 'PostsResponseType';

export const useBrowsePosts = createQuery<PostsResponseType>({
    dataType,
    path: '/posts/'
});

export const getPost = createQueryWithId<PostsResponseType>({
    dataType,
    path: id => `/posts/${id}/`
});

// This endpoints returns a csv file
export const usePostsExports = createQuery<string>({
    dataType,
    path: '/posts/export/'
});

export const useDeletePost = createMutation<unknown, string>({
    method: 'DELETE',
    path: id => `/posts/${id}/`
});

// Search index endpoints for efficient search
export const useSearchIndexPosts = createQuery<PostsResponseType>({
    dataType,
    path: '/search-index/posts/'
});

export type PostShareLink = {
    id: string;
    post_id: string;
    share_url: string;
    post_url: string;
    view_count: number;
    created_at: string;
    updated_at?: string | null;
    revoked_at?: string | null;
};

export interface PostShareLinkResponseType {
    post_share_link: PostShareLink | null;
}

const postShareLinkDataType = 'PostShareLinkResponseType';

type RawPostShareLink = {
    id?: string;
    post_id?: string;
    share_url?: string | null;
    post_url?: string | null;
    view_count?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
    revoked_at?: string | null;
    token?: string;
};

const normalizePostShareLinkResponse = (originalData: unknown): PostShareLinkResponseType => {
    const data = originalData as {
        post_share_link?: PostShareLink | null;
        post_share_links?: RawPostShareLink[] | RawPostShareLink | null;
        token?: string;
        post_id?: string;
        share_url?: string;
        post_url?: string;
        view_count?: number | null;
        created_at?: string | null;
        updated_at?: string | null;
        revoked_at?: string | null;
    };

    const normalizeLink = (link: RawPostShareLink | null | undefined): PostShareLink | null => {
        if (!link || !link.id || !link.post_id) {
            return null;
        }

        const shareUrl = link.share_url || (link.token ? new URL(`/share/${link.token}/`, window.location.origin).toString() : '');
        const postUrl = link.post_url || '';

        return {
            id: link.id,
            post_id: link.post_id,
            share_url: shareUrl,
            post_url: postUrl,
            view_count: link.view_count ?? 0,
            created_at: link.created_at || '',
            updated_at: link.updated_at ?? null,
            revoked_at: link.revoked_at ?? null
        };
    };

    if ('post_share_link' in data) {
        return {
            post_share_link: normalizeLink(data.post_share_link)
        };
    }

    if (Array.isArray(data.post_share_links)) {
        return {
            post_share_link: normalizeLink(data.post_share_links[0])
        };
    }

    return {
        post_share_link: normalizeLink(data.post_share_links ?? data)
    };
};

export const getPostShareLink = createQueryWithId<PostShareLinkResponseType>({
    dataType: postShareLinkDataType,
    path: id => `/posts/${id}/share_link/`,
    returnData: normalizePostShareLinkResponse
});

export const useCreatePostShareLink = createMutation<PostShareLinkResponseType, string>({
    method: 'POST',
    path: id => `/posts/${id}/share_link/`,
    body: () => ({post_share_links: [{}]}),
    returnData: normalizePostShareLinkResponse,
    invalidateQueries: {dataType: postShareLinkDataType}
});

export const useCyclePostShareLink = createMutation<PostShareLinkResponseType, string>({
    method: 'DELETE',
    path: id => `/posts/${id}/share_link/`,
    returnData: normalizePostShareLinkResponse,
    invalidateQueries: {dataType: postShareLinkDataType}
});
