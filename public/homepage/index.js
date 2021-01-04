const threadsField = document.getElementById('threads')
const searchBar = document.getElementById('searchBar')
let userCache = {}
let queries = {}

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
                if(!userCache[thread.author]) userCache[thread.author] = result.usernames[thread.author]
                threadsField.innerHTML += renderThread(thread)
            })
            setTimeout(() => {
                queries[query] = null
            }, 30000);
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
    ];
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
    ];
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
    ];
    console.log('%cWebSocket', styles.join(';'), 'Disonnected')
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
                            userCache[thread.author] = result.username
                            resolve()
                        }
                    })
            }
        })
    }
    await cache()

    threadsField.innerHTML = renderThread(thread) + threadsField.innerHTML
}

async function loadThreads() {
    fetch('/api/threads/all')
        .then(response => response.json())
        .then(result => {
            threadsField.innerHTML = ''
            result.threads.forEach(thread => {
                if(!userCache[thread.author]) userCache[thread.author] = result.usernames[thread.author]
                threadsField.innerHTML += renderThread(thread)
            })
        })
}

async function loadQuery(query) {
    threadsField.innerHTML = ''
    queries[query].threads.forEach(thread => {
        if(!userCache[thread.author]) userCache[thread.author] = queries[query].usernames[thread.author]
        threadsField.innerHTML += renderThread(thread)
    })
}

function renderThread(thread) {
    return `<a href="/threads/${thread.id}" class="threadLink" id="${thread.id}"><div class="thread"><span class="title" href="/threads/${thread.id}" title="${thread.title}">${thread.title.substring(0, 50)}${thread.title.length > 50 ? '...' : ''}</span> by ${userCache[thread.author]}</div></a>`
}