// POST /api/contact — Public
const sendMessage = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, subject, and message are all required.',
      });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }

    // In production connect to an email provider (e.g. nodemailer / SendGrid / Resend)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Contact form submission from ${email}: [${subject}] ${message}`);
    }

    res.status(200).json({ success: true, message: 'Message sent successfully', data: null });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendMessage };
