const form = document.getElementById('signupForm')

form.addEventListener('submit', (event) => {
    event.preventDefault()
    const formData = new FormData(form)
    const username = formData.get('username')
    const password = formData.get('password')

    const body = {
        username,
        password
    }

    fetch('/api/users/new', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            'content-type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(result => {
            console.log(result)
            form.reset()
            sessionStorage.setItem('user_id', result.id)
            sessionStorage.setItem('token', result.token)
            window.location.href = '/'
        })
})

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
            window.location.href = '/'
        })
}