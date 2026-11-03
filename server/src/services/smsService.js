import { env } from '../config/env.js';

export const smsService = {
  /**
   * Send a one-time OTP code to a phone number.
   * Behind an interface so real SMS gateway (e.g. Twilio, Infobip, or Ethiopian SMS gateway) can be plugged in.
   */
  async sendOtp(phone, code) {
    if (env.SMS_PROVIDER === 'console' || env.NODE_ENV === 'development') {
      console.log('--------------------------------------------------');
      console.log(`[SMS OTP SERVICE]`);
      console.log(`To:       ${phone}`);
      console.log(`Code:     ${code}`);
      console.log(`Valid:    5 minutes`);
      console.log(`Sent at:  ${new Date().toISOString()}`);
      console.log('--------------------------------------------------');
      return { success: true, provider: 'console', code };
    }

    // Placeholder for third-party SMS provider integration
    console.log(`[SMS OTP sent via ${env.SMS_PROVIDER} to ${phone}]`);
    return { success: true, provider: env.SMS_PROVIDER };
  }
};

