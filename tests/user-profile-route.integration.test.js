const test = require('node:test');
const assert = require('node:assert/strict');

const { getUserByIdProtected } = require('../controllers/userController');
const User = require('../models/User');

test('getUserByIdProtected returns full user for self', async () => {
  const originalFindById = User.findById;

  try {
    User.findById = () => ({
      select: async () => ({
        _id: '69ca29028c9900780c0bf083',
        name: 'Raj',
        email: 'raj@example.com',
        avatar: '',
        role: 'user',
      }),
    });

    const req = {
      params: { id: '69ca29028c9900780c0bf083' },
      user: { _id: '69ca29028c9900780c0bf083', role: 'user' },
    };

    let sent = null;
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        sent = payload;
        return payload;
      },
    };

    await getUserByIdProtected(req, res, (err) => {
      if (err) throw err;
    });

    assert.equal(sent.success, true);
    assert.equal(sent.data.name, 'Raj');
    assert.equal(sent.data.email, 'raj@example.com');
    assert.equal(sent.data.role, 'user');
  } finally {
    User.findById = originalFindById;
  }
});
