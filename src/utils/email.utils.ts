import nodemailer from 'nodemailer';

export interface FileAttachment {
  url: string;
  name: string;
  size: number;
  type: string;
}

export interface OrderFormData {
  email: string;
  countryCode: string;
  phoneNumber: string;
  subjectCode: string;
  description: string;
  deadline: string;
  pages: string;
  acceptTerms: boolean;
  attachments?: FileAttachment[];
  orderId?: string;
}

// Create nodemailer transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // You can change this to other services
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Use app password for Gmail
    },
  });
};

// Send order notification email
export const sendOrderNotificationEmail = async (formData: OrderFormData): Promise<boolean> => {
  try {
    const transporter = createTransporter();

    const emailContent = `
      <h2>New Assignment Order Received</h2>
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h3>Order Details:</h3>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Email:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${formData.email}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Phone:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${formData.countryCode} ${formData.phoneNumber}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Subject/Course Code:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${formData.subjectCode}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Deadline:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${formData.deadline}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Pages:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${formData.pages}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Description:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${formData.description}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Terms Accepted:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${formData.acceptTerms ? 'Yes' : 'No'}</td>
          </tr>
          ${formData.attachments && formData.attachments.length > 0 ? `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Attached Files:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">
              ${formData.attachments.map(file => `
                <div style="margin-bottom: 8px;">
                  <a href="${file.url}" target="_blank" style="color: #0066cc; text-decoration: none;">
                    ${file.name} (${(file.size / 1024).toFixed(2)} KB)
                  </a>
                </div>
              `).join('')}
            </td>
          </tr>
          ` : ''}
        </table>
        
        <p style="margin-top: 20px;"><strong>Submitted on:</strong> ${new Date().toLocaleString()}</p>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.NOTIFICATION_EMAIL || process.env.EMAIL_USER,
      subject: `New Assignment Order - ${formData.subjectCode}`,
      html: emailContent,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Send confirmation email to customer
export const sendCustomerConfirmationEmail = async (formData: OrderFormData): Promise<boolean> => {
  try {
    const transporter = createTransporter();

    const emailContent = `
      <h2>Order Confirmation - Ping Assignment Help UK</h2>
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <p>Dear Student,</p>
        
        <p>Thank you for choosing Ping Assignment Help UK! We have successfully received your order and our expert writers are ready to work on your assignment.</p>
        
        <h3>Your Order Summary:</h3>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Subject/Course:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${formData.subjectCode}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Deadline:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${formData.deadline}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Pages:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${formData.pages}</td>
          </tr>
        </table>
        
        <h3>What Happens Next?</h3>
        <ul>
          <li>Our team will review your requirements within 1 hour</li>
          <li>You'll receive a quote and payment details</li>
          <li>Once payment is confirmed, our expert writers will start working</li>
          <li>You'll receive regular updates on your assignment progress</li>
        </ul>
        
        <p><strong>Need immediate assistance?</strong> Contact us on WhatsApp: ${process.env.WHATSAPP_NUMBER || '+44 7XXX XXXXXX'}</p>
        
        <p>Best regards,<br/>
        Ping Assignment Help UK Team</p>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: formData.email,
      subject: 'Order Confirmation - Ping Assignment Help UK',
      html: emailContent,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return false;
  }
};

// Generate WhatsApp message
export const generateWhatsAppMessage = (formData: OrderFormData): string => {
  const message = `
*New Assignment Order*

*Order ID:* ${formData.orderId || 'Pending'}
*Email:* ${formData.email}
*Phone:* ${formData.countryCode} ${formData.phoneNumber}
*Subject/Course:* ${formData.subjectCode}
*Deadline:* ${formData.deadline}
*Pages:* ${formData.pages}

*Description:*
${formData.description}

${formData.attachments && formData.attachments.length > 0 ? `
📎 *Attached Files:*
${formData.attachments.map(file => `- ${file.name} (${(file.size / 1024).toFixed(2)} KB)
${file.url}`).join('\n')}` : ''}
*Submitted:* ${new Date().toLocaleString()}

Please provide a quote for this assignment.
  `.trim();

  return encodeURIComponent(message);
};

// Generate WhatsApp URL
export const generateWhatsAppURL = (formData: OrderFormData): string => {
  const whatsappNumber = process.env.WHATSAPP_NUMBER || '+447346056050'; // Default number
  const message = generateWhatsAppMessage(formData);
  return `https://wa.me/${whatsappNumber}?text=${message}`;
};