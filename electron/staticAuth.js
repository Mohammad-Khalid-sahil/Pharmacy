'use strict';

function login(email, password) {
  email = String(email || '')
    .trim()
    .toLowerCase();

  password = String(password || '');

  if (
    email === "admin@pharmacy.local"
    &&
    password === "Admin12345"
  ) {
    return {
      success: true,
      token: "local-admin-session-token",
      user: {
        _id: "local-admin-user",
        name: "Pharmacy Admin",
        email: "admin@pharmacy.local",
        role: "SUPER_ADMIN",
        status: "ACTIVE"
      }
    };
  }

  return {
    success: false,
    message: "Invalid email or password"
  };
}

module.exports = { login };
