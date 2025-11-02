import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import * as React from 'react';
import { DialogProps, OpenDialogOptions, useDialogLoadingButton } from "./useDialogs";

export interface DialogValidationError {
    field: string;
    message: string;
}

/**
 * A dialog that contains a form with async processing:
 * - The payload can be anything, but it's treated as a form.
 * - On open, will call loadData() to asynchronously load any data needed to show the dialog
 *   contents, and show a loading UI until it completes.
 * - On "Ok" will call onClose(), await the results, and then complete the promise.
 */
export interface FormDialogOptions<R> extends OpenDialogOptions<R> {
    /**
     * The text to show in the "Ok" button. Defaults to `'Ok'`.
     */
    okText?: React.ReactNode;
    /**
     * The text to show in the "Cancel" button. Defaults to `'Cancel'`.
     */
    cancelText?: React.ReactNode;
    /**
     * An async function to invoke before showing the dialog contents.
     */
    loadData?: () => Promise<void>;
    /**
     * A sync function to validate before submitting
     */
    validate?: () => DialogValidationError[]
}

export interface FormDialogPayload<R> extends FormDialogOptions<R> {
    title: React.ReactNode;
    content: React.ReactNode;
    onSubmit: () => Promise<R>;
}

export interface FormDialogProps<R>
    extends DialogProps<FormDialogPayload<R>, R> { }

export interface OpenFormDialog<R> {
    (title: React.ReactNode, onSubmit: () => Promise<R>, options?: FormDialogOptions<R>): Promise<R>;
}

export function FormDialog<R>({ open, payload, onClose }: FormDialogProps<R>) {
    // console.log(`Rendering FormDialog: onClose=${onClose}`);
    const cancelButtonProps = useDialogLoadingButton(() => {
        return onClose(null);
    });

    const [loading, setLoading] = React.useState(true);
    const [submitting, setSubmitting] = React.useState(false);

    const loadData = React.useCallback(async () => { 
        try {
            if (payload.loadData) {
                setLoading(true);
                await payload.loadData();
            }
        } finally {
            setLoading(false);
        }
    }, [payload.loadData, setLoading]);
    React.useEffect(() => { loadData() }, [loadData]);

    const isValid = React.useCallback(() => {
        const valid = payload.validate ? !(payload.validate().length) : true;
        // console.log(`isValid: ${valid}`);
        return valid;
    }, [payload.validate])

    return (
        <Dialog
            maxWidth="xs"
            fullWidth
            open={open}
            onClose={() => onClose(null)}
            slotProps={{
                paper: {
                    component: 'form',
                    onSubmit: async (event: React.FormEvent<HTMLFormElement>) => {
                        event.preventDefault();
                        try {
                            setSubmitting(true);
                            const result = await payload.onSubmit();
                            await onClose(result);
                        } catch(e) { 
                            alert('Error: ' + e);
                        } finally {
                            setSubmitting(false);
                        }
                    },
                },
            }}
        >
            <DialogTitle>{payload.title ?? 'Enter Data'}</DialogTitle>
            <DialogContent>
                {payload.content}
            </DialogContent>
            <DialogActions>
                <Button disabled={!open} {...cancelButtonProps}>
                    {payload.cancelText ?? 'Cancel'}
                </Button>
                <Button disabled={!open || loading || !isValid()} loading={submitting} type="submit">
                    {payload.okText ?? 'Ok'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
