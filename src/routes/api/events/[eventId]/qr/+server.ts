import { json } from '@sveltejs/kit';
import { EventRepository } from '$lib/storage';
import QRCode from 'qrcode';

// Initialize repository
const eventRepository = new EventRepository({
  dataDir: './data',
  enableBackups: true,
  backupRetention: 10
});

export async function GET({ params, url }) {
  try {
    const { eventId } = params;
    const format = url.searchParams.get('format') || 'data-url'; // 'data-url' or 'svg'
    
    // Get event to validate existence and get access code
    const eventResult = await eventRepository.findById(eventId);
    if (!eventResult.success) {
      return json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }
    
    const event = eventResult.data!;
    
    // Generate QR code URL (you'll want to replace with your actual domain)
    const baseUrl = url.origin || 'https://your-domain.com';
    const qrCodeUrl = `${baseUrl}/events/join?code=${event.accessCode}`;
    
    try {
      let qrCodeData: string;
      
      if (format === 'svg') {
        qrCodeData = await QRCode.toString(qrCodeUrl, {
          type: 'svg',
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
      } else {
        // Default to data URL (base64 PNG)
        qrCodeData = await QRCode.toDataURL(qrCodeUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
      }
      
      // Update event with QR code if not already set
      if (!event.qrCode) {
        await eventRepository.update(eventId, { qrCode: qrCodeData });
      }
      
      return json({
        success: true,
        qrCode: qrCodeData,
        accessCode: event.accessCode,
        joinUrl: qrCodeUrl,
        format
      });
      
    } catch (qrError) {
      console.error('QR Code generation error:', qrError);
      return json({
        success: false,
        error: 'Failed to generate QR code'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('QR code endpoint error:', error);
    return json({
      success: false,
      error: 'Failed to generate QR code'
    }, { status: 500 });
  }
}