const {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  forgotPassword,
  resetPassword,
} = require('../services/authService');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { getRefreshTokenCookieOptions } = require('../utils/token');

const register = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await registerUser(req.body);

    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

    return sendSuccess(res, 201, 'Registration successful', {
      user,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await loginUser(req.body);

    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

    return sendSuccess(res, 200, 'Login successful', {
      user,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    return next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
    await logoutUser(req.user._id, refreshToken);
    res.clearCookie('refreshToken', getRefreshTokenCookieOptions());

    return sendSuccess(res, 200, 'Logged out successfully', null);
  } catch (error) {
    return next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const incomingRefreshToken = req.body.refreshToken || req.cookies.refreshToken;
    if (!incomingRefreshToken) {
      throw new ApiError(401, 'Refresh token is required.', 'AUTH_ERROR');
    }

    const { accessToken, refreshToken, user } = await refreshAccessToken(incomingRefreshToken);

    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

    return sendSuccess(res, 200, 'Token refreshed', {
      accessToken,
      refreshToken,
      user,
    });
  } catch (error) {
    return next(error);
  }
};

const getProfile = async (req, res) => {
  return sendSuccess(res, 200, 'Profile fetched', req.user);
};

const me = async (req, res) => {
  return sendSuccess(res, 200, 'Authenticated user fetched', req.user);
};

const forgotPasswordHandler = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      throw new ApiError(400, 'Email is required.', 'VALIDATION_ERROR');
    }
    await forgotPassword(email);

    return sendSuccess(res, 200, 'Password reset email sent', null);
  } catch (error) {
    return next(error);
  }
};

const resetPasswordHandler = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      throw new ApiError(400, 'Token and new password are required.', 'VALIDATION_ERROR');
    }
    await resetPassword(token, newPassword);

    return sendSuccess(res, 200, 'Password reset successful', null);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  refresh,
  getProfile,
  me,
  forgotPasswordHandler,
  resetPasswordHandler,
};

