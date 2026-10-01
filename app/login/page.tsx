"use client" 

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage(){
    const supabase = createClient();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const handleLogin = async (e: any) => {
        e.preventDefault();

        const {data, error} = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if(error){
            setMessage(error.message);
            return;
        }

        setMessage("Login Successful!");
    };

    return(
        <main>
            <h1>Login</h1>

            <form onSubmit={handleLogin}>
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}></input>
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}></input>
                <button type="submit">Login</button>
            </form>

            <p>{message}</p>
        </main>
    );
}