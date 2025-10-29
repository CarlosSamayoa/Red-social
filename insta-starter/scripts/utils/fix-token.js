// Script para ejecutar en la consola del navegador para arreglar tokens
// Ve a http://localhost:5173, abre F12, ve a Console y pega este código:

console.log('🔧 Arreglando tokens...');

// Limpiar localStorage
localStorage.removeItem('token');
localStorage.removeItem('user');

console.log('✅ Tokens eliminados. Recarga la página y haz login con:');
console.log('Usuario: segte');
console.log('Contraseña: Test123!');

// Auto recargar página
setTimeout(() => {
    window.location.reload();
}, 1000);