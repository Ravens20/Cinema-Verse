const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Koneksi ke MongoDB Atlas
const uri = 'mongodb+srv://dindradesvantio:qdo7x66P7bV0kpdw@cinemaverse.efuj2.mongodb.net/?retryWrites=true&w=majority&appName=cinemaverse';

mongoose.connect(uri)
  .then(() => console.log('Koneksi ke MongoDB Atlas berhasil!'))
  .catch((err) => console.error('Koneksi ke MongoDB Atlas gagal:', err));

// Schema dan Model MongoDB

// Model untuk pengguna (User)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// Model untuk film (Movie)
const movieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true }
});

const Movie = mongoose.model('Movie', movieSchema);

// Middleware untuk verifikasi token JWT
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(403).json({ message: 'Token is required' });
  }

  jwt.verify(token, 'your_jwt_secret_key', (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.userId = decoded.userId;
    next();
  });
};

// Endpoint untuk register
app.post('/register', (req, res) => {
  const { username, email, password } = req.body;

  // Validasi input
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Semua field harus diisi' });
  }

  // Cek apakah email sudah terdaftar
  User.findOne({ email })
    .then(user => {
      if (user) {
        return res.status(400).json({ message: 'Email sudah terdaftar' });
      }

      // Hash password sebelum disimpan ke database
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          return res.status(500).json({ message: 'Terjadi kesalahan saat hashing password' });
        }

        // Simpan pengguna baru ke database
        const newUser = new User({
          username,
          email,
          password: hashedPassword
        });

        newUser.save()
          .then(() => res.status(201).json({ message: 'Pendaftaran berhasil' }))
          .catch(err => res.status(500).json({ message: 'Terjadi kesalahan saat menyimpan data pengguna' }));
      });
    })
    .catch(err => res.status(500).json({ message: 'Terjadi kesalahan saat memeriksa email' }));
});

// Endpoint untuk login
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Validasi input
  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan password harus diisi' });
  }

  // Cek apakah email sudah terdaftar
  User.findOne({ email })
    .then(user => {
      if (!user) {
        return res.status(400).json({ message: 'Email tidak ditemukan' });
      }

      // Periksa password dengan bcrypt
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          return res.status(500).json({ message: 'Terjadi kesalahan saat memeriksa password' });
        }

        if (!isMatch) {
          return res.status(400).json({ message: 'Password salah' });
        }

        // Generate token JWT jika login berhasil
        const token = jwt.sign({ userId: user._id }, 'your_jwt_secret_key', { expiresIn: '1h' });
        res.json({ message: 'Login berhasil', token, username: user.username });
      });
    })
    .catch(err => res.status(500).json({ message: 'Terjadi kesalahan saat memeriksa email' }));
});

// Endpoint untuk mendapatkan daftar film
app.get('/movies', (req, res) => {
  Movie.find()
    .then(movies => res.json(movies))
    .catch(err => res.status(500).json({ message: 'Error fetching movies' }));
});

// Endpoint untuk memesan tiket
app.post('/book-ticket', verifyToken, (req, res) => {
  const { movie_id, tickets } = req.body;
  const userId = req.userId;  // Menambahkan middleware untuk mendapatkan userId dari token

  // Validasi input
  if (!movie_id || !tickets || tickets <= 0) {
    return res.status(400).json({ message: 'Invalid ticket count' });
  }

  // Ambil harga film berdasarkan movie_id
  Movie.findById(movie_id)
    .then(movie => {
      if (!movie) {
        return res.status(500).json({ message: 'Movie not found' });
      }

      const totalPrice = movie.price * tickets;

      // Simpan pemesanan tiket (misalnya di koleksi 'bookings')
      const booking = {
        userId,
        movie_id,
        tickets,
        totalPrice
      };

      // Simpan ke database (untuk keperluan ilustrasi, bisa disesuaikan)
      // Misalnya, gunakan koleksi atau model pemesanan khusus
      res.json({ message: 'Booking successful' });
    })
    .catch(err => res.status(500).json({ message: 'Error booking ticket' }));
});

// Endpoint untuk mendapatkan profil pengguna
app.get('/profile', verifyToken, (req, res) => {
  const userId = req.userId;

  User.findById(userId)
    .then(user => {
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ id: user._id, username: user.username, email: user.email });
    })
    .catch(err => res.status(500).json({ message: 'Error fetching user data' }));
});

// Endpoint untuk memperbarui profil pengguna
app.put('/profile', verifyToken, (req, res) => {
  const { username, email } = req.body;
  const userId = req.userId;

  if (!username || !email) {
    return res.status(400).json({ message: 'Username dan email wajib diisi' });
  }

  User.findByIdAndUpdate(userId, { username, email }, { new: true })
    .then(user => res.json({ id: user._id, username: user.username, email: user.email }))
    .catch(err => res.status(500).json({ message: 'Terjadi kesalahan saat memperbarui profil' }));
});

// Jalankan server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
