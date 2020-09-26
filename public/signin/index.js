const form = document.getElementById('signinForm')

form.addEventListener('submit', (event) => {
    event.preventDefault()
    const formData = new FormData(form)
    const username = formData.get('username')
    const password = formData.get('password')

    const body = {
        username,
        password
    }

    fetch('/api/users/signin', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            'content-type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(result => {
            if(result.token) {
                form.reset()
                sessionStorage.setItem('user_id', result.id)
                sessionStorage.setItem('token', result.token)
                window.location.href = '/'
            } else {
                alert(result.message)
                document.querySelector("#password").value = ''
            }
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