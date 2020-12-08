const commentsField = document.getElementById('comments')
const title = document.getElementById('title')
const form = document.getElementById('commentForm')
let userCache = {}

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
            } else {
                alert(result.message)
            }
        })
})

const url = `${window.location.origin.replace('http', 'ws')}/threads?id=${window.location.pathname.split('/')[2]}`
console.log(url)
const connection = new WebSocket(url)

connection.onopen = () => {
    console.log('Connected')
}

connection.onerror = (error) => {
    console.log(`WebSocket error: ${error}`)
}

connection.onmessage = (e) => {
    loadComment(JSON.parse(e.data))
}

async function loadComment(comment) {
    function cache() {
        return new Promise((resolve) => {
            if (userCache[comment.author]) {
                resolve()
            } else {
                fetch(`/api/users/${comment.author}`)
                    .then(response => response.json())
                    .then(result => {
                        if (result.username) {
                            userCache[comment.author] = result.username
                            resolve()
                        }
                    })
            }
        })
    }
    await cache()

    commentsField.innerHTML += `<div class="comment"><h3 class="author">${userCache[comment.author]}:</h3>${comment.comment}<p class="comment-id">ID: ${comment.comment_id}</p></div>`
}