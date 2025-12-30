import jwt from 'jsonwebtoken';

// Get AUTH_SECRET at runtime to avoid build-time errors
function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is not set');
  }
  return secret;
}

export interface ResetTokenPayload {
  email: string;
  userId: string;
  type: 'password_reset';
  createdAt: number;
  expiresAt: number;
}

export interface AccountRecoveryResult {
  success: boolean;
  message: string;
  error?: string;
}

// Generate a password reset token (for future email/password authentication)
export function generateResetToken(email: string, userId: string): string {
  const now = Date.now();
  const expiresAt = now + (60 * 60 * 1000); // 1 hour

  const payload: ResetTokenPayload = {
    email,
    userId,
    type: 'password_reset',
    createdAt: now,
    expiresAt
  };

  return jwt.sign(payload, getAuthSecret(), {
    expiresIn: '1h',
    issuer: 'unconf-app',
    subject: userId
  });
}

// Verify a password reset token
export function verifyResetToken(token: string): ResetTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getAuthSecret(), {
      issuer: 'unconf-app'
    }) as ResetTokenPayload;

    // Check if token is expired
    if (decoded.expiresAt && Date.now() > decoded.expiresAt) {
      return null;
    }

    // Validate token type
    if (decoded.type !== 'password_reset') {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Reset token verification failed:', error);
    return null;
  }
}

// Account recovery utilities
export const accountRecovery = {
  // Handle OAuth account recovery (Google, etc.)
  handleOAuthRecovery: async (email: string): Promise<AccountRecoveryResult> => {
    // For OAuth providers, users should use the provider's recovery system
    return {
      success: false,
      message: 'For Google accounts, please use Google\'s account recovery system. Visit https://accounts.google.com/signin/recovery',
      error: 'oauth_recovery_not_supported'
    };
  },

  // Handle guest account recovery
  handleGuestRecovery: async (sessionId?: string): Promise<AccountRecoveryResult> => {
    // Guest accounts are temporary and cannot be recovered
    return {
      success: false,
      message: 'Guest accounts are temporary and cannot be recovered. You can create a new guest session or sign up for a permanent account.',
      error: 'guest_recovery_not_supported'
    };
  },

  // Future: Handle email/password account recovery
  handleEmailRecovery: async (email: string): Promise<AccountRecoveryResult> => {
    // This would be implemented when we add email/password authentication
    try {
      // 1. Check if user exists with this email
      // 2. Generate reset token
      // 3. Send reset email
      // 4. Return success

      const resetToken = generateResetToken(email, 'placeholder-user-id');

      // In a real implementation, you would:
      // - Look up the user by email
      // - Generate the token with the real user ID
      // - Send an email with the reset link
      // - Store the token temporarily (Redis, database, etc.)

      return {
        success: true,
        message: 'If an account with that email exists, we\'ve sent a password reset link. Please check your email.'
      };
    } catch (error) {
      console.error('Email recovery error:', error);
      return {
        success: false,
        message: 'An error occurred while processing your request. Please try again.',
        error: 'recovery_failed'
      };
    }
  },

  // Main recovery handler - determines the type and routes appropriately
  initiateRecovery: async (
    email?: string,
    sessionId?: string,
    accountType?: 'oauth' | 'guest' | 'email'
  ): Promise<AccountRecoveryResult> => {
    // Determine account type if not provided
    if (!accountType) {
      if (sessionId?.startsWith('guest_')) {
        accountType = 'guest';
      } else if (email?.includes('@gmail.com') || email?.includes('@googlemail.com')) {
        accountType = 'oauth';
      } else if (email) {
        accountType = 'email';
      } else {
        return {
          success: false,
          message: 'Please provide an email address or session information.',
          error: 'insufficient_information'
        };
      }
    }

    switch (accountType) {
      case 'oauth':
        return accountRecovery.handleOAuthRecovery(email!);

      case 'guest':
        return accountRecovery.handleGuestRecovery(sessionId);

      case 'email':
        return accountRecovery.handleEmailRecovery(email!);

      default:
        return {
          success: false,
          message: 'Invalid account type.',
          error: 'invalid_account_type'
        };
    }
  }
};

// Email templates (for future use)
export const emailTemplates = {
  passwordReset: (resetUrl: string, userName: string) => ({
    subject: 'Reset your UnConf password',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2>Reset your password</h2>
        <p>Hi ${userName},</p>
        <p>You requested a password reset for your UnConf account. Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request this password reset, you can safely ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 14px;">
          UnConf Team<br>
          This is an automated message, please do not reply.
        </p>
      </div>
    `,
    text: `
      Reset your password

      Hi ${userName},

      You requested a password reset for your UnConf account.

      Please visit this link to reset your password: ${resetUrl}

      This link will expire in 1 hour for security reasons.

      If you didn't request this password reset, you can safely ignore this email.

      UnConf Team
    `
  }),

  accountRecovery: (recoveryUrl: string, userName: string) => ({
    subject: 'UnConf account recovery',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2>Account Recovery</h2>
        <p>Hi ${userName},</p>
        <p>We received a request to help you regain access to your UnConf account.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${recoveryUrl}"
             style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Recover Account
          </a>
        </div>
        <p>This link will expire in 24 hours for security reasons.</p>
        <p>If you didn't request account recovery, please contact our support team immediately.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 14px;">
          UnConf Team<br>
          This is an automated message, please do not reply.
        </p>
      </div>
    `
  })
};

// Utility functions for password validation (for future email/password auth)
export const passwordUtils = {
  // Password strength validation
  validatePassword: (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Generate secure random password
  generateSecurePassword: (length: number = 16): string => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
    let password = '';

    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return password;
  }
};