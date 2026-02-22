const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'pass1234';
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  console.log('Password:', password);
  console.log('Hash:', hash);
  
  // Verify it works
  const match = await bcrypt.compare(password, hash);
  console.log('Verification:', match ? 'SUCCESS' : 'FAILED');
}

generateHash().catch(console.error);