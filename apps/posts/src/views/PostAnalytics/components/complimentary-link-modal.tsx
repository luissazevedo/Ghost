import {Button, Dialog, DialogContent, DialogHeader, DialogTitle, LucideIcon} from '@tryghost/shade';
import {toast} from 'sonner';
import {useEffect, useState} from 'react';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

function getApiRoot() {
    const path = window.location.pathname;
    const subdir = path.substring(0, path.search('/ghost/'));
    return `${subdir}/ghost/api/admin`;
}

interface ShareLink {
    share_url: string;
    view_count: number;
}

interface ComplimentaryLinkModalProps {
    postId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ComplimentaryLinkModal: React.FC<ComplimentaryLinkModalProps> = ({postId, open, onOpenChange}) => {
    const handleError = useHandleError();
    const [isCopied, setIsCopied] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [shareLink, setShareLink] = useState<ShareLink | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const apiBase = getApiRoot();

    useEffect(() => {
        if (open && postId) {
            setIsLoading(true);
            fetch(`${apiBase}/posts/${postId}/share_link/`, {credentials: 'include'})
                .then(res => res.json())
                .then((data) => {
                    setShareLink(data?.post_share_link || null);
                })
                .catch(() => setShareLink(null))
                .finally(() => setIsLoading(false));
        }
    }, [open, postId, apiBase]);

    const viewCount = shareLink
        ? `${shareLink.view_count ?? 0} ${shareLink.view_count === 1 ? 'open' : 'opens'}`
        : null;

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

    const handleReset = async () => {
        setIsResetting(true);
        try {
            const res = await fetch(`${apiBase}/posts/${postId}/share_link/`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            const newLink = data?.post_share_link || null;
            setShareLink(newLink);
            setIsCopied(false);
            setShowResetConfirm(false);
            toast.success('Complimentary link reset. New link generated.');
        } catch (error) {
            handleError(error);
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            if (!isOpen) {
                setShowResetConfirm(false);
            }
            onOpenChange(isOpen);
        }}>
            <DialogContent className='max-w-[420px] overflow-hidden p-6'>
                <DialogHeader>
                    <DialogTitle className='text-lg font-bold'>Complimentary link</DialogTitle>
                </DialogHeader>
                {isLoading || !shareLink ? (
                    <div className='py-2 text-sm text-muted-foreground'>Loading…</div>
                ) : (
                    <div className='w-full space-y-3'>
                        <div className='relative'>
                            <input
                                className='w-full truncate rounded-md border bg-transparent px-3 py-2 pr-10 text-sm text-muted-foreground outline-none'
                                value={shareLink.share_url}
                                readOnly
                            />
                            {!showResetConfirm &&
                                <button
                                    className='absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground'
                                    type='button'
                                    onClick={handleCopy}
                                >
                                    {isCopied ? <LucideIcon.Check className='size-4' /> : <LucideIcon.Link className='size-4' />}
                                </button>
                            }
                        </div>
                        {showResetConfirm ? (
                            <div className='space-y-3'>
                                <p className='text-sm text-muted-foreground'>Anyone using the current link will lose access. Are you sure?</p>
                                <div className='flex gap-2'>
                                    <Button
                                        className='grow cursor-pointer'
                                        variant='outline'
                                        onClick={() => setShowResetConfirm(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        className='grow cursor-pointer'
                                        disabled={isResetting}
                                        onClick={handleReset}
                                    >
                                        {isResetting ? 'Resetting…' : 'Reset link'}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className='flex items-center justify-between text-sm text-muted-foreground'>
                                <span>{viewCount}</span>
                                <button
                                    className='cursor-pointer hover:text-foreground'
                                    type='button'
                                    onClick={() => setShowResetConfirm(true)}
                                >
                                    Reset
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ComplimentaryLinkModal;
