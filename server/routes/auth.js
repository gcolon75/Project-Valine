import { Router } from 'express';
import { store, nextId } from '../db/store.js';

const r = Router();

/**
 * POST /login
 *
 * Create or log in a user. If a user with the provided email does not
 * exist, a new record is created with a default name (prefix of the
 * email), the chosen role and `profileComplete: false`. If the user
 * already exists, the role is updated to reflect the most recent
 * selection. The endpoint returns the user object.
 */
r.post('/login', (req, res) => {
  const { email, role = 'artist' } = req.body || {};
  // Look up user by email
  let u = store.users.find((x) => x.email === email);
  // If the user does not exist, create a new one with default values
  if (!u) {
    u = {
      id: nextId('u'),
      email,
      role,
      name: email.split('@')[0],
      profileComplete: false,
    };
    store.users.push(u);
  }
  // Update the role on every login so switching roles persists
  u.role = role;
  res.json({ user: u });
});

export default r;