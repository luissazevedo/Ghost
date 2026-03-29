import {Button, LucideIcon} from '@tryghost/shade';
import {getPostShareLink} from '@tryghost/admin-x-framework/api/posts';
import {toast} from 'sonner';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useState} from 'react';

interface ComplimentaryLinkSectionProps {
    postId: string;
}

const ComplimentaryLinkSection: React.FC<ComplimentaryLinkSectionProps> = ({postId}) => {
    const handleError = useHandleError();
    const [isCopied, setIsCopied] = useState(false);
    const {data} = getPostShareLink(postId);

    const shareLink = data?.post_share_link ?? null;

    const handleCopy = async () => {
        if (!shareLink?.share_url) {
            return;
        }

        try {
            await navigator.clipboard.writeText(shareLink.share_url);
            setIsCopied(true);
            toast.success('Complimentary link copied');
            window.setTimeout(() => setIsCopied(false), 2000);
        } catch (error) {
            handleError(error);
        }
    };

    if (!shareLink) {
        return null;
    }

    return (
        <Button
            className='grow cursor-pointer'
            title='Copy complimentary link — anyone with this link can read this post for free'
            variant='outline'
            onClick={handleCopy}
        >
            {isCopied ? <LucideIcon.Check /> : <LucideIcon.LockOpen />}
            {isCopied ? 'Copied!' : 'Copy complimentary link'}
        </Button>
    );
};

export default ComplimentaryLinkSection;
