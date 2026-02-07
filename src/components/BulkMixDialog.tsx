import { Alert, Box, Button, DialogActions, FormControl, Link, Stack, TextField, Typography } from "@mui/material";
import { RichTreeView } from "@mui/x-tree-view/RichTreeView";
import type { TreeViewItemId } from '@mui/x-tree-view/models';
import React from "react";
import { useBackend } from "../backend/useBackend";
import { MixTrack, STD_MIX_TYPES } from "../types";
import { AddMixDialogProps } from "./MixDialog";
import { PitchAndSpeedControl } from "./common/PitchAndSpeedControl";
import { toJson } from "./utils";

export function BulkMixDialog({ song, onSwitchMode, onClose } : AddMixDialogProps) {
    // console.log("BulkMixDialog: start render");

    const [isLoading, setIsLoading] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [error, setError] = React.useState<Error>(null);
    const [parts, setParts] = React.useState(new Array<string>())
    const [existingMixes, setExistingMixes] = React.useState(new Array<MixTrack>());
    const [userAddedMixLabels, setUserAddedMixLabels] = React.useState<TreeViewItemId[]>([]);
    const [packageDesc, setPackageDesc] = React.useState('');
    const [pitchShift, setPitchShift] = React.useState(0)
    const [speedFactor, setSpeedFactor] = React.useState(1)

    const parentNodeNames = STD_MIX_TYPES.filter(t => t != 'Full Mix');
    const songClient = useBackend().song(song.id)

    const loadData = React.useCallback(async () => {
        setIsLoading(true)
        try {
            // console.log(`Loading dialog data for song ${song.id}`);
            const partNames = (await songClient.listParts()).map(pt => pt.part);
            setParts(partNames)
            const fetchedMixes = await songClient.listMixes();
            setExistingMixes(fetchedMixes);
        } catch (fetchError) {
            setError(fetchError as Error);
        } finally {
            setIsLoading(false)
            setIsSubmitting(false)
        }
    }, [song, setIsLoading, setParts, setError, setExistingMixes]);

    const mixLabelToName = React.useCallback((name: string) => `${name}${packageDesc ? " " + packageDesc : ""}`, [packageDesc])
    const mixNameToLabel = React.useCallback((name: string) => packageDesc ? name.replace(" " + packageDesc, "") : name, [packageDesc])

    const existingMixNames = React.useMemo(() => existingMixes.map(t => t.mix.name), [existingMixes])
    const userAddedMixNames = userAddedMixLabels.map(mixLabelToName)
    const selectedMixNames = [...(new Set<string>([...userAddedMixNames, ...existingMixNames]))]
    // console.log(`userAddedMixNames: ${toJson(userAddedMixNames)}`)

    React.useEffect(() => { loadData() }, [loadData])

    const mixTree = React.useMemo(() => STD_MIX_TYPES.flatMap(type => {
        return [{
            id: mixLabelToName(type),
            label: type,
            children: (type != 'Full Mix') ? parts.map(part => {
                const label = `${part} ${type}`
                return { 
                    id: mixLabelToName(label), 
                    label: label, 
                }
            }) : []
        }]
    }), [mixLabelToName, parts])

    const handleCancel = React.useCallback(() => {
        onClose(false)
    }, [onClose]);

    const handleSelectionToggle = React.useCallback((event: React.SyntheticEvent, itemId: TreeViewItemId, isSelected: boolean) => {
        // console.log(`handleSelectionToggle: itemId=${itemId} isSelected: ${isSelected}`)
        event.stopPropagation()
        const itemLabel = mixNameToLabel(itemId)
        console.log(`itemLabel='${itemLabel}'`)
        if (isSelected) {
            setUserAddedMixLabels((labels) => [...labels, itemLabel])
        } else {
            setUserAddedMixLabels((labels) => labels.filter(l => l != itemLabel))
        }
    }, [mixNameToLabel, setUserAddedMixLabels])

    const handlePackageDescChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setPackageDesc(e.target.value);
    }, [setPackageDesc]);

    const handleSubmit = React.useCallback(async () => {
        // console.log(`handleSubmit: packageDesc=${packageDesc}; selectedMixNames=${JSON.stringify(selectedMixNames)}`);
        const mixDescriptions = selectedMixNames
            .filter(n => !existingMixNames.includes(n))
            .map(mixNameToLabel)
            .filter(n => !parentNodeNames.includes(n))
        console.log(`Mixes to create for package '${packageDesc}': ${mixDescriptions.join(",")}`)
        // TODO handle errors
        setIsSubmitting(true)
        try {
            await songClient.createMixPackage({ 
                parts, 
                mixDescriptions, 
                packageDescription: packageDesc.trim() || null, 
                speedFactor: speedFactor, 
                pitchShift: pitchShift 
            })
            onClose(true)
        } finally {
            setIsSubmitting(false)
        }
    }, [packageDesc, selectedMixNames, speedFactor, pitchShift, setIsSubmitting]);

    return (
        <Stack spacing={1}>
            <Typography variant="h6">Create or edit a mix package</Typography>
            <Link onClick={onSwitchMode} sx={{ cursor: 'pointer' }} role="button">Switch to Single Mode</Link>
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
                        onItemSelectionToggle={handleSelectionToggle}
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
                    <PitchAndSpeedControl
                        pitchShift={pitchShift}
                        speedFactor={speedFactor}
                        onPitchShiftChange={(v) => { console.log(`Setting pitchShift to ${v}`); setPitchShift(v) }}
                        onSpeedFactorChange={(v) => { console.log(`Setting speedFactor to ${v}`); setSpeedFactor(v) }}/>
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
