const commentsField = document.getElementById('comments')
const title = document.getElementById('title')
const form = document.getElementById('commentForm')
let userCache = {}
let editing = false

form.addEventListener('submit', (event) => {
    event.preventDefault()
    const formData = new FormData(form)
    const message = formData.get('comment')

    const body = {
        message
    }

    fetch(`/api/threads/${window.location.pathname.split('/')[2]}/comments/new`, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'content-type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                form.reset()
            } else {
                alert(result.message)
            }
        })
})

const socket = io()

socket.on('connect', () => {
    let styles = [
        `background: #229954`,
        `border-radius: 0.5em`,
        `color: white`,
        `font-weight: bold`,
        `padding: 2px 0.5em`,
    ]
    console.log('%cWebSocket', styles.join(';'), 'Connected')
    socket.emit('join', window.location.pathname.split('/')[2])
})


socket.on('message', (comment) => {
    let styles = [
        `background: #4982FF`,
        `border-radius: 0.5em`,
        `color: white`,
        `font-weight: bold`,
        `padding: 2px 0.5em`,
    ]
    console.log('%cWebSocket', styles.join(';'), 'Recieved message', comment)
    loadComment(comment)
})

socket.on('disconnect', () => {
    let styles = [
        `background: #EB3941`,
        `border-radius: 0.5em`,
        `color: white`,
        `font-weight: bold`,
        `padding: 2px 0.5em`,
    ]
    console.log('%cWebSocket', styles.join(';'), 'Disconnected')
})

socket.on('delete', (id) => {
    document.getElementById(id).outerHTML = ''
})

socket.on('edit', (id, newText) => {
    document.getElementById(`${id}-text`).innerText = newText
    linkifyElement(document.getElementById(`${id}-text`))
})

socket.on('titleEdit', (newText) => {
    document.getElementById('title').innerText = newText
})

socket.on('goHome', () => {
    document.location.href = '/'
})

async function loadComment(comment) {
    function cache() {
        return new Promise((resolve) => {
            if (userCache[comment.author]) {
                resolve()
            } else {
                fetch(`/api/users/${comment.author}`)
                    .then(response => response.json())
                    .then(result => {
                        if (result.username) {
                            userCache[comment.author] = result
                            resolve()
                        }
                    })
            }
        })
    }
    await cache()

    let commentdiv = document.createElement('div')
    commentdiv.classList.add('comment')
    commentdiv.id = comment.comment_id

    let commentbox = document.createElement('div')
    commentbox.classList.add('commentbox')

    let author = document.createElement('b')
    author.classList.add('author')
    author.innerText = `${userCache[comment.author]['username']}`

    if (userCache[comment.author]['permission'] === 'admin') {
        author.appendChild(document.createTextNode(' '))
        let adminicon = document.createElement('i')
        adminicon.classList.add('fa')
        adminicon.classList.add('fa-shield-alt')
        adminicon.classList.add('admin')
        adminicon.title = 'Admin'
        author.appendChild(adminicon)
    }

    author.appendChild(document.createTextNode(':'))
    commentbox.appendChild(author)
    commentbox.appendChild(document.createElement('br'))

    let commenttext = document.createElement('div')
    commenttext.id = `${comment.comment_id}-text`
    commenttext.classList.add('comment_content')
    comment.comment.split('\n').forEach((text) => {
        let div = document.createElement('div')
        div.innerText = text
        commenttext.appendChild(div)
    })
    commentbox.appendChild(commenttext)

    if ((user.id === comment.author) || (user.permission === 'admin')) {
        let editbuttons = document.createElement('div')
        editbuttons.classList.add('two-grid')
        editbuttons.classList.add('actionbuttons')
        editbuttons.classList.add('hidden')
        editbuttons.id = `${comment.comment_id}-editButtons`

        let cancelbutton = document.createElement('button')
        cancelbutton.innerText = 'Cancel'
        cancelbutton.onclick = function () {
            cancelEdit(comment.comment_id)
        }
        editbuttons.appendChild(cancelbutton)

        let savebutton = document.createElement('button')
        savebutton.innerText = 'Save'
        savebutton.onclick = function () {
            saveEdit(comment.comment_id)
        }
        editbuttons.appendChild(savebutton)

        commentbox.appendChild(editbuttons)
    }

    let commentid = document.createElement('p')
    commentid.classList.add('comment-id')
    commentid.innerText = `ID: ${comment.comment_id}`
    commentbox.appendChild(commentid)

    commentdiv.appendChild(commentbox)

    if ((user.id === comment.author) || (user.permission === 'admin')) {
        let actionbuttons = document.createElement('div')
        actionbuttons.classList.add('two-grid')
        actionbuttons.classList.add('actions')
        actionbuttons.id = `${comment.comment_id}-editButtons`

        let editbutton = document.createElement('button')
        editbutton.onclick = function () {
            editComment(comment.comment_id)
        }
        editbutton.title = 'Edit'

        let editicon = document.createElement('i')
        editicon.classList.add('fa')
        editicon.classList.add('fa-pencil-alt')
        editbutton.appendChild(editicon)
        actionbuttons.appendChild(editbutton)

        let deletebutton = document.createElement('button')
        deletebutton.onclick = function () {
            deleteComment(comment.comment_id)
        }
        deletebutton.title = 'Delete'

        let deleteicon = document.createElement('i')
        deleteicon.classList.add('fa')
        deleteicon.classList.add('fa-trash')
        deletebutton.appendChild(deleteicon)
        actionbuttons.appendChild(deletebutton)

        commentdiv.appendChild(actionbuttons)
    }

    document.getElementById('comments').appendChild(commentdiv)
}

function deleteComment(id) {
    fetch(`/api/comments/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(result => {
            if (!result.success) {
                alert(result.message)
            }
        })
}

function editComment(id) {
    if (editing) {
        document.getElementById(`${editing.id}-text`).classList.remove('editing')
        document.getElementById(`${editing.id}-text`).contentEditable = false
        document.getElementById(`${editing.id}-editButtons`).classList.add('hidden')
    }

    document.getElementById(`${id}-text`).classList.add('editing')
    document.getElementById(`${id}-text`).contentEditable = true
    document.getElementById(`${id}-text`).focus()
    document.getElementById(`${id}-editButtons`).classList.remove('hidden')
    setEndOfContenteditable(document.getElementById(`${id}-text`))
    editing = {
        id: id,
        text: document.getElementById(`${id}-text`).innerText
    }
}

function saveEdit(id) {
    const body = {
        new: document.getElementById(`${id}-text`).innerText
    }
    fetch(`/api/comments/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
            headers: {
                'content-type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(result => {
            if (!result.success) {
                alert(result.message)
            }
        })
    document.getElementById(`${id}-text`).classList.remove('editing')
    document.getElementById(`${id}-text`).contentEditable = false
    document.getElementById(`${id}-editButtons`).classList.add('hidden')
    editing = false
}

function cancelEdit(id) {
    document.getElementById(`${id}-text`).classList.remove('editing')
    document.getElementById(`${id}-text`).contentEditable = false
    document.getElementById(`${id}-editButtons`).classList.add('hidden')
    document.getElementById(`${id}-text`).innerText = editing.text
    editing = false
}

function setEndOfContenteditable(contentEditableElement) {
    var range, selection
    if (document.createRange) {
        range = document.createRange()
        range.selectNodeContents(contentEditableElement)
        range.collapse(false)
        selection = window.getSelection()
        selection.removeAllRanges()
        selection.addRange(range)
    } else if (document.selection) {
        range = document.body.createTextRange()
        range.moveToElementText(contentEditableElement)
        range.collapse(false)
        range.select()
    }
}

document.querySelectorAll('.comment').forEach(e => {
    linkifyElement(document.getElementById(`${e.id}-text`))
})