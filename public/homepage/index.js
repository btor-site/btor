const userField = document.getElementById('user')
const signinLink = document.getElementById('signinLink')
const threadsField = document.getElementById('threads')
const loginAlert = document.getElementById('loginAlert')
const searchBar = document.getElementById('searchBar')
let userCache = {}

fetch('/api/users/me')
    .then(response => response.json())
    .then(result => {
        if (result.username) {
            userField.innerHTML = '<svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-person-check-fill" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M1 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm9.854-2.854a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L12.5 7.793l2.646-2.647a.5.5 0 0 1 .708 0z"/></svg> ' + result.username
            signinLink.href = '/settings'
            document.getElementById('threadBtn').hidden = false
            document.getElementById('logoutBtn').hidden = false
        }
    })

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