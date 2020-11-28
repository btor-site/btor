const userNameForm = document.querySelector('.userNameForm')
const passwordForm = document.querySelector('.passwordForm')
const deleteForm = document.querySelector('.deleteForm')

fetch('/api/users/me')
    .then(response => response.json())
    .then(result => {
        if (result.username) {
            document.getElementById('user').innerHTML = '<svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-person-check-fill" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M1 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm9.854-2.854a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L12.5 7.793l2.646-2.647a.5.5 0 0 1 .708 0z"/></svg> ' + result.username
            document.getElementById('signinLink').href = '/settings'
            document.getElementById('threadBtn').hidden = false
            document.getElementById('logoutBtn').hidden = false
            document.getElementById('userName').innerText = result.username
        }
    })

userNameForm.addEventListener('submit', (event) => {
    event.preventDefault()
    const formData = new FormData(userNameForm)
    const newName = formData.get('newName')
    const body = {
        new: newName
    }

    fetch('/api/users/update/name', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'content-type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                userNameForm.reset()
                alert(result.message)
                window.location.reload()
            } else {
                alert(result.message)
            }
        })
})

passwordForm.addEventListener('submit', (event) => {
    event.preventDefault()
    const formData = new FormData(passwordForm)
    const oldPassword = formData.get('oldPassword')
    const password = formData.get('newPassword')
    const body = {
        oldPassword,
        password
    }

    fetch('/api/users/update/password', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'content-type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                passwordForm.reset()
                alert(result.message)
                window.location.reload()
            } else {
                alert(result.message)
            }
        })
})

deleteForm.addEventListener('submit', (event) => {
    event.preventDefault()
    const formData = new FormData(deleteForm)
    const username = formData.get('username')
    const password = formData.get('password')
    const body = {
        username,
        password
    }

    fetch('/api/users/me/delete', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'content-type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert(result.message)
                window.location.href = '/'
            } else {
                alert(result.message)
            }
        })
})