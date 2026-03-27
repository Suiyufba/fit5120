import { getProfileByUserId, loginUser, registerUser } from '../modules/auth/services/authService.js';

export async function register(req, res) {
  try {
    const result = await registerUser({
      email: req.body?.email,
      password: req.body?.password,
      age: req.body?.age,
      region: req.body?.region,
      assessmentAnswers: req.body?.assessmentAnswers || {},
    });

    res.status(201).json(result);
  } catch (error) {
    const isConflict = error.message === 'Email already registered';
    res.status(isConflict ? 409 : 400).json({ error: error.message || 'Failed to register' });
  }
}

export async function login(req, res) {
  try {
    const result = await loginUser({
      email: req.body?.email,
      password: req.body?.password,
    });

    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message || 'Login failed' });
  }
}

export async function me(req, res) {
  try {
    const user = await getProfileByUserId(req.auth.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch profile' });
  }
}
