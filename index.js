const Database = require('better-sqlite3')
const express = require('express')
const bcrypt = require('bcrypt')
const {
    nanoid
} = require('nanoid')
require('dotenv').config()
const randtoken = require('rand-token').generator({
    chars: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ=.-_'
})

const threadDB = new Database('database/threads.db')
const userDB = new Database('database/users.db')
const errorDB = new Database('database/errors.db')

const saltRounds = 10

const rateLimit = require('express-rate-limit')

threadDB.prepare('CREATE TABLE IF NOT EXISTS thread_comments (ID TEXT, comment_id TEXT, author TEXT, comment TEXT)').run()
threadDB.prepare('CREATE TABLE IF NOT EXISTS thread_overview (ID TEXT, title TEXT, author TEXT)').run()
userDB.prepare('CREATE TABLE IF NOT EXISTS users (username TEXT, id BIGINT, token TEXT, password TEXT)').run()
errorDB.prepare('CREATE TABLE IF NOT EXISTS errors (ID TEXT, error TEXT, other TEXT)').run()


const userLimiter = rateLimit({
    windowMs: 60 * 30 * 1000,
    max: 1,
    message: {
        message: 'You have been ratelimited, please try again later.'
    }
})

const threadLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 1,
    message: {
        message: 'You have been ratelimited, please try again later.'
    }
})

const commentLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    message: {
        message: 'You have been ratelimited, please try again later.'
    }
})

const loginLimiter = rateLimit({
    windowMs: 30 * 60 * 1000,
    max: 3,
    message: {
        message: 'You have been ratelimited, please try again later.'
    }
})

const app = express()
app.listen(process.env.PORT)
app.use(express.json())
app.use(express.static('public'))

// app.use('/api/users/new', userLimiter)
// app.use('/api/threads/new', threadLimiter)
// app.use('/api/threads/:code/comments/new', commentLimiter)
// app.use('/api/users/login', loginLimiter)


// Pages

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/homepage/index.html')
})

app.get('/signup', (req, res) => {
    res.sendFile(__dirname + '/public/signup/index.html')
})

app.get('/signin', (req, res) => {
    res.sendFile(__dirname + '/public/signin/index.html')
})

app.get('/threads/new', (req, res) => {
    res.sendFile(__dirname + '/public/newthread/index.html')
})

app.get('/threads/:code', (req, res) => {
    res.sendFile(__dirname + '/public/thread/index.html')
})

app.get('/scripts/:page/index.js', (req, res) => {
    res.sendFile(__dirname + `/public/${req.params.page}/index.js`)
})

app.get('/styles/:page/styles.css', (req, res) => {
    res.sendFile(__dirname + `/public/${req.params.page}/styles.css`)
})

app.get('/images/:path', (req, res) => {
    res.sendFile(__dirname + `/public/images/${req.params.path}`)
})

// API

app.post('/api/users/new', (req, res) => {
    if (!req.body.username || !req.body.password) return res.status(400).json({
        message: req.body.username ? req.body.password ? errorCode(req.body, '/api/users/new', req.headers) : 'Password is a required field' : req.body.password ? 'Username is a required field' : 'Username and password are both required fields'
    })
    if (userDB.prepare('SELECT * FROM users WHERE username=(?)').get(req.body.username)) return res.status(409).json({
        message: 'A user with that name already exists'
    })

    let token = randtoken.generate(60)
    let id = Math.ceil(Math.random() * 10000000000000000 + Date.now())

    while (userDB.prepare('SELECT * FROM users WHERE token=(?)').get(token)) {
        token = randtoken.generate(60)
    }

    while (userDB.prepare('SELECT * FROM users WHERE id=(?)').get(id)) {
        id = Math.ceil(Math.random() * 10000000000000000 + Date.now())
    }

    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
        userDB.prepare('INSERT INTO users (username,id,token,password) VALUES (?,?,?,?)').run(req.body.username, id, token, hash)
        res.json({ 
            message: 'User was created',
            username: req.body.username,
            token,
            id
        })
    })
})

app.post('/api/users/login', (req, res) => {
    if (!req.body.username || !req.body.password) return res.status(400).json({
        message: req.body.username ? req.body.password ? errorCode(req.body, '/api/users/login ', req.headers) : 'Password is a required field' : req.body.password ? 'Username is a required field' : 'Username and password are both required fields'
    })
    if (!userDB.prepare('SELECT * FROM users WHERE username=(?)').get(req.body.username)) return res.status(404).json({
        message: 'No user was found'
    })

    const user = userDB.prepare('SELECT * FROM users WHERE username=(?)').get(req.body.username)
    bcrypt.compare(req.body.password, user.password, function (error, response) {
        if (response) {
            res.json({
                id: user.id,
                token: user.token
            })
        } else {
            res.status(401).json({
                message: 'Wrong password' // TODO Make system so you can only fail 3 times
            })
        }
    })

})

app.get('/api/users/me', (req, res) => {
    if (!req.headers.authorization) return res.status(401).json({
        message: 'Authorization header with a valid token is required'
    })
    if (!userDB.prepare('SELECT * FROM users WHERE token=(?)').get(req.headers.authorization)) return res.status(401).json({
        message: 'The token is not right'
    })
    res.json(userDB.prepare('SELECT username FROM users WHERE token=(?)').get(req.headers.authorization))
})

app.get('/api/threads/all', (req, res) => {
    res.json(threadDB.prepare('SELECT * FROM thread_overview WHERE ID IS NOT NULL').all().reverse())
})

app.post('/api/threads/new', (req, res) => {
    if (!req.headers.authorization) return res.status(401).json({
        message: 'Authorization header with a valid token is required'
    })
    if (!userDB.prepare('SELECT * FROM users WHERE token=(?)').get(req.headers.authorization)) return res.status(401).json({
        message: 'The token is not right'
    })
    if (!req.body.message || !req.body.title) return res.status(400).json({
        message: req.body.message ? req.body.title ? errorCode(req.body, '/api/threads/new', req.headers) : 'TItle is a required field' : req.body.title ? 'Message is a required field' : 'Message and title are both required fields'
    })

    let code = nanoid(10)

    while (threadDB.prepare('SELECT * FROM thread_overview WHERE ID=(?)').get(code) && threadDB.prepare('SELECT * FROM thread_comments WHERE comment_id=(?)').get(code)) {
        code = nanoid(10)
    }

    threadDB.prepare('INSERT INTO thread_overview (ID,title,author) VALUES (?,?,?)').run(code, req.body.title, userDB.prepare('SELECT username FROM users WHERE token=(?)').get(req.headers.authorization).username)
    threadDB.prepare('INSERT INTO thread_comments (ID,comment_id,author,comment) VALUES (?,?,?,?)').run(code, code, userDB.prepare('SELECT username FROM users WHERE token=(?)').get(req.headers.authorization).username, req.body.message)
    res.json({
        message: 'Thread was created',
        code: code
    })
})

app.post('/api/threads/:code/comments/new', (req, res) => {
    if (!req.headers.authorization) return res.status(401).json({
        message: 'Authorization header with a valid token is required'
    })
    if (!userDB.prepare('SELECT * FROM users WHERE token=(?)').get(req.headers.authorization)) return res.status(401).json({
        message: 'The token is not right'
    })
    if (!req.body.message) return res.status(400).json({
        message: 'Message is a required field'
    })

    let code = nanoid(10)

    while (threadDB.prepare('SELECT * FROM thread_comments WHERE comment_id=(?)').get(code)) {
        code = nanoid(10)
    }

    threadDB.prepare('INSERT INTO thread_comments (ID,comment_id,author,comment) VALUES (?,?,?,?)').run(req.params.code, code, userDB.prepare('SELECT username FROM users WHERE token=(?)').get(req.headers.authorization).username, req.body.message)

    res.json({
        message: 'Added comment'
    })

})

app.get('/api/threads/:code/comments', (req, res) => {
    if (!threadDB.prepare('SELECT * FROM thread_overview WHERE ID=(?)').get(req.params.code)) return res.status(404).json({
        message: 'The thread was not found'
    })

    const body = {
        title: threadDB.prepare('SELECT title FROM thread_overview WHERE ID=(?)').get(req.params.code).title,
        comments: threadDB.prepare('SELECT author,comment,comment_id FROM thread_comments WHERE ID=(?)').all(req.params.code)
    }
    res.json(body)
})

app.delete('/api/all', (req, res) => {
    userDB.prepare('DELETE FROM users').run()
    threadDB.prepare('DELETE FROM thread_comments').run()
    threadDB.prepare('DELETE FROM thread_overview').run()
    errorDB.prepare('DELETE FROM errors').run()
    res.json({
        message: 'Deleted everything'
    })
})

function errorCode(requestBody, endPoint, other) {
    const code = nanoid(10)

    while (errorDB.prepare('SELECT * FROM errors WHERE ID=(?)').get(code)) {
        code = nanoid(10)
    }

    const errorBody = {
        endPoint: endPoint,
        body: requestBody
    }
    console.log(other)

    errorDB.prepare('INSERT INTO errors (ID,error,other) VALUES (?,?,?)').run(code, JSON.stringify(errorBody), JSON.stringify(other))
    return `Fatal error, please contact me with the id ${code}`
}

/*NOTE Sql queries
Delete all comments from thread: DELETE FROM thread_comments WHERE ID='<id>'
Delete thread: DELETE FROM thread_overview WHERE ID='<id>'
Delete comment: DELETE FROM thread_comments WHERE comment_id='<id>'
*/

console.log('Started')