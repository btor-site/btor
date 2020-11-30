require('dotenv').config()
const db = require('monk')(process.env.CONNECTION_STRING)
const express = require('express')
const bcrypt = require('bcrypt')
const rateLimit = require('express-rate-limit')
const cookieParser = require('cookie-parser')
const {
    nanoid
} = require('nanoid')
const randtoken = require('rand-token').generator({
    chars: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ=.-_'
})

const saltRounds = 10
let adminPanelCodes = []

const usersDB = db.get('users')
const thread_overviewDB = db.get('thread_overview')
const thread_commentsDB = db.get('thread_comments')
db.then(() => {
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

var cookieChecker = async function (req, res, next) {
    const user = await usersDB.findOne({token: req.cookies.token}, {projection: {username: 1}})
    if (user) {
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

app.get('/', async (req, res) => {
    const user = await usersDB.findOne({token: req.cookies.token}, {projection: {username: 1}})
    if (user) {
        res.render('homepage/index', user)
    } else {
        res.clearCookie('token')
        res.clearCookie('remember')
        res.sendFile(__dirname + '/public/home/index.html')
    }
})

app.get('/settings', async (req, res) => {
    const user = await usersDB.findOne({token: req.cookies.token}, {projection: {username: 1}})
    if (user) {
        res.render('settings/index', user)
    } else {
        res.clearCookie('token')
        res.clearCookie('remember')
        res.redirect('/')
    }
})

app.get('/signup', async (req, res) => {
    const user = await usersDB.findOne({token: req.cookies.token}, {projection: {username: 1}})
    if (user) {
        res.redirect('/')
    } else {
        res.clearCookie('token')
        res.clearCookie('remember')
        res.sendFile(__dirname + '/public/signup/index.html')
    }
})

app.get('/signin', async (req, res) => {
    const user = await usersDB.findOne({token: req.cookies.token}, {projection: {username: 1}})
    if (user) {
        res.redirect('/')
    } else {
        res.clearCookie('token')
        res.clearCookie('remember')
        res.sendFile(__dirname + '/public/signin/index.html')
    }
})

app.get('/threads/new', async (req, res) => {
    const user = await usersDB.findOne({token: req.cookies.token}, {projection: {username: 1}})
    if (user) {
        res.render('newthread/index', user)
    } else {
        res.clearCookie('token')
        res.clearCookie('remember')
        res.redirect('/')
    }
})

app.get('/threads/:code', async (req, res) => {
    const user = await usersDB.findOne({token: req.cookies.token}, {projection: {username: 1}})
    if (user) {
        res.render('thread/index', user)
    } else {
        res.clearCookie('token')
        res.clearCookie('remember')
        res.redirect('/')
    }
})

app.get('/logout', async (req, res) => {
    res.clearCookie('token')
    res.clearCookie('remember')
    res.redirect('/')
})

app.get('/scripts/:page/index.js', async (req, res) => {
    res.sendFile(__dirname + `/public/${req.params.page}/index.js`)
})

app.get('/styles/:page/styles.css', async (req, res) => {
    res.sendFile(__dirname + `/public/${req.params.page}/styles.css`)
})

app.get('/images/:path', async (req, res) => {
    res.sendFile(__dirname + `/public/images/${req.params.path}`)
})

// API

app.post('/api/users/new', async (req, res) => {
    if (!req.body.username || !req.body.password) return res.status(400).json({
        message: req.body.username ? req.body.password ? 'An unexpected error occured, please try again later' : 'Password is a required field' : req.body.password ? 'Username is a required field' : 'Username and password are both required fields'
    })
    if (await usersDB.findOne({username: req.body.username})) return res.status(409).json({
        message: 'A user with that name already exists'
    })

    let token = randtoken.generate(60)
    let id = nanoid(20)

    while (await usersDB.findOne({token: token})) {
        token = randtoken.generate(60)
    }

    while (await usersDB.findOne({id: id})) {
        id = nanoid(20)
    }

    bcrypt.hash(req.body.password, saltRounds, async (err, hash) => {
        await usersDB.insert({username: req.body.username, id: id, token: token, password: hash})
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
    if (!await usersDB.findOne({username: req.body.username})) return res.status(404).json({
        message: 'User was not found'
    })

    const user = await usersDB.findOne({username: req.body.username})
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
    if (!await usersDB.findOne({token: req.cookies.token})) return res.status(401).json({
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
    if (!await usersDB.findOne({token: req.cookies.token})) return res.status(401).json({
        message: 'The token is not right'
    })
    if (!req.body.oldPassword || !req.body.password) return res.status(400).json({
        message: req.body.oldPassword ? req.body.password ? 'An unexpected error occured, please try again later' : 'Password is a required field' : req.body.password ? 'OldPassword is a required field' : 'OldPassword and password are both required fields'
    })

    const user = await usersDB.findOne({token: req.cookies.token})
    bcrypt.compare(req.body.oldPassword, user.password, async function (error, response) {
        if (response) {
            bcrypt.hash(req.body.password, saltRounds, async (err, hash) => {
                await usersDB.update({token: req.cookies.token}, {$set: {password: hash}})
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
    if (!await usersDB.findOne({token: req.cookies.token})) return res.status(401).json({
        message: 'The token is not right'
    })
    if (!req.body.username || !req.body.password) return res.status(400).json({
        message: req.body.username ? req.body.password ? 'An unexpected error occured, please try again later' : 'Password is a required field' : req.body.password ? 'Username is a required field' : 'Username and password are both required fields'
    })

    const user = await usersDB.findOne({username: req.body.username})
    bcrypt.compare(req.body.password, user.password, async function (error, response) {
        if (response) {
            let user = await usersDB.findOne({token: req.cookies.token}, {projection: {id: 1}})
            await usersDB.remove({id: user.id})
            let threads = await thread_overviewDB.find({author: user.id})
            await thread_overviewDB.remove({author: user.id})
            await thread_commentsDB.remove({author: user.id})
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
    if (!await usersDB.findOne({token: req.cookies.token})) return res.status(401).json({
        message: 'The token is not right'
    })

    res.json(await usersDB.findOne({id: req.params.id}, {projection: {username: 1}}))
})

app.get('/api/threads/all', async (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!await usersDB.findOne({token: req.cookies.token})) return res.status(401).json({
        message: 'The token is not right'
    })

    const threads = await thread_overviewDB.find()
    res.json(threads.reverse())
})

app.post('/api/threads/new', async (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!await usersDB.findOne({token: req.cookies.token})) return res.status(401).json({
        message: 'The token is not right'
    })
    if (!req.body.message || !req.body.title) return res.status(400).json({
        message: req.body.message ? req.body.title ? 'An unexpected error occured, please try again later' : 'Title is a required field' : req.body.title ? 'Message is a required field' : 'Message and title are both required fields'
    })

    let code = nanoid(10)
    let user = await usersDB.findOne({token: req.cookies.token}, {projection: {id: 1}})

    while (await thread_overviewDB.findOne({id: code}) && await thread_commentsDB.findOne({id: code})) {
        code = nanoid(10)
    }

    await thread_overviewDB.insert({id: code, title: req.body.title, author: user.id})
    await thread_commentsDB.insert({id: code, comment_id: code, author: user.id, comment: req.body.message})
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
    if (!await usersDB.findOne({token: req.cookies.token})) return res.status(401).json({
        message: 'The token is not right'
    })
    if (!req.body.message) return res.status(400).json({
        message: 'Message is a required field'
    })

    let code = nanoid(10)
    let user = await usersDB.findOne({token: req.cookies.token}, {projection: {id: 1}})

    while (await thread_commentsDB.findOne({id: code})) {
        code = nanoid(10)
    }

    await thread_commentsDB.insert({id: req.params.code, comment_id: code, author: user.id, comment: req.body.message})
    
    res.json({
        message: 'Added comment',
        success: true
    })
})

app.get('/api/threads/:code/comments', async (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!await usersDB.findOne({token: req.cookies.token})) return res.status(401).json({
        message: 'The token is not right'
    })
    if (!await thread_overviewDB.findOne({id: req.params.code})) return res.status(404).json({
        message: 'The thread was not found'
    })
    let thread = await thread_overviewDB.findOne({id: req.params.code})

    const body = {
        title: thread.title,
        comments: await thread_commentsDB.find({id: req.params.code}, {projection: {author: 1, comment: 1, comment_id: 1}})
    }
    res.json(body)
})

app.post('/api/threads/search', async (req, res) => {
    if (!req.cookies.token) return res.status(401).json({
        message: 'Valid token cookie is required'
    })
    if (!await usersDB.findOne({token: req.cookies.token})) return res.status(401).json({
        message: 'The token is not right'
    })
    if (!req.body.query) return res.status(400).json({
        message: 'You need to include the search query'
    })
    
    const threads = await thread_overviewDB.find()

    res.json(threads.reverse().filter(thread => thread.title.toLowerCase().includes(req.body.query.toLowerCase())))
})

// Admin

app.delete('/api/admin/all', async (req, res) => {
    if (req.headers.authorization !== process.env.ADMIN_PASSWORD) return res.status(401).json({
        message: 'Admin password not correct'
    })

    await usersDB.remove()
    await thread_commentsDB.remove()
    await thread_overviewDB.remove()

    res.json({
        message: 'Deleted everything'
    })
})

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

    const users = await usersDB.find({}, {projection: {username: 1, id: 1, token: 1}})
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
    res.sendFile(__dirname + '/public/admin/index.html')
})

app.get('/admin', async (req, res) => {
    res.sendFile(__dirname + '/public/adminsignin/index.html')
})