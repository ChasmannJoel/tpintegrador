import mysql from 'mysql2/promise';

export const conexion = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: 'reservas',
  password: '1234'  // Sin contraseña para root en desarrollo local
});