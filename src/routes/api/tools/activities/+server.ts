import { json, type RequestEvent } from '@sveltejs/kit';
import { generateId, generateActivityCode, type SavedActivity, type ActivityData } from '$lib/types/tools';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = './data/tools';
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activities.json');

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    // Directory already exists
  }
}

async function readActivities(): Promise<SavedActivity[]> {
  try {
    const data = await fs.readFile(ACTIVITIES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeActivities(activities: SavedActivity[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(ACTIVITIES_FILE, JSON.stringify(activities, null, 2));
}

// GET - List activities for current user or by eventId
export async function GET({ url, locals }: RequestEvent) {
  const session = await locals.auth();
  
  if (!session?.user?.id) {
    return json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }
  
  const eventId = url.searchParams.get('eventId');
  const activities = await readActivities();
  
  let filtered = activities.filter(a => a.createdBy === session.user!.id);
  
  if (eventId) {
    filtered = filtered.filter(a => a.eventId === eventId);
  }
  
  return json({ success: true, data: filtered });
}

// POST - Create a new activity
export async function POST({ request, locals }: RequestEvent) {
  const session = await locals.auth();
  
  if (!session?.user?.id) {
    return json({ success: false, error: 'You must be signed in to save activities' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { type, name, description, eventId, data } = body as {
      type: SavedActivity['type'];
      name: string;
      description?: string;
      eventId?: string;
      data: ActivityData;
    };
    
    if (!type || !name || !data) {
      return json({ success: false, error: 'Missing required fields: type, name, data' }, { status: 400 });
    }
    
    const now = new Date().toISOString();
    const activity: SavedActivity = {
      id: generateId(),
      type,
      name,
      description,
      eventId,
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
      shareCode: generateActivityCode(),
      data,
    };
    
    const activities = await readActivities();
    activities.push(activity);
    await writeActivities(activities);
    
    return json({ success: true, data: activity }, { status: 201 });
  } catch (err) {
    console.error('Error creating activity:', err);
    return json({ success: false, error: 'Failed to create activity' }, { status: 500 });
  }
}
