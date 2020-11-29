const threadsField = document.getElementById('threads')
const searchBar = document.getElementById('searchBar')
let userCache = {}

function loadThreads() {
    threadsField.innerHTML = ''
    fetch('/api/threads/all')
        .then(response => response.json())
        .then(async (result) => {
            let users = [...new Set(result.map(e => e.author))]
            function cache() {
                return new Promise((resolve) => {
                    users.forEach((e, i) => {
                        if (userCache[e]) {if (i === users.length -1) resolve()} else {
                            fetch(`/api/users/${e}`)
                                .then(response => response.json())
                                .then(result => {
                                    if (result.username) {
                                        userCache[e] = result.username
                                        if (i === users.length -1) resolve()
                                    }
                                })
                        }
                    })
                })
            }
            await cache()
            result.forEach(thread => {
                threadsField.innerHTML += `<div class="thread"><a class="title" href="/threads/${thread.ID}">${thread.title.substring(0, 35)}${thread.title.length > 35 ? '...' : ''}</a> by ${userCache[thread.author]}</div>`
            });
        })
}

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
                threadsField.innerHTML += `<div class="thread"><a class="title" href="/threads/${thread.ID}">${thread.title.substring(0, 35)}${thread.title.length > 35 ? '...' : ''}</a> by ${userCache[thread.author]}</div>`
            });
        })
})

loadThreads()