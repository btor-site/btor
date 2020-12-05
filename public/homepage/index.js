const threadsField = document.getElementById('threads')
const searchBar = document.getElementById('searchBar')
let userCache = {}

searchBar.addEventListener('input', (event) => {
    const query = event.target.value
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
            threadsField.innerHTML = ''
            result.forEach(thread => {
                threadsField.innerHTML += `<div class="thread"><a class="title" href="/threads/${thread.id}">${thread.title.substring(0, 35)}${thread.title.length > 35 ? '...' : ''}</a> by ${userCache[thread.author]}</div>`
            });
        })
})

const url = `${window.location.origin.replace('http', 'ws')}/threads?id=all`
const connection = new WebSocket(url)

connection.onopen = () => {
    console.log('Connected')
}

connection.onerror = (error) => {
    console.log(`WebSocket error: ${error}`)
}

connection.onmessage = (e) => {
    loadThread(JSON.parse(e.data))
}

async function loadThread(thread) {
    function cache() {
        return new Promise((resolve) => {
            if (userCache[thread.author]) {
                resolve();
            } else {
                fetch(`/api/users/${thread.author}`)
                    .then(response => response.json())
                    .then(result => {
                        if (result.username) {
                            userCache[thread.author] = result.username
                            resolve();
                        }
                    })
            }
        })
    }
    await cache()

    threadsField.innerHTML = `<a href="/threads/${thread.id}" class="threadLink"><div class="thread"><span class="title" href="/threads/${thread.id}">${thread.title.substring(0, 35)}${thread.title.length > 35 ? '...' : ''}</span> by ${userCache[thread.author]}</div></a>` + threadsField.innerHTML
}