import { SignIn, SignInButton } from '@clerk/clerk-react';
import React from 'react';

export default function Welcome() {
    return (
        <div>
            <h1>Welcome</h1>
            <SignIn fallbackRedirectUrl='/songs'/>
        </div>
    )
}