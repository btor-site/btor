const userField = document.getElementById('user')
const signinLink = document.getElementById('signinLink')
const threadsField = document.getElementById('threads')

if(sessionStorage.getItem('token')) {
    fetch('/api/users/me', {
        method: 'GET',
        headers: {
            'Authorization': sessionStorage.getItem('token')
        }
    })
        .then(response => response.json())
        .then(result => {
            if(!result.username) return sessionStorage.removeItem('token')
            userField.innerText = result.username
            signinLink.href = '#'
        })
}

fetch('/api/threads/all')
    .then(response => response.json())
    .then(result => {
        result.forEach(thread => {
            threadsField.innerHTML += `<div class="thread"><a class="title" href="/threads/${thread.ID}">${thread.title.substring(0, 35)}${thread.title.length > 35 ? '...' : ''}</a> by ${thread.author}</div>`
        });
    })