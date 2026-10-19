const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// 1. Obtener la lista de todos los libros
app.get('/api/libros', async (req, res) => {
    try {
        const [libros] = await db.query('SELECT * FROM libros');
        res.json(libros);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Apartar un libro (para la app móvil del alumno)
app.post('/api/reservas', async (req, res) => {
    const { libro_id, usuario_id } = req.body;

    try {
        // Verificar si el libro está disponible
        const [libro] = await db.query('SELECT estado FROM libros WHERE id = ?', [libro_id]);

        if (libro.length === 0) {
            return res.status(404).json({ mensaje: 'Libro no encontrado' });
        }

        if (libro[0].estado !== 'DISPONIBLE') {
            return res.status(400).json({ mensaje: 'El libro no está disponible para apartado' });
        }

        // Definir fecha de expiración del apartado (por ejemplo, 24 horas a partir de ahora)
        const fechaExpiracion = new Date();
        fechaExpiracion.setHours(fechaExpiracion.getHours() + 24);

        // Crear la reserva
        await db.query(
            'INSERT INTO reservas (libro_id, usuario_id, fecha_expiracion) VALUES (?, ?, ?)',
            [libro_id, usuario_id, fechaExpiracion]
        );

        // Actualizar el estado del libro a RESERVADO
        await db.query('UPDATE libros SET estado = "RESERVADO" WHERE id = ?', [libro_id]);

        res.json({ mensaje: 'Libro apartado exitosamente. Tienes 24 horas para recogerlo.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Ver préstamos activos de un usuario con tiempo restante (para la app móvil)
app.get('/api/prestamos/usuario/:usuario_id', async (req, res) => {
    const { usuario_id } = req.params;

    try {
        const [prestamos] = await db.query(
            `SELECT p.id, l.titulo, l.autor, p.fecha_prestamo, p.fecha_limite, p.estado,
             TIMESTAMPDIFF(HOUR, NOW(), p.fecha_limite) AS horas_restantes
             FROM prestamos p
             JOIN libros l ON p.libro_id = l.id
             WHERE p.usuario_id = ? AND p.estado = 'ACTIVO'`,
            [usuario_id]
        );

        res.json(prestamos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});