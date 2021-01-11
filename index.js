require('dotenv').config()
const db = require('monk')(process.env.CONNECTION_STRING)
const express = require('express')
const bcrypt = require('bcrypt')
const rateLimit = require('express-rate-limit')
const cookieParser = require('cookie-parser')
const http = require('http')
const cookie = require('cookie')
const compression = require('compression')
const helmet = require('helmet')
const FlakeId = require('flake-idgen')
const intformat = require('biguint-format')
const {nanoid} = require('nanoid')
const bodyParser = require('body-parser')
const socketio = require('socket.io')

const saltRounds = 10
let adminPanelCodes = []

const usersDB = db.get('users')
const thread_overviewDB = db.get('thread_overview')
const thread_commentsDB = db.get('thread_comments')
const idGen = new FlakeId({epoch: 1577836800000})

db.then(async () => {
    console.log('Connected to Database')
})

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
const server = http.createServer(app)
const io = socketio(server)
app.set('view engine', 'ejs')
app.set('views', 'public')
app.set('trust proxy', true)
app.disable('x-powered-by')
server.listen(process.env.PORT, async () => {
    console.log(`Server started on port ${server.address().port}`)
})

app.use('/assets', express.static('public/assets'))
app.use('/', express.static('public/assets/home'))
app.use('/pwa-icons', express.static('public/assets/pwa-icons'))
app.use('/api/users/new', userLimiter)
app.use('/api/threads/new', threadLimiter)
app.use('/api/threads/:code/comments/new', commentLimiter)
app.use('/api/users/signin', signinLimiter)
app.use(bodyParser.json({limit: '10kb'}))
app.use(cookieParser())
app.use(compression())
app.use(helmet({
    contentSecurityPolicy: false,
    referrerPolicy: false
}))


// CSS and JS
app.get('/scripts/:page/index.js', async (req, res) => {
    res.sendFile(__dirname + `/public/${req.params.page}/index.js`)
})

app.get('/styles/:page/styles.css', async (req, res) => {
    res.sendFile(__dirname + `/public/${req.params.page}/styles.css`)
})

var cookieChecker = async function (req, res, next) {
    if(req.cookies.token) {
        req.user = await usersDB.findOne({token: req.cookies.token})
    }

    if (req.user) {
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
app.use(async function (err, req, res, next) {
    console.error(req.originalUrl, '\n', req.headers, '\n', err.stack, '\n')
    switch (err.type) {
        case 'entity.too.large':
            res.status(413).json({message: 'The request you made was too big'})
            break;

        default:
            res.status(500).json({message: 'An unexpected error occured, please try again later'})
            break;
    }
})
// Pages

app.get('/', async (req, res) => {
    if (req.user) {
        let body = {
            threads: await thread_overviewDB.find()
        }
        body.threads.reverse()
        let users = [...new Set(body.threads.map(e => e.author))]
        users = await usersDB.find({id: {$in: users}}, {projection: {username: 1, id: 1, permission: 1}})
        users = Object.fromEntries(users.map(v=>[v.id, {username: v.username, permission: v.permission}]))
        body['users'] = users
        res.render('homepage/index', {user: req.user, body: body})
    } else {
        res.clearCookie('token')
        res.clearCookie('remember')
        res.render('home/index')
    }
})

app.get('/settings', async (req, res) => {
    if (req.user) {
        res.render('settings/index', {user: req.user})
    } else {
        res.clearCookie('token')
        res.clearCookie('remember')
        res.redirect('/')
    }
})

app.get('/signup', async (req, res) => {
    if (req.user) {
        res.redirect('/')
    } else {
        res.clearCookie('token')
        res.clearCookie('remember')
        res.render('signup/index')
    }
})

app.get(['/signin', '/login'], async (req, res) => {
    if (req.user) {
        res.redirect('/')
    } else {
        res.clearCookie('token')
        res.clearCookie('remember')
        res.render('signin/index')
    }
})

app.get('/threads/new', async (req, res) => {
    if (req.user) {
        res.render('newthread/index', {user: req.user})
    } else {
        res.clearCookie('token')
        res.clearCookie('remember')
        res.redirect('/')
    }
})

app.get('/threads/:code', async (req, res) => {
    if (req.user) {
        const thread = await thread_overviewDB.findOne({id: req.params.code})
        if(thread) {
            let body = {
                title: thread.title,
                comments: await thread_commentsDB.find({id: req.params.code}, {projection: {author: 1, comment: 1, comment_id: 1}})
            }
            let users = [...new Set(body.comments.map(e => e.author))]
            users = await usersDB.find({id: {$in: users}}, {projection: {username: 1, id: 1, permission: 1}})
            users = Object.fromEntries(users.map(v=>[v.id, {username: v.username, permission: v.permission}]))
            body['users'] = users

            res.render('thread/index', {user: req.user, body: body})
        } else {
            res.redirect('/')
        }
    } else {
        res.clearCookie('token')
        res.clearCookie('remember')
        res.redirect('/')
    }
})

app.get(['/logout', '/signout'], async (req, res) => {
    res.clearCookie('token')
    res.clearCookie('remember')
    res.redirect('/')
})

// API

app.post('/api/users/new', async (req, res) => {
    if (!req.body.username || !req.body.password) return res.status(400).json({
        message: req.body.username ? req.body.password ? 'An unexpected error occured, please try again later' : 'Password is a required field' : req.body.password ? 'Username is a required field' : 'Username and password are both required fields'
    })
    if (await usersDB.findOne({username: req.body.username})) return res.status(409).json({
        message: 'A user with that name already exists'
    })

    let id = intformat(idGen.next(), 'dec')
    let token = `${Buffer.from(id).toString('base64')}.${nanoid(40)}`

    bcrypt.hash(req.body.password, saltRounds, async (err, hash) => {
        await usersDB.insert({username: req.body.username, id: id, token: token, password: hash, permission: 'user'})
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

app.post('/api/users/signin', async (req, res) => {
    if (!req.body.username || !req.body.password) return res.status(400).json({
        message: req.body.username ? req.body.password ? 'An unexpected error occured, please try again later' : 'Password is a required field' : req.body.password ? 'Username is a required field' : 'Username and password are both required fields'
    })
    let user = await usersDB.findOne({username: req.body.username})
    if (!user) return res.status(404).json({
        message: 'User was not found'
    })

    bcrypt.compare(req.body.password, user.password, async function (error, response) {
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

app.post('/api/users/update/name', async (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!req.user) return res.status(401).json({
        message: 'The token is not right'
    })
    if (!req.body.new) return res.status(400).json({
        message: 'New is a required field'
    })

    await usersDB.update({token: req.cookies.token}, {$set: {username: req.body.new}})
    res.json({
        message: 'Username updated successfully',
        success: true
    })
})

app.post('/api/users/update/password', async (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!req.user) return res.status(401).json({
        message: 'The token is not right'
    })
    if (!req.body.oldPassword || !req.body.password) return res.status(400).json({
        message: req.body.oldPassword ? req.body.password ? 'An unexpected error occured, please try again later' : 'Password is a required field' : req.body.password ? 'OldPassword is a required field' : 'OldPassword and password are both required fields'
    })

    bcrypt.compare(req.body.oldPassword, req.user.password, async function (error, response) {
        if (response) {
            bcrypt.hash(req.body.password, saltRounds, async (err, hash) => {
                let token = `${Buffer.from(req.user.id).toString('base64')}.${nanoid(40)}`
                await usersDB.update({token: req.cookies.token}, {$set: {password: hash, token: token}})
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

app.post('/api/users/me/delete', async (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!req.user) return res.status(401).json({
        message: 'The token is not right'
    })
    if (!req.body.username || !req.body.password) return res.status(400).json({
        message: req.body.username ? req.body.password ? 'An unexpected error occured, please try again later' : 'Password is a required field' : req.body.password ? 'Username is a required field' : 'Username and password are both required fields'
    })
    if (req.body.username !== req.user.username) return res.status(403).json({
        message: 'Username is not correct'
    })

    bcrypt.compare(req.body.password, req.user.password, async function (error, response) {
        if (response) {
            await usersDB.remove({id: req.user.id})
            let threads = await thread_overviewDB.find({author: req.user.id})
            await thread_overviewDB.remove({author: req.user.id})
            await thread_commentsDB.remove({author: req.user.id})
            threads.forEach(async (thread) => {
                await thread_commentsDB.remove({id: thread.id})
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

app.get('/api/users/:id', async (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!req.user) return res.status(401).json({
        message: 'The token is not right'
    })

    res.json(await usersDB.findOne({id: req.params.id}, {projection: {username: 1, permission: 1}}))
})

app.get('/api/threads/all', async (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!req.user) return res.status(401).json({
        message: 'The token is not right'
    })

    let body = {
        threads: await thread_overviewDB.find()
    }
    body.threads.reverse()
    let users = [...new Set(body.threads.map(e => e.author))]
    users = await usersDB.find({id: {$in: users}}, {projection: {username: 1, id: 1, permission: 1}})
    users = Object.fromEntries(users.map(v=>[v.id, {username: v.username, permission: v.permission}]))
    body['users'] = users

    res.json(body)
})

app.post('/api/threads/new', async (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!req.user) return res.status(401).json({
        message: 'The token is not right'
    })
    if (!req.body.message || !req.body.title) return res.status(400).json({
        message: req.body.message ? req.body.title ? 'An unexpected error occured, please try again later' : 'Title is a required field' : req.body.title ? 'Message is a required field' : 'Message and title are both required fields'
    })

    let code = intformat(idGen.next(), 'dec')

    io.to('homepage').emit('message', {id: code, title: req.body.title, author: req.user.id})

    await thread_overviewDB.insert({id: code, title: req.body.title, author: req.user.id})
    await thread_commentsDB.insert({id: code, comment_id: code, author: req.user.id, comment: req.body.message})
    res.json({
        message: 'Thread was created',
        code: code,
        success: true
    })
})

app.post('/api/threads/:code/comments/new', async (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!req.user) return res.status(401).json({
        message: 'The token is not right'
    })
    if (!req.body.message) return res.status(400).json({
        message: 'Message is a required field'
    })

    let code = intformat(idGen.next(), 'dec')

    await thread_commentsDB.insert({id: req.params.code, comment_id: code, author: req.user.id, comment: req.body.message})

    io.to(req.params.code).emit('message', {id: req.params.code, comment_id: code, author: req.user.id, comment: req.body.message})

    res.json({
        message: 'Added comment',
        success: true
    })
})

app.get('/api/threads/:code/comments', async (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!req.user) return res.status(401).json({
        message: 'The token is not right'
    })
    let thread = await thread_overviewDB.findOne({id: req.params.code})
    if (!thread) return res.status(404).json({
        message: 'The thread was not found'
    })

    const body = {
        title: thread.title,
        comments: await thread_commentsDB.find({id: req.params.code}, {projection: {author: 1, comment: 1, comment_id: 1}})
    }
    res.json(body)
})

app.delete('/api/comments/:id', async (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!req.user) return res.status(401).json({
        message: 'The token is not right'
    })
    let comment = await thread_commentsDB.findOne({comment_id: req.params.id})
    if (!comment) return res.status(404).json({
        message: 'The comment was not found'
    })

    if((req.user.permission === 'admin') || (req.user.id === comment.author)) {
        await thread_commentsDB.remove({comment_id: req.params.id})
        io.to(comment.id).emit('delete', req.params.id)
        res.json({
            message: 'Comment deleted successfully',
            success: true
        })
    } else {
        res.status(401).json({
            message: 'User not authorized to delete this comment',
        })
    }
})

app.patch('/api/comments/:id', async (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!req.user) return res.status(401).json({
        message: 'The token is not right'
    })
    let comment = await thread_commentsDB.findOne({comment_id: req.params.id})
    if (!comment) return res.status(404).json({
        message: 'The comment was not found'
    })

    if ((req.user.permission === 'admin') || (req.user.id === comment.author)) {
        await thread_commentsDB.update({comment_id: req.params.id}, {$set: {comment: req.body.new.trim()}})
        io.to(comment.id).emit('edit', req.params.id, req.body.new.trim())
        res.json({
            message: 'Comment edited successfully',
            success: true
        })
    } else {
        res.status(401).json({
            message: 'User not authorized to edit this comment',
        })
    }
})

app.delete('/api/threads/:id', async (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!req.user) return res.status(401).json({
        message: 'The token is not right'
    })
    let thread = await thread_overviewDB.findOne({id: req.params.id})
    if (!thread) return res.status(404).json({
        message: 'The thread was not found'
    })

    if((req.user.permission === 'admin') || (req.user.id === thread.author)) {
        await thread_overviewDB.remove({id: req.params.id})
        await thread_commentsDB.remove({id: req.params.id})
        io.to('homepage').emit('delete', req.params.id)
        io.to(req.params.id).emit('goHome')
        res.json({
            message: 'Thread deleted successfully',
            success: true
        })
    } else {
        res.status(401).json({
            message: 'User not authorized to delete this thread',
        })
    }
})

app.patch('/api/threads/:id', async (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!req.user) return res.status(401).json({
        message: 'The token is not right'
    })
    let thread = await thread_overviewDB.findOne({id: req.params.id})
    if (!thread) return res.status(404).json({
        message: 'The thread was not found'
    })
    
    if ((req.user.permission === 'admin') || (req.user.id === thread.author)) {
        await thread_overviewDB.update({id: req.params.id}, {$set: {title: req.body.new.trim()}})
        io.to('homepage').emit('edit', req.params.id, req.body.new.trim())
        io.to(req.params.id).emit('titleEdit', req.body.new.trim())
        res.json({
            message: 'Thread edited successfully',
            success: true
        })
    } else {
        res.status(401).json({
            message: 'User not authorized to edit this thread',
        })
    }
})

app.post('/api/threads/search', async (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!req.user) return res.status(401).json({
        message: 'The token is not right'
    })
    if (!req.body.query) return res.status(400).json({
        message: 'You need to include the search query'
    })
    
    let threads = await thread_overviewDB.find()
    threads = threads.reverse().filter(thread => thread.title.toLowerCase().includes(req.body.query.toLowerCase()))
    let body = {
        threads: threads
    }
    let users = [...new Set(body.threads.map(e => e.author))]
    users = await usersDB.find({id: {$in: users}}, {projection: {username: 1, id: 1, permission: 1}})
    users = Object.fromEntries(users.map(v=>[v.id, {username: v.username, permission: v.permission}]))
    body['users'] = users

    res.json(body)
})

// Admin

app.post('/api/admin/edit/:object/:id', async (req, res) => {
    if (req.headers.authorization !== process.env.ADMIN_PASSWORD) return res.status(401).json({
        message: 'Admin password not correct'
    })
    if (!req.body.new) return res.status(400).json({
        message: 'New is a required parameter'
    })

    switch (req.params.object) {
        case 'user':
            await usersDB.update({id: req.params.id}, {$set: {username: req.body.new}})
            res.json({
                message: 'Username updated successfully',
                success: true
            })
            break;

        case 'thread':
            await thread_overviewDB.update({id: req.params.id}, {$set: {title: req.body.new}})
            res.json({
                message: 'Thread title updated successfully',
                success: true
            })
            break;

        case 'comment':
            await thread_commentsDB.update({comment_id: req.params.id}, {$set: {comment: req.body.new}})
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

app.delete('/api/admin/delete/:object/:id', async (req, res) => {
    if (req.headers.authorization !== process.env.ADMIN_PASSWORD) return res.status(401).json({
        message: 'Admin password not correct'
    })

    switch (req.params.object) {
        case 'user':
            await usersDB.remove({id: req.params.id})
            let threads = await thread_overviewDB.find({author: req.params.id})
            await thread_overviewDB.remove({author: req.params.id})
            await thread_commentsDB.remove({author: req.params.id})
            threads.forEach(async (thread) => {
                await thread_commentsDB.remove({id: thread.id})
            })

            res.json({
                message: 'User and all user content deleted successfully',
                success: true
            })
            break;

        case 'thread':
            await thread_overviewDB.remove({id: req.params.id})
            await thread_commentsDB.remove({id: req.params.id})
            res.json({
                message: 'Thread deleted successfully',
                success: true
            })
            break;

        case 'comment':
            await thread_commentsDB.remove({comment_id: req.params.id})
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

app.get('/api/admin/users/all', async (req, res) => {
    if (req.headers.authorization !== process.env.ADMIN_PASSWORD) return res.status(401).json({
        message: 'Admin password not correct'
    })

    const users = await usersDB.find({}, {projection: {username: 1, id: 1, permission: 1}})
    res.json(users)
})

app.get('/api/admin/id/:name', async (req, res) => {
    if (req.headers.authorization !== process.env.ADMIN_PASSWORD) return res.status(401).json({
        message: 'Admin password not correct'
    })

    const user = await usersDB.findOne({username: req.params.name}, {projection: {id: 1}})
    res.json(user)
})

app.post('/api/admin/signin', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) return res.status(401).json({
        message: 'Admin password not correct'
    })
    const code = nanoid(60)
    adminPanelCodes.push(code)
    res.json({
        code: code
    })
})

app.get('/admin/panel/:code', async (req, res) => {
    if (!adminPanelCodes.includes(req.params.code)) return res.redirect('/admin')
    adminPanelCodes.splice(adminPanelCodes.indexOf(req.params.code), 1)
    res.render('admin/index')
})

app.get('/admin', async (req, res) => {
    res.render('adminsignin/index')
})

io.on('connection', async (socket) => {
    const cookies = cookie.parse(socket.request.headers.cookie)
    const user = await usersDB.findOne({token: cookies.token})
    if(!user) return socket.disconnect(true)

    socket.on('join', async (id) => {
        let thread
        if(id !== 'homepage') {
            thread = await thread_overviewDB.findOne(({id: id}))
            if(!thread) return socket.disconnect(true)
        }
        socket.join(id)
    })
})