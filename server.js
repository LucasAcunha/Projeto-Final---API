const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const path = require('path');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'trab_api',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });

passport.use(new GoogleStrategy({
    clientID: '815392041740-8jh2inta0mmv35p3uv7tt3d6pvnbu0oo.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    const { id, displayName, emails } = profile;
    db.query('SELECT * FROM Users WHERE Email = ?', [emails[0].value], (err, results) => {
        if (err) {
            console.error('Erro ao buscar usuário:', err);
            return cb(err);
        } else if (results.length > 0) {
            // O usuário já existe, retorne o usuário
            return cb(null, results[0]);
        } else {
            // O usuário não existe, crie um novo usuário
            db.query('INSERT INTO Users (Nome, Email, TokenOAuth) VALUES (?, ?, ?)', [displayName, emails[0].value, id], (err, result) => {
                if (err) {
                    console.error('Erro ao criar usuário:', err);
                    return cb(err);
                } else {
                    db.query('SELECT * FROM Users WHERE UserID = ?', [result.insertId], (err, results) => {
                        if (err) {
                            console.error('Erro ao buscar usuário:', err);
                            return cb(err);
                        } else {
                            return cb(null, results[0]);
                        }
                    });
                }
            });
        }
    });
}));

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Redireciona para a página principal após o login bem-sucedido
    res.redirect('/');
  });

// Configuração da conexão com o banco de dados
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'trab2_api'
});

// Conectar ao banco de dados
db.connect(err => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    return;
  }
  console.log('Conectado ao banco de dados!');
});


// Endpoint para listar todas as tarefas
app.get('/tasks', (req, res) => {
    db.query('SELECT * FROM Tasks', (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Endpoint para criar uma nova tarefa
app.post('/tasks', (req, res) => {
    const { title, description, completionDate} = req.body;
    const userID = req.user.UserID;
    db.query('INSERT INTO Tasks (UserID, Título, Descrição, DataDeConclusão, Status) VALUES (?, ?, ?, ?, ?)', [userID, title, description, completionDate, 'pendente'], (err, result) => {
        if (err) {
            console.error('Erro ao criar tarefa:', err);
            res.status(500).send('Erro ao criar tarefa.');
        } else {
            res.status(201).json({ TaskID: result.insertId, UserID: userID, Título: title, Descrição: description, DataDeConclusão: completionDate, Status: 'pendente' });
        }
    });
});


// Endpoint para atualizar uma tarefa existente
app.put('/tasks/:id', (req, res) => {
    const { id } = req.params;
    const { title, description, completionDate } = req.body;
    db.query('UPDATE Tasks SET Título = ?, Descrição = ?, DataDeConclusão = ? WHERE TaskID = ?', [title, description, completionDate, id], (err, result) => {
        if (err) throw err;
        if (result.affectedRows === 0) {
            res.status(404).send('Tarefa não encontrada');
        } else {
            res.json({ TaskID: id, Título: title, Descrição: description, DataDeConclusão: completionDate });
        }
    });
});

// Endpoint para deletar uma tarefa
app.delete('/tasks/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM Tasks WHERE TaskID = ?', [id], (err, result) => {
        if (err) throw err;
        if (result.affectedRows === 0) {
            res.status(404).send('Tarefa não encontrada');
        } else {
            res.status(204).send();
        }
    });
});


// Endpoint para criar um novo usuário
app.post('/users', async (req, res) => {
    const { nome, email, senha } = req.body;

    try {
        // Gera um salt e criptografa a senha
        const salt = await bcrypt.genSalt(10);
        const senhaCriptografada = await bcrypt.hash(senha, salt);

        // Insere o novo usuário no banco de dados com a senha criptografada
        db.query('INSERT INTO Users (Nome, Email, Senha) VALUES (?, ?, ?)', [nome, email, senhaCriptografada], (err, result) => {
            if (err) {
                console.error('Erro ao criar usuário:', err);
                res.status(500).send('Erro ao criar usuário.');
            } else {
                res.status(201).send('Usuário criado com sucesso.');
            }
        });
    } catch (error) {
        console.error('Erro ao criptografar senha:', error);
        res.status(500).send('Erro interno do servidor.');
    }
});

app.get('/users', (req, res) => {
    db.query('SELECT Nome FROM Users', (err, results) => {
        if (err) {
            console.error('Erro ao listar usuários:', err);
            res.status(500).send('Erro ao listar usuários.');
        } else {
            res.json(results);
        }
    });
});

app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    db.query('SELECT * FROM Users WHERE Email = ?', [email], async (err, results) => {
        if (err) {
            console.error('Erro ao buscar usuário:', err);
            res.status(500).send('Erro ao buscar usuário.');
        } else if (results.length > 0) {
            const user = results[0];
            const senhaCorreta = await bcrypt.compare(senha, user.Senha);
            if (senhaCorreta) {
                res.status(200).send('Login bem-sucedido.');
            } else {
                res.status(401).send('Senha incorreta.');
            }
        } else {
            res.status(404).send('Usuário não encontrado.');
        }
    });
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
