const commentsField = document.getElementById('comments')
const title = document.getElementById('title')
const form = document.getElementById('commentForm')
let userCache = {}
let comments

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