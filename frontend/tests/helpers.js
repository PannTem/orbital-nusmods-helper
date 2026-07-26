
// Login faker that fakes a logged-in session by writing a user object into localStorage,
// the same key/shape the real Google login flow uses. This lets tests reach
// protected pages without automating Google OAuth

export async function loginAs(page, overrides = {}) {
  await page.goto('/')   // load the app origin so localStorage is writable
  await page.evaluate((user) => {
    localStorage.setItem('user', JSON.stringify(user))
  }, { user_id: 'test-123', name: 'Test User', email: 'test@u.nus.edu', ...overrides })
}

// Clears any session so a test starts logged out.
export async function logout(page) {
  await page.goto('/login')
  await page.evaluate(() => localStorage.removeItem('user'))
}
