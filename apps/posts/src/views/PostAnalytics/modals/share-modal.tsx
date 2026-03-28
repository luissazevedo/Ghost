import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, LucideIcon, formatDisplayDate} from '@tryghost/shade';
import {getPostShareLink, useCreatePostShareLink, useDeletePostShareLink} from '@tryghost/admin-x-framework/api/posts';
import {toast} from 'sonner';
import {useEffect, useMemo, useState} from 'react';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

interface ShareModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    postId: string;
    postTitle: string;
}

const ShareModal: React.FC<ShareModalProps> = ({open, onOpenChange, postId, postTitle}) => {
    const handleError = useHandleError();
    const [isCopied, setIsCopied] = useState(false);
    const {data, isLoading, refetch} = getPostShareLink(postId, {enabled: open});
    const {mutateAsync: createShareLink, isLoading: isCreating} = useCreatePostShareLink();
    const {mutateAsync: deleteShareLink, isLoading: isRevoking} = useDeletePostShareLink();

    const shareLink = data?.post_share_link ?? null;
    const isWorking = isCreating || isRevoking;

    const createdAt = useMemo(() => {
        if (!shareLink?.created_at) {
            return null;
        }

        return formatDisplayDate(shareLink.created_at);
    }, [shareLink?.created_at]);

    useEffect(() => {
        if (open) {
            refetch();
        }
    }, [open, refetch]);

    const handleCreate = async () => {
        try {
            await createShareLink(postId);
            toast.success('Complimentary link created');
        } catch (error) {
            handleError(error);
        }
    };

    const handleRevoke = async () => {
        try {
            await deleteShareLink(postId);
            setIsCopied(false);
            toast.success('Complimentary link revoked');
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='max-w-[560px]'>
                <DialogHeader>
                    <DialogTitle>Complimentary link</DialogTitle>
                    <DialogDescription>
                        Anyone with this link can read this post. Commenting and likes still require signup.
                    </DialogDescription>
                </DialogHeader>

                <div className='space-y-4'>
                    <div className='bg-muted/30 rounded-lg border p-4'>
                        <div className='text-sm font-medium'>{postTitle}</div>
                        {!shareLink && (
                            <p className='mt-2 text-sm text-muted-foreground'>
                                Create one complimentary link for this post, then copy it anywhere you want to send readers.
                            </p>
                        )}
                        {shareLink && (
                            <div className='mt-3 space-y-3'>
                                <div className='space-y-2'>
                                    <label className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Complimentary link</label>
                                    <Input value={shareLink.share_url} readOnly />
                                </div>
                                <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground'>
                                    {createdAt && <span>Created {createdAt}</span>}
                                    <span>{shareLink.view_count} {shareLink.view_count === 1 ? 'open' : 'opens'}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {isLoading && !shareLink && (
                        <div className='text-sm text-muted-foreground'>Loading complimentary link…</div>
                    )}
                </div>

                <DialogFooter className='gap-2 sm:justify-between'>
                    {shareLink ? (
                        <>
                            <Button className='sm:mr-auto' disabled={isWorking} variant='outline' onClick={handleRevoke}>
                                <LucideIcon.Trash2 />
                                Revoke link
                            </Button>
                            <Button disabled={isWorking} onClick={handleCopy}>
                                {isCopied ? <LucideIcon.Check /> : <LucideIcon.Link />}
                                {isCopied ? 'Copied' : 'Copy link'}
                            </Button>
                        </>
                    ) : (
                        <Button disabled={isLoading || isWorking} onClick={handleCreate}>
                            <LucideIcon.Link />
                            Create complimentary link
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ShareModal;
