const Database = require('better-sqlite3')
const express = require('express')
const bcrypt = require('bcrypt')
const rateLimit = require('express-rate-limit')
const cookieParser = require('cookie-parser')
require('dotenv').config()
const {
    nanoid
} = require('nanoid')
const randtoken = require('rand-token').generator({
    chars: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ=.-_'
})

const threadDB = new Database('database/threads.db')
const userDB = new Database('database/users.db')
const adminDB = new Database('database/admin.db')

const saltRounds = 10


threadDB.prepare('CREATE TABLE IF NOT EXISTS thread_comments (ID TEXT, comment_id TEXT, author TEXT, comment TEXT)').run()
threadDB.prepare('CREATE TABLE IF NOT EXISTS thread_overview (ID TEXT, title TEXT, author TEXT)').run()
userDB.prepare('CREATE TABLE IF NOT EXISTS users (username TEXT, id TEXT, token TEXT, password TEXT)').run()
adminDB.prepare('CREATE TABLE IF NOT EXISTS urls (url TEXT)').run()


const userLimiter = rateLimit({
    windowMs: 60 * 30 * 1000,
    max: 1,
    message: {
        message: 'You have been ratelimited, please try again later.\nYou can only create one user every 30 minutes.'
    }
})

const threadLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 1,
    message: {
        message: 'You have been ratelimited, please try again later.\nYou can only create one thread every 5 minutes.'
    }
})

const commentLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    message: {
        message: 'You have been ratelimited, please try again later.\nYou can only comment on 5 threads every 5 minutes.'
    }
})

const signinLimiter = rateLimit({
    windowMs: 30 * 60 * 1000,
    max: 3,
    message: {
        message: 'You have been ratelimited, please try again later.\nYou can only sign in 3 times every 30 minutes.'
    }
})


const app = express()
app.set('view engine', 'ejs')
app.set('views', 'public')
app.listen(process.env.PORT, () => {
    console.log(`Listening on port ${process.env.PORT}`)
})

app.use(express.json())
app.use(cookieParser())

app.use('/api/users/new', userLimiter)
app.use('/api/threads/new', threadLimiter)
app.use('/api/threads/:code/comments/new', commentLimiter)
app.use('/api/users/signin', signinLimiter)

var cookieChecker = function (req, res, next) {
    if (userDB.prepare('SELECT username FROM users WHERE token=(?)').get(req.cookies.token)) {
        if (req.cookies.remember) {
            res.cookie('token', req.cookies.token, {
                httpOnly: true,
                expires: new Date(Date.now() + 157788000000)
            })
            res.cookie('remember', true, {
                httpOnly: true,
                expires: new Date(Date.now() + 157788000000)
            })
        } else {
            res.cookie('token', req.cookies.token, {
                expires: new Date(Date.now() + 604800000),
                httpOnly: true
            })
        }
    }
    next()
}

app.use(cookieChecker)
// Pages

app.get('/', (req, res) => {
    if (userDB.prepare('SELECT username FROM users WHERE token=(?)').get(req.cookies.token)) {
        res.render('homepage/index', userDB.prepare('SELECT username FROM users WHERE token=(?)').get(req.cookies.token))
    } else {
        res.clearCookie('token')
        res.clearCookie('remember')
        res.sendFile(__dirname + '/public/home/index.html')
    }
})

app.get('/settings', (req, res) => {
    if (userDB.prepare('SELECT username FROM users WHERE token=(?)').get(req.cookies.token)) {
        res.render('settings/index', userDB.prepare('SELECT username FROM users WHERE token=(?)').get(req.cookies.token))
    } else {
        res.clearCookie('token')
        res.clearCookie('remember')
        res.redirect('/')
    }
})

app.get('/signup', (req, res) => {
    if (userDB.prepare('SELECT username FROM users WHERE token=(?)').get(req.cookies.token)) {
        res.redirect('/')
    } else {
        res.clearCookie('token')
        res.clearCookie('remember')
        res.sendFile(__dirname + '/public/signup/index.html')
    }
})

app.get('/signin', (req, res) => {
    if (userDB.prepare('SELECT username FROM users WHERE token=(?)').get(req.cookies.token)) {
        res.redirect('/')
    } else {
        res.clearCookie('token')
        res.clearCookie('remember')
        res.sendFile(__dirname + '/public/signin/index.html')
    }
})

app.get('/threads/new', (req, res) => {
    if (userDB.prepare('SELECT username FROM users WHERE token=(?)').get(req.cookies.token)) {
        res.render('newthread/index', userDB.prepare('SELECT username FROM users WHERE token=(?)').get(req.cookies.token))
    } else {
        res.clearCookie('token')
        res.clearCookie('remember')
        res.redirect('/')
    }
})

app.get('/threads/:code', (req, res) => {
    if (userDB.prepare('SELECT username FROM users WHERE token=(?)').get(req.cookies.token)) {
        res.render('thread/index', userDB.prepare('SELECT username FROM users WHERE token=(?)').get(req.cookies.token))
    } else {
        res.clearCookie('token')
        res.clearCookie('remember')
        res.redirect('/')
    }
})

app.get('/logout', (req, res) => {
    res.clearCookie('token')
    res.clearCookie('remember')
    res.redirect('/')
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
        message: req.body.username ? req.body.password ? 'An unexpected error occured, please try again later' : 'Password is a required field' : req.body.password ? 'Username is a required field' : 'Username and password are both required fields'
    })
    if (userDB.prepare('SELECT * FROM users WHERE username=(?)').get(req.body.username)) return res.status(409).json({
        message: 'A user with that name already exists'
    })

    let token = randtoken.generate(60)
    let id = nanoid(20)

    while (userDB.prepare('SELECT * FROM users WHERE token=(?)').get(token)) {
        token = randtoken.generate(60)
    }

    while (userDB.prepare('SELECT * FROM users WHERE id=(?)').get(id)) {
        id = nanoid(20)
    }

    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
        userDB.prepare('INSERT INTO users (username,id,token,password) VALUES (?,?,?,?)').run(req.body.username, id, token, hash)
        if (req.body.remember) {
            res.cookie('token', token, {
                httpOnly: true,
                expires: new Date(Date.now() + 157788000000)
            })
            res.cookie('remember', true, {
                httpOnly: true,
                expires: new Date(Date.now() + 157788000000)
            })
        } else {
            res.cookie('token', token, {
                expires: new Date(Date.now() + 604800000),
                httpOnly: true
            })
        }
        res.json({
            message: 'User was created',
            id,
            success: true
        })
    })
})

app.post('/api/users/signin', (req, res) => {
    if (!req.body.username || !req.body.password) return res.status(400).json({
        message: req.body.username ? req.body.password ? 'An unexpected error occured, please try again later' : 'Password is a required field' : req.body.password ? 'Username is a required field' : 'Username and password are both required fields'
    })
    if (!userDB.prepare('SELECT * FROM users WHERE username=(?)').get(req.body.username)) return res.status(404).json({
        message: 'User was not found'
    })

    const user = userDB.prepare('SELECT * FROM users WHERE username=(?)').get(req.body.username)
    bcrypt.compare(req.body.password, user.password, function (error, response) {
        if (response) {
            if (req.body.remember) {
                res.cookie('token', user.token, {
                    httpOnly: true,
                    expires: new Date(Date.now() + 157788000000)
                })
                res.cookie('remember', true, {
                    httpOnly: true,
                    expires: new Date(Date.now() + 157788000000)
                })
            } else {
                res.cookie('token', user.token, {
                    expires: new Date(Date.now() + 604800000),
                    httpOnly: true
                })
            }
            res.json({
                message: 'Signed in',
                success: true
            })
        } else {
            res.status(401).json({
                message: 'Wrong password'
            })
        }
    })
})

app.post('/api/users/update/name', (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!userDB.prepare('SELECT * FROM users WHERE token=(?)').get(req.cookies.token)) return res.status(401).json({
        message: 'The token is not right'
    })
    if (!req.body.new) return res.status(400).json({
        message: 'New is a required field'
    })

    userDB.prepare('UPDATE users SET username=(?) WHERE token=(?)').run(req.body.new, req.cookies.token)
    res.json({
        message: 'Username updated successfully',
        success: true
    })
})

app.post('/api/users/update/password', (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!userDB.prepare('SELECT * FROM users WHERE token=(?)').get(req.cookies.token)) return res.status(401).json({
        message: 'The token is not right'
    })
    if (!req.body.oldPassword || !req.body.password) return res.status(400).json({
        message: req.body.oldPassword ? req.body.password ? 'An unexpected error occured, please try again later' : 'Password is a required field' : req.body.password ? 'OldPassword is a required field' : 'OldPassword and password are both required fields'
    })

    const user = userDB.prepare('SELECT * FROM users WHERE token=(?)').get(req.cookies.token)
    bcrypt.compare(req.body.oldPassword, user.password, function (error, response) {
        if (response) {
            bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
                userDB.prepare('UPDATE users SET password=(?) WHERE token=(?)').run(hash, req.cookies.token)
                res.json({
                    message: 'Password was updated',
                    success: true
                })
            })
        } else {
            res.status(401).json({
                message: 'Wrong password'
            })
        }
    })
})

app.post('/api/users/me/delete', (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!userDB.prepare('SELECT * FROM users WHERE token=(?)').get(req.cookies.token)) return res.status(401).json({
        message: 'The token is not right'
    })
    if (!req.body.username || !req.body.password) return res.status(400).json({
        message: req.body.username ? req.body.password ? 'An unexpected error occured, please try again later' : 'Password is a required field' : req.body.password ? 'Username is a required field' : 'Username and password are both required fields'
    })

    const user = userDB.prepare('SELECT * FROM users WHERE username=(?)').get(req.body.username)
    bcrypt.compare(req.body.password, user.password, function (error, response) {
        if (response) {
            let user = userDB.prepare('SELECT id FROM users WHERE token=(?)').get(req.cookies.token)
            userDB.prepare('DELETE FROM users WHERE id=(?)').run(user.id)
            let threads = threadDB.prepare('SELECT id FROM thread_overview WHERE author=(?)').all(user.id)
            threadDB.prepare('DELETE FROM thread_overview WHERE author=(?)').run(user.id)
            threadDB.prepare('DELETE FROM thread_comments WHERE author=(?)').run(user.id)
            threads.forEach(thread => {
                threadDB.prepare('DELETE FROM thread_comments WHERE id=(?)').run(thread.id)
            })
            res.clearCookie('token')
            res.clearCookie('remember')
            res.json({
                message: 'User and all user content deleted successfully',
                success: true
            })
        } else {
            res.status(401).json({
                message: 'Wrong password'
            })
        }
    })
})

app.get('/api/users/:id', (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!userDB.prepare('SELECT * FROM users WHERE token=(?)').get(req.cookies.token)) return res.status(401).json({
        message: 'The token is not right'
    })

    res.json(userDB.prepare('SELECT username FROM users WHERE id=(?)').get(req.params.id))
})

app.get('/api/threads/all', (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!userDB.prepare('SELECT * FROM users WHERE token=(?)').get(req.cookies.token)) return res.status(401).json({
        message: 'The token is not right'
    })

    res.json(threadDB.prepare('SELECT ID,title,author FROM thread_overview WHERE ID IS NOT NULL').all().reverse())
})

app.post('/api/threads/new', (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!userDB.prepare('SELECT * FROM users WHERE token=(?)').get(req.cookies.token)) return res.status(401).json({
        message: 'The token is not right'
    })
    if (!req.body.message || !req.body.title) return res.status(400).json({
        message: req.body.message ? req.body.title ? 'An unexpected error occured, please try again later' : 'Title is a required field' : req.body.title ? 'Message is a required field' : 'Message and title are both required fields'
    })

    let code = nanoid(10)

    while (threadDB.prepare('SELECT * FROM thread_overview WHERE ID=(?)').get(code) && threadDB.prepare('SELECT * FROM thread_comments WHERE comment_id=(?)').get(code)) {
        code = nanoid(10)
    }

    threadDB.prepare('INSERT INTO thread_overview (ID,title,author) VALUES (?,?,?)').run(code, req.body.title, userDB.prepare('SELECT id FROM users WHERE token=(?)').get(req.cookies.token).id)
    threadDB.prepare('INSERT INTO thread_comments (ID,comment_id,author,comment) VALUES (?,?,?,?)').run(code, code, userDB.prepare('SELECT id FROM users WHERE token=(?)').get(req.cookies.token).id, req.body.message)
    res.json({
        message: 'Thread was created',
        code: code,
        success: true
    })
})

app.post('/api/threads/:code/comments/new', (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!userDB.prepare('SELECT * FROM users WHERE token=(?)').get(req.cookies.token)) return res.status(401).json({
        message: 'The token is not right'
    })
    if (!req.body.message) return res.status(400).json({
        message: 'Message is a required field'
    })

    let code = nanoid(10)

    while (threadDB.prepare('SELECT * FROM thread_comments WHERE comment_id=(?)').get(code)) {
        code = nanoid(10)
    }

    threadDB.prepare('INSERT INTO thread_comments (ID,comment_id,author,comment) VALUES (?,?,?,?)').run(req.params.code, code, userDB.prepare('SELECT id FROM users WHERE token=(?)').get(req.cookies.token).id, req.body.message)

    res.json({
        message: 'Added comment',
        success: true
    })
})

app.get('/api/threads/:code/comments', (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!userDB.prepare('SELECT * FROM users WHERE token=(?)').get(req.cookies.token)) return res.status(401).json({
        message: 'The token is not right'
    })
    if (!threadDB.prepare('SELECT * FROM thread_overview WHERE ID=(?)').get(req.params.code)) return res.status(404).json({
        message: 'The thread was not found'
    })

    const body = {
        title: threadDB.prepare('SELECT title FROM thread_overview WHERE ID=(?)').get(req.params.code).title,
        comments: threadDB.prepare('SELECT author,comment,comment_id FROM thread_comments WHERE ID=(?)').all(req.params.code)
    }
    res.json(body)
})

app.post('/api/threads/search', (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!userDB.prepare('SELECT * FROM users WHERE token=(?)').get(req.cookies.token)) return res.status(401).json({
        message: 'The token is not right'
    })
    if (!req.body.query) return res.status(400).json({
        message: 'You need to include the search query'
    })

    res.json(threadDB.prepare('SELECT ID,title,author FROM thread_overview WHERE ID IS NOT NULL').all().reverse().filter(thread => thread.title.toLowerCase().includes(req.body.query.toLowerCase())))
})

// Admin

app.delete('/api/admin/all', (req, res) => { // NOTE No frontend
    if (req.headers.authorization !== process.env.ADMIN_PASSWORD) return res.status(401).json({
        message: 'Admin password not correct'
    })
    userDB.prepare('DELETE FROM users').run()
    threadDB.prepare('DELETE FROM thread_comments').run()
    threadDB.prepare('DELETE FROM thread_overview').run()
    res.json({
        message: 'Deleted everything'
    })
})

app.post('/api/admin/edit/:object/:id', (req, res) => {
    if (req.headers.authorization !== process.env.ADMIN_PASSWORD) return res.status(401).json({
        message: 'Admin password not correct'
    })
    if (!req.body.new) return res.status(400).json({
        message: 'New is a required parameter'
    })

    switch (req.params.object) {
        case 'user':
            userDB.prepare('UPDATE users SET username=(?) WHERE id=(?)').run(req.body.new, req.params.id)
            res.json({
                message: 'Username updated successfully',
                success: true
            })
            break;

        case 'thread':
            threadDB.prepare('UPDATE thread_overview SET title=(?) WHERE id=(?)').run(req.body.new, req.params.id)
            res.json({
                message: 'Thread title updated successfully',
                success: true
            })
            break;

        case 'comment':
            threadDB.prepare('UPDATE thread_comments SET comment=(?) WHERE comment_id=(?)').run(req.body.new, req.params.id)
            res.json({
                message: 'Comment updated successfully',
                success: true
            })
            break;

        default:
            res.status(400).json({
                message: 'Object parameter incorrect, either choose user, thread or comment'
            })
            break;
    }
})

app.delete('/api/admin/delete/:object/:id', (req, res) => {
    if (req.headers.authorization !== process.env.ADMIN_PASSWORD) return res.status(401).json({
        message: 'Admin password not correct'
    })

    switch (req.params.object) {
        case 'user':
            userDB.prepare('DELETE FROM users WHERE id=(?)').run(req.params.id)
            let threads = threadDB.prepare('SELECT id FROM thread_overview WHERE author=(?)').all(req.params.id)
            threadDB.prepare('DELETE FROM thread_overview WHERE author=(?)').run(req.params.id)
            threadDB.prepare('DELETE FROM thread_comments WHERE author=(?)').run(req.params.id)
            threads.forEach(thread => {
                threadDB.prepare('DELETE FROM thread_comments WHERE ID=(?)').run(thread.id)
            })
            res.json({
                message: 'User and all user content deleted successfully',
                success: true
            })
            break;

        case 'thread':
            threadDB.prepare('DELETE FROM thread_overview WHERE id=(?)').run(req.params.id)
            res.json({
                message: 'Thread deleted successfully',
                success: true
            })
            break;

        case 'comment':
            threadDB.prepare('DELETE FROM thread_comments WHERE comment_id=(?)').run(req.params.id)
            res.json({
                message: 'Comment deleted successfully',
                success: true
            })
            break;

        default:
            res.status(400).json({
                message: 'Object parameter incorrect, either choose user, thread or comment'
            })
            break;
    }
})

app.get('/api/admin/users/all', (req, res) => {
    if (req.headers.authorization !== process.env.ADMIN_PASSWORD) return res.status(401).json({
        message: 'Admin password not correct'
    })
    res.json(userDB.prepare('SELECT username,id,token FROM users').all())
})

app.get('/api/admin/id/:name', (req, res) => {
    if (req.headers.authorization !== process.env.ADMIN_PASSWORD) return res.status(401).json({
        message: 'Admin password not correct'
    })
    res.json(userDB.prepare('SELECT id FROM users WHERE username=(?)').get(req.params.name))
})

app.post('/api/admin/sql/select/:db', (req, res) => { // NOTE No frontend
    if (req.headers.authorization !== process.env.ADMIN_PASSWORD) return res.status(401).json({
        message: 'Admin password not correct'
    })
    switch (req.params.db) {
        case 'user':
            res.json(userDB.prepare(req.body.query).all())
            break
        case 'thread':
            res.json(threadDB.prepare(req.body.query).all())
            break
        default:
            res.status(400).json({
                message: 'DB parameter incorrect, either choose error, user or thread'
            })
    }
})

app.post('/api/admin/sql/query/:db', (req, res) => { // NOTE No frontend
    if (req.headers.authorization !== process.env.ADMIN_PASSWORD) return res.status(401).json({
        message: 'Admin password not correct'
    })
    if (!req.body.run || !req.body.get) return res.status(400).json({
        message: req.body.run ? req.body.get ? 'An unexpected error occured, please try again later' : 'Get is a required field' : req.body.get ? 'Run is a required field' : 'Run and get are both required fields'
    })
    switch (req.params.db) {
        case 'user':
            userDB.prepare(req.body.run).run()
            res.json(userDB.prepare(req.body.get).all())
            break
        case 'thread':
            threadDB.prepare(req.body.run).run()
            res.json(threadDB.prepare(req.body.get).all())
            break
        default:
            res.status(400).json({
                message: 'DB parameter incorrect, either choose user or thread'
            })
    }
})

app.post('/api/admin/signin', (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) return res.status(401).json({
        message: 'Admin password not correct'
    })
    const code = nanoid(60)
    adminDB.prepare('INSERT INTO urls (url) VALUES (?)').run(code)
    res.json({
        code: code
    })
})

app.get('/admin/panel/:code', (req, res) => {
    if (!adminDB.prepare('SELECT * FROM urls WHERE url=(?)').get(req.params.code)) return res.redirect('/admin')
    adminDB.prepare('DELETE FROM urls WHERE url=(?)').run(req.params.code)
    res.sendFile(__dirname + '/public/admin/index.html')
})

app.get('/admin/signin', (req, res) => {
    res.sendFile(__dirname + '/public/adminsignin/index.html')
})

app.get('/admin/code', (req, res) => {
    res.sendFile(__dirname + '/public/adminpanelcode/index.html')
})

app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/public/adminsignin/index.html')
})