const nodemailer = require("nodemailer");
const config = require("../config");
const logger = require("../config/logger");

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
	const transportConfig = {
		host: config.EMAIL_HOST,
		port: config.EMAIL_PORT,
		secure: config.EMAIL_SECURE, // true for 465, false for other ports
		auth: {
			user: config.EMAIL_USER,
			pass: config.EMAIL_PASS,
		},
	};

	// For debugging
	logger.info(`Email transporter configured: ${config.EMAIL_HOST}:${config.EMAIL_PORT} (secure: ${config.EMAIL_SECURE})`);

	return nodemailer.createTransport(transportConfig);
};

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string|string[]} options.to - Recipient email address(es)
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 * @returns {Promise<Object>} - Send result
 */
const sendEmail = async ({ to, subject, html, text }) => {
	try {
		if (!config.EMAIL_USER || !config.EMAIL_PASS) {
			logger.warn("Email credentials not configured. Email not sent.");
			return { success: false, message: "Email credentials not configured" };
		}

		const transporter = createTransporter();

		const mailOptions = {
			from: `"PSFSS" <${config.EMAIL_FROM}>`,
			to: Array.isArray(to) ? to.join(", ") : to,
			subject,
			html,
			text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML tags for text version
		};

		const info = await transporter.sendMail(mailOptions);

		logger.info(`Email sent successfully to ${mailOptions.to}`, {
			messageId: info.messageId,
			response: info.response,
		});

		return {
			success: true,
			messageId: info.messageId,
			response: info.response,
		};
	} catch (error) {
		logger.error("Error sending email:", error);
		throw error;
	}
};

/**
 * Generate password reset email HTML
 * @param {Object} params
 * @param {string} params.name - User's name
 * @param {string} params.resetLink - Password reset link
 * @returns {string} - HTML content
 */
const getPasswordResetEmailHTML = ({ name, resetLink }) => {
	return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4;">
        <tr>
            <td style="padding: 40px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Password Reset Request</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.5;">
                                Hello <strong>${name}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.5;">
                                We received a request to reset your password for your PSFSS account. If you didn't make this request, you can safely ignore this email.
                            </p>
                            
                            <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.5;">
                                To reset your password, click the button below:
                            </p>
                            
                            <!-- Button -->
                            <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                <tr>
                                    <td style="border-radius: 4px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                        <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 16px 36px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 4px;">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 30px 0 20px; color: #666666; font-size: 14px; line-height: 1.5;">
                                Or copy and paste this link into your browser:
                            </p>
                            
                            <p style="margin: 0 0 30px; padding: 12px; background-color: #f8f8f8; border-radius: 4px; word-break: break-all;">
                                <a href="${resetLink}" style="color: #667eea; text-decoration: none; font-size: 14px;">${resetLink}</a>
                            </p>
                            
                            <p style="margin: 0 0 10px; color: #999999; font-size: 14px; line-height: 1.5;">
                                <strong>Note:</strong> This link will expire in 1 hour for security reasons.
                            </p>
                            
                            <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.5;">
                                If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px; background-color: #f8f8f8; text-align: center; border-top: 1px solid #eeeeee;">
                            <p style="margin: 0 0 10px; color: #999999; font-size: 14px;">
                                PSFSS  
                            </p>
                            <p style="margin: 0; color: #999999; font-size: 12px;">
                                This is an automated message, please do not reply to this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
	`.trim();
};

/**
 * Send password reset email
 * @param {Object} params
 * @param {string} params.email - User's email
 * @param {string} params.name - User's name
 * @param {string} params.resetToken - Reset token
 * @returns {Promise<Object>} - Send result
 */
const sendPasswordResetEmail = async ({ email, name, resetToken }) => {
	const resetLink = `${config.FRONTEND_URL}/reset-password?token=${resetToken}`;

	return await sendEmail({
		to: email,
		subject: "Reset Your Password - PSFSS",
		html: getPasswordResetEmailHTML({ name, resetLink }),
	});
};

/**
 * Generate password reset OTP email HTML
 * @param {Object} params
 * @param {string} params.name - User's name
 * @param {string} params.otp - 6-digit OTP
 * @returns {string} - HTML content
 */
const getPasswordResetOTPEmailHTML = ({ name, otp }) => {
	return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset OTP</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4;">
        <tr>
            <td style="padding: 40px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Password Reset Code</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.5;">
                                Hello <strong>${name}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.5;">
                                We received a request to reset your password for your PSFSS account. Use the code below to reset your password:
                            </p>
                            
                            <!-- OTP Box -->
                            <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 30px auto; width: 100%;">
                                <tr>
                                    <td style="text-align: center;">
                                        <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px 40px; border-radius: 8px;">
                                            <p style="margin: 0 0 5px; color: rgba(255,255,255,0.8); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Reset Code</p>
                                            <p style="margin: 0; color: #ffffff; font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</p>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 30px 0 20px; color: #666666; font-size: 16px; line-height: 1.5;">
                                Enter this code on the password reset page along with your email and new password.
                            </p>
                            
                            <p style="margin: 0 0 10px; color: #999999; font-size: 14px; line-height: 1.5;">
                                <strong>Important:</strong>
                            </p>
                            <ul style="margin: 0 0 20px; padding-left: 20px; color: #999999; font-size: 14px; line-height: 1.8;">
                                <li>This code will expire in <strong>10 minutes</strong></li>
                                <li>This code can only be used once</li>
                                <li>Do not share this code with anyone</li>
                            </ul>
                            
                            <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.5;">
                                If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px; background-color: #f8f8f8; text-align: center; border-top: 1px solid #eeeeee;">
                            <p style="margin: 0 0 10px; color: #999999; font-size: 14px;">
                                PSFSS  
                            </p>
                            <p style="margin: 0; color: #999999; font-size: 12px;">
                                This is an automated message, please do not reply to this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
	`.trim();
};

/**
 * Send password reset OTP email
 * @param {Object} params
 * @param {string} params.email - User's email
 * @param {string} params.name - User's name
 * @param {string} params.otp - 6-digit OTP
 * @returns {Promise<Object>} - Send result
 */
const sendPasswordResetOTPEmail = async ({ email, name, otp }) => {
	return await sendEmail({
		to: email,
		subject: "Your Password Reset Code - PSFSS",
		html: getPasswordResetOTPEmailHTML({ name, otp }),
	});
};

module.exports = {
	sendEmail,
	sendPasswordResetEmail,
	getPasswordResetEmailHTML,
	sendPasswordResetOTPEmail,
	getPasswordResetOTPEmailHTML,
};
