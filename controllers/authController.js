const {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  forgotPassword,
  resetPassword,
} = require('../services/authService');

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    const { user, token, refreshToken } = await registerUser({ name, email, password });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, token, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const { user, token, refreshToken } = await loginUser({ email, password });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user, token, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await logoutUser(req.user._id, refreshToken);
    res.status(200).json({ success: true, message: 'Logged out successfully', data: null });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required.' });
    }
    const { token } = await refreshAccessToken(refreshToken);
    res.status(200).json({ success: true, message: 'Token refreshed', data: { token } });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Profile fetched',
    data: req.user,
  });
};

const forgotPasswordHandler = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    await forgotPassword(email);
    res.status(200).json({
      success: true,
      message: 'Password reset email sent',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

const resetPasswordHandler = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required.',
      });
    }
    await resetPassword(token, newPassword);
    res.status(200).json({ success: true, message: 'Password reset successful', data: null });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  refresh,
  getProfile,
  forgotPasswordHandler,
  resetPasswordHandler,
};

