const userField = document.getElementById('user')
const commentsField = document.getElementById('comments')
const title = document.getElementById('title')
const form = document.getElementById('commentForm')
const loginAlert = document.getElementById('loginAlert')
let comments

if (sessionStorage.getItem('token')) {
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
                form.outerHTML = ''
            } else {
                userField.innerHTML = '<svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-person-check-fill" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M1 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm9.854-2.854a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L12.5 7.793l2.646-2.647a.5.5 0 0 1 .708 0z"/></svg> ' + result.username
                signinLink.href = '#'
                document.getElementById('threadBtn').hidden = false
                document.getElementById('logoutBtn').hidden = false
            }
        })
} else {
    form.outerHTML = ''
}

function loadComments() {
    fetch(`/api/threads/${window.location.pathname.split('/')[2]}/comments`)
        .then(response => response.json())
        .then(result => {
            if(result.message) return window.location.href = '/'
            if(result === comments) return
            commentsField.innerHTML = ''
            title.innerText = result.title
            result.comments.forEach(comment => {
                commentsField.innerHTML += `<div class="comment"><h3 class="author">${comment.author}:</h3>${comment.comment}<p class="comment-id">ID: ${comment.comment_id}</p></div>`
            });
            comments = result
        })
}

loadComments()

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
                'Authorization': sessionStorage.getItem('token')
            }
        })
        .then(response => response.json())
        .then(result => {
            form.reset()
            loadComments()
        })
})

setInterval(() => {
    loadComments()
}, 5000);

function logout() {
    sessionStorage.clear()
    window.location.reload()
}