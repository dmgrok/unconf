import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EventConfigurationForm from './EventConfigurationForm.svelte';
import type { Event } from '../../types/entities';

describe('EventConfigurationForm', () => {
  const originalFetch = global.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
  fetchMock = vi.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('prefills fields when initial data is provided', async () => {
    const initialEvent: Partial<Event> = {
      id: 'event-123',
      title: 'Team Summit',
      description: 'Annual planning summit',
      maxParticipants: 80,
      organizerId: 'organizer-1',
      settings: {
        allowGuestAccess: false,
        requireRegistration: false,
        enableVoting: true,
        enableGroupIntelligence: false,
        enableDiscussionGroups: false,
        enableTeamDistribution: false,
        votingTimeLimit: 900,
        maxVotesPerTopic: 1,
        maxTopicsPerUser: 6,
        autoAdvanceActivities: false
      }
    } as Event;

    const { getByLabelText } = render(EventConfigurationForm, {
      props: {
        mode: 'edit',
        eventId: initialEvent.id,
        initialData: initialEvent,
        organizerId: 'organizer-1',
        organizerName: 'Organizer One'
      }
    });

  const titleInput = getByLabelText(/Event Title/i) as HTMLInputElement;
  const capacityInput = getByLabelText(/Maximum Participants/i) as HTMLInputElement;
  const votingTimeInput = getByLabelText(/Voting Time Limit/i) as HTMLInputElement;

    await waitFor(() => {
      expect(titleInput.value).toBe('Team Summit');
      expect(capacityInput.value).toBe('80');
      expect(votingTimeInput.value).toBe('15');
    });
  });

  it('submits create request with normalized payload', async () => {
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        event: { id: 'evt-1', title: 'My Event' }
      })
    });

    const { getByLabelText, container } = render(EventConfigurationForm, {
      props: {
        mode: 'create',
        organizerId: 'org-1',
        organizerName: 'Organizer'
      }
    });

  await fireEvent.input(getByLabelText(/Event Title/i), { target: { value: 'My Event' } });
  await fireEvent.input(getByLabelText(/Maximum Participants/i), { target: { value: '50' } });
  await fireEvent.input(getByLabelText(/Voting Time Limit/i), { target: { value: '7' } });

    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitButton).toBeTruthy();

    await waitFor(() => {
      expect(submitButton.disabled).toBe(false);
    });

    await fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [, options] = fetchMock.mock.calls[0];
    const payload = JSON.parse((options as RequestInit).body as string);

    expect(fetchMock).toHaveBeenCalledWith('/api/events', expect.objectContaining({ method: 'POST' }));
    expect(payload.capacity).toBe(50);
    expect(payload.duration).toBe(3 * 24 * 60 * 60 * 1000);
    expect(payload.settings.votingTimeLimit).toBe(7 * 60);
    expect(payload.settings.votingRounds).toBe(1);

    await waitFor(() => {
      expect((getByLabelText(/Event Title/i) as HTMLInputElement).value).toBe('');
    });
  });

  it('submits edit request and emits eventSaved', async () => {
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        event: { id: 'event-123', title: 'Updated Title' }
      })
    });

    const initialEvent: Partial<Event> = {
      id: 'event-123',
      title: 'Original Title',
      organizerId: 'organizer-1',
      maxParticipants: 40,
      settings: {
        allowGuestAccess: false,
        requireRegistration: false,
        enableVoting: true,
        enableGroupIntelligence: false,
        enableDiscussionGroups: false,
        enableTeamDistribution: false,
        votingTimeLimit: 600,
        maxVotesPerTopic: 1,
        maxTopicsPerUser: 4,
        autoAdvanceActivities: false
      }
    } as Event;

    const { getByLabelText, container } = render(EventConfigurationForm, {
      props: {
        mode: 'edit',
        eventId: 'event-123',
        initialData: initialEvent,
        organizerId: 'organizer-1',
        organizerName: 'Organizer'
      }
    });

    await waitFor(() => {
      expect((getByLabelText(/Event Title/i) as HTMLInputElement).value).toBe('Original Title');
    });

    await fireEvent.input(getByLabelText(/Event Title/i), { target: { value: 'Updated Title' } });
    await fireEvent.input(getByLabelText(/Maximum Participants/i), { target: { value: '120' } });

    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;

    await waitFor(() => {
      expect(submitButton.disabled).toBe(false);
    });

    await fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/events/event-123', expect.objectContaining({ method: 'PUT' }));
    });

    const [, options] = fetchMock.mock.calls[0];
    const payload = JSON.parse((options as RequestInit).body as string);

    expect(payload.maxParticipants).toBe(120);
    expect(payload.settings.allowGuestAccess).toBe(false);
    expect(payload.settings.maxTopicsPerUser).toBe(4);
    expect(payload.settings.votingTimeLimit).toBe(600);
  });

  it('emits error when API responds with failure', async () => {
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve({ success: false, error: 'Validation failed' })
    });

    const { getByLabelText, container } = render(EventConfigurationForm, {
      props: {
        mode: 'create',
        organizerId: 'org-1',
        organizerName: 'Organizer'
      }
    });

  await fireEvent.input(getByLabelText(/Event Title/i), { target: { value: 'My Event' } });
  await fireEvent.input(getByLabelText(/Maximum Participants/i), { target: { value: '30' } });

    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;

    await waitFor(() => {
      expect(submitButton.disabled).toBe(false);
    });

    await fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/events', expect.anything());
    });

  expect((getByLabelText(/Event Title/i) as HTMLInputElement).value).toBe('My Event');
  });
});
