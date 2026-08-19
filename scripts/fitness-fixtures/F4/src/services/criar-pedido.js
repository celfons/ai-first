// Mutação: caso de uso falando com o banco direto — P-5 furado, a F4 tem de acusar.
import { Pool } from 'pg';

export async function criarPedido(dados) {
  const pool = new Pool();
  return pool.query('INSERT INTO pedidos (total) VALUES ($1)', [dados.total]);
}
