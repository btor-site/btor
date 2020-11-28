const userField = document.getElementById('user')
const commentsField = document.getElementById('comments')
const signinLink = document.getElementById('signinLink')
const title = document.getElementById('title')
const form = document.getElementById('commentForm')
const loginAlert = document.getElementById('loginAlert')
let userCache = {}
let comments

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


async function loadComments() {
    fetch(`/api/threads/${window.location.pathname.split('/')[2]}/comments`)
        .then(response => response.json())
        .then(async (result) => {
            if (result.message) return window.location.href = '/'
            if (result === comments) return
            let users = [...new Set(result.comments.map(e => e.author))]

            function cache() {
                return new Promise((resolve) => {
                    users.forEach((e, i) => {
                        if (userCache[e]) {if (i === users.length -1) resolve();} else {
                            fetch(`/api/users/${e}`)
                                .then(response => response.json())
                                .then(result => {
                                    if (result.username) {
                                        userCache[e] = result.username
                                        if (i === users.length -1) resolve();
                                    }
                                })
                        }
                    })
                })
            }
            await cache()

            commentsField.innerHTML = ''
            title.innerText = result.title
            result.comments.forEach(comment => {
                commentsField.innerHTML += `<div class="comment"><h3 class="author">${userCache[comment.author]}:</h3>${comment.comment}<p class="comment-id">ID: ${comment.comment_id}</p></div>`
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
            }
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                form.reset()
                loadComments()
            } else {
                alert(result.message)
            }
        })
})

setInterval(() => {
    loadComments()
}, 5000);