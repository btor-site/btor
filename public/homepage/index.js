const userField = document.getElementById('user')
const signinLink = document.getElementById('signinLink')
const threadsField = document.getElementById('threads')
const loginAlert = document.getElementById('loginAlert')

if(sessionStorage.getItem('token')) {
    fetch('/api/users/me', {
        method: 'GET',
        headers: {
            'Authorization': sessionStorage.getItem('token')
        }
    })
        .then(response => response.json())
        .then(result => {
            if(!result.username) {
                sessionStorage.removeItem('token')
            } else {
                userField.innerHTML = '<svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-person-check-fill" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M1 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm9.854-2.854a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L12.5 7.793l2.646-2.647a.5.5 0 0 1 .708 0z"/></svg> ' + result.username
                signinLink.href = '#'
                document.getElementById('threadBtn').hidden = false
                document.getElementById('logoutBtn').hidden = false
            }
        })
}

fetch('/api/threads/all')
    .then(response => response.json())
    .then(result => {
        result.forEach(thread => {
            threadsField.innerHTML += `<div class="thread"><a class="title" href="/threads/${thread.ID}">${thread.title.substring(0, 35)}${thread.title.length > 35 ? '...' : ''}</a> by ${thread.author}</div>`
        });
    })

function logout() {
    sessionStorage.clear()
    window.location.reload()
}