const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const path = require('path');
const passport = require('passport');
const GitHubStrategy = require('passport-github').Strategy;
const session = require('express-session');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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


passport.use(new GitHubStrategy({
    clientID: 'clientid',
    clientSecret: 'clientsecret',
    callbackURL: "http://localhost:3000/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    return cb(null, profile);
  }
));

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

// Adicione o middleware de sessão
app.use(session({ secret: '123', resave: false, saveUninitialized: false }));

// Inicialize o Passport e restaure o estado da autenticação da sessão, se houver
app.use(passport.initialize());
app.use(passport.session());

// Rota para iniciar a autenticação com o GitHub
app.get('/auth/github',
  passport.authenticate('github'));

// Rota de retorno de chamada após a autenticação com o GitHub
app.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
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
    const { title, description, completionDate, ownerName } = req.body;
    db.query('SELECT UserID FROM Users WHERE Nome = ?', [ownerName], (err, results) => {
        if (err) {
            console.error('Erro ao buscar usuário:', err);
            res.status(500).send('Erro ao buscar usuário.');
        } else if (results.length > 0) {
            const userID = results[0].UserID;
            db.query('INSERT INTO Tasks (UserID, Título, Descrição, DataDeConclusão, Status) VALUES (?, ?, ?, ?, ?)', [userID, title, description, completionDate, 'pendente'], (err, result) => {
                if (err) {
                    console.error('Erro ao criar tarefa:', err);
                    res.status(500).send('Erro ao criar tarefa.');
                } else {
                    res.status(201).json({ TaskID: result.insertId, UserID: userID, Título: title, Descrição: description, DataDeConclusão: completionDate, Status: 'pendente' });
                }
            });
        } else {
            res.status(404).send('Proprietário não encontrado.');
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


app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
