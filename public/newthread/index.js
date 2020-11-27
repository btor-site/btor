const form = document.getElementById('threadForm')
const loggedInAs = document.getElementById('loggedInAs')

form.addEventListener('submit', (event) => {
    event.preventDefault()
    const formData = new FormData(form)
    const title = formData.get('title')
    const message = formData.get('message')

    const body = {
        title,
        message
    }

    fetch('/api/threads/new', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'content-type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(result => {
            if(result.success) {
                window.location.href = `/threads/${result.code}`
            } else {
                alert(result.message)
            }
        })
})


fetch('/api/users/me')
    .then(response => response.json())
    .then(result => {
        if (!result.username) {
            alert('You need to be logged in to do that')
            window.location.href = '/signin'
        } else {
            loggedInAs.innerText = `Logged in as: ${result.username}`
        }
    })