import twilio from 'twilio';

let twilioClient: ReturnType<typeof twilio> | null = null;

export function initializeTwilio() {
  if (twilioClient) return twilioClient;

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      console.warn('Twilio credentials not configured. SMS sending will be disabled.');
      return null;
    }

    twilioClient = twilio(accountSid, authToken);
    console.log('Twilio initialized successfully');
    return twilioClient;
  } catch (error) {
    console.error('Failed to initialize Twilio:', error);
    return null;
  }
}

export async function sendBillSms(toPhoneNumber: string, billNumber: string, downloadUrl: string): Promise<string> {
  try {
    const client = initializeTwilio();
    if (!client) throw new Error('Twilio not initialized');

    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber) throw new Error('Twilio phone number not configured');

    // Format phone number (ensure it starts with +91 for India)
    let formattedPhone = toPhoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+91' + formattedPhone.substring(1);
      } else if (formattedPhone.length === 10) {
        formattedPhone = '+91' + formattedPhone;
      } else {
        formattedPhone = '+' + formattedPhone;
      }
    }

    const message = `Hi! Your bill ${billNumber} is ready. Download it here: ${downloadUrl}`;

    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: formattedPhone,
    });

    console.log(`SMS sent successfully. SID: ${result.sid}`);
    return result.sid;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw new Error(`SMS sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function checkSmsSendingStatus(smsSid: string): Promise<string> {
  try {
    const client = initializeTwilio();
    if (!client) throw new Error('Twilio not initialized');

    const message = await client.messages(smsSid).fetch();
    return message.status; // 'queued', 'sending', 'sent', 'failed', 'delivered'
  } catch (error) {
    console.error('Error checking SMS status:', error);
    throw error;
  }
}

export function isTwilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}
