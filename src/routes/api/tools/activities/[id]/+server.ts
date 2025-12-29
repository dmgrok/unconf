import { json, type RequestEvent } from '@sveltejs/kit';
import type { SavedActivity, ActivityData } from '$lib/types/tools';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = './data/tools';
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activities.json');

async function readActivities(): Promise<SavedActivity[]> {
  try {
    const data = await fs.readFile(ACTIVITIES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeActivities(activities: SavedActivity[]): Promise<void> {
  await fs.writeFile(ACTIVITIES_FILE, JSON.stringify(activities, null, 2));
}

// GET - Get activity by ID or shareCode
export async function GET(event: RequestEvent) {
  const id = (event.params as Record<string, string>).id;
  const activities = await readActivities();
  
  // Find by ID or shareCode
  const activity = activities.find(a => a.id === id || a.shareCode === id);
  
  if (!activity) {
    return json({ success: false, error: 'Activity not found' }, { status: 404 });
  }
  
  return json({ success: true, data: activity });
}

// PUT - Update activity
export async function PUT(event: RequestEvent) {
  const session = await event.locals.auth();
  
  if (!session?.user?.id) {
    return json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }
  
  const id = (event.params as Record<string, string>).id;
  const activities = await readActivities();
  const index = activities.findIndex(a => a.id === id);
  
  if (index === -1) {
    return json({ success: false, error: 'Activity not found' }, { status: 404 });
  }
  
  const activity = activities[index];
  
  // Only owner can update
  if (activity.createdBy !== session.user.id) {
    return json({ success: false, error: 'Not authorized to update this activity' }, { status: 403 });
  }
  
  try {
    const body = await event.request.json();
    const { name, description, eventId, data } = body as {
      name?: string;
      description?: string;
      eventId?: string | null;
      data?: ActivityData;
    };
    
    // Update fields if provided
    if (name !== undefined) activity.name = name;
    if (description !== undefined) activity.description = description;
    if (eventId !== undefined) activity.eventId = eventId || undefined;
    if (data !== undefined) activity.data = data;
    
    activity.updatedAt = new Date().toISOString();
    
    activities[index] = activity;
    await writeActivities(activities);
    
    return json({ success: true, data: activity });
  } catch (err) {
    console.error('Error updating activity:', err);
    return json({ success: false, error: 'Failed to update activity' }, { status: 500 });
  }
}

// DELETE - Delete activity
export async function DELETE(event: RequestEvent) {
  const session = await event.locals.auth();
  
  if (!session?.user?.id) {
    return json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }
  
  const id = (event.params as Record<string, string>).id;
  const activities = await readActivities();
  const index = activities.findIndex(a => a.id === id);
  
  if (index === -1) {
    return json({ success: false, error: 'Activity not found' }, { status: 404 });
  }
  
  const activity = activities[index];
  
  // Only owner can delete
  if (activity.createdBy !== session.user.id) {
    return json({ success: false, error: 'Not authorized to delete this activity' }, { status: 403 });
  }

  activities.splice(index, 1);
  await writeActivities(activities);
  
  return json({ success: true, message: 'Activity deleted' });
}
