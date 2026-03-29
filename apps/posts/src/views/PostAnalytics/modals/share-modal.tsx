import {Button, Input, LucideIcon, Popover, PopoverContent, PopoverTrigger} from '@tryghost/shade';
import {getPostShareLink, useCyclePostShareLink} from '@tryghost/admin-x-framework/api/posts';
import {toast} from 'sonner';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useMemo, useState} from 'react';

interface ComplimentaryLinkPanelProps {
    postId: string;
    children: React.ReactNode;
}

const ComplimentaryLinkPanel: React.FC<ComplimentaryLinkPanelProps> = ({postId, children}) => {
    const handleError = useHandleError();
    const [isCopied, setIsCopied] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const {data, isLoading} = getPostShareLink(postId, {enabled: isOpen});
    const {mutateAsync: cycleShareLink, isLoading: isCycling} = useCyclePostShareLink();

    const shareLink = data?.post_share_link ?? null;

    const viewCount = useMemo(() => {
        if (!shareLink) {
            return null;
        }
        const count = shareLink.view_count ?? 0;
        return `${count} ${count === 1 ? 'open' : 'opens'}`;
    }, [shareLink]);

    const handleCycle = async () => {
        try {
            await cycleShareLink(postId);
            setIsCopied(false);
            toast.success('Complimentary link revoked. New link generated.');
        } catch (error) {
            handleError(error);
        }
    };

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

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent align='start' className='w-[340px]'>
                <div className='space-y-3'>
                    <h4 className='text-sm font-semibold'>Complimentary link</h4>
                    <p className='text-xs text-muted-foreground'>
                        Anyone with this link can read this post.
                    </p>

                    {isLoading && !shareLink && (
                        <div className='text-xs text-muted-foreground'>Loading…</div>
                    )}

                    {shareLink && (
                        <>
                            <Input className='text-xs' value={shareLink.share_url} readOnly />
                            <div className='text-xs text-muted-foreground'>
                                {viewCount}
                            </div>
                            <div className='flex items-center gap-2'>
                                <Button className='grow' disabled={isCycling} size='sm' onClick={handleCopy}>
                                    {isCopied ? <LucideIcon.Check className='size-3.5' /> : <LucideIcon.Link className='size-3.5' />}
                                    {isCopied ? 'Copied' : 'Copy link'}
                                </Button>
                                <Button disabled={isCycling} size='sm' title='Revoke and generate new link' variant='outline' onClick={handleCycle}>
                                    <LucideIcon.RefreshCw className='size-3.5' />
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default ComplimentaryLinkPanel;
