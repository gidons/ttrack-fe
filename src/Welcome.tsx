import React from 'react';

export default function Welcome() {
    return (
        <div>
            <h1>Welcome</h1>

            Please log in using one of these links:
            <ul>
                <li><a href="/.auth/login/github?post_login_redirect_uri=/songs">Login (GitHub)</a></li>
                <li><a href="/.auth/login/aad?post_login_redirect_uri=/songs">Login (Entra)</a></li>
            </ul>
        </div>
    )
}