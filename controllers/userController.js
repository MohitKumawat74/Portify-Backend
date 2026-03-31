const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');

const toPublicUser = (user) => {
  if (!user) return null;
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const getOwnProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshTokens');

    if (!user) {
      throw new ApiError(404, 'User not found.', 'NOT_FOUND');
    }

    return sendSuccess(res, 200, 'Profile fetched successfully', toPublicUser(user));
  } catch (error) {
    return next(error);
  }
};

const updateOwnProfile = async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.avatar !== undefined) updates.avatar = req.body.avatar;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('-password -refreshTokens');

    if (!user) {
      throw new ApiError(404, 'User not found.', 'NOT_FOUND');
    }

    return sendSuccess(res, 200, 'Profile updated successfully', toPublicUser(user));
  } catch (error) {
    return next(error);
  }
};

const getAllUsersAdmin = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.search) {
      const escaped = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }
    if (req.query.role && ['user', 'admin'].includes(req.query.role)) {
      filter.role = req.query.role;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -refreshTokens')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, 'Users fetched successfully', {
      users: users.map((user) => toPublicUser(user)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const deleteUserAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      throw new ApiError(404, 'User not found.', 'NOT_FOUND');
    }

    await User.findByIdAndDelete(id);
    await Portfolio.deleteMany({ userId: id });

    return sendSuccess(res, 200, 'User deleted successfully', null);
  } catch (error) {
    return next(error);
  }
};

const updateUserAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.avatar !== undefined) updates.avatar = req.body.avatar;
    if (req.body.role !== undefined && ['user', 'admin'].includes(req.body.role)) updates.role = req.body.role;
    if (req.body.isActive !== undefined) updates.isActive = Boolean(req.body.isActive);

    const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).select(
      '-password -refreshTokens'
    );

    if (!user) {
      throw new ApiError(404, 'User not found.', 'NOT_FOUND');
    }

    return sendSuccess(res, 200, 'User updated', toPublicUser(user));
  } catch (error) {
    return next(error);
  }
};

const getUserByIdAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password -refreshTokens');
    if (!user) {
      throw new ApiError(404, 'User not found.', 'NOT_FOUND');
    }

    return sendSuccess(res, 200, 'User fetched', toPublicUser(user));
  } catch (error) {
    return next(error);
  }
};

// Protected: self or admin can fetch full profile by id
const getUserByIdProtected = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user && req.user.role === 'admin';
    const isOwner = req.user && String(req.user._id) === String(id);

    if (!isAdmin && !isOwner) {
      throw new ApiError(403, 'Access denied for this resource.', 'AUTH_FORBIDDEN');
    }

    const user = await User.findById(id).select('-password -refreshTokens');
    if (!user) {
      throw new ApiError(404, 'User not found.', 'NOT_FOUND');
    }

    return sendSuccess(res, 200, 'User fetched', toPublicUser(user));
  } catch (error) {
    return next(error);
  }
};

// Public: fetch user by id (public profile)
const getUserByIdPublic = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('name avatar');
    if (!user) {
      throw new ApiError(404, 'User not found.', 'NOT_FOUND');
    }

    return sendSuccess(res, 200, 'User fetched', { id: user._id, name: user.name, avatar: user.avatar });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getOwnProfile,
  updateOwnProfile,
  getAllUsersAdmin,
  deleteUserAdmin,
  getUserByIdAdmin,
  getUserByIdProtected,
  getUserByIdPublic,
  updateUserAdmin,
};
