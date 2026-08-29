const bcrypt = require('bcrypt');
const { pool } = require('./src/db');

async function updatePassword() {
  const hash = await bcrypt.hash('test123', 10);
  await new Promise((resolve, reject) => {
    pool.query('UPDATE users SET password = $1 WHERE email = $2', [hash, 'admin@zulu.com'], (err, res) => {
      if (err) reject(err);
      else {
        console.log('Updated password for admin@zulu.com');
        resolve(res);
      }
    });
  });
  await pool.end();
}

updatePassword().catch(console.error);