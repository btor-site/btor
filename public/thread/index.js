const userField = document.getElementById('user')
const commentsField = document.getElementById('comments')
const title = document.getElementById('title')
const form = document.getElementById('commentForm')
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
            if (!result.username) return sessionStorage.removeItem('token')
            userField.innerText = result.username
        })
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
}, 10000);