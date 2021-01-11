const threadsField = document.getElementById('threads')
const searchBar = document.getElementById('searchBar')
let userCache = {}
let queries = {}
let editing = false

searchBar.addEventListener('input', (event) => {
    const query = event.target.value
    if (queries[query]) return loadQuery(query)
    if (query.length < 1) return loadThreads()
    const body = {
        query
    }
    fetch('/api/threads/search', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'content-type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(result => {
            queries[query] = result
            threadsField.innerHTML = ''
            result.threads.forEach(thread => {
                if (!userCache[thread.author]) userCache[thread.author] = result.users[thread.author]
                threadsField.appendChild(renderThread(thread))
            })
            setTimeout(() => {
                queries[query] = null
            }, 30000)
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
    socket.emit('join', 'homepage')
})


socket.on('message', (thread) => {
    let styles = [
        `background: #4982FF`,
        `border-radius: 0.5em`,
        `color: white`,
        `font-weight: bold`,
        `padding: 2px 0.5em`,
    ]
    console.log('%cWebSocket', styles.join(';'), 'Recieved message', thread)
    loadThread(thread)
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
    document.getElementById(`${id}-title`).innerText = newText.trim()
    document.getElementById(`${id}-title`).title = newText.trim()
})

async function loadThread(thread) {
    function cache() {
        return new Promise((resolve) => {
            if (userCache[thread.author]) {
                resolve()
            } else {
                fetch(`/api/users/${thread.author}`)
                    .then(response => response.json())
                    .then(result => {
                        if (result.username) {
                            userCache[thread.author] = result
                            resolve()
                        }
                    })
            }
        })
    }
    await cache()

    threadsField.insertBefore(renderThread(thread), threadsField.childNodes[0])
}

async function loadThreads() {
    fetch('/api/threads/all')
        .then(response => response.json())
        .then(result => {
            threadsField.innerHTML = ''
            result.threads.forEach(thread => {
                if (!userCache[thread.author]) userCache[thread.author] = result.users[thread.author]
                threadsField.appendChild(renderThread(thread))
            })
        })
}

async function loadQuery(query) {
    threadsField.innerHTML = ''
    queries[query].threads.forEach(thread => {
        if (!userCache[thread.author]) userCache[thread.author] = queries[query].users[thread.author]
        threadsField.appendChild(renderThread(thread))
    })
}

function renderThread(thread) {
    let wrapperDiv = document.createElement('div')
    wrapperDiv.classList.add('threadwrapper')
    wrapperDiv.id = thread.id

    let threadLink = document.createElement('a')
    threadLink.href = `/threads/${thread.id}`
    threadLink.classList.add('threadLink')
    threadLink.id = `${thread.id}-link`

    let threadDiv = document.createElement('div')
    threadDiv.classList.add('thread')

    let textDiv = document.createElement('div')
    textDiv.id = `${thread.id}-title`
    textDiv.classList.add('title')
    textDiv.title = thread.title
    textDiv.innerText = thread.title.trim()

    threadDiv.appendChild(textDiv)
    threadDiv.appendChild(document.createTextNode(`by ${userCache[thread.author].username}`))

    if(userCache[thread.author].permission === 'admin') {
        threadDiv.appendChild(document.createTextNode(' '))
        let adminicon = document.createElement('i')
        adminicon.classList.add('fa')
        adminicon.classList.add('fa-shield-alt')
        adminicon.classList.add('admin')
        adminicon.title = 'Admin'
        threadDiv.appendChild(adminicon)
    }

    threadLink.appendChild(threadDiv)
    wrapperDiv.appendChild(threadLink)

    if ((user.id === thread.author) || (user.permission === 'admin')) {
        let editbuttons = document.createElement('div')
        editbuttons.classList.add('two-grid')
        editbuttons.classList.add('actionbuttons')
        editbuttons.classList.add('hidden')
        editbuttons.id = `${thread.id}-editButtons`

        let cancelbutton = document.createElement('button')
        cancelbutton.innerText = 'Cancel'
        cancelbutton.onclick = function () {
            cancelEdit(thread.id)
        }
        editbuttons.appendChild(cancelbutton)

        let savebutton = document.createElement('button')
        savebutton.innerText = 'Save'
        savebutton.onclick = function () {
            saveEdit(thread.id)
        }
        editbuttons.appendChild(savebutton)
        wrapperDiv.appendChild(editbuttons)


        let actionbuttons = document.createElement('div')
        actionbuttons.classList.add('two-grid')
        actionbuttons.classList.add('actions')

        let editbutton = document.createElement('button')
        editbutton.onclick = function () {
            editThread(thread.id)
        }
        editbutton.title = 'Edit'

        let editicon = document.createElement('i')
        editicon.classList.add('fa')
        editicon.classList.add('fa-pencil-alt')
        editbutton.appendChild(editicon)
        actionbuttons.appendChild(editbutton)

        let deletebutton = document.createElement('button')
        deletebutton.onclick = function () {
            deleteThread(thread.id)
        }
        deletebutton.title = 'Delete'

        let deleteicon = document.createElement('i')
        deleteicon.classList.add('fa')
        deleteicon.classList.add('fa-trash')
        deletebutton.appendChild(deleteicon)
        actionbuttons.appendChild(deletebutton)

        wrapperDiv.appendChild(actionbuttons)
    }

    return wrapperDiv
}

function deleteThread(id) {
    fetch(`/api/threads/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(result => {
            if (!result.success) {
                alert(result.message)
            }
        })
}

function editThread(id) {
    if (editing) {
        document.getElementById(`${editing.id}-title`).classList.remove('editing')
        document.getElementById(`${editing.id}-title`).contentEditable = false
        document.getElementById(`${editing.id}-editButtons`).classList.add('hidden')
        document.getElementById(`${id}-editButtons`).classList.remove('actionbuttonsout')
        document.getElementById(`${id}-link`).onclick = () => {}
    }
    
    document.getElementById(`${id}-link`).onclick = () => {
        return false
    }
    document.getElementById(`${id}-title`).classList.add('editing')
    document.getElementById(`${id}-title`).contentEditable = true
    document.getElementById(`${id}-title`).focus()
    document.getElementById(`${id}-editButtons`).classList.remove('hidden')
    document.getElementById(`${id}-editButtons`).classList.add('actionbuttonsout')
    setEndOfContenteditable(document.getElementById(`${id}-title`))
    editing = {
        id: id,
        text: document.getElementById(`${id}-title`).innerText
    }
}

function saveEdit(id) {
    const body = {
        new: document.getElementById(`${id}-title`).innerText
    }
    fetch(`/api/threads/${id}`, {
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
    document.getElementById(`${id}-title`).classList.remove('editing')
    document.getElementById(`${id}-link`).onclick = () => {}
    document.getElementById(`${id}-title`).contentEditable = false
    document.getElementById(`${id}-editButtons`).classList.add('hidden')
    document.getElementById(`${id}-editButtons`).classList.remove('actionbuttonsout')
    editing = false
}

function cancelEdit(id) {
    document.getElementById(`${id}-title`).classList.remove('editing')
    document.getElementById(`${id}-link`).onclick = () => {}
    document.getElementById(`${id}-title`).contentEditable = false
    document.getElementById(`${id}-editButtons`).classList.add('hidden')
    document.getElementById(`${id}-editButtons`).classList.remove('actionbuttonsout')
    document.getElementById(`${id}-title`).innerText = editing.text
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