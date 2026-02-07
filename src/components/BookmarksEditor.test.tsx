import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import BookmarksEditor from './BookmarksEditor'
import NotificationsProvider from '../hooks/useNotifications/NotificationsProvider'
import { PartTrack, TimedTextEntry } from '../types'

// Mock useBackend
vi.mock('../backend/useBackend', () => {
  return {
    useBackend: () => ({
      song: () => ({
        part: () => mockedPartClient,
      }),
    }),
  }
})

const sampleBookmarks: TimedTextEntry[] = [
  { t: 0, v: 'Intro' },
  { t: 30000, v: 'Verse' },
]

const mockedPartClient = {
  getText: vi.fn(async () => sampleBookmarks.slice()),
  putText: vi.fn(async () => {}),
}

function renderWithProviders(track?: Partial<PartTrack>) {
  const partTrack: PartTrack = {
    trackId: 't1',
    songId: 's1',
    durationSec: 120,
    created: new Date(),
    updated: new Date(),
    currentTaskId: '',
    url: '/songs/s1/parts/t1',
    mediaUrl: '/media/fake.mp3',
    part: 'Tenor',
    ...track,
  }

  return render(
    <NotificationsProvider>
      <BookmarksEditor partTrack={partTrack} />
    </NotificationsProvider>
  )
}

describe('BookmarksEditor', () => {
  beforeEach(() => {
    const getTextMock = mockedPartClient.getText as unknown as { mockClear: () => void }
    const putTextMock = mockedPartClient.putText as unknown as { mockClear: () => void }
    getTextMock.mockClear()
    putTextMock.mockClear()
  })

  test('loads and displays bookmarks', async () => {
    renderWithProviders()
  // wait for bookmarks to render (values are in inputs)
  expect(await screen.findByDisplayValue('Intro')).toBeInTheDocument()
  expect(await screen.findByDisplayValue('Verse')).toBeInTheDocument()
  })

  test('adds a bookmark at current audio time', async () => {
    renderWithProviders()
  // wait for bookmarks to render (value is inside input)
  await screen.findByDisplayValue('Intro')
  // mock currentTime on HTMLMediaElement
  vi.spyOn(HTMLMediaElement.prototype, 'currentTime', 'get').mockReturnValue(42)

  const addBtn = screen.getByRole('button', { name: /add/i })
  fireEvent.click(addBtn)

  // new bookmark with empty description should appear
  expect(await screen.findAllByPlaceholderText('Enter description')).toHaveLength(3)
  })

  test('edits description and deletes bookmark, then saves', async () => {
    renderWithProviders()
  await screen.findByDisplayValue('Intro')
  const descFields = await screen.findAllByPlaceholderText('Enter description')
    // edit first
    fireEvent.change(descFields[0], { target: { value: 'Intro edited' } })
    expect((descFields[0] as HTMLInputElement).value).toBe('Intro edited')

    // delete second row
    const deleteButtons = screen.getAllByLabelText('delete')
    fireEvent.click(deleteButtons[1])

    // now save
    const saveBtn = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveBtn)

  await waitFor(() => expect((mockedPartClient.putText as unknown)).toHaveBeenCalled())
  const putTextMock = mockedPartClient.putText as unknown as { mock: { calls: unknown[][] } }
  const calls = putTextMock.mock.calls
  expect(calls.length).toBeGreaterThan(0)
  const saved = calls[0][1] as TimedTextEntry[] | undefined
  // confirm saved entries reflect the edited first entry and one less item
  expect(saved).toBeDefined()
  expect(saved!.some((e: TimedTextEntry) => e.v === 'Intro edited')).toBeTruthy()
  expect(saved!.length).toBe(sampleBookmarks.length - 1)
  })

  test('shows notification on save failure', async () => {
  mockedPartClient.putText.mockImplementationOnce(async () => { throw new Error('boom') })
  renderWithProviders()
  // wait for rendered inputs
  await screen.findByDisplayValue('Intro')
  const saveBtn = await screen.findByRole('button', { name: /save/i })
  fireEvent.click(saveBtn)
  // Notification shows error text
  await waitFor(() => expect(screen.getByText(/Failed to save bookmarks/i)).toBeInTheDocument())
  })
})
