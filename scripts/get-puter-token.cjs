const { getAuthToken } = require('@heyputer/puter.js/src/init.cjs');
console.log('Abriendo navegador para iniciar sesion en Puter...');
getAuthToken().then(token => {
  console.log('\nPUTER_AUTH_TOKEN=' + token);
  console.log('\nCopia este token y pegalo en tu archivo .env como:');
  console.log('PUTER_AUTH_TOKEN=' + token);
  process.exit(0);
}).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
