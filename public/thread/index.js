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

const socket = io()

socket.on('connect', () => {
    let styles = [
        `background: #229954`,
        `border-radius: 0.5em`,
        `color: white`,
        `font-weight: bold`,
        `padding: 2px 0.5em`,
    ];
    console.log('%cWebSocket', styles.join(';'), 'Connected')
    socket.emit('join', window.location.pathname.split('/')[2])
})


socket.on('message', (comment) => {
    let styles = [
        `background: #4982FF`,
        `border-radius: 0.5em`,
        `color: white`,
        `font-weight: bold`,
        `padding: 2px 0.5em`,
    ];
    console.log('%cWebSocket', styles.join(';'), 'Recieved message', comment)
    loadComment(comment)
})

socket.on('disconnect', () => {
    let styles = [
        `background: #EB3941`,
        `border-radius: 0.5em`,
        `color: white`,
        `font-weight: bold`,
        `padding: 2px 0.5em`,
    ];
    console.log('%cWebSocket', styles.join(';'), 'Disonnected')
})

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

    comment.comment = anchorme({
        input: comment.comment,
        options: {
            truncate: 40,
            attributes: (string) => {
                return {
                    target: "_blank",
                    title: string
                }
            }
        }
    })

    let input = `<div class="comment"><h3 class="author">${userCache[comment.author]}:</h3>${comment.comment}<p class="comment-id">ID: ${comment.comment_id}</p></div>`

    commentsField.innerHTML += input
}