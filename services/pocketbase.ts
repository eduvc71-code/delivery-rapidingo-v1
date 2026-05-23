import PocketBase from 'pocketbase';

// Usamos la IP de tu computadora para que el Tecno Pova pueda conectarse
// IP detectada: 192.168.1.5
const pb = new PocketBase('http://192.168.1.5:8090');

// Desactivar el auto-cancellation para evitar problemas con múltiples llamadas rápidas en React
pb.autoCancellation(false);

export default pb;
