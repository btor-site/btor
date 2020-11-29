const userNameForm = document.querySelector('.userNameForm')
const passwordForm = document.querySelector('.passwordForm')
const deleteForm = document.querySelector('.deleteForm')

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