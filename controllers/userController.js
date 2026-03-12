const User = require('../models/User');
const Portfolio = require('../models/Portfolio');

// GET /api/users — Admin Only: paginated, searchable, filterable
const getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.search) {
      const regex = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }
    if (req.query.role && ['user', 'admin'].includes(req.query.role)) {
      filter.role = req.query.role;
    }

    const [users, total] = await Promise.all([
      User.find(filter).select('-password').skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:id — Admin Only
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.status(200).json({ success: true, message: 'User fetched', data: user });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/:id — Protected (self or admin): update name/avatar
const updateProfile = async (req, res, next) => {
  try {
    const isSelf = req.user._id.toString() === req.params.id;
    const isAdmin = req.user.role === 'admin';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const allowedFields = ['name', 'avatar'];
    const updates = {};
    allowedFields.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.status(200).json({ success: true, message: 'User updated', data: user });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/:id/role — Admin Only
const updateRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be 'user' or 'admin'.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.status(200).json({ success: true, message: 'User role updated', data: user });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/:id — Admin Only
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await Portfolio.deleteMany({ userId: req.params.id });

    res.status(200).json({ success: true, message: 'User deleted', data: null });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/:id/password — Protected (self only)
const changePassword = async (req, res, next) => {
  try {
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current and new password are required.',
      });
    }

    const user = await User.findById(req.params.id);
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully', data: null });
  } catch (error) {
    next(error);
  }
};

// POST /api/users/:id/avatar — Protected (self only)
// Accepts JSON body { avatarUrl } or multipart file (requires multer middleware when added)
const uploadAvatar = async (req, res, next) => {
  try {
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const avatarUrl = req.file
      ? `/uploads/avatars/${req.file.filename}`
      : req.body.avatarUrl;

    if (!avatarUrl) {
      return res.status(400).json({ success: false, message: 'No avatar provided.' });
    }

    await User.findByIdAndUpdate(req.params.id, { avatar: avatarUrl });

    res.status(200).json({ success: true, message: 'Avatar uploaded', data: { avatarUrl } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateProfile,
  updateRole,
  deleteUser,
  changePassword,
  uploadAvatar,
};

