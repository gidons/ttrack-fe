import { Alert, Box, Button, DialogActions, FormControl, Link, Stack, TextField, Typography } from "@mui/material";
import { RichTreeView } from "@mui/x-tree-view/RichTreeView";
import type { TreeViewItemId } from '@mui/x-tree-view/models';
import React from "react";
import { createMixPackage, getMixesForSong, getPartsForSong } from "../data/songs";
import { MixTrack, Song, STD_MIX_TYPES } from "../types";
import { PitchAndSpeedControl } from "./PitchAndSpeedControl";

export interface BulkMixDialogProps {
    song: Song,
    onSwitchToSingle: () => void,
    onClose: (success: boolean) => void
}

export function BulkMixDialog({song, onSwitchToSingle, onClose } : BulkMixDialogProps) {
    // console.log("BulkMixDialog: start render");

    const [isLoading, setIsLoading] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [error, setError] = React.useState<Error>(null);
    const [parts, setParts] = React.useState(new Array<string>())
    const [existingMixes, setExistingMixes] = React.useState(new Array<MixTrack>());
    const [selectedMixNames, setSelectedMixNames] = React.useState<TreeViewItemId[]>([]);
    const [packageDesc, setPackageDesc] = React.useState('');

    const parentNodeNames = STD_MIX_TYPES.filter(t => t != 'Full Mix');

    const loadData = React.useCallback(async () => {
        setIsLoading(true)
        try {
            // console.log(`Loading dialog data for song ${song.id}`);
            const partNames = (await getPartsForSong(song.id)).map(pt => pt.part);
            setParts(partNames)
            const fetchedMixes = await getMixesForSong(song.id);
            setExistingMixes(fetchedMixes);
            const fetchedNames = fetchedMixes.map(m => m.mix.name);
            const selectedNames = [...(new Set<string>([...selectedMixNames, ...fetchedNames]))];
            setSelectedMixNames(selectedNames)
        } catch (fetchError) {
            setError(fetchError as Error);
        } finally {
            setIsLoading(false)
            setIsSubmitting(false)
        }
    }, [song, setIsLoading, setParts, setError, setExistingMixes, setSelectedMixNames]);

    const existingMixNames = React.useMemo(() => existingMixes.map(t => t.mix.name), [existingMixes])

    React.useEffect(() => { loadData() }, [loadData])

    const mixTree = STD_MIX_TYPES.flatMap(type => {
        return [{
            id: type,
            label: type,
            children: (type != 'Full Mix') ? parts.map(part => {
                const name = `${part} ${type}`
                return { 
                    id: name, 
                    label: name, 
                }
            }) : []
        }]
    })

    // Map of parent id -> children ids for quick lookup
    const parentToChildren = React.useMemo(() => {
        const map = new Map<string, string[]>();
        mixTree.forEach(node => {
            if (node.children && node.children.length > 0) {
                map.set(node.id, node.children.map(c => c.id));
            }
        });
        return map;
    }, [mixTree]);

    // Controlled selection handler: when a parent is selected, add its children to state
    const handleSelectedItemsChange = React.useCallback((event: React.SyntheticEvent | null, itemIds: TreeViewItemId[] | TreeViewItemId) => {
        // Normalize incoming ids to an array
        const incoming: TreeViewItemId[] = Array.isArray(itemIds) ? itemIds : (itemIds ? [itemIds] : []);

        // Build state-only selection where parents are replaced by their children
        const nextSet = new Set<string>(existingMixNames);
        incoming.forEach(id => {
            const children = parentToChildren.get(id);
            nextSet.add(id);
            if (children && children.length > 0) {
                // Parent selected: add all children (do not add the parent itself)
                children.forEach(c => nextSet.add(c));
            }
        });

        setSelectedMixNames([...nextSet]);
    }, [parentToChildren, selectedMixNames, setSelectedMixNames]);

    const handleCancel = React.useCallback(() => {
        onClose(false)
    }, [onClose]);

    const handlePackageDescChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setPackageDesc(e.target.value);
    }, [setPackageDesc]);

    const handleSubmit = React.useCallback(async () => {
        // console.log(`handleSubmit: packageDesc=${packageDesc}; selectedMixNames=${JSON.stringify(selectedMixNames)}`);
        const mixesToCreate = selectedMixNames.filter(n => !parentNodeNames.includes(n) && !existingMixNames.includes(n))
        console.log(`Mixes to create: ${mixesToCreate.join(",")}`)
        // TODO handle errors
        await createMixPackage(song.id, parts, mixesToCreate, packageDesc, 1, 0)
        onClose(true)
    }, [packageDesc, selectedMixNames]);

    return (
        <Stack spacing={1}>
            <Typography variant="h6">Create new mix package for <em>{song?.title??"..."}</em></Typography>
            <Link onClick={onSwitchToSingle}>Switch to Single Mode</Link>
            {error && (
                <Box sx={{ flexGrow: 1 }}>
                    <Alert severity="error">{error.message}</Alert>
                </Box>)}
            <FormControl fullWidth>
                <TextField 
                    name='packageDesc'
                    value={packageDesc}
                    aria-label='Package Description'
                    label='Package Description'
                    onChange={handlePackageDescChange}
                />
            </FormControl>
            <Stack direction={"row"} justifyContent={"space-evenly"}>
                <Stack spacing={0}>
                    <Typography variant="subtitle1">Track types to include:</Typography>
                    <RichTreeView
                        items={mixTree}
                        checkboxSelection={true}
                        selectionPropagation={{parents: false, descendants: true}}
                        multiSelect={true}
                        // Controlled selection: what the tree shows (may include parent ids)
                        selectedItems={selectedMixNames}
                        onSelectedItemsChange={handleSelectedItemsChange}
                        sx={{
                            // Target the TreeItem content when selected and force transparent background so
                            // selection doesn't change the item's background. We scope to classes used by MUI TreeItem.
                            // Leave hover styles untouched so the hover highlight from the theme still works.
                            '& .MuiTreeItem-content.Mui-selected, & .MuiTreeItem-root.Mui-selected > .MuiTreeItem-content': {
                                backgroundColor: 'transparent !important',
                            }
                        }}
                    />
                </Stack>
                <Stack>
                    <PitchAndSpeedControl/>
                </Stack>
            </Stack>
            <DialogActions sx={{ padding: 1, justifyContent: 'space-between', width: '100%' }}>
                <Button onClick={handleCancel}>
                    Cancel
                </Button>
                <Button 
                    variant="contained"
                    color="primary"
                    disabled={isLoading /* || !isValid()*/} 
                    loading={isSubmitting}
                    onClick={handleSubmit}
                    type="submit">
                    Create
                </Button>
            </DialogActions>
        </Stack>
    );
}
